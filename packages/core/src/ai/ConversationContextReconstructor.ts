/**
 * Conversation Context Reconstruction Engine
 * Advanced system for reconstructing and maintaining conversation context across sessions
 */

import { MemoryMetadata } from '../types/index.js';
import {
  MemoryPattern,
  PatternRecognitionEngine,
} from './PatternRecognition.js';
import {
  AIMemoryRelationship,
  RelationshipExtractor,
} from './RelationshipExtractor.js';

export interface ConversationThread {
  id: string;
  agentId: string;
  userId?: string;
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  context: ConversationContext;
  memories: MemoryMetadata[];
  relationships: AIMemoryRelationship[];
  patterns: MemoryPattern[];
  metadata: {
    topic?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    complexity: number;
    continuity: number; // 0-1 scale of how well context flows
    tags: string[];
  };
}

export interface ConversationContext {
  currentTopic: string;
  topicHistory: Array<{
    topic: string;
    timestamp: Date;
    confidence: number;
  }>;
  entities: Array<{
    name: string;
    type: string;
    mentions: number;
    lastMention: Date;
    importance: number;
  }>;
  intentions: Array<{
    intent: string;
    confidence: number;
    fulfilled: boolean;
    timestamp: Date;
  }>;
  emotionalContext: {
    currentMood: string;
    moodHistory: Array<{
      mood: string;
      timestamp: Date;
      intensity: number;
    }>;
  };
  preferences: Record<string, any>;
  previousSessions: string[]; // Thread IDs
}

export interface ContextReconstructionConfig {
  maxThreadAge: number; // hours
  maxMemoriesPerThread: number;
  similarityThreshold: number;
  continuityThreshold: number;
  enableCrossSessionContext: boolean;
  enableEmotionalContext: boolean;
  enableIntentTracking: boolean;
}

export class ConversationContextReconstructor {
  private config: ContextReconstructionConfig;
  private relationshipExtractor: RelationshipExtractor;
  private patternEngine: PatternRecognitionEngine;
  private activeThreads = new Map<string, ConversationThread>();
  private threadHistory: ConversationThread[] = [];

  constructor(config: Partial<ContextReconstructionConfig> = {}) {
    this.config = {
      maxThreadAge: 24,
      maxMemoriesPerThread: 100,
      similarityThreshold: 0.7,
      continuityThreshold: 0.6,
      enableCrossSessionContext: true,
      enableEmotionalContext: true,
      enableIntentTracking: true,
      ...config,
    };

    this.relationshipExtractor = new RelationshipExtractor();
    this.patternEngine = new PatternRecognitionEngine();
  }

  /**
   * Reconstruct conversation context from memory fragments
   */
  async reconstructContext(
    agentId: string,
    memories: MemoryMetadata[],
    userId?: string
  ): Promise<ConversationThread[]> {
    console.log(
      `🔄 Reconstructing conversation context for agent ${agentId}...`
    );

    // Filter memories for this agent
    const agentMemories = memories.filter(m => m.agent_id === agentId);

    // Group memories into conversation threads
    const threads = await this.groupMemoriesIntoThreads(
      agentMemories,
      agentId,
      userId
    );

    // Analyze relationships within each thread
    for (const thread of threads) {
      thread.relationships =
        await this.relationshipExtractor.extractRelationships(thread.memories);
      thread.patterns = await this.patternEngine.analyzePatterns(
        thread.memories
      );
    }

    // Reconstruct context for each thread
    for (const thread of threads) {
      thread.context = await this.buildConversationContext(thread);
    }

    // Link threads across sessions if enabled
    if (this.config.enableCrossSessionContext) {
      await this.linkCrossSessionThreads(threads);
    }

    // Update active threads
    this.updateActiveThreads(threads);

    console.log(`✅ Reconstructed ${threads.length} conversation threads`);
    return threads;
  }

  /**
   * Group memories into logical conversation threads
   */
  private async groupMemoriesIntoThreads(
    memories: MemoryMetadata[],
    agentId: string,
    userId?: string
  ): Promise<ConversationThread[]> {
    const threads: ConversationThread[] = [];
    const sortedMemories = [...memories].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let currentThread: ConversationThread | null = null;
    const maxGapHours = 2; // Maximum gap between memories in same thread

    for (const memory of sortedMemories) {
      const shouldStartNewThread =
        !currentThread ||
        this.shouldStartNewThread(currentThread, memory, maxGapHours);

      if (shouldStartNewThread) {
        // Save current thread
        if (currentThread) {
          threads.push(currentThread);
        }

        // Start new thread
        currentThread = {
          id: `thread_${agentId}_${memory.createdAt.getTime()}`,
          agentId,
          userId,
          startTime: memory.createdAt,
          endTime: memory.createdAt,
          isActive: false,
          context: this.createEmptyContext(),
          memories: [memory],
          relationships: [],
          patterns: [],
          metadata: {
            complexity: 0,
            continuity: 0,
            tags: [...memory.tags],
          },
        };
      } else {
        // Add to current thread
        currentThread!.memories.push(memory);
        currentThread!.endTime = memory.createdAt;
        currentThread!.metadata.tags = [
          ...new Set([...currentThread!.metadata.tags, ...memory.tags]),
        ];
      }
    }

    // Save final thread
    if (currentThread) {
      threads.push(currentThread);
    }

    // Determine which threads are still active
    const now = new Date();
    const activeThreshold = this.config.maxThreadAge * 60 * 60 * 1000;

    for (const thread of threads) {
      thread.isActive =
        now.getTime() - thread.endTime.getTime() < activeThreshold;
    }

    return threads;
  }

  /**
   * Determine if a new thread should start
   */
  private shouldStartNewThread(
    currentThread: ConversationThread,
    memory: MemoryMetadata,
    maxGapHours: number
  ): boolean {
    // Check time gap
    const timeDiff =
      memory.createdAt.getTime() - currentThread.endTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > maxGapHours) {
      return true;
    }

    // Check topic similarity
    const topicSimilarity = this.calculateTopicSimilarity(
      currentThread,
      memory
    );
    if (topicSimilarity < this.config.similarityThreshold) {
      return true;
    }

    // Check thread size
    if (currentThread.memories.length >= this.config.maxMemoriesPerThread) {
      return true;
    }

    return false;
  }

  /**
   * Calculate topic similarity between thread and new memory
   */
  private calculateTopicSimilarity(
    thread: ConversationThread,
    memory: MemoryMetadata
  ): number {
    const threadTags = new Set(thread.metadata.tags);
    const memoryTags = new Set(memory.tags);

    const intersection = [...threadTags].filter(tag => memoryTags.has(tag));
    const union = [...new Set([...threadTags, ...memoryTags])];

    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Build conversation context for a thread
   */
  private async buildConversationContext(
    thread: ConversationThread
  ): Promise<ConversationContext> {
    const context: ConversationContext = {
      currentTopic: '',
      topicHistory: [],
      entities: [],
      intentions: [],
      emotionalContext: {
        currentMood: 'neutral',
        moodHistory: [],
      },
      preferences: {},
      previousSessions: [],
    };

    // Extract current topic from most recent memories
    const recentMemories = thread.memories.slice(-5);
    context.currentTopic = this.extractDominantTopic(recentMemories);

    // Build topic history
    context.topicHistory = await this.buildTopicHistory(thread.memories);

    // Extract entities
    context.entities = await this.extractEntities(thread.memories);

    // Track intentions if enabled
    if (this.config.enableIntentTracking) {
      context.intentions = await this.extractIntentions(thread.memories);
    }

    // Build emotional context if enabled
    if (this.config.enableEmotionalContext) {
      context.emotionalContext = await this.buildEmotionalContext(
        thread.memories
      );
    }

    // Extract preferences
    context.preferences = await this.extractPreferences(thread.memories);

    return context;
  }

  /**
   * Extract dominant topic from memories
   */
  private extractDominantTopic(memories: MemoryMetadata[]): string {
    const topicCounts = new Map<string, number>();

    for (const memory of memories) {
      for (const tag of memory.tags) {
        topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
      }

      // Also extract topic from content (simplified)
      const words = memory.content.toLowerCase().split(/\W+/);
      for (const word of words) {
        if (word.length > 4) {
          topicCounts.set(word, (topicCounts.get(word) || 0) + 0.5);
        }
      }
    }

    const sortedTopics = Array.from(topicCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    return sortedTopics[0]?.[0] || 'general';
  }

  /**
   * Build topic history with confidence scores
   */
  private async buildTopicHistory(memories: MemoryMetadata[]): Promise<
    Array<{
      topic: string;
      timestamp: Date;
      confidence: number;
    }>
  > {
    const topicHistory: Array<{
      topic: string;
      timestamp: Date;
      confidence: number;
    }> = [];

    // Group memories by time windows (e.g., 10-minute intervals)
    const timeWindows = this.groupMemoriesByTimeWindows(memories, 10);

    for (const window of timeWindows) {
      const topic = this.extractDominantTopic(window.memories);
      const confidence = this.calculateTopicConfidence(window.memories, topic);

      topicHistory.push({
        topic,
        timestamp: window.startTime,
        confidence,
      });
    }

    return topicHistory;
  }

  /**
   * Group memories by time windows
   */
  private groupMemoriesByTimeWindows(
    memories: MemoryMetadata[],
    windowMinutes: number
  ): Array<{
    startTime: Date;
    endTime: Date;
    memories: MemoryMetadata[];
  }> {
    const windows: Array<{
      startTime: Date;
      endTime: Date;
      memories: MemoryMetadata[];
    }> = [];

    const sortedMemories = [...memories].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    if (sortedMemories.length === 0) return windows;

    const windowMs = windowMinutes * 60 * 1000;
    let currentWindow = {
      startTime: sortedMemories[0].createdAt,
      endTime: new Date(sortedMemories[0].createdAt.getTime() + windowMs),
      memories: [] as MemoryMetadata[],
    };

    for (const memory of sortedMemories) {
      if (memory.createdAt >= currentWindow.endTime) {
        // Start new window
        if (currentWindow.memories.length > 0) {
          windows.push(currentWindow);
        }

        currentWindow = {
          startTime: memory.createdAt,
          endTime: new Date(memory.createdAt.getTime() + windowMs),
          memories: [memory],
        };
      } else {
        currentWindow.memories.push(memory);
      }
    }

    // Add final window
    if (currentWindow.memories.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  /**
   * Calculate confidence score for a topic
   */
  private calculateTopicConfidence(
    memories: MemoryMetadata[],
    topic: string
  ): number {
    let relevantMemories = 0;

    for (const memory of memories) {
      if (
        memory.tags.includes(topic) ||
        memory.content.toLowerCase().includes(topic.toLowerCase())
      ) {
        relevantMemories++;
      }
    }

    return memories.length > 0 ? relevantMemories / memories.length : 0;
  }

  /**
   * Extract entities from memories
   */
  private async extractEntities(memories: MemoryMetadata[]): Promise<
    Array<{
      name: string;
      type: string;
      mentions: number;
      lastMention: Date;
      importance: number;
    }>
  > {
    const entities = new Map<
      string,
      {
        name: string;
        type: string;
        mentions: number;
        lastMention: Date;
        importance: number;
      }
    >();

    for (const memory of memories) {
      // Extract entities from tags
      for (const tag of memory.tags) {
        const key = tag.toLowerCase();
        if (entities.has(key)) {
          const entity = entities.get(key)!;
          entity.mentions++;
          entity.lastMention = memory.createdAt;
          entity.importance = Math.min(
            1,
            entity.importance + memory.importance * 0.1
          );
        } else {
          entities.set(key, {
            name: tag,
            type: this.classifyEntityType(tag),
            mentions: 1,
            lastMention: memory.createdAt,
            importance: memory.importance,
          });
        }
      }

      // Simple entity extraction from content (in real implementation, would use NLP)
      const words = memory.content.split(/\W+/);
      for (const word of words) {
        if (word.length > 2 && /^[A-Z][a-z]+/.test(word)) {
          const key = word.toLowerCase();
          if (entities.has(key)) {
            entities.get(key)!.mentions++;
          } else {
            entities.set(key, {
              name: word,
              type: 'unknown',
              mentions: 1,
              lastMention: memory.createdAt,
              importance: 0.3,
            });
          }
        }
      }
    }

    return Array.from(entities.values())
      .filter(entity => entity.mentions > 1)
      .sort((a, b) => b.importance - a.importance);
  }

  /**
   * Classify entity type (simplified)
   */
  private classifyEntityType(entity: string): string {
    const lowerEntity = entity.toLowerCase();

    if (
      ['person', 'user', 'agent', 'assistant'].some(type =>
        lowerEntity.includes(type)
      )
    ) {
      return 'person';
    }
    if (
      ['project', 'task', 'work', 'job'].some(type =>
        lowerEntity.includes(type)
      )
    ) {
      return 'project';
    }
    if (
      ['tech', 'code', 'programming', 'software'].some(type =>
        lowerEntity.includes(type)
      )
    ) {
      return 'technology';
    }

    return 'concept';
  }

  /**
   * Extract intentions from memories
   */
  private async extractIntentions(memories: MemoryMetadata[]): Promise<
    Array<{
      intent: string;
      confidence: number;
      fulfilled: boolean;
      timestamp: Date;
    }>
  > {
    const intentions: Array<{
      intent: string;
      confidence: number;
      fulfilled: boolean;
      timestamp: Date;
    }> = [];

    for (const memory of memories) {
      // Simple intent extraction based on keywords
      const intentKeywords = {
        learn: ['learn', 'understand', 'explain', 'teach', 'show'],
        create: ['create', 'build', 'make', 'generate', 'develop'],
        solve: ['solve', 'fix', 'debug', 'resolve', 'troubleshoot'],
        find: ['find', 'search', 'locate', 'discover', 'retrieve'],
        plan: ['plan', 'schedule', 'organize', 'prepare', 'arrange'],
      };

      const content = memory.content.toLowerCase();

      for (const [intent, keywords] of Object.entries(intentKeywords)) {
        const matches = keywords.filter(keyword => content.includes(keyword));
        if (matches.length > 0) {
          const confidence = Math.min(
            1,
            matches.length / keywords.length + 0.3
          );

          intentions.push({
            intent,
            confidence,
            fulfilled: this.isIntentFulfilled(intent, memory, memories),
            timestamp: memory.createdAt,
          });
        }
      }
    }

    return intentions;
  }

  /**
   * Determine if an intent was fulfilled
   */
  private isIntentFulfilled(
    intent: string,
    memory: MemoryMetadata,
    allMemories: MemoryMetadata[]
  ): boolean {
    // Simple heuristic: check if subsequent memories contain fulfillment indicators
    const laterMemories = allMemories.filter(
      m => m.createdAt > memory.createdAt
    );
    const fulfillmentWords = [
      'done',
      'completed',
      'finished',
      'resolved',
      'achieved',
    ];

    return laterMemories.some(m =>
      fulfillmentWords.some(word => m.content.toLowerCase().includes(word))
    );
  }

  /**
   * Build emotional context
   */
  private async buildEmotionalContext(memories: MemoryMetadata[]): Promise<{
    currentMood: string;
    moodHistory: Array<{
      mood: string;
      timestamp: Date;
      intensity: number;
    }>;
  }> {
    const moodHistory: Array<{
      mood: string;
      timestamp: Date;
      intensity: number;
    }> = [];

    for (const memory of memories) {
      const mood = this.detectMoodFromMemory(memory);
      if (mood) {
        moodHistory.push(mood);
      }
    }

    const currentMood =
      moodHistory.length > 0
        ? moodHistory[moodHistory.length - 1].mood
        : 'neutral';

    return {
      currentMood,
      moodHistory,
    };
  }

  /**
   * Detect mood from memory content
   */
  private detectMoodFromMemory(memory: MemoryMetadata): {
    mood: string;
    timestamp: Date;
    intensity: number;
  } | null {
    const content = memory.content.toLowerCase();

    const moodIndicators = {
      positive: [
        'happy',
        'excited',
        'great',
        'awesome',
        'excellent',
        'love',
        'wonderful',
      ],
      negative: [
        'sad',
        'angry',
        'frustrated',
        'upset',
        'disappointed',
        'terrible',
        'hate',
      ],
      curious: ['wonder', 'interesting', 'curious', 'explore', 'discover'],
      focused: ['concentrate', 'focus', 'work', 'task', 'goal', 'objective'],
      confused: ['confused', 'unclear', "don't understand", 'puzzled', 'lost'],
    };

    for (const [mood, indicators] of Object.entries(moodIndicators)) {
      const matches = indicators.filter(indicator =>
        content.includes(indicator)
      );
      if (matches.length > 0) {
        return {
          mood,
          timestamp: memory.createdAt,
          intensity: Math.min(1, matches.length / indicators.length + 0.5),
        };
      }
    }

    return null;
  }

  /**
   * Extract preferences from memories
   */
  private async extractPreferences(
    memories: MemoryMetadata[]
  ): Promise<Record<string, any>> {
    const preferences: Record<string, any> = {};

    for (const memory of memories) {
      if (memory.type === 'preference') {
        // Extract preference from content
        const prefMatch = memory.content.match(/prefer\s+(.+)/i);
        if (prefMatch) {
          const key = memory.tags[0] || 'general';
          preferences[key] = prefMatch[1];
        }
      }
    }

    return preferences;
  }

  /**
   * Link threads across sessions
   */
  private async linkCrossSessionThreads(
    threads: ConversationThread[]
  ): Promise<void> {
    for (const thread of threads) {
      const relatedThreads = this.findRelatedThreads(thread, threads);
      thread.context.previousSessions = relatedThreads.map(t => t.id);
    }
  }

  /**
   * Find related threads based on similarity
   */
  private findRelatedThreads(
    thread: ConversationThread,
    allThreads: ConversationThread[]
  ): ConversationThread[] {
    const related: ConversationThread[] = [];

    for (const otherThread of allThreads) {
      if (otherThread.id === thread.id) continue;

      const similarity = this.calculateThreadSimilarity(thread, otherThread);
      if (similarity > this.config.similarityThreshold) {
        related.push(otherThread);
      }
    }

    return related.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
  }

  /**
   * Calculate similarity between threads
   */
  private calculateThreadSimilarity(
    thread1: ConversationThread,
    thread2: ConversationThread
  ): number {
    const tags1 = new Set(thread1.metadata.tags);
    const tags2 = new Set(thread2.metadata.tags);

    const intersection = [...tags1].filter(tag => tags2.has(tag));
    const union = [...new Set([...tags1, ...tags2])];

    const tagSimilarity =
      union.length > 0 ? intersection.length / union.length : 0;

    // Factor in agent similarity
    const agentSimilarity = thread1.agentId === thread2.agentId ? 1 : 0;

    return tagSimilarity * 0.7 + agentSimilarity * 0.3;
  }

  /**
   * Create empty conversation context
   */
  private createEmptyContext(): ConversationContext {
    return {
      currentTopic: '',
      topicHistory: [],
      entities: [],
      intentions: [],
      emotionalContext: {
        currentMood: 'neutral',
        moodHistory: [],
      },
      preferences: {},
      previousSessions: [],
    };
  }

  /**
   * Update active threads cache
   */
  private updateActiveThreads(threads: ConversationThread[]): void {
    // Clear inactive threads
    for (const [threadId, thread] of this.activeThreads.entries()) {
      if (!thread.isActive) {
        this.threadHistory.push(thread);
        this.activeThreads.delete(threadId);
      }
    }

    // Add new active threads
    for (const thread of threads) {
      if (thread.isActive) {
        this.activeThreads.set(thread.id, thread);
      }
    }
  }

  /**
   * Get active conversation threads
   */
  getActiveThreads(): ConversationThread[] {
    return Array.from(this.activeThreads.values());
  }

  /**
   * Get conversation thread by ID
   */
  getThread(threadId: string): ConversationThread | null {
    return (
      this.activeThreads.get(threadId) ||
      this.threadHistory.find(t => t.id === threadId) ||
      null
    );
  }

  /**
   * Get conversation summary for a thread
   */
  async getConversationSummary(threadId: string): Promise<{
    summary: string;
    keyTopics: string[];
    duration: number;
    memoryCount: number;
    continuityScore: number;
  } | null> {
    const thread = this.getThread(threadId);
    if (!thread) return null;

    const duration = thread.endTime.getTime() - thread.startTime.getTime();
    const keyTopics = thread.context.topicHistory
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(t => t.topic);

    const summary =
      `Conversation thread with ${thread.memories.length} memories over ${Math.round(duration / (1000 * 60))} minutes. ` +
      `Main topics: ${keyTopics.join(', ')}. Current mood: ${thread.context.emotionalContext.currentMood}.`;

    return {
      summary,
      keyTopics,
      duration,
      memoryCount: thread.memories.length,
      continuityScore: thread.metadata.continuity,
    };
  }
}
