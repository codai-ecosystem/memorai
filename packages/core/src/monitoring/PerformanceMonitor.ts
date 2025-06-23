/**
 * Performance monitoring and metrics collection for Memorai
 * Tracks query performance, memory usage, and system health
 */

export interface PerformanceMetrics {
  // Query performance
  queryCount: number;
  avgQueryTime: number;
  queryErrors: number;
  querySuccessRate: number;

  // Memory operations
  rememberCount: number;
  recallCount: number;
  forgetCount: number;
  contextCount: number;

  // Timing metrics
  avgRememberTime: number;
  avgRecallTime: number;
  avgForgetTime: number;
  avgContextTime: number;

  // Cache performance
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;

  // System resources
  memoryUsage: number;
  activeConnections: number;

  // Time window
  windowStart: Date;
  windowEnd: Date;
}

export interface QueryMetrics {
  operation: "remember" | "recall" | "forget" | "context";
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  error?: string;
  tenantId: string;
  agentId?: string;
  resultCount?: number;
  cacheHit?: boolean;
}

export class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private windowSizeMs: number;
  private maxHistorySize: number;
  private activeConnections: number = 0;
  private totalConnections: number = 0;
  private maxConcurrentConnections: number = 0;

  constructor(windowSizeMs: number = 60000, maxHistorySize: number = 10000) {
    this.windowSizeMs = windowSizeMs;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Record a query operation for metrics tracking
   */
  public recordQuery(metrics: QueryMetrics): void {
    this.metrics.push(metrics);

    // Cleanup old metrics to prevent memory leaks
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics = this.metrics.slice(-this.maxHistorySize);
    }
  } /**
   * Start timing a query operation
   */
  public startQuery(
    operation: QueryMetrics["operation"],
    tenantId: string,
    agentId?: string,
  ): {
    finish: (
      success: boolean,
      error?: string,
      resultCount?: number,
      cacheHit?: boolean,
    ) => void;
  } {
    const startTime = Date.now();

    return {
      finish: (
        success: boolean,
        error?: string,
        resultCount?: number,
        cacheHit?: boolean,
      ) => {
        const endTime = Date.now();
        const queryMetrics: QueryMetrics = {
          operation,
          startTime,
          endTime,
          duration: endTime - startTime,
          success,
          tenantId,
        };

        if (agentId !== undefined) {
          queryMetrics.agentId = agentId;
        }
        if (error !== undefined) {
          queryMetrics.error = error;
        }
        if (resultCount !== undefined) {
          queryMetrics.resultCount = resultCount;
        }
        if (cacheHit !== undefined) {
          queryMetrics.cacheHit = cacheHit;
        }

        this.recordQuery(queryMetrics);
      },
    };
  }

  /**
   * Get performance metrics for the current time window
   */
  public getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const windowStart = new Date(now - this.windowSizeMs);
    const windowEnd = new Date(now);

    // Filter metrics to current window
    const windowMetrics = this.metrics.filter(
      (m) => m.endTime >= now - this.windowSizeMs,
    );

    const totalQueries = windowMetrics.length;
    const successfulQueries = windowMetrics.filter((m) => m.success).length;
    const queryErrors = totalQueries - successfulQueries;

    // Calculate averages
    const avgQueryTime =
      totalQueries > 0
        ? windowMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries
        : 0;

    // Operation-specific metrics
    const rememberOps = windowMetrics.filter((m) => m.operation === "remember");
    const recallOps = windowMetrics.filter((m) => m.operation === "recall");
    const forgetOps = windowMetrics.filter((m) => m.operation === "forget");
    const contextOps = windowMetrics.filter((m) => m.operation === "context");

    const avgTime = (ops: QueryMetrics[]) =>
      ops.length > 0
        ? ops.reduce((sum, m) => sum + m.duration, 0) / ops.length
        : 0;

    // Cache metrics
    const cacheableOps = windowMetrics.filter((m) => m.cacheHit !== undefined);
    const cacheHits = cacheableOps.filter((m) => m.cacheHit === true).length;
    const cacheMisses = cacheableOps.filter((m) => m.cacheHit === false).length;
    const cacheHitRate =
      cacheableOps.length > 0 ? cacheHits / cacheableOps.length : 0;

    return {
      queryCount: totalQueries,
      avgQueryTime,
      queryErrors,
      querySuccessRate: totalQueries > 0 ? successfulQueries / totalQueries : 0,

      rememberCount: rememberOps.length,
      recallCount: recallOps.length,
      forgetCount: forgetOps.length,
      contextCount: contextOps.length,

      avgRememberTime: avgTime(rememberOps),
      avgRecallTime: avgTime(recallOps),
      avgForgetTime: avgTime(forgetOps),
      avgContextTime: avgTime(contextOps),

      cacheHits,
      cacheMisses,
      cacheHitRate,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      activeConnections: this.activeConnections,

      windowStart,
      windowEnd,
    };
  }

  /**
   * Get detailed query history for debugging
   */
  public getQueryHistory(count: number = 100): QueryMetrics[] {
    return this.metrics.slice(-count).reverse();
  }

  /**
   * Get metrics for a specific tenant
   */
  public getTenantMetrics(tenantId: string): PerformanceMetrics {
    const tenantMetrics = this.metrics.filter((m) => m.tenantId === tenantId);

    // Create a temporary monitor with only tenant metrics
    const tempMonitor = new PerformanceMonitor(
      this.windowSizeMs,
      this.maxHistorySize,
    );
    tempMonitor.metrics = tenantMetrics;

    return tempMonitor.getMetrics();
  }

  /**
   * Get slow query analysis
   */
  public getSlowQueries(
    thresholdMs: number = 1000,
    count: number = 10,
  ): QueryMetrics[] {
    return this.metrics
      .filter((m) => m.duration > thresholdMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }

  /**
   * Get error analysis
   */
  public getErrorAnalysis(): {
    error: string;
    count: number;
    lastOccurrence: Date;
  }[] {
    const errorCounts = new Map<
      string,
      { count: number; lastOccurrence: number }
    >();

    this.metrics
      .filter((m) => !m.success && m.error)
      .forEach((m) => {
        const existing = errorCounts.get(m.error!) || {
          count: 0,
          lastOccurrence: 0,
        };
        errorCounts.set(m.error!, {
          count: existing.count + 1,
          lastOccurrence: Math.max(existing.lastOccurrence, m.endTime),
        });
      });

    return Array.from(errorCounts.entries())
      .map(([error, data]) => ({
        error,
        count: data.count,
        lastOccurrence: new Date(data.lastOccurrence),
      }))
      .sort((a, b) => b.count - a.count);
  }
  /**
   * Clear metrics history (useful for testing)
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Track a new connection
   */
  public recordConnection(type: "open" | "close"): void {
    if (type === "open") {
      this.activeConnections++;
      this.totalConnections++;
      this.maxConcurrentConnections = Math.max(
        this.maxConcurrentConnections,
        this.activeConnections,
      );
    } else if (type === "close") {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    active: number;
    total: number;
    maxConcurrent: number;
  } {
    return {
      active: this.activeConnections,
      total: this.totalConnections,
      maxConcurrent: this.maxConcurrentConnections,
    };
  }

  /**
   * Reset connection counters (useful for testing)
   */
  public resetConnections(): void {
    this.activeConnections = 0;
    this.totalConnections = 0;
    this.maxConcurrentConnections = 0;
  }

  /**
   * Export metrics for external monitoring systems
   */
  public exportMetrics(): {
    prometheus: string;
    json: PerformanceMetrics;
    csv: string;
  } {
    const metrics = this.getMetrics();

    // Prometheus format
    const prometheus = [
      `# HELP memorai_query_total Total number of queries`,
      `# TYPE memorai_query_total counter`,
      `memorai_query_total ${metrics.queryCount}`,
      ``,
      `# HELP memorai_query_duration_avg Average query duration in milliseconds`,
      `# TYPE memorai_query_duration_avg gauge`,
      `memorai_query_duration_avg ${metrics.avgQueryTime}`,
      ``,
      `# HELP memorai_query_success_rate Query success rate (0-1)`,
      `# TYPE memorai_query_success_rate gauge`,
      `memorai_query_success_rate ${metrics.querySuccessRate}`,
      ``,
      `# HELP memorai_cache_hit_rate Cache hit rate (0-1)`,
      `# TYPE memorai_cache_hit_rate gauge`,
      `memorai_cache_hit_rate ${metrics.cacheHitRate}`,
      ``,
      `# HELP memorai_memory_usage_mb Memory usage in megabytes`,
      `# TYPE memorai_memory_usage_mb gauge`,
      `memorai_memory_usage_mb ${metrics.memoryUsage}`,
    ].join("\n");

    // CSV format
    const csv = [
      "metric,value,timestamp",
      `query_count,${metrics.queryCount},${metrics.windowEnd.toISOString()}`,
      `avg_query_time,${metrics.avgQueryTime},${metrics.windowEnd.toISOString()}`,
      `query_errors,${metrics.queryErrors},${metrics.windowEnd.toISOString()}`,
      `success_rate,${metrics.querySuccessRate},${metrics.windowEnd.toISOString()}`,
      `cache_hit_rate,${metrics.cacheHitRate},${metrics.windowEnd.toISOString()}`,
      `memory_usage_mb,${metrics.memoryUsage},${metrics.windowEnd.toISOString()}`,
    ].join("\n");

    return {
      prometheus,
      json: metrics,
      csv,
    };
  }
}

// Global singleton instance
export const performanceMonitor = new PerformanceMonitor();
