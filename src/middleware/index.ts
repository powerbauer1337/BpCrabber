import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

// Types
export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    roles?: string[];
  };
}

// Validation middleware factory
export const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Add validated data to request
      req.body = validatedData.body;
      req.query = validatedData.query;
      req.params = validatedData.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(
          new AppError('Validation failed', {
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            metadata: { issues: error.issues },
          })
        );
        return;
      }
      next(error);
    }
  };
};

// Error handling middleware
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const appError =
    error instanceof AppError
      ? error
      : new AppError(error instanceof Error ? error.message : 'An unknown error occurred', {
          code: 'UNKNOWN_ERROR',
          statusCode: 500,
        });

  // Log error
  logger.error(appError.message, appError);

  // Send response
  res.status(appError.metadata.statusCode || 500).json({
    status: 'error',
    message: appError.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: appError.stack,
      metadata: appError.metadata,
    }),
  });
};

// Request logging middleware
export { requestLogger } from './requestLogger';

// Authentication middleware
export { authenticateToken, requireRoles } from './auth';

// Rate limiting middleware
export { rateLimiter } from './rateLimiter';

// Security middleware
export { securityHeaders } from './security';
