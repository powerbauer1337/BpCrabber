import axios from 'axios';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { DownloadManager } from '../utils/download';
import type { DownloadOptions } from '../utils/download';
import { logger } from '../utils/logger';
import path from 'path';

// Validation schemas
const beatportTrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  mix: z.string().optional(),
  duration: z.number(),
  bpm: z.number().optional(),
  key: z.string().optional(),
  genre: z.string().optional(),
  releaseDate: z.string().optional(),
  label: z.string().optional(),
  price: z.number().optional(),
  artwork: z.string().optional(),
  previewUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
});

const searchResponseSchema = z.object({
  results: z.array(beatportTrackSchema),
  totalResults: z.number(),
  page: z.number(),
  perPage: z.number(),
});

type BeatportTrack = z.infer<typeof beatportTrackSchema>;
type SearchResponse = z.infer<typeof searchResponseSchema>;

export class BeatportService {
  private apiClient: ReturnType<typeof axios.create>;
  private downloadManager: DownloadManager;
  private tokenExpiresAt: number = 0;
  private accessToken: string = '';

  constructor() {
    this.apiClient = axios.create({
      baseURL: 'https://api.beatport.com/v4',
      timeout: 10000,
    });
    this.downloadManager = new DownloadManager();

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const status = error.response.status || 500;
          const message = error.response.data?.message || 'An error occurred with Beatport API';
          throw new AppError(status, message);
        }
        throw new AppError(500, 'Failed to connect to Beatport API');
      }
    );
  }

  /**
   * Get authentication token for Beatport API
   */
  private async getAuthToken(): Promise<string> {
    try {
      // Check if we have a valid token
      if (this.accessToken && Date.now() < this.tokenExpiresAt) {
        return this.accessToken;
      }

      const apiKey = process.env.BEATPORT_API_KEY;
      const apiSecret = process.env.BEATPORT_API_SECRET;

      if (!apiKey || !apiSecret) {
        throw new AppError(500, 'Beatport API credentials not configured');
      }

      const response = await this.apiClient.post('/auth/token', {
        client_id: apiKey,
        client_secret: apiSecret,
        grant_type: 'client_credentials',
      });

      const data = response.data as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      return this.accessToken;
    } catch (error) {
      logger.error('Failed to get Beatport auth token:', error);
      throw new AppError(401, 'Failed to authenticate with Beatport API');
    }
  }

  /**
   * Search for tracks on Beatport
   */
  async searchTracks(
    query: string,
    page: number = 1,
    perPage: number = 20
  ): Promise<SearchResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await this.apiClient.get('/tracks/search', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: query,
          page,
          per_page: perPage,
          fields:
            'id,title,artist,mix,duration,bpm,key,genre,releaseDate,label,price,artwork,previewUrl,downloadUrl',
        },
      });

      return searchResponseSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Invalid track data from Beatport:', error);
        throw new AppError(400, 'Invalid track data received from Beatport');
      }
      if (error instanceof AppError) throw error;
      logger.error('Failed to search Beatport tracks:', error);
      throw new AppError(500, 'Failed to search tracks on Beatport');
    }
  }

  /**
   * Get track details by ID
   */
  async getTrackById(beatportId: string): Promise<BeatportTrack> {
    try {
      const token = await this.getAuthToken();

      const response = await this.apiClient.get(`/tracks/${beatportId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fields:
            'id,title,artist,mix,duration,bpm,key,genre,releaseDate,label,price,artwork,previewUrl,downloadUrl',
        },
      });

      return beatportTrackSchema.parse(response.data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error('Invalid track data from Beatport:', error);
        throw new AppError(400, 'Invalid track data received from Beatport');
      }
      if (error instanceof AppError) throw error;
      logger.error('Failed to fetch Beatport track:', error);
      throw new AppError(500, 'Failed to fetch track from Beatport');
    }
  }

  /**
   * Download track from Beatport
   */
  async downloadTrack(beatportId: string, format: 'mp3' | 'wav' = 'mp3'): Promise<string> {
    try {
      const track = await this.getTrackById(beatportId);

      if (!track.downloadUrl) {
        throw new AppError(400, 'Track download URL not available');
      }

      const token = await this.getAuthToken();
      const filename =
        `${track.artist} - ${track.title}${track.mix ? ` (${track.mix})` : ''}.${format}`.replace(
          /[/\\?%*:|"<>]/g,
          '-'
        );

      const downloadUrl = `${track.downloadUrl}?format=${format}`;
      const downloadDir = process.env.UPLOAD_DIR || 'uploads';
      const filePath = path.join(downloadDir, filename);

      const downloadOptions: DownloadOptions = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
        },
      };

      await this.downloadManager.downloadFile(downloadUrl, filePath, downloadOptions);

      logger.info(`Successfully downloaded track: ${filename}`);
      return filePath;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to download track:', error);
      throw new AppError(500, 'Failed to download track from Beatport');
    }
  }

  /**
   * Get preview stream URL for a track
   */
  async getPreviewUrl(beatportId: string): Promise<string> {
    try {
      const track = await this.getTrackById(beatportId);

      if (!track.previewUrl) {
        throw new AppError(400, 'Track preview not available');
      }

      return track.previewUrl;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get track preview URL:', error);
      throw new AppError(500, 'Failed to get track preview URL');
    }
  }

  /**
   * Clean up downloaded files
   */
  async cleanupDownloads(): Promise<void> {
    await this.downloadManager.cleanupDownloads();
  }
}
