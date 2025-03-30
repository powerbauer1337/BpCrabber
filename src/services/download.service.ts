import {
  DownloadService,
  DownloadTask,
  DownloadOptions,
  DownloadProgress,
  DownloadQueue,
  DownloadStatus,
} from '../types/download';
import { AppConfig } from '../config/app.config';
import { createHttpClient } from '../utils/http';
import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

export class BeatportDownloadService extends EventEmitter implements DownloadService {
  private http = createHttpClient(AppConfig.api.baseUrl);
  private queue: DownloadQueue = {
    tasks: [],
    inProgress: [],
    completed: [],
    failed: [],
    isPaused: false,
    concurrentDownloads: AppConfig.download.maxConcurrent,
  };

  async addToQueue(trackId: string, options?: Partial<DownloadOptions>): Promise<DownloadTask> {
    const track = await this.http.get(`/tracks/${trackId}`);
    const task: DownloadTask = {
      id: `dl_${Date.now()}_${trackId}`,
      trackId,
      track: track.data,
      options: {
        format: options?.format || 'mp3',
        quality: options?.quality || '320',
        includeArtwork: options?.includeArtwork ?? true,
        includeMetadata: options?.includeMetadata ?? true,
        downloadPath: options?.downloadPath || AppConfig.download.defaultPath,
        createArtistFolder: options?.createArtistFolder ?? true,
        createLabelFolder: options?.createLabelFolder ?? false,
        fileNamingTemplate: options?.fileNamingTemplate || '{artist} - {title}',
      },
      progress: {
        trackId,
        status: DownloadStatus.QUEUED,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        speed: 0,
        eta: 0,
      },
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: AppConfig.download.maxRetries,
    };

    this.queue.tasks.push(task);
    this.processQueue();
    return task;
  }

  private async processQueue(): Promise<void> {
    if (this.queue.isPaused) return;

    while (
      this.queue.tasks.length > 0 &&
      this.queue.inProgress.length < this.queue.concurrentDownloads
    ) {
      const task = this.queue.tasks.shift();
      if (task) {
        this.queue.inProgress.push(task);
        this.startDownload(task.id).catch(error => {
          console.error(`Download failed for task ${task.id}:`, error);
        });
      }
    }
  }

  // Implement other methods...
}
