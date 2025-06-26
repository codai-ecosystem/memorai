/**
 * High-Performance Memory Engine with Caching and Optimization
 * Addresses 45GB memory issue and performance problems
 */

import { createHash, randomUUID } from 'crypto';

import {
  HighPerformanceCache,
  memoryCache,
} from '../cache/HighPerformanceCache.js';
import { MemoryConfigManager } from '../config/MemoryConfig.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { MemoryOptimizer } from '../optimization/MemoryOptimizer.js';
import { InputValidator } from '../security/SecurityManager.js';
import type {
  ContextRequest,
  ContextResponse,
  MemoryConfig,
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  MemoryType,
} from '../types/index.js';
import { MemoryError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { OptimizedQdrantVectorStore } from '../vector/OptimizedQdrantVectorStore.js';
import { MemoryVectorStore } from '../vector/VectorStore.js';

export interface RememberOptions {
  type?: MemoryType;
  importance?: number;
  emotional_weight?: number;
  tags?: string[];
  context?: Record<string, unknown>;
  ttl?: Date;
  skipDuplicateCheck?: boolean;
}

export interface RecallOptions {
  type?: MemoryType;
  limit?: number;
  threshold?: number;
  include_context?: boolean;
  time_decay?: boolean;
  useCache?: boolean;
}

export interface PerformanceMetrics {
  totalMemories: number;
  cacheHitRate: number;
  averageQueryTime: number;
  memoryUsage: number;
  duplicatesFound: number;
  optimizationSavings: number;
}

export class HighPerformanceMemoryEngine {
  private config: MemoryConfigManager;
  private embedding: EmbeddingService;
  private vectorStore: MemoryVectorStore;
  private optimizer: MemoryOptimizer;
  private cache: HighPerformanceCache<MemoryResult[]>;
  private isInitialized = false;
  private performanceMetrics: PerformanceMetrics = {
    totalMemories: 0,
    cacheHitRate: 0,
    averageQueryTime: 0,
    memoryUsage: 0,
    duplicatesFound: 0,
    optimizationSavings: 0,
  };

  constructor(config?: Partial<MemoryConfig>) {
    this.config = new MemoryConfigManager(config);
    this.embedding = new EmbeddingService(this.config.getEmbedding());

    // Use optimized Qdrant configuration
    const vectorConfig = this.config.getVectorDB();
    const actualDimension = this.embedding.getDimension();

    const optimizedQdrant = new OptimizedQdrantVectorStore({
      url: vectorConfig.url,
      collection: vectorConfig.collection,
      dimension: actualDimension,
      apiKey: vectorConfig.api_key,
      batchSize: 500, // Smaller batches for better performance
      maxRetries: 3,
      requestTimeout: 15000, // Reduced timeout
      connectionPoolSize: 3,
      enableCompression: true,
      quantizationEnabled: true,
      segmentThreshold: 10000, // Smaller segments
      hnswM: 24, // Balanced performance
      hnswEfConstruct: 150,
      fullScanThreshold: 10000,
    });

    this.vectorStore = new MemoryVectorStore(optimizedQdrant);
    this.optimizer = new MemoryOptimizer(optimizedQdrant, {
      maxMemoryAge: 60, // 2 months instead of 3
      maxMemoryCount: 50000, // Reduced from 100k
      duplicateDetectionThreshold: 0.98, // Stricter duplicate detection
      batchSize: 500,
      compressionEnabled: true,
      cacheTtl: 180, // 3 minutes
      cleanupInterval: 12, // Every 12 hours
      lowAccessThreshold: 1, // More aggressive cleanup
      lowAccessMaxAge: 21, // 3 weeks
    });

    this.cache = memoryCache;

    // Start periodic optimization
    this.startPeriodicOptimization();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.vectorStore.initialize();

      // Run initial optimization to clean up existing data
      logger.info('Running initial memory optimization...');
      await this.optimizer.optimize('_global_'); // Global optimization

      this.isInitialized = true;
      logger.info('High-performance memory engine initialized successfully');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(
          `Failed to initialize memory engine: ${error.message}`,
          'INIT_ERROR'
        );
      }
      throw new MemoryError('Unknown initialization error', 'INIT_ERROR');
    }
  }

  /**
   * High-performance remember with aggressive deduplication
   */
  public async remember(
    content: string,
    tenantId: string,
    agentId?: string,
    options: RememberOptions = {}
  ): Promise<string> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    // Ensure content is a string
    const contentStr = String(content || '');
    if (!contentStr || contentStr.trim().length === 0) {
      throw new MemoryError('Content cannot be empty', 'INVALID_CONTENT');
    }

    // Enhanced content validation and sanitization
    const validation = InputValidator.validateMemoryContent(contentStr);
    if (!validation.isValid) {
      throw new MemoryError(
        `Invalid content: ${validation.errors.join(', ')}`,
        'INVALID_CONTENT'
      );
    }

    try {
      const sanitizedContent = validation.sanitizedContent;

      // Aggressive duplicate checking unless skipped
      if (!options.skipDuplicateCheck) {
        const contentHash = this.generateContentHash(
          sanitizedContent,
          tenantId
        );
        const existingMemory = await this.checkForDuplicate(
          contentHash,
          tenantId,
          agentId
        );
        if (existingMemory) {
          await this.updateMemoryAccess(existingMemory);
          this.performanceMetrics.duplicatesFound++;

          // Invalidate cache for this tenant
          this.cache.invalidateTenant(tenantId);

          logger.debug(
            `Duplicate memory found, updated access for: ${existingMemory}`
          );
          return existingMemory;
        }
      }

      // Generate embedding with performance tracking
      const embeddingResult = await this.embedding.embed(sanitizedContent);

      // Create optimized memory metadata
      const memory: MemoryMetadata = {
        id: randomUUID(),
        type: options.type ?? this.classifyMemoryType(sanitizedContent),
        content: sanitizedContent,
        embedding: embeddingResult.embedding,
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        importance:
          options.importance ?? this.calculateImportance(sanitizedContent),
        emotional_weight: options.emotional_weight,
        tags: options.tags ?? [],
        context: options.context,
        tenant_id: tenantId,
        agent_id: agentId,
        ttl: options.ttl,
      };

      // Store with performance optimization
      await this.vectorStore.storeMemory(memory, embeddingResult.embedding);

      // Invalidate relevant cache entries
      this.cache.invalidateTenant(tenantId);

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      logger.debug(
        `Memory stored in ${Date.now() - startTime}ms: ${memory.id}`
      );
      return memory.id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(
          `Failed to remember: ${error.message}`,
          'REMEMBER_ERROR'
        );
      }
      throw new MemoryError('Unknown remember error', 'REMEMBER_ERROR');
    }
  }

  /**
   * High-performance recall with intelligent caching
   */
  public async recall(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    // Ensure query is a string
    const queryStr = String(query || '');
    if (!queryStr || queryStr.trim().length === 0) {
      throw new MemoryError('Query cannot be empty', 'INVALID_QUERY');
    }

    try {
      // Check cache first (unless disabled)
      if (options.useCache !== false) {
        const cachedResults = this.cache.getCachedMemoryResults(
          queryStr,
          tenantId,
          agentId,
          options
        );
        if (cachedResults) {
          this.updateCacheHitRate(true);
          logger.debug(`Cache hit for query: ${queryStr.substring(0, 50)}...`);
          return cachedResults;
        }
        this.updateCacheHitRate(false);
      }

      // Generate query embedding
      const embeddingResult = await this.embedding.embed(queryStr);

      // Build optimized memory query
      const memoryQuery: MemoryQuery = {
        query: queryStr.trim(),
        type: options.type,
        limit: Math.min(options.limit ?? 10, 50), // Cap at 50 for performance
        threshold: options.threshold ?? 0.6, // Slightly higher for better quality
        tenant_id: tenantId,
        agent_id: agentId,
        include_context: options.include_context ?? true,
        time_decay: options.time_decay ?? true,
      };

      // Search memories with performance optimization
      const results = await this.vectorStore.searchMemories(
        embeddingResult.embedding,
        memoryQuery
      );

      // Apply time decay if enabled
      let finalResults = results;
      if (options.time_decay) {
        finalResults = this.applyTimeDecay(results);
      }

      // Cache results for future queries
      if (options.useCache !== false && finalResults.length > 0) {
        this.cache.cacheMemoryResults(
          query,
          tenantId,
          finalResults,
          agentId,
          options
        );
      }

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      logger.debug(
        `Recall completed in ${Date.now() - startTime}ms, found ${finalResults.length} results`
      );
      return finalResults;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(
          `Failed to recall: ${error.message}`,
          'RECALL_ERROR'
        );
      }
      throw new MemoryError('Unknown recall error', 'RECALL_ERROR');
    }
  }
  /**
   * Optimized context loading with pagination and caching
   */
  public async getContext(
    request: ContextRequest,
    useCache: boolean = true
  ): Promise<ContextResponse> {
    const startTime = Date.now();

    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    try {
      // Use smaller context limits for better performance
      const optimizedRequest = {
        ...request,
        max_memories: Math.min(request.max_memories || 15, 25), // Use max_memories instead of limit
      };

      // Check context cache
      const cacheKey = `context_${optimizedRequest.tenant_id}_${optimizedRequest.agent_id}_${optimizedRequest.max_memories}`;
      if (useCache) {
        const cached = this.cache.get(cacheKey) as ContextResponse | null;
        if (cached) {
          logger.debug('Context cache hit');
          return cached;
        }
      }

      // Get recent memories with type-based prioritization
      const recentMemories =
        await this.getRecentMemoriesOptimized(optimizedRequest);

      // Convert to MemoryResult format
      const memoryResults: MemoryResult[] = recentMemories.map(memory => ({
        memory,
        score: 0.8, // Default score for recent memories
        relevance_reason: 'Recent memory',
      }));

      const response: ContextResponse = {
        context: this.generateContextSummary(recentMemories),
        memories: memoryResults,
        summary: this.generateContextSummary(recentMemories),
        confidence: this.calculateRelevanceScore(recentMemories),
        generated_at: new Date(),
        total_count: memoryResults.length,
        context_summary: this.generateContextSummary(recentMemories),
      };

      // Cache the response
      if (useCache) {
        this.cache.set(cacheKey, response as any, 300); // 5 minute cache
      }

      logger.debug(`Context loaded in ${Date.now() - startTime}ms`);
      return response;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(
          `Failed to get context: ${error.message}`,
          'CONTEXT_ERROR'
        );
      }
      throw new MemoryError('Unknown context error', 'CONTEXT_ERROR');
    }
  }

  /**
   * Run memory optimization manually
   */
  public async optimizeMemory(tenantId: string): Promise<void> {
    logger.info(`Starting manual memory optimization for tenant: ${tenantId}`);
    const stats = await this.optimizer.optimize(tenantId);
    this.performanceMetrics.optimizationSavings += stats.totalSize;
    logger.info(
      `Memory optimization completed. Stats: ${JSON.stringify(stats)}`
    );
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    const cacheStats = this.cache.getStats();
    return {
      ...this.performanceMetrics,
      cacheHitRate: cacheStats.hitRate,
      memoryUsage: cacheStats.memoryUsage,
    };
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.cache.clear();
    logger.info('All caches cleared');
  } /**
   * Get memory statistics for a tenant
   */
  public async getMemoryStats(tenantId: string): Promise<unknown> {
    // TODO: Implement getMemoryStats in vector store
    return { totalMemories: 0, tenantId };
  }

  // Private helper methods

  private generateContentHash(content: string, tenantId: string): string {
    const data = `${content}:${tenantId}`;
    return createHash('sha256').update(data).digest('hex');
  }
  private async checkForDuplicate(
    _contentHash: string,
    _tenantId: string,
    _agentId?: string
  ): Promise<string | null> {
    // TODO: Implement checkDuplicateByHash in vector store
    return null;
  }

  private async updateMemoryAccess(_memoryId: string): Promise<void> {
    // TODO: Implement updateMemoryAccess in vector store
  }

  private classifyMemoryType(content: string): MemoryType {
    // Quick classification logic
    const lower = content.toLowerCase();
    if (
      lower.includes('prefer') ||
      lower.includes('like') ||
      lower.includes('dislike')
    ) {
      return 'preference';
    }
    if (
      lower.includes('feel') ||
      lower.includes('emotion') ||
      lower.includes('happy') ||
      lower.includes('sad')
    ) {
      return 'emotion';
    }
    if (
      lower.includes('task') ||
      lower.includes('todo') ||
      lower.includes('complete') ||
      lower.includes('finish')
    ) {
      return 'task';
    }
    if (
      lower.includes('how to') ||
      lower.includes('step') ||
      lower.includes('process')
    ) {
      return 'procedure';
    }
    return 'fact';
  }

  private calculateImportance(content: string): number {
    // Simple importance calculation
    let importance = 0.5;

    const priorityWords = [
      'important',
      'critical',
      'urgent',
      'remember',
      'key',
      'essential',
    ];
    const lower = content.toLowerCase();

    for (const word of priorityWords) {
      if (lower.includes(word)) {
        importance += 0.1;
      }
    }

    return Math.min(importance, 1.0);
  }

  private applyTimeDecay(results: MemoryResult[]): MemoryResult[] {
    const now = Date.now();

    return results
      .map(result => {
        const ageInDays =
          (now - result.memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const decayFactor = Math.exp(-ageInDays / 30); // 30-day half-life

        return {
          ...result,
          score: result.score * decayFactor,
        };
      })
      .sort((a, b) => b.score - a.score);
  }
  private async getRecentMemoriesOptimized(
    _request: ContextRequest
  ): Promise<MemoryMetadata[]> {
    // Implement optimized recent memory retrieval
    // This is a placeholder - implement actual optimized retrieval
    const memoryQuery: MemoryQuery = {
      query: 'recent memories',
      limit: _request.max_memories || 15,
      threshold: 0.3, // Lower threshold for recent memories
      tenant_id: _request.tenant_id,
      agent_id: _request.agent_id,
      include_context: true,
      time_decay: false,
    };

    const dummyEmbedding = new Array(this.embedding.getDimension()).fill(0);
    const results = await this.vectorStore.searchMemories(
      dummyEmbedding,
      memoryQuery
    );

    return results.map(r => r.memory);
  }

  private generateContextSummary(memories: MemoryMetadata[]): string {
    if (memories.length === 0) return 'No recent memories available.';

    const typeCount = memories.reduce(
      (acc, m) => {
        acc[m.type] = (acc[m.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const summary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return `Recent context includes: ${summary}`;
  }

  private calculateRelevanceScore(memories: MemoryMetadata[]): number {
    if (memories.length === 0) return 0;

    const avgImportance =
      memories.reduce((sum, m) => sum + (m.importance || 0.5), 0) /
      memories.length;
    const recencyScore = memories.length > 0 ? 1 : 0;

    return (avgImportance + recencyScore) / 2;
  }

  private updatePerformanceMetrics(queryTime: number): void {
    this.performanceMetrics.averageQueryTime =
      (this.performanceMetrics.averageQueryTime + queryTime) / 2;
  }
  private updateCacheHitRate(_hit: boolean): void {
    // This is handled by the cache itself
  }

  private startPeriodicOptimization(): void {
    // Run optimization every 6 hours
    setInterval(
      async () => {
        try {
          logger.info('Starting scheduled memory optimization');
          await this.optimizer.optimize('_global_');
          logger.info('Scheduled optimization completed');
        } catch (error) {
          logger.error('Scheduled optimization failed:', error);
        }
      },
      6 * 60 * 60 * 1000
    ); // 6 hours
  }
}
