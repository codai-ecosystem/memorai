/**
 * High-Performance Memory Cache with TTL and LRU Eviction
 * Significantly improves MCP recall performance
 */

import { logger } from '../utils/logger.js';
import type { MemoryResult } from '../types/index.js';

export interface CacheConfig {
    maxSize: number;
    defaultTtl: number; // seconds
    enableCompression: boolean;
    enableStatistics: boolean;
}

export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    memoryUsage: number;
}

interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccess: number;
    compressed?: boolean;
    originalSize?: number;
}

export class HighPerformanceCache<T = any> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private accessOrder: string[] = []; // For LRU tracking
    private config: CacheConfig;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        size: 0,
        memoryUsage: 0
    };

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = {
            maxSize: 10000, // 10k entries
            defaultTtl: 300, // 5 minutes
            enableCompression: true,
            enableStatistics: true,
            ...config
        };

        // Periodic cleanup
        setInterval(() => this.cleanup(), 60000); // Every minute
    }

    /**
     * Get value from cache with automatic TTL and LRU handling
     */
    public get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.recordMiss();
            return null;
        }

        // Check TTL
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl * 1000) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            this.recordMiss();
            return null;
        }

        // Update access tracking
        entry.accessCount++;
        entry.lastAccess = now;
        this.updateAccessOrder(key);

        this.recordHit();
        return this.decompress(entry);
    }

    /**
     * Set value in cache with optional TTL
     */
    public set(key: string, value: T, ttl?: number): void {
        // Evict if at capacity
        if (this.cache.size >= this.config.maxSize) {
            this.evictLRU();
        }

        const now = Date.now();
        const entry: CacheEntry<T> = {
            value: this.compress(value),
            timestamp: now,
            ttl: ttl || this.config.defaultTtl,
            accessCount: 0,
            lastAccess: now,
            compressed: this.config.enableCompression
        };

        this.cache.set(key, entry);
        this.updateAccessOrder(key);
        this.updateStats();
    }

    /**
     * Intelligent cache key generation for memory queries
     */
    public static generateMemoryQueryKey(
        query: string,
        tenantId: string,
        agentId?: string,
        options?: any
    ): string {
        const keyParts = [query, tenantId];
        if (agentId) keyParts.push(agentId);
        if (options) keyParts.push(JSON.stringify(options));

        // Use hash for consistent, shorter keys
        const crypto = require('crypto');
        return crypto.createHash('md5').update(keyParts.join('|')).digest('hex');
    }
    /**
     * Cache memory search results with smart invalidation
     */
    public cacheMemoryResults(
        query: string,
        tenantId: string,
        results: MemoryResult[],
        agentId?: string,
        options?: any
    ): void {
        const key = HighPerformanceCache.generateMemoryQueryKey(query, tenantId, agentId, options);

        // Cache with shorter TTL for dynamic results
        const ttl = results.length > 100 ? 60 : this.config.defaultTtl; // 1 min for large results
        this.set(key, results as T, ttl);

        logger.debug(`Cached ${results.length} memory results for query: ${query.substring(0, 50)}...`);
    }

    /**
     * Get cached memory results
     */
    public getCachedMemoryResults(
        query: string,
        tenantId: string,
        agentId?: string,
        options?: any
    ): MemoryResult[] | null {
        const key = HighPerformanceCache.generateMemoryQueryKey(query, tenantId, agentId, options);
        const results = this.get(key);

        if (results) {
            logger.debug(`Cache hit for memory query: ${query.substring(0, 50)}...`);
        }

        return results as MemoryResult[] | null;
    }

    /**
     * Invalidate cache entries for a tenant (when memories are added/removed)
     */
    public invalidateTenant(tenantId: string): void {
        const keysToDelete: string[] = [];        for (const [key] of this.cache.entries()) {
            // Check if the key contains the tenantId (simple approach)
            if (key.includes(tenantId)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
        });

        logger.debug(`Invalidated ${keysToDelete.length} cache entries for tenant: ${tenantId}`);
        this.updateStats();
    }

    /**
     * Bulk cache operations for better performance
     */
    public setMultiple(entries: Array<{ key: string; value: T; ttl?: number }>): void {
        entries.forEach(({ key, value, ttl }) => {
            this.set(key, value, ttl);
        });
    }

    public getMultiple(keys: string[]): Map<string, T | null> {
        const results = new Map<string, T | null>();
        keys.forEach(key => {
            results.set(key, this.get(key));
        });
        return results;
    }

    /**
     * Get cache statistics
     */
    public getStats(): CacheStats {
        this.updateStats();
        return { ...this.stats };
    }

    /**
     * Clear all cache entries
     */
    public clear(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.resetStats();
    }

    /**
     * Get cache size info
     */
    public getSizeInfo(): { entries: number; memoryUsage: number; maxSize: number } {
        return {
            entries: this.cache.size,
            memoryUsage: this.calculateMemoryUsage(),
            maxSize: this.config.maxSize
        };
    }

    // Private methods

    private compress(value: T): T {
        if (!this.config.enableCompression) return value;

        // For now, return as-is. In production, implement actual compression
        // using libraries like pako or node-lz4 for large objects
        return value;
    }

    private decompress(entry: CacheEntry<T>): T {
        if (!entry.compressed) return entry.value;

        // For now, return as-is. In production, implement actual decompression
        return entry.value;
    }

    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        // Find least recently used entry
        const lruKey = this.accessOrder[0];
        this.cache.delete(lruKey);
        this.removeFromAccessOrder(lruKey);

        logger.debug(`Evicted LRU cache entry: ${lruKey}`);
    }

    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    private cleanup(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > entry.ttl * 1000) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
        });

        if (keysToDelete.length > 0) {
            logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
            this.updateStats();
        }
    }

    private recordHit(): void {
        if (!this.config.enableStatistics) return;
        this.stats.hits++;
        this.updateHitRate();
    }

    private recordMiss(): void {
        if (!this.config.enableStatistics) return;
        this.stats.misses++;
        this.updateHitRate();
    }

    private updateHitRate(): void {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }

    private updateStats(): void {
        if (!this.config.enableStatistics) return;
        this.stats.size = this.cache.size;
        this.stats.memoryUsage = this.calculateMemoryUsage();
    }

    private resetStats(): void {
        this.stats = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            size: 0,
            memoryUsage: 0
        };
    }

    private calculateMemoryUsage(): number {
        // Rough estimation of memory usage
        let totalSize = 0;
        for (const [key, entry] of this.cache.entries()) {
            totalSize += key.length * 2; // UTF-16 characters
            totalSize += JSON.stringify(entry).length * 2; // Rough estimate
        }
        return totalSize;
    }
}

/**
 * Global cache instance for memory operations
 */
export const memoryCache = new HighPerformanceCache<MemoryResult[]>({
    maxSize: 5000,
    defaultTtl: 300, // 5 minutes
    enableCompression: true,
    enableStatistics: true
});

/**
 * Context cache for frequently accessed context data
 */
export const contextCache = new HighPerformanceCache<unknown>({
    maxSize: 1000,
    defaultTtl: 600, // 10 minutes
    enableCompression: false, // Context is usually small
    enableStatistics: true
});
