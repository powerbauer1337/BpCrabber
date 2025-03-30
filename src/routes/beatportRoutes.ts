import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { BeatportService } from '../services/beatportService';
import { z } from 'zod';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const beatportService = new BeatportService();

// Validation schemas
const searchQuerySchema = z.object({
  query: z.string().min(1),
  page: z.string().transform(Number).optional(),
  perPage: z.string().transform(Number).optional(),
});

const formatSchema = z.enum(['mp3', 'wav']);

// Apply authentication to all routes
router.use(authenticateToken);

// Search Beatport tracks
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { query, page, perPage } = searchQuerySchema.parse(req.query);
    const tracks = await beatportService.searchTracks(query, page, perPage);
    res.json(tracks);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid search parameters');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'Failed to search Beatport tracks');
  }
});

// Get track details
router.get('/tracks/:beatportId', async (req: Request, res: Response) => {
  try {
    const { beatportId } = req.params;
    const track = await beatportService.getTrackById(beatportId);
    res.json(track);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'Failed to fetch Beatport track');
  }
});

// Download track
router.get('/tracks/:beatportId/download', async (req: Request, res: Response) => {
  try {
    const { beatportId } = req.params;
    const format = formatSchema.parse(req.query.format || 'mp3');

    const filePath = await beatportService.downloadTrack(beatportId, format);
    res.download(filePath, async () => {
      // Cleanup file after download
      await beatportService.cleanupDownloads();
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, 'Invalid format specified');
    }
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'Failed to download track');
  }
});

// Get track preview URL
router.get('/tracks/:beatportId/preview', async (req: Request, res: Response) => {
  try {
    const { beatportId } = req.params;
    const previewUrl = await beatportService.getPreviewUrl(beatportId);
    res.json({ previewUrl });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, 'Failed to get track preview');
  }
});

export const beatportRoutes = router;
