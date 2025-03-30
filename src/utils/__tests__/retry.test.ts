import { retry, retryFetch } from '../retry';
import { logger } from '../logger';

jest.mock('../logger');

describe('retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first try', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success');

    const result = await retry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const error = new Error('test error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retry(fn)).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3); // Default 3 retries
  });

  it('should respect custom retry options', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('test error'));

    await expect(retry(fn, { retries: 5 })).rejects.toThrow('test error');

    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('should respect timeout option', async () => {
    const fn = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    const promise = retry(fn, { timeout: 1000 });
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Operation timed out after 1000ms');
  });

  it('should use custom shouldRetry function', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('test error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    await expect(retry(fn, { shouldRetry })).rejects.toThrow('test error');

    expect(fn).toHaveBeenCalledTimes(1); // No retries
    expect(shouldRetry).toHaveBeenCalledTimes(1);
  });

  it('should implement exponential backoff', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('success');

    const backoff = {
      initial: 100,
      max: 1000,
      factor: 2,
    };

    const promise = retry(fn, { backoff });

    // First failure - should wait 100ms
    jest.advanceTimersByTime(99);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second failure - should wait 200ms
    jest.advanceTimersByTime(199);
    expect(fn).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe('success');
  });
});

describe('retryFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should retry failed fetch requests', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) };
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue(mockResponse);

    const result = await retryFetch('https://api.example.com/test');
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle non-ok responses', async () => {
    const mockResponse = { ok: false, status: 500 };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(retryFetch('https://api.example.com/test')).rejects.toThrow(
      'HTTP error! status: 500'
    );
  });

  it('should pass through fetch options', async () => {
    const mockResponse = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true }),
    };

    await retryFetch('https://api.example.com/test', options);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', options);
  });
});
