import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { trackService } from '../services/trackService';

const router = Router();

// Get all tracks
router.get('/', async (req: Request, res: Response) => {
  try {
    const tracks = await trackService.getAllTracks(req.user!.userId);
    res.json(tracks);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to fetch tracks');
  }
});

// Search tracks
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      throw new AppError(400, 'Search query is required');
    }
    const tracks = await trackService.searchTracks(query, req.user!.userId);
    res.json(tracks);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to search tracks');
  }
});

// Get track by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const track = await trackService.getTrackById(id, req.user!.userId);
    res.json(track);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to fetch track');
  }
});

// Create new track
router.post('/', async (req: Request, res: Response) => {
  try {
    const track = await trackService.createTrack(req.body);
    res.status(201).json(track);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to create track');
  }
});

// Update track
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const track = await trackService.updateTrack(id, req.body);
    res.json(track);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to update track');
  }
});

// Delete track
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await trackService.deleteTrack(id);
    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to delete track');
  }
});

export const trackRoutes = router;
