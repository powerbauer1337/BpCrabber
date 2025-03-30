import {
  securityConfig,
  setupSecurityPolicies,
  validateFilePath,
  sanitizeFilePath,
} from '../security';
import { session } from 'electron';

jest.mock('electron', () => ({
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: jest.fn(),
        onBeforeRequest: jest.fn(),
      },
    },
  },
}));

describe('securityConfig', () => {
  it('should have correct CSP configuration', () => {
    expect(securityConfig.contentSecurityPolicy).toEqual({
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com'],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https://api.beatport.com', 'https:'],
      'worker-src': ["'self'", 'blob:'],
    });
  });

  it('should have correct rate limiting configuration', () => {
    expect(securityConfig.rateLimiting).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    });
  });

  it('should have correct API configuration', () => {
    expect(securityConfig.api).toEqual({
      timeout: 30000,
      retries: 3,
      backoff: {
        initial: 1000,
        max: 10000,
        factor: 2,
      },
    });
  });

  it('should have correct file system configuration', () => {
    expect(securityConfig.fileSystem.allowedExtensions).toEqual([
      '.mp3',
      '.wav',
      '.aiff',
      '.m4a',
      '.flac',
    ]);
    expect(securityConfig.fileSystem.maxFileSize).toBe(500 * 1024 * 1024);
  });
});

describe('setupSecurityPolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set up CSP headers', () => {
    setupSecurityPolicies();
    expect(session.defaultSession.webRequest.onHeadersReceived).toHaveBeenCalled();
  });

  it('should set up navigation validation', () => {
    setupSecurityPolicies();
    expect(session.defaultSession.webRequest.onBeforeRequest).toHaveBeenCalled();
  });
});

describe('validateFilePath', () => {
  it('should allow valid file extensions', () => {
    expect(validateFilePath('test.mp3')).toBe(true);
    expect(validateFilePath('test.wav')).toBe(true);
    expect(validateFilePath('test.flac')).toBe(true);
  });

  it('should reject invalid file extensions', () => {
    expect(validateFilePath('test.exe')).toBe(false);
    expect(validateFilePath('test.js')).toBe(false);
    expect(validateFilePath('test')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(validateFilePath('test.MP3')).toBe(true);
    expect(validateFilePath('test.Wav')).toBe(true);
  });
});

describe('sanitizeFilePath', () => {
  it('should remove parent directory references', () => {
    expect(sanitizeFilePath('../test.mp3')).toBe('test.mp3');
    expect(sanitizeFilePath('folder/../test.mp3')).toBe('test.mp3');
    expect(sanitizeFilePath('folder1/folder2/../test.mp3')).toBe('folder1/test.mp3');
  });

  it('should normalize path separators', () => {
    expect(sanitizeFilePath('folder\\test.mp3')).toBe('folder/test.mp3');
    expect(sanitizeFilePath('folder//test.mp3')).toBe('folder/test.mp3');
  });

  it('should handle multiple path segments', () => {
    expect(sanitizeFilePath('folder1/folder2/test.mp3')).toBe('folder1/folder2/test.mp3');
    expect(sanitizeFilePath('./folder1/./folder2/test.mp3')).toBe('folder1/folder2/test.mp3');
  });
});
