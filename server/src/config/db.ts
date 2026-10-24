import mongoose from 'mongoose';
import { env } from './env.js';

export type DatabaseConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface DatabaseStatusInfo {
  status: DatabaseConnectionStatus;
  readyState: number; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  host?: string;
  name?: string;
}

const READY_STATE_MAP: Record<number, DatabaseConnectionStatus> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnected',
};

/**
 * Establishes a connection to MongoDB Atlas with connection pooling and timeout guards.
 * If already connected, immediately returns the active mongoose instance.
 * Gracefully captures connection errors to prevent web server startup crashes.
 *
 * @param uri - MongoDB Atlas SRV connection string with credentials
 * @returns Connected mongoose instance or null on failure
 */
export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose | null> {
  // If already connected, return existing instance
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    console.log(`[Calories Database] Connecting to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}...`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    console.log(`[Calories Database] Successfully connected to MongoDB host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Calories Database] Connection warning: Unable to connect to MongoDB (${errorMsg}). Server continuing with graceful fallback.`);
    return null;
  }
}

/**
 * Cleanly closes the active MongoDB database connection.
 * Used during graceful shutdown signals (SIGINT, SIGTERM) and test suite teardown.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
      console.log('[Calories Database] Disconnected from MongoDB cleanly.');
    } catch (err) {
      console.error('[Calories Database] Error during disconnect:', err);
    }
  }
}

/**
 * Returns structured metadata on the current MongoDB connection state.
 * Used by `/api/v1/health` for uptime monitoring and readiness probes.
 */
export function getConnectionStatus(): DatabaseStatusInfo {
  const readyState = mongoose.connection.readyState;
  const status = READY_STATE_MAP[readyState] || 'disconnected';

  return {
    status,
    readyState,
    host: mongoose.connection.host || undefined,
    name: mongoose.connection.name || undefined,
  };
}

// Global mongoose connection event listeners
mongoose.connection.on('error', (err) => {
  console.error('[Calories Database Event] Connection error occurred:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('[Calories Database Event] Lost connection to MongoDB.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[Calories Database Event] Reconnected to MongoDB successfully.');
});
