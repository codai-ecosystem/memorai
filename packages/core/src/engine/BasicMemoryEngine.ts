/**
 * Basic Memory Engine - No AI Required
 * Provides keyword-based search and simple classification
 */

import type {
    MemoryMetadata,
    MemoryQuery,
    MemoryResult,
    MemoryType
} from '../types/index.js';

export interface BasicMemoryStore {
    [id: string]: MemoryMetadata;
}

export interface KeywordIndex {
    [keyword: string]: Set<string>; // Set of memory IDs
}

export class BasicMemoryEngine {
    private memories: BasicMemoryStore = {};
    private keywordIndex: KeywordIndex = {};
    private typeIndex: Map<MemoryType, Set<string>> = new Map();
    private tagIndex: Map<string, Set<string>> = new Map();

    /**
     * Store a memory using keyword indexing
     */
    public async remember(memory: MemoryMetadata): Promise<void> {
        // Store the memory
        this.memories[memory.id] = memory;

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
            const memory = this.memories[id];
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
                        relevance_reason: this.getRelevanceReason(memory, searchTerms)
                    });
                }
            }
        }

        // Sort by score and apply time decay if requested
        results.sort((a, b) => {
            let scoreA = a.score;
            let scoreB = b.score;

            if (query.time_decay) {
                scoreA *= this.getTimeDecayFactor(a.memory);
                scoreB *= this.getTimeDecayFactor(b.memory);
            }

            return scoreB - scoreA;
        });

        // Apply limit
        return results.slice(0, query.limit);
    }

    /**
     * Get context for an agent
     */
    public async getContext(
        tenantId: string,
        agentId?: string,
        limit = 10
    ): Promise<MemoryMetadata[]> {
        const memories = Object.values(this.memories)
            .filter(memory => {
                if (memory.tenant_id !== tenantId) return false;
                if (agentId && memory.agent_id !== agentId) return false;
                return true;
            })
            .sort((a, b) => {
                // Sort by last accessed time and importance
                const timeA = a.lastAccessedAt.getTime();
                const timeB = b.lastAccessedAt.getTime();
                const importanceA = a.importance;
                const importanceB = b.importance;

                return (timeB + importanceB * 86400000) - (timeA + importanceA * 86400000);
            });

        return memories.slice(0, limit);
    }

    /**
     * Delete a memory
     */
    public async forget(memoryId: string): Promise<boolean> {
        const memory = this.memories[memoryId];
        if (!memory) return false;

        // Remove from indices
        this.removeFromKeywordIndex(memory);
        this.removeFromTypeIndex(memory);
        this.removeFromTagIndex(memory);

        // Remove from storage
        delete this.memories[memoryId];
        return true;
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
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag)!.add(memory.id);
        }
    }

    /**
     * Remove memory from keyword index
     */
    private removeFromKeywordIndex(memory: MemoryMetadata): void {
        const keywords = this.extractKeywords(memory.content);
        for (const keyword of keywords) {
            const normalizedKeyword = keyword.toLowerCase();
            const indexSet = this.keywordIndex[normalizedKeyword];
            if (indexSet) {
                indexSet.delete(memory.id);
                if (indexSet.size === 0) {
                    delete this.keywordIndex[normalizedKeyword];
                }
            }
        }
    }

    /**
     * Remove memory from type index
     */
    private removeFromTypeIndex(memory: MemoryMetadata): void {
        const typeSet = this.typeIndex.get(memory.type);
        if (typeSet) {
            typeSet.delete(memory.id);
            if (typeSet.size === 0) {
                this.typeIndex.delete(memory.type);
            }
        }
    }

    /**
     * Remove memory from tag index
     */
    private removeFromTagIndex(memory: MemoryMetadata): void {
        for (const tag of memory.tags) {
            const tagSet = this.tagIndex.get(tag);
            if (tagSet) {
                tagSet.delete(memory.id);
                if (tagSet.size === 0) {
                    this.tagIndex.delete(tag);
                }
            }
        }
    }

    /**
     * Extract keywords from text
     */
    private extractKeywords(text: string): string[] {
        // Simple keyword extraction: split on whitespace and punctuation
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2) // Filter short words
            .filter(word => !this.isStopWord(word));
    }

    /**
     * Check if word is a stop word
     */
    private isStopWord(word: string): boolean {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'around', 'among', 'is', 'are',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
            'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may',
            'might', 'must', 'shall', 'this', 'that', 'these', 'those'
        ]);
        return stopWords.has(word);
    }

    /**
     * Calculate keyword-based relevance score
     */
    private calculateKeywordScore(memory: MemoryMetadata, searchTerms: string[]): number {
        const memoryKeywords = this.extractKeywords(memory.content);
        const memoryKeywordSet = new Set(memoryKeywords);

        let matches = 0;
        for (const term of searchTerms) {
            if (memoryKeywordSet.has(term.toLowerCase())) {
                matches++;
            }
        }

        const keywordScore = matches / Math.max(searchTerms.length, 1);

        // Boost score based on memory importance and access frequency
        const importanceBoost = memory.importance * 0.2;
        const accessBoost = Math.min(memory.accessCount / 10, 0.2);

        return Math.min(keywordScore + importanceBoost + accessBoost, 1.0);
    }

    /**
     * Calculate time decay factor
     */
    private getTimeDecayFactor(memory: MemoryMetadata): number {
        const now = new Date();
        const lastAccessed = memory.lastAccessedAt;
        const daysSinceAccess = (now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24);

        // Exponential decay with half-life of 30 days
        return Math.exp(-daysSinceAccess / 30);
    }

    /**
     * Get relevance reason for search result
     */
    private getRelevanceReason(memory: MemoryMetadata, searchTerms: string[]): string {
        const memoryKeywords = this.extractKeywords(memory.content);
        const matches = searchTerms.filter(term =>
            memoryKeywords.some(keyword => keyword.toLowerCase() === term.toLowerCase())
        );

        if (matches.length === 0) {
            return 'Partial text match';
        } else if (matches.length === 1) {
            return `Matches keyword: "${matches[0]}"`;
        } else {
            return `Matches keywords: ${matches.slice(0, 3).map(m => `"${m}"`).join(', ')}`;
        }
    }

    /**
     * Get statistics about the memory store
     */
    public getStats(): {
        totalMemories: number;
        memoryTypes: Record<MemoryType, number>;
        totalKeywords: number;
        totalTags: number;
    } {
        const memoryTypes: Record<MemoryType, number> = {
            'personality': 0,
            'procedure': 0,
            'preference': 0,
            'fact': 0,
            'thread': 0,
            'task': 0,
            'emotion': 0
        };

        for (const memory of Object.values(this.memories)) {
            memoryTypes[memory.type]++;
        }

        return {
            totalMemories: Object.keys(this.memories).length,
            memoryTypes,
            totalKeywords: Object.keys(this.keywordIndex).length,
            totalTags: this.tagIndex.size
        };
    }
}
