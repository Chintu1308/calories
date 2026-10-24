export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Capture clean stack trace omitting constructor
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED');
  }

  static paymentRequired(message = 'AI extraction quota exceeded'): AppError {
    return new AppError(message, 402, 'PAYMENT_REQUIRED');
  }

  static forbidden(message = 'Access forbidden by tenant isolation policy'): AppError {
    return new AppError(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static internal(message = 'An unexpected server error occurred'): AppError {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}
