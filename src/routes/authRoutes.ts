import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { authService } from '../services/authService';
import { authenticateToken } from '../middleware/authMiddleware';
import { z } from 'zod';

const router = Router();

// Validation schemas
const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to register user');
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to login user');
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    const result = await authService.refreshToken(validatedData);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid input data');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to refresh token');
  }
});

// Logout user
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    await authService.logout(validatedData.refreshToken);
    res.json({ message: 'User logged out successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid input data');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to logout user');
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await authService.getProfile(req.user!.userId);
    res.json(user);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to fetch user profile');
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json(user);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to update user profile');
  }
});

export const authRoutes = router;
