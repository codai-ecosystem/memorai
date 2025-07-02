/**
 * Natural Language Understanding - Advanced NLP capabilities for Memorai
 * Part of Phase 4.2: Natural Language Understanding for Memorai Ultimate Completion Plan
 */

// Result type for consistent error handling
type Result<T, E> = 
  | { success: true; error: undefined; data: T }
  | { success: false; error: E; data: undefined };

// NLU Types
interface EntityExtraction {
  entities: Entity[];
  confidence: number;
  model: string;
  timestamp: Date;
}

interface Entity {
  text: string;
  label: string;
  start: number;
  end: number;
  confidence: number;
  metadata?: Record<string, any>;
}

interface IntentClassification {
  intent: string;
  confidence: number;
  alternatives: Array<{ intent: string; confidence: number }>;
  model: string;
  timestamp: Date;
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number;
  emotions: Array<{ emotion: string; intensity: number }>;
  model: string;
  timestamp: Date;
}

interface TopicExtraction {
  topics: Array<{ topic: string; relevance: number; keywords: string[] }>;
  primaryTopic: string;
  model: string;
  timestamp: Date;
}

interface TextSummary {
  summary: string;
  keyPoints: string[];
  originalLength: number;
  summaryLength: number;
  compressionRatio: number;
  model: string;
  timestamp: Date;
}

interface KeywordExtraction {
  keywords: Array<{ keyword: string; score: number; frequency: number }>;
  phrases: Array<{ phrase: string; score: number; relevance: number }>;
  model: string;
  timestamp: Date;
}

interface LanguageDetection {
  language: string;
  confidence: number;
  alternatives: Array<{ language: string; confidence: number }>;
  model: string;
  timestamp: Date;
}

// Entity Recognition Service
class EntityRecognitionService {
  private readonly patterns: Map<string, RegExp[]> = new Map();
  private readonly gazetteers: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeGazetteers();
  }

  private initializePatterns(): void {
    // Email patterns
    this.patterns.set('EMAIL', [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    ]);

    // Phone patterns
    this.patterns.set('PHONE', [
      /\b\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
      /\b\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g
    ]);

    // Date patterns
    this.patterns.set('DATE', [
      /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
      /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/gi,
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/gi
    ]);

    // Time patterns
    this.patterns.set('TIME', [
      /\b(\d{1,2}):(\d{2})\s?(AM|PM|am|pm)\b/g,
      /\b(\d{1,2}):(\d{2}):(\d{2})\b/g
    ]);

    // URL patterns
    this.patterns.set('URL', [
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    ]);

    // Money patterns
    this.patterns.set('MONEY', [
      /\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s?(dollars?|USD|usd)/gi
    ]);

    // Number patterns
    this.patterns.set('NUMBER', [
      /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g
    ]);

    // Percentage patterns
    this.patterns.set('PERCENTAGE', [
      /\b(\d+(?:\.\d+)?)\s?%/g,
      /\b(\d+(?:\.\d+)?)\s?percent/gi
    ]);
  }

  private initializeGazetteers(): void {
    // Person names (simplified)
    this.gazetteers.set('PERSON', new Set([
      'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa',
      'James', 'Mary', 'William', 'Jennifer', 'Richard', 'Linda', 'Thomas', 'Elizabeth'
    ]));

    // Organizations
    this.gazetteers.set('ORG', new Set([
      'Microsoft', 'Google', 'Apple', 'Amazon', 'Meta', 'Tesla', 'Netflix',
      'OpenAI', 'Anthropic', 'GitHub', 'Stack Overflow', 'Reddit', 'Twitter', 'LinkedIn'
    ]));

    // Locations
    this.gazetteers.set('GPE', new Set([
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
      'California', 'Texas', 'Florida', 'New York', 'Pennsylvania', 'Illinois',
      'United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile',
      'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Netherlands',
      'China', 'Japan', 'South Korea', 'India', 'Australia', 'New Zealand'
    ]));

    // Technologies
    this.gazetteers.set('TECHNOLOGY', new Set([
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Ruby', 'Go',
      'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch', 'Docker', 'Kubernetes',
      'AWS', 'Azure', 'Google Cloud', 'Firebase', 'Vercel', 'Netlify'
    ]));
  }

  async extractEntities(text: string): Promise<Result<EntityExtraction, string>> {
    try {
      const entities: Entity[] = [];

      // Pattern-based extraction
      for (const [label, patterns] of this.patterns.entries()) {
        for (const pattern of patterns) {
          const matches = Array.from(text.matchAll(pattern));
          for (const match of matches) {
            if (match.index !== undefined) {
              entities.push({
                text: match[0],
                label,
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.9,
                metadata: { method: 'pattern' }
              });
            }
          }
        }
      }

      // Gazetteer-based extraction
      for (const [label, gazetteer] of this.gazetteers.entries()) {
        const words = text.split(/\s+/);
        let currentIndex = 0;

        for (const word of words) {
          const cleanWord = word.replace(/[^\w\s]/g, '');
          if (gazetteer.has(cleanWord)) {
            const startIndex = text.indexOf(word, currentIndex);
            if (startIndex !== -1) {
              entities.push({
                text: word,
                label,
                start: startIndex,
                end: startIndex + word.length,
                confidence: 0.8,
                metadata: { method: 'gazetteer' }
              });
            }
          }
          currentIndex = text.indexOf(word, currentIndex) + word.length;
        }
      }

      // Remove overlapping entities (keep highest confidence)
      const filteredEntities = this.removeOverlappingEntities(entities);

      const result: EntityExtraction = {
        entities: filteredEntities,
        confidence: filteredEntities.length > 0 ? 
          filteredEntities.reduce((sum, e) => sum + e.confidence, 0) / filteredEntities.length : 0,
        model: 'pattern-gazetteer-v1',
        timestamp: new Date()
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Entity extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private removeOverlappingEntities(entities: Entity[]): Entity[] {
    // Sort by start position
    const sorted = entities.sort((a, b) => a.start - b.start);
    const filtered: Entity[] = [];

    for (const entity of sorted) {
      // Check if this entity overlaps with any already added entity
      const overlaps = filtered.some(existing => 
        (entity.start < existing.end && entity.end > existing.start)
      );

      if (!overlaps) {
        filtered.push(entity);
      } else {
        // If it overlaps, keep the one with higher confidence
        const overlapping = filtered.find(existing => 
          entity.start < existing.end && entity.end > existing.start
        );
        
        if (overlapping && entity.confidence > overlapping.confidence) {
          const index = filtered.indexOf(overlapping);
          filtered[index] = entity;
        }
      }
    }

    return filtered;
  }
}

// Intent Classification Service
class IntentClassificationService {
  private readonly intentPatterns: Map<string, Array<{ pattern: RegExp; weight: number }>> = new Map();
  private readonly intentKeywords: Map<string, Array<{ keyword: string; weight: number }>> = new Map();

  constructor() {
    this.initializeIntentPatterns();
  }

  private initializeIntentPatterns(): void {
    // Search intent
    this.intentPatterns.set('search', [
      { pattern: /find|search|look\s+for|locate|discover/i, weight: 0.9 },
      { pattern: /what\s+is|where\s+is|show\s+me/i, weight: 0.8 },
      { pattern: /\?\s*$/i, weight: 0.3 }
    ]);

    this.intentKeywords.set('search', [
      { keyword: 'find', weight: 0.8 },
      { keyword: 'search', weight: 0.9 },
      { keyword: 'lookup', weight: 0.7 },
      { keyword: 'query', weight: 0.6 }
    ]);

    // Create intent
    this.intentPatterns.set('create', [
      { pattern: /create|make|add|new|generate|build/i, weight: 0.9 },
      { pattern: /can\s+you\s+(create|make|add)/i, weight: 0.8 }
    ]);

    this.intentKeywords.set('create', [
      { keyword: 'create', weight: 0.9 },
      { keyword: 'add', weight: 0.8 },
      { keyword: 'new', weight: 0.7 },
      { keyword: 'make', weight: 0.6 }
    ]);

    // Update intent
    this.intentPatterns.set('update', [
      { pattern: /update|modify|change|edit|alter/i, weight: 0.9 },
      { pattern: /can\s+you\s+(update|modify|change)/i, weight: 0.8 }
    ]);

    this.intentKeywords.set('update', [
      { keyword: 'update', weight: 0.9 },
      { keyword: 'modify', weight: 0.8 },
      { keyword: 'change', weight: 0.8 },
      { keyword: 'edit', weight: 0.7 }
    ]);

    // Delete intent
    this.intentPatterns.set('delete', [
      { pattern: /delete|remove|erase|clear|eliminate/i, weight: 0.9 },
      { pattern: /can\s+you\s+(delete|remove)/i, weight: 0.8 }
    ]);

    this.intentKeywords.set('delete', [
      { keyword: 'delete', weight: 0.9 },
      { keyword: 'remove', weight: 0.8 },
      { keyword: 'erase', weight: 0.7 },
      { keyword: 'clear', weight: 0.6 }
    ]);

    // Help intent
    this.intentPatterns.set('help', [
      { pattern: /help|assist|support|guide|how\s+to/i, weight: 0.9 },
      { pattern: /can\s+you\s+help/i, weight: 0.8 }
    ]);

    this.intentKeywords.set('help', [
      { keyword: 'help', weight: 0.9 },
      { keyword: 'assist', weight: 0.7 },
      { keyword: 'support', weight: 0.6 },
      { keyword: 'guide', weight: 0.5 }
    ]);

    // Greeting intent
    this.intentPatterns.set('greeting', [
      { pattern: /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i, weight: 0.9 }
    ]);

    this.intentKeywords.set('greeting', [
      { keyword: 'hello', weight: 0.9 },
      { keyword: 'hi', weight: 0.8 },
      { keyword: 'hey', weight: 0.7 },
      { keyword: 'greetings', weight: 0.6 }
    ]);
  }

  async classifyIntent(text: string): Promise<Result<IntentClassification, string>> {
    try {
      const intentScores: Map<string, number> = new Map();

      // Calculate scores based on patterns
      for (const [intent, patterns] of this.intentPatterns.entries()) {
        let score = 0;
        for (const { pattern, weight } of patterns) {
          if (pattern.test(text)) {
            score += weight;
          }
        }
        if (score > 0) {
          intentScores.set(intent, score);
        }
      }

      // Calculate scores based on keywords
      const words = text.toLowerCase().split(/\s+/);
      for (const [intent, keywords] of this.intentKeywords.entries()) {
        let score = intentScores.get(intent) || 0;
        for (const { keyword, weight } of keywords) {
          if (words.includes(keyword)) {
            score += weight;
          }
        }
        intentScores.set(intent, score);
      }

      // Convert to sorted array
      const sortedIntents = Array.from(intentScores.entries())
        .map(([intent, score]) => ({ intent, confidence: Math.min(score, 1.0) }))
        .sort((a, b) => b.confidence - a.confidence);

      if (sortedIntents.length === 0) {
        // Default to 'unknown' intent
        sortedIntents.push({ intent: 'unknown', confidence: 0.1 });
      }

      const primaryIntent = sortedIntents[0];
      const alternatives = sortedIntents.slice(1, 5);

      const result: IntentClassification = {
        intent: primaryIntent.intent,
        confidence: primaryIntent.confidence,
        alternatives,
        model: 'rule-based-intent-v1',
        timestamp: new Date()
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Intent classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }
}

// Sentiment Analysis Service
class SentimentAnalysisService {
  private readonly positiveWords: Set<string> = new Set();
  private readonly negativeWords: Set<string> = new Set();
  private readonly intensifiers: Map<string, number> = new Map();
  private readonly negators: Set<string> = new Set();

  constructor() {
    this.initializeLexicons();
  }

  private initializeLexicons(): void {
    // Positive words
    const positiveWords = [
      'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'nice',
      'awesome', 'brilliant', 'outstanding', 'superb', 'marvelous', 'terrific',
      'love', 'like', 'enjoy', 'appreciate', 'happy', 'pleased', 'satisfied',
      'perfect', 'beautiful', 'incredible', 'impressive', 'remarkable'
    ];
    positiveWords.forEach(word => this.positiveWords.add(word));

    // Negative words
    const negativeWords = [
      'terrible', 'awful', 'horrible', 'bad', 'poor', 'worse', 'worst',
      'hate', 'dislike', 'disgusting', 'annoying', 'frustrating', 'disappointing',
      'sad', 'angry', 'upset', 'mad', 'furious', 'devastated', 'disappointed',
      'useless', 'worthless', 'pathetic', 'ridiculous', 'stupid'
    ];
    negativeWords.forEach(word => this.negativeWords.add(word));

    // Intensifiers
    this.intensifiers.set('very', 1.5);
    this.intensifiers.set('extremely', 2.0);
    this.intensifiers.set('incredibly', 1.8);
    this.intensifiers.set('absolutely', 1.7);
    this.intensifiers.set('totally', 1.6);
    this.intensifiers.set('completely', 1.6);
    this.intensifiers.set('really', 1.3);
    this.intensifiers.set('quite', 1.2);
    this.intensifiers.set('somewhat', 0.8);
    this.intensifiers.set('slightly', 0.7);
    this.intensifiers.set('barely', 0.5);

    // Negators
    this.negators.add('not');
    this.negators.add('no');
    this.negators.add('never');
    this.negators.add('none');
    this.negators.add('nobody');
    this.negators.add('nothing');
    this.negators.add('neither');
    this.negators.add('nowhere');
    this.negators.add('hardly');
    this.negators.add('scarcely');
    this.negators.add('barely');
  }

  async analyzeSentiment(text: string): Promise<Result<SentimentAnalysis, string>> {
    try {
      const words = text.toLowerCase().split(/\s+/);
      let sentimentScore = 0;
      let sentimentCount = 0;

      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[^\w]/g, '');
        let wordScore = 0;

        // Determine base sentiment
        if (this.positiveWords.has(word)) {
          wordScore = 1;
        } else if (this.negativeWords.has(word)) {
          wordScore = -1;
        }

        if (wordScore !== 0) {
          // Check for intensifiers before this word
          if (i > 0) {
            const prevWord = words[i - 1].replace(/[^\w]/g, '');
            const intensifier = this.intensifiers.get(prevWord);
            if (intensifier) {
              wordScore *= intensifier;
            }
          }

          // Check for negators before this word (within 3 words)
          let negated = false;
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const checkWord = words[j].replace(/[^\w]/g, '');
            if (this.negators.has(checkWord)) {
              negated = true;
              break;
            }
          }

          if (negated) {
            wordScore *= -1;
          }

          sentimentScore += wordScore;
          sentimentCount++;
        }
      }

      // Normalize score
      const normalizedScore = sentimentCount > 0 ? sentimentScore / sentimentCount : 0;
      const clampedScore = Math.max(-1, Math.min(1, normalizedScore));

      // Determine sentiment category
      let sentiment: 'positive' | 'negative' | 'neutral';
      if (clampedScore > 0.1) {
        sentiment = 'positive';
      } else if (clampedScore < -0.1) {
        sentiment = 'negative';
      } else {
        sentiment = 'neutral';
      }

      // Calculate confidence based on absolute score and word count
      const confidence = Math.min(Math.abs(clampedScore) + (sentimentCount / words.length), 1.0);

      // Generate emotions (simplified)
      const emotions = this.generateEmotions(clampedScore, text);

      const result: SentimentAnalysis = {
        sentiment,
        score: clampedScore,
        confidence,
        emotions,
        model: 'lexicon-based-sentiment-v1',
        timestamp: new Date()
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private generateEmotions(score: number, text: string): Array<{ emotion: string; intensity: number }> {
    const emotions: Array<{ emotion: string; intensity: number }> = [];
    const lowerText = text.toLowerCase();

    if (score > 0.5) {
      emotions.push({ emotion: 'joy', intensity: score });
      if (lowerText.includes('love') || lowerText.includes('amazing')) {
        emotions.push({ emotion: 'love', intensity: score * 0.8 });
      }
    } else if (score < -0.5) {
      emotions.push({ emotion: 'anger', intensity: Math.abs(score) });
      if (lowerText.includes('sad') || lowerText.includes('disappointed')) {
        emotions.push({ emotion: 'sadness', intensity: Math.abs(score) * 0.9 });
      }
    } else {
      emotions.push({ emotion: 'neutral', intensity: 0.5 });
    }

    // Additional emotion detection based on keywords
    if (lowerText.includes('exciting') || lowerText.includes('thrilled')) {
      emotions.push({ emotion: 'excitement', intensity: 0.8 });
    }
    if (lowerText.includes('worried') || lowerText.includes('concerned')) {
      emotions.push({ emotion: 'worry', intensity: 0.7 });
    }
    if (lowerText.includes('surprised') || lowerText.includes('shocked')) {
      emotions.push({ emotion: 'surprise', intensity: 0.6 });
    }

    return emotions;
  }
}

// Topic Extraction Service
class TopicExtractionService {
  private readonly topicKeywords: Map<string, string[]> = new Map();

  constructor() {
    this.initializeTopicKeywords();
  }

  private initializeTopicKeywords(): void {
    this.topicKeywords.set('technology', [
      'computer', 'software', 'programming', 'code', 'algorithm', 'data',
      'artificial intelligence', 'ai', 'machine learning', 'api', 'database',
      'javascript', 'python', 'react', 'node', 'docker', 'kubernetes'
    ]);

    this.topicKeywords.set('business', [
      'company', 'business', 'market', 'sales', 'revenue', 'profit', 'customer',
      'strategy', 'management', 'team', 'project', 'budget', 'finance', 'investment'
    ]);

    this.topicKeywords.set('health', [
      'health', 'medical', 'doctor', 'hospital', 'medicine', 'treatment',
      'exercise', 'fitness', 'nutrition', 'wellness', 'therapy', 'diagnosis'
    ]);

    this.topicKeywords.set('education', [
      'school', 'university', 'course', 'learning', 'study', 'education',
      'student', 'teacher', 'class', 'lesson', 'homework', 'exam', 'degree'
    ]);

    this.topicKeywords.set('travel', [
      'travel', 'trip', 'vacation', 'flight', 'hotel', 'destination',
      'tourism', 'journey', 'adventure', 'explore', 'visit', 'sightseeing'
    ]);

    this.topicKeywords.set('food', [
      'food', 'recipe', 'cooking', 'restaurant', 'meal', 'dinner', 'lunch',
      'breakfast', 'cuisine', 'ingredient', 'kitchen', 'chef', 'delicious'
    ]);

    this.topicKeywords.set('entertainment', [
      'movie', 'film', 'music', 'song', 'game', 'book', 'entertainment',
      'show', 'concert', 'theater', 'artist', 'performance', 'fun'
    ]);

    this.topicKeywords.set('sports', [
      'sport', 'game', 'team', 'player', 'match', 'competition', 'tournament',
      'football', 'basketball', 'baseball', 'soccer', 'tennis', 'golf'
    ]);
  }

  async extractTopics(text: string): Promise<Result<TopicExtraction, string>> {
    try {
      const lowerText = text.toLowerCase();
      const topicScores: Map<string, { score: number; keywords: string[] }> = new Map();

      // Calculate topic scores based on keyword matches
      for (const [topic, keywords] of this.topicKeywords.entries()) {
        let score = 0;
        const foundKeywords: string[] = [];

        for (const keyword of keywords) {
          if (lowerText.includes(keyword)) {
            score += 1;
            foundKeywords.push(keyword);
          }
        }

        if (score > 0) {
          // Normalize by keyword count and text length
          const normalizedScore = score / keywords.length * (foundKeywords.length / text.split(' ').length * 100);
          topicScores.set(topic, { score: normalizedScore, keywords: foundKeywords });
        }
      }

      // Convert to sorted array
      const topics = Array.from(topicScores.entries())
        .map(([topic, { score, keywords }]) => ({
          topic,
          relevance: Math.min(score, 1.0),
          keywords
        }))
        .sort((a, b) => b.relevance - a.relevance);

      const primaryTopic = topics.length > 0 ? topics[0].topic : 'general';

      const result: TopicExtraction = {
        topics,
        primaryTopic,
        model: 'keyword-based-topic-v1',
        timestamp: new Date()
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Topic extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }
}

// Text Summarization Service
class TextSummarizationService {
  async summarizeText(text: string, maxLength: number = 200): Promise<Result<TextSummary, string>> {
    try {
      const sentences = this.splitIntoSentences(text);
      
      if (sentences.length <= 3) {
        // Text is already short enough
        return {
          success: true,
          error: undefined,
          data: {
            summary: text,
            keyPoints: sentences,
            originalLength: text.length,
            summaryLength: text.length,
            compressionRatio: 1.0,
            model: 'extractive-summary-v1',
            timestamp: new Date()
          }
        };
      }

      // Score sentences based on various factors
      const sentenceScores = this.scoreSentences(sentences, text);

      // Select top sentences for summary
      const selectedSentences = this.selectSentences(sentenceScores, maxLength);

      // Create summary by joining selected sentences
      const summary = selectedSentences
        .sort((a, b) => a.position - b.position)
        .map(s => s.sentence)
        .join(' ');

      // Extract key points (top scored sentences)
      const keyPoints = sentenceScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => s.sentence);

      const result: TextSummary = {
        summary,
        keyPoints,
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / text.length,
        model: 'extractive-summary-v1',
        timestamp: new Date()
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Text summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private scoreSentences(sentences: string[], fullText: string): Array<{ sentence: string; score: number; position: number }> {
    const wordFreq = this.calculateWordFrequency(fullText);
    const scores: Array<{ sentence: string; score: number; position: number }> = [];

    sentences.forEach((sentence, index) => {
      let score = 0;
      const words = sentence.toLowerCase().split(/\s+/);

      // Score based on word frequency
      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 3) { // Ignore short words
          score += wordFreq.get(cleanWord) || 0;
        }
      }

      // Normalize by sentence length
      score = score / words.length;

      // Position bonus (earlier sentences get higher scores)
      const positionBonus = (sentences.length - index) / sentences.length * 0.3;
      score += positionBonus;

      // Length penalty for very short or very long sentences
      if (words.length < 5 || words.length > 30) {
        score *= 0.5;
      }

      scores.push({ sentence, score, position: index });
    });

    return scores;
  }

  private calculateWordFrequency(text: string): Map<string, number> {
    const freq = new Map<string, number>();
    const words = text.toLowerCase().split(/\s+/);

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 0) {
        freq.set(cleanWord, (freq.get(cleanWord) || 0) + 1);
      }
    }

    return freq;
  }

  private selectSentences(
    scores: Array<{ sentence: string; score: number; position: number }>,
    maxLength: number
  ): Array<{ sentence: string; score: number; position: number }> {
    const sorted = scores.sort((a, b) => b.score - a.score);
    const selected: Array<{ sentence: string; score: number; position: number }> = [];
    let currentLength = 0;

    for (const item of sorted) {
      if (currentLength + item.sentence.length <= maxLength) {
        selected.push(item);
        currentLength += item.sentence.length;
      }
    }

    return selected;
  }
}

// Export all NLU services
export {
  EntityRecognitionService,
  IntentClassificationService,
  SentimentAnalysisService,
  TopicExtractionService,
  TextSummarizationService
};
