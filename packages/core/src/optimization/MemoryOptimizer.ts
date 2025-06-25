/**
 * Enterprise Memory Optimization Engine
 * Handles memory cleanup, compression, and performance optimization
 */

import { logger } from '../utils/logger.js';
import type { MemoryMetadata } from '../types/index.js';
import type { VectorStore } from '../vector/VectorStore.js';

export interface OptimizationConfig {
  // Data Retention Policies
  maxMemoryAge: number; // in days
  maxMemoryCount: number;
  duplicateDetectionThreshold: number;

  // Performance Settings
  batchSize: number;
  compressionEnabled: boolean;
  cacheTtl: number; // in seconds

  // Cleanup Policies
  cleanupInterval: number; // in hours
  lowAccessThreshold: number; // memories accessed less than N times
  lowAccessMaxAge: number; // in days
}

export interface MemoryStats {
  totalMemories: number;
  totalSize: number;
  duplicates: number;
  oldMemories: number;
  lowAccessMemories: number;
  compressionRatio: number;
}

export class MemoryOptimizer {
  private config: OptimizationConfig;
  private vectorStore: VectorStore;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private isOptimizing = false;

  constructor(
    vectorStore: VectorStore,
    config: Partial<OptimizationConfig> = {}
  ) {
    this.vectorStore = vectorStore;
    this.config = {
      maxMemoryAge: 90, // 3 months
      maxMemoryCount: 100000, // 100k memories max
      duplicateDetectionThreshold: 0.95,
      batchSize: 1000,
      compressionEnabled: true,
      cacheTtl: 300, // 5 minutes
      cleanupInterval: 24, // daily
      lowAccessThreshold: 2,
      lowAccessMaxAge: 30, // 30 days
      ...config,
    };

    // Start periodic optimization
    this.startPeriodicOptimization();
  }

  /**
   * Comprehensive memory optimization process
   */
  public async optimize(tenantId: string): Promise<MemoryStats> {
    if (this.isOptimizing) {
      logger.warn('Optimization already in progress, skipping');
      return this.getMemoryStats(tenantId);
    }

    this.isOptimizing = true;
    logger.info('Starting comprehensive memory optimization');

    try {
      const initialStats = await this.getMemoryStats(tenantId);
      logger.info(`Initial stats: ${JSON.stringify(initialStats)}`);

      // Step 1: Remove duplicates
      const duplicatesRemoved = await this.removeDuplicates(tenantId);
      logger.info(`Removed ${duplicatesRemoved} duplicate memories`);

      // Step 2: Clean old/unused memories
      const oldMemoriesRemoved = await this.cleanOldMemories(tenantId);
      logger.info(`Removed ${oldMemoriesRemoved} old memories`);

      // Step 3: Clean low-access memories
      const lowAccessRemoved = await this.cleanLowAccessMemories(tenantId);
      logger.info(`Removed ${lowAccessRemoved} low-access memories`);

      // Step 4: Compress remaining data
      if (this.config.compressionEnabled) {
        await this.compressMemories(tenantId);
        logger.info('Memory compression completed');
      }

      // Step 5: Optimize vector indices
      await this.optimizeIndices(tenantId);
      logger.info('Vector indices optimized');

      const finalStats = await this.getMemoryStats(tenantId);
      logger.info(`Final stats: ${JSON.stringify(finalStats)}`);

      const sizeDiff = initialStats.totalSize - finalStats.totalSize;
      const sizeReduction = (sizeDiff / initialStats.totalSize) * 100;
      logger.info(
        `Optimization complete: ${sizeReduction.toFixed(2)}% size reduction`
      );

      return finalStats;
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Remove duplicate memories based on content similarity
   */
  private async removeDuplicates(tenantId: string): Promise<number> {
    const memories = await this.getAllMemories(tenantId);
    const duplicates: string[] = [];
    const seen: Map<string, MemoryMetadata> = new Map();

    for (const memory of memories) {
      const contentHash = this.generateContentHash(memory.content);
      const existing = seen.get(contentHash);

      if (existing) {
        // Keep the memory with higher importance or newer date
        if (
          memory.importance > existing.importance ||
          memory.createdAt > existing.createdAt
        ) {
          duplicates.push(existing.id);
          seen.set(contentHash, memory);
        } else {
          duplicates.push(memory.id);
        }
      } else {
        seen.set(contentHash, memory);
      }
    }

    if (duplicates.length > 0) {
      await this.vectorStore.delete(duplicates);
    }

    return duplicates.length;
  }

  /**
   * Remove memories older than configured threshold
   */
  private async cleanOldMemories(tenantId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxMemoryAge);

    const memories = await this.getAllMemories(tenantId);
    const oldMemories = memories
      .filter(m => m.createdAt < cutoffDate)
      .map(m => m.id);

    if (oldMemories.length > 0) {
      await this.vectorStore.delete(oldMemories);
    }

    return oldMemories.length;
  }

  /**
   * Remove memories with low access count
   */
  private async cleanLowAccessMemories(tenantId: string): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lowAccessMaxAge);

    const memories = await this.getAllMemories(tenantId);
    const lowAccessMemories = memories
      .filter(
        m =>
          m.accessCount < this.config.lowAccessThreshold &&
          m.createdAt < cutoffDate &&
          m.importance < 0.7 // Don't remove important memories
      )
      .map(m => m.id);

    if (lowAccessMemories.length > 0) {
      await this.vectorStore.delete(lowAccessMemories);
    }

    return lowAccessMemories.length;
  }

  /**
   * Compress memory embeddings and metadata
   */
  private async compressMemories(_tenantId: string): Promise<void> {
    // Implementation would compress vector embeddings using techniques like:
    // - Vector quantization
    // - Dimensionality reduction for less important memories
    // - Metadata compression
    logger.info(
      'Memory compression functionality placeholder - implement vector quantization'
    );
  }

  /**
   * Optimize vector database indices
   */
  private async optimizeIndices(_tenantId: string): Promise<void> {
    // Implementation would:
    // - Rebuild HNSW indices
    // - Optimize segment structure
    // - Clean up tombstones
    logger.info(
      'Vector index optimization functionality placeholder - implement Qdrant optimization'
    );
  }

  /**
   * Get comprehensive memory statistics
   */
  private async getMemoryStats(tenantId: string): Promise<MemoryStats> {
    const memories = await this.getAllMemories(tenantId);
    const totalSize = memories.reduce(
      (sum, m) => sum + this.calculateMemorySize(m),
      0
    );

    return {
      totalMemories: memories.length,
      totalSize,
      duplicates: await this.countDuplicates(memories),
      oldMemories: await this.countOldMemories(memories),
      lowAccessMemories: await this.countLowAccessMemories(memories),
      compressionRatio: 1.0, // Placeholder
    };
  }

  /**
   * Cache frequently accessed data
   */ public getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheTtl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  public setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Start periodic optimization process
   */
  private startPeriodicOptimization(): void {
    const interval = this.config.cleanupInterval * 60 * 60 * 1000; // Convert hours to ms

    setInterval(async () => {
      try {
        logger.info('Starting scheduled memory optimization'); // Get all tenants and optimize each
        // Implementation would get tenant list and optimize each
        logger.info(
          'Scheduled optimization placeholder - implement tenant enumeration'
        );
      } catch (error) {
        logger.error('Scheduled optimization failed:', error);
      }
    }, interval);
  }

  // Helper methods
  private async getAllMemories(_tenantId: string): Promise<MemoryMetadata[]> {
    // Implementation would efficiently fetch all memories for tenant
    // This is a placeholder - implement actual memory fetching
    return [];
  }

  private generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private calculateMemorySize(memory: MemoryMetadata): number {
    // Calculate approximate memory size including embedding vector
    const contentSize = memory.content.length * 2; // UTF-16
    const embeddingSize = memory.embedding ? memory.embedding.length * 4 : 0; // 4 bytes per float
    const metadataSize = JSON.stringify(memory).length * 2;
    return contentSize + embeddingSize + metadataSize;
  }

  private async countDuplicates(memories: MemoryMetadata[]): Promise<number> {
    const contentHashes = new Set<string>();
    let duplicates = 0;

    for (const memory of memories) {
      const hash = this.generateContentHash(memory.content);
      if (contentHashes.has(hash)) {
        duplicates++;
      } else {
        contentHashes.add(hash);
      }
    }

    return duplicates;
  }

  private async countOldMemories(memories: MemoryMetadata[]): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.maxMemoryAge);
    return memories.filter(m => m.createdAt < cutoffDate).length;
  }

  private async countLowAccessMemories(
    memories: MemoryMetadata[]
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.lowAccessMaxAge);
    return memories.filter(
      m =>
        m.accessCount < this.config.lowAccessThreshold &&
        m.createdAt < cutoffDate
    ).length;
  }
}
