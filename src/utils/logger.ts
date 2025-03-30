/**
 * Logger Utility
 * @module utils/logger
 */

import winston, { Logger } from 'winston';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const;

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
} as const;

// Add colors to Winston
winston.addColors(colors);

// Create format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => {
    const { timestamp, level, message, ...rest } = info;
    return `${timestamp} ${level}: ${message as string}${
      Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : ''
    }`;
  })
);

// Create format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create the logger
const logger: Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Export a simplified interface
export const log = {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, { meta }),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, { meta }),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, { meta }),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, { meta }),
};

export default logger;
