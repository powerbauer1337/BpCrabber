import winston from 'winston';
import path from 'path';
import { app } from 'electron';

const LOG_DIR = process.env.LOG_DIR || path.join(app?.getPath('userData') || process.cwd(), 'logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB per MCP config
const MAX_FILES = 5;

const logFile = path.join(LOG_DIR, 'app.log');

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({
      filename: logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
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

export { logger };
