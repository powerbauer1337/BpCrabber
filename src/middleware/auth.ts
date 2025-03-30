import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, ErrorCode } from '../shared/utils/errors';

export interface RequestWithUser extends Request {
  user?: {
    userId: string;
    email: string;
    roles?: string[];
  };
}

export const authenticate = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('Authentication required', {
        code: ErrorCode.AUTHENTICATION,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as {
      userId: string;
      email: string;
      roles?: string[];
    };

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check user roles
 */
export const requireRoles = (roles: string[]) => {
  return async (req: RequestWithUser, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', {
          code: ErrorCode.AUTHENTICATION,
        });
      }

      const userRoles = req.user.roles || [];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        throw new AppError('Insufficient permissions', {
          code: ErrorCode.AUTHORIZATION,
          details: {
            requiredRoles: roles,
            userRoles: userRoles,
          },
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
