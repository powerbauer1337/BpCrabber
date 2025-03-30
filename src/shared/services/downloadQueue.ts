import { logger } from '@shared/utils/logger';
import { performanceMonitor } from '@shared/utils/performance';
import { TrackInfo } from '@shared/types';
import EventEmitter from 'events';

export interface DownloadTask {
  id: string;
  track: TrackInfo;
  priority: number;
  retryCount: number;
  status: 'queued' | 'downloading' | 'completed' | 'error' | 'cancelled';
  error?: Error;
  progress: number;
  startTime?: number;
  endTime?: number;
}

export class DownloadQueue extends EventEmitter {
  private static instance: DownloadQueue;
  private queue: DownloadTask[];
  private activeDownloads: Map<string, DownloadTask>;
  private maxConcurrent: number;
  private isProcessing: boolean;
  private downloadHandler: (track: TrackInfo) => Promise<void>;

  private constructor(maxConcurrent: number = 3) {
    super();
    this.queue = [];
    this.activeDownloads = new Map();
    this.maxConcurrent = maxConcurrent;
    this.isProcessing = false;
    this.downloadHandler = async () => {
      throw new Error('Download handler not set');
    };
  }

  public static getInstance(maxConcurrent?: number): DownloadQueue {
    if (!DownloadQueue.instance) {
      DownloadQueue.instance = new DownloadQueue(maxConcurrent);
    }
    return DownloadQueue.instance;
  }

  public setDownloadHandler(handler: (track: TrackInfo) => Promise<void>): void {
    this.downloadHandler = handler;
  }

  public async addToQueue(track: TrackInfo, priority: number = 0): Promise<string> {
    const task: DownloadTask = {
      id: `${track.id}-${Date.now()}`,
      track,
      priority,
      retryCount: 0,
      status: 'queued',
      progress: 0,
    };

    this.queue.push(task);
    this.sortQueue();

    logger.info(`Added track to queue: ${track.title}`, {
      taskId: task.id,
      priority,
    });

    this.emit('taskAdded', task);
    this.processQueue();

    return task.id;
  }

  public cancelDownload(taskId: string): void {
    const activeTask = this.activeDownloads.get(taskId);
    if (activeTask) {
      activeTask.status = 'cancelled';
      this.activeDownloads.delete(taskId);
      this.emit('taskCancelled', activeTask);
    } else {
      this.queue = this.queue.filter(task => {
        if (task.id === taskId) {
          task.status = 'cancelled';
          this.emit('taskCancelled', task);
          return false;
        }
        return true;
      });
    }
  }

  public getQueueStatus(): {
    queued: number;
    active: number;
    completed: number;
    failed: number;
  } {
    const queueStats = this.queue.reduce(
      (acc, task) => {
        acc[task.status]++;
        return acc;
      },
      { queued: 0, downloading: 0, completed: 0, error: 0, cancelled: 0 }
    );

    return {
      queued: queueStats.queued,
      active: this.activeDownloads.size,
      completed: queueStats.completed,
      failed: queueStats.error,
    };
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    if (this.activeDownloads.size >= this.maxConcurrent) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0 && this.activeDownloads.size < this.maxConcurrent) {
        const task = this.queue.shift();
        if (!task) break;

        this.activeDownloads.set(task.id, task);
        task.status = 'downloading';
        task.startTime = Date.now();

        this.emit('taskStarted', task);

        // Start performance monitoring
        performanceMonitor.startTracking(task.id);

        try {
          await this.downloadHandler(task.track);
          task.status = 'completed';
          task.progress = 100;
          task.endTime = Date.now();
          this.emit('taskCompleted', task);
        } catch (error) {
          task.status = 'error';
          task.error = error as Error;
          task.endTime = Date.now();
          this.emit('taskError', task);
          logger.error(`Download failed for track: ${task.track.title}`, {
            taskId: task.id,
            error,
          });
        }

        // End performance monitoring
        performanceMonitor.endTracking(task.id);

        this.activeDownloads.delete(task.id);
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  public updateProgress(taskId: string, progress: number): void {
    const task = this.activeDownloads.get(taskId);
    if (task) {
      task.progress = progress;
      this.emit('taskProgress', { taskId, progress });
    }
  }

  public clearQueue(): void {
    this.queue = [];
    this.emit('queueCleared');
  }

  public getTask(taskId: string): DownloadTask | undefined {
    return this.activeDownloads.get(taskId) || this.queue.find(task => task.id === taskId);
  }

  public setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
    this.processQueue();
  }
}
