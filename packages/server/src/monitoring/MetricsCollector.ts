/**
 * @fileoverview Prometheus metrics collection for Memorai MCP Server
 */

import type { ServerMetrics } from "../types/index.js";
// import { logger } from '../utils/logger.js';
import { Logger } from "../utils/Logger.js";

/**
 * Metrics data point for time-series tracking
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Request metrics for tracking API performance
 */
interface RequestMetrics {
  count: number;
  totalResponseTime: number;
  errors: number;
  lastRequestTime: number;
}

/**
 * Connection metrics for tracking active connections
 */
interface ConnectionMetrics {
  active: number;
  total: number;
  maxConcurrent: number;
}

/**
 * Comprehensive metrics collector with Prometheus format export
 */
export class MetricsCollector {
  private requests: RequestMetrics = {
    count: 0,
    totalResponseTime: 0,
    errors: 0,
    lastRequestTime: Date.now(),
  };

  private connections: ConnectionMetrics = {
    active: 0,
    total: 0,
    maxConcurrent: 0,
  };

  private memoryUsageHistory: MetricDataPoint[] = [];
  private requestHistory: MetricDataPoint[] = [];
  private errorHistory: MetricDataPoint[] = [];

  private readonly maxHistorySize = 1000;
  private readonly windowSizeMs = 60 * 1000; // 1 minute window

  /**
   * Record a request with response time
   */
  public recordRequest(responseTimeMs: number, isError: boolean = false): void {
    const now = Date.now();

    this.requests.count++;
    this.requests.totalResponseTime += responseTimeMs;
    this.requests.lastRequestTime = now;

    if (isError) {
      this.requests.errors++;
      this.addDataPoint(this.errorHistory, now, 1);
    }

    this.addDataPoint(this.requestHistory, now, 1);
    this.cleanupHistory();
  }

  /**
   * Record connection event
   */
  public recordConnection(type: "open" | "close"): void {
    if (type === "open") {
      this.connections.active++;
      this.connections.total++;
      this.connections.maxConcurrent = Math.max(
        this.connections.maxConcurrent,
        this.connections.active,
      );
    } else {
      this.connections.active = Math.max(0, this.connections.active - 1);
    }
  }

  /**
   * Record memory usage
   */
  public recordMemoryUsage(memoryMB: number): void {
    const now = Date.now();
    this.addDataPoint(this.memoryUsageHistory, now, memoryMB);
    this.cleanupHistory();
  }

  /**
   * Get current server metrics
   */
  public getServerMetrics(): ServerMetrics {
    const now = Date.now();
    const windowStart = now - this.windowSizeMs;

    // Calculate requests per second in the last minute
    const recentRequests = this.requestHistory.filter(
      (point) => point.timestamp >= windowStart,
    );
    const requestsPerSecond =
      (recentRequests.length * 1000) / this.windowSizeMs;

    // Calculate average response time
    const averageResponseTime =
      this.requests.count > 0
        ? this.requests.totalResponseTime / this.requests.count
        : 0;

    // Calculate error rate
    const recentErrors = this.errorHistory.filter(
      (point) => point.timestamp >= windowStart,
    );
    const errorRate =
      recentRequests.length > 0
        ? (recentErrors.length / recentRequests.length) * 100
        : 0;

    // Get current memory usage
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    return {
      requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      activeConnections: this.connections.active,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  public exportPrometheusMetrics(): string {
    const metrics = this.getServerMetrics();
    const timestamp = Date.now();

    const prometheusMetrics = [
      "# HELP memorai_requests_per_second Current requests per second",
      "# TYPE memorai_requests_per_second gauge",
      `memorai_requests_per_second ${metrics.requestsPerSecond} ${timestamp}`,
      "",
      "# HELP memorai_average_response_time_ms Average response time in milliseconds",
      "# TYPE memorai_average_response_time_ms gauge",
      `memorai_average_response_time_ms ${metrics.averageResponseTime} ${timestamp}`,
      "",
      "# HELP memorai_memory_usage_mb Memory usage in megabytes",
      "# TYPE memorai_memory_usage_mb gauge",
      `memorai_memory_usage_mb ${metrics.memoryUsage} ${timestamp}`,
      "",
      "# HELP memorai_active_connections Current active connections",
      "# TYPE memorai_active_connections gauge",
      `memorai_active_connections ${metrics.activeConnections} ${timestamp}`,
      "",
      "# HELP memorai_error_rate_percent Error rate percentage",
      "# TYPE memorai_error_rate_percent gauge",
      `memorai_error_rate_percent ${metrics.errorRate} ${timestamp}`,
      "",
      "# HELP memorai_total_requests Total number of requests processed",
      "# TYPE memorai_total_requests counter",
      `memorai_total_requests ${this.requests.count} ${timestamp}`,
      "",
      "# HELP memorai_total_errors Total number of errors",
      "# TYPE memorai_total_errors counter",
      `memorai_total_errors ${this.requests.errors} ${timestamp}`,
      "",
      "# HELP memorai_total_connections Total connections opened",
      "# TYPE memorai_total_connections counter",
      `memorai_total_connections ${this.connections.total} ${timestamp}`,
      "",
      "# HELP memorai_max_concurrent_connections Maximum concurrent connections",
      "# TYPE memorai_max_concurrent_connections gauge",
      `memorai_max_concurrent_connections ${this.connections.maxConcurrent} ${timestamp}`,
      "",
    ].join("\n");

    return prometheusMetrics;
  }

  /**
   * Get detailed metrics summary
   */
  public getDetailedMetrics(): any {
    const serverMetrics = this.getServerMetrics();
    const now = Date.now();
    const uptime = now - (this.requestHistory[0]?.timestamp || now);

    return {
      server: serverMetrics,
      uptime: Math.floor(uptime / 1000), // seconds
      connections: {
        ...this.connections,
      },
      requests: {
        total: this.requests.count,
        errors: this.requests.errors,
        successRate:
          this.requests.count > 0
            ? ((this.requests.count - this.requests.errors) /
                this.requests.count) *
              100
            : 100,
      },
      history: {
        dataPoints: this.requestHistory.length,
        windowSizeMs: this.windowSizeMs,
        maxHistorySize: this.maxHistorySize,
      },
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.requests = {
      count: 0,
      totalResponseTime: 0,
      errors: 0,
      lastRequestTime: Date.now(),
    };

    this.connections = {
      active: 0,
      total: 0,
      maxConcurrent: 0,
    };

    this.memoryUsageHistory = [];
    this.requestHistory = [];
    this.errorHistory = [];
  }

  /**
   * Add data point to history array
   */
  private addDataPoint(
    history: MetricDataPoint[],
    timestamp: number,
    value: number,
  ): void {
    history.push({ timestamp, value });

    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Clean up old data points outside the window
   */
  private cleanupHistory(): void {
    const cutoff = Date.now() - this.windowSizeMs * 2; // Keep 2x window for safety

    this.cleanupArray(this.memoryUsageHistory, cutoff);
    this.cleanupArray(this.requestHistory, cutoff);
    this.cleanupArray(this.errorHistory, cutoff);
  }

  /**
   * Remove old data points from array
   */
  private cleanupArray(array: MetricDataPoint[], cutoff: number): void {
    while (array.length > 0 && array[0].timestamp < cutoff) {
      array.shift();
    }
  }

  /**
   * Start periodic memory usage recording
   */
  public startPeriodicRecording(intervalMs: number = 30000): void {
    setInterval(() => {
      try {
        const memoryMB = process.memoryUsage().heapUsed / 1024 / 1024;
        this.recordMemoryUsage(memoryMB);
      } catch (error: unknown) {
        Logger.error("Error recording periodic memory usage", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, intervalMs);
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();
