/**
 * @fileoverview Storage adapter for persistent memory storage
 */

import type { MemoryMetadata } from '../types/index.js';

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
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
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
 * PostgreSQL storage adapter (stub for future implementation)
 */
export class PostgreSQLStorageAdapter implements StorageAdapter {
  constructor(private connectionString: string) {}
    async store(_memory: MemoryMetadata): Promise<void> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
  
  async retrieve(_id: string): Promise<MemoryMetadata | null> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
  
  async update(_id: string, _updates: Partial<MemoryMetadata>): Promise<void> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
  
  async delete(_id: string): Promise<void> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
  
  async list(_filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
  
  async clear(_tenantId?: string): Promise<void> {
    throw new Error('PostgreSQL adapter not implemented yet');
  }
}

/**
 * Redis storage adapter (stub for future implementation)
 */
export class RedisStorageAdapter implements StorageAdapter {
  constructor(private redisUrl: string) {}
    async store(_memory: MemoryMetadata): Promise<void> {
    throw new Error('Redis adapter not implemented yet');
  }
  
  async retrieve(_id: string): Promise<MemoryMetadata | null> {
    throw new Error('Redis adapter not implemented yet');
  }
  
  async update(_id: string, _updates: Partial<MemoryMetadata>): Promise<void> {
    throw new Error('Redis adapter not implemented yet');
  }
  
  async delete(_id: string): Promise<void> {
    throw new Error('Redis adapter not implemented yet');
  }
  
  async list(_filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    throw new Error('Redis adapter not implemented yet');
  }
  
  async clear(_tenantId?: string): Promise<void> {
    throw new Error('Redis adapter not implemented yet');
  }
}
