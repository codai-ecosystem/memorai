import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor, type QueryMetrics } from '../../src/monitoring/PerformanceMonitor';

describe('PerformanceMonitor - 110% Coverage Perfection Tests', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor(60000, 1000);
  });

  describe('Advanced Query Timing', () => {
    it('should handle startQuery finish callback with all optional parameters', () => {
      const queryTimer = monitor.startQuery('remember', 'tenant1', 'agent1');
      
      // Finish with all optional parameters
      queryTimer.finish(true, 'operation completed', 5, true);
      
      const metrics = monitor.getMetrics();
      expect(metrics.queryCount).toBe(1);
      expect(metrics.querySuccessRate).toBe(1);
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheHitRate).toBe(1);
    });

    it('should handle startQuery finish callback with minimal parameters', () => {
      const queryTimer = monitor.startQuery('recall', 'tenant2');
      
      // Finish with just success flag
      queryTimer.finish(false);
      
      const metrics = monitor.getMetrics();
      expect(metrics.queryCount).toBe(1);
      expect(metrics.querySuccessRate).toBe(0);
      expect(metrics.queryErrors).toBe(1);
    });

    it('should handle startQuery finish callback with partial parameters', () => {
      const queryTimer = monitor.startQuery('context', 'tenant3', 'agent3');
      
      // Finish with success and error but no result count or cache hit
      queryTimer.finish(false, 'context generation failed');
      
      const metrics = monitor.getMetrics();
      expect(metrics.queryCount).toBe(1);
      expect(metrics.queryErrors).toBe(1);
    });    it('should track operation-specific timing accurately', async () => {
      // Add different operations with known durations
      const remember1 = monitor.startQuery('remember', 'tenant1');
      const recall1 = monitor.startQuery('recall', 'tenant1');
      const forget1 = monitor.startQuery('forget', 'tenant1');
      const context1 = monitor.startQuery('context', 'tenant1');
      
      // Simulate processing time with a small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      
      remember1.finish(true);
      recall1.finish(true);
      forget1.finish(true);  
      context1.finish(true);
      
      const metrics = monitor.getMetrics();
      expect(metrics.rememberCount).toBe(1);
      expect(metrics.recallCount).toBe(1);
      expect(metrics.forgetCount).toBe(1);
      expect(metrics.contextCount).toBe(1);
      expect(metrics.avgRememberTime).toBeGreaterThan(0);
      expect(metrics.avgRecallTime).toBeGreaterThan(0);
      expect(metrics.avgForgetTime).toBeGreaterThan(0);
      expect(metrics.avgContextTime).toBeGreaterThan(0);
    });
  });

  describe('Tenant-Specific Metrics', () => {
    it('should isolate metrics by tenant correctly', () => {
      // Add metrics for different tenants
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1',
        agentId: 'agent1'
      });

      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 200,
        endTime: Date.now(),
        duration: 200,
        success: false,
        tenantId: 'tenant2',
        agentId: 'agent2',
        error: 'not found'
      });

      monitor.recordQuery({
        operation: 'context',
        startTime: Date.now() - 150,
        endTime: Date.now(),
        duration: 150,
        success: true,
        tenantId: 'tenant1',
        agentId: 'agent1'
      });

      // Test tenant1 metrics
      const tenant1Metrics = monitor.getTenantMetrics('tenant1');
      expect(tenant1Metrics.queryCount).toBe(2);
      expect(tenant1Metrics.querySuccessRate).toBe(1);
      expect(tenant1Metrics.rememberCount).toBe(1);
      expect(tenant1Metrics.contextCount).toBe(1);
      expect(tenant1Metrics.queryErrors).toBe(0);

      // Test tenant2 metrics
      const tenant2Metrics = monitor.getTenantMetrics('tenant2');
      expect(tenant2Metrics.queryCount).toBe(1);
      expect(tenant2Metrics.querySuccessRate).toBe(0);
      expect(tenant2Metrics.recallCount).toBe(1);
      expect(tenant2Metrics.queryErrors).toBe(1);

      // Test non-existent tenant
      const tenant3Metrics = monitor.getTenantMetrics('tenant3');
      expect(tenant3Metrics.queryCount).toBe(0);
      expect(tenant3Metrics.querySuccessRate).toBe(0);
    });

    it('should handle tenant metrics with empty window', () => {
      // Add old metrics outside the window
      const oldTime = Date.now() - 120000; // 2 minutes ago
      monitor.recordQuery({
        operation: 'remember',
        startTime: oldTime - 100,
        endTime: oldTime,
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const tenantMetrics = monitor.getTenantMetrics('tenant1');
      expect(tenantMetrics.queryCount).toBe(0);
    });
  });

  describe('Slow Query Analysis', () => {
    it('should identify slow queries correctly', () => {
      // Add queries with different durations
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        duration: 5000,
        success: true,
        tenantId: 'tenant1'
      });

      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 2000,
        endTime: Date.now(),
        duration: 2000,
        success: true,
        tenantId: 'tenant1'
      });

      monitor.recordQuery({
        operation: 'context',
        startTime: Date.now() - 500,
        endTime: Date.now(),
        duration: 500,
        success: true,
        tenantId: 'tenant1'
      });

      // Get slow queries with 1000ms threshold
      const slowQueries = monitor.getSlowQueries(1000, 10);
      expect(slowQueries).toHaveLength(2);
      expect(slowQueries[0].duration).toBe(5000); // Sorted by duration desc
      expect(slowQueries[1].duration).toBe(2000);
    });

    it('should limit slow query results correctly', () => {
      // Add 5 slow queries
      for (let i = 0; i < 5; i++) {
        monitor.recordQuery({
          operation: 'remember',
          startTime: Date.now() - (2000 + i * 100),
          endTime: Date.now(),
          duration: 2000 + i * 100,
          success: true,
          tenantId: 'tenant1'
        });
      }

      // Request only 3 results
      const slowQueries = monitor.getSlowQueries(1000, 3);
      expect(slowQueries).toHaveLength(3);
      // Should be sorted by duration descending
      expect(slowQueries[0].duration).toBeGreaterThan(slowQueries[1].duration);
      expect(slowQueries[1].duration).toBeGreaterThan(slowQueries[2].duration);
    });

    it('should handle no slow queries', () => {
      // Add only fast queries
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const slowQueries = monitor.getSlowQueries(1000, 10);
      expect(slowQueries).toHaveLength(0);
    });
  });

  describe('Error Analysis', () => {
    it('should aggregate errors correctly', () => {
      const now = Date.now();
      
      // Add multiple errors of same type
      monitor.recordQuery({
        operation: 'remember',
        startTime: now - 100,
        endTime: now,
        duration: 100,
        success: false,
        tenantId: 'tenant1',
        error: 'connection timeout'
      });

      monitor.recordQuery({
        operation: 'recall',
        startTime: now - 200,
        endTime: now - 50,
        duration: 150,
        success: false,
        tenantId: 'tenant2',
        error: 'connection timeout'
      });

      // Add different error
      monitor.recordQuery({
        operation: 'context',
        startTime: now - 300,
        endTime: now - 100,
        duration: 200,
        success: false,
        tenantId: 'tenant1',
        error: 'invalid input'
      });

      const errorAnalysis = monitor.getErrorAnalysis();
      expect(errorAnalysis).toHaveLength(2);
      
      // Should be sorted by count descending
      expect(errorAnalysis[0].error).toBe('connection timeout');
      expect(errorAnalysis[0].count).toBe(2);
      expect(errorAnalysis[0].lastOccurrence.getTime()).toBe(now);
      
      expect(errorAnalysis[1].error).toBe('invalid input');
      expect(errorAnalysis[1].count).toBe(1);
      expect(errorAnalysis[1].lastOccurrence.getTime()).toBe(now - 100);
    });

    it('should handle no errors gracefully', () => {
      // Add only successful queries
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const errorAnalysis = monitor.getErrorAnalysis();
      expect(errorAnalysis).toHaveLength(0);
    });

    it('should ignore successful queries in error analysis', () => {
      // Mix of success and failure
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: false,
        tenantId: 'tenant1',
        error: 'test error'
      });

      const errorAnalysis = monitor.getErrorAnalysis();
      expect(errorAnalysis).toHaveLength(1);
      expect(errorAnalysis[0].error).toBe('test error');
      expect(errorAnalysis[0].count).toBe(1);
    });

    it('should handle queries without error field', () => {
      // Failed query without error message
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: false,
        tenantId: 'tenant1'
        // no error field
      });

      const errorAnalysis = monitor.getErrorAnalysis();
      expect(errorAnalysis).toHaveLength(0);
    });
  });

  describe('Query History Management', () => {
    it('should return correct number of recent queries', () => {
      // Add 5 queries
      for (let i = 0; i < 5; i++) {
        monitor.recordQuery({
          operation: 'remember',
          startTime: Date.now() - (100 * (5 - i)),
          endTime: Date.now() - (100 * (5 - i - 1)),
          duration: 100,
          success: true,
          tenantId: `tenant${i}`
        });
      }

      // Get last 3 queries
      const history = monitor.getQueryHistory(3);
      expect(history).toHaveLength(3);
      
      // Should be in reverse chronological order (most recent first)
      expect(history[0].tenantId).toBe('tenant4');
      expect(history[1].tenantId).toBe('tenant3');
      expect(history[2].tenantId).toBe('tenant2');
    });

    it('should default to 100 queries when no count specified', () => {
      // Add 150 queries
      for (let i = 0; i < 150; i++) {
        monitor.recordQuery({
          operation: 'remember',
          startTime: Date.now() - 100,
          endTime: Date.now(),
          duration: 100,
          success: true,
          tenantId: `tenant${i}`
        });
      }

      const history = monitor.getQueryHistory();
      expect(history).toHaveLength(100);
    });

    it('should handle empty query history', () => {
      const history = monitor.getQueryHistory(10);
      expect(history).toHaveLength(0);
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should enforce max history size limit', () => {
      const smallMonitor = new PerformanceMonitor(60000, 5); // Small max size
      
      // Add more queries than the limit
      for (let i = 0; i < 10; i++) {
        smallMonitor.recordQuery({
          operation: 'remember',
          startTime: Date.now() - 100,
          endTime: Date.now(),
          duration: 100,
          success: true,
          tenantId: `tenant${i}`
        });
      }

      const history = smallMonitor.getQueryHistory(20);
      expect(history).toHaveLength(5); // Should be trimmed to max size
      
      // Should keep the most recent ones
      expect(history[0].tenantId).toBe('tenant9');
      expect(history[4].tenantId).toBe('tenant5');
    });

    it('should handle window filtering correctly', () => {
      const shortWindowMonitor = new PerformanceMonitor(1000, 1000); // 1 second window
      
      const now = Date.now();
      
      // Add old query outside window
      shortWindowMonitor.recordQuery({
        operation: 'remember',
        startTime: now - 5000,
        endTime: now - 4000,
        duration: 1000,
        success: true,
        tenantId: 'old-tenant'
      });

      // Add recent query inside window
      shortWindowMonitor.recordQuery({
        operation: 'recall',
        startTime: now - 500,
        endTime: now,
        duration: 500,
        success: true,
        tenantId: 'recent-tenant'
      });

      const metrics = shortWindowMonitor.getMetrics();
      expect(metrics.queryCount).toBe(1); // Only recent query should count
      expect(metrics.recallCount).toBe(1);
      expect(metrics.rememberCount).toBe(0);
    });

    it('should calculate averages correctly with zero operations', () => {
      // Add only 'remember' operations, no other types
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const metrics = monitor.getMetrics();
      expect(metrics.avgRememberTime).toBe(100);
      expect(metrics.avgRecallTime).toBe(0); // No recall operations
      expect(metrics.avgForgetTime).toBe(0);  // No forget operations
      expect(metrics.avgContextTime).toBe(0); // No context operations
    });
  });

  describe('Cache Analytics Edge Cases', () => {
    it('should handle mixed cache and non-cache operations', () => {
      // Cache hit
      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1',
        cacheHit: true
      });

      // Cache miss  
      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1',
        cacheHit: false
      });

      // No cache info (e.g., remember operation)
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
        // no cacheHit field
      });

      const metrics = monitor.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.cacheHitRate).toBe(0.5); // 1 hit out of 2 cacheable operations
    });

    it('should handle all cache hits', () => {
      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1',
        cacheHit: true
      });

      monitor.recordQuery({
        operation: 'recall',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1',
        cacheHit: true
      });

      const metrics = monitor.getMetrics();
      expect(metrics.cacheHits).toBe(2);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.cacheHitRate).toBe(1);
    });

    it('should handle no cacheable operations', () => {
      // Only non-cacheable operations
      monitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const metrics = monitor.getMetrics();
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });
  });

  describe('Constructor Edge Cases', () => {
    it('should use default values when no parameters provided', () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
      
      // Test that it works with defaults
      defaultMonitor.recordQuery({
        operation: 'remember',
        startTime: Date.now() - 100,
        endTime: Date.now(),
        duration: 100,
        success: true,
        tenantId: 'tenant1'
      });

      const metrics = defaultMonitor.getMetrics();
      expect(metrics.queryCount).toBe(1);
    });

    it('should handle custom window size', () => {
      const customMonitor = new PerformanceMonitor(5000, 100); // 5 second window
      const now = Date.now();
      
      // Add query just outside the window
      customMonitor.recordQuery({
        operation: 'remember',
        startTime: now - 6000,
        endTime: now - 5500,
        duration: 500,
        success: true,
        tenantId: 'tenant1'
      });

      // Add query inside the window
      customMonitor.recordQuery({
        operation: 'recall',
        startTime: now - 2000,
        endTime: now - 1500,
        duration: 500,
        success: true,
        tenantId: 'tenant1'
      });

      const metrics = customMonitor.getMetrics();
      expect(metrics.queryCount).toBe(1); // Only the recent one
      expect(metrics.recallCount).toBe(1);
      expect(metrics.rememberCount).toBe(0);
    });
  });
});
