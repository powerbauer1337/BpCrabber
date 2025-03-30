import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { getConfig } from '../config/config';

// Configure security headers using helmet
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Custom security middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Apply helmet middleware
  helmetMiddleware(req, res, () => {
    const config = getConfig('security');

    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Set CORS headers if enabled
    if (config.cors?.enabled) {
      const allowedOrigins = config.cors.origins || ['*'];
      const origin = req.headers.origin;

      if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader(
          'Access-Control-Allow-Methods',
          config.cors.methods || 'GET,POST,PUT,DELETE,OPTIONS'
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          config.cors.headers || 'Content-Type,Authorization'
        );
        res.setHeader('Access-Control-Allow-Credentials', String(config.cors.credentials || false));

        if (config.cors.maxAge) {
          res.setHeader('Access-Control-Max-Age', config.cors.maxAge);
        }
      }
    }

    // Set Cache-Control headers based on configuration
    if (config.cacheControl?.enabled) {
      const cacheControl = config.cacheControl.policy || 'no-store, no-cache, must-revalidate';
      res.setHeader('Cache-Control', cacheControl);
      res.setHeader('Pragma', 'no-cache');
    }

    // Add Feature-Policy header
    res.setHeader(
      'Permissions-Policy',
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
    );

    next();
  });
};
