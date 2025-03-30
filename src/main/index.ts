import { app, BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'path';
import { spawn } from 'child_process';

let mainWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
    },
  });

  // Set CSP for webview
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: ws:",
        ],
      },
    });
  });

  // In development mode, load from the vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the index.html file
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for beatportdl integration
ipcMain.handle('download-track', async (event, url: string) => {
  return new Promise((resolve, reject) => {
    const beatportdl = spawn('./beatportdl', [url]);

    beatportdl.stdout.on('data', data => {
      mainWindow?.webContents.send('download-progress', data.toString());
    });

    beatportdl.stderr.on('data', data => {
      mainWindow?.webContents.send('download-error', data.toString());
    });

    beatportdl.on('close', code => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
});
