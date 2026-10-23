import dotenv from 'dotenv';
import { app } from './app.js';

// Load environment variables from .env file
dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, () => {
  console.log(`[Calories Server] Running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
  console.log(`[Calories Server] Health check available at http://localhost:${PORT}/api/v1/health`);
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  console.log(`[Calories Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Calories Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
