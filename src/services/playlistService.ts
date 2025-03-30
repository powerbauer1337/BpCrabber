import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Validation schemas
const createPlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trackIds: z.array(z.string()).optional(),
});

const updatePlaylistSchema = createPlaylistSchema.partial();

// Types
type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

export class PlaylistService {
  /**
   * Get all playlists for a user
   */
  async getAllPlaylists(userId: string) {
    try {
      return await prisma.playlist.findMany({
        where: { userId },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      throw new AppError(500, 'Failed to fetch playlists');
    }
  }

  /**
   * Get playlist by ID
   */
  async getPlaylistById(id: string, userId: string) {
    try {
      const playlist = await prisma.playlist.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!playlist) {
        throw new AppError(404, 'Playlist not found');
      }

      return playlist;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to fetch playlist');
    }
  }

  /**
   * Create new playlist
   */
  async createPlaylist(userId: string, input: CreatePlaylistInput) {
    try {
      const validatedData = createPlaylistSchema.parse(input);

      return await prisma.playlist.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          userId,
          ...(validatedData.trackIds && {
            tracks: {
              connect: validatedData.trackIds.map(id => ({ id })),
            },
          }),
        },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      throw new AppError(500, 'Failed to create playlist');
    }
  }

  /**
   * Update playlist
   */
  async updatePlaylist(id: string, userId: string, input: UpdatePlaylistInput) {
    try {
      const validatedData = updatePlaylistSchema.parse(input);

      await this.getPlaylistById(id, userId);

      return await prisma.playlist.update({
        where: { id },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          ...(validatedData.trackIds && {
            tracks: {
              set: validatedData.trackIds.map(id => ({ id })),
            },
          }),
        },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new AppError(400, 'Invalid input data');
      }
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to update playlist');
    }
  }

  /**
   * Delete playlist
   */
  async deletePlaylist(id: string, userId: string) {
    try {
      await this.getPlaylistById(id, userId);
      await prisma.playlist.delete({ where: { id } });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to delete playlist');
    }
  }

  /**
   * Add track to playlist
   */
  async addTrackToPlaylist(playlistId: string, trackId: string, userId: string) {
    try {
      await this.getPlaylistById(playlistId, userId);

      const track = await prisma.track.findUnique({
        where: { id: trackId },
      });

      if (!track) {
        throw new AppError(404, 'Track not found');
      }

      return await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          tracks: {
            connect: { id: trackId },
          },
        },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to add track to playlist');
    }
  }

  /**
   * Remove track from playlist
   */
  async removeTrackFromPlaylist(playlistId: string, trackId: string, userId: string) {
    try {
      await this.getPlaylistById(playlistId, userId);

      return await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          tracks: {
            disconnect: { id: trackId },
          },
        },
        include: {
          tracks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(500, 'Failed to remove track from playlist');
    }
  }
}

export const playlistService = new PlaylistService();
