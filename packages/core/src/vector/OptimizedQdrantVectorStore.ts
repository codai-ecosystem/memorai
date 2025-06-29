/**
 * Optimized Qdrant Configuration for Enterprise Performance
 * Addresses the 45GB memory issue and slow performance
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { VectorStore, VectorPoint, SearchResult } from './VectorStore.js';
import type { MemoryQuery } from '../types/index.js';
import { VectorStoreError } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface OptimizedQdrantConfig {
  url: string;
  collection: string;
  dimension: number;
  apiKey?: string;

  // Performance optimizations
  batchSize: number;
  maxRetries: number;
  requestTimeout: number;
  connectionPoolSize: number;

  // Memory optimization
  enableCompression: boolean;
  quantizationEnabled: boolean;
  segmentThreshold: number;

  // Indexing optimization
  hnswM: number;
  hnswEfConstruct: number;
  fullScanThreshold: number;
}

export class OptimizedQdrantVectorStore implements VectorStore {
  private client!: QdrantClient;
  private collection: string;
  private dimension: number;
  private config: OptimizedQdrantConfig;
  private connectionPool: QdrantClient[] = [];
  private currentConnectionIndex = 0;

  constructor(config: OptimizedQdrantConfig) {
    this.config = {
      ...config,
      batchSize: config.batchSize ?? 1000,
      maxRetries: config.maxRetries ?? 3,
      requestTimeout: config.requestTimeout ?? 30000,
      connectionPoolSize: config.connectionPoolSize ?? 5,
      enableCompression: config.enableCompression ?? true,
      quantizationEnabled: config.quantizationEnabled ?? true,
      segmentThreshold: config.segmentThreshold ?? 20000,
      hnswM: config.hnswM ?? 32, // Increased from 16 for better recall
      hnswEfConstruct: config.hnswEfConstruct ?? 200, // Increased from 100 for better quality
      fullScanThreshold: config.fullScanThreshold ?? 20000, // Increased threshold
    };

    this.collection = this.config.collection;
    this.dimension = this.config.dimension;

    // Initialize connection pool
    this.initializeConnectionPool();
  }

  private initializeConnectionPool(): void {
    for (let i = 0; i < this.config.connectionPoolSize; i++) {
      const clientConfig: { url: string; apiKey?: string; timeout?: number } = {
        url: this.config.url,
        timeout: this.config.requestTimeout,
      };

      if (this.config.apiKey) {
        clientConfig.apiKey = this.config.apiKey;
      }

      const client = new QdrantClient(clientConfig);
      this.connectionPool.push(client);
    }

    this.client = this.connectionPool[0];
  }

  private getConnection(): QdrantClient {
    const connection = this.connectionPool[this.currentConnectionIndex];
    this.currentConnectionIndex =
      (this.currentConnectionIndex + 1) % this.config.connectionPoolSize;
    return connection;
  }

  public async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c: { name: string }) => c.name === this.collection
      );

      if (!exists) {
        await this.createOptimizedCollection();
      } else {
        // Update existing collection configuration for optimization
        await this.updateCollectionConfig();
      }

      // Create optimized indexes
      await this.createOptimizedIndexes();

      logger.info('Optimized Qdrant vector store initialized successfully');
    } catch (error: unknown) {
      logger.error('Failed to initialize optimized Qdrant store:', error);
      throw new VectorStoreError('Failed to initialize vector store');
    }
  }

  private async createOptimizedCollection(): Promise<void> {
    const createConfig = {
      vectors: {
        size: this.dimension,
        distance: 'Cosine' as const,
        hnsw_config: {
          m: this.config.hnswM,
          ef_construct: this.config.hnswEfConstruct,
          full_scan_threshold: this.config.fullScanThreshold,
          max_indexing_threads: 4,
          on_disk: true, // Store vectors on disk to save RAM
        },
      },
      optimizers_config: {
        deleted_threshold: 0.2,
        vacuum_min_vector_number: 1000,
        default_segment_number: 8, // Increased segments for better parallelism
        max_segment_size: this.config.segmentThreshold,
        memmap_threshold: this.config.segmentThreshold,
        indexing_threshold: 10000,
        flush_interval_sec: 10,
        max_optimization_threads: 4,
      },
      shard_number: 2, // Distribute across shards for better performance
      replication_factor: 1,
      write_consistency_factor: 1,
    };

    // Add quantization for memory efficiency
    if (this.config.quantizationEnabled) {
      (createConfig as any).quantization_config = {
        scalar: {
          type: 'int8',
          quantile: 0.99,
          always_ram: false,
        },
      };
    }

    await this.client.createCollection(this.collection, createConfig);
    logger.info(
      'Created optimized Qdrant collection with performance enhancements'
    );
  }

  private async updateCollectionConfig(): Promise<void> {
    try {
      // Update collection parameters for better performance
      await this.client.updateCollection(this.collection, {
        optimizers_config: {
          deleted_threshold: 0.2,
          vacuum_min_vector_number: 1000,
          default_segment_number: 8,
          max_segment_size: this.config.segmentThreshold,
          memmap_threshold: this.config.segmentThreshold,
          indexing_threshold: 10000,
          flush_interval_sec: 10,
          max_optimization_threads: 4,
        },
      });

      logger.info('Updated Qdrant collection configuration for optimization');
    } catch (error: unknown) {
      logger.warn('Failed to update collection config, continuing:', error);
    }
  }
  private async createOptimizedIndexes(): Promise<void> {
    const indexes = [
      { field_name: 'tenant_id', field_schema: 'keyword' as const },
      { field_name: 'agent_id', field_schema: 'keyword' as const },
      { field_name: 'type', field_schema: 'keyword' as const },
      { field_name: 'created_at', field_schema: 'keyword' as const }, // Changed from datetime to keyword
      { field_name: 'importance', field_schema: 'float' as const },
      { field_name: 'access_count', field_schema: 'integer' as const },
      { field_name: 'content_hash', field_schema: 'keyword' as const },
    ];

    for (const index of indexes) {
      try {
        await this.client.createPayloadIndex(this.collection, index);
      } catch (error) {
        logger.warn(
          `Collection ${this.config.collection} might already exist:`,
          error
        );
      }
    }
  }

  public async upsert(points: VectorPoint[]): Promise<void> {
    const batches = this.chunkArray(points, this.config.batchSize);
    const promises = batches.map(batch => this.upsertBatch(batch));

    await Promise.all(promises);
  }

  private async upsertBatch(points: VectorPoint[]): Promise<void> {
    const connection = this.getConnection();

    await this.retryOperation(async () => {
      await connection.upsert(this.collection, {
        wait: false, // Don't wait for indexing to complete
        points: points.map(p => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
    });
  }

  public async search(
    vector: number[],
    query: MemoryQuery
  ): Promise<SearchResult[]> {
    const connection = this.getConnection();

    const searchParams = {
      vector,
      limit: Math.min(query.limit || 10, 100), // Cap at 100 for performance
      with_payload: true,
      with_vector: false, // Don't return vectors unless needed
      score_threshold: query.threshold || 0.7,
      filter: this.buildFilter(query),
      search_params: {
        hnsw_ef: Math.min((query.limit || 10) * 4, 400), // Dynamic ef based on limit
        exact: false, // Use approximate search for speed
      },
    };

    const searchResult = await this.retryOperation(async () => {
      return await connection.search(this.collection, searchParams);
    });
    return searchResult.map((point: any) => ({
      id: point.id,
      score: point.score,
      payload: point.payload,
    }));
  }

  public async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const batches = this.chunkArray(ids, this.config.batchSize);
    const promises = batches.map(batch => this.deleteBatch(batch));

    await Promise.all(promises);
  }

  private async deleteBatch(ids: string[]): Promise<void> {
    const connection = this.getConnection();

    await this.retryOperation(async () => {
      await connection.delete(this.collection, {
        wait: false,
        points: ids,
      });
    });
  }

  public async count(tenantId: string): Promise<number> {
    const connection = this.getConnection();

    const result = await this.retryOperation(async () => {
      return await connection.count(this.collection, {
        filter: {
          must: [{ key: 'tenant_id', match: { value: tenantId } }],
        },
      });
    });

    return result.count;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  public async checkDuplicateByHash(
    contentHash: string,
    tenantId: string,
    agentId?: string
  ): Promise<string | null> {
    const connection = this.getConnection();

    const filter = {
      must: [
        { key: 'content_hash', match: { value: contentHash } },
        { key: 'tenant_id', match: { value: tenantId } },
      ] as unknown[],
    };

    if (agentId) {
      filter.must.push({ key: 'agent_id', match: { value: agentId } });
    }

    const searchResult = await connection.scroll(this.collection, {
      filter,
      limit: 1,
      with_payload: false,
      with_vector: false,
    });

    return searchResult.points.length > 0
      ? (searchResult.points[0].id as string)
      : null;
  }
  public async updateMemoryAccess(memoryId: string): Promise<void> {
    const connection = this.getConnection();

    // Get current memory
    const points = await connection.retrieve(this.collection, {
      ids: [memoryId],
      with_payload: true,
    });
    if (points.length === 0) return;

    const point = points[0];
    const currentAccess = (point.payload?.access_count as number) || 0;

    // Update access count and last access time
    await connection.setPayload(this.collection, {
      wait: false,
      points: [memoryId],
      payload: {
        access_count: currentAccess + 1,
        last_accessed_at: new Date().toISOString(),
      },
    });
  }

  public async getMemoryStats(tenantId: string): Promise<{
    totalMemories: number;
    averageAccessCount: number;
    oldestMemory: string | null;
    newestMemory: string | null;
    duplicateCount: number;
  }> {
    // Implement efficient stats calculation
    const total = await this.count(tenantId);

    // For now return basic stats - implement more detailed stats as needed
    return {
      totalMemories: total,
      averageAccessCount: 0,
      oldestMemory: null,
      newestMemory: null,
      duplicateCount: 0,
    };
  }

  /**
   * Optimize collection for better performance
   */
  public async optimizeCollection(): Promise<void> {
    try {
      // Force optimization
      await this.client.updateCollection(this.collection, {
        optimizers_config: {
          deleted_threshold: 0.1, // More aggressive cleanup
          vacuum_min_vector_number: 100,
        },
      });

      logger.info('Collection optimization completed');
    } catch (error: unknown) {
      logger.error('Collection optimization failed:', error);
    }
  }

  // Helper methods
  private buildFilter(query: MemoryQuery): any {
    const filter: { must: any[] } = { must: [] };

    if (query.tenant_id) {
      filter.must.push({ key: 'tenant_id', match: { value: query.tenant_id } });
    }

    if (query.agent_id) {
      filter.must.push({ key: 'agent_id', match: { value: query.agent_id } });
    }

    if (query.type) {
      filter.must.push({ key: 'type', match: { value: query.type } });
    }

    // Extended filter options could be added here if MemoryQuery interface is extended
    // For now, we'll use basic filtering

    return filter.must.length > 0 ? filter : undefined;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          logger.warn(
            `Retrying operation (attempt ${attempt + 1}/${this.config.maxRetries}):`,
            error
          );
        }
      }
    }

    throw lastError!;
  }

  public async close(): Promise<void> {
    // Connection cleanup if needed
    this.connectionPool.length = 0;
  }
}
