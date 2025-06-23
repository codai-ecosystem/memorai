/**
 * @fileoverview Storage adapter for persistent memory storage
 */

import { promises as fs } from "fs";
import { join, dirname } from "path";
import type { MemoryMetadata } from "../types/index.js";

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
      memories = memories.filter((m) => m.tenant_id === filters.tenantId);
    }
    if (filters.agentId) {
      memories = memories.filter((m) => m.agent_id === filters.agentId);
    }
    if (filters.type) {
      memories = memories.filter((m) => m.type === filters.type);
    }
    if (filters.importance !== undefined) {
      memories = memories.filter((m) => m.importance >= filters.importance!);
    }
    if (filters.since) {
      memories = memories.filter((m) => m.createdAt >= filters.since!);
    }
    if (filters.until) {
      memories = memories.filter((m) => m.createdAt <= filters.until!);
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
  constructor(private connectionString: string) { }
  async store(_memory: MemoryMetadata): Promise<void> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }

  async retrieve(_id: string): Promise<MemoryMetadata | null> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }

  async update(_id: string, _updates: Partial<MemoryMetadata>): Promise<void> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }

  async delete(_id: string): Promise<void> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }

  async list(_filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }

  async clear(_tenantId?: string): Promise<void> {
    throw new Error("PostgreSQL adapter not implemented yet");
  }
}

/**
 * Redis storage adapter (stub for future implementation)
 */
export class RedisStorageAdapter implements StorageAdapter {
  constructor(private redisUrl: string) { }
  async store(_memory: MemoryMetadata): Promise<void> {
    throw new Error("Redis adapter not implemented yet");
  }

  async retrieve(_id: string): Promise<MemoryMetadata | null> {
    throw new Error("Redis adapter not implemented yet");
  }

  async update(_id: string, _updates: Partial<MemoryMetadata>): Promise<void> {
    throw new Error("Redis adapter not implemented yet");
  }

  async delete(_id: string): Promise<void> {
    throw new Error("Redis adapter not implemented yet");
  }

  async list(_filters?: MemoryFilters): Promise<MemoryMetadata[]> {
    throw new Error("Redis adapter not implemented yet");
  }

  async clear(_tenantId?: string): Promise<void> {
    throw new Error("Redis adapter not implemented yet");
  }
}

/**
 * File-based storage adapter for shared persistent storage
 */
export class FileStorageAdapter implements StorageAdapter {
  private filePath: string;
  private lockPath: string;

  constructor(dataDirectory: string = "./data/memory") {
    this.filePath = join(dataDirectory, "memories.json");
    this.lockPath = join(dataDirectory, "memories.lock");
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
        await fs.writeFile(this.lockPath, process.pid.toString(), { flag: 'wx' });
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

  private async writeMemories(memories: Map<string, MemoryMetadata>): Promise<void> {
    await this.ensureDirectory();
    const memoriesArray = Array.from(memories.values());
    await fs.writeFile(this.filePath, JSON.stringify(memoriesArray, null, 2), 'utf8');
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
      memoriesArray = memoriesArray.filter((m) => m.tenant_id === filters.tenantId);
    }
    if (filters.agentId) {
      memoriesArray = memoriesArray.filter((m) => m.agent_id === filters.agentId);
    }
    if (filters.type) {
      memoriesArray = memoriesArray.filter((m) => m.type === filters.type);
    }
    if (filters.importance !== undefined) {
      memoriesArray = memoriesArray.filter((m) => m.importance >= filters.importance!);
    }
    if (filters.since) {
      memoriesArray = memoriesArray.filter((m) => m.createdAt >= filters.since!);
    }
    if (filters.until) {
      memoriesArray = memoriesArray.filter((m) => m.createdAt <= filters.until!);
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
