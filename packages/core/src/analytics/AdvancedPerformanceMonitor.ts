/**
 * Advanced Performance Monitor
 *
 * Enterprise-grade performance monitoring for Memorai memory operations.
 * Provides real-time metrics, historical analysis, and optimization insights.
 */

import { EventEmitter } from 'events';

export interface PerformanceMetric {
  timestamp: Date;
  operationType: 'remember' | 'recall' | 'forget' | 'context' | 'search';
  duration: number;
  success: boolean;
  memoryCount: number;
  tenantId: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface MemoryUsageStats {
  totalMemories: number;
  memoriesPerTenant: Record<string, number>;
  memoriesPerAgent: Record<string, number>;
  memoriesPerType: Record<string, number>;
  averageAccessTime: number;
  cacheHitRatio: number;
  vectorSearchLatency: number;
  embeddingProcessingTime: number;
}

export interface SystemHealthMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  database: {
    connections: number;
    queryLatency: number;
    errorRate: number;
  };
  vector: {
    collections: number;
    totalVectors: number;
    indexingLatency: number;
    searchLatency: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  metrics: Record<string, number>;
  threshold: number;
  actualValue: number;
  acknowledged: boolean;
}

export interface AnalyticsConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  sampling: {
    enabled: boolean;
    rate: number;
  };
  realTimeUpdates: boolean;
  aggregationIntervals: number[];
}

/**
 * Advanced Performance Monitor
 *
 * Comprehensive monitoring system for memory operations and system health.
 */
export class AdvancedPerformanceMonitor extends EventEmitter {
  private config: AnalyticsConfig;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private healthStats: SystemHealthMetrics | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private metricsCount = 0;
  private lastCleanup = Date.now();

  constructor(config: AnalyticsConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the performance monitoring system
   */
  public start(): void {
    // Start periodic health checks and cleanup
    this.intervalId = setInterval(() => {
      this.updateSystemHealth();
      this.checkAlertThresholds();
      this.cleanupOldMetrics();
    }, 10000); // Every 10 seconds

    console.log('[PerformanceMonitor] Started with real-time monitoring');
  }

  /**
   * Stop the performance monitoring system
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[PerformanceMonitor] Stopped');
  }

  /**
   * Record a performance metric
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    // Apply sampling if enabled
    if (this.config.sampling.enabled) {
      if (Math.random() > this.config.sampling.rate) {
        return; // Skip this metric due to sampling
      }
    }

    this.metrics.push(fullMetric);
    this.metricsCount++;

    // Emit real-time event
    if (this.config.realTimeUpdates) {
      this.emit('metric', fullMetric);
    }

    // Check for immediate alerts
    this.checkMetricAlerts(fullMetric);
  }

  /**
   * Get performance statistics for a time range
   */
  public getPerformanceStats(
    startTime: Date,
    endTime: Date,
    operationType?: string
  ): {
    totalOperations: number;
    averageResponseTime: number;
    successRate: number;
    operationsPerSecond: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  } {
    const relevantMetrics = this.metrics.filter(
      m =>
        m.timestamp >= startTime &&
        m.timestamp <= endTime &&
        (!operationType || m.operationType === operationType)
    );

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageResponseTime: 0,
        successRate: 0,
        operationsPerSecond: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      };
    }

    const durations = relevantMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const successCount = relevantMetrics.filter(m => m.success).length;
    const timeRangeSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    return {
      totalOperations: relevantMetrics.length,
      averageResponseTime:
        durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: successCount / relevantMetrics.length,
      operationsPerSecond: relevantMetrics.length / timeRangeSeconds,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
    };
  }

  /**
   * Get memory usage analytics
   */
  public getMemoryAnalytics(): MemoryUsageStats {
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes

    const memoriesPerTenant: Record<string, number> = {};
    const memoriesPerAgent: Record<string, number> = {};
    const memoriesPerType: Record<string, number> = {};
    let totalDuration = 0;

    recentMetrics.forEach(metric => {
      memoriesPerTenant[metric.tenantId] =
        (memoriesPerTenant[metric.tenantId] || 0) + metric.memoryCount;

      if (metric.agentId) {
        memoriesPerAgent[metric.agentId] =
          (memoriesPerAgent[metric.agentId] || 0) + metric.memoryCount;
      }

      memoriesPerType[metric.operationType] =
        (memoriesPerType[metric.operationType] || 0) + metric.memoryCount;
      totalDuration += metric.duration;
    });

    const totalMemories = Object.values(memoriesPerTenant).reduce(
      (a, b) => a + b,
      0
    );

    return {
      totalMemories,
      memoriesPerTenant,
      memoriesPerAgent,
      memoriesPerType,
      averageAccessTime:
        recentMetrics.length > 0 ? totalDuration / recentMetrics.length : 0,
      cacheHitRatio: this.calculateCacheHitRatio(),
      vectorSearchLatency: this.calculateVectorSearchLatency(),
      embeddingProcessingTime: this.calculateEmbeddingProcessingTime(),
    };
  }

  /**
   * Get system health metrics
   */
  public getSystemHealth(): SystemHealthMetrics | null {
    return this.healthStats;
  }

  /**
   * Get active alerts
   */
  public getAlerts(acknowledged = false): PerformanceAlert[] {
    return this.alerts.filter(alert => alert.acknowledged === acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get performance trends over time
   */
  public getPerformanceTrends(hours = 24): {
    responseTimeTrend: Array<{ timestamp: Date; value: number }>;
    throughputTrend: Array<{ timestamp: Date; value: number }>;
    errorRateTrend: Array<{ timestamp: Date; value: number }>;
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Group metrics by hour
    const hourlyGroups: Record<string, PerformanceMetric[]> = {};

    relevantMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      if (!hourlyGroups[key]) {
        hourlyGroups[key] = [];
      }
      hourlyGroups[key].push(metric);
    });

    const responseTimeTrend: Array<{ timestamp: Date; value: number }> = [];
    const throughputTrend: Array<{ timestamp: Date; value: number }> = [];
    const errorRateTrend: Array<{ timestamp: Date; value: number }> = [];

    Object.entries(hourlyGroups).forEach(([key, metrics]) => {
      const timestamp = new Date(key);
      const avgResponseTime =
        metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      const throughput = metrics.length;
      const errorRate =
        1 - metrics.filter(m => m.success).length / metrics.length;

      responseTimeTrend.push({ timestamp, value: avgResponseTime });
      throughputTrend.push({ timestamp, value: throughput });
      errorRateTrend.push({ timestamp, value: errorRate });
    });

    return {
      responseTimeTrend: responseTimeTrend.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
      throughputTrend: throughputTrend.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
      errorRateTrend: errorRateTrend.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
    };
  }

  /**
   * Get optimization recommendations
   */
  public getOptimizationRecommendations(): Array<{
    category: 'performance' | 'resource' | 'scaling' | 'configuration';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    impact: string;
    implementation: string;
  }> {
    const recommendations: Array<{
      category: 'performance' | 'resource' | 'scaling' | 'configuration';
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      impact: string;
      implementation: string;
    }> = [];

    const recentStats = this.getPerformanceStats(
      new Date(Date.now() - 3600000), // Last hour
      new Date()
    );

    // Response time optimization
    if (
      recentStats.averageResponseTime > this.config.alertThresholds.responseTime
    ) {
      recommendations.push({
        category: 'performance',
        priority: 'high',
        title: 'High Response Time Detected',
        description: `Average response time is ${recentStats.averageResponseTime.toFixed(2)}ms, exceeding threshold of ${this.config.alertThresholds.responseTime}ms`,
        impact: 'Improved user experience and system throughput',
        implementation:
          'Consider implementing caching, optimizing database queries, or scaling compute resources',
      });
    }

    // Error rate analysis
    if (recentStats.successRate < 0.95) {
      recommendations.push({
        category: 'resource',
        priority: 'critical',
        title: 'High Error Rate',
        description: `Success rate is ${(recentStats.successRate * 100).toFixed(1)}%, below acceptable threshold of 95%`,
        impact: 'Reduced system reliability and user satisfaction',
        implementation:
          'Investigate error patterns, improve error handling, and address resource constraints',
      });
    }

    // Memory usage optimization
    if (
      this.healthStats?.memory.heapUsed &&
      this.healthStats.memory.heapTotal
    ) {
      const memoryUsage =
        this.healthStats.memory.heapUsed / this.healthStats.memory.heapTotal;
      if (memoryUsage > 0.8) {
        recommendations.push({
          category: 'resource',
          priority: 'medium',
          title: 'High Memory Usage',
          description: `Memory usage is at ${(memoryUsage * 100).toFixed(1)}% of heap capacity`,
          impact: 'Prevents memory leaks and improves system stability',
          implementation:
            'Implement memory cleanup routines, optimize data structures, or increase heap size',
        });
      }
    }

    // Throughput optimization
    if (
      recentStats.operationsPerSecond > 0 &&
      recentStats.operationsPerSecond < 10
    ) {
      recommendations.push({
        category: 'scaling',
        priority: 'medium',
        title: 'Low Throughput',
        description: `Current throughput is ${recentStats.operationsPerSecond.toFixed(2)} operations/second`,
        impact: 'Increased system capacity and better resource utilization',
        implementation:
          'Consider horizontal scaling, load balancing, or performance tuning',
      });
    }

    return recommendations;
  }

  /**
   * Update system health metrics
   */
  private updateSystemHealth(): void {
    const process = globalThis.process;

    if (process && typeof process.memoryUsage === 'function') {
      const memUsage = process.memoryUsage();

      this.healthStats = {
        cpu: {
          usage: this.calculateCpuUsage(),
          loadAverage:
            process.platform === 'win32'
              ? [0, 0, 0]
              : (process as any).loadavg?.() || [0, 0, 0],
        },
        memory: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss,
        },
        database: {
          connections: this.estimateDatabaseConnections(),
          queryLatency: this.calculateDatabaseLatency(),
          errorRate: this.calculateDatabaseErrorRate(),
        },
        vector: {
          collections: 1, // Estimated
          totalVectors: this.estimateTotalVectors(),
          indexingLatency: this.calculateIndexingLatency(),
          searchLatency: this.calculateVectorSearchLatency(),
        },
      };

      if (this.config.realTimeUpdates) {
        this.emit('healthUpdate', this.healthStats);
      }
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlertThresholds(): void {
    if (!this.healthStats) return;

    const currentTime = new Date();
    const recentStats = this.getPerformanceStats(
      new Date(Date.now() - 300000), // Last 5 minutes
      currentTime
    );

    // Response time alert
    if (
      recentStats.averageResponseTime > this.config.alertThresholds.responseTime
    ) {
      this.createAlert(
        'critical',
        'High Response Time',
        `Average response time (${recentStats.averageResponseTime.toFixed(2)}ms) exceeds threshold (${this.config.alertThresholds.responseTime}ms)`,
        { responseTime: recentStats.averageResponseTime },
        this.config.alertThresholds.responseTime
      );
    }

    // Error rate alert
    if (recentStats.successRate < 1 - this.config.alertThresholds.errorRate) {
      this.createAlert(
        'critical',
        'High Error Rate',
        `Success rate (${(recentStats.successRate * 100).toFixed(1)}%) below threshold`,
        { errorRate: 1 - recentStats.successRate },
        this.config.alertThresholds.errorRate
      );
    }

    // Memory usage alert
    const memoryUsage =
      this.healthStats.memory.heapUsed / this.healthStats.memory.heapTotal;
    if (memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert(
        'warning',
        'High Memory Usage',
        `Memory usage (${(memoryUsage * 100).toFixed(1)}%) exceeds threshold (${(this.config.alertThresholds.memoryUsage * 100).toFixed(1)}%)`,
        { memoryUsage },
        this.config.alertThresholds.memoryUsage
      );
    }
  }

  /**
   * Check for metric-specific alerts
   */
  private checkMetricAlerts(metric: PerformanceMetric): void {
    // Operation-specific alerts
    if (!metric.success) {
      this.createAlert(
        'warning',
        'Operation Failed',
        `${metric.operationType} operation failed for tenant ${metric.tenantId}`,
        { duration: metric.duration },
        1
      );
    }

    // Slow operation alert
    if (metric.duration > this.config.alertThresholds.responseTime * 2) {
      this.createAlert(
        'warning',
        'Slow Operation',
        `${metric.operationType} operation took ${metric.duration.toFixed(2)}ms`,
        { duration: metric.duration },
        this.config.alertThresholds.responseTime * 2
      );
    }
  }

  /**
   * Create a new alert
   */
  private createAlert(
    type: 'warning' | 'critical' | 'info',
    title: string,
    message: string,
    metrics: Record<string, number>,
    threshold: number
  ): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Check if similar alert already exists
    const existingAlert = this.alerts.find(
      a =>
        !a.acknowledged &&
        a.title === title &&
        Date.now() - a.timestamp.getTime() < 300000 // Within 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: PerformanceAlert = {
      id: alertId,
      type,
      title,
      message,
      timestamp: new Date(),
      metrics,
      threshold,
      actualValue: Object.values(metrics)[0] || 0,
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Limit alerts to prevent memory issues
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500);
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();

    // Only cleanup every 5 minutes
    if (now - this.lastCleanup < 300000) {
      return;
    }

    const cutoffTime = new Date(
      now - this.config.metricsRetentionDays * 24 * 60 * 60 * 1000
    );
    const originalLength = this.metrics.length;

    this.metrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    // Also cleanup old alerts
    this.alerts = this.alerts.filter(
      a => a.timestamp >= new Date(now - 24 * 60 * 60 * 1000) // Keep alerts for 24 hours
    );

    this.lastCleanup = now;

    if (originalLength !== this.metrics.length) {
      console.log(
        `[PerformanceMonitor] Cleaned up ${originalLength - this.metrics.length} old metrics`
      );
    }
  }

  /**
   * Get recent metrics within a time window
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetric[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  /**
   * Calculate cache hit ratio
   */
  private calculateCacheHitRatio(): number {
    const recentMetrics = this.getRecentMetrics(300000);
    const cacheHits = recentMetrics.filter(
      m => m.metadata?.cacheHit === true || m.duration < 10
    ).length;

    return recentMetrics.length > 0 ? cacheHits / recentMetrics.length : 0;
  }

  /**
   * Calculate vector search latency
   */
  private calculateVectorSearchLatency(): number {
    const searchMetrics = this.getRecentMetrics(300000).filter(
      m => m.operationType === 'search' || m.operationType === 'recall'
    );

    if (searchMetrics.length === 0) return 0;

    return (
      searchMetrics.reduce((sum, m) => sum + m.duration, 0) /
      searchMetrics.length
    );
  }

  /**
   * Calculate embedding processing time
   */
  private calculateEmbeddingProcessingTime(): number {
    const embeddingMetrics = this.getRecentMetrics(300000).filter(
      m => m.metadata?.embeddingTime
    );

    if (embeddingMetrics.length === 0) return 0;

    return (
      embeddingMetrics.reduce(
        (sum, m) => sum + (m.metadata?.embeddingTime || 0),
        0
      ) / embeddingMetrics.length
    );
  }

  /**
   * Calculate CPU usage (simplified)
   */
  private calculateCpuUsage(): number {
    // Simplified CPU calculation based on recent operations
    const recentMetrics = this.getRecentMetrics(60000); // Last minute
    const operationsPerSecond = recentMetrics.length / 60;

    // Estimate CPU usage based on operation frequency
    return Math.min(operationsPerSecond * 2, 100); // Cap at 100%
  }

  /**
   * Estimate database connections
   */
  private estimateDatabaseConnections(): number {
    const activeTenants = new Set(
      this.getRecentMetrics(300000).map(m => m.tenantId)
    ).size;

    return Math.max(activeTenants, 1);
  }

  /**
   * Calculate database latency
   */
  private calculateDatabaseLatency(): number {
    const dbOperations = this.getRecentMetrics(300000).filter(
      m => m.operationType === 'remember' || m.operationType === 'forget'
    );

    if (dbOperations.length === 0) return 0;

    return (
      dbOperations.reduce((sum, m) => sum + m.duration, 0) / dbOperations.length
    );
  }

  /**
   * Calculate database error rate
   */
  private calculateDatabaseErrorRate(): number {
    const dbOperations = this.getRecentMetrics(300000);
    if (dbOperations.length === 0) return 0;

    const errors = dbOperations.filter(m => !m.success).length;
    return errors / dbOperations.length;
  }

  /**
   * Estimate total vectors
   */
  private estimateTotalVectors(): number {
    const rememberOperations = this.metrics.filter(
      m => m.operationType === 'remember'
    );
    return rememberOperations.reduce((sum, m) => sum + m.memoryCount, 0);
  }

  /**
   * Calculate indexing latency
   */
  private calculateIndexingLatency(): number {
    const indexingMetrics = this.getRecentMetrics(300000).filter(
      m => m.operationType === 'remember' && m.metadata?.indexingTime
    );

    if (indexingMetrics.length === 0) return 0;

    return (
      indexingMetrics.reduce(
        (sum, m) => sum + (m.metadata?.indexingTime || 0),
        0
      ) / indexingMetrics.length
    );
  }
}
