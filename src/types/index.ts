export interface StoreSchema {
  settings: {
    downloadPath: string;
    maxConcurrentDownloads: number;
    autoUpdate: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  downloads: {
    history: DownloadHistory[];
  };
}

export interface DownloadHistory {
  id: string;
  url: string;
  title: string;
  artist: string;
  downloadedAt: string;
  path: string;
}

export interface ErrorMetadata {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
