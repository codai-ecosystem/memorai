/**
 * 🧠 Natural Language Interface Engine
 * Advanced conversational AI for memory management
 * 
 * Features:
 * - Chat-based memory interactions
 * - Intelligent query understanding
 * - Context-aware responses
 * - Multi-turn conversation support
 * - Intent recognition and entity extraction
 * 
 * @version 3.2.0
 * @author Memorai AI Team
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Basic Memory interface
interface Memory {
  id: string;
  content: string;
  userId: string;
  metadata: Record<string, any>;
  tags: string[];
  timestamp: Date;
}

// Basic service interfaces
interface MemoryService {
  search(query: string, userId: string, options?: any): Promise<Memory[]>;
  create(memory: Partial<Memory>): Promise<Memory>;
  update(id: string, updates: Partial<Memory>): Promise<Memory>;
  delete(id: string): Promise<boolean>;
}

interface AnalyticsService {
  getConversationAnalytics(userId: string): Promise<ConversationAnalytics>;
  trackEvent(event: string, data: any): Promise<void>;
}

// Conversation analytics data
interface ConversationAnalytics {
  totalQueries: number;
  avgResponseTime: number;
  intentDistribution: Record<string, number>;
  successRate: number;
}

// Core types for natural language processing
interface ConversationContext {
  sessionId: string;
  userId: string;
  messages: ConversationMessage[];
  currentIntent?: string;
  extractedEntities: Record<string, any>;
  memoryContext: Memory[];
  conversationState: 'active' | 'waiting' | 'completed';
  lastActivity: Date;
  preferences: UserPreferences;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface UserPreferences {
  language: string;
  verbosity: 'brief' | 'detailed' | 'comprehensive';
  responseStyle: 'formal' | 'casual' | 'technical';
  preferredFormats: string[];
}

interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  description: string;
}

interface Entity {
  type: string;
  value: any;
  confidence: number;
  startPos?: number;
  endPos?: number;
}

interface QuerySuggestion {
  text: string;
  type: 'memory' | 'pattern' | 'completion';
  confidence: number;
  metadata?: Record<string, any>;
}

interface AutoCompletion {
  text: string;
  type: 'syntax' | 'semantic' | 'memory' | 'pattern' | 'intent';
  confidence: number;
  priority: number;
  context?: string;
}

interface ConversationResponse {
  message: string;
  intent: string;
  entities: Record<string, any>;
  actions: ConversationAction[];
  suggestions: QuerySuggestion[];
  conversationContext: Partial<ConversationContext>;
  metadata: {
    processingTime: number;
    confidence: number;
    model: string;
    timestamp: Date;
  };
}

interface ConversationAction {
  type: 'memory_search' | 'memory_create' | 'memory_update' | 'memory_delete' | 'analytics' | 'suggestion';
  parameters: Record<string, any>;
  result?: any;
}

interface NLEngineOptions {
  memoryService: MemoryService;
  analyticsService: AnalyticsService;
  enableVoiceProcessing?: boolean;
  enableAdvancedNLP?: boolean;
  defaultLanguage?: string;
  maxContextLength?: number;
}

/**
 * Intent Classification System
 * Recognizes user intentions from natural language input
 */
export class IntentClassifier {
  private intentPatterns: Map<string, RegExp[]> = new Map();
  
  constructor() {
    this.initializeIntentPatterns();
  }

  private initializeIntentPatterns(): void {
    // Memory operations
    this.intentPatterns.set('memory_search', [
      /^(find|search|look for|get|retrieve|show me)/i,
      /(memories about|remember.*about|find.*related to)/i,
      /(what do I know about|tell me about)/i
    ]);

    this.intentPatterns.set('memory_create', [
      /^(remember|save|store|add|create|note)/i,
      /(I want to remember|keep this in mind|save this)/i,
      /(add to memory|store this information)/i
    ]);

    this.intentPatterns.set('memory_update', [
      /^(update|modify|change|edit)/i,
      /(correct this|fix this|update memory)/i,
      /(change the.*to|modify.*)/i
    ]);

    this.intentPatterns.set('memory_delete', [
      /^(delete|remove|forget|clear)/i,
      /(remove this|forget about|delete memory)/i,
      /(I don't need|get rid of)/i
    ]);

    // Analytics and insights
    this.intentPatterns.set('analytics_query', [
      /^(how many|show stats|analytics|summary)/i,
      /(what's my.*activity|memory statistics)/i,
      /(usage patterns|behavior analysis)/i
    ]);

    // General conversation
    this.intentPatterns.set('greeting', [
      /^(hi|hello|hey|good morning|good afternoon)/i,
      /(how are you|what's up)/i
    ]);

    this.intentPatterns.set('help', [
      /^(help|how to|what can|commands)/i,
      /(I need help|show me how|assistance)/i
    ]);
  }

  async classifyIntent(input: string): Promise<Intent> {
    const normalizedInput = input.toLowerCase().trim();
    
    for (const [intentName, patterns] of this.intentPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(normalizedInput)) {
          return {
            name: intentName,
            confidence: this.calculateConfidence(normalizedInput, pattern),
            parameters: this.extractParameters(normalizedInput, intentName),
            description: this.getIntentDescription(intentName)
          };
        }
      }
    }

    return {
      name: 'unknown',
      confidence: 0.1,
      parameters: {},
      description: 'Unknown intent'
    };
  }

  private calculateConfidence(input: string, pattern: RegExp): number {
    const match = input.match(pattern);
    if (!match) return 0;
    
    // Simple confidence based on match length vs input length
    const matchLength = match[0].length;
    const inputLength = input.length;
    return Math.min(0.9, matchLength / inputLength + 0.3);
  }

  private extractParameters(input: string, intent: string): Record<string, any> {
    const params: Record<string, any> = {};
    
    switch (intent) {
      case 'memory_search':
        const searchTerms = input.replace(/^(find|search|look for|get|retrieve|show me)\s*/i, '');
        params.query = searchTerms;
        break;
      case 'memory_create':
        const content = input.replace(/^(remember|save|store|add|create|note)\s*/i, '');
        params.content = content;
        break;
      // Add more parameter extraction as needed
    }
    
    return params;
  }

  private getIntentDescription(intent: string): string {
    const descriptions: Record<string, string> = {
      'memory_search': 'Search for memories based on content or tags',
      'memory_create': 'Create a new memory entry',
      'memory_update': 'Update an existing memory',
      'memory_delete': 'Delete a memory entry',
      'analytics_query': 'Get analytics and insights about memory usage',
      'greeting': 'Greeting or conversation starter',
      'help': 'Request for help or assistance',
      'unknown': 'Intent could not be determined'
    };
    
    return descriptions[intent] || 'Unknown intent';
  }
}

/**
 * Entity Extraction System
 * Extracts entities and structured data from natural language
 */
export class EntityExtractor {
  async extractEntities(input: string, intent: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Extract dates
    const dateEntities = this.extractDates(input);
    entities.push(...dateEntities);
    
    // Extract tags
    const tagEntities = this.extractTags(input);
    entities.push(...tagEntities);
    
    // Extract memory IDs
    const idEntities = this.extractMemoryIds(input);
    entities.push(...idEntities);
    
    return entities;
  }

  private extractDates(input: string): Entity[] {
    const entities: Entity[] = [];
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
      /\b(\d{4}-\d{2}-\d{2})\b/g,
      /\b(today|yesterday|tomorrow)\b/gi,
      /\b(last week|next week|this week)\b/gi
    ];

    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        entities.push({
          type: 'date',
          value: match[1],
          confidence: 0.8,
          startPos: match.index,
          endPos: match.index + match[1].length
        });
      }
    }

    return entities;
  }

  private extractTags(input: string): Entity[] {
    const entities: Entity[] = [];
    const tagPattern = /#(\w+)/g;
    
    let match;
    while ((match = tagPattern.exec(input)) !== null) {
      entities.push({
        type: 'tag',
        value: match[1],
        confidence: 0.9,
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }

    return entities;
  }

  private extractMemoryIds(input: string): Entity[] {
    const entities: Entity[] = [];
    const idPattern = /\bmem-([a-f0-9-]+)\b/gi;
    
    let match;
    while ((match = idPattern.exec(input)) !== null) {
      entities.push({
        type: 'memory_id',
        value: match[1],
        confidence: 0.95,
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }

    return entities;
  }
}

/**
 * Response Generation System
 * Generates intelligent, context-aware responses
 */
export class ResponseGenerator {
  constructor(
    private memoryService: MemoryService,
    private analyticsService: AnalyticsService
  ) {}

  async generateResponse(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext,
    input: string
  ): Promise<ConversationResponse> {
    const actions: ConversationAction[] = [];
    let message = '';
    const suggestions: QuerySuggestion[] = [];

    switch (intent.name) {
      case 'memory_search':
        const searchResult = await this.handleMemorySearch(intent, entities, context);
        message = searchResult.message;
        actions.push(...searchResult.actions);
        suggestions.push(...searchResult.suggestions);
        break;

      case 'memory_create':
        const createResult = await this.handleMemoryCreate(intent, entities, context);
        message = createResult.message;
        actions.push(...createResult.actions);
        break;

      case 'greeting':
        message = this.generateGreeting(context);
        suggestions.push(...this.getGeneralSuggestions());
        break;

      case 'help':
        message = this.generateHelp();
        suggestions.push(...this.getHelpSuggestions());
        break;

      default:
        message = "I understand you want to work with memories, but I'm not sure exactly what you'd like to do. Could you be more specific?";
        suggestions.push(...this.getGeneralSuggestions());
    }

    return {
      message,
      intent: intent.name,
      entities: this.entitiesToObject(entities),
      actions,
      suggestions,
      conversationContext: {
        lastActivity: new Date(),
        currentIntent: intent.name
      },
      metadata: {
        processingTime: 0, // Will be set by caller
        confidence: intent.confidence,
        model: 'natural-language-engine-v3.2',
        timestamp: new Date()
      }
    };
  }

  private async handleMemorySearch(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext
  ): Promise<{ message: string; actions: ConversationAction[]; suggestions: QuerySuggestion[] }> {
    const query = intent.parameters.query || '';
    const memories = await this.memoryService.search(query, context.userId);

    const action: ConversationAction = {
      type: 'memory_search',
      parameters: { query, results: memories.length },
      result: memories
    };

    let message = '';
    if (memories.length === 0) {
      message = `I couldn't find any memories matching "${query}". Would you like me to help you create a new memory?`;
    } else if (memories.length === 1) {
      message = `I found 1 memory about "${query}":\n\n${memories[0].content}`;
    } else {
      message = `I found ${memories.length} memories about "${query}". Here are the most relevant ones:\n\n`;
      message += memories.slice(0, 3).map((m, i) => `${i + 1}. ${m.content.substring(0, 100)}...`).join('\n');
    }

    const suggestions: QuerySuggestion[] = [
      { text: 'Show me more details', type: 'memory', confidence: 0.8 },
      { text: 'Find related memories', type: 'pattern', confidence: 0.7 }
    ];

    return { message, actions: [action], suggestions };
  }

  private async handleMemoryCreate(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext
  ): Promise<{ message: string; actions: ConversationAction[] }> {
    const content = intent.parameters.content || '';
    const tags = entities.filter(e => e.type === 'tag').map(e => e.value);

    const newMemory = await this.memoryService.create({
      content,
      userId: context.userId,
      tags,
      metadata: { source: 'natural-language-interface' },
      timestamp: new Date()
    });

    const action: ConversationAction = {
      type: 'memory_create',
      parameters: { content, tags },
      result: newMemory
    };

    const message = `I've saved that memory for you! ${tags.length > 0 ? `Tagged with: ${tags.join(', ')}` : ''}`;

    return { message, actions: [action] };
  }

  private generateGreeting(context: ConversationContext): string {
    const hour = new Date().getHours();
    let timeGreeting = '';
    
    if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 18) timeGreeting = 'Good afternoon';
    else timeGreeting = 'Good evening';

    return `${timeGreeting}! I'm here to help you manage your memories. What would you like to do today?`;
  }

  private generateHelp(): string {
    return `I can help you with your memories in several ways:

• **Search**: "Find memories about work" or "Show me notes from last week"
• **Create**: "Remember that I need to call John tomorrow" or "Save this meeting note"
• **Update**: "Update my note about the project deadline"
• **Delete**: "Forget about the old vacation plans"
• **Analytics**: "Show me my memory statistics" or "How many memories do I have?"

You can also use tags like #work or #personal to organize your memories better!`;
  }

  private getGeneralSuggestions(): QuerySuggestion[] {
    return [
      { text: 'Find my recent memories', type: 'memory', confidence: 0.9 },
      { text: 'Show me memory statistics', type: 'pattern', confidence: 0.8 },
      { text: 'Create a new memory', type: 'memory', confidence: 0.7 }
    ];
  }

  private getHelpSuggestions(): QuerySuggestion[] {
    return [
      { text: 'Find memories about work', type: 'memory', confidence: 0.9 },
      { text: 'Remember something new', type: 'memory', confidence: 0.8 },
      { text: 'Show examples', type: 'completion', confidence: 0.7 }
    ];
  }

  private entitiesToObject(entities: Entity[]): Record<string, any> {
    const result: Record<string, any> = {};
    entities.forEach(entity => {
      if (!result[entity.type]) {
        result[entity.type] = [];
      }
      result[entity.type].push(entity.value);
    });
    return result;
  }
}

/**
 * Main Natural Language Interface Engine
 * Orchestrates all natural language processing components
 */
export class NaturalLanguageEngine extends EventEmitter {
  private memoryService: MemoryService;
  private analyticsService: AnalyticsService;
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private responseGenerator: ResponseGenerator;
  private conversations: Map<string, ConversationContext> = new Map();
  private options: NLEngineOptions;

  constructor(options: NLEngineOptions) {
    super();
    
    this.options = options;
    this.memoryService = options.memoryService;
    this.analyticsService = options.analyticsService;
    
    this.intentClassifier = new IntentClassifier();
    this.entityExtractor = new EntityExtractor();
    this.responseGenerator = new ResponseGenerator(this.memoryService, this.analyticsService);
  }

  /**
   * Process a natural language message and generate a response
   */
  async processMessage(
    message: string,
    sessionId: string,
    userId: string
  ): Promise<ConversationResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation context
      const context = await this.getOrCreateContext(sessionId, userId);
      
      // Classify intent and extract entities
      const [intent, entities] = await Promise.all([
        this.intentClassifier.classifyIntent(message),
        this.entityExtractor.extractEntities(message, '')
      ]);

      // Generate response
      const response = await this.responseGenerator.generateResponse(
        intent,
        entities,
        context,
        message
      );

      // Update context
      context.messages.push({
        id: uuidv4(),
        role: 'user',
        content: message,
        timestamp: new Date(),
        intent: intent.name,
        entities: response.entities
      });

      context.messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      });

      context.lastActivity = new Date();
      context.currentIntent = intent.name;
      context.extractedEntities = { ...context.extractedEntities, ...response.entities };

      // Update response metadata
      response.metadata.processingTime = Date.now() - startTime;

      // Track analytics
      await this.analyticsService.trackEvent('message_processed', {
        sessionId,
        userId,
        intent: intent.name,
        processingTime: response.metadata.processingTime,
        entitiesCount: entities.length
      });

      this.emit('message_processed', {
        sessionId,
        userId,
        message,
        response,
        processingTime: response.metadata.processingTime
      });

      return response;

    } catch (error) {
      this.emit('error', error);
      return this.generateErrorResponse(sessionId, message, error);
    }
  }

  /**
   * Get query suggestions based on partial input
   */
  async getQuerySuggestions(
    partialInput: string,
    sessionId: string,
    userId: string
  ): Promise<QuerySuggestion[]> {
    const context = this.conversations.get(sessionId);
    if (!context) {
      return this.getDefaultSuggestions();
    }

    const suggestions: QuerySuggestion[] = [];
    
    // Add memory-based suggestions
    if (partialInput.length > 2) {
      const memories = await this.memoryService.search(partialInput, userId, { limit: 3 });
      memories.forEach(memory => {
        suggestions.push({
          text: `Find memories like: ${memory.content.substring(0, 50)}...`,
          type: 'memory',
          confidence: 0.8,
          metadata: { memoryId: memory.id }
        });
      });
    }

    // Add pattern-based suggestions
    suggestions.push(...this.getPatternSuggestions(partialInput, context));

    return suggestions.slice(0, 5);
  }

  /**
   * Get auto-completions for partial input
   */
  async getAutoCompletions(
    partialInput: string,
    sessionId: string,
    userId: string
  ): Promise<AutoCompletion[]> {
    const completions: AutoCompletion[] = [];
    
    // Intent-based completions
    if (partialInput.toLowerCase().startsWith('find')) {
      completions.push({
        text: 'find memories about ',
        type: 'intent',
        confidence: 0.9,
        priority: 1
      });
    }
    
    if (partialInput.toLowerCase().startsWith('remember')) {
      completions.push({
        text: 'remember that ',
        type: 'intent',
        confidence: 0.9,
        priority: 1
      });
    }

    // Memory-based completions
    if (partialInput.length > 2) {
      const memories = await this.memoryService.search(partialInput, userId, { limit: 3 });
      memories.forEach((memory, index) => {
        completions.push({
          text: memory.content,
          type: 'memory',
          confidence: 0.7 - (index * 0.1),
          priority: 2
        });
      });
    }

    return completions.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Create a new conversation session
   */
  async createSession(userId: string, preferences?: Partial<UserPreferences>): Promise<string> {
    const sessionId = uuidv4();
    
    const context: ConversationContext = {
      sessionId,
      userId,
      messages: [],
      extractedEntities: {},
      memoryContext: [],
      conversationState: 'active',
      lastActivity: new Date(),
      preferences: {
        language: 'en',
        verbosity: 'detailed',
        responseStyle: 'casual',
        preferredFormats: ['text'],
        ...preferences
      }
    };

    this.conversations.set(sessionId, context);
    
    this.emit('session_created', { sessionId, userId });
    
    return sessionId;
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    const context = this.conversations.get(sessionId);
    if (context) {
      context.conversationState = 'completed';
      
      // Track session analytics
      await this.analyticsService.trackEvent('session_ended', {
        sessionId,
        userId: context.userId,
        messageCount: context.messages.length,
        duration: Date.now() - new Date(context.messages[0]?.timestamp || Date.now()).getTime()
      });

      this.emit('session_ended', { sessionId, context });
      
      // Keep context for a while for potential reactivation
      setTimeout(() => {
        this.conversations.delete(sessionId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Get conversation context
   */
  getConversationContext(sessionId: string): ConversationContext | undefined {
    return this.conversations.get(sessionId);
  }

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(userId: string): Promise<ConversationAnalytics> {
    return await this.analyticsService.getConversationAnalytics(userId);
  }

  private async getOrCreateContext(sessionId: string, userId: string): Promise<ConversationContext> {
    let context = this.conversations.get(sessionId);
    
    if (!context) {
      const newSessionId = await this.createSession(userId);
      context = this.conversations.get(newSessionId)!;
      // Move it to the requested sessionId
      this.conversations.set(sessionId, context);
      this.conversations.delete(newSessionId);
      context.sessionId = sessionId;
    }
    
    return context;
  }

  private generateErrorResponse(sessionId: string, input: string, error: any): ConversationResponse {
    return {
      message: "I'm sorry, I encountered an error processing your request. Please try again or rephrase your message.",
      intent: 'error',
      entities: {},
      actions: [],
      suggestions: this.getDefaultSuggestions(),
      conversationContext: { lastActivity: new Date() },
      metadata: {
        processingTime: 0,
        confidence: 0,
        model: 'natural-language-engine-v3.2',
        timestamp: new Date()
      }
    };
  }

  private getDefaultSuggestions(): QuerySuggestion[] {
    return [
      { text: 'Find recent memories', type: 'memory', confidence: 0.9 },
      { text: 'Create a new memory', type: 'memory', confidence: 0.8 },
      { text: 'Show help', type: 'completion', confidence: 0.7 }
    ];
  }

  private getPatternSuggestions(partialInput: string, context: ConversationContext): QuerySuggestion[] {
    const suggestions: QuerySuggestion[] = [];
    
    // Based on conversation history
    const recentIntents = context.messages
      .filter(m => m.intent)
      .slice(-3)
      .map(m => m.intent);

    if (recentIntents.includes('memory_search')) {
      suggestions.push({
        text: 'Search for more memories',
        type: 'pattern',
        confidence: 0.6
      });
    }

    return suggestions;
  }
}

// Export types for external use
export type {
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationAction,
  Intent,
  Entity,
  QuerySuggestion,
  AutoCompletion,
  UserPreferences,
  NLEngineOptions,
  Memory,
  MemoryService,
  AnalyticsService
};
