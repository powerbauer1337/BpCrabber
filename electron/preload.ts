import { contextBridge, ipcRenderer } from 'electron';

// Define the API types
interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: any;
  error?: string;
  progress?: {
    bytesPerSecond: number;
    percent: number;
    transferred: number;
    total: number;
  };
}

interface BeatportAPI {
  login: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string }>;
  fetchMetadata: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  download: (params: { url: string; config: any }) => Promise<{ success: boolean; error?: string }>;
}

interface ConfigAPI {
  load: () => Promise<{ success: boolean; data?: any; error?: string }>;
  save: (config: any) => Promise<{ success: boolean; error?: string }>;
}

interface UpdaterAPI {
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

// Expose the APIs to the renderer
contextBridge.exposeInMainWorld('beatport', {
  login: credentials => ipcRenderer.invoke('beatport:login', credentials),
  fetchMetadata: url => ipcRenderer.invoke('beatport:fetch-metadata', url),
  download: params => ipcRenderer.invoke('beatport:download', params),
} as BeatportAPI);

contextBridge.exposeInMainWorld('config', {
  load: () => ipcRenderer.invoke('config:load'),
  save: config => ipcRenderer.invoke('config:save', config),
} as ConfigAPI);

contextBridge.exposeInMainWorld('updater', {
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: any, status: UpdateStatus) => callback(status);
    ipcRenderer.on('update-status', listener);
    return () => {
      ipcRenderer.removeListener('update-status', listener);
    };
  },
} as UpdaterAPI);
