import { create } from 'zustand';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    roles?: string[];
  } | null;
}

export interface DownloadState {
  isDownloading: boolean;
  progress: number;
  error: string | null;
}

export interface SearchState {
  isSearching: boolean;
  searchResults: any[];
  error: string | null;
}

export interface TrackState {
  currentTrack: any | null;
}

export interface AppState {
  auth: AuthState;
  downloads: DownloadState;
  searchResults: any[];
  isSearching: boolean;
  currentTrack: any | null;
  setAuth: (auth: AuthState) => void;
  setDownloads: (downloads: DownloadState) => void;
  setSearchResults: (tracks: any[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setCurrentTrack: (track: any | null) => void;
}

export const useAppStore = create<AppState>(set => ({
  auth: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
  },
  downloads: {
    isDownloading: false,
    progress: 0,
    error: null,
  },
  searchResults: [],
  isSearching: false,
  currentTrack: null,
  setAuth: (auth: AuthState) => set({ auth }),
  setDownloads: (downloads: DownloadState) => set({ downloads }),
  setSearchResults: (tracks: any[]) => set({ searchResults: tracks }),
  setIsSearching: (isSearching: boolean) => set({ isSearching }),
  setCurrentTrack: (track: any | null) => set({ currentTrack: track }),
}));
