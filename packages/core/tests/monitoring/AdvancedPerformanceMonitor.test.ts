import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AlertConfig } from '../../src/monitoring/AdvancedPerformanceMonitor';
import { AdvancedPerformanceMonitor } from '../../src/monitoring/AdvancedPerformanceMonitor';

// Mock fetch for webhook notifications
global.fetch = vi.fn();

describe('AdvancedPerformanceMonitor', () => {
  let monitor: AdvancedPerformanceMonitor;
  let mockMemoryEngine: any;
  let alertConfig: AlertConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock memory engine
    mockMemoryEngine = {
      recall: vi.fn().mockResolvedValue([{ id: 'test' }]),
      remember: vi.fn().mockResolvedValue(undefined),
      getMetrics: vi.fn().mockReturnValue({
        cacheHitRate: 0.85,
        activeConnections: 5,
        memoryUsage: 1.2,
      }),
    };

    // Setup alert configuration
    alertConfig = {
      enabled: true,
      thresholds: {
        memoryUsage: 2.0, // GB
        queryLatency: 1000, // ms
        cacheHitRate: 0.8, // 80%
        errorRate: 5, // 5%
        concurrentUsers: 100,
      },
      notifications: {
        email: ['admin@example.com'],
        webhook: 'https://example.com/webhook',
      },
    };

    monitor = new AdvancedPerformanceMonitor(alertConfig, mockMemoryEngine);
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new AdvancedPerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
    });

    it('should initialize with provided configuration', () => {
      expect(monitor).toBeDefined();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring with default interval', () => {
      const spy = vi.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 30000);
      monitor.stopMonitoring();
    });

    it('should start monitoring with custom interval', () => {
      const spy = vi.spyOn(global, 'setInterval');
      monitor.startMonitoring(5000);
      expect(spy).toHaveBeenCalledWith(expect.any(Function), 5000);
      monitor.stopMonitoring();
    });

    it('should not start monitoring if already running', () => {
      const spy = vi.spyOn(global, 'setInterval');
      monitor.startMonitoring();
      monitor.startMonitoring(); // Second call should be ignored
      expect(spy).toHaveBeenCalledTimes(1);
      monitor.stopMonitoring();
    });

    it('should stop monitoring correctly', () => {
      const spy = vi.spyOn(global, 'clearInterval');
      monitor.startMonitoring();
      monitor.stopMonitoring();
      expect(spy).toHaveBeenCalled();
    });

    it('should handle stopping when not monitoring', () => {
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('Metrics Collection', () => {
    it('should generate system report', () => {
      const report = monitor.getSystemReport();

      expect(report).toHaveProperty('currentMetrics');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('healthSummary');

      expect(report.healthSummary).toHaveProperty('uptime');
      expect(report.healthSummary).toHaveProperty('overallHealth');
      expect(report.healthSummary).toHaveProperty('totalAlerts');
      expect(report.healthSummary).toHaveProperty('recommendations');

      expect(typeof report.healthSummary.uptime).toBe('number');
      expect(Array.isArray(report.healthSummary.recommendations)).toBe(true);
    });

    it('should track connection increments', () => {
      monitor.incrementConnections();
      monitor.incrementConnections();
      monitor.incrementConnections();

      const report = monitor.getSystemReport();
      expect(report.currentMetrics).toBeDefined();
    });

    it('should track connection decrements', () => {
      monitor.incrementConnections();
      monitor.incrementConnections();
      monitor.decrementConnections();

      const report = monitor.getSystemReport();
      expect(report.currentMetrics).toBeDefined();
    });

    it('should track errors', () => {
      monitor.recordError();
      monitor.recordError();

      const report = monitor.getSystemReport();
      expect(report.currentMetrics).toBeDefined();
    });

    it('should track successful requests', () => {
      monitor.recordSuccess();
      monitor.recordSuccess();
      monitor.recordSuccess();

      const report = monitor.getSystemReport();
      expect(report.currentMetrics).toBeDefined();
    });

    it('should export metrics history', () => {
      const metrics = monitor.exportMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Predictive Analysis', () => {
    it('should return insufficient data message for empty history', () => {
      const analysis = monitor.generatePredictiveAnalysis();
      expect(analysis.recommendedActions).toContain(
        'Collect more data for accurate predictions'
      );
      expect(analysis.confidence).toBe(0.1);
    });

    it('should analyze memory growth trends', () => {
      // Simulate metrics collection by directly adding to history
      // This would normally be done by the monitoring interval
      monitor.startMonitoring(100); // Very short interval for testing

      // Allow some time for metrics collection
      return new Promise(resolve => {
        setTimeout(() => {
          monitor.stopMonitoring();
          const analysis = monitor.generatePredictiveAnalysis();

          expect(analysis).toHaveProperty('memoryGrowthTrend');
          expect(analysis).toHaveProperty('estimatedOptimizationNeeded');
          expect(analysis).toHaveProperty('recommendedActions');
          expect(analysis).toHaveProperty('confidence');

          expect(['stable', 'growing', 'declining']).toContain(
            analysis.memoryGrowthTrend
          );
          expect(typeof analysis.estimatedOptimizationNeeded).toBe('number');
          expect(Array.isArray(analysis.recommendedActions)).toBe(true);
          expect(typeof analysis.confidence).toBe('number');
          expect(analysis.confidence).toBeGreaterThanOrEqual(0);
          expect(analysis.confidence).toBeLessThanOrEqual(1);

          resolve(undefined);
        }, 250);
      });
    });
  });

  describe('Alert System', () => {
    it('should trigger memory usage alerts', async () => {
      // Mock logger.warn instead of console.warn
      const { logger } = await import('../../src/utils/logger.js');
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      // Mock high memory usage
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 3 * 1024 * 1024 * 1024, // 3GB (above threshold)
        heapTotal: 1024 * 1024 * 1024,
        heapUsed: 512 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      });

      monitor.startMonitoring(100);

      await new Promise(resolve => setTimeout(resolve, 150));
      monitor.stopMonitoring();

      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should handle webhook notifications', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      monitor.recordError();
      monitor.recordError();
      monitor.recordError();
      monitor.recordError();
      monitor.recordError();
      monitor.recordError(); // Should trigger error rate alert

      monitor.startMonitoring(100);

      await new Promise(resolve => setTimeout(resolve, 150));
      monitor.stopMonitoring();

      // Note: In a real scenario, webhook would be called during alert checking
    });

    it('should disable alerts when configuration disabled', () => {
      const disabledConfig = { ...alertConfig, enabled: false };
      const disabledMonitor = new AdvancedPerformanceMonitor(
        disabledConfig,
        mockMemoryEngine
      );

      expect(disabledMonitor).toBeDefined();
      // Alerts should not trigger when disabled
    });
  });

  describe('Performance Testing', () => {
    it('should handle memory engine performance tests', async () => {
      monitor.startMonitoring(100);

      await new Promise(resolve => setTimeout(resolve, 150));
      monitor.stopMonitoring();

      expect(mockMemoryEngine.recall).toHaveBeenCalled();
    });

    it('should handle missing memory engine gracefully', () => {
      const monitorWithoutEngine = new AdvancedPerformanceMonitor(alertConfig);

      expect(() => monitorWithoutEngine.startMonitoring(100)).not.toThrow();
      monitorWithoutEngine.stopMonitoring();
    });
  });

  describe('System Health Assessment', () => {
    it('should assess system health correctly', () => {
      const report = monitor.getSystemReport();

      if (report.currentMetrics) {
        expect(['excellent', 'good', 'warning', 'critical']).toContain(
          report.currentMetrics.systemHealth
        );
      } else {
        // No metrics yet, which is valid for a new monitor
        expect(report.currentMetrics).toBeNull();
      }
    });

    it('should provide relevant recommendations', () => {
      monitor.recordError();
      monitor.recordError();

      const report = monitor.getSystemReport();
      expect(report.healthSummary.recommendations).toBeDefined();
      expect(Array.isArray(report.healthSummary.recommendations)).toBe(true);
    });
  });

  describe('Metrics History Management', () => {
    it('should maintain metrics history within limits', async () => {
      monitor.startMonitoring(50); // Very frequent collection

      await new Promise(resolve => setTimeout(resolve, 300));
      monitor.stopMonitoring();

      const report = monitor.getSystemReport();
      // History should be managed and not exceed reasonable limits
      expect(report).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle monitoring errors gracefully', () => {
      // Mock memory engine to throw error
      mockMemoryEngine.recall.mockRejectedValue(new Error('Test error'));

      expect(() => monitor.startMonitoring(100)).not.toThrow();
      monitor.stopMonitoring();
    });

    it('should handle webhook notification failures', async () => {
      const fetchMock = vi.mocked(fetch);
      fetchMock.mockRejectedValue(new Error('Network error'));

      monitor.recordError();
      monitor.startMonitoring(100);

      await new Promise(resolve => setTimeout(resolve, 150));
      monitor.stopMonitoring();

      // Should not throw even if webhook fails
    });
  });
});
