/**
 * Unified Memory Engine - Revolutionary Multi-Tier Architecture
 * Automatically selects the best available memory tier and provides graceful fallback
 */

import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import type {
    MemoryMetadata,
    MemoryQuery,
    MemoryResult,
    ContextRequest,
    ContextResponse,
    MemoryType,
    MemoryConfig
} from '../types/index.js';
import { MemoryError } from '../types/index.js';
import { MemoryEngine } from './MemoryEngine.js';
import { BasicMemoryEngine } from './BasicMemoryEngine.js';
import { MockMemoryEngine } from './MockMemoryEngine.js';
import { LocalEmbeddingService } from '../embedding/LocalEmbeddingService.js';
import {
    MemoryTierLevel,
    MemoryTierDetector,
    type MemoryTierInfo,
    type MemoryTierCapabilities
} from './MemoryTier.js';

export interface UnifiedMemoryConfig extends Partial<MemoryConfig> {
    preferredTier?: MemoryTierLevel;
    enableFallback?: boolean;
    autoDetect?: boolean;

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
    private localEmbedding?: LocalEmbeddingService;    // Current active engine
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private activeEngine: any; // Multiple engine types with different APIs

    constructor(config: UnifiedMemoryConfig = {}) {
        this.config = {
            enableFallback: true,
            autoDetect: true,
            ...config
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

            logger.info(`🧠 Memory Engine initialized with ${this.getTierInfo().message}`);
        } catch (error: unknown) {
            if (this.config.enableFallback) {
                logger.warn(`Failed to initialize ${this.currentTier} tier, attempting fallback...`);
                await this.fallbackToNextTier();
            } else {
                if (error instanceof Error) {
                    throw new MemoryError(`Failed to initialize memory engine: ${error.message}`, 'INIT_ERROR');
                }
                throw new MemoryError('Unknown initialization error', 'INIT_ERROR');
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
        options: RememberOptions = {}
    ): Promise<string> {
        if (!this.isInitialized) {
            throw new MemoryError('Memory engine not initialized. Call initialize() first.', 'NOT_INITIALIZED');
        }

        if (!content || content.trim().length === 0) {
            throw new MemoryError('Content cannot be empty', 'INVALID_CONTENT');
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
            return memoryId;        } catch (error) {
            if (this.config.enableFallback) {
                logger.warn(`Memory operation failed on ${this.currentTier} tier, attempting fallback...`);
                await this.fallbackToNextTier();
                return this.remember(content, tenantId, agentId, options);
            }
            throw this.handleError(error, 'REMEMBER_ERROR');
        }
    }

    /**
     * Recall memories with automatic tier routing
     */
    public async recall(
        query: string,
        tenantId: string,
        agentId?: string,
        options: RecallOptions = {}
    ): Promise<MemoryResult[]> {
        if (!this.isInitialized) {
            throw new MemoryError('Memory engine not initialized. Call initialize() first.', 'NOT_INITIALIZED');
        }

        if (!query || query.trim().length === 0) {
            throw new MemoryError('Query cannot be empty', 'INVALID_QUERY');
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

            return results;        } catch (error) {
            if (this.config.enableFallback) {
                logger.warn(`Memory operation failed on ${this.currentTier} tier, attempting fallback...`);
                await this.fallbackToNextTier();
                return this.recall(query, tenantId, agentId, options);
            }
            throw this.handleError(error, 'RECALL_ERROR');
        }
    }

    /**
     * Get context for agent with automatic tier routing
     */
    public async getContext(request: ContextRequest): Promise<ContextResponse> {
        if (!this.isInitialized) {
            throw new MemoryError('Memory engine not initialized. Call initialize() first.', 'NOT_INITIALIZED');
        }

        try {
            const memories = await this.activeEngine.getContext(
                request.tenant_id,
                request.agent_id,
                request.max_memories ?? 10
            );

            return {
                context: this.generateContextSummary(memories),
                memories: memories.map((memory: MemoryMetadata) => ({ memory, score: 1.0 })),
                summary: this.generateContextSummary(memories),
                confidence: 0.9,
                generated_at: new Date(),
                total_count: memories.length,
                context_summary: this.generateContextSummary(memories)
            };        } catch (error) {
            if (this.config.enableFallback) {
                logger.warn(`Memory operation failed on ${this.currentTier} tier, attempting fallback...`);
                await this.fallbackToNextTier();
                return this.getContext(request);
            }
            throw this.handleError(error, 'CONTEXT_ERROR');
        }
    }

    /**
     * Forget a memory
     */
    public async forget(memoryId: string): Promise<boolean> {
        if (!this.isInitialized) {
            throw new MemoryError('Memory engine not initialized. Call initialize() first.', 'NOT_INITIALIZED');
        }

        try {
            return await this.activeEngine.forget(memoryId);
        } catch (error) {            if (this.config.enableFallback) {
                logger.warn(`Memory operation failed on ${this.currentTier} tier, attempting fallback...`);
                await this.fallbackToNextTier();
                return this.forget(memoryId);
            }
            throw this.handleError(error, 'FORGET_ERROR');
        }
    }

    /**
     * Get current tier information
     */
    public getTierInfo(): MemoryTierInfo {
        const tierInfo = this.tierDetector.getTierInfo(this.currentTier);
        return {
            ...tierInfo,
            message: `${tierInfo.message} (Active)`
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
            throw new MemoryError(`Failed to switch to ${tier} tier: ${error instanceof Error ? error.message : 'Unknown error'}`, 'TIER_SWITCH_ERROR');
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
    }

    /**
     * Initialize Smart (Local AI) tier
     */
    private async initializeSmartTier(): Promise<void> {
        if (!this.localEmbedding) {
            this.localEmbedding = new LocalEmbeddingService(this.config.localEmbedding);
        }

        // For now, use basic engine with local embeddings
        // TODO: Implement full smart engine with local AI
        if (!this.smartEngine) {
            this.smartEngine = new MemoryEngine({
                ...this.config,
                // Override embedding service to use local
            });
        }

        // Fall back to basic for now
        await this.initializeBasicTier();
    }

    /**
     * Initialize Basic (Keyword) tier
     */
    private async initializeBasicTier(): Promise<void> {
        if (!this.basicEngine) {
            this.basicEngine = new BasicMemoryEngine();
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
                throw new MemoryError('No valid fallback tier available', 'FALLBACK_EXHAUSTED');
            }
        } else {
            throw new MemoryError('No more fallback tiers available', 'FALLBACK_EXHAUSTED');
        }
    }

    /**
     * Classify memory type based on content
     */
    private classifyMemoryType(content: string): MemoryType {
        const lower = content.toLowerCase();

        if (lower.includes('prefer') || lower.includes('like') || lower.includes('want')) {
            return 'preference';
        }
        if (lower.includes('feel') || lower.includes('emotion') || lower.includes('mood')) {
            return 'emotion';
        }
        if (lower.includes('procedure') || lower.includes('step') || lower.includes('process')) {
            return 'procedure';
        }
        if (lower.includes('task') || lower.includes('todo') || lower.includes('assignment')) {
            return 'task';
        }
        if (lower.includes('personality') || lower.includes('characteristic') || lower.includes('trait')) {
            return 'personality';
        }
        if (lower.includes('conversation') || lower.includes('thread') || lower.includes('discussion')) {
            return 'thread';
        }

        return 'fact'; // Default
    }

    /**
     * Calculate importance score based on content
     */
    private calculateImportance(content: string): number {
        let importance = 0.5; // Base importance

        const lower = content.toLowerCase();

        // Increase importance for certain keywords
        if (lower.includes('important') || lower.includes('critical') || lower.includes('urgent')) {
            importance += 0.3;
        }
        if (lower.includes('remember') || lower.includes('note') || lower.includes('key')) {
            importance += 0.2;
        }
        if (lower.includes('password') || lower.includes('secret') || lower.includes('private')) {
            importance += 0.3;
        }

        return Math.min(importance, 1.0);
    }

    /**
     * Generate context summary
     */
    private generateContextSummary(memories: MemoryMetadata[]): string {
        if (memories.length === 0) {
            return 'No relevant context available.';
        }

        const typeCount: Record<string, number> = {};
        for (const memory of memories) {
            typeCount[memory.type] = (typeCount[memory.type] || 0) + 1;
        }

        const typeSummary = Object.entries(typeCount)
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');

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
        currentTier: MemoryTierLevel;        capabilities: MemoryTierCapabilities;
        engineStats: Record<string, unknown>;
    }> {
        const tierInfo = this.getTierInfo();
        let engineStats = {};

        if (this.activeEngine && typeof this.activeEngine.getStats === 'function') {
            engineStats = await this.activeEngine.getStats();
        }

        return {
            currentTier: this.currentTier,
            capabilities: tierInfo.capabilities,
            engineStats
        };
    }
}
