import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, is } from '@electron-toolkit/utils';
import { store, STORE_KEYS } from './config/store';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { DownloadService } from './services/downloadService';
import { setupIpcHandlers } from './electron/ipc/handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global state management
class AppState {
  private mainWindow: BrowserWindow | null = null;
  private downloadService: DownloadService;
  private activeDownloads = new Map<string, number>();
  private downloadPath: string;

  constructor() {
    const settings = store.get(STORE_KEYS.SETTINGS);
    this.downloadPath = settings.downloadPath;
    this.downloadService = new DownloadService(this.downloadPath);
  }

  getMainWindow() {
    return this.mainWindow;
  }

  getDownloadService() {
    return this.downloadService;
  }

  getActiveDownloads() {
    return this.activeDownloads;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  updateProgress() {
    if (this.activeDownloads.size === 0) {
      this.mainWindow?.setProgressBar(-1);
      return;
    }

    const totalProgress = Array.from(this.activeDownloads.values()).reduce(
      (sum, progress) => sum + progress,
      0
    );
    const averageProgress = totalProgress / this.activeDownloads.size;
    this.mainWindow?.setProgressBar(averageProgress / 100);
  }
}

const appState = new AppState();

const createWindow = async () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  appState.setMainWindow(mainWindow);

  // HMR for development
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Placeholder for the removed loadURL function
  }

  // Make all links open with the browser, not with the application
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });
};

app.whenReady().then(() => {
  // Initialize electron app
  electronApp.setAppUserModelId('com.beatportdownloader');

  // Initialize app
  createWindow();
  setupIpcHandlers(appState);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Auto updater setup
  if (!is.dev) {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('error', error => {
      log.error('Auto updater error:', error);
    });

    autoUpdater.on('update-available', () => {
      log.info('Update available');
      appState.getMainWindow()?.webContents.send('update-available');
    });

    autoUpdater.on('update-downloaded', () => {
      log.info('Update downloaded');
      appState.getMainWindow()?.webContents.send('update-downloaded');
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught Exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason: unknown) => {
  log.error('Unhandled Rejection:', reason);
  app.quit();
});

// Export for type support
export type { AppState };
