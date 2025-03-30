import { create } from 'zustand';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface LogState {
  logs: LogEntry[];
  addLog: (message: string, type?: LogEntry['type']) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>()(set => ({
  logs: [],
  addLog: (message: string, type: LogEntry['type'] = 'info') => {
    set(state => ({
      logs: [
        ...state.logs,
        {
          timestamp: new Date(),
          message,
          type,
        },
      ].slice(-1000), // Keep last 1000 logs
    }));
  },
  clearLogs: () => {
    set({ logs: [] });
  },
}));
