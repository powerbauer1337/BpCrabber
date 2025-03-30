import { join } from 'path';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { get } from 'https';
import { AppError, ErrorCode } from '../utils/errors';
import type { DownloadHistory } from '../types';

export class DownloadService {
  private downloadPath: string;
  private activeDownloads = new Map<string, NodeJS.Timeout>();

  constructor(downloadPath: string) {
    this.downloadPath = downloadPath;
  }

  setDownloadPath(path: string) {
    this.downloadPath = path;
  }

  async startDownload(
    url: string,
    metadata: { title: string; artist: string }
  ): Promise<DownloadHistory> {
    try {
      // Ensure download directory exists
      await mkdir(this.downloadPath, { recursive: true });

      const fileName = `${metadata.artist} - ${metadata.title}.mp3`.replace(/[/\\?%*:|"<>]/g, '-');
      const filePath = join(this.downloadPath, fileName);

      // Create write stream
      const fileStream = createWriteStream(filePath);

      // Start download
      await new Promise<void>((resolve, reject) => {
        get(url, response => {
          if (response.statusCode !== 200) {
            reject(
              new AppError('Failed to start download', {
                code: ErrorCode.NETWORK,
                details: { status: response.statusCode },
              })
            );
            return;
          }

          response.pipe(fileStream);
          response.on('end', () => resolve());
          response.on('error', error => reject(error));
        }).on('error', error => reject(error));
      });

      // Create download history entry
      const downloadHistory: DownloadHistory = {
        id: Math.random().toString(36).substring(2, 9),
        url,
        title: metadata.title,
        artist: metadata.artist,
        downloadedAt: new Date().toISOString(),
        path: filePath,
      };

      return downloadHistory;
    } catch (error) {
      throw new AppError('Download failed', {
        code: ErrorCode.UNKNOWN,
        operationType: 'download',
        details: { url, metadata },
      });
    }
  }

  cancelDownload(url: string) {
    const timeout = this.activeDownloads.get(url);
    if (timeout) {
      clearTimeout(timeout);
      this.activeDownloads.delete(url);
    }
  }

  isDownloading(url: string): boolean {
    return this.activeDownloads.has(url);
  }
}
