/**
 * Relationship Extraction Engine
 * Automatically identifies and extracts relationships between memory entities
 */

import OpenAI from 'openai';
import { MemoryMetadata, MemoryType } from '../types/index';

export interface AIMemoryRelationship {
  id: string;
  sourceMemoryId: string;
  targetMemoryId: string;
  relationshipType: RelationshipType;
  strength: number; // 0-1 scale
  confidence: number;
  description: string;
  extractedAt: Date;
  metadata: {
    keywords?: string[];
    context?: string;
    evidence?: string[];
  };
}

export type RelationshipType =
  | 'causal' // A causes B
  | 'temporal' // A happens before/after B
  | 'semantic' // A is similar/related to B
  | 'hierarchical' // A is parent/child of B
  | 'contradictory' // A contradicts B
  | 'supportive' // A supports/reinforces B
  | 'contextual' // A provides context for B
  | 'sequential' // A follows B in sequence
  | 'associative' // A is associated with B
  | 'comparative'; // A compares to B

export interface RelationshipExtractionConfig {
  openaiApiKey?: string;
  model: string;
  minConfidence: number;
  maxRelationshipsPerMemory: number;
  enableSemanticAnalysis: boolean;
  enableTemporalAnalysis: boolean;
  semanticThreshold: number;
}

export class RelationshipExtractor {
  private openai?: OpenAI;
  private config: RelationshipExtractionConfig;

  constructor(config: Partial<RelationshipExtractionConfig> = {}) {
    this.config = {
      model: 'gpt-4o-mini',
      minConfidence: 0.6,
      maxRelationshipsPerMemory: 10,
      enableSemanticAnalysis: true,
      enableTemporalAnalysis: true,
      semanticThreshold: 0.7,
      ...config,
    };

    if (this.config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: this.config.openaiApiKey,
      });
    }
  }

  /**
   * Extract relationships from a set of memories
   */
  async extractRelationships(
    memories: MemoryMetadata[]
  ): Promise<AIMemoryRelationship[]> {
    const relationships: AIMemoryRelationship[] = [];

    // Extract relationships using multiple methods
    if (this.config.enableSemanticAnalysis) {
      const semanticRelationships =
        await this.extractSemanticRelationships(memories);
      relationships.push(...semanticRelationships);
    }

    if (this.config.enableTemporalAnalysis) {
      const temporalRelationships =
        await this.extractTemporalRelationships(memories);
      relationships.push(...temporalRelationships);
    }

    // AI-powered relationship extraction if OpenAI is available
    if (this.openai) {
      const aiRelationships = await this.extractAIRelationships(memories);
      relationships.push(...aiRelationships);
    }

    // Deduplicate and filter by confidence
    const uniqueRelationships = this.deduplicateRelationships(relationships);

    return uniqueRelationships
      .filter(rel => rel.confidence >= this.config.minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract semantic relationships based on content similarity and tags
   */
  private async extractSemanticRelationships(
    memories: MemoryMetadata[]
  ): Promise<AIMemoryRelationship[]> {
    const relationships: AIMemoryRelationship[] = [];

    for (let i = 0; i < memories.length; i++) {
      for (let j = i + 1; j < memories.length; j++) {
        const memA = memories[i];
        const memB = memories[j];

        // Skip if same memory
        if (memA.id === memB.id) continue;

        // Tag-based relationships
        const sharedTags = memA.tags.filter(tag => memB.tags.includes(tag));
        if (sharedTags.length > 0) {
          const strength =
            sharedTags.length / Math.max(memA.tags.length, memB.tags.length);
          const confidence = Math.min(0.9, strength + 0.2);

          if (confidence >= this.config.semanticThreshold) {
            relationships.push({
              id: `semantic_${memA.id}_${memB.id}`,
              sourceMemoryId: memA.id,
              targetMemoryId: memB.id,
              relationshipType: 'semantic',
              strength,
              confidence,
              description: `Related through shared tags: ${sharedTags.join(', ')}`,
              extractedAt: new Date(),
              metadata: {
                keywords: sharedTags,
                evidence: [`Shared tags: ${sharedTags.join(', ')}`],
              },
            });
          }
        }

        // Content similarity (basic keyword matching)
        const contentSimilarity = this.calculateContentSimilarity(
          memA.content,
          memB.content
        );
        if (contentSimilarity > this.config.semanticThreshold) {
          relationships.push({
            id: `content_${memA.id}_${memB.id}`,
            sourceMemoryId: memA.id,
            targetMemoryId: memB.id,
            relationshipType: 'semantic',
            strength: contentSimilarity,
            confidence: contentSimilarity,
            description: `Similar content patterns detected`,
            extractedAt: new Date(),
            metadata: {
              evidence: [
                `Content similarity score: ${contentSimilarity.toFixed(2)}`,
              ],
            },
          });
        }

        // Type-based relationships
        if (memA.type === memB.type) {
          relationships.push({
            id: `type_${memA.id}_${memB.id}`,
            sourceMemoryId: memA.id,
            targetMemoryId: memB.id,
            relationshipType: 'associative',
            strength: 0.6,
            confidence: 0.7,
            description: `Both memories are of type: ${memA.type}`,
            extractedAt: new Date(),
            metadata: {
              keywords: [memA.type],
              evidence: [`Same memory type: ${memA.type}`],
            },
          });
        }
      }

      // Limit relationships per memory
      if (relationships.length > this.config.maxRelationshipsPerMemory * i) {
        break;
      }
    }

    return relationships;
  }

  /**
   * Extract temporal relationships based on timestamps
   */
  private async extractTemporalRelationships(
    memories: MemoryMetadata[]
  ): Promise<AIMemoryRelationship[]> {
    const relationships: AIMemoryRelationship[] = [];

    // Sort memories by creation time
    const sortedMemories = [...memories].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    for (let i = 0; i < sortedMemories.length - 1; i++) {
      const currentMemory = sortedMemories[i];
      const nextMemory = sortedMemories[i + 1];

      const timeDiff =
        nextMemory.createdAt.getTime() - currentMemory.createdAt.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // Close temporal proximity (within 4 hours)
      if (hoursDiff <= 4) {
        const strength = 1 - hoursDiff / 4; // Closer = stronger
        const confidence = 0.8;

        relationships.push({
          id: `temporal_${currentMemory.id}_${nextMemory.id}`,
          sourceMemoryId: currentMemory.id,
          targetMemoryId: nextMemory.id,
          relationshipType: 'temporal',
          strength,
          confidence,
          description: `Created ${hoursDiff.toFixed(1)} hours apart`,
          extractedAt: new Date(),
          metadata: {
            context: `Temporal sequence with ${hoursDiff.toFixed(1)} hour gap`,
            evidence: [
              `Created at ${currentMemory.createdAt.toISOString()}`,
              `Followed by ${nextMemory.createdAt.toISOString()}`,
            ],
          },
        });
      }

      // Sequential patterns (same agent, close timing, similar types)
      if (
        currentMemory.agent_id === nextMemory.agent_id &&
        currentMemory.agent_id &&
        hoursDiff <= 1 &&
        this.areTypesRelated(currentMemory.type, nextMemory.type)
      ) {
        relationships.push({
          id: `sequential_${currentMemory.id}_${nextMemory.id}`,
          sourceMemoryId: currentMemory.id,
          targetMemoryId: nextMemory.id,
          relationshipType: 'sequential',
          strength: 0.9,
          confidence: 0.85,
          description: `Sequential workflow step for agent ${currentMemory.agent_id}`,
          extractedAt: new Date(),
          metadata: {
            context: `Agent workflow sequence`,
            keywords: [currentMemory.agent_id],
            evidence: [
              `Same agent: ${currentMemory.agent_id}`,
              `Close timing: ${hoursDiff.toFixed(1)} hours`,
            ],
          },
        });
      }
    }

    return relationships;
  }

  /**
   * Extract relationships using AI analysis
   */
  private async extractAIRelationships(
    memories: MemoryMetadata[]
  ): Promise<AIMemoryRelationship[]> {
    if (!this.openai) return [];

    const relationships: AIMemoryRelationship[] = [];

    // Process memories in batches to avoid token limits
    const batchSize = 5;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      try {
        const prompt = this.buildRelationshipPrompt(batch);
        const response = await this.openai.chat.completions.create({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert at analyzing relationships between pieces of information. Identify meaningful relationships between memory entries.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        });

        const aiAnalysis = response.choices[0]?.message?.content;
        if (aiAnalysis) {
          const extractedRelationships = this.parseAIRelationships(
            aiAnalysis,
            batch
          );
          relationships.push(...extractedRelationships);
        }
      } catch (error) {
        console.warn('AI relationship extraction failed:', error);
      }
    }

    return relationships;
  }

  /**
   * Build prompt for AI relationship extraction
   */
  private buildRelationshipPrompt(memories: MemoryMetadata[]): string {
    const memoryDescriptions = memories
      .map(
        (memory, index) =>
          `Memory ${index + 1} (ID: ${memory.id}):\n` +
          `Type: ${memory.type}\n` +
          `Content: ${memory.content}\n` +
          `Tags: ${memory.tags.join(', ')}\n` +
          `Created: ${memory.createdAt.toISOString()}\n` +
          `Importance: ${memory.importance}\n`
      )
      .join('\n---\n');

    return `Analyze the following memories and identify meaningful relationships between them:

${memoryDescriptions}

For each relationship you identify, provide:
1. Source memory ID and target memory ID
2. Relationship type (causal, temporal, semantic, hierarchical, contradictory, supportive, contextual, sequential, associative, comparative)
3. Strength (0.0-1.0)
4. Confidence (0.0-1.0)
5. Brief description

Format your response as JSON array with this structure:
[
  {
    "sourceId": "memory_id",
    "targetId": "memory_id", 
    "type": "relationship_type",
    "strength": 0.8,
    "confidence": 0.9,
    "description": "Brief explanation"
  }
]

Only include relationships with confidence >= 0.6.`;
  }

  /**
   * Parse AI response into relationships
   */
  private parseAIRelationships(
    aiResponse: string,
    memories: MemoryMetadata[]
  ): AIMemoryRelationship[] {
    const relationships: AIMemoryRelationship[] = [];

    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return relationships;

      const parsedRelationships = JSON.parse(jsonMatch[0]);

      for (const rel of parsedRelationships) {
        if (rel.confidence >= this.config.minConfidence) {
          relationships.push({
            id: `ai_${rel.sourceId}_${rel.targetId}`,
            sourceMemoryId: rel.sourceId,
            targetMemoryId: rel.targetId,
            relationshipType: rel.type as RelationshipType,
            strength: rel.strength,
            confidence: rel.confidence,
            description: rel.description,
            extractedAt: new Date(),
            metadata: {
              evidence: ['AI-identified relationship'],
              context: 'Generated by AI analysis',
            },
          });
        }
      }
    } catch (error) {
      console.warn('Failed to parse AI relationships:', error);
    }

    return relationships;
  }

  /**
   * Calculate basic content similarity using keyword overlap
   */
  private calculateContentSimilarity(
    content1: string,
    content2: string
  ): number {
    const words1 = content1
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3);
    const words2 = content2
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3);

    if (words1.length === 0 || words2.length === 0) return 0;

    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Check if two memory types are related
   */
  private areTypesRelated(type1: MemoryType, type2: MemoryType): boolean {
    const relatedPairs: Array<[MemoryType, MemoryType]> = [
      ['task', 'procedure'],
      ['fact', 'preference'],
      ['personality', 'emotion'],
      ['thread', 'task'],
    ];

    return relatedPairs.some(
      ([a, b]) => (type1 === a && type2 === b) || (type1 === b && type2 === a)
    );
  }

  /**
   * Remove duplicate relationships
   */
  private deduplicateRelationships(
    relationships: AIMemoryRelationship[]
  ): AIMemoryRelationship[] {
    const seen = new Set<string>();
    const unique: AIMemoryRelationship[] = [];

    for (const rel of relationships) {
      // Create a normalized key for deduplication
      const key1 = `${rel.sourceMemoryId}_${rel.targetMemoryId}_${rel.relationshipType}`;
      const key2 = `${rel.targetMemoryId}_${rel.sourceMemoryId}_${rel.relationshipType}`;

      if (!seen.has(key1) && !seen.has(key2)) {
        seen.add(key1);
        unique.push(rel);
      }
    }

    return unique;
  }

  /**
   * Get relationships for a specific memory
   */
  async getRelationshipsForMemory(
    memoryId: string,
    allRelationships: AIMemoryRelationship[]
  ): Promise<{
    outgoing: AIMemoryRelationship[];
    incoming: AIMemoryRelationship[];
    total: number;
  }> {
    const outgoing = allRelationships.filter(
      rel => rel.sourceMemoryId === memoryId
    );
    const incoming = allRelationships.filter(
      rel => rel.targetMemoryId === memoryId
    );

    return {
      outgoing,
      incoming,
      total: outgoing.length + incoming.length,
    };
  }

  /**
   * Analyze relationship network metrics
   */
  async analyzeNetworkMetrics(relationships: AIMemoryRelationship[]): Promise<{
    totalRelationships: number;
    averageRelationshipsPerMemory: number;
    strongestRelationshipType: RelationshipType;
    networkDensity: number;
    centralMemories: string[];
  }> {
    const memoryIds = new Set<string>();
    const relationshipTypes = new Map<RelationshipType, number>();

    relationships.forEach(rel => {
      memoryIds.add(rel.sourceMemoryId);
      memoryIds.add(rel.targetMemoryId);
      relationshipTypes.set(
        rel.relationshipType,
        (relationshipTypes.get(rel.relationshipType) || 0) + 1
      );
    });

    const totalMemories = memoryIds.size;
    const totalRelationships = relationships.length;
    const averageRelationshipsPerMemory =
      totalMemories > 0 ? totalRelationships / totalMemories : 0;

    // Calculate network density (actual connections / possible connections)
    const possibleConnections = (totalMemories * (totalMemories - 1)) / 2;
    const networkDensity =
      possibleConnections > 0 ? totalRelationships / possibleConnections : 0;

    // Find strongest relationship type
    const strongestRelationshipType =
      Array.from(relationshipTypes.entries()).sort(
        ([, a], [, b]) => b - a
      )[0]?.[0] || 'semantic';

    // Find central memories (most connected)
    const connectionCounts = new Map<string, number>();
    relationships.forEach(rel => {
      connectionCounts.set(
        rel.sourceMemoryId,
        (connectionCounts.get(rel.sourceMemoryId) || 0) + 1
      );
      connectionCounts.set(
        rel.targetMemoryId,
        (connectionCounts.get(rel.targetMemoryId) || 0) + 1
      );
    });

    const centralMemories = Array.from(connectionCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([memoryId]) => memoryId);

    return {
      totalRelationships,
      averageRelationshipsPerMemory,
      strongestRelationshipType,
      networkDensity,
      centralMemories,
    };
  }
}
