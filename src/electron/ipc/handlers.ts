import { ipcMain } from 'electron';
import { IpcChannels, ApiResponse, Settings } from '@shared/ipc/types';
import { TrackInfo } from '@shared/types';
import { store } from '@config/store';
import type { AppState } from '../main';
import { logger } from '@shared/utils/logger';
import { ErrorCode } from '@shared/utils/errors';

function createErrorResponse(error: unknown): ApiResponse<any> {
  logger.error('IPC handler error:', error);
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error occurred',
    code: ErrorCode.UNKNOWN,
  };
}

export function setupIpcHandlers(appState: AppState): void {
  // Authentication handlers
  ipcMain.handle(IpcChannels.LOGIN, async (_event, _username: string, _password: string) => {
    try {
      // TODO: Implement login logic
      return { success: true, data: true };
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(IpcChannels.LOGOUT, async (): Promise<ApiResponse<void>> => {
    try {
      // TODO: Implement logout
      return { success: true, data: undefined };
    } catch (error) {
      return createErrorResponse(error);
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
          status: 'error',
          progress: 0,
        };
        return { success: true, data: mockTrackInfo };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  ipcMain.handle(IpcChannels.DOWNLOAD_TRACK, async (_event, url: string) => {
    try {
      const downloadService = appState.getDownloadService();
      const metadata = { title: 'Unknown', artist: 'Unknown' }; // TODO: Fetch real metadata
      await downloadService.startDownload(url, metadata);
      return { success: true, data: undefined };
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  ipcMain.handle(
    IpcChannels.CANCEL_DOWNLOAD,
    async (_event, url: string): Promise<ApiResponse<void>> => {
      try {
        const downloadService = appState.getDownloadService();
        downloadService.cancelDownload(url);
        return { success: true, data: undefined };
      } catch (error) {
        return createErrorResponse(error);
      }
    }
  );

  // Settings handlers
  ipcMain.handle(IpcChannels.GET_SETTINGS, async () => {
    try {
      const settings = store.get('settings') as Settings;
      return { success: true, data: settings };
    } catch (error) {
      return createErrorResponse(error);
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
        return createErrorResponse(error);
      }
    }
  );

  // Logs handler
  ipcMain.handle(IpcChannels.GET_LOGS, async (): Promise<ApiResponse<string[]>> => {
    try {
      // TODO: Implement log retrieval
      return { success: true, data: [] };
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  logger.info('IPC handlers setup complete');
}
