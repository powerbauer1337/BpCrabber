import { useState, useCallback } from 'react';
import { AppError } from '../utils/errors';

interface ErrorState {
  message: string;
  code?: string;
  metadata?: Record<string, unknown>;
}

export function useError() {
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof AppError) {
      setError({
        message: error.message,
        code: error.code,
        metadata: error.metadata,
      });
    } else if (error instanceof Error) {
      setError({
        message: error.message,
        code: 'UNKNOWN_ERROR',
      });
    } else {
      setError({
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      });
    }
  }, []);

  const wrapAsync = useCallback(
    async <T>(
      promise: Promise<T>,
      options: {
        onSuccess?: (data: T) => void;
        onError?: (error: unknown) => void;
        loadingMessage?: string;
      } = {}
    ): Promise<T | undefined> => {
      try {
        setIsLoading(true);
        clearError();

        const result = await promise;
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        handleError(error);
        options.onError?.(error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [clearError, handleError]
  );

  return {
    error,
    isLoading,
    clearError,
    handleError,
    wrapAsync,
  };
}
