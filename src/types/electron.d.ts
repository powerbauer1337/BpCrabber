export interface IElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  invoke: (channel: string, data: any) => Promise<any>;
  platform: string;
  downloadTrack: (url: string) => Promise<any>;
  detectTracks: (url: string) => Promise<any>;
  onDownloadProgress: (
    callback: (data: { url: string; progress: number; trackInfo: any }) => void
  ) => void;
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
