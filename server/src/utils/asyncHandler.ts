import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Higher-order utility wrapping async route handlers in Express 4.
 * Catches any rejected promise and forwards the error to next(err),
 * ensuring centralized error handling middleware receives all exceptions.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
