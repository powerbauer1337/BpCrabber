import { Track } from './track';

export interface DownloadOptions {
  format: 'mp3' | 'wav' | 'aiff';
  quality?: '128' | '256' | '320' | 'lossless';
  includeArtwork: boolean;
  includeMetadata: boolean;
  downloadPath?: string;
  createArtistFolder: boolean;
  createLabelFolder: boolean;
  fileNamingTemplate: string;
}

export interface DownloadProgress {
  trackId: string;
  status: DownloadStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
  error?: string;
}

export enum DownloadStatus {
  QUEUED = 'queued',
  DOWNLOADING = 'downloading',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface DownloadTask {
  id: string;
  trackId: string;
  track: Track;
  options: DownloadOptions;
  progress: DownloadProgress;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
}

export interface DownloadQueue {
  tasks: DownloadTask[];
  inProgress: DownloadTask[];
  completed: DownloadTask[];
  failed: DownloadTask[];
  isPaused: boolean;
  concurrentDownloads: number;
}

export type DownloadEventCallback = {
  progress: (progress: DownloadProgress) => void;
  complete: (task: DownloadTask) => void;
  error: (task: DownloadTask, error: Error) => void;
};

export interface DownloadService {
  // Queue management
  addToQueue(trackId: string, options?: Partial<DownloadOptions>): Promise<DownloadTask>;
  removeFromQueue(taskId: string): Promise<void>;
  clearQueue(): Promise<void>;

  // Download control
  startDownload(taskId: string): Promise<void>;
  pauseDownload(taskId: string): Promise<void>;
  resumeDownload(taskId: string): Promise<void>;
  cancelDownload(taskId: string): Promise<void>;
  retryDownload(taskId: string): Promise<void>;

  // Queue control
  pauseQueue(): Promise<void>;
  resumeQueue(): Promise<void>;

  // Status and progress
  getProgress(taskId: string): DownloadProgress;
  getQueue(): DownloadQueue;

  // Settings
  setOptions(options: Partial<DownloadOptions>): void;
  getOptions(): DownloadOptions;

  // Events
  on<K extends keyof DownloadEventCallback>(event: K, callback: DownloadEventCallback[K]): void;
  off<K extends keyof DownloadEventCallback>(event: K, callback: DownloadEventCallback[K]): void;
}
