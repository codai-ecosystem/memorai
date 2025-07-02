/**
 * Performance-Optimized Memory Engine
 * Target: Sub-50ms response times for 95% of queries
 * 
 * Key optimizations:
 * - Advanced caching strategies (embeddings + results)
 * - Connection pooling and query optimization
 * - Request batching and pipeline processing
 * - Performance monitoring and profiling
 */

import { nanoid } from 'nanoid';
import { performance } from 'perf_hooks';

import { MemoryEngine, RememberOptions, RecallOptions } from './MemoryEngine.js';
import { HighPerformanceCache } from '../cache/HighPerformanceCache.js';
import { MemoryConfigManager } from '../config/MemoryConfig.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { logger } from '../utils/logger.js';
import type {
  MemoryConfig,
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  MemoryType,
} from '../types/index.js';
import { MemoryError } from '../types/index.js';

export interface PerformanceMetrics {
  operationType: 'remember' | 'recall' | 'batch_remember' | 'batch_recall';
  duration: number;
  cacheHit: boolean;
  resultCount?: number;
  tenantId: string;
  agentId?: string;
  timestamp: Date;
}

export interface BatchRememberRequest {
  content: string;
  tenantId: string;
  agentId?: string;
  options?: RememberOptions;
}

export interface BatchRecallRequest {
  query: string;
  tenantId: string;
  agentId?: string;
  options?: RecallOptions;
}

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
  createRetryIntervalMillis: number;
}

export class PerformanceOptimizedMemoryEngine extends MemoryEngine {
  private embeddingCache: HighPerformanceCache<number[]>;
  private resultsCache: HighPerformanceCache<MemoryResult[]>;
  private performanceMetrics: PerformanceMetrics[] = [];
  private connectionPool?: any; // Database connection pool
  private batchQueue: Map<string, Promise<any>> = new Map();
  private isPerformanceMonitoringEnabled: boolean;

  constructor(config?: Partial<MemoryConfig>) {
    super(config);
    
    // Initialize performance-optimized caches
    this.embeddingCache = new HighPerformanceCache<number[]>({
      maxSize: 50000, // Cache up to 50k embeddings
      defaultTtl: 3600, // 1 hour TTL for embeddings
      enableCompression: true,
      enableStatistics: true,
    });

    this.resultsCache = new HighPerformanceCache<MemoryResult[]>({
      maxSize: 10000, // Cache up to 10k result sets
      defaultTtl: 300, // 5 minutes TTL for results
      enableCompression: true,
      enableStatistics: true,
    });

    this.isPerformanceMonitoringEnabled = 
      process.env.MEMORAI_PERFORMANCE_MONITORING === 'true' || 
      process.env.NODE_ENV === 'development' ||
      process.env.NODE_ENV === 'test'; // Enable for tests

    logger.info('PerformanceOptimizedMemoryEngine initialized with advanced caching');
  }

  /**
   * Performance-optimized remember with caching and batching support
   */
  public async remember(
    content: string,
    tenantId: string,
    agentId?: string,
    options: RememberOptions = {}
  ): Promise<string> {
    const startTime = performance.now();
    let cacheHit = false;

    try {
      // Generate cache key for embedding
      const embeddingKey = this.generateEmbeddingCacheKey(content);
      
      // Try to get cached embedding first
      let embedding = this.embeddingCache.get(embeddingKey);
      
      if (embedding) {
        cacheHit = true;
        logger.debug('Embedding cache hit for content', { contentLength: content.length });
      } else {
        // Generate new embedding
        const embeddingResult = await this.getEmbeddingService().embed(content);
        embedding = embeddingResult.embedding;
        
        // Cache the embedding for future use
        this.embeddingCache.set(embeddingKey, embedding, 3600); // 1 hour cache
        logger.debug('Generated and cached new embedding', { contentLength: content.length });
      }

      // Use the parent remember method with the cached/generated embedding
      const memoryId = await this.rememberWithEmbedding(content, tenantId, agentId, embedding, options);

      // Invalidate related caches
      this.invalidateRelatedCaches(tenantId, agentId);

      // Record performance metrics
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric({
        operationType: 'remember',
        duration,
        cacheHit,
        tenantId,
        agentId,
        timestamp: new Date(),
      });

      logger.debug('Remember operation completed', { 
        duration: `${duration.toFixed(2)}ms`, 
        cacheHit,
        memoryId 
      });

      return memoryId;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Remember operation failed', { 
        duration: `${duration.toFixed(2)}ms`, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Performance-optimized recall with advanced caching
   */
  public async recall(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    const startTime = performance.now();
    let cacheHit = false;

    try {
      // Generate cache key for results
      const resultsKey = this.generateResultsCacheKey(query, tenantId, agentId, options);
      
      // Try to get cached results first
      let results = this.resultsCache.get(resultsKey);
      
      if (results) {
        cacheHit = true;
        logger.debug('Results cache hit for query', { queryLength: query.length, resultCount: results.length });
        
        // Update access times for cached results
        this.updateResultsAccessTime(results);
        
        const duration = performance.now() - startTime;
        this.recordPerformanceMetric({
          operationType: 'recall',
          duration,
          cacheHit,
          resultCount: results.length,
          tenantId,
          agentId,
          timestamp: new Date(),
        });

        return results;
      }

      // Cache miss - perform search with embedding cache optimization
      const embeddingKey = this.generateEmbeddingCacheKey(query);
      let queryEmbedding = this.embeddingCache.get(embeddingKey);
      
      if (!queryEmbedding) {
        const embeddingResult = await this.getEmbeddingService().embed(query);
        queryEmbedding = embeddingResult.embedding;
        this.embeddingCache.set(embeddingKey, queryEmbedding, 3600);
      }

      // Perform optimized search
      results = await this.searchWithOptimizations(query, tenantId, agentId, queryEmbedding, options);

      // Cache the results
      const cacheTtl = this.calculateCacheTtl(results, options);
      this.resultsCache.set(resultsKey, results, cacheTtl);

      const duration = performance.now() - startTime;
      this.recordPerformanceMetric({
        operationType: 'recall',
        duration,
        cacheHit,
        resultCount: results.length,
        tenantId,
        agentId,
        timestamp: new Date(),
      });

      logger.debug('Recall operation completed', { 
        duration: `${duration.toFixed(2)}ms`, 
        cacheHit,
        resultCount: results.length 
      });

      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Recall operation failed', { 
        duration: `${duration.toFixed(2)}ms`, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Batch remember operations for improved performance
   */
  public async batchRemember(requests: BatchRememberRequest[]): Promise<string[]> {
    const startTime = performance.now();
    const batchKey = `batch_remember_${nanoid()}`;

    try {
      logger.info('Starting batch remember operation', { requestCount: requests.length });

      // Group by tenant for optimized processing
      const groupedByTenant = this.groupRequestsByTenant(requests);
      const results: string[] = [];

      // Process each tenant group in parallel
      const tenantPromises = Object.entries(groupedByTenant).map(async ([tenantId, tenantRequests]) => {
        return this.processTenantBatch(tenantRequests, 'remember');
      });

      const tenantResults = await Promise.all(tenantPromises);
      tenantResults.forEach(tenantResult => results.push(...tenantResult));

      const duration = performance.now() - startTime;
      this.recordPerformanceMetric({
        operationType: 'batch_remember',
        duration,
        cacheHit: false,
        resultCount: results.length,
        tenantId: 'batch',
        timestamp: new Date(),
      });

      logger.info('Batch remember operation completed', { 
        duration: `${duration.toFixed(2)}ms`, 
        requestCount: requests.length,
        resultCount: results.length 
      });

      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Batch remember operation failed', { 
        duration: `${duration.toFixed(2)}ms`, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Batch recall operations for improved performance
   */
  public async batchRecall(requests: BatchRecallRequest[]): Promise<MemoryResult[][]> {
    const startTime = performance.now();

    try {
      logger.info('Starting batch recall operation', { requestCount: requests.length });

      // Group by tenant for optimized processing
      const groupedByTenant = this.groupRequestsByTenant(requests);
      const results: MemoryResult[][] = [];

      // Process each tenant group in parallel
      const tenantPromises = Object.entries(groupedByTenant).map(async ([tenantId, tenantRequests]) => {
        return this.processTenantBatch(tenantRequests, 'recall');
      });

      const tenantResults = await Promise.all(tenantPromises);
      tenantResults.forEach(tenantResult => results.push(...tenantResult));

      const duration = performance.now() - startTime;
      const totalResults = results.reduce((sum, batch) => sum + batch.length, 0);
      
      this.recordPerformanceMetric({
        operationType: 'batch_recall',
        duration,
        cacheHit: false,
        resultCount: totalResults,
        tenantId: 'batch',
        timestamp: new Date(),
      });

      logger.info('Batch recall operation completed', { 
        duration: `${duration.toFixed(2)}ms`, 
        requestCount: requests.length,
        totalResults 
      });

      return results;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Batch recall operation failed', { 
        duration: `${duration.toFixed(2)}ms`, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get performance statistics and cache metrics
   */
  public getPerformanceMetrics(): {
    recentOperations: PerformanceMetrics[];
    averageResponseTimes: Record<string, number>;
    cacheHitRates: Record<string, number>;
    embeddingCacheStats: any;
    resultsCacheStats: any;
  } {
    const recent = this.performanceMetrics.slice(-100); // Last 100 operations
    
    const avgResponseTimes: Record<string, number> = {};
    const cacheHitRates: Record<string, number> = {};

    // Calculate averages by operation type
    ['remember', 'recall', 'batch_remember', 'batch_recall'].forEach(opType => {
      const operations = recent.filter(m => m.operationType === opType);
      if (operations.length > 0) {
        avgResponseTimes[opType] = operations.reduce((sum, op) => sum + op.duration, 0) / operations.length;
        cacheHitRates[opType] = operations.filter(op => op.cacheHit).length / operations.length;
      }
    });

    return {
      recentOperations: recent,
      averageResponseTimes: avgResponseTimes,
      cacheHitRates,
      embeddingCacheStats: this.embeddingCache.getStats(),
      resultsCacheStats: this.resultsCache.getStats(),
    };
  }

  /**
   * Clear all performance caches and reset metrics
   */
  public clearPerformanceCaches(): void {
    this.embeddingCache.clear();
    this.resultsCache.clear();
    this.performanceMetrics = [];
    logger.info('Performance caches and metrics cleared');
  }

  public clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
    logger.debug('Performance metrics cleared (caches preserved)');
  }

  // Private helper methods

  private generateEmbeddingCacheKey(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  private generateResultsCacheKey(
    query: string, 
    tenantId: string, 
    agentId?: string, 
    options?: RecallOptions
  ): string {
    const keyParts = [query, tenantId];
    if (agentId) keyParts.push(agentId);
    if (options) keyParts.push(JSON.stringify(options));
    
    const crypto = require('crypto');
    return crypto.createHash('md5').update(keyParts.join('|')).digest('hex');
  }

  private async rememberWithEmbedding(
    content: string,
    tenantId: string,
    agentId: string | undefined,
    embedding: number[],
    options: RememberOptions
  ): Promise<string> {
    // Create memory metadata with sensible defaults
    const memory: MemoryMetadata = {
      id: nanoid(),
      type: options.type ?? 'fact',
      content: content.trim(),
      embedding: embedding,
      confidence: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      importance: options.importance ?? 0.5,
      emotional_weight: options.emotional_weight,
      tags: options.tags ?? [],
      context: options.context,
      tenant_id: tenantId,
      agent_id: agentId,
      ttl: options.ttl,
    };

    // Access vectorStore through protected property
    const vectorStore = (this as any).vectorStore;
    await vectorStore.storeMemory(memory, embedding);

    return memory.id;
  }

  private async searchWithOptimizations(
    query: string,
    tenantId: string,
    agentId: string | undefined,
    queryEmbedding: number[],
    options: RecallOptions
  ): Promise<MemoryResult[]> {
    // Use the cached embedding to search without re-generating
    const vectorStore = (this as any).vectorStore;
    
    // Build search query with correct interface
    const searchQuery: MemoryQuery = {
      query,
      tenant_id: tenantId,
      agent_id: agentId,
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
      include_context: true,
      time_decay: true,
      type: options.type,
    };

    // Search using the cached embedding
    const searchResults = await vectorStore.searchMemories(queryEmbedding, searchQuery);
    
    return searchResults;
  }

  private invalidateRelatedCaches(tenantId: string, agentId?: string): void {
    // Invalidate result caches for this tenant/agent
    const keysToInvalidate: string[] = [];
    
    // This is a simplified invalidation - in production, you'd want more sophisticated cache invalidation
    this.resultsCache.clear(); // Clear all for now
    
    logger.debug('Invalidated related caches', { tenantId, agentId, keysInvalidated: keysToInvalidate.length });
  }

  private updateResultsAccessTime(results: MemoryResult[]): void {
    // Update last accessed time for cached results
    const now = new Date();
    results.forEach(result => {
      if (result.memory) {
        result.memory.lastAccessedAt = now;
        result.memory.accessCount = (result.memory.accessCount || 0) + 1;
      }
    });
  }

  private calculateCacheTtl(results: MemoryResult[], options: RecallOptions): number {
    // Dynamic TTL based on result characteristics
    if (results.length === 0) return 60; // Cache empty results for 1 minute
    if (results.length > 50) return 120; // Large result sets cached for 2 minutes
    return 300; // Default 5 minutes
  }

  private groupRequestsByTenant<T extends { tenantId: string }>(requests: T[]): Record<string, T[]> {
    return requests.reduce((acc, request) => {
      if (!acc[request.tenantId]) {
        acc[request.tenantId] = [];
      }
      acc[request.tenantId].push(request);
      return acc;
    }, {} as Record<string, T[]>);
  }

  private async processTenantBatch(requests: any[], operationType: 'remember' | 'recall'): Promise<any[]> {
    // Process requests for a single tenant in parallel batches
    const batchSize = 10; // Process 10 at a time
    const results: any[] = [];

    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(async (request) => {
        if (operationType === 'remember') {
          return this.remember(request.content, request.tenantId, request.agentId, request.options);
        } else {
          return this.recall(request.query, request.tenantId, request.agentId, request.options);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  private recordPerformanceMetric(metric: PerformanceMetrics): void {
    if (!this.isPerformanceMonitoringEnabled) return;

    this.performanceMetrics.push(metric);
    
    // Keep only the last 1000 metrics to prevent memory leaks
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }

    // Log slow operations
    if (metric.duration > 100) {
      logger.warn('Slow operation detected', {
        operationType: metric.operationType,
        duration: `${metric.duration.toFixed(2)}ms`,
        cacheHit: metric.cacheHit,
        tenantId: metric.tenantId,
      });
    }
  }

  private getEmbeddingService(): EmbeddingService {
    // Access to the parent's embedding service
    return (this as any).embedding;
  }
}
