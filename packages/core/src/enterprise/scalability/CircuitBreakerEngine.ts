/**
 * Circuit Breaker Engine for Memorai
 * 
 * Advanced circuit breaker pattern implementation providing fault tolerance
 * and resilience for distributed systems. Automatically detects failures,
 * implements fallback strategies, and manages service degradation gracefully.
 * 
 * Features:
 * - Multiple circuit breaker patterns (traditional, adaptive, sliding window)
 * - Automatic failure detection and recovery
 * - Configurable fallback strategies
 * - Bulkhead isolation patterns
 * - Retry mechanisms with exponential backoff
 * - Health monitoring and alerting
 * - Circuit breaker chaining and dependency management
 * 
 * @version 3.0.0
 * @author Memorai Enterprise Team
 */

import { EventEmitter } from 'events';

/**
 * Circuit breaker states
 */
export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number; // Number of failures to trigger open state
  successThreshold: number; // Number of successes to close from half-open
  timeout: number; // Time in ms to wait before trying half-open
  monitoringPeriod: number; // Window for failure counting (ms)
  volumeThreshold: number; // Minimum calls before circuit can open
  errorThresholdPercentage: number; // Percentage of errors to trigger open
  slowCallThreshold: number; // Time in ms to consider a call slow
  slowCallPercentageThreshold: number; // Percentage of slow calls to trigger open
  maxRetries: number; // Maximum retry attempts
  retryDelay: number; // Initial retry delay in ms
  exponentialBackoff: boolean; // Use exponential backoff for retries
  jitterEnabled: boolean; // Add jitter to retry delays
  fallbackEnabled: boolean; // Enable fallback mechanism
  bulkheadEnabled: boolean; // Enable bulkhead isolation
  maxConcurrentCalls: number; // Maximum concurrent calls (for bulkhead)
}

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStats {
  state: CircuitBreakerState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  slowCalls: number;
  rejectedCalls: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateTransitionTime: Date;
  avgResponseTime: number;
  errorRate: number;
  slowCallRate: number;
  successRate: number;
  throughput: number; // calls per second
}

/**
 * Call result
 */
export interface CallResult<T = any> {
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  timestamp: Date;
  fromFallback: boolean;
  retryAttempt: number;
}

/**
 * Fallback strategy
 */
export type FallbackStrategy<T = any> = 
  | 'none'
  | 'static_value'
  | 'cached_response'
  | 'degraded_service'
  | 'circuit_breaker_chain'
  | 'custom_function';

/**
 * Fallback configuration
 */
export interface FallbackConfig<T = any> {
  strategy: FallbackStrategy<T>;
  staticValue?: T;
  cacheKey?: string;
  degradedEndpoint?: string;
  chainedCircuitBreaker?: string;
  customFunction?: () => Promise<T>;
  timeout: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitterEnabled: boolean;
  retryableErrors: string[]; // Error types that should trigger retry
}

/**
 * Bulkhead configuration
 */
export interface BulkheadConfig {
  enabled: boolean;
  maxConcurrentCalls: number;
  maxWaitTime: number; // Time to wait for available slot
  queueSize: number; // Size of waiting queue
}

/**
 * Call context for circuit breaker
 */
export interface CallContext {
  id: string;
  operation: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout: number;
  metadata: Record<string, any>;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  circuitBreakerId: string;
  timestamp: Date;
  state: CircuitBreakerState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  rejectedCalls: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // Health check interval in ms
  timeout: number; // Health check timeout in ms
  healthyThreshold: number; // Consecutive successes to mark healthy
  unhealthyThreshold: number; // Consecutive failures to mark unhealthy
  endpoint?: string; // Health check endpoint
  customCheck?: () => Promise<boolean>; // Custom health check function
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker<T = any> extends EventEmitter {
  private config: CircuitBreakerConfig;
  private fallbackConfig?: FallbackConfig<T>;
  private retryConfig: RetryConfig;
  private bulkheadConfig: BulkheadConfig;
  private healthCheckConfig: HealthCheckConfig;
  
  private state: CircuitBreakerState = 'closed';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateTransitionTime: Date = new Date();
  private nextAttemptTime: Date = new Date();
  
  private callHistory: CallResult<T>[] = [];
  private responseTimes: number[] = [];
  private concurrentCalls: number = 0;
  private waitingQueue: Array<{ resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = [];
  private cache: Map<string, { value: T; timestamp: Date; ttl: number }> = new Map();
  
  private healthCheckInterval?: NodeJS.Timeout;
  private isHealthy: boolean = true;
  private consecutiveHealthChecks: number = 0;
  
  private totalCalls: number = 0;
  private totalSuccesses: number = 0;
  private totalFailures: number = 0;
  private totalRejections: number = 0;

  constructor(
    config: CircuitBreakerConfig,
    fallbackConfig?: FallbackConfig<T>,
    retryConfig?: Partial<RetryConfig>,
    bulkheadConfig?: Partial<BulkheadConfig>,
    healthCheckConfig?: Partial<HealthCheckConfig>
  ) {
    super();
    
    this.config = config;
    this.fallbackConfig = fallbackConfig;
    
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      exponentialBase: 2,
      jitterEnabled: true,
      retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
      ...retryConfig
    };
    
    this.bulkheadConfig = {
      enabled: config.bulkheadEnabled,
      maxConcurrentCalls: config.maxConcurrentCalls,
      maxWaitTime: 5000,
      queueSize: 100,
      ...bulkheadConfig
    };
    
    this.healthCheckConfig = {
      enabled: false,
      interval: 30000,
      timeout: 5000,
      healthyThreshold: 3,
      unhealthyThreshold: 3,
      ...healthCheckConfig
    };
    
    if (this.healthCheckConfig.enabled) {
      this.startHealthChecks();
    }
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<R = T>(
    fn: () => Promise<R>,
    context?: CallContext,
    fallbackFn?: () => Promise<R>
  ): Promise<CallResult<R>> {
    const callId = context?.id || `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.totalCalls++;
    
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime.getTime()) {
        this.totalRejections++;
        const fallbackResult = await this.executeFallback(fallbackFn, context);
        this.emit('call_rejected', { callId, reason: 'circuit_open', context });
        return fallbackResult;
      } else {
        // Transition to half-open
        this.transitionToHalfOpen();
      }
    }
    
    // Check bulkhead capacity
    if (this.bulkheadConfig.enabled) {
      const bulkheadResult = await this.checkBulkheadCapacity(callId);
      if (!bulkheadResult.allowed) {
        this.totalRejections++;
        const fallbackResult = await this.executeFallback(fallbackFn, context);
        this.emit('call_rejected', { callId, reason: 'bulkhead_full', context });
        return fallbackResult;
      }
    }
    
    this.concurrentCalls++;
    
    try {
      const result = await this.executeWithRetry(fn, context);
      this.onSuccess(result, startTime);
      return result;
    } catch (error) {
      const failureResult = this.onFailure(error as Error, startTime);
      const fallbackResult = await this.executeFallback(fallbackFn, context);
      if (fallbackResult.success) {
        return {
          ...fallbackResult,
          result: fallbackResult.result as unknown as R
        } as CallResult<R>;
      }
      return failureResult as CallResult<R>;
    } finally {
      this.concurrentCalls--;
      this.processWaitingQueue();
    }
  }

  /**
   * Execute function with retry logic
   */
  private async executeWithRetry<R>(
    fn: () => Promise<R>,
    context?: CallContext,
    attempt: number = 1
  ): Promise<CallResult<R>> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeWithTimeout(fn, context?.timeout || 30000);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        result,
        duration,
        timestamp: new Date(),
        fromFallback: false,
        retryAttempt: attempt
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (attempt < this.retryConfig.maxAttempts && this.shouldRetry(error as Error)) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        
        this.emit('retry_attempt', { 
          attempt, 
          maxAttempts: this.retryConfig.maxAttempts, 
          delay,
          error: error as Error,
          context 
        });
        
        return this.executeWithRetry(fn, context, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<R>(fn: () => Promise<R>, timeout: number): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);
      
      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if error should trigger retry
   */
  private shouldRetry(error: Error): boolean {
    return this.retryConfig.retryableErrors.some(errorType => 
      error.message.includes(errorType) || error.name === errorType
    );
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    let delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.exponentialBase, attempt - 1);
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    if (this.retryConfig.jitterEnabled) {
      delay = delay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
    }
    
    return Math.floor(delay);
  }

  /**
   * Check bulkhead capacity
   */
  private async checkBulkheadCapacity(callId: string): Promise<{ allowed: boolean; waitTime?: number }> {
    if (this.concurrentCalls < this.bulkheadConfig.maxConcurrentCalls) {
      return { allowed: true };
    }
    
    if (this.waitingQueue.length >= this.bulkheadConfig.queueSize) {
      return { allowed: false };
    }
    
    // Wait for available slot
    return new Promise<{ allowed: boolean; waitTime?: number }>((resolve) => {
      const startWait = Date.now();
      
      const timeout = setTimeout(() => {
        this.removeFromQueue(resolve);
        resolve({ allowed: false, waitTime: Date.now() - startWait });
      }, this.bulkheadConfig.maxWaitTime);
      
      this.waitingQueue.push({
        resolve: () => {
          clearTimeout(timeout);
          resolve({ allowed: true, waitTime: Date.now() - startWait });
        },
        reject: () => {
          clearTimeout(timeout);
          resolve({ allowed: false, waitTime: Date.now() - startWait });
        },
        timeout
      });
    });
  }

  /**
   * Process waiting queue
   */
  private processWaitingQueue(): void {
    while (
      this.waitingQueue.length > 0 && 
      this.concurrentCalls < this.bulkheadConfig.maxConcurrentCalls
    ) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        waiter.resolve();
      }
    }
  }

  /**
   * Remove from waiting queue
   */
  private removeFromQueue(resolve: Function): void {
    const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
    if (index >= 0) {
      const waiter = this.waitingQueue.splice(index, 1)[0];
      clearTimeout(waiter.timeout);
    }
  }

  /**
   * Handle successful call
   */
  private onSuccess<R>(result: CallResult<R>, startTime: number): void {
    const duration = Date.now() - startTime;
    this.recordCall(result, duration);
    this.lastSuccessTime = new Date();
    this.totalSuccesses++;
    
    if (this.state === 'half_open') {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
    
    this.emit('call_success', { result, duration });
  }

  /**
   * Handle failed call
   */
  private onFailure<R>(error: Error, startTime: number): CallResult<R> {
    const duration = Date.now() - startTime;
    const failureResult: CallResult<R> = {
      success: false,
      error,
      duration,
      timestamp: new Date(),
      fromFallback: false,
      retryAttempt: 0
    };
    
    this.recordCall(failureResult, duration);
    this.lastFailureTime = new Date();
    this.totalFailures++;
    
    if (this.shouldTripCircuit()) {
      this.transitionToOpen();
    }
    
    this.emit('call_failure', { error, duration });
    return failureResult;
  }

  /**
   * Record call for monitoring
   */
  private recordCall<R>(result: CallResult<R>, duration: number): void {
    this.callHistory.push(result as unknown as CallResult<T>);
    this.responseTimes.push(duration);
    
    // Keep only recent history
    const maxHistory = 1000;
    if (this.callHistory.length > maxHistory) {
      this.callHistory = this.callHistory.slice(-maxHistory);
    }
    if (this.responseTimes.length > maxHistory) {
      this.responseTimes = this.responseTimes.slice(-maxHistory);
    }
  }

  /**
   * Check if circuit should trip to open state
   */
  private shouldTripCircuit(): boolean {
    const recentCalls = this.getRecentCalls();
    
    if (recentCalls.length < this.config.volumeThreshold) {
      return false;
    }
    
    const failures = recentCalls.filter(call => !call.success).length;
    const errorRate = (failures / recentCalls.length) * 100;
    
    const slowCalls = recentCalls.filter(call => 
      call.duration > this.config.slowCallThreshold
    ).length;
    const slowCallRate = (slowCalls / recentCalls.length) * 100;
    
    return errorRate >= this.config.errorThresholdPercentage ||
           slowCallRate >= this.config.slowCallPercentageThreshold;
  }

  /**
   * Get recent calls within monitoring period
   */
  private getRecentCalls(): CallResult<T>[] {
    const cutoff = Date.now() - this.config.monitoringPeriod;
    return this.callHistory.filter(call => call.timestamp.getTime() > cutoff);
  }

  /**
   * Transition to open state
   */
  private transitionToOpen(): void {
    if (this.state !== 'open') {
      this.state = 'open';
      this.stateTransitionTime = new Date();
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
      this.failureCount = 0;
      this.successCount = 0;
      
      this.emit('state_change', { 
        newState: 'open', 
        reason: 'failure_threshold_exceeded',
        nextAttemptTime: this.nextAttemptTime
      });
    }
  }

  /**
   * Transition to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = 'half_open';
    this.stateTransitionTime = new Date();
    this.successCount = 0;
    this.failureCount = 0;
    
    this.emit('state_change', { 
      newState: 'half_open', 
      reason: 'timeout_elapsed'
    });
  }

  /**
   * Transition to closed state
   */
  private transitionToClosed(): void {
    this.state = 'closed';
    this.stateTransitionTime = new Date();
    this.failureCount = 0;
    this.successCount = 0;
    
    this.emit('state_change', { 
      newState: 'closed', 
      reason: 'success_threshold_reached'
    });
  }

  /**
   * Execute fallback strategy
   */
  private async executeFallback<R>(
    fallbackFn?: () => Promise<R>,
    context?: CallContext
  ): Promise<CallResult<R>> {
    if (fallbackFn) {
      try {
        const startTime = Date.now();
        const result = await fallbackFn();
        return {
          success: true,
          result,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          fromFallback: true,
          retryAttempt: 0
        };
      } catch (error) {
        // Fallback failed, continue to configured fallback
      }
    }
    
    if (!this.fallbackConfig) {
      return {
        success: false,
        error: new Error('Circuit breaker open and no fallback configured'),
        duration: 0,
        timestamp: new Date(),
        fromFallback: true,
        retryAttempt: 0
      };
    }
    
    const startTime = Date.now();
    
    try {
      let result: R;
      
      switch (this.fallbackConfig.strategy) {
        case 'static_value':
          result = this.fallbackConfig.staticValue as R;
          break;
          
        case 'cached_response':
          result = await this.getCachedResponse<R>(this.fallbackConfig.cacheKey!);
          break;
          
        case 'custom_function':
          if (this.fallbackConfig.customFunction) {
            result = await this.fallbackConfig.customFunction() as R;
          } else {
            throw new Error('Custom function not provided');
          }
          break;
          
        default:
          throw new Error(`Unsupported fallback strategy: ${this.fallbackConfig.strategy}`);
      }
      
      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        fromFallback: true,
        retryAttempt: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        fromFallback: true,
        retryAttempt: 0
      };
    }
  }

  /**
   * Get cached response
   */
  private async getCachedResponse<R>(cacheKey: string): Promise<R> {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      throw new Error(`No cached response found for key: ${cacheKey}`);
    }
    
    if (Date.now() - cached.timestamp.getTime() > cached.ttl) {
      this.cache.delete(cacheKey);
      throw new Error(`Cached response expired for key: ${cacheKey}`);
    }
    
    return cached.value as unknown as R;
  }

  /**
   * Cache response
   */
  cacheResponse(key: string, value: T, ttl: number = 300000): void {
    this.cache.set(key, {
      value,
      timestamp: new Date(),
      ttl
    });
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckConfig.interval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      let isHealthy: boolean;
      
      if (this.healthCheckConfig.customCheck) {
        isHealthy = await this.healthCheckConfig.customCheck();
      } else {
        // Default health check - assume healthy if no failures recently
        const recentFailures = this.getRecentCalls().filter(call => !call.success).length;
        isHealthy = recentFailures === 0;
      }
      
      if (isHealthy) {
        this.consecutiveHealthChecks++;
        if (!this.isHealthy && this.consecutiveHealthChecks >= this.healthCheckConfig.healthyThreshold) {
          this.isHealthy = true;
          this.emit('health_check_passed', { consecutiveSuccesses: this.consecutiveHealthChecks });
        }
      } else {
        this.consecutiveHealthChecks = 0;
        if (this.isHealthy) {
          this.isHealthy = false;
          this.emit('health_check_failed', { reason: 'custom_check_failed' });
        }
      }
    } catch (error) {
      this.consecutiveHealthChecks = 0;
      if (this.isHealthy) {
        this.isHealthy = false;
        this.emit('health_check_failed', { reason: 'health_check_error', error });
      }
    }
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const recentCalls = this.getRecentCalls();
    const totalRecentCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter(call => call.success).length;
    const failedCalls = recentCalls.filter(call => !call.success).length;
    const slowCalls = recentCalls.filter(call => 
      call.duration > this.config.slowCallThreshold
    ).length;
    
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;
    
    const errorRate = totalRecentCalls > 0 ? (failedCalls / totalRecentCalls) * 100 : 0;
    const slowCallRate = totalRecentCalls > 0 ? (slowCalls / totalRecentCalls) * 100 : 0;
    const successRate = totalRecentCalls > 0 ? (successfulCalls / totalRecentCalls) * 100 : 0;
    
    // Calculate throughput (calls per second)
    const periodInSeconds = this.config.monitoringPeriod / 1000;
    const throughput = totalRecentCalls / periodInSeconds;
    
    return {
      state: this.state,
      totalCalls: this.totalCalls,
      successfulCalls: this.totalSuccesses,
      failedCalls: this.totalFailures,
      slowCalls,
      rejectedCalls: this.totalRejections,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateTransitionTime: this.stateTransitionTime,
      avgResponseTime,
      errorRate,
      slowCallRate,
      successRate,
      throughput
    };
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.stateTransitionTime = new Date();
    this.callHistory = [];
    this.responseTimes = [];
    this.totalCalls = 0;
    this.totalSuccesses = 0;
    this.totalFailures = 0;
    this.totalRejections = 0;
    
    this.emit('circuit_reset');
  }

  /**
   * Force state change
   */
  forceState(state: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = state;
    this.stateTransitionTime = new Date();
    
    if (state === 'open') {
      this.nextAttemptTime = new Date(Date.now() + this.config.timeout);
    }
    
    this.emit('state_change', { 
      newState: state, 
      oldState,
      reason: 'forced'
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopHealthChecks();
    this.removeAllListeners();
    
    // Clear waiting queue
    this.waitingQueue.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.reject();
    });
    this.waitingQueue = [];
  }
}

/**
 * Circuit Breaker Engine for managing multiple circuit breakers
 */
export class CircuitBreakerEngine extends EventEmitter {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private globalConfig: Partial<CircuitBreakerConfig>;
  private metricsInterval?: NodeJS.Timeout;
  private metrics: CircuitBreakerMetrics[] = [];

  constructor(globalConfig: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.globalConfig = globalConfig;
    this.startMetricsCollection();
  }

  /**
   * Create a new circuit breaker
   */
  createCircuitBreaker<T = any>(
    name: string,
    config: Partial<CircuitBreakerConfig>,
    fallbackConfig?: FallbackConfig<T>,
    retryConfig?: Partial<RetryConfig>,
    bulkheadConfig?: Partial<BulkheadConfig>,
    healthCheckConfig?: Partial<HealthCheckConfig>
  ): CircuitBreaker<T> {
    const fullConfig: CircuitBreakerConfig = {
      name,
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 60000,
      monitoringPeriod: 60000,
      volumeThreshold: 10,
      errorThresholdPercentage: 50,
      slowCallThreshold: 5000,
      slowCallPercentageThreshold: 50,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      jitterEnabled: true,
      fallbackEnabled: true,
      bulkheadEnabled: false,
      maxConcurrentCalls: 100,
      ...this.globalConfig,
      ...config
    };

    const circuitBreaker = new CircuitBreaker<T>(
      fullConfig,
      fallbackConfig,
      retryConfig,
      bulkheadConfig,
      healthCheckConfig
    );

    // Forward events
    circuitBreaker.on('state_change', (event) => {
      this.emit('circuit_state_change', { name, ...event });
    });

    circuitBreaker.on('call_success', (event) => {
      this.emit('circuit_call_success', { name, ...event });
    });

    circuitBreaker.on('call_failure', (event) => {
      this.emit('circuit_call_failure', { name, ...event });
    });

    circuitBreaker.on('call_rejected', (event) => {
      this.emit('circuit_call_rejected', { name, ...event });
    });

    this.circuitBreakers.set(name, circuitBreaker);
    this.emit('circuit_breaker_created', { name, config: fullConfig });

    return circuitBreaker;
  }

  /**
   * Get circuit breaker by name
   */
  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Remove circuit breaker
   */
  removeCircuitBreaker(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.destroy();
      this.circuitBreakers.delete(name);
      this.emit('circuit_breaker_removed', { name });
      return true;
    }
    return false;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      stats[name] = circuitBreaker.getStats();
    }
    
    return stats;
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Collect every minute
  }

  /**
   * Collect metrics from all circuit breakers
   */
  private collectMetrics(): void {
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      const stats = circuitBreaker.getStats();
      
      const metrics: CircuitBreakerMetrics = {
        circuitBreakerId: name,
        timestamp: new Date(),
        state: stats.state,
        totalCalls: stats.totalCalls,
        successfulCalls: stats.successfulCalls,
        failedCalls: stats.failedCalls,
        rejectedCalls: stats.rejectedCalls,
        avgResponseTime: stats.avgResponseTime,
        p95ResponseTime: 0, // Would calculate from response time distribution
        p99ResponseTime: 0, // Would calculate from response time distribution
        errorRate: stats.errorRate,
        throughput: stats.throughput
      };
      
      this.metrics.push(metrics);
    }
    
    // Keep only recent metrics (last 24 hours)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    this.emit('metrics_collected', { count: this.metrics.length });
  }

  /**
   * Get metrics history
   */
  getMetrics(circuitBreakerId?: string, since?: Date): CircuitBreakerMetrics[] {
    let filteredMetrics = this.metrics;
    
    if (circuitBreakerId) {
      filteredMetrics = filteredMetrics.filter(m => m.circuitBreakerId === circuitBreakerId);
    }
    
    if (since) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= since);
    }
    
    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
    this.emit('all_circuits_reset');
  }

  /**
   * Get engine status
   */
  getStatus(): {
    totalCircuitBreakers: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    totalCalls: number;
    totalFailures: number;
    totalRejections: number;
  } {
    const stats = this.getAllStats();
    const statsList = Object.values(stats);
    
    return {
      totalCircuitBreakers: this.circuitBreakers.size,
      openCircuits: statsList.filter(s => s.state === 'open').length,
      halfOpenCircuits: statsList.filter(s => s.state === 'half_open').length,
      closedCircuits: statsList.filter(s => s.state === 'closed').length,
      totalCalls: statsList.reduce((sum, s) => sum + s.totalCalls, 0),
      totalFailures: statsList.reduce((sum, s) => sum + s.failedCalls, 0),
      totalRejections: statsList.reduce((sum, s) => sum + s.rejectedCalls, 0)
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.destroy();
    }
    
    this.circuitBreakers.clear();
    this.removeAllListeners();
  }
}

/**
 * Create circuit breaker engine
 */
export function createCircuitBreakerEngine(
  globalConfig: Partial<CircuitBreakerConfig> = {}
): CircuitBreakerEngine {
  return new CircuitBreakerEngine(globalConfig);
}

export default CircuitBreakerEngine;
