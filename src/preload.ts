// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Define the API types
interface BeatportAPI {
  login: (username: string, password: string) => Promise<boolean>;
  downloadTrack: (url: string) => Promise<void>;
  getDownloadProgress: () => Promise<{ progress: number; status: string }>;
  cancelDownload: () => Promise<void>;
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  getLogs: () => Promise<string[]>;
  checkForUpdates: () => Promise<{ available: boolean; version: string }>;
  getTrackInfo: (url: string) => Promise<{ title: string; artist: string }>;
}

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('beatport', {
  login: (username: string, password: string) =>
    ipcRenderer.invoke('beatport:login', username, password),

  downloadTrack: (url: string) => ipcRenderer.invoke('beatport:download', url),

  getDownloadProgress: () => ipcRenderer.invoke('beatport:progress'),

  cancelDownload: () => ipcRenderer.invoke('beatport:cancel'),

  getSettings: () => ipcRenderer.invoke('settings:get'),

  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),

  getLogs: () => ipcRenderer.invoke('logs:get'),

  checkForUpdates: () => ipcRenderer.invoke('app:check-updates'),

  getTrackInfo: (url: string) => ipcRenderer.invoke('beatport:get-track-info', url),
} as BeatportAPI);

// Declare the API type for TypeScript
declare global {
  interface Window {
    beatport: BeatportAPI;
  }
}
