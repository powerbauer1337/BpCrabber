import Store, { Schema } from 'electron-store';
import { app } from 'electron';
import { join } from 'path';
import { Settings } from '../shared/ipc/types';

interface StoreSchema {
  settings: Settings;
  downloads: {
    history: Array<{
      id: string;
      url: string;
      title: string;
      artist: string;
      downloadedAt: string;
      filePath: string;
    }>;
  };
  window: {
    state: {
      bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      isMaximized: boolean;
    };
  };
  active: {
    downloads: Array<[string, number]>;
  };
}

const schema: Schema<StoreSchema> = {
  settings: {
    type: 'object',
    properties: {
      downloadPath: { type: 'string', default: join(app.getPath('downloads'), 'Beatport') },
      maxConcurrentDownloads: { type: 'number', minimum: 1, maximum: 10, default: 3 },
      autoCheckUpdates: { type: 'boolean', default: true },
      saveMetadata: { type: 'boolean', default: true },
      fileNamingTemplate: { type: 'string', default: '{artist} - {title}' },
      audioQuality: { type: 'string', enum: ['high', 'medium', 'low'], default: 'high' },
    },
    required: [
      'downloadPath',
      'maxConcurrentDownloads',
      'autoCheckUpdates',
      'saveMetadata',
      'fileNamingTemplate',
      'audioQuality',
    ],
    default: {},
  },
  downloads: {
    type: 'object',
    properties: {
      history: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            title: { type: 'string' },
            artist: { type: 'string' },
            downloadedAt: { type: 'string' },
            filePath: { type: 'string' },
          },
          required: ['id', 'url', 'title', 'artist', 'downloadedAt', 'filePath'],
        },
        default: [],
      },
    },
    required: ['history'],
    default: {},
  },
  window: {
    type: 'object',
    properties: {
      state: {
        type: 'object',
        properties: {
          bounds: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              width: { type: 'number' },
              height: { type: 'number' },
            },
            required: ['x', 'y', 'width', 'height'],
          },
          isMaximized: { type: 'boolean' },
        },
        required: ['bounds', 'isMaximized'],
      },
    },
    required: ['state'],
    default: {
      state: {
        bounds: { x: 0, y: 0, width: 1200, height: 800 },
        isMaximized: false,
      },
    },
  },
  active: {
    type: 'object',
    properties: {
      downloads: {
        type: 'array',
        items: {
          type: 'array',
          minItems: 2,
          maxItems: 2,
          items: [{ type: 'string' }, { type: 'number' }],
        },
        default: [],
      },
    },
    required: ['downloads'],
    default: { downloads: [] },
  },
};

export const store = new Store<StoreSchema>({
  schema,
  name: 'config',
  fileExtension: 'json',
  clearInvalidConfig: true,
});

// Export store keys for consistent access
export const STORE_KEYS = {
  SETTINGS: 'settings',
  DOWNLOADS: 'downloads',
  DOWNLOADS_HISTORY: 'downloads.history',
  WINDOW_STATE: 'window.state',
  ACTIVE_DOWNLOADS: 'active.downloads',
} as const;
