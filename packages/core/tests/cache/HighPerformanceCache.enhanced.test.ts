import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HighPerformanceCache } from '../../src/cache/HighPerformanceCache.js';

describe('HighPerformanceCache - Enhanced Coverage', () => {
  let cache: HighPerformanceCache<string>;

  beforeEach(() => {
    cache = new HighPerformanceCache<string>({
      maxSize: 100,
      defaultTtl: 1,
      enableCompression: true,
      enableStatistics: true,
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Core Cache Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull();
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track hit and miss statistics', () => {
      const initialStats = cache.getStats();
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);

      cache.set('stat-key', 'stat-value');
      cache.get('stat-key');
      cache.get('non-existent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should track cache size', () => {
      const sizeInfo = cache.getSizeInfo();
      expect(sizeInfo.entries).toBe(0);
      expect(sizeInfo.maxSize).toBe(100);

      cache.set('size-key', 'size-value');
      
      const newSizeInfo = cache.getSizeInfo();
      expect(newSizeInfo.entries).toBe(1);
    });
  });

  describe('Bulk Operations', () => {
    it('should support setMultiple operation', () => {
      const entries = [
        { key: 'bulk1', value: 'value1' },
        { key: 'bulk2', value: 'value2', ttl: 10 },
      ];

      cache.setMultiple(entries);

      expect(cache.get('bulk1')).toBe('value1');
      expect(cache.get('bulk2')).toBe('value2');
    });

    it('should support getMultiple operation', () => {
      cache.set('multi1', 'value1');
      cache.set('multi2', 'value2');

      const results = cache.getMultiple(['multi1', 'multi2', 'non-existent']);
      
      expect(results.get('multi1')).toBe('value1');
      expect(results.get('multi2')).toBe('value2');
      expect(results.get('non-existent')).toBeNull();
    });
  });
});
