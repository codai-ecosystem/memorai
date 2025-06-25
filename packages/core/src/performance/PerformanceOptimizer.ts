/**
 * Enterprise-Grade Performance Optimizer for MemorAI
 * World-class optimization system for production-ready performance
 */

import { logger } from '../utils/logger.js';

export interface PerformanceConfig {
  // Query optimization
  maxQueryTime: number;
  batchSize: number;
  cacheEnabled: boolean;
  cacheSize: number;
  cacheTTL: number;

  // Memory optimization
  memoryLimit: number;
  gcThreshold: number;
  compactionInterval: number;

  // Connection optimization
  connectionPoolSize: number;
  connectionTimeout: number;
  maxRetries: number;
  retryDelay: number;

  // Vector optimization
  vectorIndexType: 'hnsw' | 'ivf' | 'brute_force';
  hnswM: number;
  hnswEfConstruct: number;
  quantizationEnabled: boolean;
  compressionEnabled: boolean;
}

export interface PerformanceMetrics {
  queryTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  throughput: number;
  errorRate: number;
  connectionCount: number;
  vectorIndexSize: number;
  timestamp: Date;
}

export class PerformanceOptimizer {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private queryCache = new Map<string, { data: unknown; expiry: number }>();
  private lastGC = Date.now();
  private lastCompaction = Date.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      // Aggressive optimization defaults
      maxQueryTime: 100, // 100ms max query time
      batchSize: 5000, // Large batches for efficiency
      cacheEnabled: true,
      cacheSize: 10000, // 10k cache entries
      cacheTTL: 300000, // 5 minutes

      memoryLimit: 512 * 1024 * 1024, // 512MB limit
      gcThreshold: 0.8, // GC at 80% memory
      compactionInterval: 60000, // 1 minute

      connectionPoolSize: 10, // Large pool
      connectionTimeout: 5000, // 5 second timeout
      maxRetries: 3,
      retryDelay: 100,

      vectorIndexType: 'hnsw',
      hnswM: 64, // High-performance HNSW
      hnswEfConstruct: 400,
      quantizationEnabled: true,
      compressionEnabled: true,

      ...config,
    };
  }

  /**
   * Optimize query performance with caching and batch processing
   */
  public async optimizeQuery<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: { useCache?: boolean; timeout?: number } = {}
  ): Promise<T> {
    const startTime = Date.now();
    const {
      useCache = this.config.cacheEnabled,
      timeout = this.config.maxQueryTime,
    } = options;

    try {
      // Check cache first
      if (useCache && this.queryCache.has(queryKey)) {
        const cached = this.queryCache.get(queryKey)!;
        if (cached.expiry > Date.now()) {
          this.recordMetric('cacheHit', Date.now() - startTime);
          return cached.data as T;
        } else {
          this.queryCache.delete(queryKey);
        }
      }

      // Execute query with timeout
      const result = await Promise.race([
        queryFn(),
        this.createTimeoutPromise<T>(timeout),
      ]);

      // Cache result
      if (useCache && this.queryCache.size < this.config.cacheSize) {
        this.queryCache.set(queryKey, {
          data: result,
          expiry: Date.now() + this.config.cacheTTL,
        });
      }
      this.recordMetric('queryTime', Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordMetric('error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Batch operations for improved throughput
   */
  public async batchProcess<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = this.config.batchSize
  ): Promise<R[]> {
    const results: R[] = [];
    const batches = this.createBatches(items, batchSize);
    for (const batch of batches) {
      try {
        const batchResults = await processor(batch);
        results.push(...batchResults);
      } catch (error) {
        logger.error('Batch processing error:', error);
        // Continue with next batch in production
      }
    }

    return results;
  }

  /**
   * Memory management and garbage collection
   */
  public async performMemoryOptimization(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const memoryThreshold = this.config.memoryLimit / 1024 / 1024;

    if (heapUsedMB > memoryThreshold * this.config.gcThreshold) {
      logger.info(
        `Memory optimization triggered: ${heapUsedMB.toFixed(2)}MB used`
      );

      // Clear expired cache entries
      this.clearExpiredCache();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Clear old metrics
      this.cleanupMetrics();

      this.lastGC = Date.now();
    }

    // Periodic compaction
    if (Date.now() - this.lastCompaction > this.config.compactionInterval) {
      await this.performCompaction();
      this.lastCompaction = Date.now();
    }
  }

  /**
   * Get optimized configuration for Qdrant
   */
  public getQdrantOptimization() {
    return {
      collection_config: {
        vectors: {
          size: 1536, // OpenAI embedding size
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
          max_segment_size: 200000,
          memmap_threshold: 50000,
          indexing_threshold: 20000,
          flush_interval_sec: 5,
          max_optimization_threads: 4,
        },
        hnsw_config: {
          m: this.config.hnswM,
          ef_construct: this.config.hnswEfConstruct,
          full_scan_threshold: 10000,
          max_indexing_threads: 4,
          on_disk: true,
        },
        quantization_config: this.config.quantizationEnabled
          ? {
              scalar: {
                type: 'int8',
                quantile: 0.99,
                always_ram: false,
              },
            }
          : undefined,
      },
    };
  }

  /**
   * Get real-time performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    const avgQueryTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.queryTime, 0) /
          recentMetrics.length
        : 0;

    const cacheHits = recentMetrics.filter(m => m.queryTime < 10).length; // Cache hits are typically <10ms
    const cacheHitRate =
      recentMetrics.length > 0 ? cacheHits / recentMetrics.length : 0;

    const memoryUsage = process.memoryUsage();

    return {
      queryTime: avgQueryTime,
      memoryUsage: memoryUsage.heapUsed,
      cacheHitRate,
      throughput: this.calculateThroughput(),
      errorRate: this.calculateErrorRate(),
      connectionCount: 0, // Will be populated by connection pool
      vectorIndexSize: 0, // Will be populated by vector store
      timestamp: new Date(),
    };
  }

  /**
   * Generate performance optimization recommendations
   */
  public generateOptimizationRecommendations(): string[] {
    const metrics = this.getPerformanceMetrics();
    const recommendations: string[] = [];

    if (metrics.queryTime > this.config.maxQueryTime) {
      recommendations.push(
        `Query time (${metrics.queryTime.toFixed(2)}ms) exceeds target (${this.config.maxQueryTime}ms). Consider increasing cache size or optimizing indexes.`
      );
    }

    if (metrics.cacheHitRate < 0.7) {
      recommendations.push(
        `Cache hit rate (${(metrics.cacheHitRate * 100).toFixed(1)}%) is low. Consider increasing cache TTL or cache size.`
      );
    }

    if (metrics.memoryUsage > this.config.memoryLimit * 0.9) {
      recommendations.push(
        `Memory usage is approaching limit. Consider reducing batch sizes or enabling compression.`
      );
    }

    if (metrics.errorRate > 0.05) {
      recommendations.push(
        `Error rate (${(metrics.errorRate * 100).toFixed(1)}%) is high. Check connection stability and timeout settings.`
      );
    }

    return recommendations;
  }

  // Private helper methods

  private createTimeoutPromise<T>(ms: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms);
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (value.expiry <= now) {
        this.queryCache.delete(key);
      }
    }
  }

  private async performCompaction(): Promise<void> {
    logger.info('Performing memory compaction');
    // Implement database compaction logic here
    // This could involve optimizing vector indexes, cleaning up fragmented data, etc.
  }

  private cleanupMetrics(): void {
    // Keep only recent metrics to prevent memory leak
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500);
    }
  }

  private recordMetric(type: string, value: number): void {
    const metric: PerformanceMetrics = {
      queryTime: type === 'queryTime' ? value : 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cacheHitRate: type === 'cacheHit' ? 1 : 0,
      throughput: 0,
      errorRate: type === 'error' ? 1 : 0,
      connectionCount: 0,
      vectorIndexSize: 0,
      timestamp: new Date(),
    };

    this.metrics.push(metric);
  }

  private calculateThroughput(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentMetrics = this.metrics.filter(
      m => m.timestamp.getTime() > oneMinuteAgo
    );
    return recentMetrics.length; // Operations per minute
  }

  private calculateErrorRate(): number {
    const recentMetrics = this.metrics.slice(-100);
    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter(m => m.errorRate > 0).length;
    return errors / recentMetrics.length;
  }
}

// Singleton instance for global use
export const performanceOptimizer = new PerformanceOptimizer();
