import { Request, Response, NextFunction } from 'express';
import Redis, { ChainableCommander } from 'ioredis';
import { rateLimiter, RateLimiterRedis } from '../rateLimiter';
import { securityHeaders } from '../security';
import { requestLogger } from '../requestLogger';
import { logger } from '../../utils/logger';
import { getConfig } from '../../config/config';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../../config/config');
jest.mock('ioredis');

describe('Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      headers: {},
      get: jest.fn().mockImplementation((name: string) => {
        if (name === 'set-cookie') {
          return mockRequest.headers?.[name] as string[] | undefined;
        }
        return mockRequest.headers?.[name] as string | undefined;
      }) as unknown as {
        (name: 'set-cookie'): string[] | undefined;
        (name: string): string | undefined;
      },
    };

    mockResponse = {
      setHeader: jest.fn(),
      removeHeader: jest.fn(),
      statusCode: 200,
      end: jest.fn(),
      status: jest.fn().mockImplementation(function (this: Response, code: number) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(),
    };

    nextFunction = jest.fn().mockImplementation((error?: any) => {
      if (error) {
        mockResponse.statusCode = error.statusCode || 500;
      }
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Request Logger Middleware', () => {
    it('should log incoming requests', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1',
        })
      );
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should log responses', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, nextFunction);
      mockResponse.end?.();

      expect(logger.info).toHaveBeenCalledWith(
        'Response sent',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          statusCode: 200,
        })
      );
    });
  });

  describe('Security Headers Middleware', () => {
    beforeEach(() => {
      (getConfig as jest.Mock).mockReturnValue({
        cors: {
          enabled: true,
          origins: ['http://localhost:3000'],
          methods: 'GET,POST',
          headers: 'Content-Type',
          credentials: true,
          maxAge: 86400,
        },
        cacheControl: {
          enabled: true,
          policy: 'no-cache',
        },
      });
    });

    it('should set security headers', () => {
      mockRequest.headers = {
        origin: 'http://localhost:3000',
      };

      securityHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should set CORS headers when enabled', () => {
      mockRequest.headers = {
        origin: 'http://localhost:3000',
      };

      securityHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET,POST'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', 86400);
    });

    it('should not set CORS headers for disallowed origins', () => {
      mockRequest.headers = {
        origin: 'http://evil.com',
      };

      securityHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://evil.com'
      );
    });
  });

  describe('Rate Limiter Middleware', () => {
    let rateLimiterInstance: RateLimiterRedis;

    beforeEach(async () => {
      (getConfig as jest.Mock).mockImplementation((key: string) => {
        if (key === 'redis') {
          return {
            enabled: true,
            url: 'redis://localhost:6379',
          };
        }
        return {};
      });

      const mockMulti = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 1]]),
      } as unknown as ChainableCommander;

      mockRedis = {
        multi: jest.fn().mockReturnValue(mockMulti),
        quit: jest.fn().mockResolvedValue(undefined),
      } as unknown as jest.Mocked<Redis>;

      // Mock Redis constructor
      const mockRedisConstructor = jest.fn().mockImplementation(() => mockRedis);
      (Redis as unknown as jest.Mock).mockImplementation(mockRedisConstructor);

      // Create a new instance for each test
      rateLimiterInstance = new RateLimiterRedis({
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 requests per windowMs
      });

      // Wait for rate limiter to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should allow requests within limit', async () => {
      await rateLimiterInstance.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Remaining',
        expect.any(Number)
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should block requests over limit', async () => {
      // Simulate Redis returning a high count
      const mockMultiOverLimit = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([[null, 101]]),
      } as unknown as ChainableCommander;

      mockRedis.multi.mockReturnValue(mockMultiOverLimit);

      await rateLimiterInstance.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.statusCode).toBe(429);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow requests when Redis is unavailable', async () => {
      // Simulate Redis error
      mockRedis.multi.mockReturnValue({
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error')),
      } as unknown as ChainableCommander);

      await rateLimiterInstance.middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.statusCode).toBe(200);
    });
  });
});
