/**
 * Advanced error handling and resilience patterns for Memorai
 * Includes retry mechanisms, circuit breakers, and graceful degradation
 */

import { logger } from '../utils/logger.js';

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors?: string[];
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringWindowMs: number;
  minimumCalls: number;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class RetryManager {
  private defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    exponentialBackoff: true,
    jitter: true,
    // Don't specify retryableErrors to allow all errors by default
  };

  /**
   * Execute a function with retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on the last attempt
        if (attempt === opts.maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error, opts.retryableErrors)) {
          throw error;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, opts);
        // Log retry attempt
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private isRetryableError(error: Error, retryableErrors?: string[]): boolean {
    if (!retryableErrors) {
      return true;
    }

    return retryableErrors.some(retryableError =>
      error.message.includes(retryableError) ||
      error.name.includes(retryableError)
    );
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.baseDelayMs;

    if (options.exponentialBackoff) {
      delay = Math.min(options.baseDelayMs * Math.pow(2, attempt - 1), options.maxDelayMs);
    }

    if (options.jitter) {
      // Add random jitter to prevent thundering herd
      delay += Math.random() * delay * 0.1;
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private nextAttemptTime: number = 0;
  private recentCalls: { timestamp: number; success: boolean }[] = [];

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) { }

  /**
   * Execute a function with circuit breaker protection
   */
  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.shouldRejectCall()) {
      throw new Error(`Circuit breaker '${this.name}' is OPEN - rejecting call`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  /**
   * Get current circuit breaker status
   */
  public getStatus(): {
    state: CircuitBreakerState;
    failures: number;
    successRate: number;
    nextAttemptTime?: Date;
  } {
    const successRate = this.calculateSuccessRate();

    const result: {
      state: CircuitBreakerState;
      failures: number;
      successRate: number;
      nextAttemptTime?: Date;
    } = {
      state: this.state,
      failures: this.failures,
      successRate,
    };

    if (this.nextAttemptTime > 0) {
      result.nextAttemptTime = new Date(this.nextAttemptTime);
    }

    return result;
  }

  private shouldRejectCall(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        return false;

      case CircuitBreakerState.OPEN:
        if (now >= this.nextAttemptTime) {
          this.state = CircuitBreakerState.HALF_OPEN;
          return false;
        }
        return true;

      case CircuitBreakerState.HALF_OPEN:
        return false;

      default:
        return false;
    }
  }

  private onSuccess(): void {
    this.recordCall(true);
    this.failures = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
    }
  }

  private onFailure(): void {
    this.recordCall(false);
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.shouldOpenCircuit()) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = Date.now() + this.options.resetTimeoutMs;
    }
  }

  private shouldOpenCircuit(): boolean {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }

    const recentCallsCount = this.getRecentCallsCount();

    if (recentCallsCount < this.options.minimumCalls) {
      return false;
    }

    const successRate = this.calculateSuccessRate();
    const failureRate = 1 - successRate;

    return failureRate >= (this.options.failureThreshold / 100);
  }

  private recordCall(success: boolean): void {
    const now = Date.now();
    this.recentCalls.push({ timestamp: now, success });

    // Clean up old calls outside the monitoring window
    const cutoff = now - this.options.monitoringWindowMs;
    this.recentCalls = this.recentCalls.filter(call => call.timestamp >= cutoff);
  }

  private getRecentCallsCount(): number {
    const now = Date.now();
    const cutoff = now - this.options.monitoringWindowMs;
    return this.recentCalls.filter(call => call.timestamp >= cutoff).length;
  }

  private calculateSuccessRate(): number {
    const recentCalls = this.getRecentCallsInWindow();
    if (recentCalls.length === 0) {
      return 1.0;
    }

    const successfulCalls = recentCalls.filter(call => call.success).length;
    return successfulCalls / recentCalls.length;
  }

  private getRecentCallsInWindow(): { timestamp: number; success: boolean }[] {
    const now = Date.now();
    const cutoff = now - this.options.monitoringWindowMs;
    return this.recentCalls.filter(call => call.timestamp >= cutoff);
  }
}

export class ResilienceManager {
  private retryManager = new RetryManager();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Execute operation with both retry and circuit breaker protection
   */
  public async executeResilient<T>(
    operationName: string,
    operation: () => Promise<T>,
    options: {
      retry?: Partial<RetryOptions>;
      circuitBreaker?: CircuitBreakerOptions;
    } = {}
  ): Promise<T> {
    // Get or create circuit breaker
    const circuitBreaker = this.getOrCreateCircuitBreaker(operationName, options.circuitBreaker);

    // Execute with circuit breaker protection and retry logic
    return circuitBreaker.execute(async () => {
      return this.retryManager.executeWithRetry(operation, options.retry);
    });
  }

  /**
   * Execute with graceful degradation fallback
   */
  public async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    operationName?: string,
    options?: {
      retry?: Partial<RetryOptions>;
      circuitBreaker?: CircuitBreakerOptions;
    }
  ): Promise<T> {
    try {
      if (operationName && options) {
        return await this.executeResilient(operationName, operation, options);
      } else {
        return await operation();
      }
    } catch (error) {
      logger.warn(`Primary operation failed, falling back:`, error);
      return fallback();
    }
  }

  /**
   * Get status of all circuit breakers
   */
  public getAllCircuitBreakerStatus(): Record<string, ReturnType<CircuitBreaker['getStatus']>> {
    const status: Record<string, ReturnType<CircuitBreaker['getStatus']>> = {};

    for (const [name, circuitBreaker] of this.circuitBreakers) {
      status[name] = circuitBreaker.getStatus();
    }

    return status;
  }

  /**
   * Reset a specific circuit breaker
   */  public resetCircuitBreaker(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      // Create a new circuit breaker to reset state
      this.circuitBreakers.delete(name);
      return true;
    }
    return false;
  }

  private getOrCreateCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(name);

    if (!circuitBreaker) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 50, // 50% failure rate
        resetTimeoutMs: 60000, // 1 minute
        monitoringWindowMs: 60000, // 1 minute window
        minimumCalls: 10, // Minimum calls before circuit can open
      };

      circuitBreaker = new CircuitBreaker(name, { ...defaultOptions, ...options });
      this.circuitBreakers.set(name, circuitBreaker);
    }

    return circuitBreaker;
  }
}

// Global singleton instance
export const resilienceManager = new ResilienceManager();
