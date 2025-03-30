import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Validation schemas
const createTrackSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  duration: z.number().int().positive(),
  bpm: z.number().int().positive().optional(),
  key: z.string().optional(),
  genre: z.string().optional(),
  beatportId: z.string().optional(),
});

const updateTrackSchema = createTrackSchema.partial();

// Types
type CreateTrackInput = z.infer<typeof createTrackSchema>;
type UpdateTrackInput = z.infer<typeof updateTrackSchema>;

export class TrackService {
  /**
   * Get all tracks
   */
  async getAllTracks(userId: string) {
    return prisma.track.findMany({
      where: {
        playlists: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get track by ID
   */
  async getTrackById(id: string, userId: string) {
    const track = await prisma.track.findFirst({
      where: {
        id,
        playlists: {
          some: {
            userId,
          },
        },
      },
    });

    if (!track) {
      throw new AppError(404, 'Track not found');
    }

    return track;
  }

  /**
   * Create new track
   */
  async createTrack(input: CreateTrackInput) {
    try {
      const validatedData = createTrackSchema.parse(input);

      // Check if track with same beatportId exists
      if (validatedData.beatportId) {
        const existingTrack = await prisma.track.findUnique({
          where: { beatportId: validatedData.beatportId },
        });

        if (existingTrack) {
          throw new AppError(400, 'Track with this Beatport ID already exists');
        }
      }

      return prisma.track.create({
        data: validatedData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw error;
    }
  }

  /**
   * Update track
   */
  async updateTrack(id: string, input: UpdateTrackInput) {
    try {
      const validatedData = updateTrackSchema.parse(input);

      // Check if track exists
      const existingTrack = await prisma.track.findUnique({
        where: { id },
      });

      if (!existingTrack) {
        throw new AppError(404, 'Track not found');
      }

      // Check if new beatportId conflicts with existing track
      if (validatedData.beatportId && validatedData.beatportId !== existingTrack.beatportId) {
        const conflictingTrack = await prisma.track.findUnique({
          where: { beatportId: validatedData.beatportId },
        });

        if (conflictingTrack) {
          throw new AppError(400, 'Track with this Beatport ID already exists');
        }
      }

      return prisma.track.update({
        where: { id },
        data: validatedData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw error;
    }
  }

  /**
   * Delete track
   */
  async deleteTrack(id: string) {
    const track = await prisma.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new AppError(404, 'Track not found');
    }

    return prisma.track.delete({
      where: { id },
    });
  }

  /**
   * Search tracks
   */
  async searchTracks(query: string, userId: string) {
    return prisma.track.findMany({
      where: {
        AND: [
          {
            playlists: {
              some: {
                userId,
              },
            },
          },
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { artist: { contains: query, mode: 'insensitive' } },
              { album: { contains: query, mode: 'insensitive' } },
              { genre: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const trackService = new TrackService();
