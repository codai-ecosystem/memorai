/**
 * Basic Memory Engine - No AI Required
 * Provides keyword-based search and simple classification with persistent file storage
 */

import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  MemoryType,
} from '../types/index.js';
import { FileStorageAdapter } from '../storage/StorageAdapter.js';

export interface KeywordIndex {
  [keyword: string]: Set<string>; // Set of memory IDs
}

export class BasicMemoryEngine {
  private storage: FileStorageAdapter;
  private keywordIndex: KeywordIndex = {};
  private typeIndex: Map<MemoryType, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private initialized = false;

  constructor(dataDirectory?: string) {
    this.storage = new FileStorageAdapter(dataDirectory);
  }

  /**
   * Initialize the engine and rebuild indices from persistent storage
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load all memories from storage and rebuild indices
    const memories = await this.storage.list();
    for (const memory of memories) {
      this.indexMemoryKeywords(memory);
      this.indexMemoryType(memory);
      this.indexMemoryTags(memory);
    }

    this.initialized = true;
  }

  /**
   * Store a memory using keyword indexing and persistent storage
   */
  public async remember(memory: MemoryMetadata): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Store in persistent storage
    await this.storage.store(memory);

    // Index by keywords
    this.indexMemoryKeywords(memory);

    // Index by type
    this.indexMemoryType(memory);

    // Index by tags
    this.indexMemoryTags(memory);
  }

  /**
   * Search memories using keyword matching
   */
  public async recall(query: MemoryQuery): Promise<MemoryResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const searchTerms = this.extractKeywords(query.query);
    const candidateIds = new Set<string>();

    // Find memories containing search terms
    for (const term of searchTerms) {
      const matchingIds = this.keywordIndex[term.toLowerCase()];
      if (matchingIds) {
        matchingIds.forEach(id => candidateIds.add(id));
      }
    }

    // Filter by type if specified
    if (query.type) {
      const typeIds = this.typeIndex.get(query.type);
      if (typeIds) {
        // Keep only memories that match both keywords and type
        candidateIds.forEach(id => {
          if (!typeIds.has(id)) {
            candidateIds.delete(id);
          }
        });
      } else {
        // No memories of this type
        candidateIds.clear();
      }
    }

    // Convert to MemoryResult array with basic scoring
    const results: MemoryResult[] = [];
    for (const id of candidateIds) {
      const memory = await this.storage.retrieve(id);
      if (memory && memory.tenant_id === query.tenant_id) {
        // Check agent filter
        if (query.agent_id && memory.agent_id !== query.agent_id) {
          continue;
        }

        const score = this.calculateKeywordScore(memory, searchTerms);
        if (score >= query.threshold) {
          results.push({
            memory,
            score,
            relevance_reason: this.getRelevanceReason(memory, searchTerms),
          });
        }
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    const limit = query.limit || 10;
    return results.slice(0, limit);
  }

  /**
   * List memories with filtering
   */
  public async list(
    limit: number = 50,
    tenantId?: string,
    agentId?: string
  ): Promise<MemoryMetadata[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    const filters: any = {};
    if (tenantId) filters.tenantId = tenantId;
    if (agentId) filters.agentId = agentId;
    filters.limit = limit;

    return await this.storage.list(filters);
  }

  /**
   * Update memory access statistics
   */
  public async updateMemoryAccess(memoryId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const memory = await this.storage.retrieve(memoryId);
    if (memory) {
      await this.storage.update(memoryId, {
        lastAccessedAt: new Date(),
        accessCount: memory.accessCount + 1,
      });
    }
  }

  /**
   * Delete a memory
   */
  public async forget(memoryId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const memory = await this.storage.retrieve(memoryId);
    if (memory) {
      // Remove from storage
      await this.storage.delete(memoryId);

      // Remove from indices
      this.removeFromIndices(memory);
    }
  }

  /**
   * Index memory by keywords
   */
  private indexMemoryKeywords(memory: MemoryMetadata): void {
    const keywords = this.extractKeywords(memory.content);
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      if (!this.keywordIndex[normalizedKeyword]) {
        this.keywordIndex[normalizedKeyword] = new Set();
      }
      this.keywordIndex[normalizedKeyword].add(memory.id);
    }

    // Also index by tags
    for (const tag of memory.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!this.keywordIndex[normalizedTag]) {
        this.keywordIndex[normalizedTag] = new Set();
      }
      this.keywordIndex[normalizedTag].add(memory.id);
    }
  }

  /**
   * Index memory by type
   */
  private indexMemoryType(memory: MemoryMetadata): void {
    if (!this.typeIndex.has(memory.type)) {
      this.typeIndex.set(memory.type, new Set());
    }
    this.typeIndex.get(memory.type)!.add(memory.id);
  }

  /**
   * Index memory by tags
   */
  private indexMemoryTags(memory: MemoryMetadata): void {
    for (const tag of memory.tags) {
      const normalizedTag = tag.toLowerCase();
      if (!this.tagIndex.has(normalizedTag)) {
        this.tagIndex.set(normalizedTag, new Set());
      }
      this.tagIndex.get(normalizedTag)!.add(memory.id);
    }
  }

  /**
   * Remove memory from all indices
   */
  private removeFromIndices(memory: MemoryMetadata): void {
    // Remove from keyword index
    const keywords = this.extractKeywords(memory.content);
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.toLowerCase();
      this.keywordIndex[normalizedKeyword]?.delete(memory.id);
      if (this.keywordIndex[normalizedKeyword]?.size === 0) {
        delete this.keywordIndex[normalizedKeyword];
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

  /**
   * Extract keywords from text using simple tokenization
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(word => word.length > 2) // Filter out short words
      .filter(word => !this.isStopWord(word)); // Filter out stop words
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'me',
      'him',
      'her',
      'us',
      'them',
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate keyword match score
   */
  private calculateKeywordScore(
    memory: MemoryMetadata,
    searchTerms: string[]
  ): number {
    const contentWords = this.extractKeywords(memory.content);
    const titleWords = memory.tags || [];

    let score = 0;
    let totalTerms = searchTerms.length;

    for (const term of searchTerms) {
      let termScore = 0;

      // Check for exact matches in content
      if (contentWords.includes(term)) {
        termScore += 0.5;
      }

      // Check for exact matches in tags
      if (titleWords.some(tag => tag.toLowerCase().includes(term))) {
        termScore += 0.3;
      }

      // Check for partial matches
      if (memory.content.toLowerCase().includes(term)) {
        termScore += 0.2;
      }

      score += termScore;
    }

    // Normalize score
    return totalTerms > 0 ? score / totalTerms : 0;
  }

  /**
   * Get relevance reason for a memory
   */
  private getRelevanceReason(
    memory: MemoryMetadata,
    searchTerms: string[]
  ): string {
    const reasons: string[] = [];

    for (const term of searchTerms) {
      if (memory.content.toLowerCase().includes(term)) {
        reasons.push(`matches "${term}"`);
      }
    }

    if (memory.tags.length > 0) {
      for (const term of searchTerms) {
        if (memory.tags.some(tag => tag.toLowerCase().includes(term))) {
          reasons.push(`tagged with "${term}"`);
        }
      }
    }

    return reasons.length > 0 ? reasons.join(', ') : 'keyword match in content';
  }

  /**
   * Get statistics about stored memories
   */
  public async getStats(): Promise<{
    totalMemories: number;
    memoryTypes: Record<MemoryType, number>;
    indexStats: {
      keywords: number;
      types: number;
      tags: number;
    };
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

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

    for (const memory of memories) {
      memoryTypes[memory.type]++;
    }

    return {
      totalMemories: memories.length,
      memoryTypes,
      indexStats: {
        keywords: Object.keys(this.keywordIndex).length,
        types: this.typeIndex.size,
        tags: this.tagIndex.size,
      },
    };
  }
}
