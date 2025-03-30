import { securityConfig } from '../config/security';
import { logger } from './logger';

interface RetryOptions {
  retries?: number;
  timeout?: number;
  backoff?: {
    initial: number;
    max: number;
    factor: number;
  };
  shouldRetry?: (error: Error) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  retries: securityConfig.api.retries,
  timeout: securityConfig.api.timeout,
  backoff: securityConfig.api.backoff,
  shouldRetry: (error: Error) => {
    // Retry on network errors and 5xx server errors
    if (error instanceof TypeError && error.message.includes('network')) {
      return true;
    }
    if ('status' in error && typeof (error as any).status === 'number') {
      return (error as any).status >= 500;
    }
    return false;
  },
};

export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;
  let attempt = 0;

  while (attempt < opts.retries) {
    try {
      // Add timeout to the operation
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Operation timed out after ${opts.timeout}ms`));
          }, opts.timeout);
        }),
      ]);

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry
      if (!opts.shouldRetry(lastError)) {
        logger.error('Operation failed, not retrying:', lastError);
        throw lastError;
      }

      attempt++;

      if (attempt < opts.retries) {
        // Calculate backoff delay
        const backoffMs = Math.min(
          opts.backoff.initial * Math.pow(opts.backoff.factor, attempt - 1),
          opts.backoff.max
        );

        logger.warn(
          `Operation failed, retrying in ${backoffMs}ms (attempt ${attempt}/${opts.retries}):`,
          lastError
        );

        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  logger.error(`Operation failed after ${opts.retries} attempts:`, lastError!);
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
