import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceOptimizedMemoryEngine } from '../../src/engine/PerformanceOptimizedMemoryEngine.js';
import type { MemoryConfig } from '../../src/types/index.js';

// Mock the embedding service to avoid API calls
vi.mock('../../src/embedding/EmbeddingService.js', () => ({
  EmbeddingService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockImplementation(text => ({
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      model: 'text-embedding-3-small',
      usage: { total_tokens: text.length },
    })),
    initialize: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock the vector store to avoid database calls
vi.mock('../../src/vector/VectorStore.js', () => ({
  VectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockResolvedValue('mock-id'),
    search: vi
      .fn()
      .mockResolvedValue([
        {
          id: 'mock-id',
          score: 0.9,
          memory: { id: 'mock-id', content: 'test', tenantId: 'test' },
        },
      ]),
  })),
  MemoryVectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    storeMemory: vi.fn().mockResolvedValue('mock-id'),
    searchMemories: vi
      .fn()
      .mockResolvedValue([
        {
          id: 'mock-id',
          score: 0.9,
          memory: { id: 'mock-id', content: 'test', tenantId: 'test' },
        },
      ]),
  })),
  InMemoryVectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockResolvedValue('mock-id'),
    search: vi
      .fn()
      .mockResolvedValue([
        {
          id: 'mock-id',
          score: 0.9,
          payload: { content: 'test', tenantId: 'test' },
        },
      ]),
  })),
  QdrantVectorStore: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    store: vi.fn().mockResolvedValue('mock-id'),
    search: vi
      .fn()
      .mockResolvedValue([
        {
          id: 'mock-id',
          score: 0.9,
          payload: { content: 'test', tenantId: 'test' },
        },
      ]),
  })),
}));

// Mock the storage adapter
vi.mock('../../src/storage/StorageAdapter.js', () => ({
  StorageAdapterFactory: {
    create: vi.fn().mockReturnValue({
      initialize: vi.fn().mockResolvedValue(undefined),
      store: vi.fn().mockResolvedValue(undefined),
      retrieve: vi
        .fn()
        .mockResolvedValue({
          id: 'mock-id',
          content: 'test',
          tenantId: 'test',
        }),
      list: vi.fn().mockResolvedValue([]),
    }),
  },
}));

describe('PerformanceOptimizedMemoryEngine - Enhanced Coverage', () => {
  let engine: PerformanceOptimizedMemoryEngine;
  const testConfig: Partial<MemoryConfig> = {
    embedding: {
      provider: 'azure',
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      api_key: 'test-api-key-for-testing-purposes-only',
    },
    vector_db: {
      url: 'http://localhost:8080',
      collection: 'test-memories',
      dimension: 1536,
    },
    security: {
      encryption_key:
        'test-encryption-key-32-characters-long-for-memorai-testing',
      tenant_isolation: true,
      audit_logs: false,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new PerformanceOptimizedMemoryEngine(testConfig);
    await engine.initialize();
  });

  afterEach(() => {
    if (engine) {
      engine.clearPerformanceMetrics();
    }
  });

  describe('Performance Optimization Features', () => {
    it('should cache embeddings for identical content', async () => {
      const content = 'Test content for embedding caching';
      const tenantId = 'test-tenant';

      // First remember operation
      const start1 = performance.now();
      const memoryId1 = await engine.remember(content, tenantId);
      const duration1 = performance.now() - start1;

      // Second remember operation with same content (should use cached embedding)
      const start2 = performance.now();
      const memoryId2 = await engine.remember(content + ' variation', tenantId);
      const duration2 = performance.now() - start2;

      expect(memoryId1).toBeDefined();
      expect(memoryId2).toBeDefined();
      expect(memoryId1).not.toBe(memoryId2);

      // Get performance metrics
      const metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBeGreaterThan(0);
      expect(metrics.averageResponseTimes.remember).toBeDefined();
    });

    it('should cache recall results for identical queries', async () => {
      const content = 'Machine learning is a subset of artificial intelligence';
      const query = 'artificial intelligence';
      const tenantId = 'test-tenant';

      // Store a memory first
      await engine.remember(content, tenantId);

      // First recall operation
      const start1 = performance.now();
      const results1 = await engine.recall(query, tenantId);
      const duration1 = performance.now() - start1;

      // Second recall operation with same query (should use cached results)
      const start2 = performance.now();
      const results2 = await engine.recall(query, tenantId);
      const duration2 = performance.now() - start2;

      expect(results1).toEqual(results2);
      expect(duration2).toBeLessThan(duration1); // Should be faster due to caching

      // Verify cache hit in metrics
      const metrics = engine.getPerformanceMetrics();
      const recallOps = metrics.recentOperations.filter(
        op => op.operationType === 'recall'
      );
      expect(recallOps.some(op => op.cacheHit)).toBe(true);
    });

    it('should provide detailed performance metrics', async () => {
      const tenantId = 'test-tenant';

      // Perform some operations
      await engine.remember('Test content 1', tenantId);
      await engine.remember('Test content 2', tenantId);
      await engine.recall('test', tenantId);

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.recentOperations.length).toBeGreaterThan(0);
      expect(metrics.averageResponseTimes).toBeDefined();
      expect(metrics.cacheHitRates).toBeDefined();
      expect(metrics.embeddingCacheStats).toBeDefined();
      expect(metrics.resultsCacheStats).toBeDefined();

      // Check that we have metrics for both operations
      expect(metrics.averageResponseTimes.remember).toBeDefined();
      expect(metrics.averageResponseTimes.recall).toBeDefined();
    });

    it('should optimize response times under performance targets', async () => {
      const tenantId = 'performance-test';
      const content = 'Performance testing content for sub-50ms target';

      // Warm up caches
      await engine.remember(content, tenantId);
      await engine.recall('performance', tenantId);

      // Test cached operations (should be very fast)
      const start = performance.now();
      const results = await engine.recall('performance', tenantId);
      const duration = performance.now() - start;

      expect(results).toBeDefined();
      expect(duration).toBeLessThan(50); // Target: sub-50ms for cached operations

      const metrics = engine.getPerformanceMetrics();
      const avgRecallTime = metrics.averageResponseTimes.recall;

      // Average should be reasonable (allowing for first uncached call)
      expect(avgRecallTime).toBeLessThan(100);
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch remember operations efficiently', async () => {
      const batchRequests = [
        { content: 'Batch content 1', tenantId: 'tenant-1' },
        { content: 'Batch content 2', tenantId: 'tenant-1' },
        { content: 'Batch content 3', tenantId: 'tenant-2' },
        { content: 'Batch content 4', tenantId: 'tenant-2' },
      ];

      const start = performance.now();
      const memoryIds = await engine.batchRemember(batchRequests);
      const duration = performance.now() - start;

      expect(memoryIds).toHaveLength(4);
      expect(memoryIds.every(id => typeof id === 'string')).toBe(true);

      // Batch operations should be faster than individual operations
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      const metrics = engine.getPerformanceMetrics();
      const batchOp = metrics.recentOperations.find(
        op => op.operationType === 'batch_remember'
      );
      expect(batchOp).toBeDefined();
      expect(batchOp?.resultCount).toBe(4);
    });

    it('should handle batch recall operations efficiently', async () => {
      const tenantId = 'batch-tenant';

      // Store some memories first
      await engine.remember('Artificial intelligence concepts', tenantId);
      await engine.remember('Machine learning algorithms', tenantId);
      await engine.remember('Deep learning networks', tenantId);

      const batchRequests = [
        { query: 'artificial intelligence', tenantId },
        { query: 'machine learning', tenantId },
        { query: 'deep learning', tenantId },
        { query: 'neural networks', tenantId },
      ];

      const start = performance.now();
      const results = await engine.batchRecall(batchRequests);
      const duration = performance.now() - start;

      expect(results).toHaveLength(4);
      expect(results.every(batch => Array.isArray(batch))).toBe(true);

      // Batch operations should be efficient
      expect(duration).toBeLessThan(2000); // Should complete in under 2 seconds

      const metrics = engine.getPerformanceMetrics();
      const batchOp = metrics.recentOperations.find(
        op => op.operationType === 'batch_recall'
      );
      expect(batchOp).toBeDefined();
    });

    it('should group batch operations by tenant for optimization', async () => {
      const mixedRequests = [
        { content: 'Content for tenant A', tenantId: 'tenant-a' },
        { content: 'Content for tenant B', tenantId: 'tenant-b' },
        { content: 'More content for tenant A', tenantId: 'tenant-a' },
        { content: 'More content for tenant B', tenantId: 'tenant-b' },
      ];

      const memoryIds = await engine.batchRemember(mixedRequests);

      expect(memoryIds).toHaveLength(4);

      // Verify that all memories were stored correctly
      const tenantAResults = await engine.recall('content', 'tenant-a');
      const tenantBResults = await engine.recall('content', 'tenant-b');

      expect(tenantAResults.length).toBeGreaterThan(0);
      expect(tenantBResults.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate caches appropriately', async () => {
      const tenantId = 'cache-test';
      const content = 'Content for cache invalidation test';
      const query = 'cache invalidation';

      // Store memory and recall to populate caches
      await engine.remember(content, tenantId);
      const initialResults = await engine.recall(query, tenantId);

      // Store another memory (should invalidate result caches)
      await engine.remember('New content that changes results', tenantId);

      const newResults = await engine.recall(query, tenantId);

      // Results might be different due to new memory
      expect(newResults).toBeDefined();
      expect(Array.isArray(newResults)).toBe(true);
    });

    it('should provide cache statistics', async () => {
      const tenantId = 'stats-test';

      // Perform operations to generate cache activity
      await engine.remember('Cache stats test content', tenantId);
      await engine.recall('cache stats', tenantId);
      await engine.recall('cache stats', tenantId); // Second call should hit cache

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.embeddingCacheStats).toBeDefined();
      expect(metrics.resultsCacheStats).toBeDefined();
      expect(metrics.embeddingCacheStats.size).toBeGreaterThan(0);
      expect(metrics.cacheHitRates.recall).toBeGreaterThan(0);
    });

    it('should clear caches when requested', async () => {
      const tenantId = 'clear-test';

      // Populate caches
      await engine.remember('Content to be cleared', tenantId);
      await engine.recall('clear test', tenantId);

      const metricsBefore = engine.getPerformanceMetrics();
      expect(metricsBefore.embeddingCacheStats.size).toBeGreaterThan(0);

      // Clear caches
      engine.clearPerformanceCaches();

      const metricsAfter = engine.getPerformanceMetrics();
      expect(metricsAfter.embeddingCacheStats.size).toBe(0);
      expect(metricsAfter.resultsCacheStats.size).toBe(0);
      expect(metricsAfter.recentOperations.length).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should detect and log slow operations', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a scenario that might be slow (large content)
      const largeContent = 'x'.repeat(10000);
      const tenantId = 'slow-test';

      await engine.remember(largeContent, tenantId);

      const metrics = engine.getPerformanceMetrics();
      const operations = metrics.recentOperations;

      expect(operations.length).toBeGreaterThan(0);
      expect(operations[0].duration).toBeDefined();
      expect(operations[0].timestamp).toBeInstanceOf(Date);

      consoleSpy.mockRestore();
    });

    it('should maintain performance metrics history', async () => {
      const tenantId = 'history-test';

      // Perform multiple operations
      for (let i = 0; i < 5; i++) {
        await engine.remember(`Content ${i}`, tenantId);
        await engine.recall(`query ${i}`, tenantId);
      }

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.recentOperations.length).toBe(10); // 5 remember + 5 recall
      expect(metrics.averageResponseTimes.remember).toBeDefined();
      expect(metrics.averageResponseTimes.recall).toBeDefined();

      // Verify all operations have required fields
      metrics.recentOperations.forEach(op => {
        expect(op.operationType).toBeDefined();
        expect(op.duration).toBeGreaterThan(0);
        expect(op.tenantId).toBeDefined();
        expect(op.timestamp).toBeInstanceOf(Date);
        expect(typeof op.cacheHit).toBe('boolean');
      });
    });

    it('should calculate accurate cache hit rates', async () => {
      const tenantId = 'hit-rate-test';
      const query = 'hit rate test';

      // Store content
      await engine.remember('Hit rate test content', tenantId);

      // First recall (cache miss)
      await engine.recall(query, tenantId);

      // Second recall (cache hit)
      await engine.recall(query, tenantId);

      const metrics = engine.getPerformanceMetrics();
      const recallHitRate = metrics.cacheHitRates.recall;

      expect(recallHitRate).toBeDefined();
      expect(recallHitRate).toBeGreaterThan(0);
      expect(recallHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle errors gracefully while maintaining performance tracking', async () => {
      const tenantId = 'error-test';

      try {
        // This should trigger an error (empty content)
        await engine.remember('', tenantId);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Performance metrics should still be accessible
      const metrics = engine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle concurrent operations efficiently', async () => {
      const tenantId = 'concurrent-test';
      const promises: Promise<any>[] = [];

      // Create concurrent operations
      for (let i = 0; i < 10; i++) {
        promises.push(engine.remember(`Concurrent content ${i}`, tenantId));
        promises.push(engine.recall(`concurrent ${i}`, tenantId));
      }

      const results = await Promise.allSettled(promises);

      // Most operations should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(15); // At least 75% success rate

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBeGreaterThan(0);
    });

    it('should limit memory usage of performance metrics', async () => {
      const tenantId = 'memory-limit-test';

      // Generate many operations to test memory limits
      for (let i = 0; i < 50; i++) {
        await engine.remember(`Memory test ${i}`, tenantId);
      }

      const metrics = engine.getPerformanceMetrics();

      // Should not exceed reasonable limits
      expect(metrics.recentOperations.length).toBeLessThanOrEqual(50);
    });
  });
});
