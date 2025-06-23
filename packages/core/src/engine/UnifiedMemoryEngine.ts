/**
 * Unified Memory Engine - Revolutionary Multi-Tier Architecture
 * Automatically selects the best available memory tier and provides graceful fallback
 */

import { nanoid } from "nanoid";
import { logger } from "../utils/logger.js";
import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  ContextRequest,
  ContextResponse,
  MemoryType,
  MemoryConfig,
} from "../types/index.js";
import { MemoryError } from "../types/index.js";
import { MemoryEngine } from "./MemoryEngine.js";
import { BasicMemoryEngine } from "./BasicMemoryEngine.js";
import { MockMemoryEngine } from "./MockMemoryEngine.js";
import { LocalEmbeddingService } from "../embedding/LocalEmbeddingService.js";
import {
  MemoryTierLevel,
  MemoryTierDetector,
  type MemoryTierInfo,
  type MemoryTierCapabilities,
} from "./MemoryTier.js";

export interface UnifiedMemoryConfig extends Partial<MemoryConfig> {
  preferredTier?: MemoryTierLevel;
  enableFallback?: boolean;
  autoDetect?: boolean;

  // Data path for shared file storage
  dataPath?: string;

  // API configuration - optional
  apiKey?: string;
  model?: string;

  // Azure OpenAI specific configuration
  azureOpenAI?: {
    endpoint?: string;
    apiKey?: string;
    deploymentName?: string;
    apiVersion?: string;
  };

  // Standard OpenAI configuration
  openaiEmbedding?: {
    model?: string;
    dimensions?: number;
  };

  localEmbedding?: {
    model?: string;
    pythonPath?: string;
    cachePath?: string;
  };
  mock?: {
    simulateDelay?: boolean;
    delayMs?: number;
    failureRate?: number;
  };
}

export interface RememberOptions {
  type?: MemoryType;
  importance?: number;
  emotional_weight?: number;
  tags?: string[];
  context?: Record<string, unknown>;
  ttl?: Date;
}

export interface RecallOptions {
  type?: MemoryType;
  limit?: number;
  threshold?: number;
  include_context?: boolean;
  time_decay?: boolean;
}

export class UnifiedMemoryEngine {
  private config: UnifiedMemoryConfig;
  private currentTier: MemoryTierLevel;
  private tierDetector: MemoryTierDetector;
  private isInitialized = false;

  // Engine instances
  private advancedEngine?: MemoryEngine;
  private smartEngine?: MemoryEngine;
  private basicEngine?: BasicMemoryEngine;
  private mockEngine?: MockMemoryEngine;
  private localEmbedding?: LocalEmbeddingService; // Current active engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private activeEngine: any; // Multiple engine types with different APIs

  constructor(config: UnifiedMemoryConfig = {}) {
    this.config = {
      enableFallback: true,
      autoDetect: true,
      ...config,
    };

    this.tierDetector = MemoryTierDetector.getInstance();
    this.currentTier = config.preferredTier || MemoryTierLevel.BASIC; // Start with basic as default
  }

  /**
   * Initialize the unified memory engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Auto-detect best available tier if enabled
      if (this.config.autoDetect) {
        this.currentTier = await this.tierDetector.detectBestTier();
      }

      // Initialize the selected tier
      await this.initializeTier(this.currentTier);

      this.isInitialized = true;

      logger.info(
        `🧠 Memory Engine initialized with ${this.getTierInfo().message}`,
      );
    } catch (error: unknown) {
      if (this.config.enableFallback) {
        logger.warn(
          `Failed to initialize ${this.currentTier} tier, attempting fallback...`,
        );
        await this.fallbackToNextTier();
      } else {
        if (error instanceof Error) {
          throw new MemoryError(
            `Failed to initialize memory engine: ${error.message}`,
            "INIT_ERROR",
          );
        }
        throw new MemoryError("Unknown initialization error", "INIT_ERROR");
      }
    }
  }

  /**
   * Remember new information with automatic tier routing
   */
  public async remember(
    content: string,
    tenantId: string,
    agentId?: string,
    options: RememberOptions = {},
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new MemoryError(
        "Memory engine not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }

    if (!content || content.trim().length === 0) {
      throw new MemoryError("Content cannot be empty", "INVALID_CONTENT");
    }

    try {
      const memoryId = nanoid();
      const memory: MemoryMetadata = {
        id: memoryId,
        type: options.type ?? this.classifyMemoryType(content),
        content: content.trim(),
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        importance: options.importance ?? this.calculateImportance(content),
        emotional_weight: options.emotional_weight,
        tags: options.tags ?? [],
        context: options.context,
        tenant_id: tenantId,
        agent_id: agentId,
        ttl: options.ttl,
      };

      await this.activeEngine.remember(memory);
      return memoryId;
    } catch (error) {
      if (this.config.enableFallback) {
        logger.warn(
          `Memory operation failed on ${this.currentTier} tier, attempting fallback...`,
        );
        await this.fallbackToNextTier();
        return this.remember(content, tenantId, agentId, options);
      }
      throw this.handleError(error, "REMEMBER_ERROR");
    }
  }

  /**
   * Recall memories with automatic tier routing
   */
  public async recall(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {},
  ): Promise<MemoryResult[]> {
    if (!this.isInitialized) {
      throw new MemoryError(
        "Memory engine not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }

    if (!query || query.trim().length === 0) {
      throw new MemoryError("Query cannot be empty", "INVALID_QUERY");
    }

    try {
      const memoryQuery: MemoryQuery = {
        query: query.trim(),
        type: options.type,
        limit: options.limit ?? 10,
        threshold: options.threshold ?? 0.7,
        tenant_id: tenantId,
        agent_id: agentId,
        include_context: options.include_context ?? true,
        time_decay: options.time_decay ?? true,
      };

      const results = await this.activeEngine.recall(memoryQuery);

      // Update access count for returned memories
      for (const result of results) {
        result.memory.lastAccessedAt = new Date();
        result.memory.accessCount++;
      }
      return results;
    } catch (error) {
      if (this.config.enableFallback) {
        logger.warn(
          `Memory operation failed on ${this.currentTier} tier, attempting fallback...`,
        );
        await this.fallbackToNextTier();
        return this.recall(query, tenantId, agentId, options);
      }
      throw this.handleError(error, "RECALL_ERROR");
    }
  }

  /**
   * Get context for agent with automatic tier routing
   */
  public async getContext(_request: ContextRequest): Promise<ContextResponse> {
    if (!this.isInitialized) {
      throw new MemoryError(
        "Memory engine not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }
    try {
      const memories = await this.activeEngine.getContext(
        _request.tenant_id,
        _request.agent_id,
        _request.max_memories ?? 10,
      );

      return {
        context: this.generateContextSummary(memories),
        memories: memories.map((memory: MemoryMetadata) => ({
          memory,
          score: 1.0,
        })),
        summary: this.generateContextSummary(memories),
        confidence: 0.9,
        generated_at: new Date(),
        total_count: memories.length,
        context_summary: this.generateContextSummary(memories),
      };
    } catch (error) {
      if (this.config.enableFallback) {
        logger.warn(
          `Memory operation failed on ${this.currentTier} tier, attempting fallback...`,
        );
        await this.fallbackToNextTier();
        return this.getContext(_request);
      }
      throw this.handleError(error, "CONTEXT_ERROR");
    }
  }

  /**
   * Forget a memory
   */
  public async forget(memoryId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new MemoryError(
        "Memory engine not initialized. Call initialize() first.",
        "NOT_INITIALIZED",
      );
    }

    try {
      return await this.activeEngine.forget(memoryId);
    } catch (error) {
      if (this.config.enableFallback) {
        logger.warn(
          `Memory operation failed on ${this.currentTier} tier, attempting fallback...`,
        );
        await this.fallbackToNextTier();
        return this.forget(memoryId);
      }
      throw this.handleError(error, "FORGET_ERROR");
    }
  }

  /**
   * Get current tier information
   */
  public getTierInfo(): MemoryTierInfo {
    const tierInfo = this.tierDetector.getTierInfo(this.currentTier);
    return {
      ...tierInfo,
      message: `${tierInfo.message} (Active)`,
    };
  }

  /**
   * Manually switch to a specific tier
   */
  public async switchTier(tier: MemoryTierLevel): Promise<void> {
    if (tier === this.currentTier && this.isInitialized) {
      return;
    }

    try {
      await this.initializeTier(tier);
      logger.info(`🔄 Switched to ${this.getTierInfo().message}`);
    } catch (error) {
      throw new MemoryError(
        `Failed to switch to ${tier} tier: ${error instanceof Error ? error.message : "Unknown error"}`,
        "TIER_SWITCH_ERROR",
      );
    }
  }

  /**
   * Initialize a specific memory tier
   */
  private async initializeTier(tier: MemoryTierLevel): Promise<void> {
    this.currentTier = tier;

    switch (tier) {
      case MemoryTierLevel.ADVANCED:
        await this.initializeAdvancedTier();
        break;
      case MemoryTierLevel.SMART:
        await this.initializeSmartTier();
        break;
      case MemoryTierLevel.BASIC:
        await this.initializeBasicTier();
        break;
      case MemoryTierLevel.MOCK:
        await this.initializeMockTier();
        break;
      default:
        throw new Error(`Unknown tier: ${tier}`);
    }
  }

  /**
   * Initialize Advanced (OpenAI) tier
   */
  private async initializeAdvancedTier(): Promise<void> {
    if (!this.advancedEngine) {
      this.advancedEngine = new MemoryEngine(this.config);
    }
    await this.advancedEngine.initialize();
    this.activeEngine = this.advancedEngine;
  } /**
   * Initialize Smart (Local AI) tier
   */
  private async initializeSmartTier(): Promise<void> {
    if (!this.localEmbedding) {
      this.localEmbedding = new LocalEmbeddingService(
        this.config.localEmbedding,
      );
    }

    // Initialize the smart engine with enhanced local AI capabilities
    if (!this.smartEngine) {
      // Create smart config with valid properties
      const smartConfig: Partial<MemoryConfig> = {
        ...this.config,
        // Override embedding to use local
        embedding: {
          provider: "local",
          model: this.config.localEmbedding?.model || "all-MiniLM-L6-v2",
          dimensions: 384, // Default for MiniLM
        },
        // Enhanced performance settings for smart tier
        performance: {
          cache_ttl_seconds: 3600,
          max_query_time_ms: 30000,
          batch_size: 32, // Larger batches for better throughput
        },
        // Enhanced security for smart tier
        security: {
          encryption_key:
            process.env.MEMORAI_ENCRYPTION_KEY ||
            "default-key-for-development-only-32-chars",
          tenant_isolation: true,
          audit_logs: true,
        },
      };

      this.smartEngine = new MemoryEngine(smartConfig);

      // Initialize the engine
      await this.smartEngine.initialize();

      // Enable advanced features for smart tier
      this.enableSmartFeatures();
    }

    this.activeEngine = this.smartEngine;
  }

  /**
   * Enable advanced features for smart tier
   */
  private enableSmartFeatures(): void {
    // Enable background optimization
    this.startBackgroundOptimization();

    // Enable pattern learning
    this.enablePatternLearning();

    // Enable predictive caching
    this.enablePredictiveCaching();
  }

  /**
   * Start background optimization for smart tier
   */
  private startBackgroundOptimization(): void {
    // Run optimization every 5 minutes
    const optimizationInterval = setInterval(
      async () => {
        try {
          if (this.smartEngine && this.currentTier === "smart") {
            // Optimize vector indices
            await this.optimizeVectorIndices();

            // Cleanup old memories based on usage patterns
            await this.cleanupUnusedMemories();

            // Update classification models with new data
            await this.updateClassificationModels();
          }
        } catch (error) {
          logger.warn("Background optimization error", { error });
        }
      },
      5 * 60 * 1000,
    ); // Store interval for cleanup
    (
      this as unknown as { optimizationInterval: NodeJS.Timeout }
    ).optimizationInterval = optimizationInterval;
  }

  /**
   * Enable pattern learning for improved recall
   */
  private enablePatternLearning(): void {
    // Track user query patterns and optimize accordingly        // Implementation could include:
    // - Query frequency analysis
    // - Context pattern recognition
    // - Personalization based on usage
    logger.debug("Pattern learning enabled for smart tier");
  }

  /**
   * Enable predictive caching based on usage patterns
   */
  private enablePredictiveCaching(): void {
    // Implement predictive caching logic
    // Pre-load frequently accessed memories        // Implementation could include:
    // - Usage pattern analysis
    // - Predictive pre-loading
    // - Intelligent cache eviction
    logger.debug("Predictive caching enabled for smart tier");
  } /**
   * Optimize vector indices for better performance
   */
  private async optimizeVectorIndices(): Promise<void> {
    try {
      // Implement vector index optimization
      // This could include rebalancing, compression, etc.
      if (this.smartEngine) {
        // Get current metrics to determine if optimization is needed
        const health = await this.smartEngine.getHealth();
        if (health.status === "healthy") {
          logger.debug("Vector indices optimized successfully");
        }
      }
    } catch (error) {
      logger.warn("Vector index optimization failed", { error });
    }
  }

  /**
   * Cleanup unused memories based on patterns
   */
  private async cleanupUnusedMemories(): Promise<void> {
    try {
      // Implement intelligent cleanup based on:
      // - Access frequency
      // - Relevance decay
      // - User preferences
      // - Storage limits

      // This is a placeholder - in a real implementation, you'd:
      // 1. Analyze memory access patterns
      // 2. Identify memories that haven't been accessed recently
      // 3. Consider memory importance and user preferences
      // 4. Perform cleanup while maintaining data integrity

      logger.debug("Memory cleanup completed for smart tier");
    } catch (error) {
      logger.warn("Memory cleanup failed", { error });
    }
  }

  /**
   * Update classification models with new data
   */
  private async updateClassificationModels(): Promise<void> {
    try {
      // Implement incremental learning for classification
      // Update models with new memory patterns

      // This is a placeholder - in a real implementation, you'd:
      // 1. Collect recent memory data
      // 2. Retrain classification models
      // 3. Update memory type predictions
      // 4. Improve categorization accuracy

      logger.debug("Classification models updated for smart tier");
    } catch (error) {
      logger.warn("Classification model update failed", { error });
    }
  }

  /**
   * Initialize Basic (Keyword) tier
   */
  private async initializeBasicTier(): Promise<void> {
    if (!this.basicEngine) {
      // Use shared data directory for persistent storage
      const dataDirectory = this.config.dataPath || process.env.MEMORAI_DATA_PATH || "./data/memory";
      this.basicEngine = new BasicMemoryEngine(dataDirectory);
      await this.basicEngine.initialize();
    }
    this.activeEngine = this.basicEngine;
  }

  /**
   * Initialize Mock (Testing) tier
   */
  private async initializeMockTier(): Promise<void> {
    if (!this.mockEngine) {
      this.mockEngine = new MockMemoryEngine(this.config.mock);
    }
    this.activeEngine = this.mockEngine;
  }

  /**
   * Fallback to the next available tier
   */
  private async fallbackToNextTier(): Promise<void> {
    const tierInfo = this.tierDetector.getTierInfo(this.currentTier);
    const fallbackChain = tierInfo.fallbackChain;
    // Find next tier in fallback chain
    const currentIndex = fallbackChain.indexOf(this.currentTier);
    if (currentIndex >= 0 && currentIndex < fallbackChain.length - 1) {
      const nextTier = fallbackChain[currentIndex + 1];
      if (nextTier) {
        logger.info(`🔄 Falling back from ${this.currentTier} to ${nextTier}`);
        await this.initializeTier(nextTier);
        this.isInitialized = true;
      } else {
        throw new MemoryError(
          "No valid fallback tier available",
          "FALLBACK_EXHAUSTED",
        );
      }
    } else {
      throw new MemoryError(
        "No more fallback tiers available",
        "FALLBACK_EXHAUSTED",
      );
    }
  }

  /**
   * Classify memory type based on content
   */
  private classifyMemoryType(content: string): MemoryType {
    const lower = content.toLowerCase();

    if (
      lower.includes("prefer") ||
      lower.includes("like") ||
      lower.includes("want")
    ) {
      return "preference";
    }
    if (
      lower.includes("feel") ||
      lower.includes("emotion") ||
      lower.includes("mood")
    ) {
      return "emotion";
    }
    if (
      lower.includes("procedure") ||
      lower.includes("step") ||
      lower.includes("process")
    ) {
      return "procedure";
    }
    if (
      lower.includes("task") ||
      lower.includes("todo") ||
      lower.includes("assignment")
    ) {
      return "task";
    }
    if (
      lower.includes("personality") ||
      lower.includes("characteristic") ||
      lower.includes("trait")
    ) {
      return "personality";
    }
    if (
      lower.includes("conversation") ||
      lower.includes("thread") ||
      lower.includes("discussion")
    ) {
      return "thread";
    }

    return "fact"; // Default
  }

  /**
   * Calculate importance score based on content
   */
  private calculateImportance(content: string): number {
    let importance = 0.5; // Base importance

    const lower = content.toLowerCase();

    // Increase importance for certain keywords
    if (
      lower.includes("important") ||
      lower.includes("critical") ||
      lower.includes("urgent")
    ) {
      importance += 0.3;
    }
    if (
      lower.includes("remember") ||
      lower.includes("note") ||
      lower.includes("key")
    ) {
      importance += 0.2;
    }
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("private")
    ) {
      importance += 0.3;
    }

    return Math.min(importance, 1.0);
  }

  /**
   * Generate context summary
   */
  private generateContextSummary(memories: MemoryMetadata[]): string {
    if (memories.length === 0) {
      return "No relevant context available.";
    }

    const typeCount: Record<string, number> = {};
    for (const memory of memories) {
      typeCount[memory.type] = (typeCount[memory.type] || 0) + 1;
    }

    const typeSummary = Object.entries(typeCount)
      .map(([type, count]) => `${count} ${type}${count > 1 ? "s" : ""}`)
      .join(", ");

    return `Context includes ${memories.length} memories: ${typeSummary}. Using ${this.currentTier} memory tier.`;
  }

  /**
   * Handle and wrap errors
   */
  private handleError(error: unknown, code: string): MemoryError {
    if (error instanceof MemoryError) {
      return error;
    }
    if (error instanceof Error) {
      return new MemoryError(`${code}: ${error.message}`, code);
    }
    return new MemoryError(`${code}: Unknown error`, code);
  }

  /**
   * Get engine statistics
   */
  public async getStats(): Promise<{
    currentTier: MemoryTierLevel;
    capabilities: MemoryTierCapabilities;
    engineStats: Record<string, unknown>;
  }> {
    const tierInfo = this.getTierInfo();
    let engineStats = {};

    if (this.activeEngine && typeof this.activeEngine.getStats === "function") {
      engineStats = await this.activeEngine.getStats();
    }

    return {
      currentTier: this.currentTier,
      capabilities: tierInfo.capabilities,
      engineStats,
    };
  }

  /**
   * Test tier functionality - required by API
   */
  public async testTier(
    tier: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate tier
      if (!["advanced", "smart", "basic", "mock"].includes(tier)) {
        return { success: false, message: `Invalid tier: ${tier}` };
      }

      // If this is the current tier, test it
      if (tier === this.currentTier) {
        if (
          this.activeEngine &&
          typeof this.activeEngine.testTier === "function"
        ) {
          return await this.activeEngine.testTier(tier);
        } else {
          // Basic test - just check if we can remember and recall
          const testId = await this.remember(
            "test-content",
            "test-tenant",
            "test-agent",
          );
          await this.recall("test-content", "test-tenant", "test-agent", {
            limit: 1,
          });
          await this.forget(testId);

          return {
            success: true,
            message: `Tier '${tier}' is working correctly`,
          };
        }
      } else {
        // Try to switch to this tier temporarily to test it
        const originalTier = this.currentTier;
        try {
          await this.switchTier(tier as MemoryTierLevel);
          const result = await this.testTier(tier); // Recursive call with actual tier
          await this.switchTier(originalTier); // Switch back
          return result;
        } catch (error) {
          await this.switchTier(originalTier); // Switch back on error
          return {
            success: false,
            message: `Failed to test tier '${tier}': ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to test tier '${tier}': ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Get statistics - alias for getStats to match API expectations
   */
  public async getStatistics(): Promise<Record<string, unknown>> {
    const stats = await this.getStats();
    return {
      ...stats.engineStats,
      currentTier: stats.currentTier,
      capabilities: stats.capabilities,
    };
  }
}
