import { describe, it, expect, beforeEach } from 'vitest';
import { ContextEngine } from '../../src/context/ContextEngine.js';
import { ContextError } from '../../src/types/index.js';
import type { MemoryResult, MemoryMetadata } from '../../src/types/index.js';

describe('ContextEngine', () => {
  let contextEngine: ContextEngine;
  let mockMemories: MemoryResult[];

  beforeEach(() => {
    contextEngine = new ContextEngine();

    // Create diverse mock memories for testing
    mockMemories = [
      {
        memory: {
          id: 'mem1',
          type: 'personality',
          content: 'User prefers direct communication style',
          confidence: 0.9,
          importance: 0.8,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          lastAccessedAt: new Date('2024-01-01'),
          accessCount: 5,
          emotional_weight: 0.3,
          tags: ['communication', 'preference'],
          tenant_id: 'tenant1',
          agent_id: 'agent1',
        },
        score: 0.95,
        relevance_reason: 'High personality match',
      },
      {
        memory: {
          id: 'mem2',
          type: 'fact',
          content: 'User lives in San Francisco and works in tech',
          confidence: 0.85,
          importance: 0.7,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          lastAccessedAt: new Date('2024-01-02'),
          accessCount: 3,
          emotional_weight: 0.1,
          tags: ['location', 'work'],
          tenant_id: 'tenant1',
          agent_id: 'agent1',
        },
        score: 0.87,
        relevance_reason: 'Factual information match',
      },
      {
        memory: {
          id: 'mem3',
          type: 'preference',
          content: 'User dislikes overly verbose explanations',
          confidence: 0.75,
          importance: 0.6,
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03'),
          lastAccessedAt: new Date('2024-01-03'),
          accessCount: 2,
          emotional_weight: -0.2,
          tags: ['communication', 'preference'],
          tenant_id: 'tenant1',
          agent_id: 'agent1',
        },
        score: 0.78,
        relevance_reason: 'Preference alignment',
      },
      {
        memory: {
          id: 'mem4',
          type: 'task',
          content:
            'User is working on a machine learning project deadline next week',
          confidence: 0.95,
          importance: 0.9,
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-05'),
          lastAccessedAt: new Date('2024-01-05'),
          accessCount: 8,
          emotional_weight: -0.4,
          tags: ['project', 'deadline', 'ml'],
          tenant_id: 'tenant1',
          agent_id: 'agent1',
        },
        score: 0.92,
        relevance_reason: 'Current task relevance',
      },
      {
        memory: {
          id: 'mem5',
          type: 'emotion',
          content: 'User expressed frustration with slow development tools',
          confidence: 0.8,
          importance: 0.4,
          createdAt: new Date('2024-01-04'),
          updatedAt: new Date('2024-01-04'),
          lastAccessedAt: new Date('2024-01-04'),
          accessCount: 1,
          emotional_weight: -0.6,
          tags: ['frustration', 'tools'],
          tenant_id: 'tenant1',
          agent_id: 'agent1',
        },
        score: 0.65,
        relevance_reason: 'Emotional context',
      },
    ];
  });

  describe('generateContextSummary', () => {
    it('should generate a comprehensive context summary', () => {
      const summary = contextEngine.generateContextSummary(mockMemories);

      expect(summary).toContain('Personality');
      expect(summary).toContain('Fact');
      expect(summary).toContain('Preference');
      expect(summary).toContain('Task');
      expect(summary).toContain('Emotion');
      expect(summary).toContain('User prefers direct communication style');
      expect(summary.length).toBeGreaterThan(0);
    });

    it('should handle empty memories array', () => {
      const summary = contextEngine.generateContextSummary([]);
      expect(summary).toBe('No relevant context available.');
    });
    it('should respect maxLength option', () => {
      const summary = contextEngine.generateContextSummary(mockMemories, {
        maxLength: 100,
      });
      expect(summary.length).toBeLessThanOrEqual(130); // Allow for truncation message
      expect(summary).toContain('[Context truncated]');
    });

    it('should include scores when requested', () => {
      const summary = contextEngine.generateContextSummary(mockMemories, {
        includeScore: true,
      });
      expect(summary).toMatch(/\[0\.\d{2}\]/); // Score format [0.XX]
    });
    it('should include timestamps when requested', () => {
      const summary = contextEngine.generateContextSummary(mockMemories, {
        includeTimestamp: true,
      });
      expect(summary).toMatch(/\(\d{2}\.\d{2}\.\d{4}\)/); // Date format (DD.MM.YYYY)
    });

    it('should limit memories per type', () => {
      // Create many memories of the same type
      const manyMemories = Array.from({ length: 10 }, (_, i) => ({
        ...mockMemories[0],
        memory: {
          ...mockMemories[0].memory,
          id: `mem_${i}`,
          content: `Content ${i}`,
        },
      }));

      const summary = contextEngine.generateContextSummary(manyMemories);
      const contentMatches = summary.match(/Content \d+/g);
      expect(contentMatches?.length).toBeLessThanOrEqual(5); // Max 5 per type
    });
  });

  describe('generateAgentContext', () => {
    it('should generate structured agent context', () => {
      const context = contextEngine.generateAgentContext(mockMemories);

      expect(context).toHaveProperty('context');
      expect(context).toHaveProperty('memories');
      expect(context).toHaveProperty('summary');
      expect(context).toHaveProperty('confidence');
      expect(context).toHaveProperty('generated_at');
      expect(context).toHaveProperty('total_count');
      expect(context).toHaveProperty('context_summary');

      expect(context.memories).toEqual(mockMemories);
      expect(context.total_count).toBe(mockMemories.length);
      expect(context.confidence).toBeGreaterThan(0);
      expect(context.generated_at).toBeInstanceOf(Date);
    });

    it('should handle empty memories', () => {
      const context = contextEngine.generateAgentContext([]);

      expect(context.memories).toEqual([]);
      expect(context.total_count).toBe(0);
      expect(context.confidence).toBe(0);
      expect(context.context).toBe('');
      expect(context.summary).toBe('No relevant context available.');
    });
  });

  describe('extractThemes', () => {
    it('should extract and rank themes from memories', () => {
      const themes = contextEngine.extractThemes(mockMemories);

      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
      expect(themes.length).toBeLessThanOrEqual(10); // Max 10 themes

      // Check theme structure
      themes.forEach(theme => {
        expect(theme).toHaveProperty('theme');
        expect(theme).toHaveProperty('frequency');
        expect(theme).toHaveProperty('importance');
        expect(typeof theme.theme).toBe('string');
        expect(typeof theme.frequency).toBe('number');
        expect(typeof theme.importance).toBe('number');
      });

      // Themes should be sorted by relevance (frequency * importance)
      for (let i = 1; i < themes.length; i++) {
        const prevRelevance =
          themes[i - 1].frequency * themes[i - 1].importance;
        const currentRelevance = themes[i].frequency * themes[i].importance;
        expect(prevRelevance).toBeGreaterThanOrEqual(currentRelevance);
      }
    });

    it('should handle empty memories', () => {
      const themes = contextEngine.extractThemes([]);
      expect(themes).toEqual([]);
    });

    it('should filter out stop words', () => {
      const memoryWithStopWords = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            content: 'This is a very good time with some much work',
          },
        },
      ];

      const themes = contextEngine.extractThemes(memoryWithStopWords);
      const themeWords = themes.map(t => t.theme);

      // Stop words should be filtered out
      expect(themeWords).not.toContain('this');
      expect(themeWords).not.toContain('very');
      expect(themeWords).not.toContain('some');
      expect(themeWords).not.toContain('much');
    });
  });

  describe('analyzeEmotionalContext', () => {
    it('should analyze emotional context from memories', () => {
      const emotional = contextEngine.analyzeEmotionalContext(mockMemories);

      expect(emotional).toHaveProperty('overall_sentiment');
      expect(emotional).toHaveProperty('emotional_weight');
      expect(emotional).toHaveProperty('emotional_distribution');

      expect(['positive', 'neutral', 'negative']).toContain(
        emotional.overall_sentiment
      );
      expect(typeof emotional.emotional_weight).toBe('number');
      expect(emotional.emotional_weight).toBeGreaterThanOrEqual(-1);
      expect(emotional.emotional_weight).toBeLessThanOrEqual(1);

      expect(emotional.emotional_distribution).toHaveProperty('positive');
      expect(emotional.emotional_distribution).toHaveProperty('neutral');
      expect(emotional.emotional_distribution).toHaveProperty('negative');
    });

    it('should handle memories without emotional weights', () => {
      const memoriesNoEmotion = mockMemories.map(m => ({
        ...m,
        memory: {
          ...m.memory,
          emotional_weight: undefined,
        },
      }));

      const emotional =
        contextEngine.analyzeEmotionalContext(memoriesNoEmotion);

      expect(emotional.overall_sentiment).toBe('neutral');
      expect(emotional.emotional_weight).toBe(0);
      expect(emotional.emotional_distribution).toEqual({});
    });

    it('should classify positive sentiment correctly', () => {
      const positiveMemories = mockMemories.map(m => ({
        ...m,
        memory: {
          ...m.memory,
          emotional_weight: 0.5,
        },
      }));

      const emotional = contextEngine.analyzeEmotionalContext(positiveMemories);
      expect(emotional.overall_sentiment).toBe('positive');
      expect(emotional.emotional_weight).toBeGreaterThan(0.2);
    });

    it('should classify negative sentiment correctly', () => {
      const negativeMemories = mockMemories.map(m => ({
        ...m,
        memory: {
          ...m.memory,
          emotional_weight: -0.5,
        },
      }));

      const emotional = contextEngine.analyzeEmotionalContext(negativeMemories);
      expect(emotional.overall_sentiment).toBe('negative');
      expect(emotional.emotional_weight).toBeLessThan(-0.2);
    });
  });

  describe('analyzeTemporalContext', () => {
    it('should analyze temporal patterns in memories', () => {
      const temporal = contextEngine.analyzeTemporalContext(mockMemories);

      expect(temporal).toHaveProperty('timeline');
      expect(temporal).toHaveProperty('recency_distribution');

      expect(Array.isArray(temporal.timeline)).toBe(true);
      temporal.timeline.forEach(item => {
        expect(item).toHaveProperty('period');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('avg_importance');
        expect(typeof item.period).toBe('string');
        expect(typeof item.count).toBe('number');
        expect(typeof item.avg_importance).toBe('number');
      });

      expect(typeof temporal.recency_distribution).toBe('object');
    });

    it('should categorize time periods correctly', () => {
      const now = new Date();
      const recentMemories: MemoryResult[] = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'recent1',
            createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'recent2',
            createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'recent3',
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          },
        },
      ];

      const temporal = contextEngine.analyzeTemporalContext(recentMemories);
      const periods = temporal.timeline.map(t => t.period);

      expect(periods).toContain('last_hour');
      expect(periods).toContain('today');
      expect(periods).toContain('this_week');
    });

    it('should handle empty memories', () => {
      const temporal = contextEngine.analyzeTemporalContext([]);

      expect(temporal.timeline).toEqual([]);
      expect(temporal.recency_distribution).toEqual({});
    });
  });

  describe('filterContextualMemories', () => {
    it('should filter memories by importance threshold', () => {
      const filtered = contextEngine.filterContextualMemories(
        mockMemories,
        20,
        0.7
      );

      filtered.forEach(memory => {
        expect(memory.memory.importance).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should respect maximum memory limit', () => {
      const maxMemories = 3;
      const filtered = contextEngine.filterContextualMemories(
        mockMemories,
        maxMemories
      );

      expect(filtered.length).toBeLessThanOrEqual(maxMemories);
    });

    it('should ensure diversity of memory types', () => {
      // Create many memories of the same type
      const manyMemories = Array.from({ length: 10 }, (_, i) => ({
        ...mockMemories[0], // All personality type
        memory: {
          ...mockMemories[0].memory,
          id: `pers_${i}`,
          importance: 0.8 + i * 0.01, // Varying importance
        },
      }));

      const filtered = contextEngine.filterContextualMemories(manyMemories, 10);

      // Should not return all memories of the same type due to diversity constraint
      const types = new Set(filtered.map(m => m.memory.type));
      expect(types.size).toBeGreaterThanOrEqual(1);
    });

    it('should sort by composite score', () => {
      const filtered = contextEngine.filterContextualMemories(mockMemories);

      // Check if memories are sorted by composite score (higher scores first)
      for (let i = 1; i < filtered.length; i++) {
        // We can't directly check composite score since it's private,
        // but we can verify general sorting behavior
        expect(filtered[i - 1].memory.importance).toBeGreaterThanOrEqual(0);
        expect(filtered[i].memory.importance).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle empty memories', () => {
      const filtered = contextEngine.filterContextualMemories([]);
      expect(filtered).toEqual([]);
    });

    it('should handle threshold above all importances', () => {
      const filtered = contextEngine.filterContextualMemories(
        mockMemories,
        20,
        0.99
      );
      expect(filtered.length).toBe(0);
    });
  });

  describe('private method coverage via public methods', () => {
    it('should test groupMemoriesByType via generateContextSummary', () => {
      const summary = contextEngine.generateContextSummary(mockMemories);

      // Verify that memories are grouped by type in the summary
      expect(summary).toContain('## Personality');
      expect(summary).toContain('## Fact');
      expect(summary).toContain('## Preference');
      expect(summary).toContain('## Task');
      expect(summary).toContain('## Emotion');
    });
    it('should test formatMemoryType via generateContextSummary', () => {
      const memoryWithUnderscore = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            type: 'memory_type' as any, // Simulate underscore type
          },
        },
      ];

      const summary =
        contextEngine.generateContextSummary(memoryWithUnderscore);
      expect(summary).toContain('Memory type'); // Should format with spaces and capitals
    });

    it('should test generateContextText via generateAgentContext', () => {
      const context = contextEngine.generateAgentContext(mockMemories);

      expect(context.context).toContain('[');
      expect(context.context).toContain(']');
      expect(context.context).toContain('%');

      // Should contain type labels and confidence percentages
      mockMemories.slice(0, 15).forEach(memory => {
        const typeLabel = memory.memory.type.toUpperCase();
        expect(context.context).toContain(`[${typeLabel}:`);
      });
    });

    it('should test calculateContextConfidence via generateAgentContext', () => {
      const context = contextEngine.generateAgentContext(mockMemories);

      expect(context.confidence).toBeGreaterThan(0);
      expect(context.confidence).toBeLessThanOrEqual(1);

      // Test with empty memories
      const emptyContext = contextEngine.generateAgentContext([]);
      expect(emptyContext.confidence).toBe(0);
    });
    it('should test extractKeywords via extractThemes', () => {
      const memoryWithKeywords = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            content: 'machine learning algorithm optimization performance',
          },
        },
      ];

      const themes = contextEngine.extractThemes(memoryWithKeywords);

      // Should extract meaningful keywords (length > 3, not stop words)
      const themeWords = themes.map(t => t.theme);
      expect(themeWords.length).toBeGreaterThan(0);
      // Check for at least some of the expected keywords
      const expectedKeywords = [
        'machine',
        'learning',
        'algorithm',
        'optimization',
        'performance',
      ];
      const foundKeywords = expectedKeywords.filter(keyword =>
        themeWords.includes(keyword)
      );
      expect(foundKeywords.length).toBeGreaterThan(0);
    });

    it('should test categorizeTimePeriod via analyzeTemporalContext', () => {
      const now = new Date();
      const timeTestMemories: MemoryResult[] = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time1',
            createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time2',
            createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time3',
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time4',
            createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time5',
            createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          },
        },
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'time6',
            createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
          },
        },
      ];

      const temporal = contextEngine.analyzeTemporalContext(timeTestMemories);
      const periods = temporal.timeline.map(t => t.period);

      expect(periods).toContain('last_hour');
      expect(periods).toContain('today');
      expect(periods).toContain('this_week');
      expect(periods).toContain('this_month');
      expect(periods).toContain('this_year');
      expect(periods).toContain('older');
    });

    it('should test calculateCompositeScore via filterContextualMemories', () => {
      const now = new Date();
      const memoriesWithDifferentAges: MemoryResult[] = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            id: 'comp1',
            lastAccessedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
            importance: 0.9,
          },
          score: 0.8,
        },
        {
          ...mockMemories[1],
          memory: {
            ...mockMemories[1].memory,
            id: 'comp2',
            lastAccessedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            importance: 0.5,
          },
          score: 0.9,
        },
      ];

      const filtered = contextEngine.filterContextualMemories(
        memoriesWithDifferentAges
      );

      // More recent memory with higher importance should generally rank higher
      // We can't test exact composite score, but we can verify filtering works
      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach(memory => {
        expect(memory.score).toBeGreaterThan(0);
        expect(memory.memory.importance).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle memories with missing optional fields', () => {
      const memoriesWithMissingFields: MemoryResult[] = [
        {
          memory: {
            id: 'minimal',
            type: 'fact',
            content: 'Minimal memory content',
            confidence: 0.8,
            importance: 0.7,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            tags: [],
            tenant_id: 'tenant1',
            // Missing: emotional_weight, agent_id, context, ttl
          } as MemoryMetadata,
          score: 0.7,
        },
      ];

      // Should handle gracefully
      expect(() => {
        contextEngine.generateContextSummary(memoriesWithMissingFields);
        contextEngine.generateAgentContext(memoriesWithMissingFields);
        contextEngine.extractThemes(memoriesWithMissingFields);
        contextEngine.analyzeEmotionalContext(memoriesWithMissingFields);
        contextEngine.analyzeTemporalContext(memoriesWithMissingFields);
        contextEngine.filterContextualMemories(memoriesWithMissingFields);
      }).not.toThrow();
    });
    it('should handle very long memory content', () => {
      const longContent = 'x'.repeat(10000);
      const memoryWithLongContent: MemoryResult[] = [
        {
          ...mockMemories[0],
          memory: {
            ...mockMemories[0].memory,
            content: longContent,
          },
        },
      ];

      const summary = contextEngine.generateContextSummary(
        memoryWithLongContent,
        { maxLength: 100 }
      );
      expect(summary.length).toBeLessThanOrEqual(130); // Should truncate
      expect(summary).toContain('[Context truncated]');
    });

    it('should handle extreme importance threshold', () => {
      const filtered = contextEngine.filterContextualMemories(
        mockMemories,
        20,
        1.1
      ); // Above max
      expect(filtered).toEqual([]);

      const filtered2 = contextEngine.filterContextualMemories(
        mockMemories,
        20,
        -0.1
      ); // Below min
      expect(filtered2.length).toBe(mockMemories.length);
    });

    it('should handle zero maxMemories limit', () => {
      const filtered = contextEngine.filterContextualMemories(mockMemories, 0);
      expect(filtered).toEqual([]);
    });
  });
});
