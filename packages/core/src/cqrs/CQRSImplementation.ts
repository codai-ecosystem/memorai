/**
 * @fileoverview Command Query Responsibility Segregation (CQRS) Implementation
 * Implements advanced CQRS pattern for memory operations
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import {
  AdvancedEventBus,
  MemoryEvent,
  MemoryEventType,
} from '../events/EventDrivenArchitecture.js';
import { MemoryMetadata } from '../types/index.js';

// Command Interfaces
export abstract class Command {
  readonly id: string = nanoid();
  readonly timestamp: Date = new Date();
  readonly agentId: string;
  readonly correlationId: string;

  constructor(agentId: string, correlationId?: string) {
    this.agentId = agentId;
    this.correlationId = correlationId || nanoid();
  }
}

export abstract class Query {
  readonly id: string = nanoid();
  readonly timestamp: Date = new Date();
  readonly agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }
}

// Memory Commands
export class CreateMemoryCommand extends Command {
  constructor(
    public readonly content: string,
    public readonly metadata: Partial<MemoryMetadata>,
    agentId: string,
    correlationId?: string
  ) {
    super(agentId, correlationId);
  }
}

export class UpdateMemoryCommand extends Command {
  constructor(
    public readonly memoryId: string,
    public readonly updates: Partial<MemoryMetadata>,
    agentId: string,
    correlationId?: string
  ) {
    super(agentId, correlationId);
  }
}

export class DeleteMemoryCommand extends Command {
  constructor(
    public readonly memoryId: string,
    public readonly reason: string,
    agentId: string,
    correlationId?: string
  ) {
    super(agentId, correlationId);
  }
}

export class ClassifyMemoryCommand extends Command {
  constructor(
    public readonly memoryId: string,
    public readonly classification: string[],
    public readonly confidence: number,
    agentId: string,
    correlationId?: string
  ) {
    super(agentId, correlationId);
  }
}

export class OptimizeMemoryCommand extends Command {
  constructor(
    public readonly targetType:
      | 'storage'
      | 'retrieval'
      | 'classification'
      | 'relationships',
    public readonly parameters: Record<string, any>,
    agentId: string,
    correlationId?: string
  ) {
    super(agentId, correlationId);
  }
}

// Memory Queries
export class GetMemoryQuery extends Query {
  constructor(
    public readonly memoryId: string,
    agentId: string
  ) {
    super(agentId);
  }
}

export class SearchMemoriesQuery extends Query {
  constructor(
    public readonly searchTerm: string,
    public readonly filters: Record<string, any>,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
    agentId: string
  ) {
    super(agentId);
  }
}

export class GetMemoryPatternsQuery extends Query {
  constructor(
    public readonly patternType: string,
    public readonly timeRange: { start: Date; end: Date },
    public readonly minConfidence: number = 0.7,
    agentId: string
  ) {
    super(agentId);
  }
}

export class GetMemoryInsightsQuery extends Query {
  constructor(
    public readonly insightType:
      | 'classification'
      | 'pattern'
      | 'relationship'
      | 'optimization',
    public readonly memoryIds: string[],
    agentId: string
  ) {
    super(agentId);
  }
}

export class GetPerformanceMetricsQuery extends Query {
  constructor(
    public readonly metricType: string,
    public readonly timeRange: { start: Date; end: Date },
    agentId: string
  ) {
    super(agentId);
  }
}

// Command Results
export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
  events?: MemoryEvent[];
  metrics?: Record<string, number>;
}

// Query Results
export interface QueryResult<T = any> {
  success: boolean;
  data: T;
  metadata: {
    totalCount?: number;
    executionTime: number;
    cacheHit: boolean;
    dataFreshness: Date;
  };
  error?: string;
}

// Command Handler Interface
export interface CommandHandler<T extends Command> {
  handle(command: T): Promise<CommandResult>;
  canHandle(command: Command): boolean;
}

// Query Handler Interface
export interface QueryHandler<T extends Query, R = any> {
  handle(query: T): Promise<QueryResult<R>>;
  canHandle(query: Query): boolean;
}

// Advanced Command Bus
export class CommandBus extends EventEmitter {
  private handlers: Map<string, CommandHandler<any>> = new Map();
  private middlewares: CommandMiddleware[] = [];
  private eventBus: AdvancedEventBus;
  private metrics: Map<string, number> = new Map();

  constructor(eventBus: AdvancedEventBus) {
    super();
    this.eventBus = eventBus;
    this.setupMetrics();
  }

  // Register command handler
  registerHandler<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.handlers.set(commandType, handler);
  }

  // Add middleware
  addMiddleware(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  // Execute command
  async execute<T extends Command>(command: T): Promise<CommandResult> {
    const startTime = Date.now();

    try {
      // Apply middleware
      let processedCommand: T = command;
      for (const middleware of this.middlewares) {
        processedCommand = (await middleware.process(processedCommand)) as T;
      }

      // Find handler
      const handler = this.findHandler(processedCommand);
      if (!handler) {
        throw new Error(
          `No handler found for command type: ${processedCommand.constructor.name}`
        );
      }

      // Execute command
      const result = await handler.handle(processedCommand);

      // Publish events if successful
      if (result.success && result.events) {
        for (const event of result.events) {
          await this.eventBus.publish(event);
        }
      }

      // Update metrics
      this.updateMetrics('commands.executed', 1);
      this.updateMetrics(`commands.${processedCommand.constructor.name}`, 1);
      this.updateMetrics('commands.execution_time', Date.now() - startTime);

      // Emit command completed event
      this.emit('command.completed', {
        command: processedCommand,
        result,
        executionTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.updateMetrics('commands.failed', 1);

      const errorResult: CommandResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('command.failed', {
        command,
        error,
        executionTime: Date.now() - startTime,
      });

      return errorResult;
    }
  }

  private findHandler<T extends Command>(command: T): CommandHandler<T> | null {
    const commandType = command.constructor.name;
    const handler = this.handlers.get(commandType);

    if (handler && handler.canHandle(command)) {
      return handler;
    }

    // Fallback to checking all handlers
    for (const [, handler] of this.handlers) {
      if (handler.canHandle(command)) {
        return handler;
      }
    }

    return null;
  }

  private updateMetrics(key: string, value: number): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  private setupMetrics(): void {
    const keys = [
      'commands.executed',
      'commands.failed',
      'commands.execution_time',
    ];
    keys.forEach(key => this.metrics.set(key, 0));
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// Advanced Query Bus with Caching
export class QueryBus extends EventEmitter {
  private handlers: Map<string, QueryHandler<any, any>> = new Map();
  private middlewares: QueryMiddleware[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private metrics: Map<string, number> = new Map();
  private cacheConfig: CacheConfig;

  constructor(cacheConfig: Partial<CacheConfig> = {}) {
    super();
    this.cacheConfig = {
      enabled: true,
      ttl: 300000, // 5 minutes
      maxSize: 1000,
      ...cacheConfig,
    };
    this.setupMetrics();
    this.startCacheCleanup();
  }

  // Register query handler
  registerHandler<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void {
    this.handlers.set(queryType, handler);
  }

  // Add middleware
  addMiddleware(middleware: QueryMiddleware): void {
    this.middlewares.push(middleware);
  }

  // Execute query
  async execute<T extends Query, R>(query: T): Promise<QueryResult<R>> {
    const startTime = Date.now();

    try {
      // Apply middleware
      let processedQuery: T = query;
      for (const middleware of this.middlewares) {
        processedQuery = (await middleware.process(processedQuery)) as T;
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(processedQuery);
      const cachedResult = this.getFromCache<R>(cacheKey);

      if (cachedResult && this.cacheConfig.enabled) {
        this.updateMetrics('queries.cache_hits', 1);

        const result: QueryResult<R> = {
          success: cachedResult.success,
          data: cachedResult.data as R,
          metadata: {
            ...cachedResult.metadata,
            executionTime: Date.now() - startTime,
            cacheHit: true,
          },
          error: cachedResult.error,
        };

        this.emit('query.completed', {
          query: processedQuery,
          result,
          executionTime: Date.now() - startTime,
          cacheHit: true,
        });

        return result;
      }

      // Find handler
      const handler = this.findHandler(processedQuery);
      if (!handler) {
        throw new Error(
          `No handler found for query type: ${processedQuery.constructor.name}`
        );
      }

      // Execute query
      const result = (await handler.handle(processedQuery)) as QueryResult<R>;

      // Cache result if successful
      if (result.success && this.cacheConfig.enabled) {
        this.setCache(cacheKey, result);
      }

      // Update metrics
      this.updateMetrics('queries.executed', 1);
      this.updateMetrics(`queries.${processedQuery.constructor.name}`, 1);
      this.updateMetrics('queries.execution_time', Date.now() - startTime);
      this.updateMetrics('queries.cache_misses', 1);

      // Set metadata
      result.metadata = {
        ...result.metadata,
        executionTime: Date.now() - startTime,
        cacheHit: false,
      };

      this.emit('query.completed', {
        query: processedQuery,
        result,
        executionTime: Date.now() - startTime,
        cacheHit: false,
      });

      return result;
    } catch (error) {
      this.updateMetrics('queries.failed', 1);

      const errorResult: QueryResult<R> = {
        success: false,
        data: null as any,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false,
          dataFreshness: new Date(),
        },
        error: error instanceof Error ? error.message : String(error),
      };

      this.emit('query.failed', {
        query,
        error,
        executionTime: Date.now() - startTime,
      });

      return errorResult;
    }
  }

  // Cache management
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.updateMetrics('cache.full_clear', 1);
      return;
    }

    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    this.updateMetrics('cache.pattern_clear', 1);
  }

  private findHandler<T extends Query, R>(query: T): QueryHandler<T, R> | null {
    const queryType = query.constructor.name;
    const handler = this.handlers.get(queryType);

    if (handler && handler.canHandle(query)) {
      return handler;
    }

    // Fallback to checking all handlers
    for (const [, handler] of this.handlers) {
      if (handler.canHandle(query)) {
        return handler;
      }
    }

    return null;
  }

  private generateCacheKey(query: Query): string {
    const queryData = {
      type: query.constructor.name,
      ...query,
    };

    // Simple hash function for cache key
    const str = JSON.stringify(queryData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `query_${Math.abs(hash)}`;
  }

  private getFromCache<R>(key: string): QueryResult<R> | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.result as QueryResult<R>;
  }

  private setCache<R>(key: string, result: QueryResult<R>): void {
    if (this.cache.size >= this.cacheConfig.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.cacheConfig.ttl,
    });
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  private updateMetrics(key: string, value: number): void {
    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  private setupMetrics(): void {
    const keys = [
      'queries.executed',
      'queries.failed',
      'queries.execution_time',
      'queries.cache_hits',
      'queries.cache_misses',
      'cache.full_clear',
      'cache.pattern_clear',
    ];
    keys.forEach(key => this.metrics.set(key, 0));
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}

// Supporting interfaces
interface CommandMiddleware {
  process(command: Command): Promise<Command>;
}

interface QueryMiddleware {
  process(query: Query): Promise<Query>;
}

interface CacheEntry {
  result: QueryResult<any>;
  expiresAt: number;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number;
}

// CQRS Orchestrator
export class CQRSOrchestrator {
  private commandBus: CommandBus;
  private queryBus: QueryBus;
  private eventBus: AdvancedEventBus;

  constructor(eventBus: AdvancedEventBus, cacheConfig?: Partial<CacheConfig>) {
    this.eventBus = eventBus;
    this.commandBus = new CommandBus(eventBus);
    this.queryBus = new QueryBus(cacheConfig);
  }

  // Command operations
  async executeCommand<T extends Command>(command: T): Promise<CommandResult> {
    return this.commandBus.execute(command);
  }

  registerCommandHandler<T extends Command>(
    commandType: string,
    handler: CommandHandler<T>
  ): void {
    this.commandBus.registerHandler(commandType, handler);
  }

  addCommandMiddleware(middleware: CommandMiddleware): void {
    this.commandBus.addMiddleware(middleware);
  }

  // Query operations
  async executeQuery<T extends Query, R>(query: T): Promise<QueryResult<R>> {
    return this.queryBus.execute<T, R>(query);
  }

  registerQueryHandler<T extends Query, R>(
    queryType: string,
    handler: QueryHandler<T, R>
  ): void {
    this.queryBus.registerHandler(queryType, handler);
  }

  addQueryMiddleware(middleware: QueryMiddleware): void {
    this.queryBus.addMiddleware(middleware);
  }

  // Cache management
  invalidateQueryCache(pattern?: string): void {
    this.queryBus.invalidateCache(pattern);
  }

  // Metrics
  getMetrics(): {
    commands: Record<string, number>;
    queries: Record<string, number>;
    events: Record<string, number>;
  } {
    return {
      commands: this.commandBus.getMetrics(),
      queries: this.queryBus.getMetrics(),
      events: this.eventBus.getMetrics(),
    };
  }

  // Event subscriptions for CQRS coordination
  subscribeToEvents(): void {
    // Invalidate relevant query caches when data changes
    this.eventBus.subscribe(MemoryEventType.MEMORY_CREATED, () => {
      this.invalidateQueryCache('SearchMemoriesQuery|GetMemoryQuery');
    });

    this.eventBus.subscribe(MemoryEventType.MEMORY_UPDATED, () => {
      this.invalidateQueryCache('SearchMemoriesQuery|GetMemoryQuery');
    });

    this.eventBus.subscribe(MemoryEventType.MEMORY_DELETED, () => {
      this.invalidateQueryCache('SearchMemoriesQuery|GetMemoryQuery');
    });

    this.eventBus.subscribe(MemoryEventType.PATTERN_DETECTED, () => {
      this.invalidateQueryCache('GetMemoryPatternsQuery');
    });

    this.eventBus.subscribe(MemoryEventType.AI_INSIGHT_GENERATED, () => {
      this.invalidateQueryCache('GetMemoryInsightsQuery');
    });
  }
}

export default CQRSOrchestrator;
