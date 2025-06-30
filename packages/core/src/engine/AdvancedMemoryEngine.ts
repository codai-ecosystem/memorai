/**
 * Advanced Memory Engine - Single Unified Memory System
 * No tiers, no complexity - just the most powerful memory engine
 * Combines semantic search, persistent storage, and advanced AI capabilities
 */

import { nanoid } from 'nanoid';
import { EmbeddingService } from '../embedding/EmbeddingService.js';
import { FileStorageAdapter } from '../storage/StorageAdapter.js';
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

/**
 * Advanced Memory Engine Configuration
 */
export interface AdvancedMemoryConfig extends Partial<MemoryConfig> {
  // Data path for persistent storage
  dataPath?: string;
  
  // Azure OpenAI configuration (primary)
  azureOpenAI?: {
    endpoint?: string;
    apiKey?: string;
    deploymentName?: string;
    apiVersion?: string;
  };
  
  // OpenAI fallback configuration
  apiKey?: string;
  model?: string;
  
  // Local embedding fallback
  localEmbedding?: {
    model?: string;
    pythonPath?: string;
    cachePath?: string;
  };
}

/**
 * The most advanced memory engine - no tiers, no complexity
 * Combines the best of all features into a single powerful system
 */
export class AdvancedMemoryEngine {
  private config: AdvancedMemoryConfig;
  private embedding: EmbeddingService;
  private storage: FileStorageAdapter;
  private isInitialized = false;
  
  // In-memory indices for fast retrieval
  private semanticIndex: Map<string, { embedding: number[]; metadata: MemoryMetadata }> = new Map();
  private keywordIndex: Map<string, Set<string>> = new Map();
  private typeIndex: Map<MemoryType, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();

  constructor(config: AdvancedMemoryConfig = {}) {
    this.config = {
      dataPath: this.getDefaultDataPath(),
      ...config,
    };
    
    // Initialize embedding service with config
    this.embedding = new EmbeddingService({
      provider: this.detectEmbeddingProvider(),
      api_key: this.getEmbeddingApiKey(),
      model: config.model || 'text-embedding-3-small',
      ...this.getAzureConfig(),
    });
    
    // Initialize persistent storage
    this.storage = new FileStorageAdapter(this.config.dataPath);
  }

  /**
   * Initialize the memory engine and load existing memories
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load all existing memories from persistent storage
      const existingMemories = await this.storage.list();
      
      logger.info(`🧠 Loading ${existingMemories.length} existing memories...`);
      
      // Rebuild all indices
      for (const memory of existingMemories) {
        await this.indexMemory(memory);
      }
      
      this.isInitialized = true;
      logger.info(`✅ Advanced Memory Engine initialized with ${existingMemories.length} memories`);
      
    } catch (error: unknown) {
      throw new MemoryError(
        `Failed to initialize memory engine: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_ERROR'
      );
    }
  }

  /**
   * Remember new information with semantic indexing and persistence
   */
  public async remember(
    content: string,
    tenantId: string,
    agentId?: string,
    options: RememberOptions = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    const contentStr = String(content || '').trim();
    if (!contentStr) {
      throw new MemoryError('Content cannot be empty', 'INVALID_CONTENT');
    }

    try {
      // Generate semantic embedding
      const embeddingResult = await this.embedding.embed(contentStr);
      
      // Create memory metadata
      const memory: MemoryMetadata = {
        id: nanoid(),
        type: options.type ?? this.classifyMemoryType(contentStr),
        content: contentStr,
        embedding: embeddingResult.embedding,
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        importance: options.importance ?? this.calculateImportance(contentStr),
        emotional_weight: options.emotional_weight,
        tags: options.tags ?? [],
        context: options.context,
        tenant_id: tenantId,
        agent_id: agentId,
        ttl: options.ttl,
      };

      // Store persistently
      await this.storage.store(memory);
      
      // Index in memory for fast access
      await this.indexMemory(memory);
      
      logger.debug(`💾 Stored memory: ${memory.id} (${memory.type})`);
      return memory.id;
      
    } catch (error: unknown) {
      throw this.handleError(error, 'REMEMBER_ERROR');
    }
  }

  /**
   * Recall memories using semantic search + keyword matching
   */
  public async recall(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    const queryStr = String(query || '').trim();
    if (!queryStr) {
      throw new MemoryError('Query cannot be empty', 'INVALID_QUERY');
    }

    try {
      // Generate query embedding for semantic search
      const queryEmbedding = await this.embedding.embed(queryStr);
      
      // Perform hybrid search: semantic + keyword
      const semanticResults = await this.semanticSearch(queryEmbedding.embedding, tenantId, agentId, options);
      const keywordResults = await this.keywordSearch(queryStr, tenantId, agentId, options);
      
      // Merge and rank results
      const mergedResults = this.mergeSearchResults(semanticResults, keywordResults, options);
      
      // Update access statistics
      for (const result of mergedResults) {
        result.memory.lastAccessedAt = new Date();
        result.memory.accessCount++;
        await this.storage.update(result.memory.id, {
          lastAccessedAt: result.memory.lastAccessedAt,
          accessCount: result.memory.accessCount,
        });
      }
      
      // Return results without embedding arrays to keep response concise
      return mergedResults.map(result => ({
        ...result,
        memory: {
          ...result.memory,
          embedding: undefined, // Exclude embedding array to keep response concise
        },
      }));
      
    } catch (error: unknown) {
      throw this.handleError(error, 'RECALL_ERROR');
    }
  }

  /**
   * Get contextual summary for an agent
   */
  public async getContext(request: ContextRequest): Promise<ContextResponse> {
    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    try {
      const recentMemories = await this.storage.list({
        tenantId: request.tenant_id,
        agentId: request.agent_id,
        limit: request.max_memories || 10,
        sortBy: 'accessed',
      });

      const contextSummary = this.generateContextSummary(recentMemories);
      
      return {
        context: contextSummary,
        memories: recentMemories.map(memory => ({
          memory: {
            ...memory,
            embedding: undefined, // Exclude embedding array to keep response concise
          },
          score: memory.importance,
          relevance_reason: 'Recent context',
        })),
        summary: contextSummary,
        confidence: 0.95,
        generated_at: new Date(),
        total_count: recentMemories.length,
        context_summary: contextSummary,
      };
      
    } catch (error: unknown) {
      throw this.handleError(error, 'CONTEXT_ERROR');
    }
  }

  /**
   * Forget a memory by ID
   */
  public async forget(memoryId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new MemoryError(
        'Memory engine not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }

    try {
      // Get memory before deleting to clean up indices
      const memory = await this.storage.retrieve(memoryId);
      if (!memory) return false;
      
      // Remove from persistent storage
      await this.storage.delete(memoryId);
      
      // Remove from indices
      this.removeFromIndices(memory);
      
      logger.debug(`🗑️  Deleted memory: ${memoryId}`);
      return true;
      
    } catch (error: unknown) {
      logger.error('Forget error:', error);
      return false;
    }
  }

  /**
   * Get comprehensive statistics
   */
  public async getStats(): Promise<{
    totalMemories: number;
    memoryTypes: Record<MemoryType, number>;
    indexStats: {
      semantic: number;
      keywords: number;
      types: number;
      tags: number;
    };
    performance: {
      avgImportance: number;
      recentActivity: number;
    };
  }> {
    const memories = await this.storage.list();
    
    const memoryTypes: Record<MemoryType, number> = {
      fact: 0,
      procedure: 0,
      preference: 0,
      personality: 0,
      emotion: 0,
      task: 0,
      thread: 0,
    };

    let totalImportance = 0;
    let recentActivity = 0;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const memory of memories) {
      memoryTypes[memory.type]++;
      totalImportance += memory.importance;
      if (memory.lastAccessedAt > oneDayAgo) {
        recentActivity++;
      }
    }

    return {
      totalMemories: memories.length,
      memoryTypes,
      indexStats: {
        semantic: this.semanticIndex.size,
        keywords: this.keywordIndex.size,
        types: this.typeIndex.size,
        tags: this.tagIndex.size,
      },
      performance: {
        avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
        recentActivity,
      },
    };
  }

  // Private methods

  private async indexMemory(memory: MemoryMetadata): Promise<void> {
    // Semantic index
    if (memory.embedding) {
      this.semanticIndex.set(memory.id, {
        embedding: memory.embedding,
        metadata: { ...memory, embedding: undefined }, // Exclude embedding from metadata to keep responses concise
      });
    }
    
    // Keyword index
    const keywords = this.extractKeywords(memory.content);
    for (const keyword of keywords) {
      if (!this.keywordIndex.has(keyword)) {
        this.keywordIndex.set(keyword, new Set());
      }
      this.keywordIndex.get(keyword)!.add(memory.id);
    }
    
    // Type index
    if (!this.typeIndex.has(memory.type)) {
      this.typeIndex.set(memory.type, new Set());
    }
    this.typeIndex.get(memory.type)!.add(memory.id);
    
    // Tag index
    for (const tag of memory.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, new Set());
      }
      this.tagIndex.get(normalizedTag)!.add(memory.id);
    }
  }

  private removeFromIndices(memory: MemoryMetadata): void {
    // Remove from semantic index
    this.semanticIndex.delete(memory.id);
    
    // Remove from keyword index
    const keywords = this.extractKeywords(memory.content);
    for (const keyword of keywords) {
      this.keywordIndex.get(keyword)?.delete(memory.id);
      if (this.keywordIndex.get(keyword)?.size === 0) {
        this.keywordIndex.delete(keyword);
      }
    }
    
    // Remove from type index
    this.typeIndex.get(memory.type)?.delete(memory.id);
    if (this.typeIndex.get(memory.type)?.size === 0) {
      this.typeIndex.delete(memory.type);
    }
    
    // Remove from tag index
    for (const tag of memory.tags) {
      const normalizedTag = tag.toLowerCase();
      this.tagIndex.get(normalizedTag)?.delete(memory.id);
      if (this.tagIndex.get(normalizedTag)?.size === 0) {
        this.tagIndex.delete(normalizedTag);
      }
    }
  }

  private async semanticSearch(
    queryEmbedding: number[],
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    const results: MemoryResult[] = [];
    
    for (const [id, indexEntry] of this.semanticIndex.entries()) {
      const memory = indexEntry.metadata;
      
      // Apply filters
      if (memory.tenant_id !== tenantId) continue;
      if (agentId && memory.agent_id !== agentId) continue;
      if (options.type && memory.type !== options.type) continue;
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, indexEntry.embedding);
      
      if (similarity >= (options.threshold || 0.1)) {
        results.push({
          memory,
          score: similarity,
          relevance_reason: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  private async keywordSearch(
    query: string,
    tenantId: string,
    agentId?: string,
    options: RecallOptions = {}
  ): Promise<MemoryResult[]> {
    const keywords = this.extractKeywords(query);
    const candidateIds = new Set<string>();
    
    // Find memories containing search terms
    for (const keyword of keywords) {
      const matchingIds = this.keywordIndex.get(keyword.toLowerCase());
      if (matchingIds) {
        matchingIds.forEach(id => candidateIds.add(id));
      }
    }
    
    const results: MemoryResult[] = [];
    
    for (const id of candidateIds) {
      const memory = await this.storage.retrieve(id);
      if (!memory) continue;
      
      // Apply filters
      if (memory.tenant_id !== tenantId) continue;
      if (agentId && memory.agent_id !== agentId) continue;
      if (options.type && memory.type !== options.type) continue;
      
      const score = this.calculateKeywordScore(memory, keywords);
      if (score >= (options.threshold || 0.1)) {
        results.push({
          memory,
          score,
          relevance_reason: this.getKeywordRelevanceReason(memory, keywords),
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }

  private mergeSearchResults(
    semanticResults: MemoryResult[],
    keywordResults: MemoryResult[],
    options: RecallOptions
  ): MemoryResult[] {
    const mergedMap = new Map<string, MemoryResult>();
    
    // Add semantic results (weighted higher)
    for (const result of semanticResults) {
      mergedMap.set(result.memory.id, {
        ...result,
        score: result.score * 0.7, // Semantic weight
      });
    }
    
    // Add or boost keyword results
    for (const result of keywordResults) {
      const existing = mergedMap.get(result.memory.id);
      if (existing) {
        // Boost existing result
        existing.score = Math.max(existing.score, existing.score + result.score * 0.3);
        existing.relevance_reason = `${existing.relevance_reason} + ${result.relevance_reason}`;
      } else {
        mergedMap.set(result.memory.id, {
          ...result,
          score: result.score * 0.3, // Keyword weight
        });
      }
    }
    
    // Convert to array, sort, and limit
    const results = Array.from(mergedMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);
    
    return results;
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
      'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    ]);
    return stopWords.has(word);
  }

  private calculateKeywordScore(memory: MemoryMetadata, searchTerms: string[]): number {
    const contentWords = this.extractKeywords(memory.content);
    let score = 0;
    
    for (const term of searchTerms) {
      if (contentWords.includes(term)) score += 0.5;
      if (memory.content.toLowerCase().includes(term)) score += 0.3;
      if (memory.tags.some(tag => tag.toLowerCase().includes(term))) score += 0.2;
    }
    
    return searchTerms.length > 0 ? score / searchTerms.length : 0;
  }

  private getKeywordRelevanceReason(memory: MemoryMetadata, searchTerms: string[]): string {
    const reasons: string[] = [];
    for (const term of searchTerms) {
      if (memory.content.toLowerCase().includes(term)) {
        reasons.push(`matches "${term}"`);
      }
    }
    return reasons.length > 0 ? reasons.join(', ') : 'keyword match';
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

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
    
    return 'fact';
  }

  private calculateImportance(content: string): number {
    let importance = 0.5;
    const lower = content.toLowerCase();
    
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

    return `${memories.length} memories found: ${typeSummary}`;
  }

  private getDefaultDataPath(): string {
    if (process.env.MEMORAI_DATA_PATH) {
      return process.env.MEMORAI_DATA_PATH;
    }
    
    const platform = process.platform;
    const userHome = process.env.HOME || process.env.USERPROFILE || '';
    
    // Use simple path joining instead of importing path module
    const sep = platform === 'win32' ? '\\' : '/';
    
    switch (platform) {
      case 'win32':
        return `${userHome}${sep}AppData${sep}Local${sep}Memorai${sep}data${sep}memory`;
      case 'darwin':
        return `${userHome}${sep}Library${sep}Application Support${sep}Memorai${sep}data${sep}memory`;
      default:
        return `${userHome}${sep}.local${sep}share${sep}Memorai${sep}data${sep}memory`;
    }
  }

  private detectEmbeddingProvider(): 'openai' | 'azure' | 'local' {
    if (this.config.azureOpenAI?.endpoint && this.config.azureOpenAI?.apiKey) {
      return 'azure';
    }
    if (this.config.apiKey || process.env.OPENAI_API_KEY) {
      return 'openai';
    }
    return 'local';
  }

  private getEmbeddingApiKey(): string | undefined {
    return this.config.apiKey || 
           this.config.azureOpenAI?.apiKey || 
           process.env.OPENAI_API_KEY || 
           process.env.AZURE_OPENAI_API_KEY;
  }

  private getAzureConfig(): any {
    if (this.config.azureOpenAI) {
      return {
        azure_endpoint: this.config.azureOpenAI.endpoint,
        azure_deployment: this.config.azureOpenAI.deploymentName,
        azure_api_version: this.config.azureOpenAI.apiVersion,
      };
    }
    return {};
  }

  private handleError(error: unknown, code: string): MemoryError {
    if (error instanceof MemoryError) {
      return error;
    }
    if (error instanceof Error) {
      return new MemoryError(`${code}: ${error.message}`, code);
    }
    return new MemoryError(`${code}: Unknown error`, code);
  }
}
