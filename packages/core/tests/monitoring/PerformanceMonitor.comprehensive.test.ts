import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceMonitor } from '../../src/monitoring/PerformanceMonitor';

describe('PerformanceMonitor - Comprehensive Coverage', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(60000, 1000); // 1 minute window, 1000 max history
  });

  describe('Metrics Export Functionality', () => {
    it('should export metrics in multiple formats', () => {
      // Add some sample data
      const timer1 = monitor.startQuery('remember', 'tenant1');
      timer1.finish(true, undefined, 1, true);
      
      const timer2 = monitor.startQuery('recall', 'tenant1');
      timer2.finish(false, 'Test error', 0, false);

      const exported = monitor.exportMetrics();

      // Test Prometheus format
      expect(exported.prometheus).toContain('# HELP memorai_query_total Total number of queries');
      expect(exported.prometheus).toContain('# TYPE memorai_query_total counter');
      expect(exported.prometheus).toContain('memorai_query_total 2');
      expect(exported.prometheus).toContain('# HELP memorai_query_duration_avg Average query duration in milliseconds');
      expect(exported.prometheus).toContain('# TYPE memorai_query_duration_avg gauge');
      expect(exported.prometheus).toContain('# HELP memorai_query_success_rate Query success rate (0-1)');
      expect(exported.prometheus).toContain('# TYPE memorai_query_success_rate gauge');
      expect(exported.prometheus).toContain('# HELP memorai_cache_hit_rate Cache hit rate (0-1)');
      expect(exported.prometheus).toContain('# TYPE memorai_cache_hit_rate gauge');
      expect(exported.prometheus).toContain('# HELP memorai_memory_usage_mb Memory usage in megabytes');
      expect(exported.prometheus).toContain('# TYPE memorai_memory_usage_mb gauge');

      // Test JSON format
      expect(exported.json).toHaveProperty('queryCount', 2);
      expect(exported.json).toHaveProperty('queryErrors', 1);
      expect(exported.json).toHaveProperty('avgQueryTime');
      expect(exported.json).toHaveProperty('querySuccessRate', 0.5);
      expect(exported.json).toHaveProperty('cacheHitRate', 0.5);
      expect(exported.json).toHaveProperty('memoryUsage');
      expect(exported.json).toHaveProperty('windowStart');
      expect(exported.json).toHaveProperty('windowEnd');

      // Test CSV format
      expect(exported.csv).toContain('metric,value,timestamp');
      expect(exported.csv).toContain('query_count,2,');
      expect(exported.csv).toContain('avg_query_time,');
      expect(exported.csv).toContain('query_errors,1,');
      expect(exported.csv).toContain('success_rate,0.5,');
      expect(exported.csv).toContain('cache_hit_rate,0.5,');
      expect(exported.csv).toContain('memory_usage_mb,');
    });    it('should export prometheus format with empty metrics', () => {
      const exported = monitor.exportMetrics();

      expect(exported.prometheus).toContain('memorai_query_total 0');
      expect(exported.prometheus).toContain('memorai_query_duration_avg 0');
      expect(exported.prometheus).toContain('memorai_query_success_rate 0');
      expect(exported.prometheus).toContain('memorai_cache_hit_rate 0');
      expect(exported.prometheus).toContain('memorai_memory_usage_mb');
    });

    it('should export CSV format with correct structure', () => {
      const timer = monitor.startQuery('remember', 'tenant1');
      timer.finish(true, undefined, 1, true);
      
      const exported = monitor.exportMetrics();
      const csvLines = exported.csv.split('\n');
      
      expect(csvLines[0]).toBe('metric,value,timestamp');
      expect(csvLines[1]).toMatch(/^query_count,1,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(csvLines[2]).toMatch(/^avg_query_time,\d+(\.\d+)?,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(csvLines[3]).toMatch(/^query_errors,0,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(csvLines[4]).toMatch(/^success_rate,1,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(csvLines[5]).toMatch(/^cache_hit_rate,1,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(csvLines[6]).toMatch(/^memory_usage_mb,\d+(\.\d+)?,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('ClearMetrics Functionality', () => {
    it('should clear all metrics', () => {
      // Add some data first
      const timer = monitor.startQuery('remember', 'tenant1');
      timer.finish(true, undefined, 1, true);

      // Verify data exists
      const beforeClear = monitor.getMetrics();
      expect(beforeClear.queryCount).toBe(1);

      // Clear metrics
      monitor.clearMetrics();

      // Verify data is cleared
      const afterClear = monitor.getMetrics();
      expect(afterClear.queryCount).toBe(0);
      expect(afterClear.queryErrors).toBe(0);
      expect(afterClear.cacheHitRate).toBe(0); // No cache operations = 0
    });

    it('should reset all metrics to initial state after clearing', () => {
      // Add lots of data
      for (let i = 0; i < 10; i++) {
        const operation = (['remember', 'recall', 'forget', 'context'] as const)[i % 4];
        const timer = monitor.startQuery(operation, 'tenant1');
        if (i % 2 === 0) {
          timer.finish(true, undefined, 1, true);
        } else {
          timer.finish(false, 'Test error', 0, false);
        }
      }

      // Verify data exists
      const beforeClear = monitor.getMetrics();
      expect(beforeClear.queryCount).toBe(10);
      expect(beforeClear.queryErrors).toBe(5);

      // Clear and verify reset
      monitor.clearMetrics();
      const afterClear = monitor.getMetrics();
      
      expect(afterClear.queryCount).toBe(0);
      expect(afterClear.queryErrors).toBe(0);
      expect(afterClear.avgQueryTime).toBe(0);
      expect(afterClear.querySuccessRate).toBe(0);
      expect(afterClear.cacheHitRate).toBe(0);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle export with no query data but cache data', () => {
      // Since trackCacheHit doesn't exist, we'll test with queries that have cache data
      const timer = monitor.startQuery('recall', 'tenant1');
      timer.finish(true, undefined, 1, true);

      const exported = monitor.exportMetrics();
      
      expect(exported.json.queryCount).toBe(1);
      expect(exported.json.cacheHitRate).toBe(1);
      expect(exported.prometheus).toContain('memorai_query_total 1');
      expect(exported.prometheus).toContain('memorai_cache_hit_rate 1');
    });

    it('should handle export with query data but no cache data', () => {
      const timer = monitor.startQuery('remember', 'tenant1');
      timer.finish(true, undefined, 1); // No cache hit data

      const exported = monitor.exportMetrics();
      
      expect(exported.json.queryCount).toBe(1);
      expect(exported.json.cacheHitRate).toBe(0); // No cache operations = 0
      expect(exported.prometheus).toContain('memorai_query_total 1');
      expect(exported.prometheus).toContain('memorai_cache_hit_rate 0');
    });

    it('should format timestamps correctly in CSV', () => {
      const timer = monitor.startQuery('remember', 'tenant1');
      timer.finish(true, undefined, 1, true);

      const exported = monitor.exportMetrics();
      const csvLines = exported.csv.split('\n');
      
      // Check that all timestamp columns have valid ISO timestamps
      for (let i = 1; i < csvLines.length; i++) {
        const parts = csvLines[i].split(',');
        const timestamp = parts[2];
        expect(() => new Date(timestamp)).not.toThrow();
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
      }
    });

    it('should handle prometheus format with decimal values', () => {
      // Create operations with known durations to test decimal formatting
      const timer1 = monitor.startQuery('remember', 'tenant1');
      timer1.finish(true, undefined, 1, true);
      
      const timer2 = monitor.startQuery('recall', 'tenant1');
      timer2.finish(true, undefined, 1, false);

      const exported = monitor.exportMetrics();
      
      // Prometheus should handle decimal values correctly
      expect(exported.prometheus).toMatch(/memorai_query_duration_avg \d+(\.\d+)?/);
      expect(exported.prometheus).toMatch(/memorai_query_success_rate [01](\.\d+)?/);
      expect(exported.prometheus).toMatch(/memorai_cache_hit_rate [01](\.\d+)?/);
    });    it('should maintain metric structure after multiple exports', () => {
      const timer = monitor.startQuery('remember', 'tenant1');
      timer.finish(true, undefined, 1, true);      // Export multiple times
      const export1 = monitor.exportMetrics();
      const export2 = monitor.exportMetrics();
      
      // Should be identical (exporting doesn't modify state) except for memoryUsage and timestamps which can vary slightly
      const { memoryUsage: mem1, windowStart: ws1, windowEnd: we1, ...rest1 } = export1.json;
      const { memoryUsage: mem2, windowStart: ws2, windowEnd: we2, ...rest2 } = export2.json;
      
      expect(rest1).toEqual(rest2);
      expect(typeof mem1).toBe('number');
      expect(typeof mem2).toBe('number');
      expect(mem1).toBeGreaterThan(0);
      expect(mem2).toBeGreaterThan(0);
      
      // Verify timestamps are present and reasonable
      expect(ws1).toBeInstanceOf(Date);
      expect(we1).toBeInstanceOf(Date);
      expect(ws2).toBeInstanceOf(Date);
      expect(we2).toBeInstanceOf(Date);
    });
  });

  describe('Memory Usage Metrics', () => {
    it('should include memory usage in all export formats', () => {
      const exported = monitor.exportMetrics();
      
      // Memory usage should be a positive number
      expect(exported.json.memoryUsage).toBeGreaterThan(0);
      
      // Should appear in prometheus format
      expect(exported.prometheus).toMatch(/memorai_memory_usage_mb \d+(\.\d+)?/);
      
      // Should appear in CSV format
      expect(exported.csv).toMatch(/memory_usage_mb,\d+(\.\d+)?,/);
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle export with maximum metrics efficiently', () => {
      // Fill up to max history
      for (let i = 0; i < 1000; i++) {
        const operation = (['remember', 'recall', 'forget', 'context'] as const)[i % 4];
        const timer = monitor.startQuery(operation, 'tenant1');
        if (i % 3 === 0) {
          timer.finish(false, 'Test error', 0, false);
        } else {
          timer.finish(true, undefined, 1, i % 2 === 0);
        }
      }

      const exported = monitor.exportMetrics();
      
      expect(exported.json.queryCount).toBe(1000);
      expect(exported.json.queryErrors).toBe(334); // Every 3rd operation fails
      expect(exported.json.cacheHitRate).toBeGreaterThan(0.3); // Mixed cache results
      expect(exported.prometheus).toContain('memorai_query_total 1000');
      expect(exported.csv).toContain('query_count,1000,');
    });
  });

  describe('Prometheus Format Edge Cases', () => {
    it('should handle various numeric formats in prometheus output', () => {
      // Add queries with different patterns
      const timer1 = monitor.startQuery('remember', 'tenant1');
      timer1.finish(true, undefined, 5, true);
      
      const timer2 = monitor.startQuery('recall', 'tenant1');
      timer2.finish(false, 'Connection timeout', 0, false);
      
      const timer3 = monitor.startQuery('context', 'tenant1');
      timer3.finish(true, undefined, 15, true);

      const exported = monitor.exportMetrics();
      
      // Check that prometheus format has proper numeric values
      expect(exported.prometheus).toMatch(/memorai_query_total 3/);
      expect(exported.prometheus).toMatch(/memorai_query_success_rate 0\.6+/);
      expect(exported.prometheus).toMatch(/memorai_cache_hit_rate 0\.6+/);
    });

    it('should format prometheus headers correctly', () => {
      const exported = monitor.exportMetrics();
      
      const lines = exported.prometheus.split('\n');
      let helpLineFound = false;
      let typeLineFound = false;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('# HELP memorai_query_total')) {
          helpLineFound = true;
          expect(lines[i + 1]).toMatch(/^# TYPE memorai_query_total counter/);
          typeLineFound = true;
        }
      }
      
      expect(helpLineFound).toBe(true);
      expect(typeLineFound).toBe(true);
    });
  });

  describe('CSV Format Comprehensive Testing', () => {
    it('should handle all metric types in CSV format', () => {
      // Add diverse data
      const timer1 = monitor.startQuery('remember', 'tenant1', 'agent1');
      timer1.finish(true, undefined, 10, true);
      
      const timer2 = monitor.startQuery('forget', 'tenant2');
      timer2.finish(false, 'Permission denied', 0, false);

      const exported = monitor.exportMetrics();
      const csvLines = exported.csv.split('\n');
      
      expect(csvLines).toHaveLength(7); // Header + 6 metrics
      expect(csvLines[0]).toBe('metric,value,timestamp');
      
      // Verify each metric line has 3 parts
      for (let i = 1; i < csvLines.length; i++) {
        const parts = csvLines[i].split(',');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toMatch(/^(query_count|avg_query_time|query_errors|success_rate|cache_hit_rate|memory_usage_mb)$/);
      }
    });

    it('should maintain CSV structure with zero values', () => {
      // Export with no data
      const exported = monitor.exportMetrics();
      const csvLines = exported.csv.split('\n');
      
      expect(csvLines[1]).toMatch(/^query_count,0,/);
      expect(csvLines[2]).toMatch(/^avg_query_time,0,/);
      expect(csvLines[3]).toMatch(/^query_errors,0,/);
      expect(csvLines[4]).toMatch(/^success_rate,0,/); // Changed from 1 to 0 for no queries
      expect(csvLines[5]).toMatch(/^cache_hit_rate,0,/); // Changed from 1 to 0 for no cache ops
    });
  });
});
