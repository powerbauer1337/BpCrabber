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
    const key = 'test-key-block';
    const results = [];

    // Make 101 requests (max is 100)
    for (let i = 0; i < 101; i++) {
      results.push(await rateLimiter.checkRateLimit(key));
    }

    // First 100 should be allowed, last one blocked
    const firstHundred = results.slice(0, 100);
    const allTrue = firstHundred.every(r => r === true);
    expect(allTrue).toBe(true);
    expect(results[100]).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const key = 'test-key-refill';

    // Use up all tokens
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit(key);
    }

    // Verify we're out of tokens
    expect(await rateLimiter.checkRateLimit(key)).toBe(false);

    // Advance time by 1 minute
    jest.advanceTimersByTime(60000);
    await Promise.resolve(); // Let any pending promises resolve

    // Should have some tokens available now
    expect(await rateLimiter.checkRateLimit(key)).toBe(true);
  });

  it('should wait for token availability', async () => {
    const key = 'test-key-wait';
    jest.setTimeout(30000); // Increase timeout for this test

    // Use up all tokens
    for (let i = 0; i < 100; i++) {
      await rateLimiter.checkRateLimit(key);
    }

    // Start waiting for token
    const waitPromise = rateLimiter.waitForToken(key);

    // Advance time until token becomes available
    jest.advanceTimersByTime(60000);
    await Promise.resolve(); // Let any pending promises resolve

    // Wait should resolve
    await expect(waitPromise).resolves.toBeUndefined();
  }, 30000);

  it('should return correct remaining tokens', async () => {
    const key = 'test-key-remaining';

    // Initial state should have max tokens
    const initial = rateLimiter.getRemainingTokens(key);
    expect(initial).toBe(100);

    // Use some tokens
    await rateLimiter.checkRateLimit(key);
    await rateLimiter.checkRateLimit(key);

    // Should have 98 tokens remaining
    const remaining = rateLimiter.getRemainingTokens(key);
    expect(remaining).toBe(98);
  });

  it('should clean up old buckets', async () => {
    const key = 'test-key-cleanup';
    await rateLimiter.checkRateLimit(key);

    // Advance time past cleanup interval
    jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
    await Promise.resolve(); // Let any pending promises resolve

    // Bucket should be reset
    expect(rateLimiter.getRemainingTokens(key)).toBe(100);
  });
});
