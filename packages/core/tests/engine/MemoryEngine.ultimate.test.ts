import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';
import { MemoryType } from '../../src/types';

// Mock all external dependencies
vi.mock('../../src/vector/VectorStore');
vi.mock('../../src/embedding/EmbeddingService');
vi.mock('../../src/storage/StorageAdapter');

describe('MemoryEngine - Ultimate Coverage Tests', () => {
  let memoryEngine: MemoryEngine;
  let mockVectorStore: any;
  let mockEmbeddingService: any;
  let mockStorageAdapter: any;

  const testConfig = {
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
      api_key: 'test-api-key-32-characters-long-secure',
    },
    vector_db: {
      url: 'http://localhost:6333',
      collection: 'memories',
      dimension: 1536,
      api_key: 'test-api-key',
    },
    security: {
      encryption_key: 'test-encryption-key-32-chars-long!',
      tenant_isolation: true,
      audit_logs: false,
    },
    redis: {
      url: 'redis://localhost:6379',
      password: undefined,
      db: 0,
    },
  };

  beforeEach(() => {
    // Create mocks with all required methods
    mockVectorStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      search: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockEmbeddingService = {
      generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };

    mockStorageAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getMemory: vi.fn().mockResolvedValue(null),
      storeMemory: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    // Inject mocks into MemoryEngine
    memoryEngine = new MemoryEngine(testConfig);
    (memoryEngine as any).vectorStore = mockVectorStore;
    (memoryEngine as any).embeddingService = mockEmbeddingService;
    (memoryEngine as any).storageAdapter = mockStorageAdapter;
    (memoryEngine as any).isInitialized = true; // Skip initialization
  });
  describe('Coverage Target: Context with Topic (Line 219)', () => {
    it('should handle context request with topic parameter', async () => {
      // Mock the recall method to return sample memories
      const mockMemories = [
        {
          memory: {
            type: 'fact' as MemoryType,
            id: 'mem1',
            content: 'Test memory',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            importance: 0.7,
            emotional_weight: 0,
            tags: [],
            context: { user: 'test' },
            tenant_id: 'tenant1',
            agent_id: 'agent1',
          },
          score: 0.85,
        },
      ];

      vi.spyOn(memoryEngine, 'recall').mockResolvedValue(mockMemories);

      const request = {
        tenant_id: 'tenant1',
        agent_id: 'agent1',
        topic: 'test topic', // This triggers line 219
        max_memories: 5,
      };

      const result = await memoryEngine.context(request);

      expect(result.memories).toEqual(mockMemories);      expect(memoryEngine.recall).toHaveBeenCalledWith(
        'test topic',
        'tenant1',
        'agent1',
        { limit: 5, threshold: 0.6 }
      );
    });
  });
  describe('Coverage Target: Memory Type Filtering (Lines 246-249)', () => {
    it('should filter memories by memory_types parameter', async () => {
      const mockMemories = [
        {
          memory: {
            type: 'fact' as MemoryType,
            id: 'mem1',
            content: 'Fact memory',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            importance: 0.7,
            emotional_weight: 0,
            tags: [],
            context: { user: 'test' },
            tenant_id: 'tenant1',
            agent_id: 'agent1',
          },
          score: 0.85,
        },
        {
          memory: {
            type: 'procedure' as MemoryType,
            id: 'mem2',
            content: 'Procedure memory',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            importance: 0.7,
            emotional_weight: 0,
            tags: [],
            context: { user: 'test' },
            tenant_id: 'tenant1',
            agent_id: 'agent1',
          },
          score: 0.85,
        },
      ];

      // Mock recall to return both memories
      vi.spyOn(memoryEngine, 'recall').mockResolvedValue(mockMemories);

      const request = {
        tenant_id: 'tenant1',
        agent_id: 'agent1',
        topic: 'test query',
        memory_types: ['fact' as MemoryType], // This triggers filtering on lines 246-249
        max_memories: 10,
      };

      const result = await memoryEngine.context(request);

      // Should only return the fact memory, not the procedure memory
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0].memory.type).toBe('fact');
      expect(result.total_count).toBe(1);
    });
  });

  describe('Coverage Target: Context Error Handling (Lines 266-267)', () => {
    it('should handle unknown error in context method', async () => {
      // Mock recall to throw a non-Error object (string)
      vi.spyOn(memoryEngine, 'recall').mockRejectedValue('string error'); // Not an Error object

      const request = {
        tenant_id: 'tenant1',
        agent_id: 'agent1',
        topic: 'test query',
        max_memories: 5,
      };

      await expect(memoryEngine.context(request)).rejects.toThrow('Unknown context error');
    });
  });
  describe('Coverage Target: Close Method Error Handling', () => {
    it('should handle close method errors gracefully', async () => {
      // Mock vectorStore close to fail
      mockVectorStore.close = vi.fn().mockRejectedValue(new Error('Close failed'));

      await expect(memoryEngine.close()).rejects.toThrow('Failed to close: Close failed');
    });
  });
  describe('Coverage Target: Forget Method Error Handling (Lines 197-198, 209-210)', () => {
    it('should handle unknown error type in forget method', async () => {
      // Mock recall to return memories
      const mockMemories = [
        {
          memory: { id: 'test-id', content: 'test content', type: 'fact' },
          score: 0.9
        }
      ];
      vi.spyOn(memoryEngine, 'recall').mockResolvedValue(mockMemories as any);
      
      // Mock deleteMemories to fail with non-Error
      mockVectorStore.deleteMemories = vi.fn().mockRejectedValue('string error');
      
      await expect(memoryEngine.forget('test query', 'tenant1', 'agent1', 0.8))
        .rejects.toThrow('Unknown forget error');
    });

    it('should handle Error instance in forget method', async () => {
      // Mock recall to return memories
      const mockMemories = [
        {
          memory: { id: 'test-id', content: 'test content', type: 'fact' },
          score: 0.9
        }
      ];
      vi.spyOn(memoryEngine, 'recall').mockResolvedValue(mockMemories as any);
      
      const specificError = new Error('Specific delete error');
      mockVectorStore.deleteMemories = vi.fn().mockRejectedValue(specificError);
      
      await expect(memoryEngine.forget('test query', 'tenant1', 'agent1', 0.8))
        .rejects.toThrow('Failed to forget: Specific delete error');
    });
  });
  describe('Coverage Target: GetHealth Error Handling (Lines 398-404)', () => {    it('should handle getHealth component error', async () => {
      // Make vectorStore.getHealth throw an error
      mockVectorStore.getHealth = vi.fn().mockRejectedValue(new Error('Health check failed'));
      
      const health = await memoryEngine.getHealth();
      
      // When vector store fails but embedding service is healthy, status should be 'degraded'
      expect(health.status).toBe('degraded');
      expect(health.initialized).toBe(true); // Engine is initialized
      expect(health.checks?.vectorStore).toBe(false);
      expect(health.checks?.embedding).toBe(true);
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Coverage Target: Context Not Initialized (Line 219)', () => {
    it('should throw error when context called before initialization', async () => {
      // Create new engine without initialization
      const uninitializedEngine = new MemoryEngine(testConfig);
      
      const request = {
        tenant_id: 'tenant1',
        agent_id: 'agent1',
        max_memories: 10,
        topic: 'test topic'
      };

      await expect(uninitializedEngine.context(request))
        .rejects.toThrow('Memory engine not initialized');
    });
  });
});
