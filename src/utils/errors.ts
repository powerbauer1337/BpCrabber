import { logger } from '@electron/utils/logger';

export enum ErrorCode {
  VALIDATION = 'VALIDATION_ERROR',
  NETWORK = 'NETWORK_ERROR',
  AUTHENTICATION = 'AUTH_ERROR',
  CONFIGURATION = 'CONFIG_ERROR',
  FILE_SYSTEM = 'FS_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

export interface ErrorMetadata {
  code: ErrorCode;
  statusCode?: number;
  operationType?: string;
  timestamp?: number;
  [key: string]: unknown;
}

export class AppError extends Error {
  public readonly metadata: ErrorMetadata;

  constructor(message: string, metadata: Partial<ErrorMetadata>) {
    super(message);
    this.name = 'AppError';
    this.metadata = {
      code: metadata.code || ErrorCode.UNKNOWN,
      timestamp: Date.now(),
      ...metadata,
    };
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      ...this.metadata,
      stack: this.stack,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, metadata?: Partial<ErrorMetadata>) {
    super(message, { code: ErrorCode.VALIDATION, statusCode: 400, ...metadata });
  }
}

export class NetworkError extends AppError {
  constructor(message: string, metadata?: Partial<ErrorMetadata>) {
    super(message, { code: ErrorCode.NETWORK, statusCode: 503, ...metadata });
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, metadata?: Partial<ErrorMetadata>) {
    super(message, { code: ErrorCode.AUTHENTICATION, statusCode: 401, ...metadata });
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, metadata?: Partial<ErrorMetadata>) {
    super(message, { code: ErrorCode.CONFIGURATION, statusCode: 500, ...metadata });
  }
}

export class FileSystemError extends AppError {
  constructor(message: string, metadata?: Partial<ErrorMetadata>) {
    super(message, { code: ErrorCode.FILE_SYSTEM, statusCode: 500, ...metadata });
  }
}

export function handleError(error: unknown): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(error instanceof Error ? error.message : 'An unknown error occurred', {
          code: ErrorCode.UNKNOWN,
        });

  logger.error(appError.message, appError, appError.toJSON());

  if (!appError.metadata.statusCode || appError.metadata.statusCode >= 500) {
    // Log additional debug information for severe errors
    logger.debug('Error details:', {
      stack: appError.stack,
      metadata: appError.metadata,
    });
  }
}

export const wrapAsync = <T>(
  fn: (...args: any[]) => Promise<T>
): ((...args: any[]) => Promise<T>) => {
  return async (...args: any[]): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error);
      throw error;
    }
  };
};

// Global error handlers
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (error: Error) => {
    handleError(error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    handleError(reason);
    process.exit(1);
  });
}
