import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { playlistService } from '../services/playlistService';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createPlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trackIds: z.array(z.string()).optional(),
});

const updatePlaylistSchema = createPlaylistSchema.partial();

// Get all playlists
router.get('/', async (req: Request, res: Response) => {
  try {
    const playlists = await playlistService.getAllPlaylists(req.user!.userId);
    res.json(playlists);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to fetch playlists');
  }
});

// Get playlist by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const playlist = await playlistService.getPlaylistById(id, req.user!.userId);
    res.json(playlist);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to fetch playlist');
  }
});

// Create new playlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createPlaylistSchema.parse(req.body);
    const playlist = await playlistService.createPlaylist(req.user!.userId, validatedData);
    res.status(201).json(playlist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid input data');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to create playlist');
  }
});

// Update playlist
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = updatePlaylistSchema.parse(req.body);
    const playlist = await playlistService.updatePlaylist(id, req.user!.userId, validatedData);
    res.json(playlist);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid input data');
    }
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to update playlist');
  }
});

// Delete playlist
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await playlistService.deletePlaylist(id, req.user!.userId);
    res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to delete playlist');
  }
});

// Add track to playlist
router.post('/:id/tracks/:trackId', async (req: Request, res: Response) => {
  try {
    const { id, trackId } = req.params;
    const playlist = await playlistService.addTrackToPlaylist(id, trackId, req.user!.userId);
    res.json(playlist);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to add track to playlist');
  }
});

// Remove track from playlist
router.delete('/:id/tracks/:trackId', async (req: Request, res: Response) => {
  try {
    const { id, trackId } = req.params;
    const playlist = await playlistService.removeTrackFromPlaylist(id, trackId, req.user!.userId);
    res.json(playlist);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, 'Failed to remove track from playlist');
  }
});

export const playlistRoutes = router;
