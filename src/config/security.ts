import path from 'path';
import { logger } from '../utils/logger';
import { session } from 'electron';

interface WebRequestDetails {
  url: string;
  responseHeaders?: Record<string, string[]>;
}

interface WebRequestCallback {
  (response: { responseHeaders?: Record<string, string[]>; cancel?: boolean }): void;
}

/**
 * Security configuration for the Beatport Downloader application
 */
export const securityConfig = {
  // Content Security Policy configuration
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://api.beatport.com', 'https:'],
    'worker-src': ["'self'", 'blob:'],
  },

  // Rate limiting configuration
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },

  // API configuration
  api: {
    timeout: 30000, // 30 seconds
    retries: 3,
    backoff: {
      initial: 1000, // 1 second
      max: 10000, // 10 seconds
      factor: 2, // exponential backoff factor
    },
  },

  // File system security configuration
  fileSystem: {
    allowedExtensions: ['.mp3', '.wav', '.aiff', '.m4a', '.flac'],
    maxFileSize: 500 * 1024 * 1024, // 500MB
  },
};

/**
 * Sets up security policies for the Electron application
 */
export function setupSecurityPolicies(): void {
  // Set up CSP headers
  session.defaultSession.webRequest.onHeadersReceived(
    (details: WebRequestDetails, callback: WebRequestCallback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            Object.entries(securityConfig.contentSecurityPolicy)
              .map(([key, values]) => `${key} ${values.join(' ')}`)
              .join('; '),
          ],
        },
      });
    }
  );

  // Validate navigation
  session.defaultSession.webRequest.onBeforeRequest(
    (details: WebRequestDetails, callback: WebRequestCallback) => {
      const url = new URL(details.url);
      const isAllowed =
        url.protocol === 'file:' ||
        url.protocol === 'https:' ||
        url.hostname === 'api.beatport.com';

      if (!isAllowed) {
        logger.warn(`Blocked navigation to unauthorized URL: ${details.url}`);
      }

      callback({ cancel: !isAllowed });
    }
  );
}

/**
 * Validates if a file path has an allowed extension
 * @param filePath - The file path to validate
 * @returns boolean indicating if the file extension is allowed
 */
export function validateFilePath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return securityConfig.fileSystem.allowedExtensions.includes(ext);
}

/**
 * Sanitizes a file path by removing parent directory references and normalizing separators
 * @param filePath - The file path to sanitize
 * @returns The sanitized file path
 */
export function sanitizeFilePath(filePath: string): string {
  // Normalize path separators
  const sanitized = filePath.replace(/\\/g, '/');

  // Remove parent directory references
  const parts = sanitized.split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      stack.pop();
    } else if (part && part !== '.') {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Validates file size against the configured maximum
 * @param size - The file size in bytes
 * @returns boolean indicating if the file size is allowed
 */
export function validateFileSize(size: number): boolean {
  return size <= securityConfig.fileSystem.maxFileSize;
}
