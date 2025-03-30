import { ipcMain } from 'electron';
import {
  IpcChannels,
  ApiResponse,
  Settings,
  TrackInfo,
  DownloadProgress,
} from '../../shared/ipc/types';
import { AppState } from '../../main';
import { handleError, ErrorCode } from '../../shared/utils/errors';
import { store } from '../../config/store';
import { logger } from '../../shared/utils/logger';

export function setupIpcHandlers(appState: AppState): void {
  // Authentication handlers
  ipcMain.handle(
    IpcChannels.LOGIN,
    async (_event, _username: string, _password: string): Promise<ApiResponse<boolean>> => {
      try {
        // TODO: Implement Beatport authentication
        return { success: true, data: true };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  ipcMain.handle(IpcChannels.LOGOUT, async (): Promise<ApiResponse<void>> => {
    try {
      // TODO: Implement logout
      return { success: true, data: undefined };
    } catch (error) {
      return handleError(error);
    }
  });

  // Track operations
  ipcMain.handle(
    IpcChannels.GET_TRACK_INFO,
    async (_event, url: string): Promise<ApiResponse<TrackInfo>> => {
      try {
        // TODO: Implement track info fetching
        const mockTrackInfo: TrackInfo = {
          id: '123',
          title: 'Test Track',
          artist: 'Test Artist',
          url,
        };
        return { success: true, data: mockTrackInfo };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  ipcMain.handle(
    IpcChannels.DOWNLOAD_TRACK,
    async (_event, url: string): Promise<ApiResponse<TrackInfo>> => {
      try {
        const downloadService = appState.getDownloadService();
        const mockTrackInfo: TrackInfo = {
          id: '123',
          title: 'Test Track',
          artist: 'Test Artist',
          url,
        };

        const onProgress = (progress: DownloadProgress) => {
          appState.getMainWindow()?.webContents.send(IpcChannels.DOWNLOAD_PROGRESS, progress);
        };

        const result = await downloadService.downloadTrack(url, mockTrackInfo, onProgress);

        if (result.success) {
          appState.getMainWindow()?.webContents.send(IpcChannels.DOWNLOAD_COMPLETE, result);
        } else {
          appState.getMainWindow()?.webContents.send(IpcChannels.DOWNLOAD_ERROR, {
            success: false,
            error: result.error || 'Unknown error',
            code: ErrorCode.DOWNLOAD,
          });
        }

        return { success: true, data: mockTrackInfo };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  ipcMain.handle(
    IpcChannels.CANCEL_DOWNLOAD,
    async (_event, url: string): Promise<ApiResponse<void>> => {
      try {
        const downloadService = appState.getDownloadService();
        downloadService.cancelDownload(url);
        return { success: true, data: undefined };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // Settings handlers
  ipcMain.handle(IpcChannels.GET_SETTINGS, async (): Promise<ApiResponse<Settings>> => {
    try {
      const defaultSettings: Settings = {
        downloadPath: appState.getDownloadService().getDownloadPath(),
        maxConcurrentDownloads: 3,
        autoCheckUpdates: true,
        saveMetadata: true,
        fileNamingTemplate: '{artist} - {title}',
        audioQuality: 'high',
      };

      const storedSettings = store.get('settings');
      const settings: Settings = { ...defaultSettings, ...storedSettings };
      return { success: true, data: settings };
    } catch (error) {
      return handleError(error);
    }
  });

  ipcMain.handle(
    IpcChannels.SAVE_SETTINGS,
    async (_event, settings: Settings): Promise<ApiResponse<void>> => {
      try {
        store.set('settings', settings);
        appState.getDownloadService().setDownloadPath(settings.downloadPath);
        return { success: true, data: undefined };
      } catch (error) {
        return handleError(error);
      }
    }
  );

  // Logs handler
  ipcMain.handle(IpcChannels.GET_LOGS, async (): Promise<ApiResponse<string[]>> => {
    try {
      // TODO: Implement log retrieval
      return { success: true, data: [] };
    } catch (error) {
      return handleError(error);
    }
  });

  logger.info('IPC handlers setup complete');
}
