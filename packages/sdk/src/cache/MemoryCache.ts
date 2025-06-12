/**
 * @fileoverview Memory cache implementation for SDK
 */

import type { CacheOptions, AgentMemory } from '../types/index.js';

/**
 * Cache entry with metadata
 */
interface CacheEntry {
  value: AgentMemory;
  timestamp: number;
  ttl: number | undefined;
  hits: number;
  lastAccessed: number;
}

/**
 * In-memory cache for agent memories
 */
export class MemoryCache {
  private cache = new Map<string, CacheEntry>();
  private options: CacheOptions;
  private accessOrder: string[] = []; // For LRU strategy
  constructor(options: CacheOptions) {
    this.options = {
      enabled: options.enabled || false,
      ttl: 'ttl' in options ? options.ttl : 300, // Use provided TTL (including undefined) or default to 300
      maxSize: options.maxSize ?? 1000,
      strategy: options.strategy || 'lru'
    };

    // Start cleanup interval if caching is enabled
    if (this.options.enabled && this.options.ttl) {
      setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }
  }

  /**
   * Get item from cache
   */
  public async get(key: string): Promise<AgentMemory | null> {
    if (!this.options.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Update access metadata
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    return entry.value;
  }
  /**
   * Set item in cache
   */
  public async set(key: string, value: AgentMemory, ttl?: number): Promise<void> {
    if (!this.options.enabled) {
      return;
    }

    const maxSize = this.options.maxSize ?? 1000;
    
    // Handle edge case where maxSize is 0
    if (maxSize === 0) {
      return; // Don't add anything to cache
    }

    // Check cache size and evict if necessary
    if (this.cache.size >= maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const now = Date.now();
    const entry: CacheEntry = {
      value,
      timestamp: now,
      ttl: ttl ?? this.options.ttl,
      hits: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Delete item from cache
   */
  public async delete(key: string): Promise<boolean> {
    if (!this.options.enabled) {
      return false;
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      this.removeFromAccessOrder(key);
    }
    return deleted;
  }

  /**
   * Clear all items from cache
   */
  public async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Search for memories in cache
   */
  public async search(query: string, limit?: number): Promise<AgentMemory[]> {
    if (!this.options.enabled) {
      return [];
    }

    const results: { memory: AgentMemory; score: number }[] = [];
    const queryLower = query.toLowerCase();

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        continue;
      }

      // Simple text matching for cache search
      const content = entry.value.content?.toLowerCase() || '';
      if (content.includes(queryLower)) {
        const score = this.calculateRelevanceScore(content, queryLower);
        results.push({ memory: entry.value, score });
        
        // Update access metadata
        entry.hits++;
        entry.lastAccessed = Date.now();
        this.updateAccessOrder(key);
      }
    }

    // Sort by relevance score and limit results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit || 10).map(r => r.memory);
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    size: number;
    hitRate: number;
    totalHits: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
  } {
    if (!this.options.enabled || this.cache.size === 0) {
      return {
        size: 0,
        hitRate: 0,
        totalHits: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    let totalHits = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    const hitRate = totalHits / this.cache.size;

    return {
      size: this.cache.size,
      hitRate,
      totalHits,
      oldestEntry: oldestTimestamp === Infinity ? null : new Date(oldestTimestamp),
      newestEntry: newestTimestamp === 0 ? null : new Date(newestTimestamp)
    };
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) {
      return false;
    }
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }

  /**
   * Evict items based on strategy
   */
  private evict(): void {
    if (this.cache.size === 0) {
      return;
    }

    switch (this.options.strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
      default:
        this.evictLRU();
    }
  }

  /**
   * Evict least recently used item
   */  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.removeFromAccessOrder(oldestKey);
      }
    }
  }

  /**
   * Evict first in, first out
   */
  private evictFIFO(): void {
    let oldestKey: string | undefined = undefined;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.removeFromAccessOrder(oldestKey);
    }
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order tracking
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Calculate simple relevance score for search
   */
  private calculateRelevanceScore(content: string, query: string): number {
    const exactMatches = (content.match(new RegExp(query, 'gi')) || []).length;
    const wordMatches = query.split(' ').filter(word => 
      content.includes(word.toLowerCase())
    ).length;
    
    // Simple scoring: exact matches worth more than word matches
    return exactMatches * 10 + wordMatches;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }

  /**
   * Check if caching is enabled
   */
  public get isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Get current cache size
   */
  public get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache options
   */
  public get cacheOptions(): CacheOptions {
    return { ...this.options };
  }
}
