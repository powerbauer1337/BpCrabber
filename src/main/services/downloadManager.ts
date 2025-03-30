import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

export interface DownloadProgress {
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
}

export class DownloadManager extends EventEmitter {
  private downloadPath: string;
  private activeDownloads: Map<string, AbortController>;

  constructor() {
    super();
    this.downloadPath = path.join(app.getPath('userData'), 'downloads');
    this.activeDownloads = new Map();
    this.ensureDownloadDirectory();
  }

  private async ensureDownloadDirectory(): Promise<void> {
    try {
      await fs.access(this.downloadPath);
    } catch {
      await fs.mkdir(this.downloadPath, { recursive: true });
    }
  }

  public async downloadFile(
    url: string,
    filename: string,
    options?: DownloadOptions
  ): Promise<string> {
    const filePath = path.join(this.downloadPath, filename);
    const abortController = new AbortController();
    this.activeDownloads.set(filename, abortController);

    try {
      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        // @ts-ignore - signal is supported in axios but types are not up to date
        signal: abortController.signal,
      });

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let bytesReceived = 0;

      const stream = response.data as Readable;
      stream.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
        options?.onProgress?.({
          bytesReceived,
          totalBytes,
          percentage: totalBytes ? (bytesReceived / totalBytes) * 100 : 0,
        });
      });

      const writer = createWriteStream(filePath);
      await pipeline(stream, writer);

      this.activeDownloads.delete(filename);
      return filePath;
    } catch (error) {
      this.activeDownloads.delete(filename);
      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore error if file doesn't exist
      }
      throw error;
    }
  }

  public async verifyFile(filePath: string, expectedHash?: string): Promise<boolean> {
    if (!expectedHash) return true;

    const fileBuffer = await fs.readFile(filePath);
    const hash = createHash('sha256').update(fileBuffer).digest('hex');
    return hash === expectedHash;
  }

  public async cleanupDownloads(): Promise<void> {
    const files = await fs.readdir(this.downloadPath);
    await Promise.all(files.map(file => fs.unlink(path.join(this.downloadPath, file))));
  }

  public cancelDownload(filename: string): void {
    const controller = this.activeDownloads.get(filename);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(filename);
    }
  }

  public getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }

  public getDownloadPath(): string {
    return this.downloadPath;
  }

  public setDownloadPath(newPath: string): void {
    this.downloadPath = newPath;
    this.ensureDownloadDirectory();
  }
}
