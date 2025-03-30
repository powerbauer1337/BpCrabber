import { ipcRenderer } from 'electron';
import { DownloadProgress } from '../shared/types';

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export const downloadUtils = {
  async downloadFile(url: string, filename: string): Promise<DownloadResult> {
    try {
      const result = await ipcRenderer.invoke('download-file', url, filename);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  },

  async cancelDownload(filename: string): Promise<DownloadResult> {
    try {
      const result = await ipcRenderer.invoke('cancel-download', filename);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel download',
      };
    }
  },

  async verifyFile(filePath: string, expectedHash?: string): Promise<DownloadResult> {
    try {
      const result = await ipcRenderer.invoke('verify-file', filePath, expectedHash);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify file',
      };
    }
  },

  async cleanupDownloads(): Promise<DownloadResult> {
    try {
      const result = await ipcRenderer.invoke('cleanup-downloads');
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup downloads',
      };
    }
  },

  async getActiveDownloads(): Promise<DownloadResult & { downloads?: string[] }> {
    try {
      const result = await ipcRenderer.invoke('get-active-downloads');
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get active downloads',
      };
    }
  },

  async getDownloadPath(): Promise<DownloadResult & { path?: string }> {
    try {
      const result = await ipcRenderer.invoke('get-download-path');
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get download path',
      };
    }
  },

  async setDownloadPath(path: string): Promise<DownloadResult> {
    try {
      const result = await ipcRenderer.invoke('set-download-path', path);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set download path',
      };
    }
  },

  onDownloadProgress(callback: (filename: string, progress: DownloadProgress) => void): () => void {
    const handler = (_event: any, filename: string, progress: DownloadProgress) => {
      callback(filename, progress);
    };
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
};
