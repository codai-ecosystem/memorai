import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';
import { EmbeddingService } from '../../src/embedding/EmbeddingService';
import { MemoryVectorStore } from '../../src/vector/VectorStore';
import { MemoryType } from '../../src/types';

// Mock the dependencies
vi.mock('../../src/embedding/EmbeddingService');
vi.mock('../../src/vector/VectorStore');

describe('MemoryEngine - Final Coverage Completion', () => {
  let engine: MemoryEngine;
  let mockEmbeddingService: EmbeddingService;
  let mockVectorStore: MemoryVectorStore;

  const testConfig = {
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
      api_key: 'test-api-key'
    },
    security: {
      encryption_key: 'test-encryption-key-32-characters-long-very-secure',
      tenant_isolation: true,
      audit_logs: false
    }
  };

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockEmbeddingResult = {
    embedding: mockEmbedding,
    tokens: 10,
    model: 'text-embedding-3-small'
  };

  const mockCreateMemoryResult = {
    id: 'test-id',
    content: 'test content',
    type: 'fact' as MemoryType,
    importance: 0.7,
    context: {
      tenant_id: 'test-tenant',
      agent_id: 'test-agent',
      session_id: 'test-session',
      user_id: 'test-user',
      timestamp: new Date(),
      memory_id: 'test-id',
      confidence: 0.8,
      source: 'test',
      tags: []
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastAccessedAt: new Date(),
    accessCount: 1,
    tags: []
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create fresh mocks
    mockEmbeddingService = {
      embed: vi.fn().mockResolvedValue(mockEmbeddingResult),
      embedBatch: vi.fn().mockResolvedValue([mockEmbeddingResult]),
      embedWithRetry: vi.fn().mockResolvedValue(mockEmbeddingResult)
    } as unknown as EmbeddingService;

    mockVectorStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      storeMemory: vi.fn().mockResolvedValue(mockCreateMemoryResult),
      searchMemories: vi.fn().mockResolvedValue([]),
      deleteMemories: vi.fn().mockResolvedValue(undefined),
      updateMemory: vi.fn().mockResolvedValue(undefined),
      getMemory: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(undefined),
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
      healthCheck: vi.fn().mockResolvedValue(true),
      getMemoryCount: vi.fn().mockResolvedValue(0)
    } as unknown as MemoryVectorStore;

    // Mock the constructors
    vi.mocked(EmbeddingService).mockImplementation(() => mockEmbeddingService);
    vi.mocked(MemoryVectorStore).mockImplementation(() => mockVectorStore);

    engine = new MemoryEngine(testConfig);
    await engine.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });  describe('Uncovered Line Coverage: MemoryEngine.ts lines 197-198', () => {
    it('should return 0 when no memories to delete (line 197-198)', async () => {
      // Mock recall to return memories with scores below threshold
      const engineSpy = vi.spyOn(engine, 'recall').mockResolvedValue([
        {
          memory: {
            type: 'fact' as MemoryType,
            tenant_id: 'test-tenant',
            id: 'test-id',
            content: 'test content',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            tags: [],
            importance: 0.7
          },
          score: 0.3, // Below default threshold of 0.9
          relevance_reason: 'test'
        }
      ]);

      // This should trigger lines 197-198 (memoriesToDelete.length === 0)
      const result = await engine.forget('test content', 'test-tenant', 'test-agent', 0.9);

      expect(result).toBe(0);
      expect(engineSpy).toHaveBeenCalled();
      expect(mockVectorStore.deleteMemories).not.toHaveBeenCalled();
    });

    it('should return 0 when no memories found at all (line 191)', async () => {
      // Mock recall to return empty results
      const engineSpy = vi.spyOn(engine, 'recall').mockResolvedValue([]);

      const result = await engine.forget('nonexistent content', 'test-tenant');

      expect(result).toBe(0);
      expect(engineSpy).toHaveBeenCalled();
      expect(mockVectorStore.deleteMemories).not.toHaveBeenCalled();
    });

    it('should delete memories when they meet threshold', async () => {
      // Mock recall to return memories above threshold
      const engineSpy = vi.spyOn(engine, 'recall').mockResolvedValue([
        {
          memory: {
            type: 'fact' as MemoryType,
            tenant_id: 'test-tenant',
            id: 'test-id-1',
            content: 'test content',
            confidence: 0.8,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            tags: [],
            importance: 0.7
          },
          score: 0.95, // Above threshold
          relevance_reason: 'test'
        }
      ]);

      vi.mocked(mockVectorStore.deleteMemories).mockResolvedValue(undefined);

      const result = await engine.forget('test content', 'test-tenant', 'test-agent', 0.9);

      expect(result).toBe(1);
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledWith(['test-id-1']);
    });
  });

  describe('Additional Edge Cases for Complete Coverage', () => {    it('should handle health checks with partial failures', async () => {
      // Test different health check scenarios - make vector store unhealthy
      vi.mocked(mockVectorStore.getHealth).mockResolvedValue({ 
        status: 'unhealthy', 
        error: 'Connection failed' 
      });
      
      const health = await engine.getHealth();
      expect(health.status).toBe('degraded');
      expect(health.checks?.vectorStore).toBe(false);
    });

    it('should handle context requests with empty results', async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([]);

      const response = await engine.context({
        tenant_id: 'test-tenant',
        max_memories: 5
      });

      expect(response.memories).toEqual([]);
      expect(response.total_count).toBe(0);
    });

    it('should handle remember operation with minimal options', async () => {
      const result = await engine.remember('simple content', 'test-tenant');
      
      expect(result).toBeDefined();
      expect(mockEmbeddingService.embed).toHaveBeenCalled();
      expect(mockVectorStore.storeMemory).toHaveBeenCalled();
    });
  });
});
