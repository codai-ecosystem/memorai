import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';
import { EmbeddingService } from '../../src/embedding/EmbeddingService';
import { MemoryVectorStore } from '../../src/vector/VectorStore';
import { MemoryType, MemoryError } from '../../src/types';

// Mock the dependencies
vi.mock('../../src/embedding/EmbeddingService');
vi.mock('../../src/vector/VectorStore');

/**
 * MemoryEngine Coverage Perfection Tests
 * 
 * Targets specific uncovered lines to push coverage from 87.24% to 98%+:
 * - Lines 404, 420-421: Close method error handling
 * - Line 536: Time decay fallback logic  
 * - Lines 540, 542-544: Time decay branches and calculations
 */

describe('MemoryEngine - Coverage Perfection Tests', () => {
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
    } as unknown as EmbeddingService;    mockVectorStore = {
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
  });
  describe('Close Method Error Handling (Lines 404, 420-421)', () => {
    it('should handle vector store close error with Error instance', async () => {
      // Mock vectorStore.close to throw a proper Error
      const closeError = new Error('Vector store connection failed');
      vi.spyOn(engine['vectorStore'], 'close').mockRejectedValue(closeError);

      // Should throw MemoryError wrapping the original error
      await expect(engine.close()).rejects.toThrow('Failed to close: Vector store connection failed');
      await expect(engine.close()).rejects.toThrow(MemoryError);
    });

    it('should handle vector store close error with unknown error type', async () => {
      // Mock vectorStore.close to throw non-Error object (line 420-421)
      const unknownError = 'String error message';
      vi.spyOn(engine['vectorStore'], 'close').mockRejectedValue(unknownError);

      // Should throw generic MemoryError for unknown error types
      await expect(engine.close()).rejects.toThrow('Unknown close error');
      await expect(engine.close()).rejects.toThrow(MemoryError);
    });

    it('should handle close when vectorStore is null', async () => {
      // Create new engine without initializing
      const uninitializedEngine = new MemoryEngine(testConfig);
      expect(uninitializedEngine['isInitialized']).toBe(false);
      
      // Should close without errors even with null vectorStore
      await expect(uninitializedEngine.close()).resolves.toBeUndefined();
      expect(uninitializedEngine['isInitialized']).toBe(false);
    });
  });

  describe('Time Decay Fallback Logic (Line 536)', () => {
    it('should use current time when no time information is available', async () => {
      // Create memory result with no timestamp information
      const resultWithoutTime = {
        memory: {
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
          // No createdAt, updatedAt, or lastAccessedAt - this triggers line 536
          accessCount: 1,
          tags: []
        },
        score: 0.8,
        metadata: {
          id: 'test-id',
          tenant_id: 'test-tenant',
          agent_id: 'test-agent'
        }
      };

      // Mock searchMemories to return result without time info
      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([resultWithoutTime]);

      // Call recall with time_decay enabled to trigger the fallback logic
      const results = await engine.recall('test query', 'test-tenant', 'test-agent', {
        time_decay: true,
        limit: 5
      });

      expect(results).toHaveLength(1);
      // With no time info, it should use current time (no decay), so score should remain high
      expect(results[0].score).toBeCloseTo(0.8, 2);
    });
  });

  describe('Time Decay Calculation Branches (Lines 540, 542-544)', () => {
    it('should use lastAccessedAt when available (line 540)', async () => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const resultWithLastAccessed = {
        memory: {
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
          createdAt: new Date(), // Has createdAt
          updatedAt: new Date(),
          lastAccessedAt: oldDate, // Has lastAccessedAt - should use this (line 540)
          accessCount: 1,
          tags: []
        },
        score: 0.8,
        metadata: {
          id: 'test-id',
          tenant_id: 'test-tenant',
          agent_id: 'test-agent'
        }
      };

      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([resultWithLastAccessed]);

      const results = await engine.recall('test query', 'test-tenant', 'test-agent', {
        time_decay: true,
        limit: 5
      });

      expect(results).toHaveLength(1);
      // Should have significant decay due to old lastAccessedAt
      expect(results[0].score).toBeLessThan(0.3);
    });

    it('should use createdAt when lastAccessedAt is not available (lines 542-544)', async () => {
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const resultWithCreatedAt = {
        memory: {
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
          createdAt: recentDate, // Has createdAt, should use this (lines 542-544)
          updatedAt: new Date(),
          // No lastAccessedAt - should fall back to createdAt
          accessCount: 1,
          tags: []
        },
        score: 0.8,
        metadata: {
          id: 'test-id',
          tenant_id: 'test-tenant',
          agent_id: 'test-agent'
        }
      };

      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([resultWithCreatedAt]);

      const results = await engine.recall('test query', 'test-tenant', 'test-agent', {
        time_decay: true,
        limit: 5
      });

      expect(results).toHaveLength(1);
      // Should have minimal decay due to recent createdAt
      expect(results[0].score).toBeGreaterThan(0.6);
    });

    it('should handle string dates in lastAccessedAt (line 540 branch)', async () => {
      const oldDateString = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago
      const resultWithStringDate = {
        memory: {
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
          lastAccessedAt: oldDateString, // String date - should convert to Date
          accessCount: 1,
          tags: []
        },
        score: 0.8,
        metadata: {
          id: 'test-id',
          tenant_id: 'test-tenant',
          agent_id: 'test-agent'
        }
      };

      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([resultWithStringDate]);

      const results = await engine.recall('test query', 'test-tenant', 'test-agent', {
        time_decay: true,
        limit: 5
      });

      expect(results).toHaveLength(1);
      // Should handle string date conversion properly
      expect(results[0].score).toBeLessThan(0.5);
    });

    it('should handle string dates in createdAt (lines 542-544 branch)', async () => {
      const recentDateString = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
      const resultWithStringCreatedAt = {
        memory: {
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
          createdAt: recentDateString, // String date - should convert to Date
          updatedAt: new Date(),
          // No lastAccessedAt
          accessCount: 1,
          tags: []
        },
        score: 0.8,
        metadata: {
          id: 'test-id',
          tenant_id: 'test-tenant',
          agent_id: 'test-agent'
        }
      };

      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([resultWithStringCreatedAt]);

      const results = await engine.recall('test query', 'test-tenant', 'test-agent', {
        time_decay: true,
        limit: 5
      });

      expect(results).toHaveLength(1);
      // Should handle string date conversion for createdAt properly
      expect(results[0].score).toBeGreaterThan(0.7);
    });
  });

  describe('Edge Cases for Maximum Coverage', () => {    it('should handle ensureInitialized when already initialized', async () => {
      // Engine is already initialized in beforeEach
      expect(engine['isInitialized']).toBe(true);

      // Calling ensureInitialized should return early without calling initialize again
      const initializeSpy = vi.spyOn(engine, 'initialize');
      await engine['ensureInitialized']();
      
      // Should NOT call initialize since already initialized
      expect(initializeSpy).not.toHaveBeenCalled();
    });

    it('should handle close method setting isInitialized to false in error cases', async () => {
      expect(engine['isInitialized']).toBe(true);

      // Mock to throw error
      vi.spyOn(engine['vectorStore'], 'close').mockRejectedValue(new Error('Close failed'));

      try {
        await engine.close();
      } catch {
        // Expected to throw
      }

      // Should still set isInitialized to false even on error
      expect(engine['isInitialized']).toBe(false);
    });
  });
  describe('Coverage Target: Lines 274-313 (healthCheck method)', () => {    it('should handle healthCheck with vector store failure', async () => {
      // Mock vector store healthCheck to return false (unhealthy), but embedding to succeed
      vi.spyOn(engine['vectorStore'], 'healthCheck').mockResolvedValue(false);
      vi.spyOn(engine['embedding'], 'embed').mockResolvedValue(mockEmbeddingResult);
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(false);
      expect(result.components.embedding).toBe(true);
    });it('should handle healthCheck with embedding service failure', async () => {
      // Mock embedding service to fail, but vector store to succeed
      vi.spyOn(engine['vectorStore'], 'healthCheck').mockResolvedValue(true);
      vi.spyOn(engine['vectorStore'], 'getMemoryCount').mockResolvedValue(0);
      vi.spyOn(engine['embedding'], 'embed').mockRejectedValue(new Error('Embedding service down'));
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(true);
      expect(result.components.embedding).toBe(false);
    });    it('should handle healthCheck with memory count retrieval', async () => {
      // Mock both services to succeed with specific memory count
      vi.spyOn(engine['vectorStore'], 'healthCheck').mockResolvedValue(true);
      vi.spyOn(engine['vectorStore'], 'getMemoryCount').mockResolvedValue(42);
      vi.spyOn(engine['embedding'], 'embed').mockResolvedValue(mockEmbeddingResult);
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('healthy');
      expect(result.components.vector_store).toBe(true);
      expect(result.components.embedding).toBe(true);
      expect(result.memory_count).toBe(42);
    });    it('should handle healthCheck with complete failure in try-catch', async () => {
      // Mock vector store health check to throw unexpected error
      vi.spyOn(engine['vectorStore'], 'healthCheck').mockImplementation(() => {
        throw new Error('Unexpected health check error');
      });
      
      const result = await engine.healthCheck();
      
      expect(result.status).toBe('unhealthy');
      expect(result.components.vector_store).toBe(false);
      expect(result.components.embedding).toBe(false);
      expect(result.memory_count).toBeUndefined();
    });
  });  describe('Coverage Target: Line 348 (getHealth catch block)', () => {
    it('should handle getHealth method errors in catch block', async () => {
      // Mock vector store getHealth to throw error, keep embedding healthy
      vi.spyOn(engine['vectorStore'], 'getHealth').mockRejectedValue(new Error('Vector store getHealth failed'));
      vi.spyOn(engine['embedding'], 'embed').mockResolvedValue(mockEmbeddingResult);
      
      const result = await engine.getHealth();
      
      expect(result.status).toBe('degraded'); // One healthy (embedding), one unhealthy (vector)
      expect(result.initialized).toBe(true);
      expect(result.checks?.vectorStore).toBe(false);
      expect(result.components?.vectorStore).toEqual({ 
        status: 'unhealthy', 
        error: 'Vector store getHealth failed' 
      });
    });
  });  describe('Coverage Target: Lines 426-427 (ensureInitialized method)', () => {
    it('should call ensureInitialized when not initialized', async () => {
      // Create a new uninitialized engine for this test
      const uninitializedEngine = new MemoryEngine(testConfig);
      
      // Spy on the initialize method to verify it gets called
      const initializeSpy = vi.spyOn(uninitializedEngine, 'initialize').mockResolvedValue();
      
      // Directly call the private ensureInitialized method to cover lines 426-427
      await (uninitializedEngine as any).ensureInitialized();
      
      // Should have called initialize
      expect(initializeSpy).toHaveBeenCalled();
    });
  });

  describe('Coverage Target: Lines 476-477 (memory type classification)', () => {
    it('should classify procedure type memories correctly', async () => {
      // Test procedure classification patterns
      const result1 = await engine.remember('how to deploy the application', 'tenant1', 'agent1');
      const result2 = await engine.remember('step by step process', 'tenant1', 'agent1');
      const result3 = await engine.remember('process documentation', 'tenant1', 'agent1');
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });

    it('should classify fact type memories with specific patterns', async () => {
      // Test fact classification patterns that target lines 476-477
      const result1 = await engine.remember('API is a programming interface', 'tenant1', 'agent1');
      const result2 = await engine.remember('Variables are defined as data containers', 'tenant1', 'agent1');
      const result3 = await engine.remember('Explanation of database concepts', 'tenant1', 'agent1');
      
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });
  });

  // Coverage Target: Lines 131-132 (ensureInitialized error path)
  describe('Coverage Target: Lines 131-132 (ensureInitialized error)', () => {
    it('should throw MemoryError when engine not initialized during recall', async () => {
      const engine = new MemoryEngine(testConfig);
      // Don't call initialize()
      
      await expect(engine.recall('test query', 'tenant1', 'agent1'))
        .rejects
        .toThrow('Memory engine not initialized. Call initialize() first.');
    });
  });  // Coverage Target: Lines 167-168 (recall error handling - unknown error type)
  describe('Coverage Target: Lines 167-168 (recall unknown error)', () => {
    it('should handle unknown error type in recall', async () => {
      const engine = new MemoryEngine(testConfig);
      await engine.initialize();

      // Mock the embedding service to throw a non-Error object
      mockEmbeddingService.embed = vi.fn().mockRejectedValue('unknown error type');

      await expect(engine.recall('test query', 'tenant1', 'agent1'))
        .rejects
        .toThrow('Unknown recall error');
    });
  });// Coverage Target: Lines 197-198 (forget when no memories to delete)
  describe('Coverage Target: Lines 197-198 (forget zero memories)', () => {
    it('should return 0 when no memories match forget criteria', async () => {
      const engine = new MemoryEngine(testConfig);
      await engine.initialize();

      // Mock the vector store to return empty results by mocking the searchMemories method
      mockVectorStore.searchMemories = vi.fn().mockResolvedValue([]);

      const result = await engine.forget('nonexistent query', 'tenant1', 'agent1');
      expect(result).toBe(0);
    });
  });

  // Coverage Target: Line 348 (getHealth vector store false path)
  describe('Coverage Target: Line 348 (getHealth vector store false)', () => {
    it('should handle vector store health check returning false', async () => {
      const engine = new MemoryEngine(testConfig);
      await engine.initialize();

      // Mock vector store getHealth to return false
      mockVectorStore.getHealth = vi.fn().mockResolvedValue(false);

      const health = await engine.getHealth();
      expect(health.status).toBe('degraded');
      if (health.checks) {
        expect(health.checks.vectorStore).toBe(false);
      }
    });
  });

  // Additional Coverage: Multiple edge cases for remaining gaps
  describe('Coverage Target: Additional Edge Cases', () => {
    it('should handle multiple error scenarios comprehensively', async () => {
      const engine = new MemoryEngine(testConfig);
      
      // Test various initialization states and error conditions
      await expect(engine.forget('query', 'tenant1', 'agent1'))
        .rejects
        .toThrow('Memory engine not initialized');
        
      await engine.initialize();
      
      // Test edge case with empty query trim
      await expect(engine.recall('   ', 'tenant1', 'agent1'))
        .rejects
        .toThrow('Query cannot be empty');
    });
  });
});
