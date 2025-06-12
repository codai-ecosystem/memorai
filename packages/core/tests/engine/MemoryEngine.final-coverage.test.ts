import { describe, it, expect, vi } from 'vitest';
import { MemoryEngine } from '../../src/engine/MemoryEngine';

describe('MemoryEngine - Final Coverage Push', () => {
  const testConfig = {
    embedding: {
      provider: 'openai' as const,
      model: 'text-embedding-3-small',
      api_key: 'test-api-key-must-be-at-least-32-characters-long-for-validation'
    },
    security: {
      encryption_key: 'test-encryption-key-32-characters-long-very-secure',
      tenant_isolation: true,
      audit_logs: false
    }
  };
  it('should cover lines 131-132: empty query validation in recall', async () => {
    const engine = new MemoryEngine(testConfig);

    (engine as any).isInitialized = true;

    // Test empty query - covers line 131-132
    await expect(
      engine.recall('', 'tenant1', 'agent1')
    ).rejects.toThrow('Query cannot be empty');
  });

  it('should cover lines 179-180: initialization check in forget method', async () => {
    const engine = new MemoryEngine(testConfig);

    // Engine not initialized - covers lines 179-180
    await expect(
      engine.forget('test query', 'tenant1', 'agent1')
    ).rejects.toThrow('Memory engine not initialized. Call initialize() first.');
  });
  it('should cover line 348: getHealth catch block error handling', async () => {
    const engine = new MemoryEngine(testConfig);

    (engine as any).isInitialized = true;

    // Mock embedding service to be healthy
    const mockEmbedding = {
      embed: vi.fn(),
      embedBatch: vi.fn(),
      getDimensions: vi.fn().mockReturnValue(1536),
      checkHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
    };

    (engine as any).embedding = mockEmbedding;

    // Mock vector store to throw error during health check
    const erroringVectorStore = {
      checkHealth: vi.fn().mockRejectedValue(new Error('Health check failed')),
      initialize: vi.fn().mockResolvedValue(undefined),
      storeMemory: vi.fn(),
      searchMemories: vi.fn(),
      deleteMemories: vi.fn(),
      updateMemory: vi.fn(),
      getMemory: vi.fn(),
    };

    (engine as any).vectorStore = erroringVectorStore;

    // This should hit the catch block in getHealth method - line 348
    const health = await engine.getHealth();

    expect(health.status).toBe('degraded');
    expect(health.checks?.vectorStore).toBe(false);
  });
});
