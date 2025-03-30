import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater/out/main.js';
import { store, STORE_KEYS } from '@config/store';
import { DownloadService } from '@shared/services/downloadService';
import { createSecurityHeaders } from './utils/security';
import { setupIpcHandlers } from './ipc/handlers';
import { logger } from '@shared/utils/logger';
import { DownloadQueue } from '@shared/services/downloadQueue';
import type { TrackInfo, DownloadHistory } from '@shared/types';
import { is } from '@electron-toolkit/utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Global state management
export class AppState {
  private mainWindow: BrowserWindow | null = null;
  private beatportView: BrowserView | null = null;
  private downloadService: DownloadService;
  private downloadQueue: DownloadQueue;
  private activeDownloads = new Map<string, number>();
  private downloadPath: string;

  constructor() {
    const settings = store.get(STORE_KEYS.SETTINGS);
    this.downloadPath = settings.downloadPath;
    this.downloadService = new DownloadService(this.downloadPath);

    // Initialize download queue
    this.downloadQueue = DownloadQueue.getInstance(settings.maxConcurrentDownloads);
    this.setupDownloadQueue();

    // Restore active downloads from store
    const savedDownloads = store.get(STORE_KEYS.ACTIVE_DOWNLOADS, []) as Array<[string, number]>;
    savedDownloads.forEach(([id, progress]) => this.activeDownloads.set(id, progress));
  }

  private setupDownloadQueue(): void {
    this.downloadQueue.setDownloadHandler(async (track: TrackInfo) => {
      await this.downloadService.startDownload(track.url, {
        title: track.title,
        artist: track.artist,
      });
    });

    this.downloadQueue.on('taskProgress', ({ taskId, progress }) => {
      this.activeDownloads.set(taskId, progress);
      this.updateProgress();

      // Notify renderer
      this.mainWindow?.webContents.send('download:progress', { taskId, progress });
    });

    this.downloadQueue.on('taskCompleted', task => {
      this.activeDownloads.delete(task.id);
      this.updateProgress();

      // Add to download history
      const history = store.get(STORE_KEYS.DOWNLOADS_HISTORY, []) as DownloadHistory[];
      const downloadPath = join(
        this.downloadPath,
        `${task.track.artist} - ${task.track.title}.mp3`
      );

      history.push({
        id: task.id,
        url: task.track.url,
        title: task.track.title,
        artist: task.track.artist,
        downloadedAt: new Date().toISOString(),
        path: downloadPath,
      });

      store.set(STORE_KEYS.DOWNLOADS_HISTORY, history);

      // Notify renderer
      this.mainWindow?.webContents.send('download:complete', task);
    });

    this.downloadQueue.on('taskError', task => {
      this.activeDownloads.delete(task.id);
      this.updateProgress();

      // Notify renderer
      this.mainWindow?.webContents.send('download:error', {
        taskId: task.id,
        error: task.error?.message,
      });
    });
  }

  private updateProgress(): void {
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

  getMainWindow() {
    return this.mainWindow;
  }

  getBeatportView() {
    return this.beatportView;
  }

  getDownloadService() {
    return this.downloadService;
  }

  getDownloadQueue() {
    return this.downloadQueue;
  }

  getActiveDownloads() {
    return this.activeDownloads;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  setBeatportView(view: BrowserView) {
    this.beatportView = view;
  }
}

const appState = new AppState();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Create BeatportView with secure settings
  const beatportView = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.setBrowserView(beatportView);
  beatportView.setBounds({ x: 0, y: 0, width: 1200, height: 800 });

  // Add security headers
  createSecurityHeaders(mainWindow);

  if (is.dev) {
    // In development, use dev server
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      console.log('Failed to load dev server, retrying...');
      // Retry after a short delay
      setTimeout(() => mainWindow.loadURL('http://localhost:5173'), 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built static files
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch(err => {
      console.error('Failed to load production files:', err);
    });
  }

  // Store references
  appState.setMainWindow(mainWindow);
  appState.setBeatportView(beatportView);

  // Setup auto-updater events
  setupAutoUpdater();

  // Handle window closing
  mainWindow.on('closed', () => {
    app.quit();
  });

  // Log any load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    if (is.dev) {
      // In dev, retry loading
      setTimeout(() => mainWindow.loadURL('http://localhost:5173'), 1000);
    }
  });
}

function setupAutoUpdater() {
  const mainWindow = appState.getMainWindow();
  if (!mainWindow) return;

  type UpdateStatus =
    | { status: 'checking' }
    | { status: 'available'; info: any }
    | { status: 'not-available'; info: any }
    | { status: 'error'; error: string }
    | { status: 'downloading'; progress: any }
    | { status: 'downloaded'; info: any };

  const events = {
    'checking-for-update': { status: 'checking' } as UpdateStatus,
    'update-available': (info: any) => ({ status: 'available', info }) as UpdateStatus,
    'update-not-available': (info: any) => ({ status: 'not-available', info }) as UpdateStatus,
    error: (err: Error) => ({ status: 'error', error: err.message }) as UpdateStatus,
    'download-progress': (progressObj: any) =>
      ({ status: 'downloading', progress: progressObj }) as UpdateStatus,
    'update-downloaded': (info: any) => ({ status: 'downloaded', info }) as UpdateStatus,
  } as const;

  (Object.entries(events) as [keyof typeof events, (typeof events)[keyof typeof events]][]).forEach(
    ([event, handler]) => {
      autoUpdater.on(event, (data?: any) => {
        const payload = typeof handler === 'function' ? handler(data) : handler;
        mainWindow.webContents.send('update-status', payload);
      });
    }
  );
}

// Handle app ready
app.whenReady().then(() => {
  createWindow();
  setupIpcHandlers(appState);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Check for updates in production
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Handle app closing
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Enhanced error handling
function handleError(error: Error, errorType: 'uncaught' | 'unhandled'): void {
  logger.error(`${errorType === 'uncaught' ? 'Uncaught Exception' : 'Unhandled Rejection'}:`, {
    error: error.message,
    stack: error.stack,
    type: error.name,
  });

  // Save application state
  try {
    const mainWindow = appState.getMainWindow();
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      store.set(STORE_KEYS.WINDOW_STATE, {
        bounds,
        isMaximized: mainWindow.isMaximized(),
      });
    }

    // Save active downloads state
    const activeDownloads = appState.getActiveDownloads();
    store.set(STORE_KEYS.ACTIVE_DOWNLOADS, Array.from(activeDownloads.entries()));
  } catch (saveError) {
    logger.error('Failed to save application state:', saveError);
  }

  // Show error dialog to user
  if (appState.getMainWindow()) {
    appState.getMainWindow()?.webContents.send('app:error', {
      type: errorType,
      message: error.message,
    });
  }

  // Wait briefly for error to be logged and state to be saved
  setTimeout(() => {
    app.exit(1);
  }, 1000);
}

// Error handlers
process.on('uncaughtException', (error: Error) => {
  handleError(error, 'uncaught');
});

process.on('unhandledRejection', (reason: unknown) => {
  handleError(reason instanceof Error ? reason : new Error(String(reason)), 'unhandled');
});

// Fix unused url parameter
ipcMain.on('download-track', async (_event, _url) => {
  // ... existing code ...
});
