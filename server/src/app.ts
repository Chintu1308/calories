import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { getConnectionStatus } from './config/db.js';
import { authRouter } from './routes/authRoutes.js';
import { goalRouter } from './routes/goalRoutes.js';
import { mealRouter } from './routes/mealRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { aiRouter } from './routes/aiRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

// Request parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS configuration: allow configured client origin, local dev, or vercel preview deployments
const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isAllowedExplicitly = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
      const isVercelDomain = /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin);
      const isBhhcDomain = /^https:\/\/[a-zA-Z0-9_.-]*bhhc\.me$/.test(origin);
      const isOnRenderDomain = /^https:\/\/[a-zA-Z0-9_.-]+\.onrender\.com$/.test(origin);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (isAllowedExplicitly || isVercelDomain || isBhhcDomain || isOnRenderDomain || isLocalhost) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

// Standard API v1 health-check endpoint with database and ML service status
app.get('/api/v1/health', async (_req: Request, res: Response) => {
  const dbStatus = getConnectionStatus();
  const mlServiceUrl = process.env.ML_SERVICE_URL || env.ML_SERVICE_URL || process.env.AI_SERVICE_URL || env.AI_SERVICE_URL;

  let mlStatus: {
    configured: boolean;
    url?: string;
    status: string;
    latencyMs?: number;
    details?: any;
  } = {
    configured: false,
    status: 'embedded_knapsack_engine_active',
  };

  if (mlServiceUrl && !mlServiceUrl.includes('localhost:5001')) {
    const cleanUrl = mlServiceUrl.replace(/\/$/, '');
    const startPing = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const pingRes = await fetch(`${cleanUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startPing;
      if (pingRes.ok) {
        const pingData = await pingRes.json().catch(() => ({}));
        mlStatus = {
          configured: true,
          url: cleanUrl,
          status: 'connected_healthy',
          latencyMs: elapsed,
          details: pingData,
        };
      } else {
        mlStatus = {
          configured: true,
          url: cleanUrl,
          status: `http_${pingRes.status}`,
          latencyMs: elapsed,
        };
      }
    } catch (err: any) {
      mlStatus = {
        configured: true,
        url: cleanUrl,
        status: 'unreachable',
        details: err.message,
      };
    }
  }

  res.status(200).json({
    status: 'ok',
    service: 'calories-server',
    version: '0.1.0',
    database: dbStatus,
    mlService: mlStatus,
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use('/api/v1/auth', authRouter);

// Nutrition goals routes
app.use('/api/v1/goals', goalRouter);

// Meal entry CRUD routes
app.use('/api/v1/meals', mealRouter);

// Nutritional analytics & aggregate reports routes
app.use('/api/v1/reports', reportRouter);

// AI vision nutritional extraction routes
app.use('/api/v1/ai', aiRouter);

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
