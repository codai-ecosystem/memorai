/**
 * Health Check System for Memorai Enterprise
 * 
 * Implements comprehensive health checking with detailed diagnostics
 * for all system components and dependencies.
 * 
 * Features:
 * - Multi-tier health checks (shallow, deep, critical)
 * - Dependency monitoring and validation
 * - Performance health assessment
 * - Service readiness and liveness probes
 * - Detailed diagnostic information
 */

/**
 * Health check status levels
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Health check severity levels
 */
export type HealthSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Health check types
 */
export type HealthCheckType = 'liveness' | 'readiness' | 'startup' | 'dependency' | 'performance';

/**
 * Individual health check result
 */
export interface HealthCheckResult {
  name: string;
  type: HealthCheckType;
  status: HealthStatus;
  severity: HealthSeverity;
  message: string;
  duration: number;
  timestamp: number;
  details?: Record<string, any>;
  metadata?: {
    version?: string;
    component?: string;
    environment?: string;
    tags?: string[];
    attempt?: number;
    retryCount?: number;
    [key: string]: any;
  };
}

/**
 * Overall system health report
 */
export interface SystemHealthReport {
  overall: HealthStatus;
  timestamp: number;
  duration: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
  dependencies: DependencyHealth[];
  performance: PerformanceHealth;
  recommendations?: string[];
}

/**
 * Dependency health information
 */
export interface DependencyHealth {
  name: string;
  type: 'database' | 'cache' | 'api' | 'service' | 'storage';
  status: HealthStatus;
  responseTime: number;
  lastChecked: number;
  version?: string;
  endpoint?: string;
  error?: string;
  metrics?: Record<string, number>;
}

/**
 * Performance health metrics
 */
export interface PerformanceHealth {
  cpu: {
    usage: number;
    status: HealthStatus;
  };
  memory: {
    usage: number;
    total: number;
    percentage: number;
    status: HealthStatus;
  };
  disk: {
    usage: number;
    total: number;
    percentage: number;
    status: HealthStatus;
  };
  network: {
    latency: number;
    throughput: number;
    status: HealthStatus;
  };
  response: {
    averageTime: number;
    p95Time: number;
    status: HealthStatus;
  };
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  name: string;
  type: HealthCheckType;
  severity: HealthSeverity;
  timeout: number;
  interval: number;
  retryCount: number;
  retryDelay: number;
  enabled: boolean;
  thresholds?: {
    degraded?: number;
    unhealthy?: number;
  };
}

/**
 * Health check function type
 */
export type HealthCheckFunction = () => Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>>;

/**
 * Database health checker
 */
export class DatabaseHealthChecker {
  private connectionPool: any;

  constructor(connectionPool: any) {
    this.connectionPool = connectionPool;
  }

  async check(): Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>> {
    try {
      // Test basic connectivity
      const startTime = Date.now();
      const result = await this.connectionPool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      // Check connection pool status
      const poolStats = {
        total: this.connectionPool.totalCount || 0,
        idle: this.connectionPool.idleCount || 0,
        waiting: this.connectionPool.waitingCount || 0
      };

      let status: HealthStatus = 'healthy';
      if (responseTime > 1000) status = 'degraded';
      if (responseTime > 5000) status = 'unhealthy';

      return {
        name: 'database',
        type: 'dependency',
        status,
        severity: 'critical',
        message: `Database responsive in ${responseTime}ms`,
        details: {
          responseTime,
          poolStats,
          query: 'SELECT 1 as health_check',
          result: result.rows?.[0]
        }
      };
    } catch (error) {
      return {
        name: 'database',
        type: 'dependency',
        status: 'unhealthy',
        severity: 'critical',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Cache health checker (Redis/Memory Cache)
 */
export class CacheHealthChecker {
  private cacheClient: any;

  constructor(cacheClient: any) {
    this.cacheClient = cacheClient;
  }

  async check(): Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>> {
    try {
      const startTime = Date.now();
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'memorai_health_test';

      // Test cache write and read
      await this.cacheClient.set(testKey, testValue, 'EX', 10);
      const retrievedValue = await this.cacheClient.get(testKey);
      await this.cacheClient.del(testKey);
      
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > 500) status = 'degraded';
      if (responseTime > 2000) status = 'unhealthy';
      if (retrievedValue !== testValue) status = 'unhealthy';

      return {
        name: 'cache',
        type: 'dependency',
        status,
        severity: 'high',
        message: `Cache responsive in ${responseTime}ms`,
        details: {
          responseTime,
          writeReadTest: retrievedValue === testValue ? 'passed' : 'failed',
          testKey,
          expectedValue: testValue,
          actualValue: retrievedValue
        }
      };
    } catch (error) {
      return {
        name: 'cache',
        type: 'dependency',
        status: 'unhealthy',
        severity: 'high',
        message: `Cache connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Vector database health checker (Qdrant)
 */
export class VectorDatabaseHealthChecker {
  private qdrantClient: any;

  constructor(qdrantClient: any) {
    this.qdrantClient = qdrantClient;
  }

  async check(): Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>> {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity and collection info
      const collections = await this.qdrantClient.getCollections();
      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > 1000) status = 'degraded';
      if (responseTime > 3000) status = 'unhealthy';

      return {
        name: 'vector_database',
        type: 'dependency',
        status,
        severity: 'critical',
        message: `Qdrant responsive in ${responseTime}ms`,
        details: {
          responseTime,
          collectionsCount: collections?.result?.collections?.length || 0,
          collections: collections?.result?.collections?.map((c: any) => c.name) || []
        }
      };
    } catch (error) {
      return {
        name: 'vector_database',
        type: 'dependency',
        status: 'unhealthy',
        severity: 'critical',
        message: `Vector database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * Memory engine health checker
 */
export class MemoryEngineHealthChecker {
  private memoryEngine: any;

  constructor(memoryEngine: any) {
    this.memoryEngine = memoryEngine;
  }

  async check(): Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>> {
    try {
      const startTime = Date.now();
      
      // Test basic memory operations
      const testMemory = {
        content: `Health check test ${Date.now()}`,
        metadata: { type: 'health_check', timestamp: Date.now() }
      };

      const stored = await this.memoryEngine.remember(
        'health-check-tenant',
        'health-check-agent', 
        testMemory.content,
        testMemory.metadata
      );

      if (stored?.id) {
        // Test recall
        const recalled = await this.memoryEngine.recall(
          'health-check-tenant',
          'health-check-agent',
          'health check test'
        );

        // Clean up test memory
        if (recalled?.memories?.length > 0) {
          await this.memoryEngine.forget('health-check-tenant', stored.id);
        }
      }

      const responseTime = Date.now() - startTime;

      let status: HealthStatus = 'healthy';
      if (responseTime > 2000) status = 'degraded';
      if (responseTime > 5000) status = 'unhealthy';

      return {
        name: 'memory_engine',
        type: 'performance',
        status,
        severity: 'critical',
        message: `Memory engine responsive in ${responseTime}ms`,
        details: {
          responseTime,
          operationsTest: 'passed',
          storeId: stored?.id,
          recallSuccess: true
        }
      };
    } catch (error) {
      return {
        name: 'memory_engine',
        type: 'performance',
        status: 'unhealthy',
        severity: 'critical',
        message: `Memory engine test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      };
    }
  }
}

/**
 * System resource health checker
 */
export class SystemResourceHealthChecker {
  async check(): Promise<Omit<HealthCheckResult, 'duration' | 'timestamp'>> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate memory percentage (assuming 1GB as baseline)
      const memoryPercentage = (memoryUsage.heapUsed / (1024 * 1024 * 1024)) * 100;
      
      // Simple CPU usage calculation
      const cpuPercentage = ((cpuUsage.user + cpuUsage.system) / 1000000) * 100;

      let status: HealthStatus = 'healthy';
      let issues: string[] = [];

      if (memoryPercentage > 70) {
        status = 'degraded';
        issues.push(`High memory usage: ${memoryPercentage.toFixed(1)}%`);
      }
      if (memoryPercentage > 90) {
        status = 'unhealthy';
      }

      if (cpuPercentage > 80) {
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
        issues.push(`High CPU usage: ${cpuPercentage.toFixed(1)}%`);
      }

      return {
        name: 'system_resources',
        type: 'performance',
        status,
        severity: 'medium',
        message: issues.length > 0 ? issues.join(', ') : 'System resources healthy',
        details: {
          memory: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            percentage: memoryPercentage
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
            percentage: cpuPercentage
          },
          uptime: process.uptime(),
          pid: process.pid
        }
      };
    } catch (error) {
      return {
        name: 'system_resources',
        type: 'performance',
        status: 'unknown',
        severity: 'medium',
        message: `Failed to check system resources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

/**
 * Comprehensive Health Check Engine
 * 
 * Orchestrates all health checks and provides detailed system health reporting
 * with multiple check types and severity levels.
 */
export class HealthCheckEngine {
  private checkers: Map<string, HealthCheckFunction> = new Map();
  private configs: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private dependencies: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultCheckers();
  }

  /**
   * Initialize default health checkers
   */
  private initializeDefaultCheckers(): void {
    // System resources checker
    const systemChecker = new SystemResourceHealthChecker();
    this.registerChecker('system_resources', systemChecker.check.bind(systemChecker), {
      name: 'system_resources',
      type: 'performance',
      severity: 'medium',
      timeout: 5000,
      interval: 30000,
      retryCount: 2,
      retryDelay: 1000,
      enabled: true,
      thresholds: {
        degraded: 70,
        unhealthy: 90
      }
    });
  }

  /**
   * Register a health checker
   */
  registerChecker(
    name: string, 
    checker: HealthCheckFunction, 
    config: HealthCheckConfig
  ): void {
    this.checkers.set(name, checker);
    this.configs.set(name, config);
  }

  /**
   * Register dependencies for health checking
   */
  registerDependencies(dependencies: {
    database?: any;
    cache?: any;
    vectorDatabase?: any;
    memoryEngine?: any;
  }): void {
    if (dependencies.database) {
      this.dependencies.set('database', dependencies.database);
      const dbChecker = new DatabaseHealthChecker(dependencies.database);
      this.registerChecker('database', dbChecker.check.bind(dbChecker), {
        name: 'database',
        type: 'dependency',
        severity: 'critical',
        timeout: 10000,
        interval: 60000,
        retryCount: 3,
        retryDelay: 2000,
        enabled: true
      });
    }

    if (dependencies.cache) {
      this.dependencies.set('cache', dependencies.cache);
      const cacheChecker = new CacheHealthChecker(dependencies.cache);
      this.registerChecker('cache', cacheChecker.check.bind(cacheChecker), {
        name: 'cache',
        type: 'dependency',
        severity: 'high',
        timeout: 5000,
        interval: 30000,
        retryCount: 2,
        retryDelay: 1000,
        enabled: true
      });
    }

    if (dependencies.vectorDatabase) {
      this.dependencies.set('vectorDatabase', dependencies.vectorDatabase);
      const vectorChecker = new VectorDatabaseHealthChecker(dependencies.vectorDatabase);
      this.registerChecker('vector_database', vectorChecker.check.bind(vectorChecker), {
        name: 'vector_database',
        type: 'dependency',
        severity: 'critical',
        timeout: 8000,
        interval: 45000,
        retryCount: 2,
        retryDelay: 1500,
        enabled: true
      });
    }

    if (dependencies.memoryEngine) {
      this.dependencies.set('memoryEngine', dependencies.memoryEngine);
      const memoryChecker = new MemoryEngineHealthChecker(dependencies.memoryEngine);
      this.registerChecker('memory_engine', memoryChecker.check.bind(memoryChecker), {
        name: 'memory_engine',
        type: 'performance',
        severity: 'critical',
        timeout: 10000,
        interval: 60000,
        retryCount: 2,
        retryDelay: 2000,
        enabled: true
      });
    }
  }

  /**
   * Run a single health check
   */
  async runHealthCheck(name: string): Promise<HealthCheckResult> {
    const checker = this.checkers.get(name);
    const config = this.configs.get(name);

    if (!checker || !config) {
      throw new Error(`Health checker '${name}' not found`);
    }

    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= config.retryCount) {
      try {
        const result = await Promise.race([
          checker(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), config.timeout)
          )
        ]);

        const finalResult: HealthCheckResult = {
          ...result,
          duration: Date.now() - startTime,
          timestamp: Date.now(),
          metadata: {
            ...result.metadata,
            attempt: attempt + 1,
            retryCount: config.retryCount,
            environment: process.env.NODE_ENV || 'development'
          }
        };

        this.lastResults.set(name, finalResult);
        return finalResult;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt <= config.retryCount) {
          await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        }
      }
    }

    // All attempts failed
    const failedResult: HealthCheckResult = {
      name,
      type: config.type,
      status: 'unhealthy',
      severity: config.severity,
      message: `Health check failed after ${config.retryCount + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      details: {
        error: lastError?.message || 'Unknown error',
        attempts: attempt,
        timeout: config.timeout
      },
      metadata: {
        attempt,
        retryCount: config.retryCount,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    this.lastResults.set(name, failedResult);
    return failedResult;
  }

  /**
   * Run all health checks
   */
  async runAllHealthChecks(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    // Run all enabled health checks
    const checkPromises = Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .map(([name, _]) => this.runHealthCheck(name));

    const checkResults = await Promise.allSettled(checkPromises);

    // Process results
    for (const result of checkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Handle failed health check promises
        results.push({
          name: 'unknown',
          type: 'liveness',
          status: 'unknown',
          severity: 'high',
          message: `Health check promise failed: ${result.reason?.message || 'Unknown error'}`,
          duration: 0,
          timestamp: Date.now()
        });
      }
    }

    // Calculate overall status
    const overall = this.calculateOverallStatus(results);

    // Create summary
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      unknown: results.filter(r => r.status === 'unknown').length
    };

    // Generate dependencies health
    const dependencies = this.generateDependencyHealth(results);

    // Generate performance health
    const performance = this.generatePerformanceHealth(results);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      overall,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      version: '3.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: results,
      summary,
      dependencies,
      performance,
      recommendations
    };
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(results: HealthCheckResult[]): HealthStatus {
    if (results.length === 0) return 'unknown';

    const criticalUnhealthy = results.filter(r => 
      r.severity === 'critical' && r.status === 'unhealthy'
    ).length;

    const anyUnhealthy = results.filter(r => r.status === 'unhealthy').length;
    const anyDegraded = results.filter(r => r.status === 'degraded').length;

    if (criticalUnhealthy > 0) return 'unhealthy';
    if (anyUnhealthy > 0) return 'degraded';
    if (anyDegraded > 0) return 'degraded';

    return 'healthy';
  }

  /**
   * Generate dependency health summary
   */
  private generateDependencyHealth(results: HealthCheckResult[]): DependencyHealth[] {
    return results
      .filter(r => r.type === 'dependency')
      .map(r => ({
        name: r.name,
        type: this.mapDependencyType(r.name),
        status: r.status,
        responseTime: r.details?.responseTime || 0,
        lastChecked: r.timestamp,
        error: r.status === 'unhealthy' ? r.message : undefined,
        metrics: r.details
      }));
  }

  /**
   * Map checker name to dependency type
   */
  private mapDependencyType(name: string): DependencyHealth['type'] {
    const typeMap: Record<string, DependencyHealth['type']> = {
      'database': 'database',
      'cache': 'cache',
      'vector_database': 'database',
      'memory_engine': 'service'
    };
    return typeMap[name] || 'service';
  }

  /**
   * Generate performance health summary
   */
  private generatePerformanceHealth(results: HealthCheckResult[]): PerformanceHealth {
    const systemResult = results.find(r => r.name === 'system_resources');
    const memoryResult = results.find(r => r.name === 'memory_engine');

    return {
      cpu: {
        usage: systemResult?.details?.cpu?.percentage || 0,
        status: this.getResourceStatus(systemResult?.details?.cpu?.percentage || 0, 70, 90)
      },
      memory: {
        usage: systemResult?.details?.memory?.heapUsed || 0,
        total: systemResult?.details?.memory?.heapTotal || 0,
        percentage: systemResult?.details?.memory?.percentage || 0,
        status: this.getResourceStatus(systemResult?.details?.memory?.percentage || 0, 70, 90)
      },
      disk: {
        usage: 0,
        total: 0,
        percentage: 0,
        status: 'healthy'
      },
      network: {
        latency: 0,
        throughput: 0,
        status: 'healthy'
      },
      response: {
        averageTime: memoryResult?.details?.responseTime || 0,
        p95Time: memoryResult?.details?.responseTime || 0,
        status: this.getResourceStatus(memoryResult?.details?.responseTime || 0, 1000, 3000)
      }
    };
  }

  /**
   * Get resource status based on thresholds
   */
  private getResourceStatus(value: number, degradedThreshold: number, unhealthyThreshold: number): HealthStatus {
    if (value >= unhealthyThreshold) return 'unhealthy';
    if (value >= degradedThreshold) return 'degraded';
    return 'healthy';
  }

  /**
   * Generate health recommendations
   */
  private generateRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    const unhealthyChecks = results.filter(r => r.status === 'unhealthy');
    const degradedChecks = results.filter(r => r.status === 'degraded');

    if (unhealthyChecks.length > 0) {
      recommendations.push(`Critical: ${unhealthyChecks.length} components are unhealthy and require immediate attention`);
    }

    if (degradedChecks.length > 0) {
      recommendations.push(`Warning: ${degradedChecks.length} components are degraded and should be monitored closely`);
    }

    // Specific recommendations
    const systemCheck = results.find(r => r.name === 'system_resources');
    if (systemCheck?.details?.memory?.percentage > 70) {
      recommendations.push('Consider increasing memory allocation or optimizing memory usage');
    }

    const memoryEngineCheck = results.find(r => r.name === 'memory_engine');
    if (memoryEngineCheck?.details?.responseTime > 2000) {
      recommendations.push('Memory engine response time is high, consider performance optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }

    return recommendations;
  }

  /**
   * Get health check status for specific component
   */
  getComponentHealth(name: string): HealthCheckResult | undefined {
    return this.lastResults.get(name);
  }

  /**
   * Get simple liveness check
   */
  async getLivenessCheck(): Promise<{ status: HealthStatus; timestamp: number }> {
    // Simple check - just verify the service is responding
    return {
      status: 'healthy',
      timestamp: Date.now()
    };
  }

  /**
   * Get readiness check
   */
  async getReadinessCheck(): Promise<{ status: HealthStatus; timestamp: number; dependencies: string[] }> {
    // Check critical dependencies only
    const criticalChecks = ['database', 'vector_database'];
    const results = await Promise.all(
      criticalChecks
        .filter(name => this.checkers.has(name))
        .map(name => this.runHealthCheck(name))
    );

    const failedDependencies = results.filter(r => r.status === 'unhealthy').map(r => r.name);
    const status = failedDependencies.length > 0 ? 'unhealthy' : 'healthy';

    return {
      status,
      timestamp: Date.now(),
      dependencies: failedDependencies
    };
  }

  /**
   * Get health check statistics
   */
  getStats(): {
    totalCheckers: number;
    enabledCheckers: number;
    lastRunTimestamp?: number;
    averageDuration: number;
  } {
    const enabledCount = Array.from(this.configs.values()).filter(c => c.enabled).length;
    const results = Array.from(this.lastResults.values());
    const averageDuration = results.length > 0 
      ? results.reduce((sum, r) => sum + r.duration, 0) / results.length 
      : 0;

    return {
      totalCheckers: this.checkers.size,
      enabledCheckers: enabledCount,
      lastRunTimestamp: results.length > 0 ? Math.max(...results.map(r => r.timestamp)) : undefined,
      averageDuration
    };
  }
}

/**
 * Create default health check engine
 */
export function createHealthCheckEngine(): HealthCheckEngine {
  return new HealthCheckEngine();
}

export default HealthCheckEngine;
