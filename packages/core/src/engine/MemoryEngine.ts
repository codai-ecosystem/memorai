import { nanoid } from 'nanoid';

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
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { MemoryVectorStore, QdrantVectorStore } from '../vector/VectorStore.js';
import { MemoryConfigManager } from '../config/MemoryConfig.js';

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

export class MemoryEngine {
  private config: MemoryConfigManager;
  private embedding: EmbeddingService;
  private vectorStore: MemoryVectorStore;
  private isInitialized = false;

  constructor(config?: Partial<MemoryConfig>) {
    this.config = new MemoryConfigManager(config);
    this.embedding = new EmbeddingService(this.config.getEmbedding());
    
    const vectorConfig = this.config.getVectorDB();
    const qdrantStore = new QdrantVectorStore(
      vectorConfig.url,
      vectorConfig.collection,
      vectorConfig.dimension,
      vectorConfig.api_key
    );
    this.vectorStore = new MemoryVectorStore(qdrantStore);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.vectorStore.initialize();
      this.isInitialized = true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(`Failed to initialize memory engine: ${error.message}`, 'INIT_ERROR');
      }
      throw new MemoryError('Unknown initialization error', 'INIT_ERROR');
    }
  }

  /**
   * Natural language interface for agents: remember new information
   */
  public async remember(
    content: string,
    tenantId: string,
    agentId?: string,
    options: RememberOptions = {}
  ): Promise<string> {
    await this.ensureInitialized();

    if (!content || content.trim().length === 0) {
      throw new MemoryError('Content cannot be empty', 'INVALID_CONTENT');
    }

    try {
      // Generate embedding
      const embeddingResult = await this.embedding.embed(content);
      
      // Create memory metadata
      const memory: MemoryMetadata = {
        id: nanoid(),
        type: options.type ?? this.classifyMemoryType(content),
        content: content.trim(),
        embedding: embeddingResult.embedding,
        confidence: 1.0, // New memories start with full confidence
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

      // Store in vector database
      await this.vectorStore.storeMemory(memory, embeddingResult.embedding);

      return memory.id;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(`Failed to remember: ${error.message}`, 'REMEMBER_ERROR');
      }
      throw new MemoryError('Unknown remember error', 'REMEMBER_ERROR');
    }
  }

  /**
   * Natural language interface for agents: recall relevant memories
   */
  public async recall(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    await this.ensureInitialized();

    if (!query || query.trim().length === 0) {
      throw new MemoryError('Query cannot be empty', 'INVALID_QUERY');
    }

    try {
      // Generate query embedding
      const embeddingResult = await this.embedding.embed(query);
      
      // Build memory query
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

      // Search memories
      const results = await this.vectorStore.searchMemories(embeddingResult.embedding, memoryQuery);

      // Apply time decay if enabled
      if (options.time_decay) {
        return this.applyTimeDecay(results);
      }

      return results;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(`Failed to recall: ${error.message}`, 'RECALL_ERROR');
      }
      throw new MemoryError('Unknown recall error', 'RECALL_ERROR');
    }
  }

  /**
   * Natural language interface for agents: forget specific memories
   */
  public async forget(
    query: string,
    tenantId: string,
    agentId?: string,
    confirmThreshold = 0.9
  ): Promise<number> {
    await this.ensureInitialized();

    try {
      // Find memories to forget
      const memories = await this.recall(query, tenantId, agentId, {
        threshold: confirmThreshold,
        limit: 100,
      });

      if (memories.length === 0) {
        return 0;
      }

      // Delete memories
      const ids = memories.map(m => m.memory.id);
      await this.vectorStore.deleteMemories(ids);

      return ids.length;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(`Failed to forget: ${error.message}`, 'FORGET_ERROR');
      }
      throw new MemoryError('Unknown forget error', 'FORGET_ERROR');
    }
  }

  /**
   * Natural language interface for agents: get contextual information
   */
  public async context(
    request: ContextRequest
  ): Promise<ContextResponse> {
    await this.ensureInitialized();

    try {
      let memories: MemoryResult[] = [];

      if (request.topic) {
        memories = await this.recall(request.topic, request.tenant_id, request.agent_id, {
          limit: request.max_memories,
          threshold: 0.6,
        });
      } else {
        // Get recent memories if no topic specified
        const recentQuery: MemoryQuery = {
          query: 'recent context',
          tenant_id: request.tenant_id,
          agent_id: request.agent_id,
          limit: request.max_memories,
          threshold: 0.5,
          include_context: true,
          time_decay: true,
        };

        // This would need a different approach for recent memories
        // For now, we'll return empty results
      }

      // Filter by memory types if specified
      if (request.memory_types && request.memory_types.length > 0) {
        memories = memories.filter(m => 
          request.memory_types!.includes(m.memory.type)
        );
      }

      // Generate context summary
      const summary = this.generateContextSummary(memories);
      const contextText = this.generateContextText(memories);

      return {
        context: contextText,
        memories,
        summary,
        confidence: this.calculateContextConfidence(memories),
        generated_at: new Date(),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new MemoryError(`Failed to generate context: ${error.message}`, 'CONTEXT_ERROR');
      }
      throw new MemoryError('Unknown context error', 'CONTEXT_ERROR');
    }
  }

  /**
   * Health check for the memory system
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    components: Record<string, boolean>;
    memory_count?: number;
  }> {
    const components = {
      vector_store: false,
      embedding: false,
    };

    try {
      // Check vector store
      components.vector_store = await this.vectorStore.healthCheck();

      // Check embedding service
      try {
        await this.embedding.embed('health check');
        components.embedding = true;
      } catch {
        components.embedding = false;
      }

      const allHealthy = Object.values(components).every(Boolean);
        const result = {
        status: allHealthy ? 'healthy' as const : 'unhealthy' as const,
        components,
      };

      if (components.vector_store) {
        const memoryCount = await this.vectorStore.getMemoryCount('health-check');
        return { ...result, memory_count: memoryCount };
      }

      return result;
    } catch {
      return {
        status: 'unhealthy',
        components,
      };
    }
  }

  /**
   * Get system health status
   */
  public async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    timestamp: Date;
  }> {
    try {
      const checks: Record<string, boolean> = {};
      
      // Check embedding service
      try {
        await this.embedding.embed('health check');
        checks.embedding = true;
      } catch {
        checks.embedding = false;
      }
      
      // Check vector store
      try {
        // Basic vector store test - this might need adjustment based on VectorStore interface
        checks.vectorStore = this.isInitialized;
      } catch {
        checks.vectorStore = false;
      }
      
      const allHealthy = Object.values(checks).every(check => check);
      const anyHealthy = Object.values(checks).some(check => check);
      
      return {
        status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
        checks,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        checks: { error: false },
        timestamp: new Date()
      };
    }
  }

  /**
   * Close connections and clean up resources
   */
  public async close(): Promise<void> {
    // Close vector store connections if needed
    // This might need implementation based on the actual VectorStore interface
    this.isInitialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private classifyMemoryType(content: string): MemoryType {
    const lowerContent = content.toLowerCase();
    
    // Simple classification based on keywords
    if (lowerContent.includes('prefer') || lowerContent.includes('like') || lowerContent.includes('dislike')) {
      return 'preference';
    }
    
    if (lowerContent.includes('how to') || lowerContent.includes('step') || lowerContent.includes('process')) {
      return 'procedure';
    }
    
    if (lowerContent.includes('is') || lowerContent.includes('are') || lowerContent.includes('fact')) {
      return 'fact';
    }
    
    if (lowerContent.includes('personality') || lowerContent.includes('behavior') || lowerContent.includes('style')) {
      return 'personality';
    }
    
    return 'thread'; // Default to thread for conversational content
  }

  private calculateImportance(content: string): number {
    // Simple importance calculation
    let importance = 0.5; // Base importance
    
    const lowerContent = content.toLowerCase();
    
    // Keywords that increase importance
    const importantKeywords = ['critical', 'important', 'remember', 'always', 'never', 'error', 'bug'];
    for (const keyword of importantKeywords) {
      if (lowerContent.includes(keyword)) {
        importance += 0.1;
      }
    }
    
    // Length affects importance (longer content might be more detailed)
    if (content.length > 200) {
      importance += 0.1;
    }
    
    return Math.min(importance, 1.0);
  }

  private applyTimeDecay(results: MemoryResult[]): MemoryResult[] {
    const now = new Date();
    
    return results.map(result => {
      const ageInDays = (now.getTime() - result.memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      // Apply exponential decay (memories lose relevance over time)
      const decayFactor = Math.exp(-ageInDays / 30); // 30-day half-life
      const adjustedScore = result.score * decayFactor;
      
      return {
        ...result,
        score: Math.max(adjustedScore, 0.1), // Minimum score to avoid complete elimination
      };
    }).sort((a, b) => b.score - a.score);
  }

  private generateContextSummary(memories: MemoryResult[]): string {
    if (memories.length === 0) {
      return 'No relevant memories found.';
    }

    const typeCount = memories.reduce((acc, m) => {
      acc[m.memory.type] = (acc[m.memory.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeSummary = Object.entries(typeCount)
      .map(([type, count]) => `${count as number} ${type}${(count as number) > 1 ? 's' : ''}`)
      .join(', ');

    return `Found ${memories.length} relevant memories: ${typeSummary}`;
  }

  private generateContextText(memories: MemoryResult[]): string {
    if (memories.length === 0) {
      return '';
    }

    return memories
      .slice(0, 10) // Limit to top 10 memories
      .map(m => `[${m.memory.type}] ${m.memory.content}`)
      .join('\n\n');
  }

  private calculateContextConfidence(memories: MemoryResult[]): number {
    if (memories.length === 0) {
      return 0;
    }

    const avgScore = memories.reduce((sum, m) => sum + m.score, 0) / memories.length;
    const avgConfidence = memories.reduce((sum, m) => sum + m.memory.confidence, 0) / memories.length;
    
    return (avgScore + avgConfidence) / 2;
  }
}
