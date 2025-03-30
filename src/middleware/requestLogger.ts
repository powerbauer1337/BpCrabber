import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Request logger middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    correlationId: req.get('x-correlation-id'),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (
    chunk?: any,
    encoding?: BufferEncoding | (() => void),
    cb?: () => void
  ): Response {
    const responseTime = Date.now() - startTime;

    // Log response
    logger.info('Response sent', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      correlationId: req.get('x-correlation-id'),
    });

    // Call original end with proper type handling
    if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, 'utf8', encoding);
    }
    return originalEnd.call(this, chunk, encoding || 'utf8', cb);
  };

  next();
};
