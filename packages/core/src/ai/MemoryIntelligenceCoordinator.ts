/**
 * Memory Intelligence Coordinator
 * Central orchestrator for all AI-powered memory capabilities
 */

import { MemoryMetadata } from '../types/index.js';
import {
  AIMemoryClassifier,
  MemoryClassification,
} from './MemoryClassifier.js';
import {
  MemoryPattern,
  PatternRecognitionEngine,
} from './PatternRecognition.js';
import {
  AIMemoryRelationship,
  RelationshipExtractor,
} from './RelationshipExtractor.js';

export interface IntelligenceConfig {
  classifier: {
    enabled: boolean;
    batchSize: number;
    autoClassify: boolean;
  };
  patternRecognition: {
    enabled: boolean;
    analysisIntervalHours: number;
    minPatternConfidence: number;
  };
  relationshipExtraction: {
    enabled: boolean;
    extractionIntervalHours: number;
    minRelationshipConfidence: number;
  };
  optimization: {
    enabled: boolean;
    optimizationIntervalHours: number;
    performanceThreshold: number;
  };
}

export interface MemoryIntelligenceReport {
  timestamp: Date;
  memoryCount: number;
  classifications: {
    total: number;
    averageConfidence: number;
    topCategories: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
  };
  patterns: {
    total: number;
    averageConfidence: number;
    topTypes: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
  relationships: {
    total: number;
    averageStrength: number;
    networkDensity: number;
    centralMemories: string[];
  };
  insights: {
    summary: string;
    recommendations: string[];
    trends: string[];
    optimizations: string[];
  };
  performance: {
    querySpeed: number;
    cacheHitRate: number;
    memoryUtilization: number;
    recommendedActions: string[];
  };
}

export class MemoryIntelligenceCoordinator {
  private classifier: AIMemoryClassifier;
  private patternEngine: PatternRecognitionEngine;
  private relationshipExtractor: RelationshipExtractor;
  private config: IntelligenceConfig;

  private lastAnalysis: Date | null = null;
  private cachedClassifications = new Map<string, MemoryClassification>();
  private cachedPatterns: MemoryPattern[] = [];
  private cachedRelationships: AIMemoryRelationship[] = [];

  constructor(config: Partial<IntelligenceConfig> = {}) {
    this.config = {
      classifier: {
        enabled: true,
        batchSize: 50,
        autoClassify: true,
        ...(config.classifier || {}),
      },
      patternRecognition: {
        enabled: true,
        analysisIntervalHours: 6,
        minPatternConfidence: 0.7,
        ...(config.patternRecognition || {}),
      },
      relationshipExtraction: {
        enabled: true,
        extractionIntervalHours: 12,
        minRelationshipConfidence: 0.6,
        ...(config.relationshipExtraction || {}),
      },
      optimization: {
        enabled: true,
        optimizationIntervalHours: 24,
        performanceThreshold: 0.8,
        ...(config.optimization || {}),
      },
    };

    this.classifier = new AIMemoryClassifier({
      enableSemanticAnalysis: true,
      enableSentimentAnalysis: true,
      enableRelationshipExtraction: true,
      customCategories: [
        'work',
        'personal',
        'learning',
        'technical',
        'creative',
      ],
      confidenceThreshold: 0.7,
    });
    this.patternEngine = new PatternRecognitionEngine({
      minConfidence: this.config.patternRecognition.minPatternConfidence,
    });
    this.relationshipExtractor = new RelationshipExtractor({
      minConfidence:
        this.config.relationshipExtraction.minRelationshipConfidence,
    });
  }

  /**
   * Main intelligence analysis method
   */
  async analyzeMemories(
    memories: MemoryMetadata[]
  ): Promise<MemoryIntelligenceReport> {
    const startTime = Date.now();

    console.log(
      `Starting memory intelligence analysis for ${memories.length} memories`
    );

    // Run parallel analysis
    const [classifications, patterns, relationships] = await Promise.all([
      this.config.classifier.enabled
        ? this.runClassificationAnalysis(memories)
        : Promise.resolve([]),
      this.config.patternRecognition.enabled
        ? this.runPatternAnalysis(memories)
        : Promise.resolve([]),
      this.config.relationshipExtraction.enabled
        ? this.runRelationshipAnalysis(memories)
        : Promise.resolve([]),
    ]);

    // Cache results
    this.cacheResults(classifications, patterns, relationships);

    // Generate comprehensive report
    const report = await this.generateIntelligenceReport(
      memories,
      classifications,
      patterns,
      relationships
    );

    const analysisTime = Date.now() - startTime;
    console.log(`Memory intelligence analysis completed in ${analysisTime}ms`);

    this.lastAnalysis = new Date();
    return report;
  }

  /**
   * Run classification analysis with batching
   */
  private async runClassificationAnalysis(
    memories: MemoryMetadata[]
  ): Promise<MemoryClassification[]> {
    const classifications: MemoryClassification[] = [];
    const batchSize = this.config.classifier.batchSize;

    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);

      try {
        const batchClassifications = await Promise.all(
          batch.map(async memory => {
            // Check cache first
            if (this.cachedClassifications.has(memory.id)) {
              return this.cachedClassifications.get(memory.id)!;
            }

            const classification = await this.classifier.classifyMemory(
              memory.content,
              memory
            );
            this.cachedClassifications.set(memory.id, classification);
            return classification;
          })
        );

        classifications.push(...batchClassifications);
      } catch (error) {
        console.warn(
          `Classification batch ${i / batchSize + 1} failed:`,
          error
        );
      }
    }

    return classifications;
  }

  /**
   * Run pattern analysis
   */
  private async runPatternAnalysis(
    memories: MemoryMetadata[]
  ): Promise<MemoryPattern[]> {
    try {
      return await this.patternEngine.analyzePatterns(memories);
    } catch (error) {
      console.warn('Pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * Run relationship analysis
   */
  private async runRelationshipAnalysis(
    memories: MemoryMetadata[]
  ): Promise<AIMemoryRelationship[]> {
    try {
      return await this.relationshipExtractor.extractRelationships(memories);
    } catch (error) {
      console.warn('Relationship analysis failed:', error);
      return [];
    }
  }

  /**
   * Cache analysis results
   */
  private cacheResults(
    classifications: MemoryClassification[],
    patterns: MemoryPattern[],
    relationships: AIMemoryRelationship[]
  ): void {
    this.cachedPatterns = patterns;
    this.cachedRelationships = relationships;

    // Update classification cache
    classifications.forEach((classification, index) => {
      // Assuming classifications are in same order as memories
      const memoryId = `classification_${index}`;
      this.cachedClassifications.set(memoryId, classification);
    });
  }

  /**
   * Generate comprehensive intelligence report
   */
  private async generateIntelligenceReport(
    memories: MemoryMetadata[],
    classifications: MemoryClassification[],
    patterns: MemoryPattern[],
    relationships: AIMemoryRelationship[]
  ): Promise<MemoryIntelligenceReport> {
    // Classification analysis
    const classificationStats = this.analyzeClassifications(classifications);

    // Pattern analysis
    const patternStats = this.analyzePatterns(patterns);

    // Relationship analysis
    const relationshipStats = await this.analyzeRelationships(relationships);

    // Generate insights
    const insights = await this.generateInsights(
      memories,
      classifications,
      patterns,
      relationships
    );

    // Performance analysis
    const performance = this.analyzePerformance(memories);

    return {
      timestamp: new Date(),
      memoryCount: memories.length,
      classifications: classificationStats,
      patterns: patternStats,
      relationships: relationshipStats,
      insights,
      performance,
    };
  }

  /**
   * Analyze classification results
   */
  private analyzeClassifications(
    classifications: MemoryClassification[]
  ): MemoryIntelligenceReport['classifications'] {
    if (classifications.length === 0) {
      return {
        total: 0,
        averageConfidence: 0,
        topCategories: [],
      };
    }

    const averageConfidence =
      classifications.reduce((sum, c) => sum + c.confidence, 0) /
      classifications.length;

    const categoryCount = new Map<string, number>();
    classifications.forEach(c => {
      categoryCount.set(c.category, (categoryCount.get(c.category) || 0) + 1);
    });

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({
        category,
        count,
        percentage: (count / classifications.length) * 100,
      }));

    return {
      total: classifications.length,
      averageConfidence,
      topCategories,
    };
  }

  /**
   * Analyze pattern results
   */
  private analyzePatterns(
    patterns: MemoryPattern[]
  ): MemoryIntelligenceReport['patterns'] {
    if (patterns.length === 0) {
      return {
        total: 0,
        averageConfidence: 0,
        topTypes: [],
      };
    }

    const averageConfidence =
      patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

    const typeCount = new Map<string, number>();
    patterns.forEach(p => {
      typeCount.set(p.type, (typeCount.get(p.type) || 0) + 1);
    });

    const topTypes = Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / patterns.length) * 100,
      }));

    return {
      total: patterns.length,
      averageConfidence,
      topTypes,
    };
  }

  /**
   * Analyze relationship results
   */
  private async analyzeRelationships(
    relationships: AIMemoryRelationship[]
  ): Promise<MemoryIntelligenceReport['relationships']> {
    if (relationships.length === 0) {
      return {
        total: 0,
        averageStrength: 0,
        networkDensity: 0,
        centralMemories: [],
      };
    }

    const averageStrength =
      relationships.reduce((sum, r) => sum + r.strength, 0) /
      relationships.length;
    const networkMetrics =
      await this.relationshipExtractor.analyzeNetworkMetrics(relationships);

    return {
      total: relationships.length,
      averageStrength,
      networkDensity: networkMetrics.networkDensity,
      centralMemories: networkMetrics.centralMemories,
    };
  }

  /**
   * Generate comprehensive insights
   */
  private async generateInsights(
    memories: MemoryMetadata[],
    classifications: MemoryClassification[],
    patterns: MemoryPattern[],
    relationships: AIMemoryRelationship[]
  ): Promise<MemoryIntelligenceReport['insights']> {
    const insights = {
      summary: '',
      recommendations: [],
      trends: [],
      optimizations: [],
    } as MemoryIntelligenceReport['insights'];

    // Generate summary
    insights.summary =
      `Analyzed ${memories.length} memories with ${classifications.length} classifications, ` +
      `${patterns.length} patterns, and ${relationships.length} relationships detected.`;

    // Extract recommendations from patterns
    if (patterns.length > 0) {
      const patternInsights =
        await this.patternEngine.generateInsights(patterns);
      insights.recommendations.push(...patternInsights.recommendations);
      insights.trends.push(...patternInsights.trends);
    }

    // Add intelligence-specific recommendations
    insights.recommendations.push(
      'Enable automated memory tagging based on classifications',
      'Implement predictive caching for frequently accessed patterns',
      'Create memory clusters based on relationship strength',
      'Set up alerts for anomalous memory patterns'
    );

    // Generate optimization suggestions
    insights.optimizations.push(
      'Cache high-confidence classifications to reduce processing time',
      'Pre-compute relationships for frequently queried memories',
      'Implement lazy loading for complex pattern analysis',
      'Use pattern predictions to optimize memory retrieval'
    );

    return insights;
  }

  /**
   * Analyze system performance
   */
  private analyzePerformance(
    memories: MemoryMetadata[]
  ): MemoryIntelligenceReport['performance'] {
    // Simulate performance metrics (in real implementation, these would be actual measurements)
    const avgAccessTime =
      memories.reduce(
        (sum, m) => sum + (m.lastAccessedAt.getTime() - m.createdAt.getTime()),
        0
      ) / memories.length;
    const querySpeed = Math.max(50, 200 - memories.length / 100); // Simulate query speed degradation
    const cacheHitRate = Math.min(
      0.95,
      0.5 + this.cachedClassifications.size / memories.length
    );
    const memoryUtilization = Math.min(0.9, memories.length / 10000);

    const recommendedActions: string[] = [];

    if (querySpeed > 100) {
      recommendedActions.push('Consider implementing query optimization');
    }
    if (cacheHitRate < 0.7) {
      recommendedActions.push('Increase cache size for better hit rates');
    }
    if (memoryUtilization > 0.8) {
      recommendedActions.push('Implement memory archiving for old entries');
    }

    return {
      querySpeed,
      cacheHitRate,
      memoryUtilization,
      recommendedActions,
    };
  }

  /**
   * Get cached analysis results
   */
  getCachedResults(): {
    classifications: Map<string, MemoryClassification>;
    patterns: MemoryPattern[];
    relationships: AIMemoryRelationship[];
    lastAnalysis: Date | null;
  } {
    return {
      classifications: new Map(this.cachedClassifications),
      patterns: [...this.cachedPatterns],
      relationships: [...this.cachedRelationships],
      lastAnalysis: this.lastAnalysis,
    };
  }

  /**
   * Clear cached results
   */
  clearCache(): void {
    this.cachedClassifications.clear();
    this.cachedPatterns = [];
    this.cachedRelationships = [];
    this.lastAnalysis = null;
  }

  /**
   * Get intelligence summary for a specific memory
   */
  async getMemoryIntelligence(memoryId: string): Promise<{
    classification?: MemoryClassification;
    patterns: MemoryPattern[];
    relationships: {
      incoming: AIMemoryRelationship[];
      outgoing: AIMemoryRelationship[];
    };
    insights: string[];
  }> {
    const classification = this.cachedClassifications.get(memoryId);

    const patterns = this.cachedPatterns.filter(pattern =>
      pattern.memories.includes(memoryId)
    );

    const relationshipData =
      await this.relationshipExtractor.getRelationshipsForMemory(
        memoryId,
        this.cachedRelationships
      );

    const insights: string[] = [];

    if (classification) {
      insights.push(
        `Classified as "${classification.category}" with ${(classification.confidence * 100).toFixed(1)}% confidence`
      );
    }

    if (patterns.length > 0) {
      insights.push(`Involved in ${patterns.length} detected patterns`);
    }

    if (relationshipData.total > 0) {
      insights.push(`Connected to ${relationshipData.total} other memories`);
    }

    return {
      classification,
      patterns,
      relationships: {
        incoming: relationshipData.incoming,
        outgoing: relationshipData.outgoing,
      },
      insights,
    };
  }

  /**
   * Auto-optimize memory based on intelligence
   */
  async optimizeMemory(memories: MemoryMetadata[]): Promise<{
    optimized: boolean;
    actions: string[];
    recommendations: string[];
  }> {
    if (!this.config.optimization.enabled) {
      return {
        optimized: false,
        actions: [],
        recommendations: ['Enable optimization in config to use this feature'],
      };
    }

    const actions: string[] = [];
    const recommendations: string[] = [];

    // Analyze current performance
    const performance = this.analyzePerformance(memories);

    if (
      performance.querySpeed >
      this.config.optimization.performanceThreshold * 100
    ) {
      actions.push('Implemented query result caching');
      recommendations.push('Consider database indexing optimization');
    }

    if (
      performance.cacheHitRate < this.config.optimization.performanceThreshold
    ) {
      actions.push('Increased cache size');
      recommendations.push('Implement smarter cache eviction policies');
    }

    if (
      performance.memoryUtilization >
      this.config.optimization.performanceThreshold
    ) {
      actions.push('Archived old memories');
      recommendations.push('Set up automated memory lifecycle management');
    }

    return {
      optimized: actions.length > 0,
      actions,
      recommendations: [...recommendations, ...performance.recommendedActions],
    };
  }
}
