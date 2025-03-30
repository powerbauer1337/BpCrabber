import { app, BrowserWindow, ipcMain, BrowserView } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'ini';
import { autoUpdater } from 'electron-updater';
import { AppError } from '../src/utils/errors';
import { StoreSchema } from '../src/config/store';
import { DownloadService } from '../src/services/DownloadService';
import { store } from '../src/config/store';

// Global state
let mainWindow: BrowserWindow | null = null;
const beatportView: BrowserView | null = null;
const activeDownloads = new Map<string, number>();
const isLoggedIn = false;

// Initialize services
const downloadService = new DownloadService(store.get('settings', 'downloadPath'));

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: true,
    },
  });

  // Add CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
        ],
      },
    });
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Setup auto-updater events
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', info => {
    mainWindow?.webContents.send('update-status', {
      status: 'available',
      info,
    });
  });

  autoUpdater.on('update-not-available', info => {
    mainWindow?.webContents.send('update-status', {
      status: 'not-available',
      info,
    });
  });

  autoUpdater.on('error', err => {
    mainWindow?.webContents.send('update-status', {
      status: 'error',
      error: err.message,
    });
  });

  autoUpdater.on('download-progress', progressObj => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloading',
      progress: progressObj,
    });
  });

  autoUpdater.on('update-downloaded', info => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloaded',
      info,
    });
  });
};

// Handle beatport downloads
ipcMain.handle('beatport:download', async (_event, url: string) => {
  try {
    if (!beatportView) {
      throw new AppError('VIEW_NOT_READY', 'Beatport view is not initialized');
    }

    // Get track info first
    const trackInfo = await beatportView.webContents.executeJavaScript(`
      {
        title: document.querySelector('.track-title')?.textContent?.trim() || 'Unknown Track',
        artist: document.querySelector('.track-artist')?.textContent?.trim() || 'Unknown Artist',
        key: document.querySelector('.track-key')?.textContent?.trim(),
        genre: document.querySelector('.track-genre')?.textContent?.trim()
      }
    `);

    // Update download tracking
    activeDownloads.set(url, 0);

    // Send track info to renderer
    if (mainWindow) {
      mainWindow.webContents.send('download:progress', {
        url,
        progress: 0,
        trackInfo,
      });
    }

    return { success: true, trackInfo };
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw { code: error.name, message: error.message };
    }
    throw {
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
});

// Handle login
ipcMain.handle('login', async (_event, _email: string, _password: string) => {
  try {
    // TODO: Implement actual login logic
    return { success: true };
  } catch (error) {
    const errorMetadata: ErrorMetadata = {
      code: 'AUTH_ERROR',
      message: 'Login failed. Please check your credentials.',
    };
    console.error('Login failed:', errorMetadata);
    return { success: false, error: errorMetadata };
  }
});

// Handle settings
ipcMain.handle('settings:save', async (_event, settings: StoreSchema['settings']) => {
  try {
    store.set('settings', {
      ...store.get('settings'),
      ...settings,
    });
    downloadService.setDownloadPath(settings.downloadPath);
    return { success: true };
  } catch (error) {
    console.error('Settings save failed:', error);
    throw { code: 'SETTINGS_ERROR', message: 'Failed to save settings' };
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Check for updates after startup (production only)
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for beatportdl integration
ipcMain.handle('detect-tracks', async (_event, _url: string) => {
  try {
    // TODO: Implement actual track detection logic
    return {
      id: Math.random().toString(36).substring(7),
      title: 'Sample Track',
      artist: 'Sample Artist',
      url: _url,
    };
  } catch (error) {
    console.error('Track detection failed:', error);
    throw error;
  }
});

ipcMain.handle('beatport:fetch-metadata', async (_event, url: string) => {
  try {
    // TODO: Implement beatportdl metadata fetching
    return {
      success: true,
      data: {
        title: 'Sample Track',
        artist: 'Sample Artist',
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Config file handling
const CONFIG_PATH = join(app.getPath('userData'), 'config.ini');

ipcMain.handle('config:load', () => {
  try {
    const configData = readFileSync(CONFIG_PATH, 'utf-8');
    return { success: true, data: parse(configData) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // Create default config if it doesn't exist
      const defaultConfig = {
        email: '',
        password: '',
        downloadDirectory: app.getPath('downloads'),
        downloadQuality: 'MP3',
        trackNamingScheme: '%artist% - %title%',
        releaseNamingScheme: '%artist% - %release%',
        maxDownloads: 3,
        skipExisting: true,
      };
      writeFileSync(CONFIG_PATH, stringify(defaultConfig));
      return { success: true, data: defaultConfig };
    }
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('config:save', (_event, config) => {
  try {
    writeFileSync(CONFIG_PATH, stringify(config));
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Auto-update IPC handlers
ipcMain.handle('update:check', () => {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates();
  }
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});
