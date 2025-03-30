import { ErrorCode } from '../utils/errors';

// Track Info Types
export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  key?: string;
  genre?: string;
  url: string;
}

// Download Types
export interface DownloadProgress {
  url: string;
  progress: number;
  trackInfo: TrackInfo;
}

export interface DownloadResult {
  url: string;
  success: boolean;
  filePath?: string;
  trackInfo?: TrackInfo;
  error?: string;
}

// Settings Types
export interface Settings {
  downloadPath: string;
  maxConcurrentDownloads: number;
  autoCheckUpdates: boolean;
  saveMetadata: boolean;
  fileNamingTemplate: string;
  audioQuality: 'high' | 'medium' | 'low';
}

// Update Types
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

// Response Types
export interface SuccessResponse<T = void> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: ErrorCode;
}

export type ApiResponse<T = void> = SuccessResponse<T> | ErrorResponse;

// IPC Channel Names
export const IpcChannels = {
  // Authentication
  LOGIN: 'beatport:login',
  LOGOUT: 'beatport:logout',

  // Track Operations
  GET_TRACK_INFO: 'beatport:get-track-info',
  DOWNLOAD_TRACK: 'beatport:download',
  CANCEL_DOWNLOAD: 'beatport:cancel',
  GET_DOWNLOAD_PROGRESS: 'beatport:progress',

  // Settings
  GET_SETTINGS: 'settings:get',
  SAVE_SETTINGS: 'settings:save',

  // Updates
  CHECK_UPDATES: 'app:check-updates',
  UPDATE_AVAILABLE: 'update:available',
  UPDATE_DOWNLOADED: 'update:downloaded',
  INSTALL_UPDATE: 'update:install',

  // Events
  DOWNLOAD_PROGRESS: 'download:progress',
  DOWNLOAD_COMPLETE: 'download:complete',
  DOWNLOAD_ERROR: 'download:error',

  // Logs
  GET_LOGS: 'logs:get',
} as const;

// Type-safe IPC channel mapping
export interface IpcMainHandlers {
  [IpcChannels.LOGIN]: (username: string, password: string) => Promise<ApiResponse<boolean>>;
  [IpcChannels.LOGOUT]: () => Promise<ApiResponse>;
  [IpcChannels.GET_TRACK_INFO]: (url: string) => Promise<ApiResponse<TrackInfo>>;
  [IpcChannels.DOWNLOAD_TRACK]: (url: string) => Promise<ApiResponse<DownloadResult>>;
  [IpcChannels.CANCEL_DOWNLOAD]: (url: string) => Promise<ApiResponse>;
  [IpcChannels.GET_DOWNLOAD_PROGRESS]: () => Promise<ApiResponse<Record<string, number>>>;
  [IpcChannels.GET_SETTINGS]: () => Promise<ApiResponse<Settings>>;
  [IpcChannels.SAVE_SETTINGS]: (settings: Settings) => Promise<ApiResponse>;
  [IpcChannels.CHECK_UPDATES]: () => Promise<ApiResponse<UpdateInfo>>;
  [IpcChannels.GET_LOGS]: () => Promise<ApiResponse<string[]>>;
}

export interface IpcRendererHandlers {
  [IpcChannels.DOWNLOAD_PROGRESS]: (callback: (progress: DownloadProgress) => void) => void;
  [IpcChannels.DOWNLOAD_COMPLETE]: (callback: (result: DownloadResult) => void) => void;
  [IpcChannels.DOWNLOAD_ERROR]: (callback: (error: ErrorResponse) => void) => void;
  [IpcChannels.UPDATE_AVAILABLE]: (callback: (info: UpdateInfo) => void) => void;
  [IpcChannels.UPDATE_DOWNLOADED]: (callback: (info: UpdateInfo) => void) => void;
}
