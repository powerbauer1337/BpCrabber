/**
 * Logger Utility
 * @module utils/logger
 */

import log from 'electron-log';
import { app } from 'electron';
import path from 'path';

// Configure electron-log
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.maxSize = 1024 * 1024 * 10; // 10MB
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

// Development logging
if (process.env.NODE_ENV === 'development') {
  log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.level = 'debug';
} else {
  log.transports.console.level = false;
}

export const logger = {
  info: (message: string, ...args: any[]) => log.info(message, ...args),
  warn: (message: string, ...args: any[]) => log.warn(message, ...args),
  error: (message: string | Error, ...args: any[]) => {
    if (message instanceof Error) {
      log.error(message.message, {
        stack: message.stack,
        ...args,
      });
    } else {
      log.error(message, ...args);
    }
  },
  debug: (message: string, ...args: any[]) => log.debug(message, ...args),
  verbose: (message: string, ...args: any[]) => log.verbose(message, ...args),

  // Application lifecycle events
  logAppStart: () => log.info('Application started'),
  logAppExit: () => log.info('Application exiting'),

  // Download events
  logDownloadStart: (trackId: string) => log.info(`Download started for track: ${trackId}`),
  logDownloadProgress: (trackId: string, progress: number) =>
    log.verbose(`Download progress for track ${trackId}: ${progress}%`),
  logDownloadComplete: (trackId: string) => log.info(`Download completed for track: ${trackId}`),
  logDownloadError: (trackId: string, error: Error) =>
    log.error(`Download failed for track: ${trackId}`, error),

  // Authentication events
  logAuthAttempt: (username: string) => log.info(`Login attempt for user: ${username}`),
  logAuthSuccess: (username: string) => log.info(`Login successful for user: ${username}`),
  logAuthFailure: (username: string, error: Error) =>
    log.error(`Login failed for user: ${username}`, error),
  logLogout: (username: string) => log.info(`User logged out: ${username}`),

  // API events
  logApiRequest: (endpoint: string, method: string) =>
    log.debug(`API Request: ${method} ${endpoint}`),
  logApiResponse: (endpoint: string, status: number) =>
    log.debug(`API Response: ${endpoint} - Status: ${status}`),
  logApiError: (endpoint: string, error: Error) => log.error(`API Error: ${endpoint}`, error),
};
