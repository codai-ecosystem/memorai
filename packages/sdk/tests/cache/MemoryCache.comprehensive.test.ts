/**
 * @fileoverview Comprehensive tests for MemoryCache to achieve 95%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryCache } from "../../src/cache/MemoryCache.js";
import type { CacheOptions, AgentMemory } from "../../src/types/index.js";

describe("MemoryCache - Comprehensive Coverage", () => {
  let cache: MemoryCache;
  // Mock memory data
  const mockMemory1: AgentMemory = {
    id: "mem1",
    content: "User prefers TypeScript for development",
    context: {
      sessionId: "test-session",
      topic: "development preferences",
    },
    metadata: {
      importance: 0.8,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      last_accessed_at: "2024-01-01T00:00:00Z",
    },
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockMemory2: AgentMemory = {
    id: "mem2",
    content: "User works on React projects frequently",
    context: {
      sessionId: "test-session",
      topic: "project preferences",
    },
    metadata: {
      importance: 0.7,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
      last_accessed_at: "2024-01-02T00:00:00Z",
    },
    createdAt: new Date("2024-01-02T00:00:00Z"),
    updatedAt: new Date("2024-01-02T00:00:00Z"),
  };
  const mockMemory3: AgentMemory = {
    id: "mem3",
    content: "Python is used for data analysis tasks",
    context: {
      sessionId: "test-session",
      topic: "data analysis",
    },
    metadata: {
      importance: 0.6,
      created_at: "2024-01-03T00:00:00Z",
      updated_at: "2024-01-03T00:00:00Z",
      last_accessed_at: "2024-01-03T00:00:00Z",
    },
    createdAt: new Date("2024-01-03T00:00:00Z"),
    updatedAt: new Date("2024-01-03T00:00:00Z"),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Constructor and Initialization", () => {
    it("should create cache with default options", () => {
      const options: CacheOptions = { enabled: true };
      cache = new MemoryCache(options);

      expect(cache.isEnabled).toBe(true);
      expect(cache.size).toBe(0);
      expect(cache.cacheOptions).toEqual({
        enabled: true,
        ttl: 300,
        maxSize: 1000,
        strategy: "lru",
      });
    });

    it("should create cache with custom options", () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 600,
        maxSize: 500,
        strategy: "fifo",
      };
      cache = new MemoryCache(options);

      expect(cache.cacheOptions).toEqual(options);
    });

    it("should create disabled cache", () => {
      const options: CacheOptions = { enabled: false };
      cache = new MemoryCache(options);

      expect(cache.isEnabled).toBe(false);
    });

    it("should start cleanup interval for enabled cache with TTL", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
      };
      cache = new MemoryCache(options);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });

    it("should not start cleanup interval for disabled cache", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      const options: CacheOptions = { enabled: false };
      cache = new MemoryCache(options);

      expect(setIntervalSpy).not.toHaveBeenCalled();
    });
  });

  describe("Basic Cache Operations - Enabled Cache", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 3,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should set and get item from cache", async () => {
      await cache.set("key1", mockMemory1);

      const result = await cache.get("key1");
      expect(result).toEqual(mockMemory1);
      expect(cache.size).toBe(1);
    });

    it("should return null for non-existent key", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should set item with custom TTL", async () => {
      await cache.set("key1", mockMemory1, 120);

      const result = await cache.get("key1");
      expect(result).toEqual(mockMemory1);
    });

    it("should delete item from cache", async () => {
      await cache.set("key1", mockMemory1);

      const deleted = await cache.delete("key1");
      expect(deleted).toBe(true);
      expect(cache.size).toBe(0);

      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should return false when deleting non-existent key", async () => {
      const deleted = await cache.delete("nonexistent");
      expect(deleted).toBe(false);
    });

    it("should clear all items from cache", async () => {
      await cache.set("key1", mockMemory1);
      await cache.set("key2", mockMemory2);

      expect(cache.size).toBe(2);

      await cache.clear();
      expect(cache.size).toBe(0);

      const result1 = await cache.get("key1");
      const result2 = await cache.get("key2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("Basic Cache Operations - Disabled Cache", () => {
    beforeEach(() => {
      const options: CacheOptions = { enabled: false };
      cache = new MemoryCache(options);
    });

    it("should return null when getting from disabled cache", async () => {
      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should not set item in disabled cache", async () => {
      await cache.set("key1", mockMemory1);

      expect(cache.size).toBe(0);
      const result = await cache.get("key1");
      expect(result).toBeNull();
    });

    it("should return false when deleting from disabled cache", async () => {
      const deleted = await cache.delete("key1");
      expect(deleted).toBe(false);
    });

    it("should return empty array when searching disabled cache", async () => {
      const results = await cache.search("test");
      expect(results).toEqual([]);
    });
  });

  describe("TTL and Expiration", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 5, // 5 seconds
        maxSize: 10,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should return null for expired item", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cache.set("key1", mockMemory1);

      // Advance time beyond TTL
      vi.setSystemTime(new Date("2024-01-01T00:00:10Z")); // 10 seconds later

      const result = await cache.get("key1");
      expect(result).toBeNull();
      expect(cache.size).toBe(0); // Should be removed from cache
    });

    it("should return item within TTL", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cache.set("key1", mockMemory1);

      // Advance time within TTL
      vi.setSystemTime(new Date("2024-01-01T00:00:03Z")); // 3 seconds later

      const result = await cache.get("key1");
      expect(result).toEqual(mockMemory1);
    });

    it("should handle items without TTL (no expiration)", async () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: undefined, // No TTL
        maxSize: 10,
        strategy: "lru",
      };
      const cacheNoTTL = new MemoryCache(options);

      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cacheNoTTL.set("key1", mockMemory1);

      // Advance time significantly
      vi.setSystemTime(new Date("2024-01-01T01:00:00Z")); // 1 hour later

      const result = await cacheNoTTL.get("key1");
      expect(result).toEqual(mockMemory1);
    });

    it("should handle custom TTL per item", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cache.set("key1", mockMemory1, 10); // Custom 10 second TTL

      // Advance time within custom TTL but beyond default TTL
      vi.setSystemTime(new Date("2024-01-01T00:00:07Z")); // 7 seconds later

      const result = await cache.get("key1");
      expect(result).toEqual(mockMemory1);

      // Advance time beyond custom TTL
      vi.setSystemTime(new Date("2024-01-01T00:00:15Z")); // 15 seconds later

      const result2 = await cache.get("key1");
      expect(result2).toBeNull();
    });
  });

  describe("Cache Size Management and Eviction", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 2, // Small cache for testing eviction
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should evict LRU item when cache is full", async () => {
      // Fill cache to max size
      await cache.set("key1", mockMemory1);
      await cache.set("key2", mockMemory2);

      expect(cache.size).toBe(2);

      // Access key1 to make it recently used
      await cache.get("key1");

      // Add new item - should evict key2 (least recently used)
      await cache.set("key3", mockMemory3);

      expect(cache.size).toBe(2);
      expect(await cache.get("key1")).toEqual(mockMemory1); // Still there
      expect(await cache.get("key2")).toBeNull(); // Evicted
      expect(await cache.get("key3")).toEqual(mockMemory3); // New item
    });

    it("should evict FIFO item when strategy is fifo", async () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 2,
        strategy: "fifo",
      };
      const fifoCache = new MemoryCache(options);

      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
      await fifoCache.set("key1", mockMemory1);

      vi.setSystemTime(new Date("2024-01-01T00:00:01Z"));
      await fifoCache.set("key2", mockMemory2);

      // Access key1 to make it recently used (shouldn't matter for FIFO)
      await fifoCache.get("key1");

      vi.setSystemTime(new Date("2024-01-01T00:00:02Z"));
      // Add new item - should evict key1 (first in)
      await fifoCache.set("key3", mockMemory3);

      expect(fifoCache.size).toBe(2);
      expect(await fifoCache.get("key1")).toBeNull(); // Evicted (first in)
      expect(await fifoCache.get("key2")).toEqual(mockMemory2); // Still there
      expect(await fifoCache.get("key3")).toEqual(mockMemory3); // New item
    });

    it("should handle empty cache eviction gracefully", async () => {
      // Try to add item to empty cache - should not cause errors
      await cache.set("key1", mockMemory1);
      expect(cache.size).toBe(1);
    });
  });

  describe("Search Functionality", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 10,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should search and return matching memories", async () => {
      await cache.set("key1", mockMemory1); // TypeScript
      await cache.set("key2", mockMemory2); // React
      await cache.set("key3", mockMemory3); // Python

      const results = await cache.search("TypeScript");
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockMemory1);
    });

    it("should search case-insensitively", async () => {
      await cache.set("key1", mockMemory1); // TypeScript

      const results = await cache.search("typescript");
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockMemory1);
    });

    it("should return multiple matching results sorted by relevance", async () => {
      const memory4: AgentMemory = {
        id: "mem4",
        content: "User loves TypeScript and uses TypeScript daily",
        context: {
          sessionId: "test-session",
          topic: "typescript usage",
        },
        metadata: {
          importance: 0.9,
          created_at: "2024-01-04T00:00:00Z",
          updated_at: "2024-01-04T00:00:00Z",
          last_accessed_at: "2024-01-04T00:00:00Z",
        },
        createdAt: new Date("2024-01-04T00:00:00Z"),
        updatedAt: new Date("2024-01-04T00:00:00Z"),
      };

      await cache.set("key1", mockMemory1); // One TypeScript mention
      await cache.set("key4", memory4); // Multiple TypeScript mentions

      const results = await cache.search("TypeScript");
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(memory4); // Should be first (higher score)
      expect(results[1]).toEqual(mockMemory1);
    });

    it("should limit search results", async () => {
      await cache.set("key1", mockMemory1);
      await cache.set("key2", mockMemory2);
      await cache.set("key3", mockMemory3);

      const results = await cache.search("for", 1); // All have "for"
      expect(results).toHaveLength(1);
    });

    it("should update access metadata during search", async () => {
      await cache.set("key1", mockMemory1);

      const statsBefore = cache.getStats();
      expect(statsBefore.totalHits).toBe(0);

      await cache.search("TypeScript");

      const statsAfter = cache.getStats();
      expect(statsAfter.totalHits).toBe(1);
    });

    it("should skip expired entries during search", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cache.set("key1", mockMemory1, 5); // 5 second TTL
      await cache.set("key2", mockMemory2, 300); // 300 second TTL

      // Advance time to expire first item
      vi.setSystemTime(new Date("2024-01-01T00:00:10Z"));

      const results = await cache.search("User");
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockMemory2); // Only non-expired item
      expect(cache.size).toBe(1); // Expired item should be removed
    });

    it("should handle search with no matches", async () => {
      await cache.set("key1", mockMemory1);

      const results = await cache.search("nonexistent");
      expect(results).toEqual([]);
    });

    it("should handle empty content in memories", async () => {
      const memoryWithoutContent: AgentMemory = {
        id: "mem_no_content",
        content: "",
        context: {
          sessionId: "test-session",
        },
        metadata: {
          importance: 0.5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_accessed_at: "2024-01-01T00:00:00Z",
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await cache.set("key1", memoryWithoutContent);

      const results = await cache.search("anything");
      expect(results).toEqual([]);
    });
  });

  describe("Statistics", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 10,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should return empty stats for disabled cache", () => {
      const disabledCache = new MemoryCache({ enabled: false });

      const stats = disabledCache.getStats();
      expect(stats).toEqual({
        size: 0,
        hitRate: 0,
        totalHits: 0,
        oldestEntry: null,
        newestEntry: null,
      });
    });

    it("should return empty stats for empty cache", () => {
      const stats = cache.getStats();
      expect(stats).toEqual({
        size: 0,
        hitRate: 0,
        totalHits: 0,
        oldestEntry: null,
        newestEntry: null,
      });
    });

    it("should calculate stats for cache with items", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
      await cache.set("key1", mockMemory1);

      vi.setSystemTime(new Date("2024-01-01T00:01:00Z"));
      await cache.set("key2", mockMemory2);

      // Access items to create hits
      await cache.get("key1"); // 1 hit
      await cache.get("key1"); // 2 hits
      await cache.get("key2"); // 1 hit

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.totalHits).toBe(3);
      expect(stats.hitRate).toBe(1.5); // 3 hits / 2 items
      expect(stats.oldestEntry).toEqual(new Date("2024-01-01T00:00:00Z"));
      expect(stats.newestEntry).toEqual(new Date("2024-01-01T00:01:00Z"));
    });
  });

  describe("Cleanup Operations", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 5, // 5 seconds
        maxSize: 10,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });
    it("should clean up expired entries", async () => {
      vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));

      await cache.set("key1", mockMemory1, 15); // 15 second TTL
      await cache.set("key2", mockMemory2, 5); // 5 second TTL
      await cache.set("key3", mockMemory3, 20); // 20 second TTL

      expect(cache.size).toBe(3);

      // Advance time to expire some items
      vi.setSystemTime(new Date("2024-01-01T00:00:12Z")); // 12 seconds later

      // Trigger cleanup by accessing cache
      await cache.get("key1");

      // key2 should be expired and removed, others should remain
      expect(await cache.get("key1")).toEqual(mockMemory1); // 15 > 12, still valid
      expect(await cache.get("key2")).toBeNull(); // 5 < 12, expired
      expect(await cache.get("key3")).toEqual(mockMemory3); // 20 > 12, still valid
    });

    it("should handle cleanup with no expired items", async () => {
      await cache.set("key1", mockMemory1, 300); // Long TTL

      const sizeBefore = cache.size;

      // Trigger cleanup
      await cache.get("key1");

      expect(cache.size).toBe(sizeBefore);
      expect(await cache.get("key1")).toEqual(mockMemory1);
    });
  });

  describe("Access Order Management", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 3,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should update access order when getting items", async () => {
      await cache.set("key1", mockMemory1);
      await cache.set("key2", mockMemory2);
      await cache.set("key3", mockMemory3);
      // Access in specific order
      await cache.get("key1");
      await cache.get("key3");
      await cache.get("key2");

      // Add new item - should evict least recently used (key1 was accessed first)
      const newMemory: AgentMemory = {
        id: "mem_new",
        content: "New memory item",
        context: {
          sessionId: "test-session",
        },
        metadata: {
          importance: 0.5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_accessed_at: "2024-01-01T00:00:00Z",
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await cache.set("key_new", newMemory);

      expect(cache.size).toBe(3);
      expect(await cache.get("key1")).toBeNull(); // Should be evicted
      expect(await cache.get("key2")).toEqual(mockMemory2);
      expect(await cache.get("key3")).toEqual(mockMemory3);
    });

    it("should update access order during search hits", async () => {
      await cache.set("key1", mockMemory1);
      await cache.set("key2", mockMemory2);

      // Search should update access order
      await cache.search("TypeScript");

      // Add two more items to fill cache and trigger eviction
      await cache.set("key3", mockMemory3);
      const newMemory: AgentMemory = {
        id: "mem_new",
        content: "Another memory",
        context: {
          sessionId: "test-session",
        },
        metadata: {
          importance: 0.5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_accessed_at: "2024-01-01T00:00:00Z",
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      // Cache maxSize is 3, this should evict the least recently used
      await cache.set("key4", newMemory);

      // key1 should still be there because it was accessed during search
      expect(await cache.get("key1")).toEqual(mockMemory1);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    beforeEach(() => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 10,
        strategy: "lru",
      };
      cache = new MemoryCache(options);
    });

    it("should handle undefined strategy gracefully", () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 2,
        strategy: undefined as any, // Force undefined strategy
      };
      const cacheWithUndefinedStrategy = new MemoryCache(options);

      expect(cacheWithUndefinedStrategy.cacheOptions.strategy).toBe("lru"); // Should default to LRU
    });

    it("should handle eviction when access order is empty", async () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 1,
        strategy: "lru",
      };
      const smallCache = new MemoryCache(options);

      // This should not throw error even with empty access order
      await smallCache.set("key1", mockMemory1);
      expect(smallCache.size).toBe(1);
    });

    it("should handle FIFO eviction with no entries", async () => {
      const options: CacheOptions = {
        enabled: true,
        ttl: 300,
        maxSize: 0, // Edge case: max size 0
        strategy: "fifo",
      };
      const zeroSizeCache = new MemoryCache(options);

      // Should handle this gracefully
      await zeroSizeCache.set("key1", mockMemory1);
      expect(zeroSizeCache.size).toBe(0);
    });

    it("should handle search with very large limit", async () => {
      await cache.set("key1", mockMemory1);

      const results = await cache.search("User", 999999);
      expect(results).toHaveLength(1);
    });

    it("should handle relevance score calculation edge cases", async () => {
      const memoryWithSpecialChars: AgentMemory = {
        id: "mem_special",
        content: "User! @#$%^&*() prefers [TypeScript] {regex}",
        context: {
          sessionId: "test-session",
        },
        metadata: {
          importance: 0.5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
          last_accessed_at: "2024-01-01T00:00:00Z",
        },
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
      };

      await cache.set("key1", memoryWithSpecialChars);

      const results = await cache.search("TypeScript");
      expect(results).toHaveLength(1);
    });
  });
});
