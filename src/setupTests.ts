// Jest setup file
import { jest } from '@jest/globals';
import '@testing-library/jest-dom/extend-expect';
import { cleanup } from '@testing-library/react';
import type { ChainableCommander } from 'ioredis';
import type { BeatportAPI } from './types/api';
import type { Settings, ApiResponse, TrackInfo, UpdateInfo } from './shared/ipc/types';
import type { ElectronAPI, IpcRenderer as ToolkitIpcRenderer } from '@electron-toolkit/preload';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.ELECTRON_RUN_AS_NODE = '1';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock Electron APIs
const mockIpcRenderer = {
  invoke: jest.fn().mockImplementation(() => Promise.resolve()),
  on: jest.fn().mockImplementation(() => () => {}),
  send: jest.fn(),
  removeListener: jest.fn().mockReturnThis(),
  removeAllListeners: jest.fn(),
  sendTo: jest.fn(),
  sendSync: jest.fn(),
  postMessage: jest.fn(),
  once: jest.fn().mockImplementation(() => () => {}),
  sendToHost: jest.fn(),
} as unknown as ToolkitIpcRenderer;

const mockContextBridge = {
  exposeInMainWorld: jest.fn(),
};

jest.mock('electron', () => ({
  ipcRenderer: mockIpcRenderer,
  contextBridge: mockContextBridge,
}));

// Mock logger
jest.mock('./shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
  logPerformance: jest.fn(),
  logError: jest.fn(),
  logMetric: jest.fn(),
}));

// Mock settings with proper types
const mockSettings: Settings = {
  downloadPath: '/path/to/downloads',
  maxConcurrentDownloads: 3,
  autoCheckUpdates: true,
  saveMetadata: true,
  fileNamingTemplate: '{artist} - {title}',
  audioQuality: 'high',
};

// Mock WebFrame
const mockWebFrame = {
  insertCSS: jest.fn().mockReturnValue('mock-key'),
  setZoomFactor: jest.fn(),
  setZoomLevel: jest.fn(),
};

// Mock NodeProcess
const mockProcess = {
  platform: 'win32',
  versions: {
    node: '16.0.0',
    electron: '28.0.0',
  },
  env: process.env,
};

// Setup global mocks
global.electron = {
  ipcRenderer: mockIpcRenderer,
  webFrame: mockWebFrame,
  process: mockProcess,
} as ElectronAPI;

// Mock API responses with proper types
const mockApiResponses = {
  login: { success: true as const, data: true } as ApiResponse<boolean>,
  downloadTrack: { success: true as const, data: undefined } as ApiResponse<void>,
  getTrackInfo: {
    success: true as const,
    data: {
      id: '123',
      title: 'Test Track',
      artist: 'Test Artist',
      url: 'https://example.com/track',
    } as TrackInfo,
  } as ApiResponse<TrackInfo>,
  checkForUpdates: {
    success: true as const,
    data: {
      version: '1.0.0',
      releaseDate: '2024-03-21',
      releaseNotes: 'Test release',
    } as UpdateInfo,
  } as ApiResponse<UpdateInfo>,
  getDownloadProgress: { success: true as const, data: { '1': 50 } } as ApiResponse<
    Record<string, number>
  >,
  cancelDownload: { success: true as const, data: undefined } as ApiResponse<void>,
  getSettings: { success: true as const, data: mockSettings } as ApiResponse<Settings>,
  saveSettings: { success: true as const, data: undefined } as ApiResponse<void>,
  getLogs: { success: true as const, data: [] } as ApiResponse<string[]>,
};

// Type-safe mock implementations using type assertions
const typedMockLogin = jest
  .fn()
  .mockImplementation(async () => mockApiResponses.login) as unknown as BeatportAPI['login'];

const typedMockDownloadTrack = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.downloadTrack
  ) as unknown as BeatportAPI['downloadTrack'];

const typedMockGetTrackInfo = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.getTrackInfo
  ) as unknown as BeatportAPI['getTrackInfo'];

const typedMockCheckUpdates = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.checkForUpdates
  ) as unknown as BeatportAPI['checkForUpdates'];

const typedMockGetDownloadProgress = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.getDownloadProgress
  ) as unknown as BeatportAPI['getDownloadProgress'];

const typedMockCancelDownload = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.cancelDownload
  ) as unknown as BeatportAPI['cancelDownload'];

const typedMockGetSettings = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.getSettings
  ) as unknown as BeatportAPI['getSettings'];

const typedMockSaveSettings = jest
  .fn()
  .mockImplementation(
    async () => mockApiResponses.saveSettings
  ) as unknown as BeatportAPI['saveSettings'];

const typedMockGetLogs = jest
  .fn()
  .mockImplementation(async () => mockApiResponses.getLogs) as unknown as BeatportAPI['getLogs'];

const beatportApi: BeatportAPI = {
  login: typedMockLogin,
  downloadTrack: typedMockDownloadTrack,
  getTrackInfo: typedMockGetTrackInfo,
  checkForUpdates: typedMockCheckUpdates,
  getDownloadProgress: typedMockGetDownloadProgress,
  cancelDownload: typedMockCancelDownload,
  getSettings: typedMockGetSettings,
  saveSettings: typedMockSaveSettings,
  getLogs: typedMockGetLogs,
};

global.beatport = beatportApi;

// Global test setup
beforeAll(() => {
  // Setup global mocks
  (global as any).electron = {
    ipcRenderer: mockIpcRenderer,
  };

  (global as any).beatport = {
    login: jest.fn().mockImplementation(async () => mockApiResponses.login),
    downloadTrack: jest.fn().mockImplementation(async () => mockApiResponses.downloadTrack),
    getDownloadProgress: jest
      .fn()
      .mockImplementation(async () => mockApiResponses.getDownloadProgress),
    cancelDownload: jest.fn().mockImplementation(async () => mockApiResponses.cancelDownload),
    getSettings: jest.fn().mockImplementation(async () => mockApiResponses.getSettings),
    saveSettings: jest.fn().mockImplementation(async () => mockApiResponses.saveSettings),
    getLogs: jest.fn().mockImplementation(async () => mockApiResponses.getLogs),
    checkForUpdates: jest.fn().mockImplementation(async () => mockApiResponses.checkForUpdates),
    getTrackInfo: jest.fn().mockImplementation(async () => mockApiResponses.getTrackInfo),
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// Global test teardown
afterAll(() => {
  delete (global as any).electron;
  delete (global as any).beatport;
});

// Mock config
jest.mock('./config/config', () => ({
  getConfig: jest.fn(),
  env: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'error',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRES_IN: '1h',
  },
}));

// Mock Redis implementation
const mockMulti = {
  incr: jest.fn().mockReturnThis(),
  expire: jest.fn().mockReturnThis(),
  exec: jest.fn().mockImplementation(async () => [[null, 1]] as [null | Error, number][]),
  // Add minimal required ChainableCommander properties
  length: 0,
  call: jest.fn(),
  callBuffer: jest.fn(),
  acl: jest.fn(),
} as unknown as ChainableCommander;

// Create a mock Redis class that implements the minimal required interface
class MockRedisClass {
  multi() {
    return mockMulti;
  }
  async quit(): Promise<'OK'> {
    return 'OK';
  }
}

// Mock ioredis module
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => new MockRedisClass());
});
