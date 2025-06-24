/**
 * Advanced Pattern Recognition System
 * Detects patterns, trends, and relationships in memory data
 */

import { MemoryMetadata, MemoryResult } from '../types/index';

export interface MemoryPattern {
  id: string;
  type: 'temporal' | 'semantic' | 'behavioral' | 'relationship' | 'frequency';
  description: string;
  confidence: number;
  memories: string[]; // memory IDs
  metadata: {
    frequency?: number;
    timeRange?: {
      start: Date;
      end: Date;
    };
    keywords?: string[];
    entities?: string[];
    relationships?: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }>;
  };
  insights: string[];
  predictedOutcomes?: string[];
}

export interface PatternAnalysisConfig {
  minConfidence: number;
  maxPatterns: number;
  timeWindowDays: number;
  semanticThreshold: number;
  enablePrediction: boolean;
}

export class PatternRecognitionEngine {
  private config: PatternAnalysisConfig;

  constructor(config: Partial<PatternAnalysisConfig> = {}) {
    this.config = {
      minConfidence: 0.7,
      maxPatterns: 50,
      timeWindowDays: 30,
      semanticThreshold: 0.8,
      enablePrediction: true,
      ...config
    };
  }

  /**
   * Analyze memories to detect patterns
   */
  async analyzePatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Temporal pattern analysis
    const temporalPatterns = await this.detectTemporalPatterns(memories);
    patterns.push(...temporalPatterns);

    // Semantic pattern analysis
    const semanticPatterns = await this.detectSemanticPatterns(memories);
    patterns.push(...semanticPatterns);

    // Behavioral pattern analysis
    const behavioralPatterns = await this.detectBehavioralPatterns(memories);
    patterns.push(...behavioralPatterns);

    // Relationship pattern analysis
    const relationshipPatterns = await this.detectRelationshipPatterns(memories);
    patterns.push(...relationshipPatterns);

    // Frequency pattern analysis
    const frequencyPatterns = await this.detectFrequencyPatterns(memories);
    patterns.push(...frequencyPatterns);

    // Filter by confidence and limit
    return patterns
      .filter(pattern => pattern.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxPatterns);
  }

  /**
   * Detect temporal patterns in memory access and creation
   */
  private async detectTemporalPatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];
    const now = new Date();
    const timeWindow = new Date(now.getTime() - this.config.timeWindowDays * 24 * 60 * 60 * 1000);

    // Group memories by time periods
    const hourlyActivity = new Map<number, MemoryMetadata[]>();
    const dailyActivity = new Map<string, MemoryMetadata[]>();
    
    memories
      .filter(memory => memory.createdAt >= timeWindow)
      .forEach(memory => {
        const hour = memory.createdAt.getHours();
        const day = memory.createdAt.toDateString();

        if (!hourlyActivity.has(hour)) {
          hourlyActivity.set(hour, []);
        }
        hourlyActivity.get(hour)!.push(memory);

        if (!dailyActivity.has(day)) {
          dailyActivity.set(day, []);
        }
        dailyActivity.get(day)!.push(memory);
      });

    // Detect peak activity hours
    const peakHours = Array.from(hourlyActivity.entries())
      .filter(([_, mems]) => mems.length > 5)
      .sort(([_, a], [__, b]) => b.length - a.length)
      .slice(0, 3);

    for (const [hour, mems] of peakHours) {
      patterns.push({
        id: `temporal_peak_${hour}`,
        type: 'temporal',
        description: `Peak memory activity at ${hour}:00 (${mems.length} memories)`,
        confidence: Math.min(0.9, mems.length / 20),
        memories: mems.map(m => m.id),
        metadata: {
          frequency: mems.length,
          timeRange: {
            start: timeWindow,
            end: now
          }
        },
        insights: [
          `Users are most active around ${hour}:00`,
          `Consider optimizing system performance for this time`,
          `Memory creation peaks during ${hour}:00-${hour + 1}:00`
        ],
        predictedOutcomes: this.config.enablePrediction ? [
          `Next peak activity expected around ${hour}:00 tomorrow`,
          `System load will increase by ~${Math.round(mems.length * 1.1)} memories`
        ] : undefined
      });
    }

    return patterns;
  }

  /**
   * Detect semantic patterns in memory content
   */
  private async detectSemanticPatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];
    
    // Group by content similarity and tags
    const tagGroups = new Map<string, MemoryMetadata[]>();
    const typeGroups = new Map<string, MemoryMetadata[]>();

    memories.forEach(memory => {
      // Group by tags
      memory.tags.forEach(tag => {
        if (!tagGroups.has(tag)) {
          tagGroups.set(tag, []);
        }
        tagGroups.get(tag)!.push(memory);
      });

      // Group by type
      if (!typeGroups.has(memory.type)) {
        typeGroups.set(memory.type, []);
      }
      typeGroups.get(memory.type)!.push(memory);
    });

    // Analyze tag patterns
    for (const [tag, mems] of tagGroups.entries()) {
      if (mems.length >= 3) {
        const avgImportance = mems.reduce((sum, m) => sum + m.importance, 0) / mems.length;
        
        patterns.push({
          id: `semantic_tag_${tag}`,
          type: 'semantic',
          description: `Semantic cluster around "${tag}" (${mems.length} memories)`,
          confidence: Math.min(0.95, mems.length / 10),
          memories: mems.map(m => m.id),
          metadata: {
            keywords: [tag],
            frequency: mems.length
          },
          insights: [
            `Strong semantic clustering around "${tag}"`,
            `Average importance: ${avgImportance.toFixed(2)}`,
            `Related memories often accessed together`
          ],
          predictedOutcomes: this.config.enablePrediction ? [
            `Future memories likely to be tagged with "${tag}"`,
            `Consider creating automated workflows for "${tag}" memories`
          ] : undefined
        });
      }
    }

    return patterns;
  }

  /**
   * Detect behavioral patterns in memory usage
   */
  private async detectBehavioralPatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Analyze access patterns
    const highAccessMemories = memories
      .filter(memory => memory.accessCount > 10)
      .sort((a, b) => b.accessCount - a.accessCount);

    if (highAccessMemories.length > 0) {
      patterns.push({
        id: 'behavioral_high_access',
        type: 'behavioral',
        description: `High-access memory pattern (${highAccessMemories.length} frequently accessed memories)`,
        confidence: 0.85,
        memories: highAccessMemories.slice(0, 10).map(m => m.id),
        metadata: {
          frequency: highAccessMemories.reduce((sum, m) => sum + m.accessCount, 0)
        },
        insights: [
          'Certain memories are accessed significantly more than others',
          'Consider caching these high-access memories',
          'Users show consistent preference for specific information'
        ],
        predictedOutcomes: this.config.enablePrediction ? [
          'These memories will continue to be accessed frequently',
          'System should prioritize quick access to these memories'
        ] : undefined
      });
    }

    return patterns;
  }

  /**
   * Detect relationship patterns between memories
   */
  private async detectRelationshipPatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Analyze co-occurrence of memories by agent_id
    const agentGroups = new Map<string, MemoryMetadata[]>();
    memories
      .filter(memory => memory.agent_id)
      .forEach(memory => {
        const agentId = memory.agent_id!;
        if (!agentGroups.has(agentId)) {
          agentGroups.set(agentId, []);
        }
        agentGroups.get(agentId)!.push(memory);
      });

    for (const [agentId, mems] of agentGroups.entries()) {
      if (mems.length >= 5) {
        const relationships = this.analyzeMemoryRelationships(mems);
        
        patterns.push({
          id: `relationship_agent_${agentId}`,
          type: 'relationship',
          description: `Agent memory relationship pattern (${mems.length} memories for agent ${agentId})`,
          confidence: Math.min(0.9, mems.length / 20),
          memories: mems.map(m => m.id),
          metadata: {
            relationships,
            entities: [agentId]
          },
          insights: [
            `Agent ${agentId} has strong memory interconnections`,
            `Memory types show consistent patterns`,
            `Cross-referenced memories indicate complex workflows`
          ],
          predictedOutcomes: this.config.enablePrediction ? [
            `Agent ${agentId} will continue similar memory patterns`,
            'Related memories should be pre-loaded together'
          ] : undefined
        });
      }
    }

    return patterns;
  }

  /**
   * Detect frequency patterns in memory creation and access
   */
  private async detectFrequencyPatterns(memories: MemoryMetadata[]): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Analyze creation frequency by type
    const typeFrequency = new Map<string, number>();
    memories.forEach(memory => {
      typeFrequency.set(memory.type, (typeFrequency.get(memory.type) || 0) + 1);
    });

    const dominantTypes = Array.from(typeFrequency.entries())
      .filter(([_, count]) => count > 5)
      .sort(([_, a], [__, b]) => b - a);

    for (const [type, count] of dominantTypes) {
      const typeMemories = memories.filter(m => m.type === type);
      
      patterns.push({
        id: `frequency_type_${type}`,
        type: 'frequency',
        description: `High frequency pattern for "${type}" memories (${count} instances)`,
        confidence: Math.min(0.9, count / 50),
        memories: typeMemories.slice(0, 10).map(m => m.id),
        metadata: {
          frequency: count,
          keywords: [type]
        },
        insights: [
          `"${type}" is the most common memory type`,
          `System optimized for ${type} memory handling`,
          `Users heavily rely on ${type} information`
        ],
        predictedOutcomes: this.config.enablePrediction ? [
          `Continue expecting high volume of "${type}" memories`,
          `Consider specialized handling for "${type}" memories`
        ] : undefined
      });
    }

    return patterns;
  }

  /**
   * Analyze relationships between memories
   */
  private analyzeMemoryRelationships(memories: MemoryMetadata[]): Array<{
    source: string;
    target: string;
    type: string;
    strength: number;
  }> {
    const relationships: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
    }> = [];

    // Simple relationship detection based on shared tags and similar content
    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memA = memories[i];
        const memB = memories[j];

        // Tag overlap
        const sharedTags = memA.tags.filter(tag => memB.tags.includes(tag));
        if (sharedTags.length > 0) {
          relationships.push({
            source: memA.id,
            target: memB.id,
            type: 'shared_tags',
            strength: sharedTags.length / Math.max(memA.tags.length, memB.tags.length)
          });
        }

        // Type similarity
        if (memA.type === memB.type) {
          relationships.push({
            source: memA.id,
            target: memB.id,
            type: 'same_type',
            strength: 0.6
          });
        }

        // Temporal proximity (created within 1 hour)
        const timeDiff = Math.abs(memA.createdAt.getTime() - memB.createdAt.getTime());
        if (timeDiff < 60 * 60 * 1000) { // 1 hour
          relationships.push({
            source: memA.id,
            target: memB.id,
            type: 'temporal_proximity',
            strength: 1 - (timeDiff / (60 * 60 * 1000))
          });
        }
      }
    }

    return relationships.filter(rel => rel.strength > 0.3);
  }

  /**
   * Generate insights from detected patterns
   */
  async generateInsights(patterns: MemoryPattern[]): Promise<{
    summary: string;
    recommendations: string[];
    trends: string[];
    predictions: string[];
  }> {
    const insights = {
      summary: '',
      recommendations: [],
      trends: [],
      predictions: []
    } as {
      summary: string;
      recommendations: string[];
      trends: string[];
      predictions: string[];
    };

    if (patterns.length === 0) {
      insights.summary = 'No significant patterns detected in the current memory dataset.';
      return insights;
    }

    // Generate summary
    const patternTypes = patterns.reduce((acc, pattern) => {
      acc[pattern.type] = (acc[pattern.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    insights.summary = `Detected ${patterns.length} patterns across ${Object.keys(patternTypes).length} categories. ` +
      `Strongest patterns: ${patterns.slice(0, 3).map(p => p.type).join(', ')}.`;

    // Extract unique insights
    const allInsights = patterns.flatMap(p => p.insights);
    insights.trends = [...new Set(allInsights)];

    // Extract predictions
    const allPredictions = patterns
      .filter(p => p.predictedOutcomes)
      .flatMap(p => p.predictedOutcomes!);
    insights.predictions = [...new Set(allPredictions)];

    // Generate recommendations
    insights.recommendations.push(
      'Optimize caching for high-frequency patterns',
      'Consider automated categorization for semantic clusters',
      'Implement predictive pre-loading for temporal patterns',
      'Create specialized workflows for dominant memory types'
    );

    return insights;
  }
}
