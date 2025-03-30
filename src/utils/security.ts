import { ValidationError } from './error-handler';
import { z } from 'zod';
import { log } from './logger';

// URL validation schema
const urlSchema = z
  .string()
  .url()
  .regex(/^https:\/\/www\.beatport\.com\/track\/.*$/i, 'Invalid Beatport track URL');

// File path validation schema
const filePathSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_/\\. ]+$/, 'Invalid file path')
  .refine(path => !path.includes('..'), 'Path traversal not allowed');

// Command validation schema
const commandSchema = z
  .string()
  .regex(/^[a-zA-Z0-9-_. ]+$/, 'Invalid command')
  .refine(
    cmd => process.env.ALLOWED_COMMANDS?.split(',').includes(cmd.split(' ')[0]),
    'Command not allowed'
  );

// Input sanitization function
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim(); // Remove whitespace
}

// URL validation function
export function validateBeatportUrl(url: string): string {
  try {
    return urlSchema.parse(sanitizeInput(url));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(`Invalid Beatport URL: ${error.issues[0].message}`);
    }
    throw error;
  }
}

// File path validation function
export function validateFilePath(path: string): string {
  try {
    return filePathSchema.parse(sanitizeInput(path));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(`Invalid file path: ${error.issues[0].message}`);
    }
    throw error;
  }
}

// Command validation function
export function validateCommand(command: string): string {
  try {
    return commandSchema.parse(sanitizeInput(command));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(`Invalid command: ${error.issues[0].message}`);
    }
    throw error;
  }
}

// Rate limiting implementation
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);

    // Check if rate limit is exceeded
    if (requests.length >= this.maxRequests) {
      log.warn(`Rate limit exceeded for key: ${key}`);
      return true;
    }

    // Add current request
    requests.push(now);
    this.requests.set(key, requests);

    return false;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Create rate limiter instance
export const rateLimiter = new RateLimiter();

// Content Security Policy headers
export const cspHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.beatport.com;",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};
