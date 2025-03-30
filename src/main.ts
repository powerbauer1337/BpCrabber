declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { BrowserView } from 'electron';
import Store from 'electron-store';
import { electronApp, optimizer, is } from '@electron-toolkit/utils';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Initialize electron store
const store = new Store();

// Global state
let mainWindow: BrowserWindow;
let beatportView: BrowserView | null = null;
let isDownloading = false;
let currentProgress = 0;

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: true,
      webviewTag: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Create hidden BrowserView for Beatport
  beatportView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.setBrowserView(beatportView);
  beatportView.setBounds({ x: 0, y: 0, width: 0, height: 0 });
  beatportView.webContents.loadURL('https://www.beatport.com');

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC Handlers
ipcMain.handle('beatport:login', async (_, username: string, password: string) => {
  try {
    if (!beatportView) return false;

    await beatportView.webContents.executeJavaScript(`
      document.querySelector('#username').value = '${username}';
      document.querySelector('#password').value = '${password}';
      document.querySelector('form').submit();
    `);

    // Wait for navigation to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if login was successful
    const isLoggedIn = await beatportView.webContents.executeJavaScript(`
      document.querySelector('.account-link') !== null
    `);

    return isLoggedIn;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
});

ipcMain.handle('beatport:download', async (_, url: string) => {
  try {
    if (!beatportView || isDownloading) return;

    isDownloading = true;
    currentProgress = 0;

    // Navigate to track page
    await beatportView.webContents.loadURL(url);

    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get track info
    const trackInfo = await beatportView.webContents.executeJavaScript(`
      {
        title: document.querySelector('.track-title')?.textContent,
        artist: document.querySelector('.track-artist')?.textContent,
        key: document.querySelector('.track-key')?.textContent
      }
    `);

    // Create download directory if it doesn't exist
    const downloadDir = path.join(app.getPath('downloads'), 'BeatportDownloader');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir);
    }

    // Download track
    const downloadPath = path.join(downloadDir, `${trackInfo.artist} - ${trackInfo.title}.mp3`);

    // Simulate download progress (replace with actual download logic)
    for (let i = 0; i <= 100; i += 10) {
      currentProgress = i;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    isDownloading = false;
    currentProgress = 0;
  } catch (error) {
    console.error('Download error:', error);
    isDownloading = false;
    currentProgress = 0;
    throw error;
  }
});

ipcMain.handle('beatport:progress', async () => {
  return {
    progress: currentProgress,
    status: isDownloading ? 'downloading' : 'idle',
  };
});

ipcMain.handle('beatport:cancel', async () => {
  isDownloading = false;
  currentProgress = 0;
});

ipcMain.handle('beatport:get-track-info', async (_, url: string) => {
  try {
    if (!beatportView) return null;

    // Navigate to track page
    await beatportView.webContents.loadURL(url);

    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get track info
    const trackInfo = await beatportView.webContents.executeJavaScript(`
      {
        title: document.querySelector('.track-title')?.textContent?.trim() || 'Unknown Track',
        artist: document.querySelector('.track-artist')?.textContent?.trim() || 'Unknown Artist'
      }
    `);

    return trackInfo;
  } catch (error) {
    console.error('Get track info error:', error);
    throw error;
  }
});

ipcMain.handle('settings:get', async () => {
  return store.get('settings', {
    downloadPath: app.getPath('downloads'),
    autoCheckUpdates: true,
    theme: 'dark',
  });
});

ipcMain.handle('settings:save', async (_, settings: any) => {
  store.set('settings', settings);
});

ipcMain.handle('logs:get', async () => {
  // Return last 100 log entries (implement proper logging system)
  return [];
});

ipcMain.handle('app:check-updates', async () => {
  // Implement actual update checking logic
  return { available: false, version: app.getVersion() };
});

// App lifecycle events
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron');

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Setup IPC handlers
  setupIpcHandlers();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function setupIpcHandlers(): void {
  let isLoggedIn = false;

  ipcMain.handle('login', async (_event, username: string, password: string) => {
    try {
      // TODO: Implement actual login logic
      isLoggedIn = true;
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Login failed. Please check your credentials.' };
    }
  });

  ipcMain.handle('logout', async () => {
    isLoggedIn = false;
    return { success: true };
  });

  ipcMain.handle('detect-tracks', async (_event, url: string) => {
    try {
      // TODO: Implement actual track detection logic
      // For now, return mock data
      const trackId = url.match(/\/track\/[^\/]+\/(\d+)/)?.[1];
      if (!trackId) {
        throw new Error('Invalid track URL');
      }

      return {
        id: trackId,
        title: 'Sample Track',
        artist: 'Sample Artist',
        url: url,
      };
    } catch (error) {
      console.error('Track detection failed:', error);
      throw error;
    }
  });

  ipcMain.handle('download-track', async (_event, url: string) => {
    try {
      if (!isLoggedIn) {
        throw new Error('Please log in to download tracks');
      }

      // Simulate download progress
      const win = BrowserWindow.getFocusedWindow();
      if (!win) throw new Error('No active window found');

      for (let progress = 0; progress <= 100; progress += 10) {
        win.webContents.send('download-progress', { url, progress });
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      win.webContents.send('download-complete', { url, success: true });
      win.webContents.send('log-message', `Successfully downloaded track from ${url}`);

      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      const win = BrowserWindow.getFocusedWindow();
      if (win) {
        win.webContents.send('download-complete', {
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Download failed',
        });
        win.webContents.send('log-message', `Failed to download track from ${url}: ${error}`);
      }
      throw error;
    }
  });
}

// Clean up on app quit
app.on('before-quit', () => {
  if (beatportView) {
    beatportView.webContents.session.clearStorageData();
  }
});
