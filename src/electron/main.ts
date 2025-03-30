import { app, BrowserWindow, BrowserView, ipcMain } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { autoUpdater } from 'electron-updater/out/main.js';
import { store } from '@config/store';
import { DownloadService } from '@shared/services/downloadService';
import { createSecurityHeaders } from './utils/security';
import { setupIpcHandlers } from './ipc/handlers';
import type { StoreSchema } from '@shared/types';
import serve from 'electron-serve';
import { is } from '@electron-toolkit/utils';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const loadURL = serve({ directory: 'out' });

// Global state management
export class AppState {
  private mainWindow: BrowserWindow | null = null;
  private beatportView: BrowserView | null = null;
  private downloadService: DownloadService;
  private activeDownloads = new Map<string, number>();

  constructor() {
    this.downloadService = new DownloadService(store.get('settings', 'downloadPath'));
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
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        ...createSecurityHeaders(),
      },
    });
  });

  if (is.dev) {
    // In development, use Next.js dev server
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      console.log('Failed to load dev server, retrying...');
      // Retry after a short delay
      setTimeout(() => mainWindow.loadURL('http://localhost:3000'), 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built static files
    loadURL(mainWindow).catch(err => {
      console.error('Failed to load production files:', err);
      // Fallback to loading index.html directly
      mainWindow.loadFile(join(__dirname, '../../out/index.html')).catch(console.error);
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
      setTimeout(() => mainWindow.loadURL('http://localhost:3000'), 1000);
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

// Error handling
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
