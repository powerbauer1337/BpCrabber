import { logger } from '../utils/logger';

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFIGURATION = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  API = 'API',
  DATABASE = 'DATABASE',
  FILE_SYSTEM = 'FILE_SYSTEM',
  DOWNLOAD = 'DOWNLOAD',
}

export interface ErrorMetadata {
  code: ErrorCode;
  operationType?: string;
  timestamp?: number;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  readonly metadata: ErrorMetadata;

  constructor(message: string, metadata: ErrorMetadata) {
    super(message);
    this.name = 'AppError';
    this.metadata = {
      timestamp: Date.now(),
      ...metadata,
    };
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: ErrorCode.VALIDATION,
      details,
    });
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: ErrorCode.AUTHENTICATION,
      details,
    });
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: ErrorCode.NETWORK,
      details,
    });
    this.name = 'NetworkError';
  }
}

export class DownloadError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: ErrorCode.DOWNLOAD,
      details,
    });
    this.name = 'DownloadError';
  }
}

export function handleError(error: unknown): void {
  if (error instanceof AppError) {
    logger.error(`${error.name}: ${error.message}`, {
      metadata: error.metadata,
      stack: error.stack,
    });
  } else if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, {
      stack: error.stack,
    });
  } else {
    logger.error('Unknown error:', error);
  }
}

// Global error handlers for Node.js process
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

// Error handler for IPC communication
export function handleIpcError(error: unknown): { success: false; error: string; code: ErrorCode } {
  handleError(error);

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.metadata.code,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : 'An unknown error occurred',
    code: ErrorCode.UNKNOWN,
  };
}
