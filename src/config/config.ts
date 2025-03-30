import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';
import { ValidationError } from '../utils/error-handler';

// Load environment variables
dotenv.config({
  path: path.join(process.cwd(), process.env.NODE_ENV === 'test' ? '.env.test' : '.env'),
});

// Environment variable schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Database
  DATABASE_URL: z.string().url(),

  // Beatport API
  BEATPORT_API_KEY: z.string().min(1),
  BEATPORT_API_SECRET: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[hdwmy]$/),

  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),
  UPLOAD_DIR: z.string().default('uploads'),

  // Cache
  REDIS_URL: z.string().url().optional(),
  CACHE_TTL: z.string().transform(Number).default('3600'),

  // API Keys
  API_KEY: z.string().min(1),

  // File Operations
  STREAM_BUFFER_SIZE: z.string().transform(Number).default('8192'),

  // Shell Server
  ALLOWED_COMMANDS: z.string(),
  MAX_EXECUTION_TIME: z.string().transform(Number).default('30000'),

  // Knowledge Graph
  STORAGE_PATH: z.string().default('.cursor/knowledge'),
  MAX_ENTRIES: z.string().transform(Number).default('10000'),

  // Task Manager
  TASK_STORAGE_PATH: z.string().default('.cursor/tasks'),
  MAX_TASKS: z.string().transform(Number).default('1000'),

  // CORS
  ALLOWED_ORIGINS: z.string().transform(origins => origins.split(',')),

  // Redis configuration
  USE_REDIS: z.boolean().default(false),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
      throw new ValidationError(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}

// Export validated config
export const env = validateEnv();

// Export config interface
export type Config = z.infer<typeof envSchema>;

// Export config object with all settings
export const appConfig = {
  app: {
    env: env.NODE_ENV,
    port: env.PORT,
    isDev: env.NODE_ENV === 'development',
    isProd: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
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
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  upload: {
    maxSize: env.MAX_FILE_SIZE,
    dir: env.UPLOAD_DIR,
  },
  cache: {
    url: env.REDIS_URL,
    ttl: env.CACHE_TTL,
    useRedis: env.USE_REDIS,
    redisUrl: env.REDIS_URL,
  },
  api: {
    key: env.API_KEY,
  },
  fileOps: {
    bufferSize: env.STREAM_BUFFER_SIZE,
  },
  shell: {
    allowedCommands: env.ALLOWED_COMMANDS.split(','),
    maxExecutionTime: env.MAX_EXECUTION_TIME,
  },
  knowledge: {
    storagePath: env.STORAGE_PATH,
    maxEntries: env.MAX_ENTRIES,
  },
  tasks: {
    storagePath: env.TASK_STORAGE_PATH,
    maxTasks: env.MAX_TASKS,
  },
  cors: {
    origins: env.ALLOWED_ORIGINS,
  },
} as const;
