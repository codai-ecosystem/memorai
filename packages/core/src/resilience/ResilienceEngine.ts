/**
 * @fileoverview Resilience Engineering & Chaos Engineering (Phase 1.3)
 * Auto-recovery, fault tolerance, and chaos testing implementation
 */

import { EventEmitter } from 'events';
import { AdvancedEventBus, MemoryEventType } from '../events/EventDrivenArchitecture.js';
import { MonitoringPort } from '../hexagonal/HexagonalArchitecture.js';

// Resilience Configuration
export interface ResilienceConfig {
  circuitBreaker: {
    failureThreshold: number;
    timeout: number;
    monitoringPeriod: number;
  };
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  bulkhead: {
    maxConcurrency: number;
    queueSize: number;
    timeout: number;
  };
  timeout: {
    default: number;
    operations: Record<string, number>;
  };
  healthCheck: {
    interval: number;
    timeout: number;
    unhealthyThreshold: number;
  };
  chaosEngineering: {
    enabled: boolean;
    failureRate: number;
    scenarios: ChaosScenario[];
  };
}

// Chaos Engineering Scenarios
export interface ChaosScenario {
  name: string;
  description: string;
  probability: number;
  duration: number;
  impact: 'latency' | 'error' | 'unavailable' | 'data_corruption';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    timeOfDay?: string[];
    dayOfWeek?: string[];
    environment?: string[];
  };
}

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

// Circuit Breaker Implementation
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: ResilienceConfig['circuitBreaker'];
  private monitoring: MonitoringPort;

  constructor(config: ResilienceConfig['circuitBreaker'], monitoring: MonitoringPort) {
    super();
    this.config = config;
    this.monitoring = monitoring;
  }

  async execute<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.timeout) {
        const error = new Error(`Circuit breaker is OPEN for ${operationName}`);
        await this.monitoring.recordError(error, { circuitState: this.state, operationName });
        throw error;
      } else {
        // Transition to half-open
        this.state = CircuitState.HALF_OPEN;
        this.emit('state_change', { state: this.state, operationName });
      }
    }

    try {
      const result = await operation();
      await this.onSuccess(operationName);
      return result;
    } catch (error) {
      await this.onFailure(error as Error, operationName);
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  private async onSuccess(operationName: string): Promise<void> {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // Require multiple successes
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successCount = 0;
        this.emit('state_change', { state: this.state, operationName });
        await this.monitoring.recordEvent('circuit_breaker_closed', { operationName });
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failures = Math.max(0, this.failures - 1); // Gradually recover
    }

    await this.monitoring.recordMetric('circuit_breaker.success', 1, { 
      operation: operationName,
      state: this.state 
    });
  }

  private async onFailure(error: Error, operationName: string): Promise<void> {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      this.successCount = 0;
      this.emit('state_change', { state: this.state, operationName, error });
    } else if (this.state === CircuitState.CLOSED && this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.emit('state_change', { state: this.state, operationName, error });
      await this.monitoring.recordEvent('circuit_breaker_opened', { 
        operationName, 
        failures: this.failures,
        error: error.message 
      });
    }

    await this.monitoring.recordMetric('circuit_breaker.failure', 1, { 
      operation: operationName,
      state: this.state 
    });
  }
}

// Retry with Exponential Backoff
export class RetryManager {
  private config: ResilienceConfig['retry'];
  private monitoring: MonitoringPort;

  constructor(config: ResilienceConfig['retry'], monitoring: MonitoringPort) {
    this.config = config;
    this.monitoring = monitoring;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    isRetryableError?: (error: Error) => boolean
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          await this.monitoring.recordEvent('retry_success', {
            operationName,
            attempt,
            totalAttempts: attempt + 1
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (isRetryableError && !isRetryableError(lastError)) {
          await this.monitoring.recordEvent('retry_skipped_non_retryable', {
            operationName,
            error: lastError.message,
            attempt
          });
          throw lastError;
        }

        if (attempt === this.config.maxRetries) {
          await this.monitoring.recordEvent('retry_exhausted', {
            operationName,
            totalAttempts: attempt + 1,
            finalError: lastError.message
          });
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        );

        await this.monitoring.recordEvent('retry_attempt', {
          operationName,
          attempt: attempt + 1,
          delay,
          error: lastError.message
        });

        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Bulkhead Pattern - Isolate Resources
export class BulkheadManager {
  private semaphores: Map<string, Semaphore> = new Map();
  private config: ResilienceConfig['bulkhead'];
  private monitoring: MonitoringPort;

  constructor(config: ResilienceConfig['bulkhead'], monitoring: MonitoringPort) {
    this.config = config;
    this.monitoring = monitoring;
  }

  async execute<T>(
    operation: () => Promise<T>,
    resourceType: string,
    operationName: string
  ): Promise<T> {
    const semaphore = this.getSemaphore(resourceType);
    
    const startTime = Date.now();
    const acquired = await semaphore.acquire(this.config.timeout);
    
    if (!acquired) {
      const error = new Error(`Bulkhead timeout for ${resourceType}:${operationName}`);
      await this.monitoring.recordError(error, { resourceType, operationName });
      throw error;
    }

    const waitTime = Date.now() - startTime;
    await this.monitoring.recordMetric('bulkhead.wait_time', waitTime, {
      resourceType,
      operation: operationName
    });

    try {
      const result = await operation();
      await this.monitoring.recordMetric('bulkhead.success', 1, {
        resourceType,
        operation: operationName
      });
      return result;
    } catch (error) {
      await this.monitoring.recordMetric('bulkhead.failure', 1, {
        resourceType,
        operation: operationName
      });
      throw error;
    } finally {
      semaphore.release();
    }
  }

  getBulkheadMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    for (const [resourceType, semaphore] of this.semaphores) {
      metrics[resourceType] = {
        available: semaphore.available(),
        total: semaphore.total(),
        waiting: semaphore.waiting()
      };
    }
    
    return metrics;
  }

  private getSemaphore(resourceType: string): Semaphore {
    if (!this.semaphores.has(resourceType)) {
      this.semaphores.set(resourceType, new Semaphore(this.config.maxConcurrency));
    }
    return this.semaphores.get(resourceType)!;
  }
}

// Semaphore Implementation
class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  private waitQueue: Array<{ resolve: () => void; timeout: NodeJS.Timeout }> = [];

  constructor(permits: number) {
    this.permits = permits;
    this.maxPermits = permits;
  }

  async acquire(timeoutMs?: number): Promise<boolean> {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }

    return new Promise((resolve) => {
      const timeoutHandle = timeoutMs ? setTimeout(() => {
        const index = this.waitQueue.findIndex(item => item.resolve === resolve);
        if (index >= 0) {
          this.waitQueue.splice(index, 1);
          resolve(false);
        }
      }, timeoutMs) : null;

      this.waitQueue.push({
        resolve: () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          resolve(true);
        },
        timeout: timeoutHandle!
      });
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const waiter = this.waitQueue.shift()!;
      waiter.resolve();
    } else {
      this.permits++;
    }
  }

  available(): number {
    return this.permits;
  }

  total(): number {
    return this.maxPermits;
  }

  waiting(): number {
    return this.waitQueue.length;
  }
}

// Health Check Manager
export class HealthCheckManager extends EventEmitter {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private config: ResilienceConfig['healthCheck'];
  private monitoring: MonitoringPort;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: ResilienceConfig['healthCheck'], monitoring: MonitoringPort) {
    super();
    this.config = config;
    this.monitoring = monitoring;
    this.startHealthChecking();
  }

  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthChecks.set(name, check);
  }

  async runHealthChecks(): Promise<HealthStatus> {
    const results: Record<string, boolean> = {};
    const details: Record<string, any> = {};
    let overallHealthy = true;

    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          healthCheck.check(),
          this.timeoutPromise(this.config.timeout)
        ]);
        
        const duration = Date.now() - startTime;
        results[name] = result.healthy;
        details[name] = { ...result, duration };
        
        if (!result.healthy) {
          overallHealthy = false;
        }

        await this.monitoring.recordMetric('health_check.duration', duration, { check: name });
        await this.monitoring.recordMetric('health_check.status', result.healthy ? 1 : 0, { check: name });

      } catch (error) {
        results[name] = false;
        details[name] = { healthy: false, error: (error as Error).message };
        overallHealthy = false;

        await this.monitoring.recordError(error as Error, { healthCheck: name });
      }
    }

    const status: HealthStatus = {
      healthy: overallHealthy,
      checks: results,
      details,
      timestamp: new Date()
    };

    this.emit('health_check_completed', status);
    return status;
  }

  private async timeoutPromise(timeoutMs: number): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), timeoutMs);
    });
  }

  private startHealthChecking(): void {
    this.checkInterval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        await this.monitoring.recordError(error as Error, { operation: 'health_check_interval' });
      }
    }, this.config.interval);
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Chaos Engineering Engine
export class ChaosEngineeringEngine extends EventEmitter {
  private config: ResilienceConfig['chaosEngineering'];
  private monitoring: MonitoringPort;
  private activeScenarios: Map<string, ChaosScenarioExecution> = new Map();

  constructor(config: ResilienceConfig['chaosEngineering'], monitoring: MonitoringPort) {
    super();
    this.config = config;
    this.monitoring = monitoring;
  }

  async injectChaos<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    // Check if chaos should be injected
    const scenario = this.selectChaosScenario(operationName);
    if (scenario) {
      return this.executeWithChaos(operation, scenario, operationName);
    }

    return operation();
  }

  startChaosScenario(scenarioName: string): void {
    const scenario = this.config.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`Chaos scenario not found: ${scenarioName}`);
    }

    const execution: ChaosScenarioExecution = {
      scenario,
      startTime: Date.now(),
      endTime: Date.now() + scenario.duration
    };

    this.activeScenarios.set(scenarioName, execution);
    this.emit('chaos_scenario_started', { scenario, execution });
    
    // Auto-stop after duration
    setTimeout(() => {
      this.stopChaosScenario(scenarioName);
    }, scenario.duration);
  }

  stopChaosScenario(scenarioName: string): void {
    const execution = this.activeScenarios.get(scenarioName);
    if (execution) {
      this.activeScenarios.delete(scenarioName);
      this.emit('chaos_scenario_stopped', { scenario: execution.scenario, execution });
    }
  }

  getActiveChaosScenarios(): ChaosScenarioExecution[] {
    return Array.from(this.activeScenarios.values());
  }

  private selectChaosScenario(operationName: string): ChaosScenario | null {
    if (Math.random() > this.config.failureRate) {
      return null;
    }

    // Filter scenarios by conditions
    const applicableScenarios = this.config.scenarios.filter(scenario => 
      this.isScenarioApplicable(scenario, operationName)
    );

    if (applicableScenarios.length === 0) {
      return null;
    }

    // Weighted random selection
    const totalProbability = applicableScenarios.reduce((sum, s) => sum + s.probability, 0);
    let random = Math.random() * totalProbability;

    for (const scenario of applicableScenarios) {
      random -= scenario.probability;
      if (random <= 0) {
        return scenario;
      }
    }

    return null;
  }

  private isScenarioApplicable(scenario: ChaosScenario, operationName: string): boolean {
    const now = new Date();
    
    // Check time conditions
    if (scenario.conditions.timeOfDay) {
      const hour = now.getHours();
      const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      if (!scenario.conditions.timeOfDay.includes(timeOfDay)) {
        return false;
      }
    }

    if (scenario.conditions.dayOfWeek) {
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      if (!scenario.conditions.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  private async executeWithChaos<T>(
    operation: () => Promise<T>,
    scenario: ChaosScenario,
    operationName: string
  ): Promise<T> {
    await this.monitoring.recordEvent('chaos_injection', {
      scenario: scenario.name,
      impact: scenario.impact,
      severity: scenario.severity,
      operationName
    });

    switch (scenario.impact) {
      case 'latency':
        await this.injectLatency(scenario.severity);
        break;
      case 'error':
        if (Math.random() < 0.5) { // 50% chance to actually throw error
          throw new Error(`Chaos Engineering: ${scenario.description}`);
        }
        break;
      case 'unavailable':
        throw new Error(`Service unavailable due to chaos engineering: ${scenario.description}`);
      case 'data_corruption':
        // In a real implementation, this might corrupt response data
        break;
    }

    return operation();
  }

  private async injectLatency(severity: string): Promise<void> {
    const delays = {
      low: 100,
      medium: 500,
      high: 2000,
      critical: 5000
    };

    const delay = delays[severity as keyof typeof delays] || 100;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Resilience Manager - Orchestrates all resilience patterns
export class ResilienceManager extends EventEmitter {
  private config: ResilienceConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryManager: RetryManager;
  private bulkheadManager: BulkheadManager;
  private healthCheckManager: HealthCheckManager;
  private chaosEngine: ChaosEngineeringEngine;
  private monitoring: MonitoringPort;
  private eventBus: AdvancedEventBus;

  constructor(
    config: ResilienceConfig,
    monitoring: MonitoringPort,
    eventBus: AdvancedEventBus
  ) {
    super();
    this.config = config;
    this.monitoring = monitoring;
    this.eventBus = eventBus;
    
    this.retryManager = new RetryManager(config.retry, monitoring);
    this.bulkheadManager = new BulkheadManager(config.bulkhead, monitoring);
    this.healthCheckManager = new HealthCheckManager(config.healthCheck, monitoring);
    this.chaosEngine = new ChaosEngineeringEngine(config.chaosEngineering, monitoring);
    
    this.setupEventListeners();
  }

  // Execute operation with full resilience patterns
  async executeResilient<T>(
    operation: () => Promise<T>,
    options: {
      operationName: string;
      resourceType?: string;
      circuitBreaker?: boolean;
      retry?: boolean;
      bulkhead?: boolean;
      chaos?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    const {
      operationName,
      resourceType = 'default',
      circuitBreaker = true,
      retry = true,
      bulkhead = true,
      chaos = true,
      timeout = this.config.timeout.default
    } = options;

    let wrappedOperation = operation;

    // Apply chaos engineering
    if (chaos) {
      wrappedOperation = () => this.chaosEngine.injectChaos(operation, operationName);
    }

    // Apply timeout
    if (timeout > 0) {
      const originalOperation = wrappedOperation;
      wrappedOperation = () => Promise.race([
        originalOperation(),
        this.timeoutPromise<T>(timeout, operationName)
      ]);
    }

    // Apply bulkhead
    if (bulkhead) {
      const bulkheadOperation = wrappedOperation;
      wrappedOperation = () => this.bulkheadManager.execute(
        bulkheadOperation,
        resourceType,
        operationName
      );
    }

    // Apply circuit breaker
    if (circuitBreaker) {
      const circuitOperation = wrappedOperation;
      const circuitBreaker = this.getCircuitBreaker(operationName);
      wrappedOperation = () => circuitBreaker.execute(circuitOperation, operationName);
    }

    // Apply retry
    if (retry) {
      return this.retryManager.executeWithRetry(
        wrappedOperation,
        operationName,
        this.isRetryableError
      );
    }

    return wrappedOperation();
  }

  // Register health check
  registerHealthCheck(name: string, check: HealthCheck): void {
    this.healthCheckManager.registerHealthCheck(name, check);
  }

  // Get comprehensive resilience metrics
  getResilienceMetrics(): ResilienceMetrics {
    const circuitBreakerMetrics: Record<string, any> = {};
    for (const [name, cb] of this.circuitBreakers) {
      circuitBreakerMetrics[name] = cb.getMetrics();
    }

    return {
      circuitBreakers: circuitBreakerMetrics,
      bulkheads: this.bulkheadManager.getBulkheadMetrics(),
      chaosScenarios: this.chaosEngine.getActiveChaosScenarios(),
      lastHealthCheck: null // Would store last health check result
    };
  }

  // Manual chaos scenario control
  startChaosScenario(scenarioName: string): void {
    this.chaosEngine.startChaosScenario(scenarioName);
  }

  stopChaosScenario(scenarioName: string): void {
    this.chaosEngine.stopChaosScenario(scenarioName);
  }

  private getCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      const cb = new CircuitBreaker(this.config.circuitBreaker, this.monitoring);
      this.circuitBreakers.set(operationName, cb);
      
      cb.on('state_change', (data) => {
        this.emit('circuit_breaker_state_change', { operationName, ...data });
      });
    }
    
    return this.circuitBreakers.get(operationName)!;
  }

  private async timeoutPromise<T>(timeoutMs: number, operationName: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timeout: ${operationName} (${timeoutMs}ms)`);
        this.monitoring.recordError(error, { operationName, timeout: timeoutMs });
        reject(error);
      }, timeoutMs);
    }) as Promise<T>;
  }

  private isRetryableError(error: Error): boolean {
    // Define which errors are retryable
    const retryablePatterns = [
      /timeout/i,
      /connection/i,
      /network/i,
      /temporary/i,
      /unavailable/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  private setupEventListeners(): void {
    this.healthCheckManager.on('health_check_completed', (status) => {
      this.emit('health_status_change', status);
      
      if (!status.healthy) {
        this.monitoring.createAlert(
          'system_unhealthy',
          `System health check failed: ${Object.keys(status.checks).filter(k => !status.checks[k]).join(', ')}`
        );
      }
    });

    this.chaosEngine.on('chaos_scenario_started', (data) => {
      this.emit('chaos_scenario_active', data);
    });
  }

  destroy(): void {
    this.healthCheckManager.destroy();
  }
}

// Supporting interfaces
interface HealthCheck {
  check(): Promise<HealthCheckResult>;
}

interface HealthCheckResult {
  healthy: boolean;
  details?: any;
  error?: string;
}

interface HealthStatus {
  healthy: boolean;
  checks: Record<string, boolean>;
  details: Record<string, any>;
  timestamp: Date;
}

interface ChaosScenarioExecution {
  scenario: ChaosScenario;
  startTime: number;
  endTime: number;
}

interface ResilienceMetrics {
  circuitBreakers: Record<string, any>;
  bulkheads: Record<string, any>;
  chaosScenarios: ChaosScenarioExecution[];
  lastHealthCheck: HealthStatus | null;
}

export default ResilienceManager;
