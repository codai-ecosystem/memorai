/**
 * MCP v3.0 - Pattern Analysis Tool
 * AI-powered pattern recognition and trend analysis for memory data
 */

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MemoryPattern {
  id: string;
  type: 'temporal' | 'content' | 'behavioral' | 'semantic' | 'structural';
  pattern: string;
  description: string;
  confidence: number;
  frequency: number;
  examples: Memory[];
  firstSeen: number;
  lastSeen: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
}

export interface PatternInsight {
  pattern: MemoryPattern;
  significance: number;
  implications: string[];
  recommendations: string[];
  relatedPatterns: string[];
}

export interface TrendAnalysis {
  timeframe: string;
  patterns: MemoryPattern[];
  insights: PatternInsight[];
  predictions: Array<{
    prediction: string;
    confidence: number;
    timeframe: string;
  }>;
  anomalies: Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }>;
}

export class PatternAnalysis {
  private detectedPatterns: Map<string, MemoryPattern> = new Map();
  private memoryHistory: Memory[] = [];
  private analysisCache: Map<string, TrendAnalysis> = new Map();

  constructor(
    private minPatternFrequency: number = 3,
    private confidenceThreshold: number = 0.7,
    private maxHistorySize: number = 10000
  ) {}

  /**
   * Analyze memories for patterns and trends
   */
  async analyzePatterns(
    memories: Memory[],
    options: {
      timeframe?: number;
      patternTypes?: MemoryPattern['type'][];
      includeMinor?: boolean;
    } = {}
  ): Promise<TrendAnalysis> {
    const cacheKey = this.generateCacheKey(memories, options);

    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey)!;
    }

    // Update memory history
    this.updateMemoryHistory(memories);

    // Detect different types of patterns
    const temporalPatterns = await this.detectTemporalPatterns(
      memories,
      options.timeframe
    );
    const contentPatterns = await this.detectContentPatterns(memories);
    const behavioralPatterns = await this.detectBehavioralPatterns(memories);
    const semanticPatterns = await this.detectSemanticPatterns(memories);
    const structuralPatterns = await this.detectStructuralPatterns(memories);

    // Combine all patterns
    const allPatterns = [
      ...temporalPatterns,
      ...contentPatterns,
      ...behavioralPatterns,
      ...semanticPatterns,
      ...structuralPatterns,
    ].filter(
      p =>
        p.confidence >= this.confidenceThreshold &&
        (options.includeMinor || p.frequency >= this.minPatternFrequency) &&
        (!options.patternTypes || options.patternTypes.includes(p.type))
    );

    // Generate insights and predictions
    const insights = await this.generateInsights(allPatterns);
    const predictions = await this.generatePredictions(allPatterns);
    const anomalies = await this.detectAnomalies(memories);

    const analysis: TrendAnalysis = {
      timeframe: this.formatTimeframe(options.timeframe),
      patterns: allPatterns,
      insights,
      predictions,
      anomalies,
    };

    // Cache the analysis
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Detect temporal patterns (time-based trends)
   */
  private async detectTemporalPatterns(
    memories: Memory[],
    timeframe?: number
  ): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];
    const cutoff = timeframe ? Date.now() - timeframe : 0;
    const relevantMemories = memories.filter(m => m.timestamp >= cutoff);

    // Daily activity patterns
    const hourlyActivity = this.analyzeHourlyActivity(relevantMemories);
    if (this.hasSignificantPattern(hourlyActivity)) {
      patterns.push(
        this.createTemporalPattern(
          'daily_activity',
          'Daily Activity Pattern',
          hourlyActivity,
          relevantMemories
        )
      );
    }

    // Weekly patterns
    const weeklyActivity = this.analyzeWeeklyActivity(relevantMemories);
    if (this.hasSignificantPattern(weeklyActivity)) {
      patterns.push(
        this.createTemporalPattern(
          'weekly_activity',
          'Weekly Activity Pattern',
          weeklyActivity,
          relevantMemories
        )
      );
    }

    // Burst patterns (high activity periods)
    const burstPatterns = this.detectBurstPatterns(relevantMemories);
    patterns.push(...burstPatterns);

    return patterns;
  }

  /**
   * Detect content-based patterns
   */
  private async detectContentPatterns(
    memories: Memory[]
  ): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Keyword frequency patterns
    const keywordPatterns = this.analyzeKeywordFrequency(memories);
    patterns.push(...keywordPatterns);

    // Content length patterns
    const lengthPattern = this.analyzeContentLength(memories);
    if (lengthPattern) patterns.push(lengthPattern);

    // Language and sentiment patterns
    const sentimentPattern = this.analyzeSentimentPatterns(memories);
    if (sentimentPattern) patterns.push(sentimentPattern);

    return patterns;
  }

  /**
   * Detect behavioral patterns (user interaction patterns)
   */
  private async detectBehavioralPatterns(
    memories: Memory[]
  ): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Memory type usage patterns
    const typeUsagePattern = this.analyzeTypeUsage(memories);
    if (typeUsagePattern) patterns.push(typeUsagePattern);

    // Update/modification patterns
    const modificationPattern = this.analyzeModificationPatterns(memories);
    if (modificationPattern) patterns.push(modificationPattern);

    // Access frequency patterns
    const accessPattern = this.analyzeAccessPatterns(memories);
    if (accessPattern) patterns.push(accessPattern);

    return patterns;
  }

  /**
   * Detect semantic patterns (meaning and context)
   */
  private async detectSemanticPatterns(
    memories: Memory[]
  ): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Topic clustering
    const topicClusters = this.analyzeTopicClusters(memories);
    patterns.push(...topicClusters);

    // Concept evolution
    const conceptEvolution = this.analyzeConceptEvolution(memories);
    patterns.push(...conceptEvolution);

    return patterns;
  }

  /**
   * Detect structural patterns (organization and relationships)
   */
  private async detectStructuralPatterns(
    memories: Memory[]
  ): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Tagging patterns
    const taggingPattern = this.analyzeTaggingPatterns(memories);
    if (taggingPattern) patterns.push(taggingPattern);

    // Metadata patterns
    const metadataPatterns = this.analyzeMetadataPatterns(memories);
    patterns.push(...metadataPatterns);

    return patterns;
  }

  /**
   * Generate actionable insights from patterns
   */
  private async generateInsights(
    patterns: MemoryPattern[]
  ): Promise<PatternInsight[]> {
    const insights: PatternInsight[] = [];

    for (const pattern of patterns) {
      const significance = this.calculateSignificance(pattern);
      const implications = this.generateImplications(pattern);
      const recommendations = this.generateRecommendations(pattern);
      const relatedPatterns = this.findRelatedPatterns(pattern, patterns);

      insights.push({
        pattern,
        significance,
        implications,
        recommendations,
        relatedPatterns,
      });
    }

    // Sort by significance
    insights.sort((a, b) => b.significance - a.significance);

    return insights;
  }

  /**
   * Generate future predictions based on patterns
   */
  private async generatePredictions(patterns: MemoryPattern[]): Promise<
    Array<{
      prediction: string;
      confidence: number;
      timeframe: string;
    }>
  > {
    const predictions: Array<{
      prediction: string;
      confidence: number;
      timeframe: string;
    }> = [];

    for (const pattern of patterns) {
      if (pattern.trend === 'increasing') {
        predictions.push({
          prediction: `${pattern.description} will continue to increase`,
          confidence: pattern.confidence * 0.8,
          timeframe: this.predictTimeframe(pattern),
        });
      } else if (pattern.trend === 'cyclical') {
        predictions.push({
          prediction: `${pattern.description} will repeat in the next cycle`,
          confidence: pattern.confidence * 0.9,
          timeframe: this.predictCyclicalTimeframe(pattern),
        });
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Detect anomalies in memory patterns
   */
  private async detectAnomalies(memories: Memory[]): Promise<
    Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
    }>
  > {
    const anomalies: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
    }> = [];

    // Check for unusual spikes in activity
    const activitySpikes = this.detectActivitySpikes(memories);
    anomalies.push(...activitySpikes);

    // Check for content anomalies
    const contentAnomalies = this.detectContentAnomalies(memories);
    anomalies.push(...contentAnomalies);

    // Check for temporal anomalies
    const temporalAnomalies = this.detectTemporalAnomalies(memories);
    anomalies.push(...temporalAnomalies);

    return anomalies.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Helper methods for pattern detection

  private analyzeHourlyActivity(memories: Memory[]): number[] {
    const hourlyCount = new Array(24).fill(0);

    for (const memory of memories) {
      const hour = new Date(memory.timestamp).getHours();
      hourlyCount[hour]++;
    }

    return hourlyCount;
  }

  private analyzeWeeklyActivity(memories: Memory[]): number[] {
    const weeklyCount = new Array(7).fill(0);

    for (const memory of memories) {
      const day = new Date(memory.timestamp).getDay();
      weeklyCount[day]++;
    }

    return weeklyCount;
  }

  private hasSignificantPattern(data: number[]): boolean {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const variance = this.calculateVariance(data);

    return variance > 0.5 && max / (min + 1) > 2;
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => (val - mean) ** 2);
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
  }

  private createTemporalPattern(
    patternId: string,
    description: string,
    data: number[],
    examples: Memory[]
  ): MemoryPattern {
    const confidence = this.calculatePatternConfidence(data);
    const frequency = examples.length;
    const timestamps = examples.map(m => m.timestamp);

    return {
      id: patternId,
      type: 'temporal',
      pattern: JSON.stringify(data),
      description,
      confidence,
      frequency,
      examples: examples.slice(0, 5), // Limit examples
      firstSeen: Math.min(...timestamps),
      lastSeen: Math.max(...timestamps),
      trend: this.calculateTrend(data),
    };
  }

  private calculatePatternConfidence(data: number[]): number {
    const variance = this.calculateVariance(data);
    const consistency = 1 / (1 + variance);
    return Math.min(consistency, 1.0);
  }

  private calculateTrend(data: number[]): MemoryPattern['trend'] {
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (Math.abs(change) < 0.1) return 'stable';
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';

    // Check for cyclical pattern
    const peaks = this.findPeaks(data);
    if (peaks.length >= 2) return 'cyclical';

    return 'stable';
  }

  private findPeaks(data: number[]): number[] {
    const peaks: number[] = [];

    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        peaks.push(i);
      }
    }

    return peaks;
  }

  private analyzeKeywordFrequency(memories: Memory[]): MemoryPattern[] {
    const patterns: MemoryPattern[] = [];
    const keywordCounts = new Map<string, number>();

    // Extract keywords and count frequency
    for (const memory of memories) {
      const words = memory.content
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3);

      for (const word of words) {
        keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
      }
    }

    // Find frequent keywords
    const frequentKeywords = Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= this.minPatternFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [keyword, count] of frequentKeywords) {
      const relatedMemories = memories.filter(m =>
        m.content.toLowerCase().includes(keyword)
      );

      patterns.push({
        id: `keyword_${keyword}`,
        type: 'content',
        pattern: keyword,
        description: `Frequent keyword: "${keyword}"`,
        confidence: Math.min((count / memories.length) * 10, 1.0),
        frequency: count,
        examples: relatedMemories.slice(0, 3),
        firstSeen: Math.min(...relatedMemories.map(m => m.timestamp)),
        lastSeen: Math.max(...relatedMemories.map(m => m.timestamp)),
        trend: 'stable',
      });
    }

    return patterns;
  }

  private analyzeContentLength(memories: Memory[]): MemoryPattern | null {
    const lengths = memories.map(m => m.content.length);
    const avgLength =
      lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const variance = this.calculateVariance(lengths);

    if (variance < 100) {
      // Low variance indicates consistent length pattern
      return {
        id: 'content_length_consistency',
        type: 'content',
        pattern: `avg_${Math.round(avgLength)}`,
        description: `Consistent content length around ${Math.round(avgLength)} characters`,
        confidence: 1 / (1 + variance / 1000),
        frequency: memories.length,
        examples: memories.slice(0, 3),
        firstSeen: Math.min(...memories.map(m => m.timestamp)),
        lastSeen: Math.max(...memories.map(m => m.timestamp)),
        trend: 'stable',
      };
    }

    return null;
  }

  private analyzeSentimentPatterns(memories: Memory[]): MemoryPattern | null {
    // Simple sentiment analysis based on keywords
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'success',
      'happy',
      'love',
    ];
    const negativeWords = [
      'bad',
      'terrible',
      'error',
      'failed',
      'problem',
      'issue',
    ];

    let positiveCount = 0;
    let negativeCount = 0;

    for (const memory of memories) {
      const content = memory.content.toLowerCase();

      for (const word of positiveWords) {
        if (content.includes(word)) positiveCount++;
      }

      for (const word of negativeWords) {
        if (content.includes(word)) negativeCount++;
      }
    }

    const totalSentiment = positiveCount + negativeCount;
    if (totalSentiment < this.minPatternFrequency) return null;

    const sentimentRatio = positiveCount / totalSentiment;
    let description: string;

    if (sentimentRatio > 0.7) {
      description = 'Predominantly positive sentiment';
    } else if (sentimentRatio < 0.3) {
      description = 'Predominantly negative sentiment';
    } else {
      description = 'Mixed sentiment pattern';
    }

    return {
      id: 'sentiment_pattern',
      type: 'content',
      pattern: `sentiment_${sentimentRatio.toFixed(2)}`,
      description,
      confidence: Math.abs(sentimentRatio - 0.5) * 2,
      frequency: totalSentiment,
      examples: memories.slice(0, 3),
      firstSeen: Math.min(...memories.map(m => m.timestamp)),
      lastSeen: Math.max(...memories.map(m => m.timestamp)),
      trend: 'stable',
    };
  }

  private analyzeTypeUsage(memories: Memory[]): MemoryPattern | null {
    const typeCounts = new Map<string, number>();

    for (const memory of memories) {
      typeCounts.set(memory.type, (typeCounts.get(memory.type) || 0) + 1);
    }

    const sortedTypes = Array.from(typeCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    if (sortedTypes.length === 0) return null;

    const dominantType = sortedTypes[0];
    const dominanceRatio = dominantType[1] / memories.length;

    if (dominanceRatio > 0.6) {
      return {
        id: 'type_usage_dominance',
        type: 'behavioral',
        pattern: `dominant_${dominantType[0]}`,
        description: `Heavy usage of ${dominantType[0]} type (${Math.round(dominanceRatio * 100)}%)`,
        confidence: dominanceRatio,
        frequency: dominantType[1],
        examples: memories.filter(m => m.type === dominantType[0]).slice(0, 3),
        firstSeen: Math.min(...memories.map(m => m.timestamp)),
        lastSeen: Math.max(...memories.map(m => m.timestamp)),
        trend: 'stable',
      };
    }

    return null;
  }

  private analyzeModificationPatterns(
    memories: Memory[]
  ): MemoryPattern | null {
    // This would track how often memories are updated
    // For now, we'll simulate based on metadata
    const modifiedMemories = memories.filter(
      m => m.metadata?.modified || m.metadata?.version
    );

    if (modifiedMemories.length >= this.minPatternFrequency) {
      return {
        id: 'modification_frequency',
        type: 'behavioral',
        pattern: `modifications_${modifiedMemories.length}`,
        description: `Frequent memory modifications (${modifiedMemories.length} modified)`,
        confidence: modifiedMemories.length / memories.length,
        frequency: modifiedMemories.length,
        examples: modifiedMemories.slice(0, 3),
        firstSeen: Math.min(...modifiedMemories.map(m => m.timestamp)),
        lastSeen: Math.max(...modifiedMemories.map(m => m.timestamp)),
        trend: 'stable',
      };
    }

    return null;
  }

  private analyzeAccessPatterns(memories: Memory[]): MemoryPattern | null {
    // This would track how often memories are accessed
    // Simulated based on metadata
    const accessCounts = memories.map(m => m.metadata?.accessCount || 0);
    const avgAccess =
      accessCounts.reduce((sum, count) => sum + count, 0) / accessCounts.length;

    if (avgAccess > 1) {
      return {
        id: 'access_frequency',
        type: 'behavioral',
        pattern: `avg_access_${avgAccess.toFixed(1)}`,
        description: `Average access frequency: ${avgAccess.toFixed(1)} times`,
        confidence: Math.min(avgAccess / 10, 1.0),
        frequency: Math.round(avgAccess * memories.length),
        examples: memories.slice(0, 3),
        firstSeen: Math.min(...memories.map(m => m.timestamp)),
        lastSeen: Math.max(...memories.map(m => m.timestamp)),
        trend: 'stable',
      };
    }

    return null;
  }

  private analyzeTopicClusters(memories: Memory[]): MemoryPattern[] {
    const patterns: MemoryPattern[] = [];

    // Simple topic clustering based on common words
    const topics = new Map<string, Memory[]>();

    for (const memory of memories) {
      const words = memory.content
        .toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4);

      for (const word of words) {
        if (!topics.has(word)) {
          topics.set(word, []);
        }
        topics.get(word)!.push(memory);
      }
    }

    // Find topics with enough memories
    for (const [topic, topicMemories] of topics) {
      if (topicMemories.length >= this.minPatternFrequency) {
        patterns.push({
          id: `topic_${topic}`,
          type: 'semantic',
          pattern: topic,
          description: `Topic cluster: "${topic}"`,
          confidence: topicMemories.length / memories.length,
          frequency: topicMemories.length,
          examples: topicMemories.slice(0, 3),
          firstSeen: Math.min(...topicMemories.map(m => m.timestamp)),
          lastSeen: Math.max(...topicMemories.map(m => m.timestamp)),
          trend: 'stable',
        });
      }
    }

    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
  }

  private analyzeConceptEvolution(memories: Memory[]): MemoryPattern[] {
    // Track how concepts change over time
    // This is a simplified version
    const patterns: MemoryPattern[] = [];

    const sortedMemories = memories.sort((a, b) => a.timestamp - b.timestamp);
    const timeSlices = this.sliceByTime(sortedMemories, 7); // Weekly slices

    if (timeSlices.length >= 3) {
      patterns.push({
        id: 'concept_evolution',
        type: 'semantic',
        pattern: `evolution_${timeSlices.length}_slices`,
        description: `Concept evolution over ${timeSlices.length} time periods`,
        confidence: 0.7,
        frequency: memories.length,
        examples: memories.slice(0, 3),
        firstSeen: Math.min(...memories.map(m => m.timestamp)),
        lastSeen: Math.max(...memories.map(m => m.timestamp)),
        trend: 'increasing',
      });
    }

    return patterns;
  }

  private analyzeTaggingPatterns(memories: Memory[]): MemoryPattern | null {
    const taggedMemories = memories.filter(
      m => m.metadata?.tags && m.metadata.tags.length > 0
    );

    if (taggedMemories.length >= this.minPatternFrequency) {
      const allTags = taggedMemories.flatMap(m => m.metadata?.tags || []);
      const uniqueTags = new Set(allTags);

      return {
        id: 'tagging_pattern',
        type: 'structural',
        pattern: `tags_${uniqueTags.size}`,
        description: `Consistent tagging pattern (${uniqueTags.size} unique tags)`,
        confidence: taggedMemories.length / memories.length,
        frequency: taggedMemories.length,
        examples: taggedMemories.slice(0, 3),
        firstSeen: Math.min(...taggedMemories.map(m => m.timestamp)),
        lastSeen: Math.max(...taggedMemories.map(m => m.timestamp)),
        trend: 'stable',
      };
    }

    return null;
  }

  private analyzeMetadataPatterns(memories: Memory[]): MemoryPattern[] {
    const patterns: MemoryPattern[] = [];

    const memoriesWithMetadata = memories.filter(
      m => m.metadata && Object.keys(m.metadata).length > 0
    );

    if (memoriesWithMetadata.length >= this.minPatternFrequency) {
      patterns.push({
        id: 'metadata_usage',
        type: 'structural',
        pattern: `metadata_${memoriesWithMetadata.length}`,
        description: `Rich metadata usage (${memoriesWithMetadata.length} memories with metadata)`,
        confidence: memoriesWithMetadata.length / memories.length,
        frequency: memoriesWithMetadata.length,
        examples: memoriesWithMetadata.slice(0, 3),
        firstSeen: Math.min(...memoriesWithMetadata.map(m => m.timestamp)),
        lastSeen: Math.max(...memoriesWithMetadata.map(m => m.timestamp)),
        trend: 'stable',
      });
    }

    return patterns;
  }

  private calculateSignificance(pattern: MemoryPattern): number {
    // Calculate significance based on multiple factors
    const frequencyScore = Math.min(pattern.frequency / 100, 1.0);
    const confidenceScore = pattern.confidence;
    const recencyScore = this.calculateRecencyScore(pattern.lastSeen);

    return frequencyScore * 0.4 + confidenceScore * 0.4 + recencyScore * 0.2;
  }

  private calculateRecencyScore(timestamp: number): number {
    const age = Date.now() - timestamp;
    const daysOld = age / (1000 * 60 * 60 * 24);
    return Math.max(0, 1 - daysOld / 30); // Decay over 30 days
  }

  private generateImplications(pattern: MemoryPattern): string[] {
    const implications: string[] = [];

    switch (pattern.type) {
      case 'temporal':
        implications.push('Time-based usage patterns detected');
        if (pattern.trend === 'increasing') {
          implications.push('Growing engagement over time');
        }
        break;

      case 'content':
        implications.push('Content preferences and themes identified');
        break;

      case 'behavioral':
        implications.push('User behavior patterns recognized');
        break;

      case 'semantic':
        implications.push('Knowledge domains and interests mapped');
        break;

      case 'structural':
        implications.push('Organization and metadata patterns found');
        break;
    }

    if (pattern.confidence > 0.8) {
      implications.push('High confidence pattern - reliable for predictions');
    }

    return implications;
  }

  private generateRecommendations(pattern: MemoryPattern): string[] {
    const recommendations: string[] = [];

    switch (pattern.type) {
      case 'temporal':
        recommendations.push('Optimize system availability during peak hours');
        recommendations.push('Consider automated reminders based on timing');
        break;

      case 'content':
        recommendations.push('Suggest related content based on preferences');
        recommendations.push('Improve content organization around themes');
        break;

      case 'behavioral':
        recommendations.push('Customize interface based on usage patterns');
        recommendations.push('Provide shortcuts for common actions');
        break;

      case 'semantic':
        recommendations.push('Create topic-based memory groups');
        recommendations.push('Suggest related memories from same domain');
        break;

      case 'structural':
        recommendations.push('Improve metadata templates');
        recommendations.push('Suggest tags based on content');
        break;
    }

    return recommendations;
  }

  private findRelatedPatterns(
    pattern: MemoryPattern,
    allPatterns: MemoryPattern[]
  ): string[] {
    const related: string[] = [];

    for (const other of allPatterns) {
      if (other.id === pattern.id) continue;

      // Check for temporal overlap
      const timeOverlap = this.calculateTimeOverlap(pattern, other);
      if (timeOverlap > 0.5) {
        related.push(other.id);
      }

      // Check for content similarity
      if (pattern.type === 'content' && other.type === 'content') {
        if (
          pattern.pattern.includes(other.pattern) ||
          other.pattern.includes(pattern.pattern)
        ) {
          related.push(other.id);
        }
      }
    }

    return related.slice(0, 3); // Limit related patterns
  }

  private calculateTimeOverlap(
    pattern1: MemoryPattern,
    pattern2: MemoryPattern
  ): number {
    const start1 = pattern1.firstSeen;
    const end1 = pattern1.lastSeen;
    const start2 = pattern2.firstSeen;
    const end2 = pattern2.lastSeen;

    const overlapStart = Math.max(start1, start2);
    const overlapEnd = Math.min(end1, end2);

    if (overlapStart >= overlapEnd) return 0;

    const overlapDuration = overlapEnd - overlapStart;
    const totalDuration = Math.max(end1, end2) - Math.min(start1, start2);

    return overlapDuration / totalDuration;
  }

  private predictTimeframe(pattern: MemoryPattern): string {
    const duration = pattern.lastSeen - pattern.firstSeen;
    const days = duration / (1000 * 60 * 60 * 24);

    if (days < 7) return 'within days';
    if (days < 30) return 'within weeks';
    if (days < 90) return 'within months';
    return 'within quarters';
  }

  private predictCyclicalTimeframe(pattern: MemoryPattern): string {
    // Estimate cycle length based on pattern
    return 'next cycle period';
  }

  private detectActivitySpikes(memories: Memory[]): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }> {
    const anomalies: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
    }> = [];

    // Group by hour and find spikes
    const hourlyActivity = new Map<number, Memory[]>();

    for (const memory of memories) {
      const hour = Math.floor(memory.timestamp / (1000 * 60 * 60));
      if (!hourlyActivity.has(hour)) {
        hourlyActivity.set(hour, []);
      }
      hourlyActivity.get(hour)!.push(memory);
    }

    // Calculate average activity
    const counts = Array.from(hourlyActivity.values()).map(arr => arr.length);
    const average =
      counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const threshold = average * 3; // 3x average is a spike

    for (const [hour, hourMemories] of hourlyActivity) {
      if (hourMemories.length > threshold) {
        anomalies.push({
          description: `Activity spike: ${hourMemories.length} memories (${Math.round(hourMemories.length / average)}x normal)`,
          severity: hourMemories.length > threshold * 2 ? 'high' : 'medium',
          timestamp: hour * 1000 * 60 * 60,
        });
      }
    }

    return anomalies;
  }

  private detectContentAnomalies(memories: Memory[]): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }> {
    const anomalies: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
    }> = [];

    // Check for unusually long or short content
    const lengths = memories.map(m => m.content.length);
    const avgLength =
      lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const stdDev = Math.sqrt(this.calculateVariance(lengths));

    for (const memory of memories) {
      const length = memory.content.length;
      const deviation = Math.abs(length - avgLength) / stdDev;

      if (deviation > 3) {
        // 3 standard deviations
        anomalies.push({
          description: `Unusual content length: ${length} characters (${deviation.toFixed(1)} std dev)`,
          severity: deviation > 5 ? 'high' : 'medium',
          timestamp: memory.timestamp,
        });
      }
    }

    return anomalies;
  }

  private detectTemporalAnomalies(memories: Memory[]): Array<{
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
  }> {
    const anomalies: Array<{
      description: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
    }> = [];

    // Check for unusual time gaps
    const sortedMemories = memories.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 1; i < sortedMemories.length; i++) {
      const gap = sortedMemories[i].timestamp - sortedMemories[i - 1].timestamp;
      const hours = gap / (1000 * 60 * 60);

      if (hours > 168) {
        // More than a week gap
        anomalies.push({
          description: `Extended quiet period: ${Math.round(hours / 24)} days`,
          severity: hours > 720 ? 'high' : 'medium', // 30 days
          timestamp: sortedMemories[i - 1].timestamp,
        });
      }
    }

    return anomalies;
  }

  // Utility methods

  private updateMemoryHistory(memories: Memory[]): void {
    for (const memory of memories) {
      if (!this.memoryHistory.find(m => m.id === memory.id)) {
        this.memoryHistory.push(memory);
      }
    }

    // Maintain history size
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.maxHistorySize);
    }
  }

  private generateCacheKey(memories: Memory[], options: any): string {
    const memoryHash = memories
      .map(m => m.id)
      .sort()
      .join(',');
    const optionsHash = JSON.stringify(options);
    return `${memoryHash}_${optionsHash}`;
  }

  private formatTimeframe(timeframe?: number): string {
    if (!timeframe) return 'all time';

    const days = timeframe / (1000 * 60 * 60 * 24);
    if (days <= 1) return 'last 24 hours';
    if (days <= 7) return 'last week';
    if (days <= 30) return 'last month';
    if (days <= 90) return 'last quarter';
    return 'last year';
  }

  private sliceByTime(memories: Memory[], daysPerSlice: number): Memory[][] {
    const slices: Memory[][] = [];
    const sliceDuration = daysPerSlice * 24 * 60 * 60 * 1000;

    if (memories.length === 0) return slices;

    const startTime = memories[0].timestamp;
    const endTime = memories[memories.length - 1].timestamp;

    for (let time = startTime; time <= endTime; time += sliceDuration) {
      const sliceMemories = memories.filter(
        m => m.timestamp >= time && m.timestamp < time + sliceDuration
      );

      if (sliceMemories.length > 0) {
        slices.push(sliceMemories);
      }
    }

    return slices;
  }

  private detectBurstPatterns(memories: Memory[]): MemoryPattern[] {
    const patterns: MemoryPattern[] = [];

    // Group memories by hour
    const hourlyGroups = new Map<number, Memory[]>();

    for (const memory of memories) {
      const hour = Math.floor(memory.timestamp / (1000 * 60 * 60));
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, []);
      }
      hourlyGroups.get(hour)!.push(memory);
    }

    // Find burst periods (unusually high activity)
    const counts = Array.from(hourlyGroups.values()).map(arr => arr.length);
    const average =
      counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const threshold = average * 2; // 2x average

    let currentBurst: Memory[] = [];
    let burstStart = 0;

    for (const [hour, hourMemories] of Array.from(
      hourlyGroups.entries()
    ).sort()) {
      if (hourMemories.length >= threshold) {
        if (currentBurst.length === 0) {
          burstStart = hour;
        }
        currentBurst.push(...hourMemories);
      } else {
        if (currentBurst.length >= this.minPatternFrequency) {
          patterns.push({
            id: `burst_${burstStart}`,
            type: 'temporal',
            pattern: `burst_${currentBurst.length}`,
            description: `Activity burst: ${currentBurst.length} memories in short period`,
            confidence: Math.min(currentBurst.length / (average * 5), 1.0),
            frequency: currentBurst.length,
            examples: currentBurst.slice(0, 3),
            firstSeen: Math.min(...currentBurst.map(m => m.timestamp)),
            lastSeen: Math.max(...currentBurst.map(m => m.timestamp)),
            trend: 'increasing',
          });
        }
        currentBurst = [];
      }
    }

    return patterns;
  }

  /**
   * Get pattern analysis statistics
   */
  getAnalyticsStats(): {
    totalPatterns: number;
    patternsByType: Record<string, number>;
    cacheSize: number;
    memoryHistorySize: number;
  } {
    const patternsByType: Record<string, number> = {};

    for (const pattern of this.detectedPatterns.values()) {
      patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
    }

    return {
      totalPatterns: this.detectedPatterns.size,
      patternsByType,
      cacheSize: this.analysisCache.size,
      memoryHistorySize: this.memoryHistory.length,
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }

  /**
   * Export detected patterns
   */
  exportPatterns(): MemoryPattern[] {
    return Array.from(this.detectedPatterns.values());
  }
}

export default PatternAnalysis;
