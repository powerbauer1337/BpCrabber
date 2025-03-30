import { logger, logMetric } from './logger';

interface PerformanceMetrics {
  startTime: number;
  measurements: Map<string, number>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics>;
  private thresholds: Map<string, number>;

  private constructor() {
    this.metrics = new Map();
    this.thresholds = new Map();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public startTracking(operationId: string): void {
    this.metrics.set(operationId, {
      startTime: performance.now(),
      measurements: new Map(),
    });
  }

  public measure(operationId: string, label: string): void {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      logger.warn(`No tracking started for operation: ${operationId}`);
      return;
    }

    const currentTime = performance.now();
    const duration = currentTime - metrics.startTime;
    metrics.measurements.set(label, duration);

    // Check threshold
    const threshold = this.thresholds.get(label);
    if (threshold && duration > threshold) {
      logger.warn(`Performance threshold exceeded for ${label}`, {
        operationId,
        duration,
        threshold,
      });
    }

    // Log metric
    logMetric(label, duration, { operationId });
  }

  public endTracking(operationId: string): Map<string, number> | null {
    const metrics = this.metrics.get(operationId);
    if (!metrics) {
      logger.warn(`No tracking started for operation: ${operationId}`);
      return null;
    }

    const totalDuration = performance.now() - metrics.startTime;
    metrics.measurements.set('total', totalDuration);

    // Log final metrics
    logger.info(`Operation completed: ${operationId}`, {
      duration: totalDuration,
      measurements: Object.fromEntries(metrics.measurements),
    });

    this.metrics.delete(operationId);
    return metrics.measurements;
  }

  public setThreshold(label: string, milliseconds: number): void {
    this.thresholds.set(label, milliseconds);
  }

  public clearThreshold(label: string): void {
    this.thresholds.delete(label);
  }

  public getMetrics(operationId: string): Map<string, number> | null {
    const metrics = this.metrics.get(operationId);
    return metrics ? metrics.measurements : null;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export helper functions for common operations
export const trackOperation = (operationName: string, operation: () => Promise<any>) => {
  const operationId = `${operationName}-${Date.now()}`;
  performanceMonitor.startTracking(operationId);

  return operation()
    .then(result => {
      performanceMonitor.endTracking(operationId);
      return result;
    })
    .catch(error => {
      performanceMonitor.endTracking(operationId);
      throw error;
    });
};

export const measureSync = <T>(label: string, operation: () => T): T => {
  const start = performance.now();
  const result = operation();
  const duration = performance.now() - start;
  logMetric(label, duration);
  return result;
};
