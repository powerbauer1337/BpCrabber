import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // IPC functions
  beatportDownload: (url: string) => ipcRenderer.invoke('beatport:download', url),
  detectTracks: (url: string) => ipcRenderer.invoke('detect-tracks', url),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  getDownloadHistory: () => ipcRenderer.invoke('downloads:history'),
  addDownloadHistory: (entry: any) => ipcRenderer.invoke('downloads:add-history', entry),

  // Event listeners
  onDownloadProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on('download:progress', (_event, progress) => callback(progress));
    return () => ipcRenderer.removeAllListeners('download:progress');
  },
  onDownloadComplete: (callback: (path: string) => void) => {
    ipcRenderer.on('download:complete', (_event, path) => callback(path));
    return () => ipcRenderer.removeAllListeners('download:complete');
  },
  onDownloadError: (callback: (error: Error) => void) => {
    ipcRenderer.on('download:error', (_event, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('download:error');
  },

  // App info
  platform: process.platform,
});
