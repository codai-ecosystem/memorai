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
  getConversationAnalytics(userId: string, timeRange?: TimeRange): Promise<ConversationAnalytics>;
  trackEvent(event: string, data: any): Promise<void>;
}

// Time range for analytics
interface TimeRange {
  start: Date;
  end: Date;
}

// Conversation analytics data
interface ConversationAnalytics {
  totalQueries: number;
  avgResponseTime: number;
  intentDistribution: Record<string, number>;
  successRate: number;
}

// Natural Language Processing interfaces
interface ConversationContext {
  sessionId: string;
  userId: string;
  conversationHistory: Message[];
  currentIntent?: Intent;
  extractedEntities: EntityMap;
  memoryContext: MemoryContext;
  preferences: UserPreferences;
  timestamp: Date;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
  intent?: Intent;
  entities?: Entity[];
  confidence?: number;
}

interface Intent {
  name: string;
  confidence: number;
  parameters: Record<string, any>;
  category: IntentCategory;
  requiresMemoryAccess: boolean;
  expectedResponse: ResponseType;
}

interface Entity {
  type: EntityType;
  value: string;
  confidence: number;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

interface MemoryContext {
  recentMemories: Memory[];
  relevantTopics: string[];
  userPatterns: UserPattern[];
  activeSession: SessionInfo;
}

// Enums and types
enum IntentCategory {
  MEMORY_SEARCH = 'memory_search',
  MEMORY_CREATE = 'memory_create',
  MEMORY_UPDATE = 'memory_update',
  MEMORY_DELETE = 'memory_delete',
  CONVERSATION = 'conversation',
  HELP = 'help',
  ANALYTICS = 'analytics',
  SYSTEM = 'system'
}

enum EntityType {
  MEMORY_ID = 'memory_id',
  TOPIC = 'topic',
  DATE = 'date',
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  KEYWORD = 'keyword',
  EMOTION = 'emotion',
  ACTION = 'action'
}

enum ResponseType {
  TEXT = 'text',
  MEMORY_LIST = 'memory_list',
  VISUALIZATION = 'visualization',
  CONFIRMATION = 'confirmation',
  ERROR = 'error',
  SUGGESTION = 'suggestion'
}

type EntityMap = Map<EntityType, Entity[]>;
type UserPattern = {
  pattern: string;
  frequency: number;
  lastSeen: Date;
  context: string[];
};

interface MessageMetadata {
  processingTime: number;
  confidence: number;
  fallbackUsed: boolean;
  suggestedActions?: string[];
  relatedMemories?: string[];
}

interface UserPreferences {
  language: string;
  responseStyle: 'concise' | 'detailed' | 'conversational';
  memoryCategories: string[];
  privacySettings: PrivacySettings;
  interactionHistory: InteractionStats;
}

interface PrivacySettings {
  allowPersonalDataExtraction: boolean;
  shareAnalytics: boolean;
  retainConversationHistory: boolean;
  encryptSensitiveData: boolean;
}

interface InteractionStats {
  totalConversations: number;
  averageSessionLength: number;
  preferredIntents: IntentCategory[];
  satisfactionRating: number;
}

interface SessionInfo {
  startTime: Date;
  messageCount: number;
  intentsProcessed: IntentCategory[];
  memoryOperations: number;
  userSatisfaction?: number;
}

/**
 * Advanced Natural Language Interface Engine
 * Provides conversational AI capabilities for memory management
 */
export class NaturalLanguageInterfaceEngine extends EventEmitter {
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private intentClassifier: IntentClassifier;
  private entityExtractor: EntityExtractor;
  private responseGenerator: ResponseGenerator;
  private conversationManager: ConversationManager;
  private contextAnalyzer: ContextAnalyzer;
  private memoryService: MemoryService;
  private analyticsService: AnalyticsService;

  constructor(options: NLIEngineOptions = {}) {
    super();
    
    this.intentClassifier = new IntentClassifier(options.intentModel);
    this.entityExtractor = new EntityExtractor(options.entityModel);
    this.responseGenerator = new ResponseGenerator(options.responseModel);
    this.conversationManager = new ConversationManager(options.conversationConfig);
    this.contextAnalyzer = new ContextAnalyzer(options.contextConfig);
    this.memoryService = options.memoryService;
    this.analyticsService = options.analyticsService;

    this.initializeEngine();
  }

  /**
   * Process natural language input and generate intelligent response
   */
  async processInput(
    input: string,
    sessionId: string,
    userId: string,
    options: ProcessingOptions = {}
  ): Promise<NLIResponse> {
    const startTime = Date.now();
    
    try {
      // Get or create conversation context
      const context = await this.getOrCreateContext(sessionId, userId);
      
      // Create message object
      const message: Message = {
        id: uuidv4(),
        role: 'user',
        content: input,
        timestamp: new Date()
      };

      // Step 1: Intent Classification
      const intent = await this.intentClassifier.classify(input, context);
      message.intent = intent;

      // Step 2: Entity Extraction
      const entities = await this.entityExtractor.extract(input, context);
      message.entities = entities;

      // Step 3: Context Analysis
      const analysisResult = await this.contextAnalyzer.analyze(
        message,
        context,
        options
      );

      // Step 4: Update conversation context
      context.conversationHistory.push(message);
      context.currentIntent = intent;
      context.extractedEntities = this.mergeEntities(context.extractedEntities, entities);
      await this.updateMemoryContext(context, analysisResult);

      // Step 5: Process intent and execute actions
      const actionResult = await this.executeIntent(intent, entities, context, options);

      // Step 6: Generate response
      const response = await this.responseGenerator.generate(
        intent,
        actionResult,
        context,
        options
      );

      // Step 7: Update analytics and learning
      await this.updateAnalytics(context, message, response, Date.now() - startTime);

      // Step 8: Prepare final response
      const nliResponse: NLIResponse = {
        sessionId,
        messageId: message.id,
        response: response.content,
        responseType: response.type,
        intent: intent.name,
        confidence: Math.min(intent.confidence, response.confidence),
        entities: entities,
        suggestions: response.suggestions || [],
        metadata: {
          processingTime: Date.now() - startTime,
          confidence: response.confidence,
          fallbackUsed: response.fallbackUsed,
          suggestedActions: response.suggestedActions,
          relatedMemories: actionResult.relatedMemories
        },
        conversationContext: this.sanitizeContext(context)
      };

      // Emit events for monitoring and learning
      this.emit('messageProcessed', {
        sessionId,
        userId,
        intent: intent.name,
        processingTime: nliResponse.metadata.processingTime,
        confidence: nliResponse.confidence
      });

      return nliResponse;

    } catch (error) {
      this.emit('processingError', { sessionId, userId, error, input });
      return this.generateErrorResponse(sessionId, input, error);
    }
  }

  /**
   * Get intelligent query suggestions based on context
   */
  async getQuerySuggestions(
    sessionId: string,
    userId: string,
    partialInput?: string
  ): Promise<QuerySuggestion[]> {
    const context = await this.getOrCreateContext(sessionId, userId);
    
    // Analyze current context for suggestions
    const contextSuggestions = await this.generateContextualSuggestions(context);
    
    // Analyze partial input if provided
    const inputSuggestions = partialInput 
      ? await this.generateInputSuggestions(partialInput, context)
      : [];

    // Get memory-based suggestions
    const memorySuggestions = await this.generateMemorySuggestions(context);

    // Get pattern-based suggestions from user history
    const patternSuggestions = await this.generatePatternSuggestions(userId, context);

    // Combine and rank suggestions
    const allSuggestions = [
      ...contextSuggestions,
      ...inputSuggestions,
      ...memorySuggestions,
      ...patternSuggestions
    ];

    return this.rankAndFilterSuggestions(allSuggestions, context);
  }

  /**
   * Get context-aware auto-completions
   */
  async getAutoCompletions(
    partialInput: string,
    sessionId: string,
    userId: string,
    maxCompletions: number = 5
  ): Promise<AutoCompletion[]> {
    const context = await this.getOrCreateContext(sessionId, userId);
    
    // Analyze partial input
    const inputAnalysis = await this.analyzePartialInput(partialInput, context);
    
    // Generate completions based on different strategies
    const completionStrategies = [
      this.generateSyntaxCompletions(partialInput, inputAnalysis),
      this.generateSemanticCompletions(partialInput, context),
      this.generateMemoryCompletions(partialInput, context),
      this.generatePatternCompletions(partialInput, userId),
      this.generateIntentCompletions(partialInput, inputAnalysis)
    ];

    const allCompletions = await Promise.all(completionStrategies);
    const flatCompletions = allCompletions.flat();

    return this.rankCompletions(flatCompletions, inputAnalysis, context)
      .slice(0, maxCompletions);
  }

  /**
   * Start or continue a conversation session
   */
  async startConversation(
    userId: string,
    initialMessage?: string,
    preferences?: Partial<UserPreferences>
  ): Promise<ConversationSession> {
    const sessionId = uuidv4();
    
    // Create new conversation context
    const context: ConversationContext = {
      sessionId,
      userId,
      conversationHistory: [],
      extractedEntities: new Map(),
      memoryContext: await this.initializeMemoryContext(userId),
      preferences: await this.getUserPreferences(userId, preferences),
      timestamp: new Date()
    };

    this.conversationContexts.set(sessionId, context);

    // Process initial message if provided
    let initialResponse: NLIResponse | undefined;
    if (initialMessage) {
      initialResponse = await this.processInput(initialMessage, sessionId, userId);
    }

    const session: ConversationSession = {
      sessionId,
      userId,
      startTime: new Date(),
      status: 'active',
      initialResponse,
      availableCommands: this.getAvailableCommands(context),
      suggestions: await this.getQuerySuggestions(sessionId, userId)
    };

    this.emit('conversationStarted', { sessionId, userId });
    return session;
  }

  /**
   * End a conversation session
   */
  async endConversation(sessionId: string): Promise<ConversationSummary> {
    const context = this.conversationContexts.get(sessionId);
    if (!context) {
      throw new Error(`Conversation session ${sessionId} not found`);
    }

    const summary = await this.generateConversationSummary(context);
    
    // Store conversation for analytics and learning
    await this.storeConversationHistory(context, summary);
    
    // Clean up context
    this.conversationContexts.delete(sessionId);
    
    this.emit('conversationEnded', { sessionId, summary });
    return summary;
  }

  /**
   * Get conversation history and analytics
   */
  async getConversationAnalytics(
    userId: string,
    timeRange?: TimeRange
  ): Promise<ConversationAnalytics> {
    return await this.analyticsService.getConversationAnalytics(userId, timeRange);
  }

  // Private methods for internal processing

  private async getOrCreateContext(
    sessionId: string,
    userId: string
  ): Promise<ConversationContext> {
    let context = this.conversationContexts.get(sessionId);
    
    if (!context) {
      context = {
        sessionId,
        userId,
        conversationHistory: [],
        extractedEntities: new Map(),
        memoryContext: await this.initializeMemoryContext(userId),
        preferences: await this.getUserPreferences(userId),
        timestamp: new Date()
      };
      
      this.conversationContexts.set(sessionId, context);
    }

    return context;
  }

  private async executeIntent(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext,
    options: ProcessingOptions
  ): Promise<IntentActionResult> {
    switch (intent.category) {
      case IntentCategory.MEMORY_SEARCH:
        return await this.executeMemorySearch(intent, entities, context);
      
      case IntentCategory.MEMORY_CREATE:
        return await this.executeMemoryCreate(intent, entities, context);
      
      case IntentCategory.MEMORY_UPDATE:
        return await this.executeMemoryUpdate(intent, entities, context);
      
      case IntentCategory.MEMORY_DELETE:
        return await this.executeMemoryDelete(intent, entities, context);
      
      case IntentCategory.CONVERSATION:
        return await this.executeConversation(intent, entities, context);
      
      case IntentCategory.ANALYTICS:
        return await this.executeAnalytics(intent, entities, context);
      
      case IntentCategory.HELP:
        return await this.executeHelp(intent, entities, context);
      
      default:
        return await this.executeDefaultAction(intent, entities, context);
    }
  }

  private async executeMemorySearch(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext
  ): Promise<IntentActionResult> {
    // Extract search parameters from intent and entities
    const searchQuery = this.extractSearchQuery(intent, entities);
    const filters = this.extractSearchFilters(entities);
    const options = this.extractSearchOptions(intent, context);

    // Perform memory search
    const searchResults = await this.memoryService.search(
      searchQuery,
      context.userId,
      {
        ...filters,
        ...options,
        includeRelevanceScore: true,
        maxResults: intent.parameters.maxResults || 10
      }
    );

    // Enhance results with context
    const enhancedResults = await this.enhanceSearchResults(
      searchResults,
      context,
      entities
    );

    return {
      success: true,
      action: 'memory_search',
      data: enhancedResults,
      relatedMemories: enhancedResults.map(r => r.id),
      confidence: intent.confidence,
      metadata: {
        searchQuery,
        filters,
        resultCount: enhancedResults.length,
        processingTime: Date.now()
      }
    };
  }

  private async executeMemoryCreate(
    intent: Intent,
    entities: Entity[],
    context: ConversationContext
  ): Promise<IntentActionResult> {
    // Extract memory content and metadata
    const memoryContent = this.extractMemoryContent(intent, entities);
    const memoryMetadata = this.extractMemoryMetadata(entities, context);
    const memoryTags = this.extractMemoryTags(entities);

    // Create new memory
    const newMemory = await this.memoryService.create({
      content: memoryContent,
      userId: context.userId,
      metadata: memoryMetadata,
      tags: memoryTags,
      source: 'natural_language_interface',
      timestamp: new Date()
    });

    // Update conversation context
    context.memoryContext.recentMemories.unshift(newMemory);

    return {
      success: true,
      action: 'memory_create',
      data: newMemory,
      relatedMemories: [newMemory.id],
      confidence: intent.confidence,
      metadata: {
        memoryId: newMemory.id,
        contentLength: memoryContent.length,
        tagCount: memoryTags.length
      }
    };
  }

  private async generateContextualSuggestions(
    context: ConversationContext
  ): Promise<QuerySuggestion[]> {
    const suggestions: QuerySuggestion[] = [];

    // Recent conversation suggestions
    if (context.conversationHistory.length > 0) {
      const recentIntents = context.conversationHistory
        .slice(-3)
        .map(m => m.intent?.category)
        .filter(Boolean);

      suggestions.push(...this.generateIntentBasedSuggestions(recentIntents));
    }

    // Memory context suggestions
    if (context.memoryContext.recentMemories.length > 0) {
      suggestions.push(...this.generateMemoryBasedSuggestions(
        context.memoryContext.recentMemories
      ));
    }

    // Topic suggestions
    if (context.memoryContext.relevantTopics.length > 0) {
      suggestions.push(...this.generateTopicBasedSuggestions(
        context.memoryContext.relevantTopics
      ));
    }

    return suggestions;
  }

  private async initializeEngine(): Promise<void> {
    // Initialize NLP models
    await this.intentClassifier.initialize();
    await this.entityExtractor.initialize();
    await this.responseGenerator.initialize();

    // Set up conversation cleanup
    setInterval(() => {
      this.cleanupInactiveConversations();
    }, 30 * 60 * 1000); // Clean up every 30 minutes

    this.emit('engineInitialized');
  }

  private cleanupInactiveConversations(): void {
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    for (const [sessionId, context] of this.conversationContexts.entries()) {
      if (context.timestamp < cutoffTime) {
        this.conversationContexts.delete(sessionId);
        this.emit('conversationTimedOut', { sessionId, userId: context.userId });
      }
    }
  }
}

// Supporting classes for specialized processing

/**
 * Intent Classification System
 */
class IntentClassifier {
  private model: IntentModel;
  private patterns: IntentPattern[];
  private confidence_threshold: number = 0.7;

  constructor(modelConfig?: IntentModelConfig) {
    this.model = new IntentModel(modelConfig);
    this.patterns = this.loadIntentPatterns();
  }

  async initialize(): Promise<void> {
    await this.model.load();
    this.patterns = await this.loadDynamicPatterns();
  }

  async classify(input: string, context: ConversationContext): Promise<Intent> {
    // Preprocess input
    const processedInput = this.preprocessInput(input);
    
    // Run through pattern matching first (fast path)
    const patternMatch = this.matchPatterns(processedInput, context);
    if (patternMatch && patternMatch.confidence > 0.9) {
      return patternMatch;
    }

    // Use ML model for complex classification
    const modelPrediction = await this.model.predict(processedInput, context);
    
    // Combine pattern and model results
    const finalIntent = this.combineResults(patternMatch, modelPrediction, context);
    
    // Validate confidence threshold
    if (finalIntent.confidence < this.confidence_threshold) {
      return this.getFallbackIntent(input, context);
    }

    return finalIntent;
  }

  private loadIntentPatterns(): IntentPattern[] {
    return [
      // Memory search patterns
      {
        pattern: /(?:find|search|look for|get|show me)\s+(.+)/i,
        intent: IntentCategory.MEMORY_SEARCH,
        confidence: 0.8,
        extractParameters: (match) => ({ query: match[1] })
      },
      {
        pattern: /(?:remember|recall|what did I)\s+(.+)/i,
        intent: IntentCategory.MEMORY_SEARCH,
        confidence: 0.9,
        extractParameters: (match) => ({ query: match[1] })
      },
      
      // Memory creation patterns
      {
        pattern: /(?:save|store|remember|add)\s+(.+)/i,
        intent: IntentCategory.MEMORY_CREATE,
        confidence: 0.8,
        extractParameters: (match) => ({ content: match[1] })
      },
      {
        pattern: /(?:I want to remember|note that|record)\s+(.+)/i,
        intent: IntentCategory.MEMORY_CREATE,
        confidence: 0.9,
        extractParameters: (match) => ({ content: match[1] })
      },
      
      // Conversational patterns
      {
        pattern: /^(?:hi|hello|hey|good morning|good afternoon)/i,
        intent: IntentCategory.CONVERSATION,
        confidence: 0.95,
        extractParameters: () => ({ type: 'greeting' })
      },
      {
        pattern: /^(?:thanks|thank you|bye|goodbye|see you)/i,
        intent: IntentCategory.CONVERSATION,
        confidence: 0.95,
        extractParameters: () => ({ type: 'closing' })
      },
      
      // Help patterns
      {
        pattern: /^(?:help|how|what can|commands|usage)/i,
        intent: IntentCategory.HELP,
        confidence: 0.9,
        extractParameters: () => ({ type: 'general' })
      }
    ];
  }

  private matchPatterns(input: string, context: ConversationContext): Intent | null {
    for (const pattern of this.patterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        return {
          name: pattern.intent,
          confidence: this.adjustConfidenceForContext(pattern.confidence, context),
          parameters: pattern.extractParameters(match),
          category: pattern.intent,
          requiresMemoryAccess: this.requiresMemoryAccess(pattern.intent),
          expectedResponse: this.getExpectedResponseType(pattern.intent)
        };
      }
    }
    return null;
  }

  private adjustConfidenceForContext(
    baseConfidence: number,
    context: ConversationContext
  ): number {
    // Boost confidence for patterns that match conversation flow
    let adjustedConfidence = baseConfidence;
    
    if (context.conversationHistory.length > 0) {
      const lastIntent = context.conversationHistory[context.conversationHistory.length - 1].intent;
      // Add context-based confidence adjustments
      if (this.isFollowUpIntent(lastIntent?.category)) {
        adjustedConfidence *= 1.1;
      }
    }
    
    return Math.min(adjustedConfidence, 1.0);
  }

  private requiresMemoryAccess(intent: IntentCategory): boolean {
    return [
      IntentCategory.MEMORY_SEARCH,
      IntentCategory.MEMORY_CREATE,
      IntentCategory.MEMORY_UPDATE,
      IntentCategory.MEMORY_DELETE,
      IntentCategory.ANALYTICS
    ].includes(intent);
  }

  private getExpectedResponseType(intent: IntentCategory): ResponseType {
    switch (intent) {
      case IntentCategory.MEMORY_SEARCH:
        return ResponseType.MEMORY_LIST;
      case IntentCategory.MEMORY_CREATE:
      case IntentCategory.MEMORY_UPDATE:
      case IntentCategory.MEMORY_DELETE:
        return ResponseType.CONFIRMATION;
      case IntentCategory.HELP:
        return ResponseType.SUGGESTION;
      case IntentCategory.ANALYTICS:
        return ResponseType.VISUALIZATION;
      default:
        return ResponseType.TEXT;
    }
  }
}

/**
 * Entity Extraction System
 */
class EntityExtractor {
  private model: EntityModel;
  private patterns: EntityPattern[];

  constructor(modelConfig?: EntityModelConfig) {
    this.model = new EntityModel(modelConfig);
    this.patterns = this.loadEntityPatterns();
  }

  async initialize(): Promise<void> {
    await this.model.load();
  }

  async extract(input: string, context: ConversationContext): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Pattern-based extraction
    entities.push(...this.extractWithPatterns(input));
    
    // ML-based extraction
    entities.push(...await this.extractWithModel(input, context));
    
    // Context-based enhancement
    entities.push(...this.enhanceWithContext(entities, context));
    
    // Deduplicate and validate
    return this.deduplicateEntities(entities);
  }

  private loadEntityPatterns(): EntityPattern[] {
    return [
      // Date patterns
      {
        pattern: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|today|yesterday|tomorrow)/gi,
        entityType: EntityType.DATE,
        confidence: 0.9
      },
      
      // Memory ID patterns
      {
        pattern: /memory[_-]?id[:\s]+([a-f0-9-]{36})/gi,
        entityType: EntityType.MEMORY_ID,
        confidence: 0.95
      },
      
      // Topic patterns
      {
        pattern: /(?:about|regarding|concerning)\s+([^.,!?]+)/gi,
        entityType: EntityType.TOPIC,
        confidence: 0.7
      },
      
      // Emotion patterns
      {
        pattern: /(?:feel|feeling|felt)\s+(happy|sad|angry|excited|worried|confused|grateful)/gi,
        entityType: EntityType.EMOTION,
        confidence: 0.8
      }
    ];
  }

  private extractWithPatterns(input: string): Entity[] {
    const entities: Entity[] = [];
    
    for (const pattern of this.patterns) {
      let match;
      while ((match = pattern.pattern.exec(input)) !== null) {
        entities.push({
          type: pattern.entityType,
          value: match[1] || match[0],
          confidence: pattern.confidence,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }
    
    return entities;
  }

  private async extractWithModel(
    input: string,
    context: ConversationContext
  ): Promise<Entity[]> {
    return await this.model.extractEntities(input, context);
  }

  private enhanceWithContext(
    entities: Entity[],
    context: ConversationContext
  ): Entity[] {
    const enhanced: Entity[] = [];
    
    // Add contextual entities based on conversation history
    if (context.conversationHistory.length > 0) {
      const recentTopics = this.extractRecentTopics(context);
      enhanced.push(...recentTopics);
    }
    
    return enhanced;
  }

  private extractRecentTopics(context: ConversationContext): Entity[] {
    const topics: Entity[] = [];
    const recentMessages = context.conversationHistory.slice(-3);
    
    for (const message of recentMessages) {
      if (message.entities) {
        const topicEntities = message.entities.filter(e => e.type === EntityType.TOPIC);
        topics.push(...topicEntities.map(e => ({
          ...e,
          confidence: e.confidence * 0.8, // Reduce confidence for context entities
          metadata: { source: 'context', messageId: message.id }
        })));
      }
    }
    
    return topics;
  }

  private deduplicateEntities(entities: Entity[]): Entity[] {
    const seen = new Set<string>();
    const deduplicated: Entity[] = [];
    
    // Sort by confidence (highest first)
    entities.sort((a, b) => b.confidence - a.confidence);
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(entity);
      }
    }
    
    return deduplicated;
  }
}

// Additional interfaces and types
interface NLIEngineOptions {
  intentModel?: IntentModelConfig;
  entityModel?: EntityModelConfig;
  responseModel?: ResponseModelConfig;
  conversationConfig?: ConversationConfig;
  contextConfig?: ContextConfig;
  memoryService?: MemoryService;
  analyticsService?: AnalyticsService;
}

interface ProcessingOptions {
  maxProcessingTime?: number;
  includeDebugInfo?: boolean;
  useCache?: boolean;
  prioritizeAccuracy?: boolean;
}

interface NLIResponse {
  sessionId: string;
  messageId: string;
  response: string;
  responseType: ResponseType;
  intent: string;
  confidence: number;
  entities: Entity[];
  suggestions: string[];
  metadata: MessageMetadata;
  conversationContext: any;
}

interface QuerySuggestion {
  text: string;
  category: string;
  confidence: number;
  description?: string;
  examples?: string[];
}

interface AutoCompletion {
  completion: string;
  description: string;
  confidence: number;
  category: string;
  cursorPosition?: number;
}

interface ConversationSession {
  sessionId: string;
  userId: string;
  startTime: Date;
  status: 'active' | 'inactive' | 'ended';
  initialResponse?: NLIResponse;
  availableCommands: string[];
  suggestions: QuerySuggestion[];
}

interface ConversationSummary {
  sessionId: string;
  userId: string;
  duration: number;
  messageCount: number;
  intentsProcessed: { [intent: string]: number };
  memoryOperations: number;
  userSatisfaction?: number;
  keyTopics: string[];
  outcomes: string[];
}

interface ConversationAnalytics {
  totalConversations: number;
  averageSessionLength: number;
  topIntents: { [intent: string]: number };
  userSatisfaction: number;
  commonPatterns: string[];
  improvementSuggestions: string[];
}

interface IntentActionResult {
  success: boolean;
  action: string;
  data: any;
  relatedMemories: string[];
  confidence: number;
  metadata: Record<string, any>;
}

interface IntentPattern {
  pattern: RegExp;
  intent: IntentCategory;
  confidence: number;
  extractParameters: (match: RegExpMatchArray) => Record<string, any>;
}

interface EntityPattern {
  pattern: RegExp;
  entityType: EntityType;
  confidence: number;
}

interface TimeRange {
  start: Date;
  end: Date;
}

// Placeholder classes for ML models (would be implemented with actual ML libraries)
class IntentModel {
  constructor(config?: IntentModelConfig) {}
  async load(): Promise<void> {}
  async predict(input: string, context: ConversationContext): Promise<Intent> {
    // Placeholder implementation
    return {
      name: 'unknown',
      confidence: 0.5,
      parameters: {},
      category: IntentCategory.CONVERSATION,
      requiresMemoryAccess: false,
      expectedResponse: ResponseType.TEXT
    };
  }
}

class EntityModel {
  constructor(config?: EntityModelConfig) {}
  async load(): Promise<void> {}
  async extractEntities(input: string, context: ConversationContext): Promise<Entity[]> {
    // Placeholder implementation
    return [];
  }
}

class ResponseGenerator {
  constructor(config?: ResponseModelConfig) {}
  async initialize(): Promise<void> {}
  async generate(
    intent: Intent,
    actionResult: IntentActionResult,
    context: ConversationContext,
    options: ProcessingOptions
  ): Promise<any> {
    // Placeholder implementation
    return {
      content: "I understand your request.",
      type: ResponseType.TEXT,
      confidence: 0.8,
      fallbackUsed: false
    };
  }
}

class ConversationManager {
  constructor(config?: ConversationConfig) {}
}

class ContextAnalyzer {
  constructor(config?: ContextConfig) {}
  async analyze(message: Message, context: ConversationContext, options: ProcessingOptions): Promise<any> {
    return {};
  }
}

// Export the main engine
export { NaturalLanguageInterfaceEngine };
export type {
  ConversationContext,
  Message,
  Intent,
  Entity,
  NLIResponse,
  QuerySuggestion,
  AutoCompletion,
  ConversationSession,
  ConversationSummary,
  ConversationAnalytics
};
