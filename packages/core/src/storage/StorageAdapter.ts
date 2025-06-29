/**
 * @fileoverview Storage adapter for persistent memory storage
 */

import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import type { MemoryMetadata } from '../types/index.js';
import { ProductionPostgreSQLAdapter } from './ProductionPostgreSQLAdapter.js';

/**
 * Storage adapter interface for different storage backends
 */
export interface StorageAdapter {
  /**
   * Store a memory entry
   */
  store(memory: MemoryMetadata): Promise<void>;

  /**
   * Retrieve a memory by ID
   */
  retrieve(id: string): Promise<MemoryMetadata | null>;

  /**
   * Update a memory entry
   */
  update(id: string, updates: Partial<MemoryMetadata>): Promise<void>;

  /**
   * Delete a memory entry
   */
  delete(id: string): Promise<void>;

  /**
   * List memories with optional filtering
   */
  list(filters?: MemoryFilters): Promise<MemoryMetadata[]>;

  /**
   * Clear all memories (with optional tenant filter)
   */
  clear(tenantId?: string): Promise<void>;
}

/**
 * Memory filtering options
 */
export interface MemoryFilters {
  tenantId?: string;
  agentId?: string;
  type?: string;
  importance?: number;
  minImportance?: number;
  maxImportance?: number;
  tags?: string[];
  since?: Date;
  until?: Date;
  startDate?: Date;
  endDate?: Date;
  sortBy?: 'created' | 'updated' | 'accessed' | 'importance';
  offset?: number;
  limit?: number;
}

/**
 * In-memory storage adapter for development and testing
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private memories = new Map<string, MemoryMetadata>();

  async store(memory: MemoryMetadata): Promise<void> {
    this.memories.set(memory.id, { ...memory });
  }

  async retrieve(id: string): Promise<MemoryMetadata | null> {
    return this.memories.get(id) || null;
  }

  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    const existing = this.memories.get(id);
    if (existing) {
      this.memories.set(id, { ...existing, ...updates });
    }
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id);
  }
  async list(filters: MemoryFilters = {}): Promise<MemoryMetadata[]> {
    let memories = Array.from(this.memories.values());

    // Apply filters
    if (filters.tenantId) {
      memories = memories.filter(m => m.tenant_id === filters.tenantId);
    }
    if (filters.agentId) {
      memories = memories.filter(m => m.agent_id === filters.agentId);
    }
    if (filters.type) {
      memories = memories.filter(m => m.type === filters.type);
    }
    if (filters.importance !== undefined) {
      memories = memories.filter(m => m.importance >= filters.importance!);
    }
    if (filters.since) {
      memories = memories.filter(m => m.createdAt >= filters.since!);
    }
    if (filters.until) {
      memories = memories.filter(m => m.createdAt <= filters.until!);
    }

    // Sort by createdAt (newest first)
    memories.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || memories.length;

    return memories.slice(offset, offset + limit);
  }

  async clear(tenantId?: string): Promise<void> {
    if (tenantId) {
      // Clear only memories for specific tenant
      for (const [id, memory] of this.memories.entries()) {
        if (memory.tenant_id === tenantId) {
          this.memories.delete(id);
        }
      }
    } else {
      // Clear all memories
      this.memories.clear();
    }
  }
}

/**
 * PostgreSQL storage adapter (production implementation available)
 * @deprecated Use ProductionPostgreSQLAdapter for production deployments
 */
/**
 * PostgreSQL storage adapter - Enhanced implementation
 * @deprecated Use ProductionPostgreSQLAdapter for new implementations
 */
export class PostgreSQLStorageAdapter implements StorageAdapter {
  private adapter: ProductionPostgreSQLAdapter;

  constructor(connectionString: string) {
    console.warn(
      'PostgreSQLStorageAdapter is deprecated. Use ProductionPostgreSQLAdapter instead.'
    );

    // Initialize with the production adapter internally
    const config = this.parseConnectionString(connectionString);
    this.adapter = new ProductionPostgreSQLAdapter(config);
  }

  private parseConnectionString(connectionString: string): any {
    // Simple connection string parsing for backward compatibility
    const url = new URL(connectionString);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      ssl: url.searchParams.get('ssl') === 'true',
    };
  }

  async store(memory: MemoryMetadata): Promise<void> {
    return this.adapter.store(memory);
  }

  async retrieve(id: string): Promise<MemoryMetadata | null> {
    return this.adapter.retrieve(id);
  }

  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    return this.adapter.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    return this.adapter.delete(id);
  }

  async list(filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    return this.adapter.list(filters);
  }

  async clear(tenantId?: string): Promise<void> {
    return this.adapter.clear(tenantId);
  }
}

/**
 * Redis storage adapter - Production implementation
 */
export class RedisStorageAdapter implements StorageAdapter {
  private redis: any;

  constructor(private redisUrl: string) {
    // Import and initialize Redis client dynamically to avoid import issues
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const Redis = await import('ioredis');
      this.redis = new Redis.default(this.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        retryStrategy: (times: number) => Math.min(times * 50, 2000),
      });
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.redis) {
      await this.initializeRedis();
    }
    if (this.redis.status !== 'ready') {
      await this.redis.connect();
    }
  }

  async store(memory: MemoryMetadata): Promise<void> {
    try {
      await this.ensureConnected();

      // Store memory as JSON with TTL if specified
      const memoryData = JSON.stringify(memory);
      const key = `memory:${memory.id}`;

      if (memory.ttl) {
        const ttlSeconds = Math.floor(
          (memory.ttl.getTime() - Date.now()) / 1000
        );
        if (ttlSeconds > 0) {
          await this.redis.setex(key, ttlSeconds, memoryData);
        } else {
          await this.redis.set(key, memoryData);
        }
      } else {
        await this.redis.set(key, memoryData);
      }

      // Create indexes for efficient querying
      if (memory.tenant_id) {
        await this.redis.sadd(`tenant:${memory.tenant_id}:memories`, memory.id);
      }
      if (memory.agent_id) {
        await this.redis.sadd(`agent:${memory.agent_id}:memories`, memory.id);
      }
      if (memory.type) {
        await this.redis.sadd(`type:${memory.type}:memories`, memory.id);
      }

      // Store tags for search
      if (memory.tags && memory.tags.length > 0) {
        for (const tag of memory.tags) {
          await this.redis.sadd(`tag:${tag}:memories`, memory.id);
        }
      }
    } catch (error) {
      console.error('Redis store error:', error);
      throw error;
    }
  }

  async retrieve(id: string): Promise<MemoryMetadata | null> {
    try {
      await this.ensureConnected();

      const memoryData = await this.redis.get(`memory:${id}`);
      if (!memoryData) {
        return null;
      }

      const memory = JSON.parse(memoryData) as MemoryMetadata;

      // Convert date strings back to Date objects
      if (memory.createdAt && typeof memory.createdAt === 'string') {
        memory.createdAt = new Date(memory.createdAt);
      }
      if (memory.updatedAt && typeof memory.updatedAt === 'string') {
        memory.updatedAt = new Date(memory.updatedAt);
      }
      if (memory.lastAccessedAt && typeof memory.lastAccessedAt === 'string') {
        memory.lastAccessedAt = new Date(memory.lastAccessedAt);
      }
      if (memory.ttl && typeof memory.ttl === 'string') {
        memory.ttl = new Date(memory.ttl);
      }

      // Update last accessed time
      memory.lastAccessedAt = new Date();
      memory.accessCount = (memory.accessCount || 0) + 1;

      // Store updated access info back to Redis
      await this.redis.set(`memory:${id}`, JSON.stringify(memory));

      return memory;
    } catch (error) {
      console.error('Redis retrieve error:', error);
      return null;
    }
  }

  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    try {
      await this.ensureConnected();

      const existing = await this.retrieve(id);
      if (!existing) {
        throw new Error(`Memory with id ${id} not found`);
      }

      // Merge updates with existing memory
      const updated: MemoryMetadata = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: new Date(),
      };

      // Remove old indexes if needed
      if (updates.tenant_id && existing.tenant_id !== updates.tenant_id) {
        if (existing.tenant_id) {
          await this.redis.srem(`tenant:${existing.tenant_id}:memories`, id);
        }
      }
      if (updates.agent_id && existing.agent_id !== updates.agent_id) {
        if (existing.agent_id) {
          await this.redis.srem(`agent:${existing.agent_id}:memories`, id);
        }
      }

      // Store updated memory
      await this.store(updated);
    } catch (error) {
      console.error('Redis update error:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.ensureConnected();

      // Get memory first to clean up indexes
      const memory = await this.retrieve(id);

      if (memory) {
        // Remove from indexes
        if (memory.tenant_id) {
          await this.redis.srem(`tenant:${memory.tenant_id}:memories`, id);
        }
        if (memory.agent_id) {
          await this.redis.srem(`agent:${memory.agent_id}:memories`, id);
        }
        if (memory.type) {
          await this.redis.srem(`type:${memory.type}:memories`, id);
        }
        if (memory.tags) {
          for (const tag of memory.tags) {
            await this.redis.srem(`tag:${tag}:memories`, id);
          }
        }
      }

      // Delete the memory itself
      await this.redis.del(`memory:${id}`);
    } catch (error) {
      console.error('Redis delete error:', error);
      throw error;
    }
  }

  async list(filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    try {
      await this.ensureConnected();

      let memoryIds: string[] = [];

      if (filters?.tenantId) {
        memoryIds = await this.redis.smembers(
          `tenant:${filters.tenantId}:memories`
        );
      } else if (filters?.agentId) {
        memoryIds = await this.redis.smembers(
          `agent:${filters.agentId}:memories`
        );
      } else if (filters?.type) {
        memoryIds = await this.redis.smembers(`type:${filters.type}:memories`);
      } else {
        // Get all memory keys if no specific filter
        const keys = await this.redis.keys('memory:*');
        memoryIds = keys.map((key: string) => key.replace('memory:', ''));
      }

      // Retrieve all memories
      const memories: MemoryMetadata[] = [];
      for (const id of memoryIds) {
        const memory = await this.retrieve(id);
        if (memory) {
          memories.push(memory);
        }
      }

      // Apply additional filters
      let filtered = memories;

      if (filters?.tags && filters.tags.length > 0) {
        filtered = filtered.filter(
          memory =>
            memory.tags && memory.tags.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters?.minImportance !== undefined) {
        filtered = filtered.filter(
          memory => memory.importance >= filters.minImportance!
        );
      }

      if (filters?.maxImportance !== undefined) {
        filtered = filtered.filter(
          memory => memory.importance <= filters.maxImportance!
        );
      }

      // Sort by creation date (newest first) and apply limit
      filtered.sort((a, b) => {
        const dateA =
          a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB =
          b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      if (filters?.limit) {
        filtered = filtered.slice(0, filters.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Redis list error:', error);
      return [];
    }
  }

  async clear(tenantId?: string): Promise<void> {
    try {
      await this.ensureConnected();

      if (tenantId) {
        // Clear memories for specific tenant
        const memoryIds = await this.redis.smembers(
          `tenant:${tenantId}:memories`
        );

        for (const id of memoryIds) {
          await this.delete(id);
        }

        // Clear tenant index
        await this.redis.del(`tenant:${tenantId}:memories`);
      } else {
        // Clear all memories
        const keys = await this.redis.keys('memory:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }

        // Clear all indexes
        const indexKeys = await this.redis.keys('tenant:*:memories');
        const agentKeys = await this.redis.keys('agent:*:memories');
        const typeKeys = await this.redis.keys('type:*:memories');
        const tagKeys = await this.redis.keys('tag:*:memories');

        const allIndexKeys = [
          ...indexKeys,
          ...agentKeys,
          ...typeKeys,
          ...tagKeys,
        ];
        if (allIndexKeys.length > 0) {
          await this.redis.del(...allIndexKeys);
        }
      }
    } catch (error) {
      console.error('Redis clear error:', error);
      throw error;
    }
  }
}

/**
 * File-based storage adapter for shared persistent storage
 */
export class FileStorageAdapter implements StorageAdapter {
  private filePath: string;
  private lockPath: string;

  constructor(dataDirectory: string = './data/memory') {
    this.filePath = join(dataDirectory, 'memories.json');
    this.lockPath = join(dataDirectory, 'memories.lock');
  }

  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async acquireLock(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;
    const delay = 10; // ms

    while (attempts < maxAttempts) {
      try {
        await fs.writeFile(this.lockPath, process.pid.toString(), {
          flag: 'wx',
        });
        return;
      } catch (error: any) {
        if (error.code === 'EEXIST') {
          // Lock exists, check if process is still running
          try {
            const pid = await fs.readFile(this.lockPath, 'utf8');
            // On Windows, we can't easily check if PID is running, so just wait
            await new Promise(resolve => setTimeout(resolve, delay));
            attempts++;
            continue;
          } catch {
            // Lock file is corrupted, remove it
            try {
              await fs.unlink(this.lockPath);
            } catch {
              // Ignore errors
            }
          }
        } else {
          throw error;
        }
      }
    }
    throw new Error('Could not acquire lock after multiple attempts');
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore errors - lock might not exist
    }
  }

  private async readMemories(): Promise<Map<string, MemoryMetadata>> {
    await this.ensureDirectory();

    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      const memoriesArray = JSON.parse(data) as MemoryMetadata[];
      const memories = new Map<string, MemoryMetadata>();

      // Convert dates back from strings
      for (const memory of memoriesArray) {
        memories.set(memory.id, {
          ...memory,
          createdAt: new Date(memory.createdAt),
          updatedAt: new Date(memory.updatedAt),
          lastAccessedAt: new Date(memory.lastAccessedAt),
        });
      }

      return memories;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist yet
        return new Map();
      }
      throw error;
    }
  }

  private async writeMemories(
    memories: Map<string, MemoryMetadata>
  ): Promise<void> {
    await this.ensureDirectory();
    const memoriesArray = Array.from(memories.values());
    await fs.writeFile(
      this.filePath,
      JSON.stringify(memoriesArray, null, 2),
      'utf8'
    );
  }

  async store(memory: MemoryMetadata): Promise<void> {
    await this.acquireLock();
    try {
      const memories = await this.readMemories();
      memories.set(memory.id, { ...memory });
      await this.writeMemories(memories);
    } finally {
      await this.releaseLock();
    }
  }

  async retrieve(id: string): Promise<MemoryMetadata | null> {
    const memories = await this.readMemories();
    return memories.get(id) || null;
  }

  async update(id: string, updates: Partial<MemoryMetadata>): Promise<void> {
    await this.acquireLock();
    try {
      const memories = await this.readMemories();
      const existing = memories.get(id);
      if (existing) {
        memories.set(id, { ...existing, ...updates });
        await this.writeMemories(memories);
      }
    } finally {
      await this.releaseLock();
    }
  }

  async delete(id: string): Promise<void> {
    await this.acquireLock();
    try {
      const memories = await this.readMemories();
      memories.delete(id);
      await this.writeMemories(memories);
    } finally {
      await this.releaseLock();
    }
  }

  async list(filters: MemoryFilters = {}): Promise<MemoryMetadata[]> {
    const memories = await this.readMemories();
    let memoriesArray = Array.from(memories.values());

    // Apply filters
    if (filters.tenantId) {
      memoriesArray = memoriesArray.filter(
        m => m.tenant_id === filters.tenantId
      );
    }
    if (filters.agentId) {
      memoriesArray = memoriesArray.filter(m => m.agent_id === filters.agentId);
    }
    if (filters.type) {
      memoriesArray = memoriesArray.filter(m => m.type === filters.type);
    }
    if (filters.importance !== undefined) {
      memoriesArray = memoriesArray.filter(
        m => m.importance >= filters.importance!
      );
    }
    if (filters.since) {
      memoriesArray = memoriesArray.filter(m => m.createdAt >= filters.since!);
    }
    if (filters.until) {
      memoriesArray = memoriesArray.filter(m => m.createdAt <= filters.until!);
    }

    // Sort by createdAt (newest first)
    memoriesArray.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || memoriesArray.length;

    return memoriesArray.slice(offset, offset + limit);
  }

  async clear(tenantId?: string): Promise<void> {
    await this.acquireLock();
    try {
      const memories = await this.readMemories();

      if (tenantId) {
        // Clear only memories for specific tenant
        for (const [id, memory] of memories.entries()) {
          if (memory.tenant_id === tenantId) {
            memories.delete(id);
          }
        }
      } else {
        // Clear all memories
        memories.clear();
      }

      await this.writeMemories(memories);
    } finally {
      await this.releaseLock();
    }
  }
}
