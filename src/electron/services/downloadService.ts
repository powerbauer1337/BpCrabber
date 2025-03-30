import { DownloadProgress, DownloadResult, TrackInfo } from '../../shared/ipc/types';
import { DownloadError } from '../../shared/utils/errors';
import { logger } from '../../shared/utils/logger';
import { app } from 'electron';
import { join } from 'path';
import { createWriteStream, promises as fs } from 'fs';
import fetch, { Response } from 'node-fetch';
import { Readable } from 'stream';

export class DownloadService {
  private downloadPath: string;
  private activeDownloads: Map<string, AbortController>;

  constructor(downloadPath?: string) {
    this.downloadPath = downloadPath || join(app.getPath('downloads'), 'Beatport');
    this.activeDownloads = new Map();
  }

  async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.downloadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create download directory:', error);
      throw new DownloadError('Failed to create download directory', {
        details: { path: this.downloadPath },
      });
    }
  }

  async downloadTrack(
    url: string,
    trackInfo: TrackInfo,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<DownloadResult> {
    await this.ensureDownloadDirectory();

    const abortController = new AbortController();
    this.activeDownloads.set(url, abortController);

    try {
      const response = await fetch(url, {
        signal: abortController.signal as unknown as AbortSignal,
      });

      if (!response.ok) {
        throw new DownloadError(`HTTP error! status: ${response.status}`);
      }

      const contentLength = Number(response.headers.get('content-length')) || 0;
      let downloaded = 0;

      const fileName = `${trackInfo.artist} - ${trackInfo.title}.mp3`.replace(
        /[/\\?%*:|"<>]/g,
        '-'
      );
      const filePath = join(this.downloadPath, fileName);
      const fileStream = createWriteStream(filePath);

      const reportProgress = (chunk: Buffer) => {
        downloaded += chunk.length;
        const progress = contentLength ? (downloaded / contentLength) * 100 : 0;
        onProgress?.({
          url,
          progress: Math.min(progress, 100),
          trackInfo,
        });
      };

      await new Promise<void>((resolve, reject) => {
        if (response.body instanceof Readable) {
          response.body.on('data', chunk => {
            fileStream.write(chunk);
            reportProgress(chunk);
          });

          response.body.on('end', () => {
            fileStream.end();
            resolve();
          });

          response.body.on('error', error => {
            fileStream.destroy();
            reject(error);
          });

          fileStream.on('error', error => {
            response.body?.destroy();
            reject(error);
          });
        } else {
          reject(new Error('Response body is not a readable stream'));
        }
      });

      this.activeDownloads.delete(url);
      return {
        url,
        success: true,
        filePath,
        trackInfo,
      };
    } catch (error) {
      this.activeDownloads.delete(url);
      if (error instanceof Error) {
        logger.error('Download failed:', error);
        return {
          url,
          success: false,
          error: error.message,
          trackInfo,
        };
      }
      throw error;
    }
  }

  cancelDownload(url: string): void {
    const controller = this.activeDownloads.get(url);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(url);
      logger.info(`Download cancelled for URL: ${url}`);
    }
  }

  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  setDownloadPath(path: string): void {
    this.downloadPath = path;
  }
}
