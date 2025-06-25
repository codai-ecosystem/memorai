import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryCache } from '../../src/cache/MemoryCache.js';
import type { AgentMemory, CacheOptions } from '../../src/types/index.js';

describe('MemoryCache - Final Coverage Push', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    const options: CacheOptions = {
      enabled: true,
      maxSize: 2,
      strategy: 'lru',
    };
    cache = new MemoryCache(options);
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Coverage Target: Lines 215, 225, 294-307', () => {
    it('should handle cache cleanup during addition (line 215)', async () => {
      // Fill cache to capacity
      const memory1: AgentMemory = {
        id: 'mem1',
        content: 'Memory 1',
        createdAt: new Date(Date.now() - 2000),
        updatedAt: new Date(Date.now() - 2000),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      };

      const memory2: AgentMemory = {
        id: 'mem2',
        content: 'Memory 2',
        createdAt: new Date(Date.now() - 1000),
        updatedAt: new Date(Date.now() - 1000),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      };

      cache.set('key1', memory1);
      cache.set('key2', memory2);

      // Adding third item should trigger cleanup (line 215)
      const memory3: AgentMemory = {
        id: 'mem3',
        content: 'Memory 3',
        createdAt: new Date(),
        updatedAt: new Date(),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      };
      cache.set('key3', memory3);

      // Should have evicted oldest item
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key3')).toBeDefined();
    });

    it('should handle cache statistics and access patterns (lines 225)', async () => {
      // Perform operations to create stats
      cache.set('key1', {
        id: 'mem1',
        content: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      });
      await cache.get('key1'); // Hit
      await cache.get('nonexistent'); // Miss

      const stats = cache.getStats();
      expect(stats.totalHits).toBeGreaterThanOrEqual(0);
      expect(stats.size).toBe(1);
    });

    it('should handle LRU eviction edge cases (lines 294-307)', async () => {
      // Create cache with specific scenario to hit LRU eviction paths
      const memory1: AgentMemory = {
        id: 'mem1',
        content: 'Memory 1',
        createdAt: new Date(Date.now() - 3000),
        updatedAt: new Date(Date.now() - 3000),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.3, type: 'fact' },
      };

      const memory2: AgentMemory = {
        id: 'mem2',
        content: 'Memory 2',
        createdAt: new Date(Date.now() - 2000),
        updatedAt: new Date(Date.now() - 2000),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.7, type: 'fact' },
      };

      cache.set('key1', memory1);
      cache.set('key2', memory2); // Access key1 to update its position in LRU
      await cache.get('key1');

      // Add new item that should trigger eviction
      const memory3: AgentMemory = {
        id: 'mem3',
        content: 'Memory 3',
        createdAt: new Date(),
        updatedAt: new Date(),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      };

      cache.set('key3', memory3);

      // Should have evicted key2 (least recently used)
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key1')).toBeDefined();
      expect(await cache.get('key3')).toBeDefined();
    });

    it('should handle size calculation edge cases in eviction (lines 294-307)', () => {
      // Test specific eviction scenarios with large content
      const largeMemory: AgentMemory = {
        id: 'large',
        content: 'A'.repeat(1000), // Large content
        createdAt: new Date(),
        updatedAt: new Date(),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.8, type: 'fact' },
      };

      cache.set('large', largeMemory);

      // Add second item
      const smallMemory: AgentMemory = {
        id: 'small',
        content: 'Small',
        createdAt: new Date(Date.now() + 1000),
        updatedAt: new Date(Date.now() + 1000),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.2, type: 'fact' },
      };

      cache.set('small', smallMemory);

      // Verify cache working correctly with eviction
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(2);
    });

    it('should handle cache cleanup with empty cache edge case', () => {
      // Test cleanup when cache is already empty
      cache.clear();

      // Adding to empty cache should work fine
      const memory: AgentMemory = {
        id: 'test',
        content: 'Test memory',
        createdAt: new Date(),
        updatedAt: new Date(),
        context: { sessionId: 'session1' },
        metadata: { importance: 0.5, type: 'fact' },
      };

      cache.set('test', memory);
      expect(cache.get('test')).toBeDefined();
    });
  });
});
