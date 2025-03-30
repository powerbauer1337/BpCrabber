import { log } from './logger';

// Base custom error class
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND_ERROR', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
  }
}

// Error handler function
export function handleError(error: Error): void {
  if (error instanceof AppError && error.isOperational) {
    // Log operational errors
    log.error(error.message, {
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
    });
  } else {
    // Log programming or unknown errors
    log.error('An unexpected error occurred', {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Async error wrapper
export const asyncHandler =
  <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  (...args: Parameters<T>): ReturnType<T> => {
    const result = fn(...args).catch((error: Error) => {
      handleError(error);
      throw error;
    });
    return result as ReturnType<T>;
  };

// Process uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  log.error('UNCAUGHT EXCEPTION! 💥 Shutting down...', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Process unhandled rejection handler
process.on('unhandledRejection', (reason: Error) => {
  log.error('UNHANDLED REJECTION! 💥 Shutting down...', {
    error: reason.message,
    stack: reason.stack,
  });
  process.exit(1);
});
