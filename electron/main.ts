import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'ini';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'));
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
ipcMain.handle('beatport:login', async (_event, { email, password }) => {
  try {
    // TODO: Implement beatportdl login
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
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

ipcMain.handle('beatport:download', async (_event, { url, config }) => {
  try {
    // TODO: Implement beatportdl download
    return { success: true };
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
