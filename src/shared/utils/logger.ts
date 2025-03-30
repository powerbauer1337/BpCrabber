import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to Winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    info =>
      `${info.timestamp} ${info.level}: ${info.message}${info.metadata ? ` ${JSON.stringify(info.metadata)}` : ''}`
  )
);

// Define log file paths
const logDir = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : 'logs';
const logFile = process.env.LOG_FILE || path.join(logDir, 'app.log');

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    // Write all logs with level 'info' and below to app.log
    new winston.transports.File({
      filename: logFile,
      maxsize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.MAX_LOG_FILES || '5'),
      tailable: true,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
    // Write all errors to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.MAX_LOG_FILES || '5'),
      tailable: true,
      format: winston.format.combine(winston.format.uncolorize(), winston.format.json()),
    }),
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.MAX_LOG_FILES || '5'),
      tailable: true,
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: parseInt(process.env.MAX_LOG_SIZE || '10485760'), // 10MB
      maxFiles: parseInt(process.env.MAX_LOG_FILES || '5'),
      tailable: true,
    }),
  ],
  // Exit on error
  exitOnError: false,
});

// Create a stream object with a write function that will be used by Morgan
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
