import { logger } from '../utils/logger';

interface RetryOptions {
  retries?: number;
  maxRetries?: number; // Alias for retries
  initialDelay?: number;
  timeout?: number;
  shouldRetry?: (error: Error) => boolean;
  backoff?: {
    initial: number;
    max: number;
    factor: number;
  };
}

const defaultOptions: Required<RetryOptions> = {
  retries: 2,
  maxRetries: 2,
  initialDelay: 100,
  timeout: 10000,
  shouldRetry: () => true,
  backoff: {
    initial: 100,
    max: 1000,
    factor: 2,
  },
};

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  const retries = opts.maxRetries || opts.retries;
  const initialDelay = opts.initialDelay || opts.backoff.initial;
  let lastError: Error;
  let attempt = 0;

  while (attempt < retries) {
    try {
      // Add timeout to the operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), opts.timeout);
      });

      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error as Error;

      if (!opts.shouldRetry(lastError)) {
        break;
      }

      attempt++;

      if (attempt < retries) {
        // Calculate backoff delay using initialDelay
        const backoffMs = Math.min(
          initialDelay * Math.pow(opts.backoff.factor, attempt - 1),
          opts.backoff.max
        );

        logger.warn(
          `Operation failed, retrying in ${backoffMs}ms (attempt ${attempt}/${retries}):`,
          lastError
        );

        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  logger.error(`Operation failed after ${retries} attempts:`, lastError!);
  throw lastError!;
}

// Helper for retrying fetch requests
export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(input, init);
    if (!response.ok) {
      const error: any = new Error(`HTTP error! status: ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response;
  }, options);
}
