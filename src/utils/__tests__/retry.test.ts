import { retry, retryFetch } from '../retry';

jest.mock('../logger');

describe('retry', () => {
  beforeEach(() => {
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

    const promise = retry(fn);

    // Advance timers for each retry
    await jest.advanceTimersByTimeAsync(1000); // First retry
    await jest.advanceTimersByTimeAsync(2000); // Second retry

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const error = new Error('test error');
    const fn = jest.fn().mockRejectedValue(error);

    const promise = retry(fn, { maxRetries: 2 });

    // Advance timers for each retry
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expect(promise).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should respect custom retry options', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('test error'));
    const options = { maxRetries: 4, initialDelay: 100 };

    const promise = retry(fn, options);

    // Advance timers for each retry
    for (let i = 0; i < options.maxRetries; i++) {
      await jest.advanceTimersByTimeAsync(options.initialDelay * Math.pow(2, i));
    }

    await expect(promise).rejects.toThrow('test error');
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('should respect timeout option', async () => {
    const fn = jest
      .fn()
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 5000)));
    const options = { timeout: 1000 };

    const promise = retry(fn, options);
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow('Operation timed out');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use custom shouldRetry function', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockRejectedValueOnce(new Error('no-retry'))
      .mockResolvedValue('success');

    const shouldRetry = (error: Error) => error.message === 'retry';
    const promise = retry(fn, { shouldRetry });

    await jest.advanceTimersByTimeAsync(1000);
    await expect(promise).rejects.toThrow('no-retry');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('retryFetch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('should retry failed fetch requests', async () => {
    const mockResponse = { ok: true, json: () => Promise.resolve({ data: 'test' }) };
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue(mockResponse);

    const promise = retryFetch('https://api.example.com/test');
    await jest.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle non-ok responses', async () => {
    const mockResponse = { ok: false, status: 500 };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = retryFetch('https://api.example.com/test');
    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow('HTTP error! status: 500');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should pass through fetch options', async () => {
    const mockResponse = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    const options = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

    await retryFetch('https://api.example.com/test', options);
    expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/test', options);
  });
});
