import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyToken } from '../utils/security.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw AppError.unauthorized('Missing Authorization header. Sign in with Bearer token required.');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw AppError.unauthorized('Invalid Authorization header format. Expected "Bearer <token>".');
  }

  const token = parts[1];
  if (!token) {
    throw AppError.unauthorized('Bearer token cannot be empty.');
  }

  const payload = verifyToken(token);
  req.user = {
    userId: payload.userId,
    email: payload.email,
  };

  next();
}
