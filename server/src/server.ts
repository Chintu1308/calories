import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { app } from './app.js';

// Initialize MongoDB connection
await connectDatabase();

const server = app.listen(env.PORT, () => {
  console.log(`[Calories Server] Running in ${env.NODE_ENV} mode on http://localhost:${env.PORT}`);
  console.log(`[Calories Server] Health check available at http://localhost:${env.PORT}/api/v1/health`);
});

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`[Calories Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(async () => {
    console.log('[Calories Server] HTTP server closed.');
    await disconnectDatabase();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
