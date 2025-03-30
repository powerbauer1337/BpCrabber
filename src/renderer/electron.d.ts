import { IpcMainHandlers, IpcRendererHandlers, IpcChannels } from '../shared/ipc/types';

declare global {
  interface Window {
    electron: {
      // IPC Send/Invoke Methods
      login: IpcMainHandlers[typeof IpcChannels.LOGIN];
      logout: IpcMainHandlers[typeof IpcChannels.LOGOUT];
      getTrackInfo: IpcMainHandlers[typeof IpcChannels.GET_TRACK_INFO];
      downloadTrack: IpcMainHandlers[typeof IpcChannels.DOWNLOAD_TRACK];
      cancelDownload: IpcMainHandlers[typeof IpcChannels.CANCEL_DOWNLOAD];
      getDownloadProgress: IpcMainHandlers[typeof IpcChannels.GET_DOWNLOAD_PROGRESS];
      getSettings: IpcMainHandlers[typeof IpcChannels.GET_SETTINGS];
      saveSettings: IpcMainHandlers[typeof IpcChannels.SAVE_SETTINGS];
      checkUpdates: IpcMainHandlers[typeof IpcChannels.CHECK_UPDATES];
      getLogs: IpcMainHandlers[typeof IpcChannels.GET_LOGS];

      // IPC Event Listeners
      onDownloadProgress: (
        callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_PROGRESS]
      ) => void;
      onDownloadComplete: (
        callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_COMPLETE]
      ) => void;
      onDownloadError: (callback: IpcRendererHandlers[typeof IpcChannels.DOWNLOAD_ERROR]) => void;
      onUpdateAvailable: (
        callback: IpcRendererHandlers[typeof IpcChannels.UPDATE_AVAILABLE]
      ) => void;
      onUpdateDownloaded: (
        callback: IpcRendererHandlers[typeof IpcChannels.UPDATE_DOWNLOADED]
      ) => void;
    };
  }
}

export {};
