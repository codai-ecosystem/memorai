/**
 * MCP v3.0 - Semantic Search Tool
 * Advanced AI-powered semantic search with vector embeddings and context awareness
 */

// MCP v3.0 types - will be integrated with main types
export interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MemoryFilters {
  type?: string;
  tags?: string[];
  startDate?: number;
  endDate?: number;
}

export interface SemanticSearchOptions {
  limit?: number;
  filters?: MemoryFilters;
  preferredTypes?: string[];
}

export interface VectorEmbedding {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface SemanticMatch {
  memory: Memory;
  similarity: number;
  relevanceScore: number;
  contextMatch: number;
  explanation: string;
}

export interface SemanticSearchResult {
  matches: SemanticMatch[];
  totalFound: number;
  searchTime: number;
  queryExpansions: string[];
  suggestedRefinements: string[];
}

export class SemanticSearch {
  private vectorStore: Map<string, VectorEmbedding> = new Map();
  private contextualMemory: Memory[] = [];
  private searchHistory: string[] = [];

  constructor(
    private embeddingModel: string = 'text-embedding-3-large',
    private contextWindow: number = 10,
    private similarityThreshold: number = 0.7
  ) {}

  /**
   * Perform advanced semantic search with AI-powered understanding
   */
  async search(
    query: string,
    options: SemanticSearchOptions = {}
  ): Promise<SemanticSearchResult> {
    const startTime = Date.now();

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Expand query with synonyms and related terms
    const expandedQueries = await this.expandQuery(query);

    // Search across multiple dimensions
    const semanticMatches = await this.findSemanticMatches(
      queryEmbedding,
      expandedQueries,
      options
    );

    // Apply contextual ranking
    const contextualMatches = await this.applyContextualRanking(
      semanticMatches,
      query,
      options
    );

    // Generate explanations for matches
    const explainedMatches = await this.generateExplanations(
      contextualMatches,
      query
    );

    // Update search history for learning
    this.updateSearchHistory(query, explainedMatches);

    const searchTime = Date.now() - startTime;

    return {
      matches: explainedMatches,
      totalFound: explainedMatches.length,
      searchTime,
      queryExpansions: expandedQueries,
      suggestedRefinements: await this.generateRefinements(
        query,
        explainedMatches
      ),
    };
  }

  /**
   * Generate vector embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Simulate AI embedding generation
    // In production, this would call OpenAI or similar API
    const hash = this.hashString(text);
    const vector = new Array(1536)
      .fill(0)
      .map((_, i) => Math.sin((hash + i) * 0.1) * Math.cos((hash - i) * 0.05));
    return this.normalizeVector(vector);
  }

  /**
   * Expand query with synonyms and related concepts
   */
  private async expandQuery(query: string): Promise<string[]> {
    const expansions = [query];

    // Semantic expansion based on common patterns
    const words = query.toLowerCase().split(/\s+/);
    const synonymMap: Record<string, string[]> = {
      find: ['search', 'locate', 'get', 'retrieve'],
      create: ['make', 'build', 'generate', 'produce'],
      update: ['modify', 'change', 'edit', 'alter'],
      delete: ['remove', 'destroy', 'eliminate', 'clear'],
      project: ['task', 'work', 'assignment', 'initiative'],
      user: ['person', 'individual', 'account', 'profile'],
      data: ['information', 'content', 'details', 'facts'],
    };

    for (const word of words) {
      if (synonymMap[word]) {
        for (const synonym of synonymMap[word]) {
          const expandedQuery = query.replace(
            new RegExp(`\\b${word}\\b`, 'gi'),
            synonym
          );
          if (expandedQuery !== query) {
            expansions.push(expandedQuery);
          }
        }
      }
    }

    // Add conceptual expansions
    if (query.includes('error') || query.includes('bug')) {
      expansions.push('troubleshooting', 'debugging', 'issue resolution');
    }

    if (query.includes('performance') || query.includes('speed')) {
      expansions.push('optimization', 'efficiency', 'benchmark');
    }

    return expansions.slice(0, 5); // Limit expansions
  }

  /**
   * Find semantic matches using vector similarity
   */
  private async findSemanticMatches(
    queryEmbedding: number[],
    expandedQueries: string[],
    options: SemanticSearchOptions
  ): Promise<SemanticMatch[]> {
    const matches: SemanticMatch[] = [];

    // Search through vector store
    for (const [id, embedding] of this.vectorStore) {
      const similarity = this.cosineSimilarity(
        queryEmbedding,
        embedding.vector
      );

      if (similarity >= this.similarityThreshold) {
        const memory = this.findMemoryById(id);
        if (memory && this.passesFilters(memory, options.filters)) {
          matches.push({
            memory,
            similarity,
            relevanceScore: similarity,
            contextMatch: 0, // Will be calculated later
            explanation: '',
          });
        }
      }
    }

    // Sort by similarity score
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches.slice(0, options.limit || 20);
  }

  /**
   * Apply contextual ranking based on user history and patterns
   */
  private async applyContextualRanking(
    matches: SemanticMatch[],
    query: string,
    options: SemanticSearchOptions
  ): Promise<SemanticMatch[]> {
    const currentTime = Date.now();

    for (const match of matches) {
      // Recency boost
      const age = currentTime - match.memory.timestamp;
      const recencyScore = Math.exp(-age / (1000 * 60 * 60 * 24 * 30)); // 30-day decay

      // Context boost based on recent searches
      const contextScore = this.calculateContextualRelevance(
        match.memory,
        query
      );

      // Type preference boost
      const typeScore = options.preferredTypes?.includes(match.memory.type)
        ? 1.2
        : 1.0;

      // Calculate composite relevance score
      match.relevanceScore =
        match.similarity * 0.5 +
        recencyScore * 0.2 +
        contextScore * 0.2 +
        (typeScore - 1.0) * 0.1;

      match.contextMatch = contextScore;
    }

    // Re-sort by relevance score
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return matches;
  }

  /**
   * Generate human-readable explanations for matches
   */
  private async generateExplanations(
    matches: SemanticMatch[],
    query: string
  ): Promise<SemanticMatch[]> {
    for (const match of matches) {
      const reasons: string[] = [];

      if (match.similarity > 0.9) {
        reasons.push('Strong semantic similarity');
      } else if (match.similarity > 0.8) {
        reasons.push('Good semantic match');
      } else {
        reasons.push('Moderate semantic relevance');
      }

      if (match.contextMatch > 0.7) {
        reasons.push('highly relevant to recent activity');
      } else if (match.contextMatch > 0.5) {
        reasons.push('contextually related');
      }

      // Check for exact keyword matches
      const queryWords = query.toLowerCase().split(/\s+/);
      const contentWords = match.memory.content.toLowerCase().split(/\s+/);
      const exactMatches = queryWords.filter(word =>
        contentWords.includes(word)
      );

      if (exactMatches.length > 0) {
        reasons.push(`contains keywords: ${exactMatches.join(', ')}`);
      }

      match.explanation = reasons.join(', ');
    }

    return matches;
  }

  /**
   * Generate search refinement suggestions
   */
  private async generateRefinements(
    query: string,
    matches: SemanticMatch[]
  ): Promise<string[]> {
    const refinements: string[] = [];

    if (matches.length === 0) {
      refinements.push(
        'Try using different keywords',
        'Use more general terms',
        'Check spelling and grammar'
      );
    } else if (matches.length > 50) {
      refinements.push(
        'Add more specific keywords',
        'Filter by memory type',
        'Include date constraints'
      );
    } else {
      // Analyze common patterns in successful matches
      const types = [...new Set(matches.map(m => m.memory.type))];
      if (types.length > 1) {
        refinements.push(`Filter by type: ${types.join(', ')}`);
      }

      const tags = matches.flatMap(m => m.memory.metadata?.tags || []);
      const commonTags = [...new Set(tags)].slice(0, 3);
      if (commonTags.length > 0) {
        refinements.push(`Related tags: ${commonTags.join(', ')}`);
      }
    }

    return refinements;
  }

  /**
   * Add memory to semantic index
   */
  async indexMemory(memory: Memory): Promise<void> {
    const embedding = await this.generateEmbedding(memory.content);

    this.vectorStore.set(memory.id, {
      id: memory.id,
      vector: embedding,
      metadata: memory.metadata || {},
      timestamp: memory.timestamp,
    });

    this.contextualMemory.push(memory);

    // Maintain reasonable size
    if (this.contextualMemory.length > 10000) {
      this.contextualMemory = this.contextualMemory.slice(-5000);
    }
  }

  /**
   * Remove memory from semantic index
   */
  removeFromIndex(memoryId: string): void {
    this.vectorStore.delete(memoryId);
    this.contextualMemory = this.contextualMemory.filter(
      m => m.id !== memoryId
    );
  }

  /**
   * Get search analytics and insights
   */
  getSearchAnalytics(): {
    totalIndexed: number;
    searchHistory: string[];
    averageSearchTime: number;
    popularQueries: Array<{ query: string; count: number }>;
  } {
    const queryFrequency = new Map<string, number>();

    for (const query of this.searchHistory) {
      queryFrequency.set(query, (queryFrequency.get(query) || 0) + 1);
    }

    const popularQueries = Array.from(queryFrequency.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalIndexed: this.vectorStore.size,
      searchHistory: this.searchHistory.slice(-50),
      averageSearchTime: 0, // Would be calculated from actual metrics
      popularQueries,
    };
  }

  // Utility methods
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
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

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private findMemoryById(id: string): Memory | undefined {
    return this.contextualMemory.find(m => m.id === id);
  }

  private passesFilters(memory: Memory, filters?: MemoryFilters): boolean {
    if (!filters) return true;

    if (filters.type && memory.type !== filters.type) return false;
    if (
      filters.tags &&
      !filters.tags.some(tag => memory.metadata?.tags?.includes(tag))
    )
      return false;
    if (filters.startDate && memory.timestamp < filters.startDate) return false;
    if (filters.endDate && memory.timestamp > filters.endDate) return false;

    return true;
  }

  private calculateContextualRelevance(memory: Memory, query: string): number {
    // Simple contextual relevance based on recent search patterns
    const recentQueries = this.searchHistory.slice(-10);
    const queryWords = query.toLowerCase().split(/\s+/);

    let relevanceScore = 0;

    for (const recentQuery of recentQueries) {
      const recentWords = recentQuery.toLowerCase().split(/\s+/);
      const overlap = queryWords.filter(word => recentWords.includes(word));
      relevanceScore +=
        overlap.length / Math.max(queryWords.length, recentWords.length);
    }

    return Math.min(relevanceScore / recentQueries.length, 1.0);
  }

  private updateSearchHistory(query: string, matches: SemanticMatch[]): void {
    this.searchHistory.push(query);

    // Maintain reasonable history size
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-500);
    }
  }
}

export default SemanticSearch;
