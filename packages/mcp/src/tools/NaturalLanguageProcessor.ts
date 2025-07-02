/**
 * MCP v3.0 - Natural Language Processor
 * Advanced NLP capabilities for understanding and processing memory content
 */

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface EntityExtraction {
  text: string;
  type:
    | 'person'
    | 'organization'
    | 'location'
    | 'date'
    | 'number'
    | 'email'
    | 'url'
    | 'custom';
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface SentimentAnalysis {
  score: number; // -1 (negative) to 1 (positive)
  confidence: number;
  label: 'positive' | 'negative' | 'neutral';
  emotions: Array<{
    emotion: string;
    intensity: number;
  }>;
}

export interface TopicExtraction {
  topic: string;
  confidence: number;
  keywords: string[];
  relevance: number;
}

export interface LanguageFeatures {
  language: string;
  readabilityScore: number;
  complexityLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  keyPhrases: string[];
  wordCount: number;
  sentenceCount: number;
  avgWordsPerSentence: number;
}

export interface SemanticSummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  questions: string[];
  importance: number;
}

export interface NLPResult {
  memory: Memory;
  entities: EntityExtraction[];
  sentiment: SentimentAnalysis;
  topics: TopicExtraction[];
  features: LanguageFeatures;
  summary: SemanticSummary;
  relationships: Array<{
    type: 'reference' | 'similarity' | 'dependency' | 'sequence';
    targetMemoryId: string;
    strength: number;
    description: string;
  }>;
}

export class NaturalLanguageProcessor {
  private vocabularyIndex: Map<string, number> = new Map();
  private semanticCache: Map<string, NLPResult> = new Map();
  private entityPatterns: Map<string, RegExp> = new Map();
  private topicModels: Map<string, Array<{ word: string; weight: number }>> =
    new Map();

  constructor(
    private cacheSize: number = 1000,
    private confidenceThreshold: number = 0.6
  ) {
    this.initializeEntityPatterns();
    this.initializeTopicModels();
  }

  /**
   * Process memory content with comprehensive NLP analysis
   */
  async processMemory(memory: Memory): Promise<NLPResult> {
    const cacheKey = `${memory.id}_${this.hashContent(memory.content)}`;

    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey)!;
    }

    // Extract entities
    const entities = await this.extractEntities(memory.content);

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(memory.content);

    // Extract topics
    const topics = await this.extractTopics(memory.content);

    // Analyze language features
    const features = await this.analyzeLanguageFeatures(memory.content);

    // Generate semantic summary
    const summary = await this.generateSemanticSummary(memory.content);

    // Find relationships (placeholder - would need other memories)
    const relationships: NLPResult['relationships'] = [];

    const result: NLPResult = {
      memory,
      entities,
      sentiment,
      topics,
      features,
      summary,
      relationships,
    };

    // Cache the result
    this.cacheResult(cacheKey, result);

    return result;
  }

  /**
   * Batch process multiple memories
   */
  async batchProcess(memories: Memory[]): Promise<NLPResult[]> {
    const results: NLPResult[] = [];

    for (const memory of memories) {
      const result = await this.processMemory(memory);
      results.push(result);
    }

    // Add cross-memory relationships
    await this.analyzeCrossMemoryRelationships(results);

    return results;
  }

  /**
   * Extract named entities from text
   */
  private async extractEntities(text: string): Promise<EntityExtraction[]> {
    const entities: EntityExtraction[] = [];

    for (const [type, pattern] of this.entityPatterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        if (match.index !== undefined && match[0]) {
          entities.push({
            text: match[0],
            type: type as EntityExtraction['type'],
            confidence: this.calculateEntityConfidence(match[0], type),
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            metadata: this.extractEntityMetadata(match[0], type),
          });
        }
      }
    }

    // Remove overlapping entities (keep highest confidence)
    return this.deduplicateEntities(entities);
  }

  /**
   * Analyze sentiment and emotions
   */
  private async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    // Simple lexicon-based sentiment analysis
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'amazing',
      'wonderful',
      'fantastic',
      'love',
      'like',
      'enjoy',
      'happy',
      'excited',
      'pleased',
      'satisfied',
      'success',
      'successful',
      'achievement',
      'accomplished',
      'win',
      'won',
    ];

    const negativeWords = [
      'bad',
      'terrible',
      'awful',
      'horrible',
      'hate',
      'dislike',
      'angry',
      'frustrated',
      'disappointed',
      'sad',
      'upset',
      'annoyed',
      'error',
      'problem',
      'issue',
      'fail',
      'failed',
      'failure',
      'wrong',
    ];

    const emotionWords = {
      joy: ['happy', 'excited', 'delighted', 'cheerful', 'elated'],
      anger: ['angry', 'furious', 'mad', 'irritated', 'frustrated'],
      sadness: ['sad', 'depressed', 'disappointed', 'unhappy', 'down'],
      fear: ['afraid', 'scared', 'worried', 'anxious', 'nervous'],
      surprise: ['surprised', 'amazed', 'astonished', 'shocked'],
      trust: ['trust', 'confident', 'secure', 'reliable', 'dependable'],
    };

    const words = text.toLowerCase().split(/\W+/);
    let positiveScore = 0;
    let negativeScore = 0;
    const emotions: Array<{ emotion: string; intensity: number }> = [];

    // Count sentiment words
    for (const word of words) {
      if (positiveWords.includes(word)) {
        positiveScore += 1;
      }
      if (negativeWords.includes(word)) {
        negativeScore += 1;
      }

      // Check emotions
      for (const [emotion, emotionWordList] of Object.entries(emotionWords)) {
        if (emotionWordList.includes(word)) {
          const existing = emotions.find(e => e.emotion === emotion);
          if (existing) {
            existing.intensity += 0.1;
          } else {
            emotions.push({ emotion, intensity: 0.1 });
          }
        }
      }
    }

    // Calculate sentiment score
    const totalSentiment = positiveScore + negativeScore;
    let score = 0;
    let confidence = 0;
    let label: SentimentAnalysis['label'] = 'neutral';

    if (totalSentiment > 0) {
      score = (positiveScore - negativeScore) / totalSentiment;
      confidence = Math.min((totalSentiment / words.length) * 10, 1.0);

      if (score > 0.2) label = 'positive';
      else if (score < -0.2) label = 'negative';
    }

    // Normalize emotions
    emotions.forEach(emotion => {
      emotion.intensity = Math.min(emotion.intensity, 1.0);
    });

    return {
      score,
      confidence,
      label,
      emotions: emotions.sort((a, b) => b.intensity - a.intensity),
    };
  }

  /**
   * Extract topics from text
   */
  private async extractTopics(text: string): Promise<TopicExtraction[]> {
    const topics: TopicExtraction[] = [];
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3);

    // Check against known topic models
    for (const [topic, model] of this.topicModels) {
      let topicScore = 0;
      const matchedKeywords: string[] = [];

      for (const { word, weight } of model) {
        if (words.includes(word)) {
          topicScore += weight;
          matchedKeywords.push(word);
        }
      }

      if (topicScore > this.confidenceThreshold && matchedKeywords.length > 0) {
        topics.push({
          topic,
          confidence: Math.min(topicScore, 1.0),
          keywords: matchedKeywords,
          relevance: topicScore / model.length,
        });
      }
    }

    // Extract implicit topics from frequent word patterns
    const wordFreq = this.calculateWordFrequency(words);
    const significantWords = Array.from(wordFreq.entries())
      .filter(([_, freq]) => freq >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (significantWords.length > 0) {
      topics.push({
        topic: 'content_theme',
        confidence: 0.7,
        keywords: significantWords.map(([word, _]) => word),
        relevance: 0.8,
      });
    }

    return topics.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze language features and complexity
   */
  private async analyzeLanguageFeatures(
    text: string
  ): Promise<LanguageFeatures> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\W+/).filter(w => w.length > 0);

    // Calculate readability (simplified Flesch-Kincaid)
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = this.estimateAverageSyllables(words);
    const readabilityScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Determine complexity level
    let complexityLevel: LanguageFeatures['complexityLevel'] = 'basic';
    if (readabilityScore < 30) complexityLevel = 'expert';
    else if (readabilityScore < 50) complexityLevel = 'advanced';
    else if (readabilityScore < 70) complexityLevel = 'intermediate';

    // Extract key phrases (simplified n-grams)
    const keyPhrases = this.extractKeyPhrases(text);

    // Detect language (simplified - assumes English)
    const language = this.detectLanguage(text);

    return {
      language,
      readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
      complexityLevel,
      keyPhrases,
      wordCount: words.length,
      sentenceCount: sentences.length,
      avgWordsPerSentence: Number(avgWordsPerSentence.toFixed(1)),
    };
  }

  /**
   * Generate semantic summary
   */
  private async generateSemanticSummary(
    text: string
  ): Promise<SemanticSummary> {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Extract key sentences (simplified extractive summarization)
    const sentenceScores = sentences.map(sentence => ({
      sentence: sentence.trim(),
      score: this.calculateSentenceImportance(sentence, text),
    }));

    sentenceScores.sort((a, b) => b.score - a.score);

    // Generate summary (top sentences)
    const topSentences = sentenceScores.slice(0, Math.min(3, sentences.length));
    const summary = topSentences.map(s => s.sentence).join('. ');

    // Extract key points (important sentences)
    const keyPoints = sentenceScores
      .slice(0, 5)
      .map(s => s.sentence)
      .filter(s => s.length > 20);

    // Extract action items (sentences with action words)
    const actionWords = [
      'create',
      'build',
      'implement',
      'develop',
      'design',
      'test',
      'deploy',
      'fix',
      'update',
      'review',
    ];
    const actionItems = sentences.filter(sentence =>
      actionWords.some(word => sentence.toLowerCase().includes(word))
    );

    // Extract questions
    const questions = sentences.filter(
      sentence =>
        sentence.includes('?') ||
        sentence.toLowerCase().includes('how') ||
        sentence.toLowerCase().includes('what') ||
        sentence.toLowerCase().includes('why')
    );

    // Calculate importance
    const importance = this.calculateTextImportance(text);

    return {
      summary: summary || text.substring(0, 200) + '...',
      keyPoints: keyPoints.slice(0, 5),
      actionItems: actionItems.slice(0, 3),
      questions: questions.slice(0, 3),
      importance,
    };
  }

  /**
   * Analyze relationships between memories
   */
  private async analyzeCrossMemoryRelationships(
    results: NLPResult[]
  ): Promise<void> {
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const result1 = results[i];
        const result2 = results[j];

        // Check for entity references
        const entityMatches = this.findEntityMatches(
          result1.entities,
          result2.entities
        );
        if (entityMatches.length > 0) {
          result1.relationships.push({
            type: 'reference',
            targetMemoryId: result2.memory.id,
            strength:
              entityMatches.length /
              Math.max(result1.entities.length, result2.entities.length),
            description: `Shares entities: ${entityMatches.join(', ')}`,
          });
        }

        // Check for topic similarity
        const topicSimilarity = this.calculateTopicSimilarity(
          result1.topics,
          result2.topics
        );
        if (topicSimilarity > 0.5) {
          result1.relationships.push({
            type: 'similarity',
            targetMemoryId: result2.memory.id,
            strength: topicSimilarity,
            description: `Similar topics with ${(topicSimilarity * 100).toFixed(0)}% overlap`,
          });
        }

        // Check for temporal sequence
        const timeDiff = Math.abs(
          result1.memory.timestamp - result2.memory.timestamp
        );
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < 24 && topicSimilarity > 0.3) {
          result1.relationships.push({
            type: 'sequence',
            targetMemoryId: result2.memory.id,
            strength: 1 - hoursDiff / 24,
            description: `Sequential related content within ${Math.round(hoursDiff)} hours`,
          });
        }
      }
    }
  }

  /**
   * Initialize entity recognition patterns
   */
  private initializeEntityPatterns(): void {
    this.entityPatterns.set(
      'email',
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    );
    this.entityPatterns.set('url', /https?:\/\/[^\s]+/g);
    this.entityPatterns.set(
      'date',
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/g
    );
    this.entityPatterns.set('number', /\b\d+(\.\d+)?\b/g);
    this.entityPatterns.set('person', /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g);
    this.entityPatterns.set(
      'organization',
      /\b[A-Z][A-Za-z]+ (?:Inc|Corp|LLC|Ltd|Company|Corporation)\b/g
    );
  }

  /**
   * Initialize topic models
   */
  private initializeTopicModels(): void {
    this.topicModels.set('technology', [
      { word: 'software', weight: 0.3 },
      { word: 'development', weight: 0.3 },
      { word: 'programming', weight: 0.3 },
      { word: 'code', weight: 0.25 },
      { word: 'system', weight: 0.2 },
      { word: 'database', weight: 0.2 },
      { word: 'api', weight: 0.2 },
      { word: 'framework', weight: 0.15 },
      { word: 'algorithm', weight: 0.15 },
    ]);

    this.topicModels.set('business', [
      { word: 'project', weight: 0.3 },
      { word: 'meeting', weight: 0.25 },
      { word: 'client', weight: 0.25 },
      { word: 'budget', weight: 0.2 },
      { word: 'deadline', weight: 0.2 },
      { word: 'strategy', weight: 0.2 },
      { word: 'revenue', weight: 0.15 },
      { word: 'market', weight: 0.15 },
    ]);

    this.topicModels.set('research', [
      { word: 'study', weight: 0.3 },
      { word: 'analysis', weight: 0.3 },
      { word: 'data', weight: 0.25 },
      { word: 'research', weight: 0.25 },
      { word: 'experiment', weight: 0.2 },
      { word: 'hypothesis', weight: 0.2 },
      { word: 'findings', weight: 0.15 },
    ]);

    this.topicModels.set('personal', [
      { word: 'personal', weight: 0.3 },
      { word: 'family', weight: 0.25 },
      { word: 'health', weight: 0.2 },
      { word: 'hobby', weight: 0.2 },
      { word: 'travel', weight: 0.15 },
      { word: 'friend', weight: 0.15 },
    ]);
  }

  // Utility methods

  private calculateEntityConfidence(text: string, type: string): number {
    // Simple confidence calculation based on pattern strength
    const confidenceMap: Record<string, number> = {
      email: 0.95,
      url: 0.9,
      date: 0.8,
      number: 0.7,
      person: 0.6,
      organization: 0.7,
    };

    return confidenceMap[type] || 0.5;
  }

  private extractEntityMetadata(
    text: string,
    type: string
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    switch (type) {
      case 'email':
        const domain = text.split('@')[1];
        metadata.domain = domain;
        break;
      case 'url':
        try {
          const url = new URL(text);
          metadata.domain = url.hostname;
          metadata.protocol = url.protocol;
        } catch (e) {
          // Invalid URL
        }
        break;
      case 'date':
        metadata.format = text.includes('-') ? 'ISO' : 'US';
        break;
      case 'number':
        metadata.isInteger = !text.includes('.');
        metadata.value = parseFloat(text);
        break;
    }

    return metadata;
  }

  private deduplicateEntities(
    entities: EntityExtraction[]
  ): EntityExtraction[] {
    const deduplicated: EntityExtraction[] = [];

    entities.sort((a, b) => b.confidence - a.confidence);

    for (const entity of entities) {
      const overlapping = deduplicated.find(existing =>
        this.entitiesOverlap(entity, existing)
      );

      if (!overlapping) {
        deduplicated.push(entity);
      }
    }

    return deduplicated;
  }

  private entitiesOverlap(a: EntityExtraction, b: EntityExtraction): boolean {
    return !(a.endIndex <= b.startIndex || b.endIndex <= a.startIndex);
  }

  private calculateWordFrequency(words: string[]): Map<string, number> {
    const frequency = new Map<string, number>();

    for (const word of words) {
      if (word.length > 3) {
        // Skip short words
        frequency.set(word, (frequency.get(word) || 0) + 1);
      }
    }

    return frequency;
  }

  private estimateAverageSyllables(words: string[]): number {
    let totalSyllables = 0;

    for (const word of words) {
      // Simple syllable counting heuristic
      const vowels = word.toLowerCase().match(/[aeiouy]+/g);
      const syllableCount = vowels ? vowels.length : 1;
      totalSyllables += Math.max(1, syllableCount);
    }

    return totalSyllables / words.length;
  }

  private extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Extract noun phrases (simplified)
    const words = text.split(/\W+/);
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
    ]);

    for (let i = 0; i < words.length - 1; i++) {
      const word1 = words[i].toLowerCase();
      const word2 = words[i + 1].toLowerCase();

      if (
        !stopWords.has(word1) &&
        !stopWords.has(word2) &&
        word1.length > 3 &&
        word2.length > 3
      ) {
        phrases.push(`${word1} ${word2}`);
      }
    }

    // Get most frequent phrases
    const phraseFreq = this.calculateWordFrequency(phrases);
    return Array.from(phraseFreq.entries())
      .filter(([_, freq]) => freq >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, _]) => phrase);
  }

  private detectLanguage(text: string): string {
    // Simplified language detection - assumes English
    // In production, this would use a proper language detection library
    return 'en';
  }

  private calculateSentenceImportance(
    sentence: string,
    fullText: string
  ): number {
    const words = sentence.toLowerCase().split(/\W+/);
    const fullWords = fullText.toLowerCase().split(/\W+/);
    const wordFreq = this.calculateWordFrequency(fullWords);

    // Calculate sentence score based on word importance
    let score = 0;
    for (const word of words) {
      if (word.length > 3) {
        const freq = wordFreq.get(word) || 0;
        score += Math.log(freq + 1);
      }
    }

    // Boost for sentence position (first and last sentences are often important)
    const sentences = fullText.split(/[.!?]+/);
    const sentenceIndex = sentences.findIndex(s => s.includes(sentence));
    if (sentenceIndex === 0 || sentenceIndex === sentences.length - 1) {
      score *= 1.2;
    }

    return score / words.length; // Normalize by sentence length
  }

  private calculateTextImportance(text: string): number {
    // Calculate importance based on various factors
    let importance = 0;

    // Length factor
    const wordCount = text.split(/\W+/).length;
    importance += Math.min(wordCount / 100, 0.3);

    // Complexity factor
    const uniqueWords = new Set(text.toLowerCase().split(/\W+/)).size;
    const lexicalDiversity = uniqueWords / wordCount;
    importance += lexicalDiversity * 0.3;

    // Entity density
    const entityCount = this.countEntities(text);
    importance += Math.min(entityCount / 10, 0.2);

    // Action word presence
    const actionWords = [
      'create',
      'build',
      'implement',
      'develop',
      'design',
      'important',
      'critical',
    ];
    const hasActionWords = actionWords.some(word =>
      text.toLowerCase().includes(word)
    );
    if (hasActionWords) importance += 0.2;

    return Math.min(importance, 1.0);
  }

  private countEntities(text: string): number {
    let count = 0;
    for (const pattern of this.entityPatterns.values()) {
      const matches = text.match(pattern);
      if (matches) count += matches.length;
    }
    return count;
  }

  private findEntityMatches(
    entities1: EntityExtraction[],
    entities2: EntityExtraction[]
  ): string[] {
    const matches: string[] = [];

    for (const entity1 of entities1) {
      for (const entity2 of entities2) {
        if (
          entity1.type === entity2.type &&
          entity1.text.toLowerCase() === entity2.text.toLowerCase()
        ) {
          matches.push(entity1.text);
        }
      }
    }

    return [...new Set(matches)]; // Remove duplicates
  }

  private calculateTopicSimilarity(
    topics1: TopicExtraction[],
    topics2: TopicExtraction[]
  ): number {
    if (topics1.length === 0 || topics2.length === 0) return 0;

    let similarity = 0;
    let totalWeight = 0;

    for (const topic1 of topics1) {
      for (const topic2 of topics2) {
        if (topic1.topic === topic2.topic) {
          const weight = Math.min(topic1.confidence, topic2.confidence);
          similarity += weight;
          totalWeight += weight;
        }

        // Check keyword overlap
        const keywordOverlap = topic1.keywords.filter(k =>
          topic2.keywords.includes(k)
        ).length;
        if (keywordOverlap > 0) {
          const overlapScore =
            keywordOverlap /
            Math.max(topic1.keywords.length, topic2.keywords.length);
          similarity += overlapScore * 0.5;
          totalWeight += 0.5;
        }
      }
    }

    return totalWeight > 0 ? similarity / totalWeight : 0;
  }

  private hashContent(content: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  private cacheResult(key: string, result: NLPResult): void {
    this.semanticCache.set(key, result);

    // Maintain cache size
    if (this.semanticCache.size > this.cacheSize) {
      const keysToDelete = Array.from(this.semanticCache.keys()).slice(
        0,
        this.cacheSize / 2
      );
      for (const keyToDelete of keysToDelete) {
        this.semanticCache.delete(keyToDelete);
      }
    }
  }

  /**
   * Get NLP processing statistics
   */
  getProcessingStats(): {
    cacheSize: number;
    vocabularySize: number;
    topicModels: number;
    entityPatterns: number;
  } {
    return {
      cacheSize: this.semanticCache.size,
      vocabularySize: this.vocabularyIndex.size,
      topicModels: this.topicModels.size,
      entityPatterns: this.entityPatterns.size,
    };
  }

  /**
   * Clear processing cache
   */
  clearCache(): void {
    this.semanticCache.clear();
  }

  /**
   * Add custom entity pattern
   */
  addEntityPattern(type: string, pattern: RegExp): void {
    this.entityPatterns.set(type, pattern);
  }

  /**
   * Add custom topic model
   */
  addTopicModel(
    topic: string,
    model: Array<{ word: string; weight: number }>
  ): void {
    this.topicModels.set(topic, model);
  }

  /**
   * Analyze text similarity between two memories
   */
  async calculateSimilarity(memory1: Memory, memory2: Memory): Promise<number> {
    const result1 = await this.processMemory(memory1);
    const result2 = await this.processMemory(memory2);

    // Calculate similarity based on multiple factors
    const topicSimilarity = this.calculateTopicSimilarity(
      result1.topics,
      result2.topics
    );
    const entitySimilarity =
      this.findEntityMatches(result1.entities, result2.entities).length /
      Math.max(result1.entities.length, result2.entities.length, 1);
    const sentimentSimilarity =
      1 - Math.abs(result1.sentiment.score - result2.sentiment.score) / 2;

    // Weighted average
    return (
      topicSimilarity * 0.5 + entitySimilarity * 0.3 + sentimentSimilarity * 0.2
    );
  }

  /**
   * Extract insights from batch processing
   */
  extractInsights(results: NLPResult[]): {
    commonTopics: Array<{ topic: string; frequency: number }>;
    sentimentTrend: { average: number; distribution: Record<string, number> };
    entityFrequency: Array<{ entity: string; count: number; type: string }>;
    languageComplexity: {
      average: number;
      distribution: Record<string, number>;
    };
  } {
    // Common topics
    const topicCounts = new Map<string, number>();
    for (const result of results) {
      for (const topic of result.topics) {
        topicCounts.set(topic.topic, (topicCounts.get(topic.topic) || 0) + 1);
      }
    }

    const commonTopics = Array.from(topicCounts.entries())
      .map(([topic, frequency]) => ({ topic, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Sentiment trend
    const sentiments = results.map(r => r.sentiment.score);
    const averageSentiment =
      sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length;
    const sentimentDistribution = {
      positive: results.filter(r => r.sentiment.label === 'positive').length,
      negative: results.filter(r => r.sentiment.label === 'negative').length,
      neutral: results.filter(r => r.sentiment.label === 'neutral').length,
    };

    // Entity frequency
    const entityCounts = new Map<string, { count: number; type: string }>();
    for (const result of results) {
      for (const entity of result.entities) {
        const key = entity.text.toLowerCase();
        const existing = entityCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          entityCounts.set(key, { count: 1, type: entity.type });
        }
      }
    }

    const entityFrequency = Array.from(entityCounts.entries())
      .map(([entity, data]) => ({ entity, count: data.count, type: data.type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Language complexity
    const complexityLevels = results.map(r => r.features.complexityLevel);
    const averageReadability =
      results.reduce((sum, r) => sum + r.features.readabilityScore, 0) /
      results.length;
    const complexityDistribution = {
      basic: complexityLevels.filter(c => c === 'basic').length,
      intermediate: complexityLevels.filter(c => c === 'intermediate').length,
      advanced: complexityLevels.filter(c => c === 'advanced').length,
      expert: complexityLevels.filter(c => c === 'expert').length,
    };

    return {
      commonTopics,
      sentimentTrend: {
        average: averageSentiment,
        distribution: sentimentDistribution,
      },
      entityFrequency,
      languageComplexity: {
        average: averageReadability,
        distribution: complexityDistribution,
      },
    };
  }
}

export default NaturalLanguageProcessor;
