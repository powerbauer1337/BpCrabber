export interface DownloadProgress {
  bytesReceived: number;
  totalBytes: number;
  percentage: number;
}

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  genre?: string;
  releaseDate?: string;
  artwork?: string;
  bpm?: number;
  key?: string;
}

export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  downloads?: string[];
  path?: string;
}
