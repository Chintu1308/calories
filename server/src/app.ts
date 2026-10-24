import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { getConnectionStatus } from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { goalRouter } from './routes/goalRoutes.js';
import { mealRouter } from './routes/mealRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Request parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS configuration: allow configured client origin or default local dev
const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Standard API v1 health-check endpoint with database status
app.get('/api/v1/health', (_req: Request, res: Response) => {
  const dbStatus = getConnectionStatus();
  res.status(200).json({
    status: 'ok',
    service: 'calories-server',
    version: '0.1.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use('/api/v1/auth', authRouter);

// Nutrition goals routes
app.use('/api/v1/goals', goalRouter);

// Meal entry CRUD routes
app.use('/api/v1/meals', mealRouter);

// 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized error handling middleware
app.use(errorHandler);
