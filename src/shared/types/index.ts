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
  window: {
    state: {
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      isMaximized: boolean;
    };
  };
  active: {
    downloads: Array<[string, number]>;
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
  code: ErrorCode;
  message?: string;
  operationType?: string;
  timestamp?: number;
  details?: Record<string, unknown>;
}

export enum ErrorCode {
  UNKNOWN = 'UNKNOWN',
  CONFIGURATION = 'CONFIGURATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
}

export interface TrackInfo {
  id: string;
  url: string;
  title: string;
  artist: string;
  status: 'queued' | 'downloading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export type StoreKey = keyof StoreSchema;
export type StoreValue<K extends StoreKey> = StoreSchema[K];
export type StoreSubKey<K extends StoreKey> = keyof StoreSchema[K];
export type StoreSubValue<K extends StoreKey, SK extends StoreSubKey<K>> = StoreSchema[K][SK];
