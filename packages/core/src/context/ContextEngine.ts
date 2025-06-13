import type { MemoryResult, ContextResponse } from '../types/index.js';

export interface ContextSummaryOptions {
  maxLength?: number;
  includeScore?: boolean;
  includeTimestamp?: boolean;
}

export class ContextEngine {
  /**
   * Generate a comprehensive context summary from memories
   */
  public generateContextSummary(
    memories: MemoryResult[], 
    options: ContextSummaryOptions = {}
  ): string {
    if (memories.length === 0) {
      return 'No relevant context available.';
    }

    const { maxLength = 2000, includeScore = false, includeTimestamp = false } = options;

    let summary = '';
    
    // Group memories by type
    const groupedMemories = this.groupMemoriesByType(memories);
    
    for (const [type, typeMemories] of Object.entries(groupedMemories)) {
      summary += `\n## ${this.formatMemoryType(type)}\n`;
      
      for (const memory of typeMemories.slice(0, 5)) { // Limit per type
        const prefix = includeScore ? `[${memory.score.toFixed(2)}] ` : '';
        const timestamp = includeTimestamp 
          ? ` (${memory.memory.createdAt.toLocaleDateString()})` 
          : '';
        
        summary += `- ${prefix}${memory.memory.content}${timestamp}\n`;
        
        if (summary.length > maxLength) {
          summary = summary.substring(0, maxLength) + '...\n[Context truncated]';
          break;
        }
      }
    }

    return summary.trim();
  }

  /**
   * Generate structured context for agent consumption
   */  public generateAgentContext(memories: MemoryResult[]): ContextResponse {
    const contextText = this.generateContextText(memories);
    const summary = this.generateContextSummary(memories);
    const confidence = this.calculateContextConfidence(memories);

    return {
      context: contextText,
      memories,
      summary,
      confidence,
      generated_at: new Date(),
      total_count: memories.length,
      context_summary: summary,
    };
  }

  /**
   * Extract key themes from memories
   */
  public extractThemes(memories: MemoryResult[]): Array<{
    theme: string;
    frequency: number;
    importance: number;
  }> {
    const themes = new Map<string, { frequency: number; importance: number }>();

    for (const memory of memories) {
      const keywords = this.extractKeywords(memory.memory.content);
      
      for (const keyword of keywords) {
        const existing = themes.get(keyword) || { frequency: 0, importance: 0 };
        themes.set(keyword, {
          frequency: existing.frequency + 1,
          importance: Math.max(existing.importance, memory.memory.importance),
        });
      }
    }

    return Array.from(themes.entries())
      .map(([theme, data]) => ({
        theme,
        frequency: data.frequency,
        importance: data.importance,
      }))
      .sort((a, b) => (b.frequency * b.importance) - (a.frequency * a.importance))
      .slice(0, 10); // Top 10 themes
  }

  /**
   * Detect emotional context from memories
   */
  public analyzeEmotionalContext(memories: MemoryResult[]): {
    overall_sentiment: 'positive' | 'neutral' | 'negative';
    emotional_weight: number;
    emotional_distribution: Record<string, number>;
  } {
    const emotionalWeights = memories
      .map(m => m.memory.emotional_weight)
      .filter((weight): weight is number => weight !== undefined);

    if (emotionalWeights.length === 0) {
      return {
        overall_sentiment: 'neutral',
        emotional_weight: 0,
        emotional_distribution: {},
      };
    }

    const avgWeight = emotionalWeights.reduce((sum, w) => sum + w, 0) / emotionalWeights.length;
    
    let sentiment: 'positive' | 'neutral' | 'negative';
    if (avgWeight > 0.2) {
      sentiment = 'positive';
    } else if (avgWeight < -0.2) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // Simple emotional distribution
    const distribution: Record<string, number> = {
      positive: emotionalWeights.filter(w => w > 0.2).length,
      neutral: emotionalWeights.filter(w => w >= -0.2 && w <= 0.2).length,
      negative: emotionalWeights.filter(w => w < -0.2).length,
    };

    return {
      overall_sentiment: sentiment,
      emotional_weight: avgWeight,
      emotional_distribution: distribution,
    };
  }

  /**
   * Generate time-based context analysis
   */
  public analyzeTemporalContext(memories: MemoryResult[]): {
    timeline: Array<{
      period: string;
      count: number;
      avg_importance: number;
    }>;
    recency_distribution: Record<string, number>;
  } {
    const now = new Date();
    const timeline = new Map<string, { count: number; importance: number }>();

    for (const memory of memories) {
      const age = now.getTime() - memory.memory.createdAt.getTime();
      const period = this.categorizeTimePeriod(age);
      
      const existing = timeline.get(period) || { count: 0, importance: 0 };
      timeline.set(period, {
        count: existing.count + 1,
        importance: existing.importance + memory.memory.importance,
      });
    }

    const timelineArray = Array.from(timeline.entries()).map(([period, data]) => ({
      period,
      count: data.count,
      avg_importance: data.count > 0 ? data.importance / data.count : 0,
    }));

    const recencyDistribution: Record<string, number> = {};
    for (const item of timelineArray) {
      recencyDistribution[item.period] = item.count;
    }

    return {
      timeline: timelineArray,
      recency_distribution: recencyDistribution,
    };
  }

  /**
   * Smart context filtering based on relevance and importance
   */
  public filterContextualMemories(
    memories: MemoryResult[],
    maxMemories = 20,
    importanceThreshold = 0.3
  ): MemoryResult[] {
    // Filter by importance threshold
    let filtered = memories.filter(m => m.memory.importance >= importanceThreshold);
    
    // Sort by composite score (similarity + importance + recency)
    filtered = filtered.sort((a, b) => {
      const scoreA = this.calculateCompositeScore(a);
      const scoreB = this.calculateCompositeScore(b);
      return scoreB - scoreA;
    });

    // Ensure diversity of memory types
    const diverseMemories: MemoryResult[] = [];
    const typeCount = new Map<string, number>();
    const maxPerType = Math.max(1, Math.floor(maxMemories / 5)); // Max per type

    for (const memory of filtered) {
      const currentCount = typeCount.get(memory.memory.type) || 0;
      
      if (currentCount < maxPerType && diverseMemories.length < maxMemories) {
        diverseMemories.push(memory);
        typeCount.set(memory.memory.type, currentCount + 1);
      }
    }

    // Fill remaining slots with any high-scoring memories
    for (const memory of filtered) {
      if (diverseMemories.length >= maxMemories) break;
      if (!diverseMemories.includes(memory)) {
        diverseMemories.push(memory);
      }
    }

    return diverseMemories.slice(0, maxMemories);
  }

  private groupMemoriesByType(memories: MemoryResult[]): Record<string, MemoryResult[]> {
    return memories.reduce((groups, memory) => {
      const type = memory.memory.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type]!.push(memory);
      return groups;
    }, {} as Record<string, MemoryResult[]>);
  }

  private formatMemoryType(type: string): string {
    const formatted = type.charAt(0).toUpperCase() + type.slice(1);
    return formatted.replace(/_/g, ' ');
  }

  private generateContextText(memories: MemoryResult[]): string {
    if (memories.length === 0) {
      return '';
    }

    const filtered = this.filterContextualMemories(memories, 15);
    
    return filtered
      .map(m => {
        const typeLabel = m.memory.type.toUpperCase();
        const confidence = (m.score * 100).toFixed(0);
        return `[${typeLabel}:${confidence}%] ${m.memory.content}`;
      })
      .join('\n\n');
  }

  private calculateContextConfidence(memories: MemoryResult[]): number {
    if (memories.length === 0) {
      return 0;
    }

    // Weighted average of memory scores and confidence
    const weightedSum = memories.reduce((sum, m) => {
      const weight = m.memory.importance;
      return sum + (m.score * m.memory.confidence * weight);
    }, 0);

    const totalWeight = memories.reduce((sum, m) => sum + m.memory.importance, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Filter out common stop words
    const stopWords = new Set([
      'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
      'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
      'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
      'such', 'take', 'than', 'them', 'well', 'were',
    ]);

    return words
      .filter(word => !stopWords.has(word))
      .slice(0, 5); // Top 5 keywords
  }

  private categorizeTimePeriod(ageMs: number): string {
    const minutes = ageMs / (1000 * 60);
    const hours = minutes / 60;
    const days = hours / 24;
    const weeks = days / 7;

    if (minutes < 60) return 'last_hour';
    if (hours < 24) return 'today';
    if (days < 7) return 'this_week';
    if (weeks < 4) return 'this_month';
    if (days < 365) return 'this_year';
    return 'older';
  }

  private calculateCompositeScore(memory: MemoryResult): number {
    const now = new Date();
    const ageInDays = (now.getTime() - memory.memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recency factor (more recent = higher score)
    const recencyFactor = Math.exp(-ageInDays / 30); // 30-day decay
    
    // Composite score combining similarity, importance, and recency
    return (
      memory.score * 0.5 +           // Semantic similarity
      memory.memory.importance * 0.3 + // Content importance
      recencyFactor * 0.2             // Recency bonus
    );
  }
}
