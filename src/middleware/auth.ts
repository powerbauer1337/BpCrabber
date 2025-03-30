import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from '../utils/errors';
import { getConfig } from '../config/config';
import { RequestWithUser } from './index';

interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: RequestWithUser,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new AppError('Authentication required', {
        code: ErrorCode.AUTHENTICATION,
        statusCode: 401,
      });
    }

    const { jwtSecret } = getConfig('auth');
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Add user info to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: decoded.roles,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(
        new AppError('Invalid or expired token', {
          code: ErrorCode.AUTHENTICATION,
          statusCode: 401,
          metadata: { tokenError: error.message },
        })
      );
      return;
    }
    next(error);
  }
};

/**
 * Middleware to check user roles
 */
export const requireRoles = (allowedRoles: string[]) => {
  return (req: RequestWithUser, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(
        new AppError('Authentication required', {
          code: ErrorCode.AUTHENTICATION,
          statusCode: 401,
        })
      );
      return;
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      next(
        new AppError('Insufficient permissions', {
          code: ErrorCode.AUTHENTICATION,
          statusCode: 403,
          metadata: {
            requiredRoles: allowedRoles,
            userRoles,
          },
        })
      );
      return;
    }

    next();
  };
};
