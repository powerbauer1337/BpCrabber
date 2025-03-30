import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { AppError, ErrorCode } from '../utils/errors';
import { getConfig } from '../config/config';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
}

const defaultOptions: Required<RateLimitOptions> = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  keyPrefix: 'rate-limit:',
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      new AppError('Too many requests, please try again later.', {
        code: ErrorCode.NETWORK,
        statusCode: 429,
      })
    );
  },
};

class RateLimiterRedis {
  private redis: Redis | null = null;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      const config = getConfig('redis');
      if (config.enabled && config.url) {
        this.redis = new Redis(config.url);
        logger.info('Redis rate limiter initialized');
      }
    } catch (error) {
      logger.error(
        'Failed to initialize Redis rate limiter:',
        error instanceof Error ? error : new Error(String(error))
      );
      this.redis = null;
    }
  }

  private getKey(key: string): string {
    return `${this.options.keyPrefix}${key}`;
  }

  public middleware = async (req: Request, res: Response, next: NextFunction) => {
    if (!this.redis) {
      // If Redis is not available, allow the request
      next();
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = this.getKey(ip);

    try {
      const result = await this.redis
        .multi()
        .incr(key)
        .expire(key, Math.floor(this.options.windowMs / 1000))
        .exec();

      if (!result) {
        next();
        return;
      }

      const current = (result[0][1] as number) || 0;
      const remaining = Math.max(0, this.options.max - current);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.options.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader(
        'X-RateLimit-Reset',
        new Date(Date.now() + this.options.windowMs).toISOString()
      );

      if (current > this.options.max) {
        if (this.options.handler) {
          this.options.handler(req, res, next);
        } else {
          res.status(429);
          next(
            new AppError('Too many requests, please try again later.', {
              code: ErrorCode.NETWORK,
              statusCode: 429,
            })
          );
        }
        return;
      }

      next();
    } catch (error) {
      logger.error(
        'Rate limiter error:',
        error instanceof Error ? error : new Error(String(error))
      );
      // On error, allow the request
      next();
    }
  };

  public async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Export the class for testing
export { RateLimiterRedis };

// Export configured middleware
export const rateLimiter = new RateLimiterRedis({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}).middleware;
