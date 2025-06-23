/**
 * Advanced Performance Monitoring and Alerting System
 * Enterprise-grade monitoring with predictive analytics
 */

import { logger } from "../utils/logger.js";

export interface AlertConfig {
    enabled: boolean;
    thresholds: {
        memoryUsage: number; // GB
        queryLatency: number; // ms
        cacheHitRate: number; // percentage
        errorRate: number; // percentage
        concurrentUsers: number;
    };
    notifications: {
        email?: string[];
        slack?: string;
        webhook?: string;
    };
}

export interface PerformanceMetric {
    timestamp: number;
    memoryUsage: number;
    queryLatency: number;
    cacheHitRate: number;
    errorRate: number;
    concurrentUsers: number;
    systemHealth: "excellent" | "good" | "warning" | "critical";
}

export interface PredictiveAnalysis {
    memoryGrowthTrend: "stable" | "growing" | "declining";
    estimatedOptimizationNeeded: number; // hours
    recommendedActions: string[];
    confidence: number; // 0-1
}

export class AdvancedPerformanceMonitor {
    private metricsHistory: PerformanceMetric[] = [];
    private alertConfig: AlertConfig;
    private isMonitoring = false;
    private monitoringInterval?: NodeJS.Timeout;
    private memoryEngine?: any; // HighPerformanceMemoryEngine instance
    private activeConnections = 0;
    private errorCount = 0;
    private totalRequests = 0;
    constructor(alertConfig?: AlertConfig, memoryEngine?: any) {
        this.alertConfig = alertConfig || {
            enabled: true,
            thresholds: {
                memoryUsage: 1000, // GB
                queryLatency: 1000, // ms
                cacheHitRate: 0.8, // percentage
                errorRate: 0.05, // percentage
                concurrentUsers: 100,
            },
            notifications: {
                email: undefined,
                webhook: undefined,
                slack: undefined,
            },
        };
        this.memoryEngine = memoryEngine;
    }

    /**
     * Start continuous performance monitoring
     */
    startMonitoring(intervalMs = 30000): void {
        if (this.isMonitoring) {
            logger.warn("Monitoring is already active");
            return;
        }

        this.isMonitoring = true;
        logger.info("🔍 Starting advanced performance monitoring...");

        this.monitoringInterval = setInterval(async () => {
            await this.collectMetrics();
        }, intervalMs);
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = undefined;
        }
        this.isMonitoring = false;
        logger.info("⏹️ Performance monitoring stopped");
    }
    /**
     * Collect current performance metrics
     */
    private async collectMetrics(): Promise<PerformanceMetric> {
        const usage = process.memoryUsage();
        const startTime = Date.now();

        // Perform actual latency test
        await this.performLatencyTest();
        const queryLatency = Date.now() - startTime;

        // Get real metrics from memory engine or fallback to defaults
        let cacheHitRate = 0;
        let errorRate = 0;
        const concurrentUsers = this.activeConnections;

        if (
            this.memoryEngine &&
            typeof this.memoryEngine.getPerformanceMetrics === "function"
        ) {
            try {
                const engineMetrics = this.memoryEngine.getPerformanceMetrics();
                cacheHitRate = engineMetrics.cacheHitRate || 0;
            } catch (error) {
                logger.warn("Failed to get engine metrics:", error);
            }
        }

        // Calculate error rate from tracked errors
        errorRate =
            this.totalRequests > 0 ? (this.errorCount / this.totalRequests) * 100 : 0;

        const metric: PerformanceMetric = {
            timestamp: Date.now(),
            memoryUsage: usage.rss / 1024 / 1024 / 1024, // GB
            queryLatency,
            cacheHitRate: Math.min(100, Math.max(0, cacheHitRate)),
            errorRate: Math.min(100, Math.max(0, errorRate)),
            concurrentUsers: Math.max(0, concurrentUsers),
            systemHealth: this.calculateSystemHealth(
                usage.rss / 1024 / 1024 / 1024,
                queryLatency,
            ),
        };

        this.metricsHistory.push(metric);

        // Keep only last 1000 metrics to prevent memory bloat
        if (this.metricsHistory.length > 1000) {
            this.metricsHistory = this.metricsHistory.slice(-1000);
        }

        await this.checkAlerts(metric);
        return metric;
    }

    /**
     * Calculate system health based on key metrics
     */
    private calculateSystemHealth(
        memoryGB: number,
        latencyMs: number,
    ): PerformanceMetric["systemHealth"] {
        if (memoryGB > 10 || latencyMs > 5000) return "critical";
        if (memoryGB > 5 || latencyMs > 2000) return "warning";
        if (memoryGB > 2 || latencyMs > 1000) return "good";
        return "excellent";
    }

    /**
     * Check if metrics exceed alert thresholds
     */
    private async checkAlerts(metric: PerformanceMetric): Promise<void> {
        if (!this.alertConfig.enabled) return;

        const alerts: string[] = [];

        if (metric.memoryUsage > this.alertConfig.thresholds.memoryUsage) {
            alerts.push(
                `🚨 Memory usage: ${metric.memoryUsage.toFixed(2)}GB (threshold: ${this.alertConfig.thresholds.memoryUsage}GB)`,
            );
        }

        if (metric.queryLatency > this.alertConfig.thresholds.queryLatency) {
            alerts.push(
                `🐌 Query latency: ${metric.queryLatency}ms (threshold: ${this.alertConfig.thresholds.queryLatency}ms)`,
            );
        }

        if (metric.cacheHitRate < this.alertConfig.thresholds.cacheHitRate) {
            alerts.push(
                `💾 Cache hit rate: ${metric.cacheHitRate.toFixed(1)}% (threshold: ${this.alertConfig.thresholds.cacheHitRate}%)`,
            );
        }

        if (alerts.length > 0) {
            await this.sendAlert(alerts, metric);
        }
    }

    /**
     * Send alert notifications
     */
    private async sendAlert(
        alerts: string[],
        metric: PerformanceMetric,
    ): Promise<void> {
        const alertMessage = `
🚨 MemorAI Performance Alert - ${new Date().toISOString()}

System Health: ${metric.systemHealth.toUpperCase()}

Issues Detected:
${alerts.map((alert) => `  ${alert}`).join("\n")}

Current Metrics:
  Memory Usage: ${metric.memoryUsage.toFixed(2)}GB
  Query Latency: ${metric.queryLatency}ms
  Cache Hit Rate: ${metric.cacheHitRate.toFixed(1)}%
  Error Rate: ${metric.errorRate.toFixed(2)}%
  Concurrent Users: ${metric.concurrentUsers}

Recommended Actions:
  1. Run emergency memory cleanup
  2. Check Qdrant performance
  3. Review cache configuration
  4. Consider scaling resources
    `;

        logger.warn(alertMessage);

        // In production, implement actual notification sending:
        // - Email via SendGrid/SES
        // - Slack via webhook
        // - Custom webhook integrations

        if (this.alertConfig.notifications.webhook) {
            try {
                // Mock webhook call
                logger.info(
                    `📡 Sending alert to webhook: ${this.alertConfig.notifications.webhook}`,
                );
            } catch (error) {
                logger.error("Failed to send webhook alert:", error);
            }
        }
    }

    /**
     * Generate predictive analysis based on historical data
     */
    generatePredictiveAnalysis(): PredictiveAnalysis {
        if (this.metricsHistory.length < 10) {
            return {
                memoryGrowthTrend: "stable",
                estimatedOptimizationNeeded: 0,
                recommendedActions: ["Collect more data for accurate predictions"],
                confidence: 0.1,
            };
        }

        const recent = this.metricsHistory.slice(-10);
        const older = this.metricsHistory.slice(-20, -10);

        const recentAvgMemory =
            recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
        const olderAvgMemory =
            older.length > 0
                ? older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length
                : recentAvgMemory;

        let memoryGrowthTrend: PredictiveAnalysis["memoryGrowthTrend"] = "stable";
        if (recentAvgMemory > olderAvgMemory * 1.1) memoryGrowthTrend = "growing";
        else if (recentAvgMemory < olderAvgMemory * 0.9)
            memoryGrowthTrend = "declining";

        const recommendedActions: string[] = [];
        let estimatedOptimizationNeeded = 0;

        if (memoryGrowthTrend === "growing") {
            recommendedActions.push("Schedule memory optimization within 24 hours");
            recommendedActions.push("Review memory leak patterns");
            recommendedActions.push("Increase cache cleanup frequency");
            estimatedOptimizationNeeded = 6; // hours
        } else if (recentAvgMemory > 5) {
            recommendedActions.push("Consider memory optimization");
            recommendedActions.push("Review data retention policies");
            estimatedOptimizationNeeded = 2; // hours
        } else {
            recommendedActions.push("System performing well");
            recommendedActions.push("Continue current monitoring");
        }

        return {
            memoryGrowthTrend,
            estimatedOptimizationNeeded,
            recommendedActions,
            confidence: Math.min(this.metricsHistory.length / 100, 0.95),
        };
    }

    /**
     * Get comprehensive system report
     */
    getSystemReport(): {
        currentMetrics: PerformanceMetric | null;
        trends: PredictiveAnalysis;
        healthSummary: {
            overallHealth: string;
            uptime: number;
            totalAlerts: number;
            recommendations: string[];
        };
    } {
        const currentMetrics =
            this.metricsHistory[this.metricsHistory.length - 1] || null;
        const trends = this.generatePredictiveAnalysis();

        const healthCounts = this.metricsHistory.reduce(
            (acc, metric) => {
                acc[metric.systemHealth] = (acc[metric.systemHealth] || 0) + 1;
                return acc;
            },
            {} as Record<string, number>,
        );

        const overallHealth =
            Object.entries(healthCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
            "unknown";

        return {
            currentMetrics,
            trends,
            healthSummary: {
                overallHealth,
                uptime: this.isMonitoring
                    ? Date.now() - (this.metricsHistory[0]?.timestamp || Date.now())
                    : 0,
                totalAlerts: this.metricsHistory.filter(
                    (m) => m.systemHealth === "critical" || m.systemHealth === "warning",
                ).length,
                recommendations: trends.recommendedActions,
            },
        };
    }
    /**
     * Perform a latency test by executing actual memory operation
     */
    private async performLatencyTest(): Promise<number> {
        if (this.memoryEngine && typeof this.memoryEngine.recall === "function") {
            try {
                const startTime = Date.now();
                // Test with a simple recall operation
                await this.memoryEngine.recall("performance-test-query", { limit: 1 });
                return Date.now() - startTime;
            } catch {
                // Error ignored
            }
        }

        // Fallback: minimal system latency test without random component
        const startTime = Date.now();
        await new Promise((resolve) => setTimeout(resolve, 10)); // Fixed 10ms delay
        return Date.now() - startTime;
    }

    /**
     * Export metrics for analysis
     */
    exportMetrics(): PerformanceMetric[] {
        return [...this.metricsHistory];
    }

    /**
     * Track connection activity for concurrent user metrics
     */
    public incrementConnections(): void {
        this.activeConnections++;
    }

    public decrementConnections(): void {
        this.activeConnections = Math.max(0, this.activeConnections - 1);
    }

    /**
     * Track errors for error rate calculation
     */
    public recordError(): void {
        this.errorCount++;
        this.totalRequests++;
    }

    public recordSuccess(): void {
        this.totalRequests++;
    }

    /**
     * Reset error tracking (useful for periodic resets)
     */
    public resetErrorTracking(): void {
        this.errorCount = 0;
        this.totalRequests = 0;
    }
}

// Default alert configuration for enterprise deployment
export const defaultAlertConfig: AlertConfig = {
    enabled: true,
    thresholds: {
        memoryUsage: 8, // GB
        queryLatency: 2000, // ms
        cacheHitRate: 70, // percentage
        errorRate: 5, // percentage
        concurrentUsers: 500,
    },
    notifications: {
        // Configure in production
        email: [],
        slack: undefined,
        webhook: undefined,
    },
};

// Singleton instance for global monitoring
export const globalPerformanceMonitor = new AdvancedPerformanceMonitor(
    defaultAlertConfig,
);
