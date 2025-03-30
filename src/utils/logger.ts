/**
 * Logger Utility
 * @module utils/logger
 */

import path from 'path';
import fs from 'fs';
import { createWriteStream } from 'fs';
import { getConfig } from '../config/config';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}

class Logger {
  private logStream: fs.WriteStream;
  private logQueue: LogEntry[] = [];
  private readonly MAX_LOG_ENTRIES = 1000;

  constructor() {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, 'app.log');
    this.logStream = createWriteStream(logFile, { flags: 'a' });

    // Rotate logs on startup if file is too large
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > 10 * 1024 * 1024) {
        // 10MB
        const backupFile = path.join(logDir, `app.${Date.now()}.log`);
        fs.renameSync(logFile, backupFile);
        this.logStream = createWriteStream(logFile, { flags: 'a' });
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  private log(level: LogLevel, message: string, error?: Error, metadata?: Record<string, unknown>) {
    const config = getConfig('logging');
    const logLevels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };

    // Check if we should log this level
    if (logLevels[level] > logLevels[config.level]) {
      return;
    }

    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      metadata,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Add to in-memory queue
    this.logQueue.unshift(entry);
    if (this.logQueue.length > this.MAX_LOG_ENTRIES) {
      this.logQueue.pop();
    }

    // Write to file
    this.logStream.write(JSON.stringify(entry) + '\n');

    // Also log to console in development
    const isDev = getConfig('app').isDev;
    if (isDev) {
      const consoleMessage = `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`;
      if (level === 'error') {
        console.error(consoleMessage, error || '', metadata || '');
      } else {
        console.log(consoleMessage, metadata || '');
      }
    }
  }

  public info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, undefined, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, undefined, metadata);
  }

  public error(message: string, error: Error | unknown, metadata?: Record<string, unknown>) {
    this.log('error', message, error instanceof Error ? error : new Error(String(error)), metadata);
  }

  public debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, undefined, metadata);
  }

  public getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logQueue.slice(0, limit);
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logStream.end((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export const logger = new Logger();
