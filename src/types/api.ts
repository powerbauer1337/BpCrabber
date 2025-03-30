import type { ApiResponse, TrackInfo, Settings, UpdateInfo } from '../shared/ipc/types';

export interface BeatportAPI {
  login: (username: string, password: string) => Promise<ApiResponse<boolean>>;
  downloadTrack: (url: string) => Promise<ApiResponse<void>>;
  getDownloadProgress: () => Promise<ApiResponse<Record<string, number>>>;
  cancelDownload: () => Promise<ApiResponse<void>>;
  getSettings: () => Promise<ApiResponse<Settings>>;
  saveSettings: (settings: Partial<Settings>) => Promise<ApiResponse<void>>;
  getLogs: () => Promise<ApiResponse<string[]>>;
  checkForUpdates: () => Promise<ApiResponse<UpdateInfo>>;
  getTrackInfo: (url: string) => Promise<ApiResponse<TrackInfo>>;
}

type ElectronAPI = typeof import('@electron-toolkit/preload').electronAPI;

declare global {
  var electron: ElectronAPI | undefined;
  var beatport: BeatportAPI | undefined;
}
