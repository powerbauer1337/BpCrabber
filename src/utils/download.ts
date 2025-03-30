import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
}

export interface DownloadOptions {
  headers?: Record<string, string>;
  onProgress?: (progress: DownloadProgress) => void;
}

export class DownloadManager extends EventEmitter {
  private downloadPath: string;
  private activeDownloads: Map<string, AbortController>;

  constructor(downloadPath = 'downloads') {
    super();
    this.downloadPath = downloadPath;
    this.activeDownloads = new Map();

    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
  }

  async downloadFile(
    url: string,
    filename: string,
    options: DownloadOptions = {}
  ): Promise<string> {
    const filePath = path.join(this.downloadPath, filename);
    const abortController = new AbortController();
    this.activeDownloads.set(filename, abortController);

    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        headers: options.headers,
      });

      const totalBytes = parseInt(response.headers['content-length'], 10);
      let bytesDownloaded = 0;

      const writer = fs.createWriteStream(filePath);
      const stream = response.data as Readable;

      stream.pipe(writer);

      stream.on('data', (chunk: Buffer) => {
        bytesDownloaded += chunk.length;
        const percentage = (bytesDownloaded / totalBytes) * 100;

        const progress: DownloadProgress = {
          bytesDownloaded,
          totalBytes,
          percentage,
        };

        this.emit('progress', filename, progress);
        options.onProgress?.(progress);
      });

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve());
        writer.on('error', reject);
      });

      this.activeDownloads.delete(filename);
      return filePath;
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      this.activeDownloads.delete(filename);
      throw error;
    }
  }

  async verifyFile(filePath: string, expectedHash?: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    if (expectedHash) {
      const fileBuffer = fs.readFileSync(filePath);
      const hash = createHash('sha256').update(fileBuffer).digest('hex');
      return hash === expectedHash;
    }

    return true;
  }

  async cleanupDownloads(): Promise<void> {
    if (fs.existsSync(this.downloadPath)) {
      const files = fs.readdirSync(this.downloadPath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.downloadPath, file));
      }
    }
  }

  cancelDownload(filename: string): void {
    const controller = this.activeDownloads.get(filename);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(filename);
    }
  }

  getActiveDownloads(): string[] {
    return Array.from(this.activeDownloads.keys());
  }
}
