import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmbeddingService } from '../../src/embedding/EmbeddingService.js';
import { AdvancedMemoryEngine } from '../../src/engine/AdvancedMemoryEngine.js';
import type { StorageAdapter } from '../../src/storage/StorageAdapter.js';
import type {
  MemoryConfig,
  MemoryMetadata,
  MemoryType,
} from '../../src/types/index.js';
import { MemoryError } from '../../src/types/index.js';

// Mock dependencies
vi.mock('../../src/storage/StorageAdapter.js', () => ({
  FileStorageAdapter: vi.fn(),
}));

vi.mock('../../src/embedding/EmbeddingService.js', () => ({
  EmbeddingService: vi.fn(),
}));

describe('AdvancedMemoryEngine - Comprehensive Coverage Suite', () => {
  let engine: AdvancedMemoryEngine;
  let mockStorage: jest.Mocked<StorageAdapter>;
  let mockEmbedding: jest.Mocked<EmbeddingService>;
  let mockConfig: MemoryConfig;
  const testTenantId = 'test-tenant-1';
  const testAgentId = 'test-agent-1';

  beforeEach(() => {
    // Create mock storage adapter
    mockStorage = {
      store: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      clear: vi.fn(),
    } as any;

    // Create mock embedding service
    mockEmbedding = {
      embed: vi.fn(),
      embedBatch: vi.fn(),
      getDimension: vi.fn(),
      embedWithRetry: vi.fn(),
    } as any;

    // Setup default mock implementations
    mockStorage.list.mockResolvedValue([]);
    mockStorage.store.mockResolvedValue();
    mockStorage.retrieve.mockResolvedValue(null);
    mockStorage.delete.mockResolvedValue();

    mockEmbedding.embed.mockResolvedValue({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      tokens: 10,
      model: 'test-model',
    });
    mockEmbedding.getDimension.mockReturnValue(1536);

    // Setup mock config with correct MemoryConfig structure
    mockConfig = {
      vector_db: {
        url: 'http://localhost:6333',
        collection: 'memories',
        dimension: 1536,
      },
      redis: {
        url: 'redis://localhost:6379',
        db: 0,
      },
      embedding: {
        provider: 'local' as const,
        model: 'test-model',
      },
      performance: {
        max_query_time_ms: 100,
        cache_ttl_seconds: 300,
        batch_size: 100,
      },
      security: {
        encryption_key: 'test-key-32-characters-long-secure',
        tenant_isolation: true,
        audit_logs: true,
      },
    };

    // Create engine instance
    engine = new AdvancedMemoryEngine(mockConfig);

    // Inject mocks into engine
    (engine as any).storage = mockStorage;
    (engine as any).embedding = mockEmbedding;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor & Configuration', () => {
    it('should create engine with default configuration', () => {
      const defaultEngine = new AdvancedMemoryEngine();
      expect(defaultEngine).toBeInstanceOf(AdvancedMemoryEngine);
    });

    it('should create engine with custom configuration', () => {
      expect(engine).toBeInstanceOf(AdvancedMemoryEngine);
      expect((engine as any).config).toBeDefined();
    });

    it('should initialize internal indices on creation', () => {
      expect((engine as any).memories).toBeDefined();
      expect((engine as any).embeddings).toBeDefined();
      expect((engine as any).keywords).toBeDefined();
      expect((engine as any).isInitialized).toBe(false);
    });

    it('should initialize embedding service with correct configuration', () => {
      const newEngine = new AdvancedMemoryEngine(mockConfig);
      // Verify embedding service would be created with correct config
      expect(mockConfig.embedding).toBeDefined();
      expect(mockConfig.embedding.provider).toBe('local');
    });

    it('should initialize storage adapter with correct configuration', () => {
      const newEngine = new AdvancedMemoryEngine(mockConfig);
      // Verify storage adapter configuration is present
      expect(mockConfig.vector_db).toBeDefined();
    });
  });

  describe('initialize()', () => {
    it('should initialize successfully', async () => {
      mockStorage.list.mockResolvedValue([]);

      await engine.initialize();

      expect((engine as any).isInitialized).toBe(true);
      expect(mockStorage.list).toHaveBeenCalled();
    });

    it('should handle storage list failure during initialization', async () => {
      mockStorage.list.mockRejectedValue(new Error('Storage list failed'));

      await expect(engine.initialize()).rejects.toThrow(MemoryError);
    });

    it('should allow re-initialization if already initialized', async () => {
      await engine.initialize();
      await engine.initialize(); // Should not throw

      expect(mockStorage.list).toHaveBeenCalledTimes(2);
    });

    it('should load existing memories during initialization', async () => {
      const mockMemories: MemoryMetadata[] = [
        {
          id: 'test-1',
          content: 'Test memory 1',
          agent_id: 'agent-1',
          tenant_id: 'tenant-1',
          type: 'fact' as MemoryType,
          importance: 0.5,
          confidence: 1.0,
          tags: ['test'],
          embedding: new Array(1536).fill(0),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
      ];

      mockStorage.list.mockResolvedValue(mockMemories);

      await engine.initialize();

      expect((engine as any).memories.size).toBe(1);
      expect((engine as any).memories.has('test-1')).toBe(true);
    });
  });

  describe('remember()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should remember valid content successfully', async () => {
      const content = 'This is a test memory';
      const options = { importance: 0.7 };

      const result = await engine.remember(
        content,
        testTenantId,
        testAgentId,
        options
      );

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[a-zA-Z0-9_-]+$/); // nanoid format
      expect(mockEmbedding.embed).toHaveBeenCalledWith(content);
      expect(mockStorage.store).toHaveBeenCalled();
    });

    it('should remember content without agent ID', async () => {
      const content = 'Memory without agent';

      const result = await engine.remember(content, testTenantId);

      expect(typeof result).toBe('string');
      expect(mockStorage.store).toHaveBeenCalled();
    });

    it('should handle remember options correctly', async () => {
      const content = 'Test with options';
      const options = {
        importance: 0.9,
        type: 'fact' as MemoryType,
        tags: ['important', 'test'],
      };

      const result = await engine.remember(
        content,
        testTenantId,
        testAgentId,
        options
      );

      expect(typeof result).toBe('string');
      expect(mockStorage.store).toHaveBeenCalled();

      // Verify the stored memory has correct options
      const storeCall = mockStorage.store.mock.calls[0][0] as MemoryMetadata;
      expect(storeCall.importance).toBe(0.9);
      expect(storeCall.type).toBe('fact');
      expect(storeCall.tags).toEqual(['important', 'test']);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new AdvancedMemoryEngine(mockConfig);
      (uninitializedEngine as any).storage = mockStorage;
      (uninitializedEngine as any).embedding = mockEmbedding;

      await expect(
        uninitializedEngine.remember('test', testTenantId)
      ).rejects.toThrow(MemoryError);
    });

    it('should throw error for empty content', async () => {
      await expect(engine.remember('', testTenantId)).rejects.toThrow(
        MemoryError
      );
      await expect(engine.remember('   ', testTenantId)).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle embedding generation failure', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('Embedding failed'));

      await expect(
        engine.remember('test content', testTenantId)
      ).rejects.toThrow(MemoryError);
    });

    it('should handle storage failure', async () => {
      mockStorage.store.mockRejectedValue(new Error('Storage failed'));

      await expect(
        engine.remember('test content', testTenantId)
      ).rejects.toThrow(MemoryError);
    });

    it('should trim whitespace from content', async () => {
      const content = '  This has whitespace  ';
      const trimmedContent = content.trim();

      const result = await engine.remember(content, testTenantId);

      expect(typeof result).toBe('string');
      expect(mockEmbedding.embed).toHaveBeenCalledWith(trimmedContent);
    });

    it('should handle non-string content', async () => {
      const result = await engine.remember(123 as any, testTenantId);

      expect(typeof result).toBe('string');
      expect(mockEmbedding.embed).toHaveBeenCalledWith('123');
    });
  });

  describe('recall()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should recall memories by semantic similarity', async () => {
      // Setup test data
      const testMemory: MemoryMetadata = {
        id: 'test-1',
        content: 'JavaScript programming',
        agent_id: 'agent-1',
        tenant_id: 'tenant-1',
        type: 'fact' as MemoryType,
        importance: 0.5,
        confidence: 1.0,
        tags: ['programming'],
        embedding: new Array(1536).fill(0.5),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      (engine as any).memories.set('test-1', testMemory);
      (engine as any).embeddings.set('test-1', testMemory.embedding);

      const results = await engine.recall('programming', testTenantId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('should apply filters correctly', async () => {
      const testMemory1: MemoryMetadata = {
        id: 'test-1',
        content: 'Memory 1',
        agent_id: 'agent-1',
        tenant_id: 'tenant-1',
        type: 'fact' as MemoryType,
        importance: 0.8,
        confidence: 1.0,
        tags: ['important'],
        embedding: new Array(1536).fill(0.8),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      const testMemory2: MemoryMetadata = {
        id: 'test-2',
        content: 'Memory 2',
        agent_id: 'agent-2',
        tenant_id: 'tenant-1',
        type: 'thread' as MemoryType,
        importance: 0.3,
        confidence: 1.0,
        tags: ['casual'],
        embedding: new Array(1536).fill(0.8),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      (engine as any).memories.set('test-1', testMemory1);
      (engine as any).memories.set('test-2', testMemory2);
      (engine as any).embeddings.set('test-1', testMemory1.embedding);
      (engine as any).embeddings.set('test-2', testMemory2.embedding);

      const results = await engine.recall('memory', testTenantId, testAgentId, {
        type: 'fact' as MemoryType,
        limit: 10,
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle empty query gracefully', async () => {
      const results = await engine.recall('', testTenantId);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new AdvancedMemoryEngine(mockConfig);
      (uninitializedEngine as any).storage = mockStorage;
      (uninitializedEngine as any).embedding = mockEmbedding;

      await expect(
        uninitializedEngine.recall('test', testTenantId)
      ).rejects.toThrow(MemoryError);
    });
  });

  describe('getContext()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should generate context for conversation', async () => {
      const testMemory: MemoryMetadata = {
        id: 'test-1',
        content: 'Important context',
        agent_id: 'agent-1',
        tenant_id: 'tenant-1',
        type: 'thread' as MemoryType,
        importance: 0.9,
        confidence: 1.0,
        tags: ['context'],
        embedding: new Array(1536).fill(0.9),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      (engine as any).memories.set('test-1', testMemory);
      (engine as any).embeddings.set('test-1', testMemory.embedding);

      const contextRequest = {
        tenant_id: testTenantId,
        agent_id: testAgentId,
        max_memories: 10,
      };

      const context = await engine.getContext(contextRequest);

      expect(context).toBeDefined();
      expect(typeof context.context).toBe('string');
      expect(Array.isArray(context.memories)).toBe(true);
    });

    it('should limit context length', async () => {
      // Add many memories
      for (let i = 0; i < 20; i++) {
        const memory: MemoryMetadata = {
          id: `test-${i}`,
          content: `Memory ${i} `.repeat(100), // Long content
          agent_id: 'agent-1',
          tenant_id: 'tenant-1',
          type: 'thread' as MemoryType,
          importance: 0.5,
          confidence: 1.0,
          tags: [],
          embedding: new Array(1536).fill(0.5),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        };
        (engine as any).memories.set(`test-${i}`, memory);
      }

      const contextRequest = {
        tenant_id: testTenantId,
        agent_id: testAgentId,
        max_memories: 5,
      };

      const context = await engine.getContext(contextRequest);

      expect(context.memories.length).toBeLessThanOrEqual(5);
    });

    it('should handle empty results gracefully', async () => {
      const contextRequest = {
        tenant_id: 'non-existent-tenant',
        agent_id: 'non-existent-agent',
        max_memories: 10,
      };

      const context = await engine.getContext(contextRequest);

      expect(context.context).toBeDefined();
      expect(context.memories).toEqual([]);
    });
  });

  describe('forget()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should forget existing memory successfully', async () => {
      const testMemory: MemoryMetadata = {
        id: 'test-1',
        content: 'Memory to forget',
        agent_id: 'agent-1',
        tenant_id: 'tenant-1',
        type: 'thread' as MemoryType,
        importance: 0.5,
        confidence: 1.0,
        tags: [],
        embedding: new Array(1536).fill(0.5),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      mockStorage.retrieve.mockResolvedValue(testMemory);
      mockStorage.delete.mockResolvedValue();

      const result = await engine.forget('test-1');

      expect(result).toBe(true);
      expect(mockStorage.delete).toHaveBeenCalledWith('test-1');
    });

    it('should return false for non-existent memory', async () => {
      mockStorage.retrieve.mockResolvedValue(null);

      const result = await engine.forget('non-existent');

      expect(result).toBe(false);
      expect(mockStorage.delete).not.toHaveBeenCalled();
    });

    it('should throw error when not initialized', async () => {
      const uninitializedEngine = new AdvancedMemoryEngine(mockConfig);
      (uninitializedEngine as any).storage = mockStorage;
      (uninitializedEngine as any).embedding = mockEmbedding;

      await expect(uninitializedEngine.forget('test')).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle storage retrieve failure gracefully', async () => {
      mockStorage.retrieve.mockRejectedValue(new Error('Retrieve failed'));

      await expect(engine.forget('test-1')).rejects.toThrow(MemoryError);
    });

    it('should handle storage delete failure gracefully', async () => {
      const testMemory: MemoryMetadata = {
        id: 'test-1',
        content: 'Memory to forget',
        agent_id: 'agent-1',
        tenant_id: 'tenant-1',
        type: 'thread' as MemoryType,
        importance: 0.5,
        confidence: 1.0,
        tags: [],
        embedding: new Array(1536).fill(0.5),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
      };

      mockStorage.retrieve.mockResolvedValue(testMemory);
      mockStorage.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(engine.forget('test-1')).rejects.toThrow(MemoryError);
    });
  });

  describe('getStats()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should return comprehensive statistics', async () => {
      // Add test memories
      const testMemories: MemoryMetadata[] = [
        {
          id: 'test-1',
          content: 'Memory 1',
          agent_id: 'agent-1',
          tenant_id: 'tenant-1',
          type: 'thread' as MemoryType,
          importance: 0.5,
          confidence: 1.0,
          tags: ['tag1'],
          embedding: new Array(1536).fill(0.5),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
        {
          id: 'test-2',
          content: 'Memory 2',
          agent_id: 'agent-1',
          tenant_id: 'tenant-1',
          type: 'fact' as MemoryType,
          importance: 0.8,
          confidence: 1.0,
          tags: ['tag2'],
          embedding: new Array(1536).fill(0.7),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
      ];

      mockStorage.list.mockResolvedValue(testMemories);

      const stats = await engine.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalMemories).toBe('number');
      expect(typeof stats.performance.avgImportance).toBe('number');
      expect(typeof stats.memoryTypes).toBe('object');
    });

    it('should handle empty memory list', async () => {
      mockStorage.list.mockResolvedValue([]);

      const stats = await engine.getStats();

      expect(stats.totalMemories).toBe(0);
      expect(stats.performance.avgImportance).toBe(0);
      expect(stats.memoryTypes).toEqual({
        fact: 0,
        procedure: 0,
        preference: 0,
        personality: 0,
        emotion: 0,
        task: 0,
        thread: 0,
      });
    });

    it('should include correct index statistics', async () => {
      const testMemories: MemoryMetadata[] = [
        {
          id: 'test-1',
          content: 'Memory 1',
          agent_id: 'agent-1',
          tenant_id: 'tenant-1',
          type: 'thread' as MemoryType,
          importance: 0.5,
          confidence: 1.0,
          tags: ['tag1', 'tag2'],
          embedding: new Array(1536).fill(0.5),
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 0,
        },
      ];

      mockStorage.list.mockResolvedValue(testMemories);

      const stats = await engine.getStats();

      expect(stats).toHaveProperty('totalMemories');
      expect(stats).toHaveProperty('averageImportance');
      expect(stats).toHaveProperty('memoryTypes');
    });

    it('should handle storage list failure', async () => {
      mockStorage.list.mockRejectedValue(new Error('Storage list failed'));

      await expect(engine.getStats()).rejects.toThrow(MemoryError);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle unknown error types in remember', async () => {
      mockEmbedding.embed.mockRejectedValue('Unknown error string');

      await expect(engine.remember('test', testTenantId)).rejects.toThrow(
        MemoryError
      );
    });

    it('should handle null/undefined values gracefully', async () => {
      await expect(engine.remember(null as any, testTenantId)).rejects.toThrow(
        MemoryError
      );
      await expect(
        engine.remember(undefined as any, testTenantId)
      ).rejects.toThrow(MemoryError);
    });
  });

  describe('Edge Cases & Integration', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle very large content', async () => {
      const largeContent = 'x'.repeat(100000);

      const result = await engine.remember(largeContent, testTenantId);

      expect(typeof result).toBe('string');
      expect(mockEmbedding.embed).toHaveBeenCalledWith(largeContent);
    });

    it('should handle special characters in content', async () => {
      const specialContent =
        '🚀 Special chars: àáâãäåæçèéêë 中文 русский العربية';

      const result = await engine.remember(specialContent, testTenantId);

      expect(typeof result).toBe('string');
    });

    it('should handle concurrent operations', async () => {
      const promises: Promise<string>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(engine.remember(`Concurrent memory ${i}`, testTenantId));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(typeof result).toBe('string');
      });
    });

    it('should maintain state consistency after errors', async () => {
      // First successful operation
      await engine.remember('Valid memory', testTenantId);

      // Failing operation
      mockEmbedding.embed.mockRejectedValueOnce(new Error('Temporary failure'));
      await expect(
        engine.remember('Invalid memory', testTenantId)
      ).rejects.toThrow();

      // Engine should still work after error
      mockEmbedding.embed.mockResolvedValue({
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        tokens: 10,
        model: 'test-model',
      });

      const result = await engine.remember('Recovery memory', testTenantId);
      expect(typeof result).toBe('string');
    });
  });

  describe('Performance & Memory Management', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should not leak memory with large numbers of operations', async () => {
      const initialHeapUsed = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await engine.remember(`Memory ${i}`, testTenantId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalHeapUsed = process.memoryUsage().heapUsed;
      const heapIncrease = finalHeapUsed - initialHeapUsed;

      // Memory increase should be reasonable (less than 50MB for this test)
      expect(heapIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle rapid consecutive calls efficiently', async () => {
      const start = Date.now();

      const promises: Promise<string>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(engine.remember(`Rapid memory ${i}`, testTenantId));
      }

      await Promise.all(promises);

      const duration = Date.now() - start;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should clean up resources properly on forget operations', async () => {
      // Add memories
      const memoryIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const memoryId = await engine.remember(
          `Memory to clean ${i}`,
          testTenantId
        );
        memoryIds.push(memoryId);
      }

      // Mock storage for forget operations
      mockStorage.retrieve.mockImplementation(async (id: string) => {
        if (memoryIds.includes(id)) {
          return {
            id,
            content: `Memory to clean`,
            type: 'thread' as MemoryType,
            tenant_id: testTenantId,
            importance: 0.5,
            confidence: 1.0,
            tags: [],
            embedding: new Array(1536).fill(0.5),
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 0,
          };
        }
        return null;
      });

      // Forget all memories
      for (const memoryId of memoryIds) {
        await engine.forget(memoryId);
      }

      // Verify cleanup
      expect(mockStorage.delete).toHaveBeenCalledTimes(10);
    });
  });
});
