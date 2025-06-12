import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';
import { EmbeddingService } from '../../src/embedding/EmbeddingService';
import { MemoryVectorStore } from '../../src/vector/VectorStore';
import { MemoryType, MemoryError } from '../../src/types';

// Mock the dependencies
vi.mock('../../src/embedding/EmbeddingService');
vi.mock('../../src/vector/VectorStore');

/**
 * MemoryEngine Maximum Coverage Tests
 * 
 * Targets specific uncovered lines to push MemoryEngine coverage from 88.42% to 98%+:
 * - Lines 274-313: healthCheck method branches
 * - Lines 334-337: getHealth vectorStore healthy/unhealthy paths
 * - Line 348: getHealth anyHealthy calculation
 * - Lines 398-404: close method error handling paths
 */

describe('MemoryEngine - Maximum Coverage Tests', () => {
  let engine: MemoryEngine;
  let mockEmbeddingService: EmbeddingService;
  let mockVectorStore: MemoryVectorStore;

  const testConfig = {
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
      api_key: 'test-api-key-with-minimum-length-required'
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
      getMemoryCount: vi.fn().mockResolvedValue(42)
    } as unknown as MemoryVectorStore;

    // Mock the constructors
    vi.mocked(EmbeddingService).mockImplementation(() => mockEmbeddingService);
    vi.mocked(MemoryVectorStore).mockImplementation(() => mockVectorStore);

    engine = new MemoryEngine(testConfig);
    await engine.initialize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('HealthCheck Method Coverage (Lines 274-313)', () => {
    it('should handle healthCheck with vector store success (lines 283, 295-299)', async () => {
      // Mock vector store healthy
      vi.spyOn(mockVectorStore, 'healthCheck').mockResolvedValue(true);
      vi.spyOn(mockVectorStore, 'getMemoryCount').mockResolvedValue(42);
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('healthy');
      expect(result.components.vector_store).toBe(true);
      expect(result.components.embedding).toBe(true);
      expect(result.memory_count).toBe(42);
    });

    it('should handle healthCheck with vector store failure (lines 283, 302-306)', async () => {
      // Mock vector store unhealthy
      vi.spyOn(mockVectorStore, 'healthCheck').mockResolvedValue(false);
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(false);
      expect(result.components.embedding).toBe(true);
      expect(result.memory_count).toBeUndefined();
    });

    it('should handle healthCheck with embedding failure (lines 286-290)', async () => {
      // Mock embedding failure
      vi.spyOn(mockEmbeddingService, 'embed').mockRejectedValue(new Error('Embedding failed'));
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(true);
      expect(result.components.embedding).toBe(false);
    });    it('should handle healthCheck with overall failure (lines 307-312)', async () => {
      // Mock complete failure - this will trigger the catch block
      vi.spyOn(mockVectorStore, 'healthCheck').mockRejectedValue(new Error('Complete failure'));
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(false); // Set to false in initial state
      expect(result.components.embedding).toBe(false); // Set to false in initial state
    });
  });

  describe('GetHealth Method Coverage (Lines 334-360)', () => {
    it('should handle getHealth when not initialized (lines 361-372)', async () => {
      // Create new engine without initializing
      const uninitializedEngine = new MemoryEngine(testConfig);
      
      const result = await uninitializedEngine.getHealth();
      
      expect(result.status).toBe('unhealthy');
      expect(result.initialized).toBe(false);
      expect(result.components?.vectorStore).toEqual({ 
        status: 'unhealthy', 
        error: 'Not initialized' 
      });
    });    it('should handle getHealth with vector store unhealthy (lines 346-350)', async () => {
      // Mock vector store returning unhealthy status
      vi.spyOn(mockVectorStore, 'getHealth').mockResolvedValue({ 
        status: 'unhealthy', 
        error: 'Connection failed' 
      });
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('degraded'); // embedding healthy, vector store unhealthy = degraded
      expect(result.initialized).toBe(true);
      expect(result.components?.vectorStore).toEqual({
        status: 'unhealthy',
        error: 'Connection failed'
      });
    });

    it('should handle getHealth with embedding unhealthy but vector store healthy (line 360 - anyHealthy=true)', async () => {
      // Mock embedding failure but vector store success
      vi.spyOn(mockEmbeddingService, 'embed').mockRejectedValue(new Error('Embedding failed'));
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('degraded'); // anyHealthy = true, allHealthy = false
      expect(result.initialized).toBe(true);
      expect(result.components?.embedding).toBe('unhealthy');
      expect(result.components?.vectorStore).toEqual({ status: 'healthy' });
    });

    it('should handle getHealth with vector store error (lines 351-357)', async () => {
      // Mock vector store throwing error
      vi.spyOn(mockVectorStore, 'getHealth').mockRejectedValue(new Error('Vector store error'));
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('degraded'); // embedding healthy, vector store unhealthy
      expect(result.components?.vectorStore).toEqual({
        status: 'unhealthy',
        error: 'Vector store error'
      });
    });    it('should handle getHealth with property access issues (non-initialized engine)', async () => {
      // Create an engine where getHealth operates on uninitialized engine
      const brokenEngine = new MemoryEngine(testConfig);
      
      // Don't initialize it, so it will hit the "not initialized" path instead of catch block
      const result = await brokenEngine.getHealth();
      
      expect(result.status).toBe('unhealthy');
      expect(result.initialized).toBe(false);
      expect(result.components?.vectorStore).toEqual({
        status: 'unhealthy',
        error: 'Not initialized'
      });
      // Embedding can still be healthy even if not initialized
      expect(result.components?.embedding).toBe('healthy');
    });
  });

  describe('Close Method Error Handling (Lines 398-404)', () => {    it('should handle close method vector store error (lines 402-404)', async () => {
      // Mock vector store close throwing error
      vi.spyOn(mockVectorStore, 'close').mockRejectedValue(new Error('Close failed'));
      
      // The close method actually throws the error wrapped in MemoryError
      await expect(engine.close()).rejects.toThrow('Failed to close: Close failed');
      
      // Verify isInitialized is still set to false even with error
      expect(engine['isInitialized']).toBe(false);
    });

    it('should handle close method with unknown error type (lines 402-404)', async () => {
      // Mock vector store close throwing non-Error object
      vi.spyOn(mockVectorStore, 'close').mockRejectedValue('String error');
      
      // Should throw MemoryError for unknown error type
      await expect(engine.close()).rejects.toThrow('Unknown close error');
      
      // Verify isInitialized is still set to false
      expect(engine['isInitialized']).toBe(false);
    });
  });

  describe('Edge Cases for Maximum Coverage', () => {
    it('should handle all healthy components path (lines 374-382)', async () => {
      // Ensure both embedding and vector store are healthy
      vi.spyOn(mockEmbeddingService, 'embed').mockResolvedValue(mockEmbeddingResult);
      vi.spyOn(mockVectorStore, 'getHealth').mockResolvedValue({ status: 'healthy' });
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('healthy');
      expect(result.initialized).toBe(true);
      expect(result.components?.vectorStore).toEqual({ status: 'healthy' });
      expect(result.components?.embedding).toBe('healthy');
    });

    it('should handle both components unhealthy (lines 384-389)', async () => {
      // Mock both components failing
      vi.spyOn(mockEmbeddingService, 'embed').mockRejectedValue(new Error('Embedding failed'));
      vi.spyOn(mockVectorStore, 'getHealth').mockResolvedValue({ 
        status: 'unhealthy', 
        error: 'Vector store failed' 
      });
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('unhealthy'); // anyHealthy = false
      expect(result.initialized).toBe(true);
      expect(result.checks).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});
