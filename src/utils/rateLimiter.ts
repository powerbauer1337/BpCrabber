import { securityConfig } from '../config/security';
import { logger } from './logger';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<string, TokenBucket>;
  private readonly refillRate: number;
  private readonly capacity: number;
  private readonly windowMs: number;

  constructor() {
    this.buckets = new Map();
    this.refillRate =
      securityConfig.rateLimiting.max / (securityConfig.rateLimiting.windowMs / 1000);
    this.capacity = securityConfig.rateLimiting.max;
    this.windowMs = securityConfig.rateLimiting.windowMs;

    // Cleanup old buckets every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > this.windowMs) {
        this.buckets.delete(key);
      }
    }
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  public async checkRateLimit(key: string): Promise<boolean> {
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.capacity,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    } else {
      this.refillBucket(bucket);
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    logger.warn(`Rate limit exceeded for key: ${key}`);
    return false;
  }

  public async waitForToken(key: string): Promise<void> {
    while (!(await this.checkRateLimit(key))) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  public getRemainingTokens(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket) {
      return this.capacity;
    }

    this.refillBucket(bucket);
    return Math.floor(bucket.tokens);
  }
}

// Export a singleton instance
export const rateLimiter = new RateLimiter();
