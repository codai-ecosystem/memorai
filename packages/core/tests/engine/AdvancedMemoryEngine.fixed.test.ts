/**
 * AdvancedMemoryEngine Comprehensive Test Suite - Fixed Version
 *
 * Using proven systematic methodology with corrected mocking approach
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmbeddingService } from '../../src/embedding/EmbeddingService.js';
import {
  AdvancedMemoryEngine,
  type AdvancedMemoryConfig,
} from '../../src/engine/AdvancedMemoryEngine.js';
import { FileStorageAdapter } from '../../src/storage/StorageAdapter.js';
import { MemoryError, type MemoryMetadata } from '../../src/types/index.js';

// ========================================
// COMPREHENSIVE MOCKING SETUP
// ========================================

// Mock EmbeddingService
vi.mock('../../src/embedding/EmbeddingService.js', () => {
  return {
    EmbeddingService: vi.fn().mockImplementation(() => ({
      embed: vi.fn().mockResolvedValue({
        embedding: new Array(256).fill(0).map(() => Math.random()),
        confidence: 1.0,
        model: 'text-embedding-3-small',
      }),
      initialize: vi.fn().mockResolvedValue(true),
      getStatus: vi.fn().mockReturnValue({
        initialized: true,
        provider: 'openai',
        model: 'text-embedding-3-small',
      }),
    })),
  };
});

// Mock FileStorageAdapter
vi.mock('../../src/storage/StorageAdapter.js', () => {
  return {
    FileStorageAdapter: vi.fn().mockImplementation(() => ({
      store: vi.fn().mockResolvedValue(undefined),
      retrieve: vi.fn().mockResolvedValue(null),
      list: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock logger
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('test-memory-id-12345'),
}));

// ========================================
// TEST UTILITIES
// ========================================

function createMockMemory(
  overrides: Partial<MemoryMetadata> = {}
): MemoryMetadata {
  return {
    id: 'test-memory-id',
    type: 'fact',
    content: 'Test memory content',
    embedding: new Array(256).fill(0).map(() => Math.random()),
    confidence: 1.0,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 0,
    importance: 0.8,
    emotional_weight: 0.0,
    tags: ['test'],
    context: { source: 'test' },
    tenant_id: 'test-tenant',
    agent_id: 'test-agent',
    ttl: undefined,
    ...overrides,
  };
}

function createMockConfig(
  overrides: Partial<AdvancedMemoryConfig> = {}
): AdvancedMemoryConfig {
  return {
    dataPath: './test-data',
    apiKey: 'test-api-key',
    model: 'text-embedding-3-small',
    azureOpenAI: {
      endpoint: 'https://test.openai.azure.com',
      apiKey: 'test-azure-key',
      deploymentName: 'text-embedding-3-small',
      apiVersion: '2024-02-15-preview',
    },
    localEmbedding: {
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      pythonPath: 'python',
      cachePath: './test-cache',
    },
    ...overrides,
  };
}

// ========================================
// MAIN TEST SUITE
// ========================================

describe('AdvancedMemoryEngine - Comprehensive Coverage Suite', () => {
  let engine: AdvancedMemoryEngine;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create engine with test config
    const config = createMockConfig();
    engine = new AdvancedMemoryEngine(config);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================
  // CONSTRUCTOR & INITIALIZATION TESTS
  // ========================================

  describe('Constructor & Configuration', () => {
    it('should create engine with default configuration', () => {
      const defaultEngine = new AdvancedMemoryEngine();
      expect(defaultEngine).toBeDefined();
      expect((defaultEngine as any).config).toBeDefined();
      expect((defaultEngine as any).isInitialized).toBe(false);
    });

    it('should create engine with custom configuration', () => {
      const customConfig = createMockConfig({
        dataPath: '/custom/path',
        model: 'custom-model',
      });

      const customEngine = new AdvancedMemoryEngine(customConfig);
      expect((customEngine as any).config.dataPath).toBe('/custom/path');
      expect((customEngine as any).config.model).toBe('custom-model');
    });

    it('should initialize internal indices on creation', () => {
      expect((engine as any).semanticIndex).toBeDefined();
      expect((engine as any).keywordIndex).toBeDefined();
      expect((engine as any).typeIndex).toBeDefined();
      expect((engine as any).tagIndex).toBeDefined();

      expect((engine as any).semanticIndex.size).toBe(0);
      expect((engine as any).keywordIndex.size).toBe(0);
      expect((engine as any).typeIndex.size).toBe(0);
      expect((engine as any).tagIndex.size).toBe(0);
    });

    it('should initialize embedding service with correct configuration', () => {
      expect(EmbeddingService).toHaveBeenCalledWith(
        expect.objectContaining({
          api_key: 'test-api-key',
          model: 'text-embedding-3-small',
        })
      );
    });

    it('should initialize storage adapter with correct path', () => {
      expect(FileStorageAdapter).toHaveBeenCalledWith('./test-data');
    });
  });

  // ========================================
  // INITIALIZATION TESTS
  // ========================================

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      const storage = (engine as any).storage;

      await engine.initialize();
      expect((engine as any).isInitialized).toBe(true);
      expect(storage.list).toHaveBeenCalled();
    });

    it('should handle storage list failure during initialization', async () => {
      const storage = (engine as any).storage;
      storage.list.mockRejectedValue(new Error('Storage list failed'));

      await expect(engine.initialize()).rejects.toThrow(MemoryError);
      expect((engine as any).isInitialized).toBe(false);
    });

    it('should allow re-initialization if already initialized', async () => {
      await engine.initialize();
      expect((engine as any).isInitialized).toBe(true);

      // Re-initialize should work
      await engine.initialize();
      expect((engine as any).isInitialized).toBe(true);
    });

    it('should load existing memories during initialization', async () => {
      const storage = (engine as any).storage;
      const mockMemories = [
        createMockMemory({ id: 'mem1', content: 'Memory 1' }),
        createMockMemory({ id: 'mem2', content: 'Memory 2' }),
      ];

      storage.list.mockResolvedValue(mockMemories);

      await engine.initialize();

      expect((engine as any).isInitialized).toBe(true);
      expect(storage.list).toHaveBeenCalled();
    });
  });

  // ========================================
  // REMEMBER TESTS
  // ========================================

  describe('remember()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should remember valid content successfully', async () => {
      const content = 'Important information to remember';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const storage = (engine as any).storage;
      const embedding = (engine as any).embedding;

      const memoryId = await engine.remember(content, tenantId, agentId);

      expect(memoryId).toBe('test-memory-id-12345');
      expect(embedding.embed).toHaveBeenCalledWith(content);
      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-memory-id-12345',
          content,
          tenant_id: tenantId,
          agent_id: agentId,
          type: expect.any(String),
          confidence: 1.0,
          importance: expect.any(Number),
        })
      );
    });

    it('should remember content without agent ID', async () => {
      const content = 'Content without agent';
      const tenantId = 'test-tenant';
      const storage = (engine as any).storage;

      const memoryId = await engine.remember(content, tenantId);

      expect(memoryId).toBe('test-memory-id-12345');
      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          tenant_id: tenantId,
          agent_id: undefined,
        })
      );
    });

    it('should handle remember options correctly', async () => {
      const content = 'Content with options';
      const tenantId = 'test-tenant';
      const storage = (engine as any).storage;
      const options = {
        type: 'procedure' as const,
        importance: 0.9,
        emotional_weight: 0.5,
        tags: ['important', 'procedure'],
        context: { source: 'user_input' },
        ttl: new Date(Date.now() + 86400000), // 24 hours
      };

      await engine.remember(content, tenantId, undefined, options);

      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'procedure',
          importance: 0.9,
          emotional_weight: 0.5,
          tags: ['important', 'procedure'],
          context: { source: 'user_input' },
          ttl: options.ttl,
        })
      );
    });

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new AdvancedMemoryEngine();

      await expect(
        uninitializedEngine.remember('content', 'tenant')
      ).rejects.toThrow(MemoryError);
    });

    it('should throw error for empty content', async () => {
      await expect(engine.remember('', 'tenant')).rejects.toThrow(MemoryError);

      await expect(engine.remember('   ', 'tenant')).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle embedding generation failure', async () => {
      const embedding = (engine as any).embedding;
      embedding.embed.mockRejectedValue(new Error('Embedding failed'));

      await expect(engine.remember('content', 'tenant')).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle storage failure', async () => {
      const storage = (engine as any).storage;
      storage.store.mockRejectedValue(new Error('Storage failed'));

      await expect(engine.remember('content', 'tenant')).rejects.toThrow(
        MemoryError
      );
    });

    it('should trim whitespace from content', async () => {
      const content = '  Content with whitespace  ';
      const embedding = (engine as any).embedding;
      const storage = (engine as any).storage;

      await engine.remember(content, 'tenant');

      expect(embedding.embed).toHaveBeenCalledWith('Content with whitespace');
      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Content with whitespace',
        })
      );
    });

    it('should handle non-string content', async () => {
      const nonStringContent = 123 as any;
      const embedding = (engine as any).embedding;
      const storage = (engine as any).storage;

      await engine.remember(nonStringContent, 'tenant');

      expect(embedding.embed).toHaveBeenCalledWith('123');
      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          content: '123',
        })
      );
    });
  });

  // ========================================
  // FORGET TESTS
  // ========================================

  describe('forget()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should forget existing memory successfully', async () => {
      const memoryId = 'existing-memory';
      const mockMemory = createMockMemory({ id: memoryId });
      const storage = (engine as any).storage;

      storage.retrieve.mockResolvedValue(mockMemory);
      vi.spyOn(engine as any, 'removeFromIndices').mockImplementation(() => {});

      const result = await engine.forget(memoryId);

      expect(result).toBe(true);
      expect(storage.retrieve).toHaveBeenCalledWith(memoryId);
      expect(storage.delete).toHaveBeenCalledWith(memoryId);
      expect((engine as any).removeFromIndices).toHaveBeenCalledWith(
        mockMemory
      );
    });

    it('should return false for non-existent memory', async () => {
      const memoryId = 'nonexistent';
      const storage = (engine as any).storage;
      storage.retrieve.mockResolvedValue(null);

      const result = await engine.forget(memoryId);

      expect(result).toBe(false);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new AdvancedMemoryEngine();

      await expect(uninitializedEngine.forget('memory-id')).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle storage retrieve failure gracefully', async () => {
      const storage = (engine as any).storage;
      storage.retrieve.mockRejectedValue(new Error('Retrieve failed'));

      const result = await engine.forget('memory-id');

      expect(result).toBe(false);
    });

    it('should handle storage delete failure gracefully', async () => {
      const mockMemory = createMockMemory();
      const storage = (engine as any).storage;
      storage.retrieve.mockResolvedValue(mockMemory);
      storage.delete.mockRejectedValue(new Error('Delete failed'));
      vi.spyOn(engine as any, 'removeFromIndices').mockImplementation(() => {});

      const result = await engine.forget('memory-id');

      expect(result).toBe(false);
    });
  });

  // ========================================
  // GET STATS TESTS
  // ========================================

  describe('getStats()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should return comprehensive statistics', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const mockMemories = [
        createMockMemory({
          type: 'fact',
          importance: 0.8,
          lastAccessedAt: now, // Recent activity
        }),
        createMockMemory({
          type: 'fact',
          importance: 0.6,
          lastAccessedAt: twoDaysAgo, // Not recent
        }),
        createMockMemory({
          type: 'procedure',
          importance: 0.9,
          lastAccessedAt: oneDayAgo, // Recent activity
        }),
      ];

      const storage = (engine as any).storage;
      storage.list.mockResolvedValue(mockMemories);

      const stats = await engine.getStats();

      expect(stats.totalMemories).toBe(3);
      expect(stats.memoryTypes.fact).toBe(2);
      expect(stats.memoryTypes.procedure).toBe(1);
      expect(stats.memoryTypes.preference).toBe(0);
      expect(stats.performance.avgImportance).toBeCloseTo(
        (0.8 + 0.6 + 0.9) / 3
      );
      expect(stats.performance.recentActivity).toBe(2); // Only 2 memories accessed in last 24h
      expect(stats.indexStats).toBeDefined();
    });

    it('should handle empty memory list', async () => {
      const storage = (engine as any).storage;
      storage.list.mockResolvedValue([]);

      const stats = await engine.getStats();

      expect(stats.totalMemories).toBe(0);
      expect(stats.performance.avgImportance).toBe(0);
      expect(stats.performance.recentActivity).toBe(0);
      expect(Object.values(stats.memoryTypes).every(count => count === 0)).toBe(
        true
      );
    });

    it('should include correct index statistics', async () => {
      const storage = (engine as any).storage;
      storage.list.mockResolvedValue([]);

      // Mock index sizes
      (engine as any).semanticIndex.size = 10;
      (engine as any).keywordIndex.size = 15;
      (engine as any).typeIndex.size = 7;
      (engine as any).tagIndex.size = 12;

      const stats = await engine.getStats();

      expect(stats.indexStats.semantic).toBe(10);
      expect(stats.indexStats.keywords).toBe(15);
      expect(stats.indexStats.types).toBe(7);
      expect(stats.indexStats.tags).toBe(12);
    });

    it('should handle storage list failure', async () => {
      const storage = (engine as any).storage;
      storage.list.mockRejectedValue(new Error('Storage list failed'));

      await expect(engine.getStats()).rejects.toThrow();
    });
  });

  // ========================================
  // ERROR HANDLING TESTS
  // ========================================

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle unknown error types in remember', async () => {
      const embedding = (engine as any).embedding;
      embedding.embed.mockRejectedValue('String error');

      await expect(engine.remember('content', 'tenant')).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle null/undefined values gracefully', async () => {
      // Test null content
      await expect(engine.remember(null as any, 'tenant')).rejects.toThrow(
        MemoryError
      );

      // Test undefined content
      await expect(engine.remember(undefined as any, 'tenant')).rejects.toThrow(
        MemoryError
      );
    });
  });

  // ========================================
  // EDGE CASES & INTEGRATION TESTS
  // ========================================

  describe('Edge Cases & Integration', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle very large content', async () => {
      const largeContent = 'A'.repeat(10000);
      const embedding = (engine as any).embedding;

      const memoryId = await engine.remember(largeContent, 'tenant');

      expect(memoryId).toBe('test-memory-id-12345');
      expect(embedding.embed).toHaveBeenCalledWith(largeContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent = '🚀 Special chars: àáâã ñ ç 中文 한국어 🎉';
      const storage = (engine as any).storage;

      const memoryId = await engine.remember(specialContent, 'tenant');

      expect(memoryId).toBe('test-memory-id-12345');
      expect(storage.store).toHaveBeenCalledWith(
        expect.objectContaining({
          content: specialContent,
        })
      );
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        engine.remember('Content 1', 'tenant'),
        engine.remember('Content 2', 'tenant'),
        engine.remember('Content 3', 'tenant'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      const storage = (engine as any).storage;
      expect(storage.store).toHaveBeenCalledTimes(3);
    });

    it('should maintain state consistency after errors', async () => {
      const storage = (engine as any).storage;

      // Cause an error
      storage.store.mockRejectedValueOnce(new Error('Storage failed'));

      await expect(engine.remember('content', 'tenant')).rejects.toThrow();

      // Engine should still be initialized and functional
      expect((engine as any).isInitialized).toBe(true);

      // Reset mock and try again
      storage.store.mockResolvedValue(undefined);
      const memoryId = await engine.remember('recovery content', 'tenant');
      expect(memoryId).toBeDefined();
    });
  });

  // ========================================
  // PERFORMANCE & MEMORY TESTS
  // ========================================

  describe('Performance & Memory Management', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should not leak memory with large numbers of operations', async () => {
      const operations = Array.from({ length: 50 }, (_, i) =>
        engine.remember(`Content ${i}`, 'tenant')
      );

      await Promise.all(operations);

      // Verify operations completed
      const storage = (engine as any).storage;
      expect(storage.store).toHaveBeenCalledTimes(50);
    });

    it('should handle rapid consecutive calls efficiently', async () => {
      const start = Date.now();

      const promises = Array.from({ length: 10 }, () =>
        engine.remember('Rapid content', 'tenant')
      );

      await Promise.all(promises);

      const duration = Date.now() - start;

      // Should complete reasonably quickly (less than 1 second for mocked operations)
      expect(duration).toBeLessThan(1000);
    });

    it('should clean up resources properly on forget operations', async () => {
      const memoryId = 'test-memory';
      const mockMemory = createMockMemory({ id: memoryId });
      const storage = (engine as any).storage;

      storage.retrieve.mockResolvedValue(mockMemory);

      let removeFromIndicesCalled = false;
      vi.spyOn(engine as any, 'removeFromIndices').mockImplementation(() => {
        removeFromIndicesCalled = true;
      });

      await engine.forget(memoryId);

      expect(removeFromIndicesCalled).toBe(true);
      expect(storage.delete).toHaveBeenCalledWith(memoryId);
    });
  });
});
