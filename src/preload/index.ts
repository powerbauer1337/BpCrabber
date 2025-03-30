import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';
import { IpcChannels, IpcRendererHandlers } from '../shared/ipc/types';
import type { BeatportAPI } from '../types/api';

// Helper function to extract track ID from Beatport URL
const extractTrackId = (url: string) => {
  const match = url.match(/\/track\/[^\/]+\/(\d+)/);
  return match ? match[1] : null;
};

// Helper function to clean track name
const cleanTrackName = (name: string) => {
  return name
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' '); // Normalize spaces
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled
if (process.contextIsolated) {
  try {
    // Expose electron-specific APIs
    contextBridge.exposeInMainWorld('electron', {
      // IPC Send/Invoke Methods
      login: (username: string, password: string) =>
        ipcRenderer.invoke(IpcChannels.LOGIN, username, password),
      logout: () => ipcRenderer.invoke(IpcChannels.LOGOUT),
      getTrackInfo: (url: string) => ipcRenderer.invoke(IpcChannels.GET_TRACK_INFO, url),
      downloadTrack: (url: string) => ipcRenderer.invoke(IpcChannels.DOWNLOAD_TRACK, url),
      cancelDownload: (url: string) => ipcRenderer.invoke(IpcChannels.CANCEL_DOWNLOAD, url),
      getDownloadProgress: () => ipcRenderer.invoke(IpcChannels.GET_DOWNLOAD_PROGRESS),
      getSettings: () => ipcRenderer.invoke(IpcChannels.GET_SETTINGS),
      saveSettings: (settings: any) => ipcRenderer.invoke(IpcChannels.SAVE_SETTINGS, settings),
      checkUpdates: () => ipcRenderer.invoke(IpcChannels.CHECK_UPDATES),
      getLogs: () => ipcRenderer.invoke(IpcChannels.GET_LOGS),

      // IPC Event Listeners
      onDownloadProgress: (callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_PROGRESS]) =>
        ipcRenderer.on(IpcChannels.DOWNLOAD_PROGRESS, (_, progress) => callback(progress)),
      onDownloadComplete: (callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_COMPLETE]) =>
        ipcRenderer.on(IpcChannels.DOWNLOAD_COMPLETE, (_, result) => callback(result)),
      onDownloadError: (callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_ERROR]) =>
        ipcRenderer.on(IpcChannels.DOWNLOAD_ERROR, (_, error) => callback(error)),
      onUpdateAvailable: (callback: IpcRendererHandlers[typeof IpcChannels.UPDATE_AVAILABLE]) =>
        ipcRenderer.on(IpcChannels.UPDATE_AVAILABLE, (_, info) => callback(info)),
      onUpdateDownloaded: (callback: IpcRendererHandlers[typeof IpcChannels.UPDATE_DOWNLOADED]) =>
        ipcRenderer.on(IpcChannels.UPDATE_DOWNLOADED, (_, info) => callback(info)),

      // Helper functions
      isTrackUrl: (url: string) => url.includes('beatport.com/track/'),
      getTrackId: extractTrackId,
    });

    // Expose Beatport-specific APIs
    contextBridge.exposeInMainWorld('beatport', {
      login: (username: string, password: string) =>
        ipcRenderer.invoke(IpcChannels.LOGIN, username, password),
      downloadTrack: (url: string) => ipcRenderer.invoke(IpcChannels.DOWNLOAD_TRACK, url),
      getDownloadProgress: () => ipcRenderer.invoke(IpcChannels.GET_DOWNLOAD_PROGRESS),
      cancelDownload: () => ipcRenderer.invoke(IpcChannels.CANCEL_DOWNLOAD),
      getSettings: () => ipcRenderer.invoke(IpcChannels.GET_SETTINGS),
      saveSettings: (settings: any) => ipcRenderer.invoke(IpcChannels.SAVE_SETTINGS, settings),
      getLogs: () => ipcRenderer.invoke(IpcChannels.GET_LOGS),
      checkForUpdates: () => ipcRenderer.invoke(IpcChannels.CHECK_UPDATES),
      getTrackInfo: (url: string) => ipcRenderer.invoke(IpcChannels.GET_TRACK_INFO, url),
    } as BeatportAPI);
  } catch (error) {
    console.error('Failed to expose APIs:', error);
  }
} else {
  // If context isolation is disabled, add to window object directly
  Object.assign(window, { electron: electronAPI });
}

// Handle messages from webview
window.addEventListener('message', event => {
  if (event.data.type === 'TRACK_SELECTED') {
    // Forward the message to the renderer process
    ipcRenderer.send('track-selected', {
      url: event.data.url,
      name: cleanTrackName(event.data.name || ''),
    });
  }
});
