export interface IElectronAPI {
  ipcRenderer: {
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, func: (...args: any[]) => void) => void;
    once: (channel: string, func: (...args: any[]) => void) => void;
    removeListener: (channel: string, func: (...args: any[]) => void) => void;
  };
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
}

export interface LoginResponse {
  success: boolean;
  error?: string;
}

export interface DownloadProgress {
  url: string;
  progress: number;
}

export interface DownloadComplete {
  url: string;
  success: boolean;
  error?: string;
}

export interface IBeatportAPI {
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  getDownloadProgress: () => Promise<number>;
  detectTracks: (url: string) => Promise<Track[]>;
  downloadTrack: (url: string) => Promise<{ success: boolean }>;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  onDownloadComplete: (callback: (result: DownloadComplete) => void) => () => void;
  onUpdateAvailable: (callback: (version: string) => void) => () => void;
  onLogMessage: (callback: (message: string) => void) => () => void;
  isTrackUrl: (url: string) => boolean;
  getTrackId: (url: string) => string | null;
}

declare global {
  interface Window {
    electron: IElectronAPI;
    beatport: IBeatportAPI;
  }
}
