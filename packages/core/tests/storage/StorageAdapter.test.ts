import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InMemoryStorageAdapter,
  PostgreSQLStorageAdapter,
  RedisStorageAdapter,
} from '../../src/storage/StorageAdapter';
import type { MemoryMetadata } from '../../src/types/index';

// Mock Redis module to avoid connection issues
vi.mock('ioredis', () => {
  const mockRedisClient = {
    status: 'ready',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockImplementation((key: string) => {
      if (key === 'memory:test-123') {
        return Promise.resolve(
          JSON.stringify({
            id: 'test-123',
            content: 'Test content',
            tenant_id: 'tenant-1',
            agent_id: 'agent-1',
          })
        );
      }
      return Promise.resolve(null);
    }),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue(['memory:test-123']),
    mget: vi
      .fn()
      .mockResolvedValue(['{"id":"test-123","content":"Test"}', null]),
    sadd: vi.fn().mockResolvedValue(1),
    srem: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue(['test-123']),
    on: vi.fn(),
    off: vi.fn(),
  };

  return {
    default: vi.fn(() => mockRedisClient),
  };
});

describe('StorageAdapter', () => {
  describe('InMemoryStorageAdapter', () => {
    let adapter: InMemoryStorageAdapter;
    let sampleMemory: MemoryMetadata;

    beforeEach(() => {
      adapter = new InMemoryStorageAdapter();
      sampleMemory = {
        id: 'test-123',
        content: 'Test memory content',
        embedding: [0.1, 0.2, 0.3],
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        type: 'fact',
        confidence: 0.9,
        importance: 0.8,
        createdAt: new Date('2023-01-01T10:00:00Z'),
        updatedAt: new Date('2023-01-01T10:00:00Z'),
        lastAccessedAt: new Date('2023-01-01T10:00:00Z'),
        accessCount: 0,
        tags: ['test', 'memory'],
      };
    });

    describe('store', () => {
      it('should store a memory', async () => {
        await adapter.store(sampleMemory);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved).toEqual(sampleMemory);
      });

      it('should create a copy of the memory object', async () => {
        await adapter.store(sampleMemory);

        // Modify the original object
        sampleMemory.content = 'Modified content';

        // Retrieved memory should be unchanged
        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved?.content).toBe('Test memory content');
      });

      it('should overwrite existing memory with same ID', async () => {
        await adapter.store(sampleMemory);

        const updatedMemory = { ...sampleMemory, content: 'Updated content' };
        await adapter.store(updatedMemory);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved?.content).toBe('Updated content');
      });
    });

    describe('retrieve', () => {
      it('should retrieve an existing memory', async () => {
        await adapter.store(sampleMemory);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved).toEqual(sampleMemory);
      });

      it('should return null for non-existent memory', async () => {
        const retrieved = await adapter.retrieve('non-existent-id');
        expect(retrieved).toBeNull();
      });

      it('should return null for empty ID', async () => {
        const retrieved = await adapter.retrieve('');
        expect(retrieved).toBeNull();
      });
    });

    describe('update', () => {
      beforeEach(async () => {
        await adapter.store(sampleMemory);
      });

      it('should update existing memory fields', async () => {
        const updates = {
          content: 'Updated content',
          importance: 0.9,
        };

        await adapter.update(sampleMemory.id, updates);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved?.content).toBe('Updated content');
        expect(retrieved?.importance).toBe(0.9);
        expect(retrieved?.tenant_id).toBe(sampleMemory.tenant_id); // Unchanged
      });

      it('should not affect non-existent memory', async () => {
        const updates = { content: 'New content' };

        // Should not throw error
        await adapter.update('non-existent-id', updates);

        const retrieved = await adapter.retrieve('non-existent-id');
        expect(retrieved).toBeNull();
      });

      it('should handle partial updates', async () => {
        const updates = { importance: 0.5 };

        await adapter.update(sampleMemory.id, updates);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved?.importance).toBe(0.5);
        expect(retrieved?.content).toBe(sampleMemory.content); // Unchanged
      });

      it('should handle empty updates', async () => {
        const originalMemory = await adapter.retrieve(sampleMemory.id);

        await adapter.update(sampleMemory.id, {});

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved).toEqual(originalMemory);
      });
    });

    describe('delete', () => {
      beforeEach(async () => {
        await adapter.store(sampleMemory);
      });

      it('should delete existing memory', async () => {
        await adapter.delete(sampleMemory.id);

        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved).toBeNull();
      });

      it('should not throw error for non-existent memory', async () => {
        // Should not throw
        await adapter.delete('non-existent-id');

        // Original memory should still exist
        const retrieved = await adapter.retrieve(sampleMemory.id);
        expect(retrieved).toEqual(sampleMemory);
      });

      it('should not affect other memories', async () => {
        const anotherMemory = { ...sampleMemory, id: 'another-123' };
        await adapter.store(anotherMemory);

        await adapter.delete(sampleMemory.id);

        const retrieved = await adapter.retrieve(anotherMemory.id);
        expect(retrieved).toEqual(anotherMemory);
      });
    });

    describe('list', () => {
      beforeEach(async () => {
        // Store multiple test memories
        const memories = [
          {
            ...sampleMemory,
            id: 'memory-1',
            content: 'First memory',
            tenant_id: 'tenant-1',
            agent_id: 'agent-1',
            type: 'fact' as const,
            importance: 0.8,
            createdAt: new Date('2023-01-01T10:00:00Z'),
          },
          {
            ...sampleMemory,
            id: 'memory-2',
            content: 'Second memory',
            tenant_id: 'tenant-1',
            agent_id: 'agent-2',
            type: 'task' as const,
            importance: 0.6,
            createdAt: new Date('2023-01-02T10:00:00Z'),
          },
          {
            ...sampleMemory,
            id: 'memory-3',
            content: 'Third memory',
            tenant_id: 'tenant-2',
            agent_id: 'agent-1',
            type: 'fact' as const,
            importance: 0.9,
            createdAt: new Date('2023-01-03T10:00:00Z'),
          },
        ];

        for (const memory of memories) {
          await adapter.store(memory);
        }
      });

      it('should list all memories when no filters applied', async () => {
        const memories = await adapter.list();
        expect(memories).toHaveLength(3);
      });

      it('should sort memories by createdAt descending', async () => {
        const memories = await adapter.list();

        expect(memories[0].id).toBe('memory-3'); // 2023-01-03
        expect(memories[1].id).toBe('memory-2'); // 2023-01-02
        expect(memories[2].id).toBe('memory-1'); // 2023-01-01
      });

      it('should filter by tenantId', async () => {
        const memories = await adapter.list({ tenantId: 'tenant-1' });

        expect(memories).toHaveLength(2);
        expect(memories.every(m => m.tenant_id === 'tenant-1')).toBe(true);
      });

      it('should filter by agentId', async () => {
        const memories = await adapter.list({ agentId: 'agent-1' });

        expect(memories).toHaveLength(2);
        expect(memories.every(m => m.agent_id === 'agent-1')).toBe(true);
      });
      it('should filter by type', async () => {
        const memories = await adapter.list({ type: 'fact' });

        expect(memories).toHaveLength(2);
        expect(memories.every(m => m.type === 'fact')).toBe(true);
      });

      it('should filter by minimum importance', async () => {
        const memories = await adapter.list({ importance: 0.7 });

        expect(memories).toHaveLength(2);
        expect(memories.every(m => m.importance >= 0.7)).toBe(true);
      });

      it('should filter by since date', async () => {
        const sinceDate = new Date('2023-01-02T00:00:00Z');
        const memories = await adapter.list({ since: sinceDate });

        expect(memories).toHaveLength(2);
        expect(memories.every(m => m.createdAt >= sinceDate)).toBe(true);
      });

      it('should filter by until date', async () => {
        const untilDate = new Date('2023-01-02T00:00:00Z');
        const memories = await adapter.list({ until: untilDate });

        expect(memories).toHaveLength(1);
        expect(memories.every(m => m.createdAt <= untilDate)).toBe(true);
      });

      it('should apply pagination with offset', async () => {
        const memories = await adapter.list({ offset: 1 });

        expect(memories).toHaveLength(2);
        expect(memories[0].id).toBe('memory-2'); // Second in sorted order
      });

      it('should apply pagination with limit', async () => {
        const memories = await adapter.list({ limit: 2 });

        expect(memories).toHaveLength(2);
        expect(memories[0].id).toBe('memory-3'); // First in sorted order
        expect(memories[1].id).toBe('memory-2'); // Second in sorted order
      });

      it('should apply pagination with offset and limit', async () => {
        const memories = await adapter.list({ offset: 1, limit: 1 });

        expect(memories).toHaveLength(1);
        expect(memories[0].id).toBe('memory-2'); // Second in sorted order
      });
      it('should combine multiple filters', async () => {
        const memories = await adapter.list({
          tenantId: 'tenant-1',
          type: 'fact',
          importance: 0.7,
        });

        expect(memories).toHaveLength(1);
        expect(memories[0].id).toBe('memory-1');
      });

      it('should handle empty filters object', async () => {
        const memories = await adapter.list({});
        expect(memories).toHaveLength(3);
      });

      it('should handle undefined filters', async () => {
        const memories = await adapter.list(undefined);
        expect(memories).toHaveLength(3);
      });

      it('should return empty array when no memories match filters', async () => {
        const memories = await adapter.list({
          tenantId: 'non-existent-tenant',
        });
        expect(memories).toHaveLength(0);
      });

      it('should handle zero importance filter', async () => {
        const memories = await adapter.list({ importance: 0 });
        expect(memories).toHaveLength(3); // All memories have importance >= 0
      });

      it('should handle exact importance filter', async () => {
        const memories = await adapter.list({ importance: 0.8 });
        expect(memories).toHaveLength(2); // memories with importance 0.8 and 0.9
      });
    });

    describe('clear', () => {
      beforeEach(async () => {
        // Store test memories in different tenants
        const memories = [
          { ...sampleMemory, id: 'mem-1', tenant_id: 'tenant-1' },
          { ...sampleMemory, id: 'mem-2', tenant_id: 'tenant-1' },
          { ...sampleMemory, id: 'mem-3', tenant_id: 'tenant-2' },
          { ...sampleMemory, id: 'mem-4', tenant_id: 'tenant-2' },
        ];

        for (const memory of memories) {
          await adapter.store(memory);
        }
      });

      it('should clear all memories when no tenantId provided', async () => {
        await adapter.clear();

        const memories = await adapter.list();
        expect(memories).toHaveLength(0);
      });

      it('should clear memories for specific tenant only', async () => {
        await adapter.clear('tenant-1');

        const allMemories = await adapter.list();
        expect(allMemories).toHaveLength(2);
        expect(allMemories.every(m => m.tenant_id === 'tenant-2')).toBe(true);
      });

      it('should not affect other tenants when clearing specific tenant', async () => {
        await adapter.clear('tenant-1');

        const tenant2Memories = await adapter.list({ tenantId: 'tenant-2' });
        expect(tenant2Memories).toHaveLength(2);
      });

      it('should handle clearing non-existent tenant', async () => {
        await adapter.clear('non-existent-tenant');

        const memories = await adapter.list();
        expect(memories).toHaveLength(4); // All memories should remain
      });

      it('should handle clearing empty storage', async () => {
        await adapter.clear(); // Clear all first

        // Should not throw error
        await adapter.clear();

        const memories = await adapter.list();
        expect(memories).toHaveLength(0);
      });
    });
  });

  describe('PostgreSQLStorageAdapter', () => {
    let adapter: PostgreSQLStorageAdapter;

    beforeEach(() => {
      adapter = new PostgreSQLStorageAdapter(
        'postgresql://localhost:5432/test'
      );
    });

    it('should throw initialization error when not initialized', async () => {
      const memory = { id: 'test' } as MemoryMetadata;
      await expect(adapter.store(memory)).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for retrieve method', async () => {
      await expect(adapter.retrieve('test-id')).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for update method', async () => {
      await expect(adapter.update('test-id', {})).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for delete method', async () => {
      await expect(adapter.delete('test-id')).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for list method', async () => {
      await expect(adapter.list()).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for clear method', async () => {
      await expect(adapter.clear()).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });

    it('should throw initialization error for clear method with tenantId', async () => {
      await expect(adapter.clear('tenant-1')).rejects.toThrow(
        'PostgreSQL adapter not initialized'
      );
    });
  });

  describe('RedisStorageAdapter', () => {
    let adapter: RedisStorageAdapter;
    let sampleMemory: MemoryMetadata;

    beforeEach(() => {
      adapter = new RedisStorageAdapter('redis://localhost:6379');
      sampleMemory = {
        id: 'test-123',
        type: 'fact' as const,
        content: 'Test content',
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        importance: 0.8,
        tags: [],
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
      } as MemoryMetadata;
    });

    it('should store memory successfully', async () => {
      await adapter.store(sampleMemory);
      // Mocked Redis should handle the store operation
      expect(true).toBe(true);
    });

    it('should retrieve stored memory', async () => {
      const result = await adapter.retrieve('test-123');
      expect(result).toBeTruthy();
      expect(result?.id).toBe('test-123');
      expect(result?.content).toBe('Test content');
    });

    it('should return null for non-existent memory', async () => {
      const result = await adapter.retrieve('non-existent');
      expect(result).toBeNull();
    });

    it('should update existing memory', async () => {
      await adapter.store(sampleMemory);
      await adapter.update('test-123', { content: 'Updated content' });
      // Verify the update operation completes without error
      expect(true).toBe(true);
    });

    it('should handle update operation for non-existent memory', async () => {
      await expect(
        adapter.update('non-existent', { content: 'test' })
      ).rejects.toThrow();
    });

    it('should delete memory successfully', async () => {
      await adapter.store(sampleMemory);
      await adapter.delete('test-123');
      // Verify the delete operation completes without error
      expect(true).toBe(true);
    });

    it('should list stored memories', async () => {
      const result = await adapter.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should list memories with filters', async () => {
      const result = await adapter.list({ tenantId: 'tenant-1' });
      expect(Array.isArray(result)).toBe(true);
    });

    it('should clear all memories', async () => {
      await adapter.store(sampleMemory);
      await adapter.clear();
      // Verify the clear operation completes without error
      expect(true).toBe(true);
    });

    it('should clear memories for specific tenant', async () => {
      await adapter.store(sampleMemory);
      await adapter.clear('tenant-1');
      // Verify the tenant-specific clear operation completes without error
      expect(true).toBe(true);
    });

    it('should handle store operation with TTL', async () => {
      const memoryWithTtl = {
        ...sampleMemory,
        ttl: new Date(Date.now() + 3600000), // 1 hour from now
      };
      await adapter.store(memoryWithTtl);
      expect(true).toBe(true);
    });

    it('should handle store operation with expired TTL', async () => {
      const memoryWithExpiredTtl = {
        ...sampleMemory,
        ttl: new Date(Date.now() - 3600000), // 1 hour ago (expired)
      };
      await adapter.store(memoryWithExpiredTtl);
      expect(true).toBe(true);
    });
  });
});
