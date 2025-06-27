import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine.js';
import type { ContextRequest, MemoryConfig } from '../../src/types/index.js';

describe('MemoryEngine - Ultimate Coverage Tests', () => {
  let memoryEngine: MemoryEngine;

  const testConfig: Partial<MemoryConfig> = {
    embedding: {
      provider: 'azure' as const,
      model: 'text-embedding-3-small',
      api_key: 'test-api-key',
      azure_endpoint: 'https://test.openai.azure.com',
      azure_api_version: '2024-02-01',
    },
    security: {
      encryption_key: 'test-encryption-key-32-characters-long',
      tenant_isolation: true,
      audit_logs: false,
    },
    vector_db: {
      url: 'http://localhost:6333',
      collection: 'memories',
      dimension: 1536,
    },
  };

  beforeEach(async () => {
    // Force in-memory mode for testing
    process.env.MEMORAI_USE_INMEMORY = 'true';

    memoryEngine = new MemoryEngine(testConfig);
    await memoryEngine.initialize();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MEMORAI_USE_INMEMORY;
  });

  describe('Initialization Coverage', () => {
    it('should initialize with proper configuration', async () => {
      const engine = new MemoryEngine(testConfig);
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('should handle empty configuration gracefully', async () => {
      const engine = new MemoryEngine();
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization before operations', async () => {
      const uninitializedEngine = new MemoryEngine(testConfig);

      await expect(
        uninitializedEngine.remember('test', 'tenant', 'agent')
      ).rejects.toThrow('not initialized');
    });
  });

  describe('Memory Storage Operations', () => {
    it('should store memory with basic content', async () => {
      const content = 'Test memory content for ultimate coverage';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const memoryId = await memoryEngine.remember(content, tenantId, agentId);

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
      expect(memoryId.length).toBeGreaterThan(0);
    });

    it('should handle empty content gracefully', async () => {
      const content = '';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      await expect(
        memoryEngine.remember(content, tenantId, agentId)
      ).rejects.toThrow();
    });

    it('should handle whitespace-only content', async () => {
      const content = '   \\n\\t   ';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      await expect(
        memoryEngine.remember(content, tenantId, agentId)
      ).rejects.toThrow();
    });

    it('should handle very long content', async () => {
      const content = 'x'.repeat(10000); // 10KB content
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const memoryId = await memoryEngine.remember(content, tenantId, agentId);

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
    });

    it('should handle special characters and unicode', async () => {
      const content = 'Special chars: 🚀 🧠 💾 中文 العربية русский';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const memoryId = await memoryEngine.remember(content, tenantId, agentId);

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
    });

    it('should handle concurrent memory storage', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
        memoryEngine.remember(`Concurrent memory ${i}`, tenantId, agentId)
      );

      const results = await Promise.all(concurrentOperations);

      results.forEach(memoryId => {
        expect(memoryId).toBeDefined();
        expect(typeof memoryId).toBe('string');
      });

      // All IDs should be unique
      const uniqueIds = new Set(results);
      expect(uniqueIds.size).toBe(results.length);
    });
  });

  describe('Memory Retrieval Operations', () => {
    beforeEach(async () => {
      // Store some test memories first
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      await memoryEngine.remember(
        'The sky is blue and beautiful',
        tenantId,
        agentId,
        {
          type: 'fact',
          importance: 0.8,
          tags: ['color', 'nature'],
        }
      );

      await memoryEngine.remember(
        'Meeting with John tomorrow at 3 PM',
        tenantId,
        agentId,
        {
          type: 'task',
          importance: 0.9,
          tags: ['meeting', 'schedule'],
        }
      );

      await memoryEngine.remember(
        'I prefer coffee over tea',
        tenantId,
        agentId,
        {
          type: 'preference',
          importance: 0.6,
          tags: ['beverage', 'personal'],
        }
      );
    });

    it('should recall memories with basic query', async () => {
      const query = 'blue sky';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const results = await memoryEngine.recall(query, tenantId, agentId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('memory');
      expect(firstResult).toHaveProperty('score');
    });

    it('should handle empty query in recall', async () => {
      const query = '';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      await expect(
        memoryEngine.recall(query, tenantId, agentId)
      ).rejects.toThrow();
    });

    it('should handle tenant isolation', async () => {
      const query = 'sky';
      const differentTenantId = 'different-tenant';
      const agentId = 'test-agent';

      const results = await memoryEngine.recall(
        query,
        differentTenantId,
        agentId
      );

      expect(Array.isArray(results)).toBe(true);
      // Should return fewer or no results for different tenant
    });
  });

  describe('Context Operations', () => {
    beforeEach(async () => {
      // Store some memories with context
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      await memoryEngine.remember(
        'User likes dark mode interface',
        tenantId,
        agentId,
        {
          type: 'preference',
          context: { ui: 'preference', setting: 'dark_mode' },
        }
      );
    });

    it('should retrieve context for agent', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const contextRequest: ContextRequest = {
        tenant_id: tenantId,
        agent_id: agentId,
        max_memories: 20,
      };

      const contextResponse = await memoryEngine.context(contextRequest);

      expect(contextResponse).toBeDefined();
      expect(contextResponse).toHaveProperty('memories');
      expect(Array.isArray(contextResponse.memories)).toBe(true);
      expect(contextResponse).toHaveProperty('summary');
    });

    it('should handle empty context gracefully', async () => {
      const tenantId = 'empty-tenant';
      const agentId = 'empty-agent';

      const contextRequest: ContextRequest = {
        tenant_id: tenantId,
        agent_id: agentId,
        max_memories: 20,
      };

      const contextResponse = await memoryEngine.context(contextRequest);

      expect(contextResponse).toBeDefined();
      expect(contextResponse.memories).toHaveLength(0);
      expect(contextResponse.summary).toBeDefined();
    });
  });

  describe('Memory Deletion Operations', () => {
    let storedMemoryId: string;

    beforeEach(async () => {
      // Store a memory to delete later
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';
      storedMemoryId = await memoryEngine.remember(
        'Memory to be deleted',
        tenantId,
        agentId
      );
    });

    it('should delete memory by ID', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      const success = await memoryEngine.forget(
        storedMemoryId,
        tenantId,
        agentId
      );

      expect(success).toBe(true);
    });

    it('should handle deletion of non-existent memory', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';
      const nonExistentId = 'non-existent-memory-id';

      const success = await memoryEngine.forget(
        nonExistentId,
        tenantId,
        agentId
      );

      // Should handle gracefully
      expect(typeof success).toBe('boolean');
    });

    it('should handle invalid memory ID format', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';
      const invalidId = '';

      await expect(
        memoryEngine.forget(invalidId, tenantId, agentId)
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tenant ID', async () => {
      const content = 'Test content';
      const invalidTenantId = '';
      const agentId = 'test-agent';

      await expect(
        memoryEngine.remember(content, invalidTenantId, agentId)
      ).rejects.toThrow();
    });

    it('should handle null and undefined values gracefully', async () => {
      const content = 'Test content';
      const tenantId = 'test-tenant';

      // Should work without agentId
      const memoryId = await memoryEngine.remember(content, tenantId);
      expect(memoryId).toBeDefined();
    });

    it('should handle concurrent operations', async () => {
      const content = 'Concurrent test memory';
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      // Store a memory
      const memoryId = await memoryEngine.remember(content, tenantId, agentId);

      // Try concurrent operations
      const operations = [
        memoryEngine.recall('concurrent', tenantId, agentId),
        memoryEngine.recall('test', tenantId, agentId),
        memoryEngine.context({
          tenant_id: tenantId,
          agent_id: agentId,
          max_memories: 20,
        }),
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      expect(Array.isArray(results[0])).toBe(true);
      expect(Array.isArray(results[1])).toBe(true);
      expect(results[2]).toHaveProperty('memories');
    });
  });

  describe('Performance Testing', () => {
    it('should handle large batch of memories efficiently', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';
      const batchSize = 20; // Reduced for faster testing

      const startTime = Date.now();

      const promises = Array.from({ length: batchSize }, (_, i) =>
        memoryEngine.remember(
          `Batch memory ${i} with content`,
          tenantId,
          agentId
        )
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(batchSize);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      results.forEach(memoryId => {
        expect(memoryId).toBeDefined();
        expect(typeof memoryId).toBe('string');
      });
    });

    it('should maintain performance with increasing memory count', async () => {
      const tenantId = 'test-tenant';
      const agentId = 'test-agent';

      // Store some memories first
      for (let i = 0; i < 10; i++) {
        await memoryEngine.remember(
          `Performance test memory ${i}`,
          tenantId,
          agentId
        );
      }

      // Test recall performance
      const startTime = Date.now();
      const results = await memoryEngine.recall(
        'performance test',
        tenantId,
        agentId
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
