/**
 * Advanced Semantic Search Engine for Memorai
 * Provides fuzzy matching, semantic similarity, and intelligent query understanding
 */

import type { MemoryMetadata, MemoryResult } from '../types/index.js';
import { EmbeddingService } from '../embedding/EmbeddingService.js';

export interface SemanticSearchOptions {
  enableFuzzyMatching?: boolean;
  fuzzyThreshold?: number;
  enableSemanticExpansion?: boolean;
  enableTypoTolerance?: boolean;
  weightFactors?: {
    semantic: number;
    fuzzy: number;
    recency: number;
    frequency: number;
    importance: number;
  };
  contextWindow?: number;
  diversityFactor?: number;
  limit?: number;
}

export interface SearchContext {
  recentQueries: string[];
  userPreferences: Record<string, unknown>;
  sessionContext: string[];
  timeContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    season: string;
  };
}

export interface EnhancedMemoryResult extends MemoryResult {
  searchScore: number;
  fuzzyScore: number;
  semanticScore: number;
  recencyScore: number;
  frequencyScore: number;
  contextRelevance: number;
  explanation: string;
  relatedConcepts: string[];
}

/**
 * Advanced semantic search with fuzzy matching and intelligent ranking
 */
export class SemanticSearchEngine {
  private embeddingService: EmbeddingService;
  private queryCache: Map<string, number[]> = new Map();
  private conceptCache: Map<string, string[]> = new Map();

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
  }

  /**
   * Perform advanced semantic search with multiple ranking factors
   */
  async search(
    query: string,
    memories: MemoryMetadata[],
    options: SemanticSearchOptions = {},
    context?: SearchContext
  ): Promise<EnhancedMemoryResult[]> {    const {
      enableFuzzyMatching = true,
      fuzzyThreshold = 0.7,
      enableSemanticExpansion = true,
      enableTypoTolerance = true,
      weightFactors = {
        semantic: 0.4,
        fuzzy: 0.2,
        recency: 0.15,
        frequency: 0.1,
        importance: 0.15
      },
      contextWindow = 5,
      diversityFactor = 0.1,
      limit
    } = options;

    // Step 1: Preprocess query
    const processedQuery = await this.preprocessQuery(query, enableTypoTolerance, context);
    
    // Step 2: Generate query embedding
    const queryEmbedding = await this.getQueryEmbedding(processedQuery);
    
    // Step 3: Expand query with related concepts if enabled
    const expandedQueries = enableSemanticExpansion 
      ? await this.expandQuery(processedQuery, context)
      : [processedQuery];

    // Step 4: Score all memories
    const scoredResults: EnhancedMemoryResult[] = [];
    
    for (const memory of memories) {
      const result = await this.scoreMemory(
        memory,
        processedQuery,
        expandedQueries,
        queryEmbedding,
        weightFactors,
        {
          enableFuzzyMatching,
          fuzzyThreshold,
          contextWindow
        },
        context
      );
      
      if (result.searchScore > 0.1) { // Minimum threshold
        scoredResults.push(result);
      }
    }    // Step 5: Apply diversity factor and rank results
    const rankedResults = await this.applyDiversityRanking(scoredResults, diversityFactor);
    
    // Step 6: Sort by final score and apply limit
    const sortedResults = rankedResults.sort((a: EnhancedMemoryResult, b: EnhancedMemoryResult) => b.searchScore - a.searchScore);
    
    // Apply limit if specified
    return limit ? sortedResults.slice(0, limit) : sortedResults;
  }

  /**
   * Preprocess query to handle typos and normalize text
   */
  private async preprocessQuery(
    query: string,
    enableTypoTolerance: boolean,
    context?: SearchContext
  ): Promise<string> {
    let processed = query.toLowerCase().trim();
    
    // Basic normalization
    processed = processed.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    
    // Typo correction (simplified implementation)
    if (enableTypoTolerance) {
      processed = await this.correctTypos(processed, context);
    }
    
    return processed;
  }

  /**
   * Get or generate embedding for query with caching
   */  private async getQueryEmbedding(query: string): Promise<number[]> {
    const cacheKey = query;
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey)!;
    }
    
    const embeddingResult = await this.embeddingService.embed(query);
    const embedding = embeddingResult.embedding;
    this.queryCache.set(cacheKey, embedding);
      // Clean cache if it gets too large
    if (this.queryCache.size > 1000) {
      const firstKey = this.queryCache.keys().next().value;
      if (firstKey) {
        this.queryCache.delete(firstKey);
      }
    }
    
    return embedding;
  }

  /**
   * Expand query with semantically related concepts
   */
  private async expandQuery(query: string, context?: SearchContext): Promise<string[]> {
    const expansions = [query];
    
    // Get related concepts from cache or generate
    const cacheKey = query;
    let relatedConcepts: string[];
    
    if (this.conceptCache.has(cacheKey)) {
      relatedConcepts = this.conceptCache.get(cacheKey)!;
    } else {
      relatedConcepts = await this.generateRelatedConcepts(query, context);
      this.conceptCache.set(cacheKey, relatedConcepts);
    }
    
    expansions.push(...relatedConcepts);
    return expansions;
  }

  /**
   * Score a single memory against the query
   */
  private async scoreMemory(
    memory: MemoryMetadata,
    query: string,
    expandedQueries: string[],
    queryEmbedding: number[],
    weightFactors: Required<SemanticSearchOptions>['weightFactors'],
    searchOptions: {
      enableFuzzyMatching: boolean;
      fuzzyThreshold: number;
      contextWindow: number;
    },
    context?: SearchContext
  ): Promise<EnhancedMemoryResult> {
    // Calculate individual scores
    const semanticScore = await this.calculateSemanticScore(memory, queryEmbedding);
    const fuzzyScore = searchOptions.enableFuzzyMatching 
      ? this.calculateFuzzyScore(memory.content, expandedQueries, searchOptions.fuzzyThreshold)
      : 0;
    const recencyScore = this.calculateRecencyScore(memory);
    const frequencyScore = this.calculateFrequencyScore(memory);
    const importanceScore = memory.importance;    const contextRelevance = context 
      ? this.calculateContextRelevance(memory, context, searchOptions.contextWindow)
      : 0;

    // Calculate weighted final score
    const searchScore = (
      semanticScore * weightFactors.semantic +
      fuzzyScore * weightFactors.fuzzy +
      recencyScore * weightFactors.recency +
      frequencyScore * weightFactors.frequency +
      importanceScore * weightFactors.importance
    ) * (1 + contextRelevance * 0.2); // Boost based on context relevance

    // Generate explanation
    const explanation = this.generateExplanation(
      semanticScore,
      fuzzyScore,
      recencyScore,
      frequencyScore,
      importanceScore,
      contextRelevance
    );

    // Extract related concepts
    const relatedConcepts = await this.extractRelatedConcepts(memory.content);    return {
      memory,
      score: semanticScore, // Keep original for compatibility
      searchScore,
      fuzzyScore: searchOptions.enableFuzzyMatching ? fuzzyScore : 0,
      semanticScore,
      recencyScore,
      frequencyScore,
      contextRelevance,
      explanation,
      relatedConcepts,
      relevance_reason: explanation
    };
  }
  /**
   * Calculate semantic similarity score using embeddings
   */
  private async calculateSemanticScore(
    memory: MemoryMetadata,
    queryEmbedding: number[]
  ): Promise<number> {
    if (!memory.embedding) {
      // Generate embedding if not available
      const embeddingResult = await this.embeddingService.embed(memory.content);
      memory.embedding = embeddingResult.embedding;
    }
    
    return this.cosineSimilarity(queryEmbedding, memory.embedding);
  }

  /**
   * Calculate fuzzy matching score
   */
  private calculateFuzzyScore(
    content: string,
    queries: string[],
    threshold: number
  ): number {
    let maxScore = 0;
    
    for (const query of queries) {
      const score = this.fuzzyMatch(content.toLowerCase(), query, threshold);
      maxScore = Math.max(maxScore, score);
    }
    
    return maxScore;
  }

  /**
   * Calculate recency score (more recent = higher score)
   */
  private calculateRecencyScore(memory: MemoryMetadata): number {
    const now = Date.now();
    const memoryTime = Math.max(
      memory.updatedAt.getTime(),
      memory.lastAccessedAt.getTime(),
      memory.createdAt.getTime()
    );
    
    const daysSince = (now - memoryTime) / (1000 * 60 * 60 * 24);
    
    // Exponential decay: score = e^(-days/30)
    return Math.exp(-daysSince / 30);
  }

  /**
   * Calculate frequency score based on access count
   */
  private calculateFrequencyScore(memory: MemoryMetadata): number {
    // Normalize access count (log scale to prevent outliers from dominating)
    const normalizedCount = Math.log(memory.accessCount + 1);
    
    // Scale to 0-1 range (assuming max reasonable access count is ~1000)
    return Math.min(normalizedCount / Math.log(1001), 1.0);
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(
    memory: MemoryMetadata,
    context: SearchContext,
    contextWindow: number
  ): number {
    let relevanceScore = 0;
    let factors = 0;

    // Check against recent queries
    if (context.recentQueries.length > 0) {
      const recentRelevance = context.recentQueries
        .slice(0, contextWindow)
        .reduce((sum, recentQuery) => {
          return sum + this.fuzzyMatch(memory.content.toLowerCase(), recentQuery.toLowerCase(), 0.6);
        }, 0) / Math.min(context.recentQueries.length, contextWindow);
      
      relevanceScore += recentRelevance;
      factors++;
    }

    // Check user preferences
    if (Object.keys(context.userPreferences).length > 0) {
      const preferenceMatch = this.checkPreferenceMatch(memory, context.userPreferences);
      relevanceScore += preferenceMatch;
      factors++;
    }

    // Time context relevance
    const timeRelevance = this.calculateTimeRelevance(memory, context.timeContext);
    relevanceScore += timeRelevance;
    factors++;

    return factors > 0 ? relevanceScore / factors : 0.5;
  }
  /**
   * Apply diversity ranking to avoid too similar results
   */
  private async applyDiversityRanking(
    results: EnhancedMemoryResult[],
    diversityFactor: number
  ): Promise<EnhancedMemoryResult[]> {
    if (diversityFactor === 0 || results.length <= 1) {
      return results;
    }

    const diversifiedResults: EnhancedMemoryResult[] = [];
    const remaining = [...results];

    while (remaining.length > 0 && diversifiedResults.length < results.length) {
      let bestIndex = 0;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if (!candidate) continue;
        
        // Calculate diversity penalty
        let diversityPenalty = 0;
        for (const selected of diversifiedResults) {
          const similarity = await this.calculateContentSimilarity(
            candidate.memory.content,
            selected.memory.content
          );
          diversityPenalty += similarity * diversityFactor;
        }

        // Adjusted score = original score - diversity penalty
        const adjustedScore = candidate.searchScore - diversityPenalty;
        
        if (adjustedScore > bestScore) {
          bestScore = adjustedScore;
          bestIndex = i;
        }
      }

      const bestCandidate = remaining[bestIndex];
      if (bestCandidate) {
        diversifiedResults.push(bestCandidate);
        remaining.splice(bestIndex, 1);
      } else {
        break;
      }
    }

    return diversifiedResults;
  }

  // Helper methods
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      const aVal = a[i] ?? 0;
      const bVal = b[i] ?? 0;
      dotProduct += aVal * bVal;
      normA += aVal * aVal;
      normB += bVal * bVal;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }  private fuzzyMatch(text: string, pattern: string, threshold: number): number {
    // Check for exact substring match first
    if (text.includes(pattern) || pattern.includes(text)) {
      return 1.0;
    }
    
    // Check word-level fuzzy matching
    const words = text.split(/\s+/);
    let maxScore = 0;
    
    for (const word of words) {
      if (word.includes(pattern) || pattern.includes(word)) {
        // Word-level match is good but not perfect unless it's exact
        maxScore = Math.max(maxScore, word.toLowerCase() === pattern.toLowerCase() ? 1.0 : 0.95);
      } else {
        const distance = this.jaroWinklerDistance(word, pattern);
        if (distance >= threshold) {
          maxScore = Math.max(maxScore, distance);
        }
      }
    }
    
    // Also check full text matching as fallback
    const fullTextDistance = this.jaroWinklerDistance(text, pattern);
    if (fullTextDistance >= threshold) {
      maxScore = Math.max(maxScore, fullTextDistance);
    }
    
    return maxScore;
  }

  private jaroWinklerDistance(s1: string, s2: string): number {
    // Simplified implementation of Jaro-Winkler distance
    if (s1 === s2) return 1;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0 || len2 === 0) return 0;
    
    const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0;
    
    // Find transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
    
    // Calculate Jaro-Winkler distance
    let prefix = 0;
    for (let i = 0; i < Math.min(len1, len2, 4); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    
    return jaro + (0.1 * prefix * (1 - jaro));
  }

  private async correctTypos(text: string, _context?: SearchContext): Promise<string> {
    // Simplified typo correction - in production, use a proper spell checker
    const corrections: Record<string, string> = {
      'remmber': 'remember',
      'remembr': 'remember',
      'recal': 'recall',
      'retreive': 'retrieve',
      'serach': 'search',
      'searh': 'search'
    };
    
    let corrected = text;
    for (const [typo, correction] of Object.entries(corrections)) {
      corrected = corrected.replace(new RegExp(typo, 'gi'), correction);
    }
    
    return corrected;
  }

  private async generateRelatedConcepts(query: string, _context?: SearchContext): Promise<string[]> {
    // Simplified concept expansion - in production, use a knowledge base or LLM
    const conceptMap: Record<string, string[]> = {
      'code': ['programming', 'development', 'software', 'function', 'method'],
      'bug': ['error', 'issue', 'problem', 'defect', 'glitch'],
      'test': ['testing', 'verification', 'validation', 'check', 'assertion'],
      'user': ['customer', 'client', 'person', 'account', 'profile'],
      'data': ['information', 'content', 'record', 'database', 'storage']
    };
    
    const concepts: string[] = [];
    const queryWords = query.toLowerCase().split(' ');
    
    for (const word of queryWords) {
      if (conceptMap[word]) {
        concepts.push(...conceptMap[word]);
      }
    }
    
    return [...new Set(concepts)]; // Remove duplicates
  }

  private generateExplanation(
    semanticScore: number,
    fuzzyScore: number,
    recencyScore: number,
    frequencyScore: number,
    importanceScore: number,
    contextRelevance: number
  ): string {
    const factors: string[] = [];
    
    if (semanticScore > 0.8) factors.push('high semantic similarity');
    else if (semanticScore > 0.6) factors.push('moderate semantic similarity');
    
    if (fuzzyScore > 0.8) factors.push('exact text match');
    else if (fuzzyScore > 0.6) factors.push('partial text match');
    
    if (recencyScore > 0.8) factors.push('recently accessed');
    if (frequencyScore > 0.8) factors.push('frequently accessed');
    if (importanceScore > 0.8) factors.push('marked as important');
    if (contextRelevance > 0.7) factors.push('contextually relevant');
    
    return factors.length > 0 
      ? `Relevant due to: ${factors.join(', ')}`
      : 'Basic relevance match';
  }

  private async extractRelatedConcepts(content: string): Promise<string[]> {
    // Extract key concepts from content (simplified)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(word => word.length > 3);
    
    // Return most frequent words as concepts
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });
    
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private checkPreferenceMatch(memory: MemoryMetadata, preferences: Record<string, unknown>): number {
    let matchScore = 0;
    let totalPreferences = 0;
      for (const [key, value] of Object.entries(preferences)) {
      totalPreferences++;
      
      const valueStr = typeof value === 'string' ? value : String(value);
      if (memory.tags.includes(key) || memory.tags.includes(valueStr)) {
        matchScore++;
      } else if (memory.content.toLowerCase().includes(valueStr.toLowerCase())) {
        matchScore += 0.5;
      }
    }
    
    return totalPreferences > 0 ? matchScore / totalPreferences : 0;
  }

  private calculateTimeRelevance(
    memory: MemoryMetadata,
    timeContext: SearchContext['timeContext']
  ): number {
    // Simple time-based relevance (can be expanded)
    const memoryHour = memory.createdAt.getHours();
    const currentTimeScore = this.getTimeOfDayScore(memoryHour, timeContext.timeOfDay);
    
    return currentTimeScore;
  }  private getTimeOfDayScore(hour: number, timeOfDay: string): number {
    const timeRanges = {
      morning: [6, 12],
      afternoon: [12, 18],
      evening: [18, 22],
      night: [22, 6]
    };
    
    const range = timeRanges[timeOfDay as keyof typeof timeRanges];
    if (!range) return 0.5;
    
    const [start, end] = range;
    if (start === undefined || end === undefined) return 0.5;
    
    if (timeOfDay === 'night') {
      return (hour >= start || hour < end) ? 1 : 0.5;
    } else {
      return (hour >= start && hour < end) ? 1 : 0.5;
    }
  }

  private async calculateContentSimilarity(content1: string, content2: string): Promise<number> {
    // Quick similarity check using word overlap
    const words1 = new Set(content1.toLowerCase().split(' '));
    const words2 = new Set(content2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
}
