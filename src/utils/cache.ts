import Redis from 'ioredis';
import { appConfig } from '../config/config';
import { log } from './logger';

interface CacheInterface {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

class MemoryCache implements CacheInterface {
  private cache: Map<string, { value: unknown; expiry: number }>;

  constructor() {
    this.cache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiry && item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl * 1000 : 0;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

class RedisCache implements CacheInterface {
  private client: Redis;
  private retryTimes: number;
  private retryDelay: number;

  constructor() {
    this.retryTimes = 3;
    this.retryDelay = 1000;
    this.client = new Redis(appConfig.cache.redisUrl, {
      retryStrategy: (times: number) => {
        if (times > this.retryTimes) {
          log.error('Redis connection failed after multiple retries');
          return null;
        }
        return this.retryDelay;
      },
    });

    this.client.on('error', (error: Error) => {
      log.error(`Redis error: ${error.message}`);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      log.error(`Redis get error: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      log.error(`Redis set error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      log.error(`Redis delete error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.client.flushdb();
    } catch (error) {
      log.error(`Redis clear error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Create cache instance based on configuration
const cache: CacheInterface = appConfig.cache.useRedis ? new RedisCache() : new MemoryCache();

// Export everything together
export { cache, MemoryCache, RedisCache, type CacheInterface };
