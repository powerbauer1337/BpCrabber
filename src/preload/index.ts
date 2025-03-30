import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

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

// Custom APIs for renderer
const api = {
  login: async (username: string, password: string) => {
    return await ipcRenderer.invoke('login', username, password);
  },
  logout: async () => {
    return await ipcRenderer.invoke('logout');
  },
  detectTracks: async (url: string) => {
    return await ipcRenderer.invoke('detect-tracks', url);
  },
  downloadTrack: async (url: string) => {
    return await ipcRenderer.invoke('download-track', url);
  },
  onDownloadProgress: (callback: (progress: { url: string; progress: number }) => void) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
    return () => {
      ipcRenderer.removeAllListeners('download-progress');
    };
  },
  onDownloadComplete: (
    callback: (result: { url: string; success: boolean; error?: string }) => void
  ) => {
    ipcRenderer.on('download-complete', (_event, result) => callback(result));
    return () => {
      ipcRenderer.removeAllListeners('download-complete');
    };
  },
  onLogMessage: (callback: (message: string) => void) => {
    ipcRenderer.on('log-message', (_event, message) => callback(message));
    return () => {
      ipcRenderer.removeAllListeners('log-message');
    };
  },
  onUpdateAvailable: (callback: (version: string) => void) => {
    ipcRenderer.on('update-available', (_event, version) => callback(version));
    return () => {
      ipcRenderer.removeAllListeners('update-available');
    };
  },
  // New methods for track detection
  isTrackUrl: (url: string) => {
    return url.includes('beatport.com/track/');
  },
  getTrackId: extractTrackId,
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('beatport', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.beatport = api;
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
