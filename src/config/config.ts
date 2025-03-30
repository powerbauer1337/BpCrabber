import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';
import { ConfigurationError } from '../utils/errors';

// Environment types
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
}

// Configuration schemas
export const redisSchema = z.object({
  enabled: z.boolean().default(false),
  url: z.string().url().optional().default('redis://localhost:6379'),
  ttl: z.number().positive().default(3600),
});

export const fileUploadSchema = z.object({
  maxSize: z.number().positive().default(10485760), // 10MB
  directory: z.string().default('uploads'),
  bufferSize: z.number().positive().default(8192),
});

export const shellSchema = z.object({
  allowedCommands: z.string().transform(val => val.split(',')),
  maxExecutionTime: z.number().positive().default(30000),
});

export const authSchema = z.object({
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().regex(/^\d+[hdwmy]$/),
});

// Main environment schema
const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum([Environment.Development, Environment.Production, Environment.Test])
    .default(Environment.Development),
  PORT: z.coerce.number().positive().default(3000),
  LOG_LEVEL: z
    .enum([LogLevel.Error, LogLevel.Warn, LogLevel.Info, LogLevel.Debug])
    .default(LogLevel.Info),

  // Database
  DATABASE_URL: z.string().url(),

  // Beatport API
  BEATPORT_API_KEY: z.string().min(1),
  BEATPORT_API_SECRET: z.string().min(1),

  // Authentication
  JWT_SECRET: authSchema.shape.jwtSecret,
  JWT_EXPIRES_IN: authSchema.shape.jwtExpiresIn,

  // File Upload
  MAX_FILE_SIZE: z.coerce.number().positive().default(10485760),
  UPLOAD_DIR: z.string().default('uploads'),
  STREAM_BUFFER_SIZE: z.coerce.number().positive().default(8192),

  // Redis
  USE_REDIS: z.coerce.boolean().default(false),
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL: z.coerce.number().positive().default(3600),

  // API
  API_KEY: z.string().min(1),

  // Shell
  ALLOWED_COMMANDS: z.string(),
  MAX_EXECUTION_TIME: z.coerce.number().positive().default(30000),

  // Storage
  STORAGE_PATH: z.string().default('.cursor/knowledge'),
  MAX_ENTRIES: z.coerce.number().positive().default(10000),
  TASK_STORAGE_PATH: z.string().default('.cursor/tasks'),
  MAX_TASKS: z.coerce.number().positive().default(1000),

  // CORS
  ALLOWED_ORIGINS: z.string().transform(origins => origins.split(',')),

  // Security
  CORS_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  CORS_ORIGINS: z.string().optional(),
  CORS_METHODS: z.string().optional(),
  CORS_HEADERS: z.string().optional(),
  CORS_CREDENTIALS: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  CORS_MAX_AGE: z
    .string()
    .transform(val => parseInt(val))
    .optional(),
  CACHE_CONTROL_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .default('false'),
  CACHE_CONTROL_POLICY: z.string().optional(),
});

// Load environment variables
dotenv.config({
  path: path.join(process.cwd(), process.env.NODE_ENV === 'test' ? '.env.test' : '.env'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new ConfigurationError(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Export config interface
export type Config = z.infer<typeof envSchema>;

// Security configuration
export interface SecurityConfig {
  cors?: {
    enabled: boolean;
    origins?: string[];
    methods?: string;
    headers?: string;
    credentials?: boolean;
    maxAge?: number;
  };
  cacheControl?: {
    enabled: boolean;
    policy?: string;
  };
}

// Add security to appConfig
export const appConfig = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    isDev: env.NODE_ENV === Environment.Development,
    isProd: env.NODE_ENV === Environment.Production,
    isTest: env.NODE_ENV === Environment.Test,
  },
  logging: {
    level: env.LOG_LEVEL,
  },
  db: {
    url: env.DATABASE_URL,
  },
  beatport: {
    apiKey: env.BEATPORT_API_KEY,
    apiSecret: env.BEATPORT_API_SECRET,
  },
  auth: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
  },
  upload: {
    maxSize: env.MAX_FILE_SIZE,
    directory: env.UPLOAD_DIR,
    bufferSize: env.STREAM_BUFFER_SIZE,
  },
  redis: {
    enabled: env.USE_REDIS,
    url: env.REDIS_URL,
    ttl: env.CACHE_TTL,
  },
  api: {
    key: env.API_KEY,
  },
  shell: {
    allowedCommands: env.ALLOWED_COMMANDS.split(','),
    maxExecutionTime: env.MAX_EXECUTION_TIME,
  },
  storage: {
    knowledge: {
      path: env.STORAGE_PATH,
      maxEntries: env.MAX_ENTRIES,
    },
    tasks: {
      path: env.TASK_STORAGE_PATH,
      maxTasks: env.MAX_TASKS,
    },
  },
  cors: {
    origins: env.ALLOWED_ORIGINS,
  },
  security: {
    cors: {
      enabled: process.env.CORS_ENABLED === 'true',
      origins: process.env.CORS_ORIGINS?.split(',') || ['*'],
      methods: process.env.CORS_METHODS || 'GET,POST,PUT,DELETE,OPTIONS',
      headers: process.env.CORS_HEADERS || 'Content-Type,Authorization',
      credentials: process.env.CORS_CREDENTIALS === 'true',
      maxAge: process.env.CORS_MAX_AGE ? parseInt(process.env.CORS_MAX_AGE) : 86400,
    },
    cacheControl: {
      enabled: process.env.CACHE_CONTROL_ENABLED === 'true',
      policy: process.env.CACHE_CONTROL_POLICY || 'no-store, no-cache, must-revalidate',
    },
  },
} as const;

// Export config type
export type ConfigType = typeof appConfig;

// Type-safe config getter
export function getConfig<K extends keyof ConfigType>(key: K): ConfigType[K] {
  return appConfig[key];
}
