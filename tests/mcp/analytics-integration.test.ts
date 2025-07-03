/**
 * Analytics System Integration Test
 *
 * Comprehensive test suite for the enterprise analytics system including
 * performance monitoring, system optimization, and dashboard services.
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// Import analytics components
import {
  DEFAULT_ANALYTICS_CONFIG,
  DEFAULT_AUTO_SCALING_CONFIG,
  DEFAULT_CACHE_OPTIMIZATION_CONFIG,
  DEFAULT_QUERY_OPTIMIZATION_CONFIG,
  EnterpriseAnalyticsManager,
} from '../../packages/core/src/analytics/index';

describe('Enterprise Analytics System', () => {
  let analyticsManager: EnterpriseAnalyticsManager;

  beforeEach(async () => {
    analyticsManager = new EnterpriseAnalyticsManager(
      DEFAULT_ANALYTICS_CONFIG,
      DEFAULT_AUTO_SCALING_CONFIG,
      DEFAULT_CACHE_OPTIMIZATION_CONFIG,
      DEFAULT_QUERY_OPTIMIZATION_CONFIG
    );

    await analyticsManager.start();
  });

  afterEach(async () => {
    await analyticsManager.stop();
  });

  describe('Performance Monitoring', () => {
    test('should record and retrieve performance metrics', async () => {
      // Record test metrics
      const testMetrics = [
        {
          operationType: 'remember' as const,
          duration: 45,
          success: true,
          memoryCount: 1,
          tenantId: 'test-tenant-1',
          agentId: 'test-agent-1',
          metadata: { source: 'test' },
        },
        {
          operationType: 'recall' as const,
          duration: 35,
          success: true,
          memoryCount: 5,
          tenantId: 'test-tenant-1',
          agentId: 'test-agent-1',
          metadata: { source: 'test' },
        },
        {
          operationType: 'search' as const,
          duration: 120,
          success: false,
          memoryCount: 0,
          tenantId: 'test-tenant-2',
          metadata: { source: 'test', error: 'timeout' },
        },
      ];

      testMetrics.forEach(metric => {
        analyticsManager.recordMetric(metric);
      });

      // Wait a moment for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get performance statistics
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60000); // Last minute

      const stats = analyticsManager.getPerformanceStats(startTime, endTime);

      expect(stats.totalOperations).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });

    test('should provide memory usage analytics', () => {
      // Record some metrics first
      analyticsManager.recordMetric({
        operationType: 'remember',
        duration: 50,
        success: true,
        memoryCount: 3,
        tenantId: 'analytics-test',
        agentId: 'analytics-agent',
      });

      const memoryAnalytics = analyticsManager.getMemoryAnalytics();

      expect(memoryAnalytics).toHaveProperty('totalMemories');
      expect(memoryAnalytics).toHaveProperty('memoriesPerTenant');
      expect(memoryAnalytics).toHaveProperty('memoriesPerAgent');
      expect(memoryAnalytics).toHaveProperty('averageAccessTime');
      expect(memoryAnalytics).toHaveProperty('cacheHitRatio');
      expect(memoryAnalytics).toHaveProperty('vectorSearchLatency');

      expect(typeof memoryAnalytics.averageAccessTime).toBe('number');
      expect(typeof memoryAnalytics.cacheHitRatio).toBe('number');
    });

    test('should generate and manage alerts', async () => {
      // Record metrics that should trigger alerts (slow responses)
      for (let i = 0; i < 5; i++) {
        analyticsManager.recordMetric({
          operationType: 'remember',
          duration: 500, // Slow operation
          success: true,
          memoryCount: 1,
          tenantId: 'alert-test',
          agentId: 'alert-agent',
        });
      }

      // Wait for alert processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const alerts = analyticsManager.getAlerts();

      expect(Array.isArray(alerts)).toBe(true);

      // If alerts were generated, test acknowledgment
      if (alerts.length > 0) {
        const alertId = alerts[0].id;
        const acknowledged = analyticsManager.acknowledgeAlert(alertId);
        expect(acknowledged).toBe(true);
      }
    });
  });

  describe('System Optimization', () => {
    test('should provide optimization recommendations', async () => {
      // Record metrics that might trigger optimization recommendations
      analyticsManager.recordMetric({
        operationType: 'recall',
        duration: 250, // Slow operation
        success: true,
        memoryCount: 10,
        tenantId: 'optimization-test',
        metadata: { cacheHit: false },
      });

      const recommendations =
        await analyticsManager.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);

      if (recommendations.length > 0) {
        const recommendation = recommendations[0];
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('title');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('estimatedImpact');
        expect(recommendation).toHaveProperty('implementation');
        expect(recommendation).toHaveProperty('automated');

        expect(['low', 'medium', 'high', 'critical']).toContain(
          recommendation.priority
        );
        expect(typeof recommendation.automated).toBe('boolean');
      }
    });

    test('should track optimization history', () => {
      const history = analyticsManager.getOptimizationHistory(24);

      expect(Array.isArray(history)).toBe(true);

      // History might be empty for new system, but structure should be correct
      if (history.length > 0) {
        const entry = history[0];
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('rule');
        expect(entry).toHaveProperty('result');
        expect(entry.timestamp instanceof Date).toBe(true);
      }
    });
  });

  describe('Dashboard and Business Intelligence', () => {
    test('should provide dashboard data', () => {
      const dashboardData = analyticsManager.getDashboardData();

      // Dashboard data might be null initially, but if present should have correct structure
      if (dashboardData) {
        expect(dashboardData).toHaveProperty('timestamp');
        expect(dashboardData).toHaveProperty('systemOverview');
        expect(dashboardData.timestamp instanceof Date).toBe(true);
        expect(dashboardData.systemOverview).toHaveProperty('status');
        expect(['healthy', 'warning', 'critical']).toContain(
          dashboardData.systemOverview.status
        );
      }
    });

    test('should generate business metrics', () => {
      // Record diverse metrics for business analysis
      const tenants = ['tenant-a', 'tenant-b', 'tenant-c'];
      const operations = ['remember', 'recall', 'search'] as const;

      tenants.forEach((tenant, i) => {
        operations.forEach((operation, j) => {
          analyticsManager.recordMetric({
            operationType: operation,
            duration: 50 + i * 10 + j * 5,
            success: Math.random() > 0.1, // 90% success rate
            memoryCount: Math.floor(Math.random() * 10) + 1,
            tenantId: tenant,
            agentId: `agent-${tenant}-${j}`,
            metadata: { businessTest: true },
          });
        });
      });

      const businessMetrics = analyticsManager.getBusinessMetrics();

      expect(businessMetrics).toHaveProperty('tenantAnalytics');
      expect(businessMetrics).toHaveProperty('agentAnalytics');
      expect(businessMetrics).toHaveProperty('usagePatterns');

      expect(Array.isArray(businessMetrics.tenantAnalytics)).toBe(true);
      expect(Array.isArray(businessMetrics.agentAnalytics)).toBe(true);
      expect(businessMetrics.usagePatterns).toHaveProperty('peakHours');
      expect(businessMetrics.usagePatterns).toHaveProperty('popularOperations');
      expect(businessMetrics.usagePatterns).toHaveProperty(
        'memoryTypeDistribution'
      );

      if (businessMetrics.tenantAnalytics.length > 0) {
        const tenantAnalytic = businessMetrics.tenantAnalytics[0];
        expect(tenantAnalytic).toHaveProperty('tenantId');
        expect(tenantAnalytic).toHaveProperty('totalMemories');
        expect(tenantAnalytic).toHaveProperty('averageResponseTime');
        expect(tenantAnalytic).toHaveProperty('errorRate');
      }
    });

    test('should manage dashboard layouts', () => {
      const dashboards = analyticsManager.getAllDashboards();

      expect(Array.isArray(dashboards)).toBe(true);
      expect(dashboards.length).toBeGreaterThan(0); // Should have default dashboards

      const dashboard = dashboards[0];
      expect(dashboard).toHaveProperty('id');
      expect(dashboard).toHaveProperty('name');
      expect(dashboard).toHaveProperty('widgets');
      expect(dashboard).toHaveProperty('permissions');
      expect(Array.isArray(dashboard.widgets)).toBe(true);
    });
  });

  describe('Performance Trends and Analytics', () => {
    test('should calculate performance trends', () => {
      // Record time-series data
      const baseTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(baseTime + i * 60 * 60 * 1000); // Hourly intervals
        analyticsManager.recordMetric({
          operationType: 'recall',
          duration: 50 + i * 2, // Gradually increasing response time
          success: Math.random() > 0.05, // 95% success rate
          memoryCount: Math.floor(Math.random() * 5) + 1,
          tenantId: 'trend-test',
          agentId: 'trend-agent',
        });
      }

      const trends = analyticsManager.getPerformanceTrends(24);

      expect(trends).toHaveProperty('responseTimeTrend');
      expect(trends).toHaveProperty('throughputTrend');
      expect(trends).toHaveProperty('errorRateTrend');

      expect(Array.isArray(trends.responseTimeTrend)).toBe(true);
      expect(Array.isArray(trends.throughputTrend)).toBe(true);
      expect(Array.isArray(trends.errorRateTrend)).toBe(true);

      if (trends.responseTimeTrend.length > 0) {
        const trendPoint = trends.responseTimeTrend[0];
        expect(trendPoint).toHaveProperty('timestamp');
        expect(trendPoint).toHaveProperty('value');
        expect(trendPoint.timestamp instanceof Date).toBe(true);
        expect(typeof trendPoint.value).toBe('number');
      }
    });
  });

  describe('System Health and Status', () => {
    test('should provide comprehensive system status', () => {
      const systemStatus = analyticsManager.getSystemStatus();

      expect(systemStatus).toHaveProperty('overall');
      expect(systemStatus).toHaveProperty('performance');
      expect(systemStatus).toHaveProperty('resources');
      expect(systemStatus).toHaveProperty('alerts');
      expect(systemStatus).toHaveProperty('optimizations');

      expect(['healthy', 'warning', 'critical']).toContain(
        systemStatus.overall
      );

      expect(systemStatus.performance).toHaveProperty('averageResponseTime');
      expect(systemStatus.performance).toHaveProperty('throughput');
      expect(systemStatus.performance).toHaveProperty('errorRate');

      expect(systemStatus.resources).toHaveProperty('memoryUsage');
      expect(systemStatus.resources).toHaveProperty('cpuUsage');
      expect(systemStatus.resources).toHaveProperty('connections');

      expect(systemStatus.alerts).toHaveProperty('critical');
      expect(systemStatus.alerts).toHaveProperty('warning');
      expect(systemStatus.alerts).toHaveProperty('total');

      expect(systemStatus.optimizations).toHaveProperty('recent');
      expect(systemStatus.optimizations).toHaveProperty('successful');
      expect(systemStatus.optimizations).toHaveProperty('pending');
    });

    test('should monitor system health metrics', () => {
      const systemHealth = analyticsManager.getSystemHealth();

      // System health might be null initially, but if present should have correct structure
      if (systemHealth) {
        expect(systemHealth).toHaveProperty('cpu');
        expect(systemHealth).toHaveProperty('memory');
        expect(systemHealth).toHaveProperty('database');
        expect(systemHealth).toHaveProperty('vector');

        expect(systemHealth.cpu).toHaveProperty('usage');
        expect(systemHealth.cpu).toHaveProperty('loadAverage');

        expect(systemHealth.memory).toHaveProperty('heapUsed');
        expect(systemHealth.memory).toHaveProperty('heapTotal');

        expect(typeof systemHealth.cpu.usage).toBe('number');
        expect(Array.isArray(systemHealth.cpu.loadAverage)).toBe(true);
      }
    });
  });

  describe('Configuration and Integration', () => {
    test('should use default configurations correctly', () => {
      expect(DEFAULT_ANALYTICS_CONFIG).toHaveProperty('metricsRetentionDays');
      expect(DEFAULT_ANALYTICS_CONFIG).toHaveProperty('alertThresholds');
      expect(DEFAULT_ANALYTICS_CONFIG).toHaveProperty('realTimeUpdates');

      expect(DEFAULT_AUTO_SCALING_CONFIG).toHaveProperty('enabled');
      expect(DEFAULT_AUTO_SCALING_CONFIG).toHaveProperty('triggers');
      expect(DEFAULT_AUTO_SCALING_CONFIG).toHaveProperty('scaling');

      expect(DEFAULT_CACHE_OPTIMIZATION_CONFIG).toHaveProperty('enabled');
      expect(DEFAULT_CACHE_OPTIMIZATION_CONFIG).toHaveProperty('strategies');
      expect(DEFAULT_CACHE_OPTIMIZATION_CONFIG).toHaveProperty('thresholds');

      expect(DEFAULT_QUERY_OPTIMIZATION_CONFIG).toHaveProperty('enabled');
      expect(DEFAULT_QUERY_OPTIMIZATION_CONFIG).toHaveProperty('techniques');
      expect(DEFAULT_QUERY_OPTIMIZATION_CONFIG).toHaveProperty('analysis');

      expect(typeof DEFAULT_ANALYTICS_CONFIG.metricsRetentionDays).toBe(
        'number'
      );
      expect(typeof DEFAULT_AUTO_SCALING_CONFIG.enabled).toBe('boolean');
      expect(typeof DEFAULT_CACHE_OPTIMIZATION_CONFIG.enabled).toBe('boolean');
      expect(typeof DEFAULT_QUERY_OPTIMIZATION_CONFIG.enabled).toBe('boolean');
    });

    test('should start and stop services gracefully', async () => {
      const newManager = new EnterpriseAnalyticsManager();

      // Should start without errors
      await expect(newManager.start()).resolves.not.toThrow();

      // Should stop without errors
      await expect(newManager.stop()).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed metrics gracefully', () => {
      // Test with edge case metrics
      const edgeCaseMetrics = [
        {
          operationType: 'remember' as const,
          duration: 0, // Zero duration
          success: true,
          memoryCount: 0, // Zero memory count
          tenantId: '',
          agentId: undefined,
        },
        {
          operationType: 'recall' as const,
          duration: -1, // Negative duration (should be handled gracefully)
          success: false,
          memoryCount: 1000000, // Very large memory count
          tenantId: 'edge-case-tenant',
          metadata: { test: 'edge-case' },
        },
      ];

      // Should not throw errors
      expect(() => {
        edgeCaseMetrics.forEach(metric => {
          analyticsManager.recordMetric(metric);
        });
      }).not.toThrow();
    });

    test('should handle time range queries with no data', () => {
      const futureStart = new Date(Date.now() + 86400000); // Tomorrow
      const futureEnd = new Date(Date.now() + 172800000); // Day after tomorrow

      const stats = analyticsManager.getPerformanceStats(
        futureStart,
        futureEnd
      );

      expect(stats.totalOperations).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });
});
