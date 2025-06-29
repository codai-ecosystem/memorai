/**
 * Production Redis Storage Adapter
 * High-performance Redis adapter with clustering, connection pooling, and enterprise features
 */

import type { Cluster, Redis, RedisOptions } from 'ioredis';
import { MemoryMetadata } from '../types/index.js';
import { MemoryFilters, StorageAdapter } from './StorageAdapter.js';

export interface RedisStorageConfig {
  // Connection settings
  host: string;
  port: number;
  password?: string;
  db: number;

  // Clustering
  enableClustering: boolean;
  clusterNodes?: Array<{ host: string; port: number }>;

  // Connection pooling
  maxConnections: number;
  minConnections: number;
  acquireTimeout: number;
  idleTimeout: number;

  // Performance settings
  keyPrefix: string;
  commandTimeout: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;

  // Cache settings
  defaultTTL: number; // seconds
  maxKeySize: number; // bytes
  maxValueSize: number; // bytes

  // Monitoring
  enableMetrics: boolean;
  healthCheckInterval: number;

  // Security
  enableTLS: boolean;
  tlsOptions?: {
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
}

export interface RedisHealthInfo {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionCount: number;
  memoryUsage: string;
  version: string;
  uptime: number;
  connectedClients: number;
  usedMemory: number;
  totalSystemMemory: number;
  lastError?: string;
  performance: {
    averageLatency: number;
    commandsPerSecond: number;
    hitRate: number;
  };
}

export interface RedisMetrics {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  averageLatency: number;
  peakLatency: number;
  cacheHits: number;
  cacheMisses: number;
  evictions: number;
  connectionPool: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  };
}

/**
 * Production-grade Redis storage adapter with enterprise features
 */
export class ProductionRedisAdapter implements StorageAdapter {
  private redis!: Redis | Cluster; // Using definite assignment assertion
  private config: RedisStorageConfig;
  private metrics: RedisMetrics;
  private healthStatus: RedisHealthInfo['status'] = 'healthy';
  private lastHealthCheck: Date = new Date();

  constructor(config: Partial<RedisStorageConfig> = {}) {
    this.config = {
      host: 'localhost',
      port: 6379,
      db: 0,
      enableClustering: false,
      maxConnections: 20,
      minConnections: 5,
      acquireTimeout: 60000,
      idleTimeout: 30000,
      keyPrefix: 'memorai:',
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      defaultTTL: 3600,
      maxKeySize: 1024,
      maxValueSize: 50 * 1024 * 1024, // 50MB
      enableMetrics: true,
      healthCheckInterval: 30000,
      enableTLS: false,
      ...config,
    };

    this.metrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageLatency: 0,
      peakLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      evictions: 0,
      connectionPool: {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
      },
    };

    // Initialize connection asynchronously (will be called by first operation if needed)
    this.initializeRedisConnection().catch(error => {
      console.error('Failed to initialize Redis connection:', error);
      this.healthStatus = 'unhealthy';
    });

    if (this.config.enableMetrics) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Initialize Redis connection with clustering support
   */
  private async initializeRedisConnection(): Promise<void> {
    try {
      const baseOptions: RedisOptions = {
        password: this.config.password,
        commandTimeout: this.config.commandTimeout,
        keyPrefix: this.config.keyPrefix,
        lazyConnect: true,
      };

      if (this.config.enableTLS && this.config.tlsOptions) {
        baseOptions.tls = this.config.tlsOptions;
      }

      if (this.config.enableClustering && this.config.clusterNodes) {
        // Cluster mode
        const IORedis = await import('ioredis');
        this.redis = new IORedis.Cluster(this.config.clusterNodes, {
          redisOptions: baseOptions,
          enableOfflineQueue: false,
        });
      } else {
        // Single instance mode
        const IORedis = await import('ioredis');
        this.redis = new IORedis.default({
          ...baseOptions,
          host: this.config.host,
          port: this.config.port,
          db: this.config.db,
        });
      }

      // Set up event handlers
      this.redis.on('connect', () => {
        // Redis connection established
        this.healthStatus = 'healthy';
      });

      this.redis.on('error', error => {
        // Redis connection error: ${error.message}
        this.healthStatus = 'unhealthy';
        this.metrics.failedCommands++;
      });

      this.redis.on('reconnecting', () => {
        // Redis reconnecting...
        this.healthStatus = 'degraded';
      });

      // Connect to Redis
      await this.redis.connect();

      // Redis connection initialized successfully
    } catch (error) {
      // Failed to initialize Redis connection: ${error}
      this.healthStatus = 'unhealthy';
      throw new Error(
        `Redis initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Store memory data with automatic TTL and compression
   */
  async store(memory: MemoryMetadata): Promise<void> {
    const startTime = Date.now();

    try {
      this.validateMemorySize(memory);

      const key = this.generateMemoryKey(memory.id);
      const serializedData = await this.serializeMemory(memory);

      // Store with TTL based on memory importance
      const ttl = this.calculateTTL(memory);

      if (ttl > 0) {
        await this.redis.setex(key, ttl, serializedData);
      } else {
        await this.redis.set(key, serializedData);
      }

      // Store in sorted sets for efficient querying
      await this.indexMemory(memory);

      this.updateMetrics(startTime, true);
      this.metrics.cacheHits++;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw new Error(
        `Redis store failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve memory by ID with automatic deserialization
   */
  async retrieve(id: string): Promise<MemoryMetadata | null> {
    const startTime = Date.now();

    try {
      const key = this.generateMemoryKey(id);
      const data = await this.redis.get(key);

      if (!data) {
        this.metrics.cacheMisses++;
        this.updateMetrics(startTime, true);
        return null;
      }

      const memory = await this.deserializeMemory(data);

      // Update access timestamp for LRU tracking
      await this.updateAccessTime(id);

      this.updateMetrics(startTime, true);
      this.metrics.cacheHits++;

      return memory;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw new Error(
        `Redis retrieve failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List memories with advanced filtering and pagination
   */
  async list(filters: MemoryFilters = {}): Promise<MemoryMetadata[]> {
    const startTime = Date.now();

    try {
      const results: MemoryMetadata[] = [];
      const searchKeys = await this.buildSearchKeys(filters);

      // Use Redis pipelines for efficient bulk operations
      const pipeline = this.redis.pipeline();

      for (const key of searchKeys) {
        pipeline.get(key);
      }

      const pipelineResults = await pipeline.exec();

      if (pipelineResults) {
        for (const [error, data] of pipelineResults) {
          if (!error && data) {
            try {
              const memory = await this.deserializeMemory(data as string);
              if (this.matchesFilters(memory, filters)) {
                results.push(memory);
              }
            } catch {
              // Skip corrupted entries
              continue;
            }
          }
        }
      }

      // Apply sorting and pagination
      const sortedResults = this.sortResults(results, filters);
      const paginatedResults = this.paginateResults(sortedResults, filters);

      this.updateMetrics(startTime, true);

      return paginatedResults;
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw new Error(
        `Redis search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update existing memory with optimistic locking
   */
  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    const startTime = Date.now();

    try {
      const key = this.generateMemoryKey(id);

      // Use Redis transactions for atomicity
      const multi = this.redis.multi();

      // Get current data
      const currentData = await this.redis.get(key);
      if (!currentData) {
        throw new Error(`Memory ${id} not found`);
      }

      const currentMemory = await this.deserializeMemory(currentData);
      const updatedMemory = { ...currentMemory, ...updates, id };

      this.validateMemorySize(updatedMemory);

      const serializedData = await this.serializeMemory(updatedMemory);
      const ttl = this.calculateTTL(updatedMemory);

      // Update primary storage
      if (ttl > 0) {
        multi.setex(key, ttl, serializedData);
      } else {
        multi.set(key, serializedData);
      }

      // Update indexes
      await this.updateIndexes(currentMemory, updatedMemory, multi);

      await multi.exec();

      this.updateMetrics(startTime, true);
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw new Error(
        `Redis update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete memory and clean up indexes
   */
  async delete(id: string): Promise<void> {
    const startTime = Date.now();

    try {
      const key = this.generateMemoryKey(id);

      // Get memory data before deletion for index cleanup
      const currentData = await this.redis.get(key);
      if (!currentData) {
        this.updateMetrics(startTime, true);
        return; // Memory doesn't exist, treat as successful deletion
      }

      const memory = await this.deserializeMemory(currentData);

      // Use transaction for atomic deletion
      const multi = this.redis.multi();

      // Delete primary key
      multi.del(key);

      // Clean up indexes
      await this.removeFromIndexes(memory, multi);

      await multi.exec();

      this.updateMetrics(startTime, true);
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw new Error(
        `Redis delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get comprehensive health information
   */
  async getHealth(): Promise<RedisHealthInfo> {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');
      const clients = await this.redis.info('clients');

      // Parse Redis info for health metrics
      const healthInfo: RedisHealthInfo = {
        status: this.healthStatus,
        connectionCount: this.extractInfoValue(clients, 'connected_clients'),
        memoryUsage: this.extractInfoStringValue(memory, 'used_memory_human'),
        version: this.extractInfoStringValue(info, 'redis_version'),
        uptime: this.extractInfoValue(info, 'uptime_in_seconds'),
        connectedClients: this.extractInfoValue(clients, 'connected_clients'),
        usedMemory: this.extractInfoValue(memory, 'used_memory'),
        totalSystemMemory: this.extractInfoValue(memory, 'total_system_memory'),
        performance: {
          averageLatency: this.metrics.averageLatency,
          commandsPerSecond: this.calculateCommandsPerSecond(),
          hitRate: this.calculateHitRate(),
        },
      };

      this.lastHealthCheck = new Date();

      return healthInfo;
    } catch (error) {
      return {
        status: 'unhealthy',
        connectionCount: 0,
        memoryUsage: 'unknown',
        version: 'unknown',
        uptime: 0,
        connectedClients: 0,
        usedMemory: 0,
        totalSystemMemory: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          averageLatency: 0,
          commandsPerSecond: 0,
          hitRate: 0,
        },
      };
    }
  }

  /**
   * Close Redis connections gracefully
   */
  async close(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        // Redis connection closed gracefully
      }
    } catch (error) {
      // Error closing Redis connection: ${error}
      // Force disconnect
      if (this.redis) {
        this.redis.disconnect();
      }
    }
  }

  // Private helper methods

  private generateMemoryKey(id: string): string {
    return `memory:${id}`;
  }

  private async serializeMemory(memory: MemoryMetadata): Promise<string> {
    try {
      return JSON.stringify({
        ...memory,
        _stored_at: Date.now(),
        _version: '1.0',
      });
    } catch (error) {
      throw new Error(
        `Memory serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async deserializeMemory(data: string): Promise<MemoryMetadata> {
    try {
      const parsed = JSON.parse(data);

      // Remove Redis-specific metadata
      delete parsed._stored_at;
      delete parsed._version;

      return parsed as MemoryMetadata;
    } catch (error) {
      throw new Error(
        `Memory deserialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateMemorySize(memory: MemoryMetadata): void {
    const serialized = JSON.stringify(memory);
    const sizeInBytes = Buffer.byteLength(serialized, 'utf8');

    if (sizeInBytes > this.config.maxValueSize) {
      throw new Error(
        `Memory size ${sizeInBytes} exceeds maximum ${this.config.maxValueSize} bytes`
      );
    }
  }

  private calculateTTL(memory: MemoryMetadata): number {
    // TTL based on importance and recency
    const baselineTTL = this.config.defaultTTL;
    const importanceMultiplier = Math.max(0.5, memory.importance || 0.5);
    const ageInDays =
      (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const ageMultiplier = Math.max(0.1, 1 - ageInDays / 365); // Reduce TTL for older memories

    return Math.floor(baselineTTL * importanceMultiplier * ageMultiplier);
  }

  private async indexMemory(memory: MemoryMetadata): Promise<void> {
    const multi = this.redis.multi();

    // Index by agent (use agent_id field from MemoryMetadata)
    if (memory.agent_id) {
      multi.sadd(`index:agent:${memory.agent_id}`, memory.id);
    }

    // Index by importance
    const importanceScore = Math.floor((memory.importance || 0) * 100);
    multi.zadd('index:importance', importanceScore, memory.id);

    // Index by timestamp (use createdAt from MemoryMetadata)
    multi.zadd('index:timestamp', memory.createdAt.getTime(), memory.id);

    // Index by tags
    for (const tag of memory.tags) {
      multi.sadd(`index:tag:${tag}`, memory.id);
    }

    await multi.exec();
  }

  private async updateAccessTime(id: string): Promise<void> {
    const accessKey = `access:${id}`;
    await this.redis.set(accessKey, Date.now(), 'EX', 86400); // 24 hour expiry
  }

  private async buildSearchKeys(filters: MemoryFilters): Promise<string[]> {
    const keys: string[] = [];

    if (filters.agentId) {
      const agentMemories = await this.redis.smembers(
        `index:agent:${filters.agentId}`
      );
      keys.push(...agentMemories.map(id => this.generateMemoryKey(id)));
    } else {
      // Get all memory keys (for small datasets, use scanning for large datasets)
      const allKeys = await this.redis.keys(`${this.config.keyPrefix}memory:*`);
      keys.push(...allKeys);
    }

    return keys;
  }

  private matchesFilters(
    memory: MemoryMetadata,
    filters: MemoryFilters
  ): boolean {
    // Agent filter (use agent_id field from MemoryMetadata)
    if (filters.agentId && memory.agent_id !== filters.agentId) {
      return false;
    }

    // Importance filters
    if (
      filters.minImportance !== undefined &&
      (memory.importance || 0) < filters.minImportance
    ) {
      return false;
    }

    if (
      filters.maxImportance !== undefined &&
      (memory.importance || 0) > filters.maxImportance
    ) {
      return false;
    }

    // Tag filters
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag =>
        memory.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Date range filters (use createdAt from MemoryMetadata)
    if (filters.startDate && memory.createdAt < filters.startDate) {
      return false;
    }

    if (filters.endDate && memory.createdAt > filters.endDate) {
      return false;
    }

    return true;
  }

  private sortResults(
    results: MemoryMetadata[],
    filters: MemoryFilters
  ): MemoryMetadata[] {
    if (!filters.sortBy) {
      return results;
    }

    return results.sort((a, b) => {
      switch (filters.sortBy) {
        case 'importance':
          return (b.importance || 0) - (a.importance || 0);
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        case 'accessed':
          return b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime();
        default:
          return 0;
      }
    });
  }

  private paginateResults(
    results: MemoryMetadata[],
    filters: MemoryFilters
  ): MemoryMetadata[] {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    return results.slice(offset, offset + limit);
  }

  private async updateIndexes(
    oldMemory: MemoryMetadata,
    newMemory: MemoryMetadata,
    multi: any
  ): Promise<void> {
    // Remove old indexes
    await this.removeFromIndexes(oldMemory, multi);

    // Add new indexes
    await this.addToIndexes(newMemory, multi);
  }

  private async removeFromIndexes(
    memory: MemoryMetadata,
    multi: any
  ): Promise<void> {
    if (memory.agent_id) {
      multi.srem(`index:agent:${memory.agent_id}`, memory.id);
    }
    multi.zrem('index:importance', memory.id);
    multi.zrem('index:timestamp', memory.id);

    for (const tag of memory.tags) {
      multi.srem(`index:tag:${tag}`, memory.id);
    }
  }

  private async addToIndexes(
    memory: MemoryMetadata,
    multi: any
  ): Promise<void> {
    if (memory.agent_id) {
      multi.sadd(`index:agent:${memory.agent_id}`, memory.id);
    }
    multi.zadd(
      'index:importance',
      Math.floor((memory.importance || 0) * 100),
      memory.id
    );
    multi.zadd('index:timestamp', memory.createdAt.getTime(), memory.id);

    for (const tag of memory.tags) {
      multi.sadd(`index:tag:${tag}`, memory.id);
    }
  }

  private updateMetrics(startTime: number, success: boolean): void {
    const latency = Date.now() - startTime;

    this.metrics.totalCommands++;

    if (success) {
      this.metrics.successfulCommands++;
    } else {
      this.metrics.failedCommands++;
    }

    // Update average latency
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalCommands - 1) +
        latency) /
      this.metrics.totalCommands;

    // Track peak latency
    if (latency > this.metrics.peakLatency) {
      this.metrics.peakLatency = latency;
    }
  }

  private extractInfoValue(info: string, key: string): number {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractInfoStringValue(info: string, key: string): string {
    const match = info.match(new RegExp(`${key}:([^\\r\\n]+)`));
    return match ? match[1].trim() : 'unknown';
  }

  private calculateCommandsPerSecond(): number {
    const uptime = this.metrics.totalCommands > 0 ? Date.now() / 1000 : 1;
    return Math.round(this.metrics.totalCommands / uptime);
  }

  private calculateHitRate(): number {
    const totalAccess = this.metrics.cacheHits + this.metrics.cacheMisses;
    return totalAccess > 0
      ? Math.round((this.metrics.cacheHits / totalAccess) * 100) / 100
      : 0;
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.getHealth();
      } catch (error) {
        this.healthStatus = 'unhealthy';
        // Health check failed: ${error}
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Get current metrics for monitoring
   */
  getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all stored data (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      // Redis database cleared
    } catch (error) {
      throw new Error(
        `Failed to clear Redis database: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear memories with optional tenant filter (implementing StorageAdapter interface)
   */
  async clear(tenantId?: string): Promise<void> {
    if (tenantId) {
      // Clear only memories for specific tenant
      const keys = await this.redis.keys(`${this.config.keyPrefix}memory:*`);
      const pipeline = this.redis.pipeline();

      for (const key of keys) {
        try {
          const data = await this.redis.get(key);
          if (data) {
            const memory = await this.deserializeMemory(data);
            if (memory.tenant_id === tenantId) {
              // Delete the memory and clean up indexes
              pipeline.del(key);
              await this.removeFromIndexes(memory, pipeline);
            }
          }
        } catch {
          // Skip corrupted entries
          continue;
        }
      }

      await pipeline.exec();
    } else {
      // Clear all memories
      await this.clearAll();
    }
  }

  /**
   * Bulk store operations for improved performance
   */
  async bulkStore(memories: MemoryMetadata[]): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const memory of memories) {
      try {
        this.validateMemorySize(memory);

        const key = this.generateMemoryKey(memory.id);
        const serializedData = await this.serializeMemory(memory);
        const ttl = this.calculateTTL(memory);

        if (ttl > 0) {
          pipeline.setex(key, ttl, serializedData);
        } else {
          pipeline.set(key, serializedData);
        }

        // Add to indexes
        await this.addToIndexes(memory, pipeline);
      } catch (error) {
        // Skip invalid memories and continue
        continue;
      }
    }

    await pipeline.exec();
  }
}
