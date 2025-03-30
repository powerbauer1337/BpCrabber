import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import { createWriteStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { AppError, ErrorCode } from '../../shared/utils/errors';
import { logger } from '../../shared/utils/logger';
import { TrackInfo } from '../../shared/ipc/types';
import { app } from 'electron';
import { join } from 'path';
import { Readable } from 'stream';

export interface DownloadProgressEvent {
  url: string;
  bytesReceived: number;
  totalBytes: number;
  progress: number;
  trackInfo?: TrackInfo;
}

export interface DownloadResultEvent {
  url: string;
  filePath: string;
  size: number;
  trackInfo?: TrackInfo;
}

export class DownloadService extends EventEmitter {
  private downloadPath: string;
  private activeDownloads: Map<string, AbortController>;

  constructor(downloadPath?: string) {
    super();
    this.downloadPath = downloadPath || join(app.getPath('downloads'), 'Beatport');
    this.activeDownloads = new Map();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.downloadPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create download directory:', error);
      throw new AppError('Failed to create download directory', {
        code: ErrorCode.FILE_SYSTEM,
        details: { path: this.downloadPath },
      });
    }
  }

  async downloadTrack(
    url: string,
    trackInfo: TrackInfo,
    onProgress?: (progress: DownloadProgressEvent) => void
  ): Promise<DownloadResultEvent> {
    await this.ensureDownloadDirectory();

    const filePath = join(this.downloadPath, `${trackInfo.title}.mp3`);
    const abortController = new AbortController();
    this.activeDownloads.set(url, abortController);

    try {
      const response = await fetch(url, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new AppError(`HTTP error! status: ${response.status}`, {
          code: ErrorCode.NETWORK,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        });
      }

      const totalBytes = Number(response.headers.get('content-length')) || 0;
      let downloaded = 0;

      const fileStream = createWriteStream(filePath);

      if (!response.body) {
        throw new AppError('No response body', {
          code: ErrorCode.NETWORK,
        });
      }

      if (response.body instanceof Readable) {
        response.body.on('data', (chunk: Buffer) => {
          downloaded += chunk.length;
          const progress = totalBytes ? (downloaded / totalBytes) * 100 : 0;

          const progressEvent: DownloadProgressEvent = {
            url,
            bytesReceived: downloaded,
            totalBytes,
            progress: Math.min(progress, 100),
            trackInfo,
          };

          this.emit('progress', progressEvent);
          if (onProgress) onProgress(progressEvent);
        });

        await pipeline(response.body, fileStream);
      } else {
        throw new AppError('Response body is not a readable stream', {
          code: ErrorCode.NETWORK,
        });
      }

      this.activeDownloads.delete(url);

      const result: DownloadResultEvent = {
        url,
        filePath,
        size: downloaded,
        trackInfo,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      this.activeDownloads.delete(url);
      if (error instanceof Error) {
        logger.error('Download failed:', error);
        throw new AppError(error.message, {
          code: ErrorCode.DOWNLOAD,
          details: {
            url,
            filePath,
            trackInfo,
          },
        });
      }
      throw error;
    }
  }

  cancelDownload(url: string): void {
    const controller = this.activeDownloads.get(url);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(url);
      this.emit('cancelled', { url });
    }
  }

  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  setDownloadPath(path: string): void {
    this.downloadPath = path;
  }

  getDownloadPath(): string {
    return this.downloadPath;
  }

  async downloadFile(url: string, filePath: string): Promise<DownloadResultEvent> {
    try {
      const abortController = new AbortController();
      this.activeDownloads.set(url, abortController);

      const response = await fetch(url, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new AppError(`HTTP error! status: ${response.status}`, {
          code: ErrorCode.NETWORK,
          details: {
            status: response.status,
            statusText: response.statusText,
          },
        });
      }

      const totalBytes = Number(response.headers.get('content-length')) || 0;
      let bytesReceived = 0;

      const fileStream = createWriteStream(filePath);

      if (!response.body) {
        throw new AppError('No response body', {
          code: ErrorCode.NETWORK,
        });
      }

      if (response.body instanceof Readable) {
        response.body.on('data', (chunk: Buffer) => {
          bytesReceived += chunk.length;
          const progress = totalBytes ? (bytesReceived / totalBytes) * 100 : 0;

          this.emit('progress', {
            url,
            bytesReceived,
            totalBytes,
            progress,
          } as DownloadProgressEvent);
        });

        await pipeline(response.body, fileStream);
      } else {
        throw new AppError('Response body is not a readable stream', {
          code: ErrorCode.NETWORK,
        });
      }

      this.activeDownloads.delete(url);

      const result: DownloadResultEvent = {
        url,
        filePath,
        size: bytesReceived,
      };

      this.emit('complete', result);
      return result;
    } catch (error) {
      this.activeDownloads.delete(url);

      if (error instanceof Error) {
        throw new AppError(error.message, {
          code: ErrorCode.DOWNLOAD,
          details: {
            url,
            filePath,
          },
        });
      }

      throw error;
    }
  }

  isDownloading(url: string): boolean {
    return this.activeDownloads.has(url);
  }
}
