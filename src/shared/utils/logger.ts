import { createLogger, format, transports } from 'winston';
import { join } from 'path';
import { app } from 'electron';

const LOG_DIR = process.env.LOG_DIR || join(app?.getPath('userData') || process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per MCP config
const MAX_FILES = 5;

// Custom format for log entries
const logFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Create logger instance
export const logger = createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    app: 'beatport-downloader',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport for development with pretty format
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    // File transport for errors
    new transports.File({
      filename: join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      tailable: true,
      format: format.combine(format.timestamp(), format.json()),
    }),
    // File transport for combined logs
    new transports.File({
      filename: join(LOG_DIR, 'combined.log'),
      maxsize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      tailable: true,
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
  // Handle exceptions and rejections
  handleExceptions: true,
  handleRejections: true,
  exitOnError: false,
});

// Add request context tracking
export const addRequestContext = (requestId: string) => {
  return logger.child({ requestId });
};

// Add performance monitoring with thresholds from MCP config
export const logPerformance = (operation: string, startTime: number) => {
  const duration = Date.now() - startTime;
  const level = duration > 1000 ? 'warn' : 'info'; // 1000ms threshold from MCP config
  logger.log(level, `Performance: ${operation}`, {
    duration,
    operation,
    threshold: 1000,
    exceeded: duration > 1000,
  });
};

// Add structured error logging with metadata
export const logError = (error: Error, context: Record<string, any> = {}) => {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    context,
    timestamp: Date.now(),
    category: 'error',
  });
};

// Add application metrics logging with MCP thresholds
export const logMetric = (
  metric: string,
  value: number,
  tags: Record<string, string> = {},
  thresholds?: { warn: number; error: number }
) => {
  const defaultThresholds = {
    memory: { warn: 85, error: 95 },
    cpu: { warn: 80, error: 90 },
    latency: { warn: 1000, error: 2000 },
    errors: { warn: 5, error: 10 },
    queue: { warn: 100, error: 200 },
  } as const;

  const metricThresholds = thresholds ||
    defaultThresholds[metric as keyof typeof defaultThresholds] || {
      warn: Infinity,
      error: Infinity,
    };

  const level =
    value > metricThresholds.error ? 'error' : value > metricThresholds.warn ? 'warn' : 'info';

  logger.log(level, 'Metric recorded', {
    metric,
    value,
    tags,
    timestamp: Date.now(),
    thresholds: metricThresholds,
  });
};

// Export types for better type safety
export type Logger = typeof logger;
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
