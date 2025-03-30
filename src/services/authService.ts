import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Types
type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;
type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export class AuthService {
  /**
   * Register a new user
   */
  async register(input: RegisterInput) {
    try {
      // Validate input
      const validatedData = registerSchema.parse(input);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (existingUser) {
        throw new AppError(400, 'User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: validatedData.email,
          password: hashedPassword,
          name: validatedData.name,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    try {
      // Validate input
      const validatedData = loginSchema.parse(input);

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (!user) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);

      if (!isValidPassword) {
        throw new AppError(401, 'Invalid credentials');
      }

      // Generate tokens
      const { accessToken, refreshToken } = await this.generateTokens(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(input: RefreshTokenInput) {
    try {
      // Validate input
      const validatedData = refreshTokenSchema.parse(input);

      // Find refresh token
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: validatedData.refreshToken },
        include: { user: true },
      });

      if (!refreshToken) {
        throw new AppError(401, 'Invalid refresh token');
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({
          where: { id: refreshToken.id },
        });
        throw new AppError(401, 'Refresh token expired');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(
        refreshToken.userId
      );

      // Delete old refresh token
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    try {
      // Delete refresh token
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } catch (error) {
      throw new AppError(500, 'Failed to logout');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: { name?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string) {
    // Generate access token
    const accessToken = this.generateAccessToken(userId);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generate access token
   */
  private generateAccessToken(userId: string): string {
    const secret = process.env.JWT_SECRET || 'development_jwt_secret_key';
    const options: SignOptions = {
      expiresIn: 900, // 15 minutes in seconds
    };

    return jwt.sign({ userId }, secret, options);
  }
}

export const authService = new AuthService();
