import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { verifyToken } from '../utils/security.js';
import { verifySupabaseToken, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Multi-Provider Authentication Middleware
 * Supports both cloud Supabase Auth tokens and local HMAC-SHA256 JWT tokens.
 * Always sets req.user = { userId, email } for downstream multi-tenant scoping.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
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

    // 1. Check Supabase Auth if cloud credentials are provided
    if (isSupabaseConfigured()) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = {
          userId: supabaseUser.userId,
          email: supabaseUser.email,
        };
        return next();
      }
    }

    // 2. Fall back to local HMAC-SHA256 JWT verification
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    next();
  } catch (err) {
    next(err);
  }
}
