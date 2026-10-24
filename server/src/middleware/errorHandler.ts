import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

export interface ErrorResponsePayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected server error occurred';
  let details: unknown = undefined;

  // 1. Handled Operational Errors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }
  // 2. Zod Schema Validation Errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
  // 3. Mongoose Schema Validation Errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Database schema validation failed';
    details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  }
  // 4. Mongoose Cast Errors (Invalid ObjectId or Type)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    code = 'INVALID_PARAMETER';
    message = `Invalid value for parameter: ${err.path}`;
  }
  // 5. MongoDB Duplicate Key Conflict (Error code 11000)
  else if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with this identifier already exists';
  }
  // 6. Generic Error Instance
  else if (err instanceof Error) {
    message = err.message;
  }

  const payload: ErrorResponsePayload = {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
      ...(env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(payload);
}
