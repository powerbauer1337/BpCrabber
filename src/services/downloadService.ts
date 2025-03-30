import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import fetch from 'node-fetch';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface DownloadOptions {
  url: string;
  filename: string;
  onProgress?: (progress: number) => void;
}

export class DownloadService {
  private isDownloading = false;
  private currentProgress = 0;
  private abortController: AbortController | null = null;
  private downloadPath: string;

  constructor(downloadPath: string = app.getPath('downloads')) {
    this.downloadPath = downloadPath;
    this.ensureDownloadDirectory();
  }

  private ensureDownloadDirectory(): void {
    if (!fs.existsSync(this.downloadPath)) {
      fs.mkdirSync(this.downloadPath, { recursive: true });
    }
  }

  public setDownloadPath(newPath: string): void {
    this.downloadPath = newPath;
    this.ensureDownloadDirectory();
  }

  public async download({ url, filename, onProgress }: DownloadOptions): Promise<string> {
    if (this.isDownloading) {
      throw new AppError('DOWNLOAD_IN_PROGRESS', 'Another download is already in progress');
    }

    try {
      this.isDownloading = true;
      this.currentProgress = 0;
      this.abortController = new AbortController();

      const filePath = path.join(this.downloadPath, filename);

      // Start download
      const response = await fetch(url, { signal: this.abortController.signal });

      if (!response.ok) {
        throw new AppError('DOWNLOAD_FAILED', `HTTP error! status: ${response.status}`);
      }

      const totalSize = Number(response.headers.get('content-length')) || 0;
      let downloadedSize = 0;

      // Create write stream
      const fileStream = createWriteStream(filePath);

      // Setup progress tracking
      response.body?.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        const progress = totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0;
        this.currentProgress = progress;
        onProgress?.(progress);
      });

      // Use pipeline for proper error handling and cleanup
      await pipeline(response.body!, fileStream);

      logger.info('Download completed', { filename, url });
      return filePath;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('Download failed', error as Error, { filename, url });
      throw new AppError('DOWNLOAD_FAILED', message);
    } finally {
      this.isDownloading = false;
      this.currentProgress = 0;
      this.abortController = null;
    }
  }

  public async cancel(): Promise<void> {
    if (!this.isDownloading) return;

    this.abortController?.abort();
    this.isDownloading = false;
    this.currentProgress = 0;
    logger.info('Download cancelled');
  }

  public getProgress(): { progress: number; status: 'idle' | 'downloading' } {
    return {
      progress: this.currentProgress,
      status: this.isDownloading ? 'downloading' : 'idle',
    };
  }
}
