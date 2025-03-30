import { create } from 'zustand';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  artist: string;
  status: 'queued' | 'fetching' | 'downloading' | 'tagging' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface DownloadState {
  queue: DownloadItem[];
  addToQueue: (url: string) => Promise<void>;
  removeFromQueue: (id: string) => void;
  clearCompleted: () => void;
  updateItemStatus: (id: string, status: DownloadItem['status'], error?: string) => void;
  updateProgress: (id: string, progress: number) => void;
}

export const useDownloadStore = create<DownloadState>()(set => ({
  queue: [],
  addToQueue: async (url: string) => {
    const id = Math.random().toString(36).substring(7);
    set(state => ({
      queue: [
        ...state.queue,
        {
          id,
          url,
          title: 'Fetching...',
          artist: 'Fetching...',
          status: 'queued',
          progress: 0,
        },
      ],
    }));

    // TODO: Implement actual metadata fetching using electron IPC
  },
  removeFromQueue: (id: string) => {
    set(state => ({
      queue: state.queue.filter(item => item.id !== id),
    }));
  },
  clearCompleted: () => {
    set(state => ({
      queue: state.queue.filter(item => !['completed', 'error'].includes(item.status)),
    }));
  },
  updateItemStatus: (id: string, status: DownloadItem['status'], error?: string) => {
    set(state => ({
      queue: state.queue.map(item => (item.id === id ? { ...item, status, error } : item)),
    }));
  },
  updateProgress: (id: string, progress: number) => {
    set(state => ({
      queue: state.queue.map(item => (item.id === id ? { ...item, progress } : item)),
    }));
  },
}));
