import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { DownloadProgress } from '../services/downloadManager';
import { DownloadManager } from '../services/downloadManager';
import { logger } from '../../shared/utils/logger';

const downloadManager = new DownloadManager();

export function setupDownloadHandlers(): void {
  ipcMain.handle(
    'download-file',
    async (event: IpcMainInvokeEvent, url: string, filename: string) => {
      try {
        const filePath = await downloadManager.downloadFile(url, filename, {
          onProgress: (progress: DownloadProgress) => {
            event.sender.send('download-progress', filename, progress);
          },
        });
        return { success: true, filePath };
      } catch (error) {
        logger.error('Download failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed',
        };
      }
    }
  );

  ipcMain.handle('cancel-download', (_event: IpcMainInvokeEvent, filename: string) => {
    try {
      downloadManager.cancelDownload(filename);
      return { success: true };
    } catch (error) {
      logger.error('Failed to cancel download:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel download',
      };
    }
  });

  ipcMain.handle(
    'verify-file',
    async (_event: IpcMainInvokeEvent, filePath: string, expectedHash?: string) => {
      try {
        const isValid = await downloadManager.verifyFile(filePath, expectedHash);
        return { success: true, isValid };
      } catch (error) {
        logger.error('Failed to verify file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to verify file',
        };
      }
    }
  );

  ipcMain.handle('cleanup-downloads', async (_event: IpcMainInvokeEvent) => {
    try {
      await downloadManager.cleanupDownloads();
      return { success: true };
    } catch (error) {
      logger.error('Failed to cleanup downloads:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup downloads',
      };
    }
  });

  ipcMain.handle('get-active-downloads', (_event: IpcMainInvokeEvent) => {
    try {
      const downloads = downloadManager.getActiveDownloads();
      return { success: true, downloads };
    } catch (error) {
      logger.error('Failed to get active downloads:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active downloads',
      };
    }
  });

  ipcMain.handle('get-download-path', (_event: IpcMainInvokeEvent) => {
    try {
      const path = downloadManager.getDownloadPath();
      return { success: true, path };
    } catch (error) {
      logger.error('Failed to get download path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get download path',
      };
    }
  });

  ipcMain.handle('set-download-path', (_event: IpcMainInvokeEvent, path: string) => {
    try {
      downloadManager.setDownloadPath(path);
      return { success: true };
    } catch (error) {
      logger.error('Failed to set download path:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set download path',
      };
    }
  });
}
