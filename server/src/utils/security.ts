import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtTokenPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JwtTokenPayload, expiresIn: string | number = '7d'): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtTokenPayload;
    if (!decoded || !decoded.userId || !decoded.email) {
      throw AppError.unauthorized('Invalid authentication token payload');
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Authentication token is invalid or has expired');
  }
}
