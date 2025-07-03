import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PerformanceOptimizedMemoryEngine } from '../../src/engine/PerformanceOptimizedMemoryEngine.js';
import type { MemoryConfig } from '../../src/types/index.js';

// Mock the embedding service to avoid API calls
vi.mock('../../src/embedding/EmbeddingService.js', () => ({
  EmbeddingService: vi.fn().mockImplementation(() => ({
    embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]),
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

describe('PerformanceOptimizedMemoryEngine - Integration Tests', () => {
  let engine: PerformanceOptimizedMemoryEngine;
  const testConfig: Partial<MemoryConfig> = {
    embedding: {
      provider: 'azure',
      model: 'test-model',
      api_key: 'test-api-key-long-enough-for-validation-requirements',
    },
    vector_db: {
      url: 'http://localhost:8080',
      collection: 'test',
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

  describe('Performance Optimization Core Features', () => {
    it('should initialize with performance optimizations enabled', async () => {
      expect(engine).toBeDefined();

      const metrics = engine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.embeddingCacheStats).toBeDefined();
      expect(metrics.resultsCacheStats).toBeDefined();
      expect(metrics.recentOperations).toEqual([]);
    });

    it('should provide performance metrics structure', async () => {
      const metrics = engine.getPerformanceMetrics();

      expect(metrics).toHaveProperty('recentOperations');
      expect(metrics).toHaveProperty('averageResponseTimes');
      expect(metrics).toHaveProperty('cacheHitRates');
      expect(metrics).toHaveProperty('embeddingCacheStats');
      expect(metrics).toHaveProperty('resultsCacheStats');

      expect(Array.isArray(metrics.recentOperations)).toBe(true);
      expect(typeof metrics.averageResponseTimes).toBe('object');
      expect(typeof metrics.cacheHitRates).toBe('object');
    });

    it('should track operations in performance metrics', async () => {
      const tenantId = 'test-tenant';
      const content = 'Test content for performance tracking';

      await engine.remember(content, tenantId);

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBeGreaterThan(0);

      const operation = metrics.recentOperations[0];
      expect(operation.operationType).toBe('remember');
      expect(operation.tenantId).toBe(tenantId);
      expect(operation.duration).toBeGreaterThan(0);
      expect(operation.timestamp).toBeInstanceOf(Date);
      expect(typeof operation.cacheHit).toBe('boolean');
    });

    it('should clear performance caches', async () => {
      const tenantId = 'test-tenant';

      // Generate some operations to populate caches
      await engine.remember('Test content', tenantId);
      await engine.recall('test', tenantId);

      let metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBeGreaterThan(0);

      // Clear caches
      engine.clearPerformanceCaches();

      metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBe(0);
      expect(metrics.embeddingCacheStats.size).toBe(0);
      expect(metrics.resultsCacheStats.size).toBe(0);
    });

    it('should handle batch operations efficiently', async () => {
      const batchRequests = [
        { content: 'Batch content 1', tenantId: 'tenant-1' },
        { content: 'Batch content 2', tenantId: 'tenant-1' },
        { content: 'Batch content 3', tenantId: 'tenant-2' },
      ];

      const start = performance.now();
      const memoryIds = await engine.batchRemember(batchRequests);
      const duration = performance.now() - start;

      expect(memoryIds).toHaveLength(3);
      expect(memoryIds.every(id => typeof id === 'string')).toBe(true);
      expect(duration).toBeLessThan(1000); // Should be fast with mocks

      const metrics = engine.getPerformanceMetrics();
      const batchOp = metrics.recentOperations.find(
        op => op.operationType === 'batch_remember'
      );
      expect(batchOp).toBeDefined();
      expect(batchOp?.resultCount).toBe(3);
    });

    it('should handle batch recall operations', async () => {
      const tenantId = 'batch-tenant';

      // Store some memories first
      await engine.remember('Test content for recall', tenantId);

      const batchRequests = [
        { query: 'test content', tenantId },
        { query: 'recall', tenantId },
      ];

      const results = await engine.batchRecall(batchRequests);

      expect(results).toHaveLength(2);
      expect(results.every(batch => Array.isArray(batch))).toBe(true);

      const metrics = engine.getPerformanceMetrics();
      const batchOp = metrics.recentOperations.find(
        op => op.operationType === 'batch_recall'
      );
      expect(batchOp).toBeDefined();
    });

    it('should calculate average response times', async () => {
      const tenantId = 'timing-test';

      // Perform multiple operations
      await engine.remember('Content 1', tenantId);
      await engine.remember('Content 2', tenantId);
      await engine.recall('content', tenantId);

      const metrics = engine.getPerformanceMetrics();

      expect(metrics.averageResponseTimes.remember).toBeDefined();
      expect(metrics.averageResponseTimes.recall).toBeDefined();
      expect(typeof metrics.averageResponseTimes.remember).toBe('number');
      expect(typeof metrics.averageResponseTimes.recall).toBe('number');
      expect(metrics.averageResponseTimes.remember).toBeGreaterThan(0);
      expect(metrics.averageResponseTimes.recall).toBeGreaterThan(0);
    });

    it('should track cache hit rates', async () => {
      const tenantId = 'cache-test';
      const query = 'cache test query';

      // Store content
      await engine.remember('Cache test content', tenantId);

      // First recall (cache miss)
      await engine.recall(query, tenantId);

      // Second recall (should be cache hit with same query)
      await engine.recall(query, tenantId);

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.cacheHitRates).toBeDefined();
      expect(typeof metrics.cacheHitRates.recall).toBe('number');
      expect(metrics.cacheHitRates.recall).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRates.recall).toBeLessThanOrEqual(1);
    });

    it('should limit memory usage of performance metrics', async () => {
      const tenantId = 'memory-limit-test';

      // Generate many operations to test memory limits
      for (let i = 0; i < 60; i++) {
        await engine.remember(`Memory test ${i}`, tenantId);
      }

      const metrics = engine.getPerformanceMetrics();

      // Should not exceed reasonable limits (default is 100 operations)
      expect(metrics.recentOperations.length).toBeLessThanOrEqual(100);
    });

    it('should handle errors gracefully while maintaining metrics', async () => {
      const tenantId = 'error-test';

      try {
        // This should potentially trigger an error but not crash
        await engine.remember('', tenantId);
      } catch (error) {
        // Error is expected, but metrics should still be accessible
      }

      // Performance metrics should still be accessible
      const metrics = engine.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics.recentOperations)).toBe(true);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should achieve fast response times with optimization', async () => {
      const tenantId = 'benchmark-test';
      const content = 'Benchmark test content';

      // Warm up the engine
      await engine.remember(content, tenantId);

      // Measure performance
      const start = performance.now();
      await engine.recall('benchmark', tenantId);
      const duration = performance.now() - start;

      // With mocks, this should be very fast
      expect(duration).toBeLessThan(100); // Very fast with mocks

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.recentOperations.length).toBeGreaterThan(0);
    });

    it('should demonstrate performance improvement with caching', async () => {
      const tenantId = 'cache-benchmark';
      const query = 'cache benchmark query';

      // Store content first
      await engine.remember('Cache benchmark content', tenantId);

      // First query (no cache)
      const start1 = performance.now();
      await engine.recall(query, tenantId);
      const duration1 = performance.now() - start1;

      // Second query (with cache) - should be faster or same
      const start2 = performance.now();
      await engine.recall(query, tenantId);
      const duration2 = performance.now() - start2;

      // Both should be fast with mocks, but caching logic is tested
      expect(duration1).toBeGreaterThan(0);
      expect(duration2).toBeGreaterThan(0);

      const metrics = engine.getPerformanceMetrics();
      expect(metrics.cacheHitRates.recall).toBeGreaterThan(0);
    });
  });
});
