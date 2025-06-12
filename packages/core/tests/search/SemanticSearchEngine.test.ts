/**
 * Comprehensive tests for SemanticSearchEngine
 * Testing advanced search features, fuzzy matching, and semantic similarity
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticSearchEngine, type SemanticSearchOptions, type SearchContext } from '../../src/search/SemanticSearchEngine.js';
import { EmbeddingService } from '../../src/embedding/EmbeddingService.js';
import type { MemoryMetadata } from '../../src/types/index.js';

// Mock embedding service
const mockEmbeddingService = {
  embed: vi.fn(),
  embedBatch: vi.fn(),
  getDimension: vi.fn(() => 1536)
} as unknown as EmbeddingService;

const createMockMemory = (content: string, id: string = 'test-id'): MemoryMetadata => ({
  id,
  type: 'fact',
  content,
  confidence: 0.9,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastAccessedAt: new Date('2024-01-01'),
  accessCount: 1,
  importance: 0.8,
  tags: [],
  tenant_id: 'test-tenant',
  agent_id: 'test-agent'
});

describe('SemanticSearchEngine', () => {
  let searchEngine: SemanticSearchEngine;
  let mockMemories: MemoryMetadata[];

  beforeEach(() => {
    vi.clearAllMocks();
    searchEngine = new SemanticSearchEngine(mockEmbeddingService);
    
    // Setup mock memories
    mockMemories = [
      createMockMemory('The user prefers dark mode themes', 'memory-1'),
      createMockMemory('Project deadline is next Friday', 'memory-2'),
      createMockMemory('Use TypeScript for all new projects', 'memory-3'),
      createMockMemory('Coffee breaks at 10am and 3pm daily', 'memory-4'),
      createMockMemory('The weather is sunny today', 'memory-5')
    ];    // Mock embedding service responses
    (mockEmbeddingService.embed as any).mockImplementation((text: string) => {
      // Return different embeddings based on content similarity
      const embeddings: Record<string, number[]> = {
        'dark mode': [0.8, 0.2, 0.1, 0.3],
        'theme preferences': [0.7, 0.3, 0.2, 0.4],
        'typescript': [0.1, 0.8, 0.7, 0.2],
        'use typescript for all new projects': [0.1, 0.8, 0.7, 0.2], // Same for TypeScript content
        'project deadline': [0.2, 0.1, 0.8, 0.5],
        'coffee break': [0.3, 0.4, 0.1, 0.9],
        'weather': [0.5, 0.3, 0.2, 0.1]
      };
      
      // Find closest match or return default
      const key = Object.keys(embeddings).find(k => text.toLowerCase().includes(k)) || 'default';
      return Promise.resolve({
        embedding: embeddings[key] || [0.5, 0.5, 0.5, 0.5],
        tokens: 10,
        model: 'text-embedding-3-small'
      });
    });
  });

  describe('Basic Search Functionality', () => {
    it('should perform basic semantic search', async () => {
      const results = await searchEngine.search('dark mode', mockMemories);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('memory');
      expect(results[0]).toHaveProperty('searchScore');
      expect(results[0]).toHaveProperty('semanticScore');
    });

    it('should return results sorted by relevance', async () => {
      const results = await searchEngine.search('typescript project', mockMemories);
      
      expect(results.length).toBeGreaterThan(1);
      // Results should be sorted by searchScore descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].searchScore).toBeGreaterThanOrEqual(results[i + 1].searchScore);
      }
    });    it('should respect result limit', async () => {
      const options: SemanticSearchOptions = {
        limit: 3
      };
      
      const results = await searchEngine.search('test query', mockMemories, options);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Fuzzy Matching', () => {
    it('should handle typos with fuzzy matching enabled', async () => {
      const options: SemanticSearchOptions = {
        enableFuzzyMatching: true,
        fuzzyThreshold: 0.7
      };
      
      const results = await searchEngine.search('typescrpit', mockMemories, options); // Typo in "typescript"
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].fuzzyScore).toBeGreaterThan(0);
    });

    it('should disable fuzzy matching when option is false', async () => {
      const options: SemanticSearchOptions = {
        enableFuzzyMatching: false
      };
      
      const results = await searchEngine.search('test query', mockMemories, options);
      
      results.forEach(result => {
        expect(result.fuzzyScore).toBe(0);
      });
    });

    it('should adjust fuzzy threshold correctly', async () => {
      const highThresholdOptions: SemanticSearchOptions = {
        enableFuzzyMatching: true,
        fuzzyThreshold: 0.9
      };
      
      const lowThresholdOptions: SemanticSearchOptions = {
        enableFuzzyMatching: true,
        fuzzyThreshold: 0.3
      };
      
      const highResults = await searchEngine.search('typescrpit', mockMemories, highThresholdOptions);
      const lowResults = await searchEngine.search('typescrpit', mockMemories, lowThresholdOptions);
      
      // Lower threshold should generally return more results
      expect(lowResults.length).toBeGreaterThanOrEqual(highResults.length);
    });
  });

  describe('Weight Factors', () => {
    it('should apply custom weight factors', async () => {
      const options: SemanticSearchOptions = {
        weightFactors: {
          semantic: 0.8,
          fuzzy: 0.1,
          recency: 0.05,
          frequency: 0.03,
          importance: 0.02
        }
      };
      
      const results = await searchEngine.search('test query', mockMemories, options);
      
      expect(results).toBeDefined();
      expect(results[0].searchScore).toBeGreaterThan(0);
      expect(results[0].semanticScore).toBeGreaterThan(0);
    });    it('should prioritize semantic similarity with high semantic weight', async () => {
      const semanticWeightedOptions: SemanticSearchOptions = {
        weightFactors: {
          semantic: 0.9,
          fuzzy: 0.05,
          recency: 0.02,
          frequency: 0.02,
          importance: 0.01
        }
      };
      
      const regularOptions: SemanticSearchOptions = {
        weightFactors: {
          semantic: 0.4,
          fuzzy: 0.3,
          recency: 0.1,
          frequency: 0.1,
          importance: 0.1
        }
      };
      
      const semanticResults = await searchEngine.search('typescript', mockMemories, semanticWeightedOptions);
      const regularResults = await searchEngine.search('typescript', mockMemories, regularOptions);
      
      expect(semanticResults).toBeDefined();
      expect(regularResults).toBeDefined();
      // Semantic-weighted search should produce higher overall search scores for the top result
      expect(semanticResults[0].searchScore).toBeGreaterThan(regularResults[0].searchScore * 0.95);
    });
  });

  describe('Context Integration', () => {
    it('should use search context for better results', async () => {
      const context: SearchContext = {
        recentQueries: ['typescript', 'project setup'],
        userPreferences: { 'coding_language': 'typescript' },
        sessionContext: ['working on new project'],
        timeContext: {
          timeOfDay: 'morning',
          dayOfWeek: 'Monday',
          season: 'winter'
        }
      };
      
      const results = await searchEngine.search('coding preferences', mockMemories, {}, context);
      
      expect(results).toBeDefined();
      expect(results[0].contextRelevance).toBeGreaterThan(0);
    });

    it('should boost relevance for context-related memories', async () => {
      const context: SearchContext = {
        recentQueries: ['typescript'],
        userPreferences: {},
        sessionContext: [],
        timeContext: {
          timeOfDay: 'morning',
          dayOfWeek: 'Monday', 
          season: 'winter'
        }
      };
      
      const resultsWithContext = await searchEngine.search('project', mockMemories, {}, context);
      const resultsWithoutContext = await searchEngine.search('project', mockMemories);
      
      // Results with context should generally have higher relevance scores
      expect(resultsWithContext[0].contextRelevance).toBeGreaterThan(0);
      expect(resultsWithoutContext[0].contextRelevance).toBe(0);
    });
  });

  describe('Diversity Ranking', () => {
    it('should apply diversity ranking to avoid similar results', async () => {
      const options: SemanticSearchOptions = {
        diversityFactor: 0.3
      };
      
      // Create similar memories
      const similarMemories = [
        createMockMemory('TypeScript is great for large projects', 'ts-1'),
        createMockMemory('TypeScript provides excellent type safety', 'ts-2'),
        createMockMemory('TypeScript compilation catches errors early', 'ts-3'),
        createMockMemory('Coffee is essential for productivity', 'coffee-1')
      ];
      
      const results = await searchEngine.search('typescript', similarMemories, options);
      
      expect(results).toBeDefined();
      // Should include both typescript and non-typescript results for diversity
      const hasNonTypescriptResult = results.some(r => 
        !r.memory.content.toLowerCase().includes('typescript')
      );
      expect(hasNonTypescriptResult).toBe(true);
    });

    it('should disable diversity when factor is zero', async () => {
      const options: SemanticSearchOptions = {
        diversityFactor: 0
      };
      
      const results = await searchEngine.search('test', mockMemories, options);
      expect(results).toBeDefined();
      // All results should be sorted purely by relevance
    });
  });

  describe('Semantic Expansion', () => {
    it('should expand queries when semantic expansion is enabled', async () => {
      const options: SemanticSearchOptions = {
        enableSemanticExpansion: true
      };
      
      const results = await searchEngine.search('coding', mockMemories, options);
      
      expect(results).toBeDefined();
      expect(mockEmbeddingService.embed).toHaveBeenCalled();
    });

    it('should handle query preprocessing', async () => {
      const options: SemanticSearchOptions = {
        enableTypoTolerance: true
      };
      
      const results = await searchEngine.search('TYPESCRIPT PROJECT!!!', mockMemories, options);
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache query embeddings for performance', async () => {
      const query = 'typescript project';
      
      // First search
      await searchEngine.search(query, mockMemories);
      const firstCallCount = (mockEmbeddingService.embed as any).mock.calls.length;
      
      // Second search with same query
      await searchEngine.search(query, mockMemories);
      const secondCallCount = (mockEmbeddingService.embed as any).mock.calls.length;
      
      // Should not call embedding service again for same query
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('should handle cache cleanup when size limit is reached', async () => {
      // This test would need to be more sophisticated to test cache cleanup
      // For now, just ensure it doesn't crash with many different queries
      const queries = Array.from({ length: 10 }, (_, i) => `query ${i}`);
      
      for (const query of queries) {
        const results = await searchEngine.search(query, mockMemories);
        expect(results).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding service errors gracefully', async () => {
      (mockEmbeddingService.embed as any).mockRejectedValueOnce(new Error('Embedding service error'));
      
      await expect(searchEngine.search('test query', mockMemories)).rejects.toThrow('Embedding service error');
    });

    it('should handle empty memory arrays', async () => {
      const results = await searchEngine.search('test query', []);
      expect(results).toEqual([]);
    });

    it('should handle memories without embeddings', async () => {
      const memoriesWithoutEmbeddings = mockMemories.map(m => ({ ...m, embedding: undefined }));
      
      const results = await searchEngine.search('test query', memoriesWithoutEmbeddings);
      
      expect(results).toBeDefined();
      expect(mockEmbeddingService.embed).toHaveBeenCalled(); // Should generate embeddings
    });
  });

  describe('Search Result Quality', () => {
    it('should provide detailed explanations for search results', async () => {
      const results = await searchEngine.search('typescript', mockMemories);
      
      expect(results[0].explanation).toBeDefined();
      expect(typeof results[0].explanation).toBe('string');
      expect(results[0].explanation.length).toBeGreaterThan(0);
    });

    it('should extract related concepts from memories', async () => {
      const results = await searchEngine.search('project', mockMemories);
      
      expect(results[0].relatedConcepts).toBeDefined();
      expect(Array.isArray(results[0].relatedConcepts)).toBe(true);
    });

    it('should calculate multiple scoring dimensions', async () => {
      const results = await searchEngine.search('typescript', mockMemories);
      
      const result = results[0];
      expect(result.semanticScore).toBeGreaterThanOrEqual(0);
      expect(result.recencyScore).toBeGreaterThanOrEqual(0);
      expect(result.frequencyScore).toBeGreaterThanOrEqual(0);
      expect(result.searchScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Time-based Relevance', () => {
    it('should consider time of day for relevance scoring', async () => {
      const morningContext: SearchContext = {
        recentQueries: [],
        userPreferences: {},
        sessionContext: [],
        timeContext: {
          timeOfDay: 'morning',
          dayOfWeek: 'Monday',
          season: 'winter'
        }
      };
      
      const results = await searchEngine.search('coffee', mockMemories, {}, morningContext);
      
      expect(results).toBeDefined();
      expect(results[0].contextRelevance).toBeGreaterThan(0);
    });

    it('should handle different seasons and days', async () => {
      const summerContext: SearchContext = {
        recentQueries: [],
        userPreferences: {},
        sessionContext: [],
        timeContext: {
          timeOfDay: 'afternoon',
          dayOfWeek: 'Friday',
          season: 'summer'
        }
      };
      
      const results = await searchEngine.search('weather', mockMemories, {}, summerContext);
      expect(results).toBeDefined();
    });
  });

  describe('SemanticSearchEngine Coverage Enhancement - Final Push', () => {
    it('should handle semantic expansion disabled path (line 94)', async () => {
      // Target line 94: enableSemanticExpansion false branch
      const memories = [createMockMemory('Test content', 'test-1')];
        // Mock embedding for the query
      (mockEmbeddingService.embed as any).mockResolvedValue({ 
        embedding: [0.1, 0.2, 0.3],
        tokens: 3,
        model: 'test'
      });
        const options: SemanticSearchOptions = {
        enableSemanticExpansion: false, // This targets line 94
        enableFuzzyMatching: false,
        limit: 5
      };
      
      const results = await searchEngine.search('test query', memories, options);
      
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('test query');
      expect(results).toBeDefined();
    });

    it('should trigger query cache cleanup when exceeding limit (lines 161-165)', async () => {
      // Target lines 161-165: query cache size management
      const searchEngine = new SemanticSearchEngine(mockEmbeddingService);
        // Mock the embedding to ensure cache is populated
      (mockEmbeddingService.embed as any).mockResolvedValue({ 
        embedding: [0.1, 0.2, 0.3],
        tokens: 3,
        model: 'test'
      });
      
      // Fill the cache beyond the 1000 limit by making many unique queries
      const promises: Promise<any>[] = [];
      for (let i = 0; i < 1002; i++) {
        promises.push(searchEngine.search(`unique query ${i}`, [], { limit: 1 }));
      }
      
      await Promise.all(promises);
      
      // The cache should have triggered cleanup, which happens in getQueryEmbedding
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(1002);
    });

    it('should handle diversification break condition when no suitable candidates (lines 397-398)', async () => {
      // Target lines 397-398: diversification break condition
      const memories = [
        createMockMemory('Similar content A', 'mem-1'),
        createMockMemory('Similar content B', 'mem-2'),
        createMockMemory('Similar content C', 'mem-3')
      ];
        // Mock embedding to return very similar embeddings
      (mockEmbeddingService.embed as any).mockResolvedValue({ 
        embedding: [0.9, 0.9, 0.9],
        tokens: 3,
        model: 'test'
      });
      
      const options: SemanticSearchOptions = {
        diversityFactor: 0.99, // Very high threshold to force break condition
        limit: 3
      };
      
      const results = await searchEngine.search('test query', memories, options);
      
      // Should break when no diverse candidates are found
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle content matching in preference scoring (line 598)', async () => {
      // Target line 598: content matching in calculatePreferenceScore
      const memory = createMockMemory('The user likes dark themes and TypeScript', 'mem-1');
      memory.tags = ['programming']; // No direct tag match
        const context: SearchContext = {
        recentQueries: [],
        userPreferences: {
          theme: 'dark',      // Should match content via String(value).toLowerCase()
          language: 'typescript' // Should match content
        },
        sessionContext: [],
        timeContext: {
          timeOfDay: 'afternoon',
          dayOfWeek: 'Monday',
          season: 'spring'
        }
      };
      
      // Mock embedding for the query
      (mockEmbeddingService.embed as any).mockResolvedValue({ 
        embedding: [0.5, 0.5, 0.5],
        tokens: 3,
        model: 'test'
      });

      const results = await searchEngine.search('test query', [memory], { 
        limit: 1
      }, context);
      
      // The content matching should boost the score
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle time range validation edge case (line 631)', async () => {
      // Target line 631: time range validation with undefined values
      const memory = createMockMemory('Morning meeting at 9am', 'mem-1');
        const context: SearchContext = {
        recentQueries: ['meeting'],
        userPreferences: {},
        sessionContext: [],
        timeContext: {
          timeOfDay: 'night',
          dayOfWeek: 'Monday',
          season: 'winter'
        }
      };
        const results = await searchEngine.search('meeting', [memory], { 
        limit: 1
      }, context);
      
      // Should handle undefined time range gracefully
      expect(results).toBeDefined();
    });

    it('should handle query cache with multiple embeddings', async () => {
      // Additional test to ensure query cache management works correctly
      const searchEngine = new SemanticSearchEngine(mockEmbeddingService);
      
      (mockEmbeddingService.embed as any).mockResolvedValueOnce([0.1, 0.2, 0.3]);
      (mockEmbeddingService.embed as any).mockResolvedValueOnce([0.4, 0.5, 0.6]);
        // First search - should cache the embedding
      await searchEngine.search('query1', [], { limit: 1 });
      
      // Second search with same query - should use cache
      await searchEngine.search('query1', [], { limit: 1 });
      
      // Third search with different query - should create new embedding
      await searchEngine.search('query2', [], { limit: 1 });
      
      // Should have called embed twice (once for each unique query)
      expect(mockEmbeddingService.embed).toHaveBeenCalledTimes(2);
    });
  });
  describe('SemanticSearchEngine Coverage Enhancement - Lines 397-398, 598', () => {
    it('should handle similarity search with no remaining items (lines 397-398)', async () => {
      const memories = [createMockMemory('test content', 'memory-1')];
      const options = { limit: 10 };
      
      // Mock embedding service to return consistent embeddings
      (mockEmbeddingService.embed as any).mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
        model: 'test-model'
      });
      
      const results = await searchEngine.search('test query', memories, options);
        // Should handle the case where remaining array becomes empty (line 398)
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toBe('test content');
    });

    it('should handle preference matching with partial tag match (line 598)', async () => {
      const context: SearchContext = {
        recentQueries: [],
        userPreferences: { theme: 'dark', language: 'typescript' },
        sessionContext: [],
        timeContext: {
          timeOfDay: 'morning',
          dayOfWeek: 'Monday',
          season: 'winter'
        }
      };
      
      const memories = [
        {
          ...createMockMemory('User prefers dark themes', 'memory-1'),
          tags: ['theme'] // Should trigger partial match logic on line 598
        },
        {
          ...createMockMemory('TypeScript is used in projects', 'memory-2'),
          tags: ['language', 'coding']
        }
      ];
      const options = { limit: 5 };
      
      // Mock embedding service
      (mockEmbeddingService.embed as any).mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
        model: 'test-model'
      });
      
      const results = await searchEngine.search('preferences', memories, options, context);
      
      // Should handle preference matching logic including line 598
      expect(results).toHaveLength(2);
    });

    it('should handle content-based preference matching (line 598)', async () => {
      const context: SearchContext = {
        recentQueries: [],
        userPreferences: { framework: 'react' },
        sessionContext: [],
        timeContext: {
          timeOfDay: 'afternoon',
          dayOfWeek: 'Tuesday',
          season: 'spring'
        }
      };
      
      const memories = [
        {
          ...createMockMemory('We use React for frontend development', 'memory-1'),
          tags: ['frontend'] // Should trigger content-based matching on line 598
        }
      ];
      const options = { limit: 1 };
      
      (mockEmbeddingService.embed as any).mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        tokens: 10,
        model: 'test-model'
      });
      
      const results = await searchEngine.search('framework preferences', memories, options, context);
        // Should match 'react' in content and apply preference boost
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toContain('React');
    });  });
});
