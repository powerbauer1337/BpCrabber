import { app, BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { electronApp, is } from '@electron-toolkit/utils';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { logger } from '@electron/utils/logger';
import { setupErrorHandlers } from './main/errorHandler';
import { setupSecurityPolicies } from './config/security';
import { AppState } from './electron/main';

// Disable hardware acceleration for stability
app.disableHardwareAcceleration();

// Add GPU crash handling
app.on('gpu-process-crashed' as any, (_: Event, killed: boolean) => {
  logger.error('GPU Process Crashed', { killed });
});

app.on(
  'render-process-crashed' as any,
  (_: Event, webContents: Electron.WebContents, killed: boolean) => {
    logger.error('Renderer Process Crashed', { killed });
  }
);

// Keep the app running
let keepAliveInterval: NodeJS.Timeout;

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info('Another instance is running, quitting...');
  app.quit();
} else {
  // Handle creating/removing shortcuts on Windows when installing/uninstalling
  if (require('electron-squirrel-startup')) {
    app.quit();
  }

  const appState = new AppState();

  const createWindow = async () => {
    try {
      logger.info('Creating main window');

      // Create the browser window.
      const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
          preload: join(__dirname, is.dev ? '../preload/index.js' : 'preload/index.js'),
          sandbox: false, // Temporarily disable sandbox for troubleshooting
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true,
          allowRunningInsecureContent: false,
          experimentalFeatures: false,
        },
      });

      // Prevent window from being garbage collected
      mainWindow.setTitle('Beatport Downloader');
      mainWindow.webContents.setBackgroundThrottling(false);

      appState.setMainWindow(mainWindow);

      // HMR for development
      if (is.dev && process.env.ELECTRON_RENDERER_URL) {
        logger.debug('Loading development URL:', process.env.ELECTRON_RENDERER_URL);
        mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
        mainWindow.webContents.openDevTools();
      } else {
        // Production loading
        logger.debug('Loading production build');
        const indexPath = join(
          __dirname,
          is.dev ? '../renderer/index.html' : 'renderer/index.html'
        );
        logger.debug('Index path:', indexPath);

        try {
          await mainWindow.loadFile(indexPath);
        } catch (error) {
          logger.error('Failed to load index file:', error);
          // Try alternative path
          const altPath = join(__dirname, './renderer/index.html');
          logger.debug('Trying alternative path:', altPath);
          await mainWindow.loadFile(altPath);
        }
      }

      // Make all links open with the browser, not with the application
      mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) {
          shell.openExternal(url);
        }
        return { action: 'deny' };
      });

      // Prevent navigation to unknown protocols
      mainWindow.webContents.on('will-navigate', (event, url) => {
        const allowedProtocols = ['https:', 'file:'];
        try {
          const parsedUrl = new URL(url);
          if (!allowedProtocols.includes(parsedUrl.protocol)) {
            event.preventDefault();
            logger.warn(`Blocked navigation to disallowed protocol: ${parsedUrl.protocol}`);
          }
        } catch (error) {
          event.preventDefault();
          logger.error('Invalid URL in navigation:', error);
        }
      });

      // Show window when ready
      mainWindow.on('ready-to-show', () => {
        logger.debug('Main window ready to show');
        mainWindow.show();
      });

      // Log window state changes
      mainWindow.on('maximize', () => logger.debug('Window maximized'));
      mainWindow.on('unmaximize', () => logger.debug('Window unmaximized'));
      mainWindow.on('minimize', () => logger.debug('Window minimized'));
      mainWindow.on('restore', () => logger.debug('Window restored'));
      mainWindow.on('close', () => {
        logger.debug('Window closing');
        clearInterval(keepAliveInterval);
      });

      // Handle window errors
      mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
        logger.error(`Window failed to load: ${errorCode} - ${errorDescription}`);
        // Try reloading on fail
        setTimeout(() => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.reload();
          }
        }, 1000);
      });

      // Keep app alive
      keepAliveInterval = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('keep-alive');
        }
      }, 5000);

      return mainWindow;
    } catch (error) {
      logger.error('Failed to create window:', error);
      app.quit();
    }
  };

  // Handle second instance
  app.on('second-instance', () => {
    logger.info('Second instance detected, focusing main window');
    const mainWindow = appState.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Initialize error handlers
  setupErrorHandlers();

  // Initialize security policies
  setupSecurityPolicies();

  // Disable navigation to file protocol in production
  if (!is.dev) {
    app.on('web-contents-created', (_, contents) => {
      contents.on('will-navigate', (event, url) => {
        if (url.startsWith('file:')) {
          event.preventDefault();
          logger.warn('Blocked navigation to file protocol in production');
        }
      });
    });
  }

  // Ensure app is ready before creating window
  const initialize = async () => {
    try {
      await app.whenReady();
      logger.logAppStart();

      // Initialize electron app
      electronApp.setAppUserModelId('com.beatportdownloader');

      // Initialize app
      await createWindow();

      app.on('activate', async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await createWindow();
        }
      });

      // Auto updater setup
      if (!is.dev) {
        logger.info('Setting up auto-updater');
        autoUpdater.checkForUpdatesAndNotify();

        autoUpdater.on('error', error => {
          logger.error('Auto updater error:', error);
        });

        autoUpdater.on('checking-for-update', () => {
          logger.info('Checking for updates');
        });

        autoUpdater.on('update-available', info => {
          logger.info('Update available:', info);
          appState.getMainWindow()?.webContents.send('update-available');
        });

        autoUpdater.on('update-not-available', info => {
          logger.info('Update not available:', info);
        });

        autoUpdater.on('download-progress', progressObj => {
          logger.debug('Download progress:', progressObj);
        });

        autoUpdater.on('update-downloaded', info => {
          logger.info('Update downloaded:', info);
          appState.getMainWindow()?.webContents.send('update-downloaded');
        });
      }
    } catch (error) {
      logger.error('Failed to initialize app:', error);
      app.quit();
    }
  };

  // Start the app
  initialize().catch(error => {
    logger.error('Fatal error during initialization:', error);
    app.quit();
  });

  app.on('window-all-closed', () => {
    logger.debug('All windows closed');
    if (process.platform !== 'darwin') {
      logger.logAppExit();
      app.quit();
    }
  });

  // Cleanup before exit
  app.on('before-quit', () => {
    logger.logAppExit();
  });
}
