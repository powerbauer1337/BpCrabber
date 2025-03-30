import axios from 'axios';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';
import { downloadUtils } from '../utils/downloadUtils';
import { logger } from '@electron/utils/logger';

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
  private tokenExpiresAt: number = 0;
  private accessToken: string = '';

  constructor() {
    this.apiClient = axios.create({
      baseURL: 'https://api.beatport.com/v4',
      timeout: 10000,
    });

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const status = error.response.status || 500;
          const message = error.response.data?.message || 'An error occurred with Beatport API';
          throw new AppError(message, status);
        }
        throw new AppError('Failed to connect to Beatport API', 500);
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
        throw new AppError('Beatport API credentials not configured', 500);
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
      throw new AppError('Failed to authenticate with Beatport API', 401);
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
        throw new AppError('Invalid track data received from Beatport', 400);
      }
      if (error instanceof AppError) throw error;
      logger.error('Failed to search Beatport tracks:', error);
      throw new AppError('Failed to search tracks on Beatport', 500);
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
        throw new AppError('Invalid track data received from Beatport', 400);
      }
      if (error instanceof AppError) throw error;
      logger.error('Failed to fetch Beatport track:', error);
      throw new AppError('Failed to fetch track from Beatport', 500);
    }
  }

  /**
   * Download track from Beatport
   */
  async downloadTrack(beatportId: string, format: 'mp3' | 'wav' = 'mp3'): Promise<string> {
    try {
      const track = await this.getTrackById(beatportId);

      if (!track.downloadUrl) {
        throw new AppError('Track download URL not available', 400);
      }

      const filename =
        `${track.artist} - ${track.title}${track.mix ? ` (${track.mix})` : ''}.${format}`.replace(
          /[/\\?%*:|"<>]/g,
          '-'
        );

      const downloadUrl = `${track.downloadUrl}?format=${format}`;
      const result = await downloadUtils.downloadFile(downloadUrl, filename);

      if (!result.success || !result.filePath) {
        throw new AppError(result.error || 'Failed to download track', 500);
      }

      logger.info(`Successfully downloaded track: ${filename}`);
      return result.filePath;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to download track:', error);
      throw new AppError('Failed to download track from Beatport', 500);
    }
  }

  /**
   * Get preview stream URL for a track
   */
  async getPreviewUrl(beatportId: string): Promise<string> {
    const track = await this.getTrackById(beatportId);
    if (!track.previewUrl) {
      throw new AppError('Track preview URL not available', 400);
    }
    return track.previewUrl;
  }

  /**
   * Clean up downloaded files
   */
  async cleanupDownloads(): Promise<void> {
    const result = await downloadUtils.cleanupDownloads();
    if (!result.success) {
      throw new AppError(result.error || 'Failed to cleanup downloads', 500);
    }
  }
}
