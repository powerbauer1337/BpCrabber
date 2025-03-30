// Jest setup file
import { jest } from '@jest/globals';
import type { Redis, ChainableCommander } from 'ioredis';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Mock logger
jest.mock('./utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

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

// Mock Redis
jest.mock('ioredis', () => {
  const mockMulti = {
    incr: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 1]]),
  } as unknown as ChainableCommander;

  const MockRedis = jest.fn().mockImplementation(() => ({
    multi: jest.fn().mockReturnValue(mockMulti),
    quit: jest.fn().mockResolvedValue(undefined),
  })) as unknown as jest.MockedClass<typeof Redis>;

  return MockRedis;
});
