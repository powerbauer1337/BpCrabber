import { rateLimiter } from '../rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow requests within rate limit', async () => {
    const key = 'test-key';
    const result = await rateLimiter.checkRateLimit(key);
    expect(result).toBe(true);
  });

  it('should block requests exceeding rate limit', async () => {
    const key = 'test-key';
    const results = [];

    // Make 101 requests (max is 100)
    for (let i = 0; i < 101; i++) {
      results.push(await rateLimiter.checkRateLimit(key));
    }

    // First 100 should be allowed, last one blocked
    expect(results.slice(0, 100).every(r => r === true)).toBe(true);
    expect(results[100]).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const key = 'test-key';

    // Use up all tokens
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit(key);
    }

    // Verify we're out of tokens
    expect(await rateLimiter.checkRateLimit(key)).toBe(false);

    // Advance time by 1 minute
    jest.advanceTimersByTime(60000);

    // Should have some tokens available now
    expect(await rateLimiter.checkRateLimit(key)).toBe(true);
  });

  it('should wait for token availability', async () => {
    const key = 'test-key';

    // Use up all tokens
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit(key);
    }

    // Start waiting for token
    const waitPromise = rateLimiter.waitForToken(key);

    // Advance time until token becomes available
    jest.advanceTimersByTime(60000);

    // Wait should resolve
    await expect(waitPromise).resolves.toBeUndefined();
  });

  it('should return correct remaining tokens', async () => {
    const key = 'test-key';

    // Initial state should have max tokens
    expect(rateLimiter.getRemainingTokens(key)).toBe(100);

    // Use some tokens
    await rateLimiter.checkRateLimit(key);
    await rateLimiter.checkRateLimit(key);

    // Should have 98 tokens remaining
    expect(rateLimiter.getRemainingTokens(key)).toBe(98);
  });

  it('should clean up old buckets', async () => {
    const key = 'test-key';
    await rateLimiter.checkRateLimit(key);

    // Advance time past cleanup interval
    jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes

    // Bucket should be reset
    expect(rateLimiter.getRemainingTokens(key)).toBe(100);
  });
});
