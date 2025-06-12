import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';
import type { MemoryConfig, MemoryResult, MemoryMetadata } from '../../src/types';

describe('MemoryEngine - 110% Perfection Push', () => {
  let memoryEngine: MemoryEngine;
  let testConfig: MemoryConfig;
  let mockVectorStore: any;
  let mockEmbedding: any;

  beforeEach(() => {
    // Create proper test configuration
    testConfig = {
      vector_db: {
        url: 'http://localhost:6333',
        collection: 'test_memories',
        dimension: 1536
      },
      redis: {
        url: 'redis://localhost:6379',
        db: 0
      },
      embedding: {
        provider: 'openai',
        api_key: 'test-api-key-12345678901234567890',
        model: 'text-embedding-ada-002'
      },
      performance: {
        max_query_time_ms: 100,
        cache_ttl_seconds: 300,
        batch_size: 100
      },
      security: {
        encryption_key: 'test-encryption-key-12345678901234567890',
        tenant_isolation: true,
        audit_logs: true
      }
    };

    // Mock vector store with comprehensive methods
    mockVectorStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      storeMemory: vi.fn().mockResolvedValue('test-id'),
      searchMemories: vi.fn().mockResolvedValue([]),
      deleteMemories: vi.fn().mockResolvedValue(undefined),
      getMemoryCount: vi.fn().mockResolvedValue(100),
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy' })
    };

    // Mock embedding service
    mockEmbedding = {
      embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
    };

    // Create MemoryEngine with injected dependencies
    memoryEngine = new MemoryEngine(testConfig);
    (memoryEngine as any).vectorStore = mockVectorStore;
    (memoryEngine as any).embeddingService = mockEmbedding;
    (memoryEngine as any).isInitialized = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Coverage Target: Lines 398-404 (getHealth catch block)', () => {
    it('should handle getHealth method errors in catch block', async () => {
      // Force the try block to throw by making isInitialized getter throw
      const originalValue = (memoryEngine as any).isInitialized;
      
      Object.defineProperty(memoryEngine, 'isInitialized', {
        get: () => { throw new Error('Property access error'); },
        configurable: true
      });
      
      try {
        const health = await memoryEngine.getHealth();
        
        // Should return the catch block response
        expect(health.status).toBe('unhealthy');
        expect(health.initialized).toBe(false);
        expect(health.checks?.error).toBe(false);
        expect(health.timestamp).toBeInstanceOf(Date);
      } finally {
        // Restore the original property
        Object.defineProperty(memoryEngine, 'isInitialized', {
          value: originalValue,
          writable: true,
          configurable: true
        });
      }
    });
  });

  describe('Coverage Target: Additional Edge Cases', () => {
    it('should handle close method errors - catching and re-throwing', async () => {
      // Make close method throw error to test the catch block in close()
      mockVectorStore.close.mockRejectedValue(new Error('Close failed'));
      
      // The close method catches errors and re-throws as MemoryError
      await expect(memoryEngine.close()).rejects.toThrow('Failed to close: Close failed');
      
      // Should still set isInitialized to false even when error occurs
      expect((memoryEngine as any).isInitialized).toBe(false);
    });
  });
});
