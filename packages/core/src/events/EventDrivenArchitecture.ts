/**
 * @fileoverview Event-Driven Architecture Core
 * Implements comprehensive event sourcing for memory operations
 */

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import { MemoryMetadata } from '../types/index.js';

// Core Event Types
export enum MemoryEventType {
  MEMORY_CREATED = 'memory.created',
  MEMORY_UPDATED = 'memory.updated',
  MEMORY_DELETED = 'memory.deleted',
  MEMORY_ACCESSED = 'memory.accessed',
  MEMORY_CLASSIFIED = 'memory.classified',
  PATTERN_DETECTED = 'pattern.detected',
  RELATIONSHIP_DISCOVERED = 'relationship.discovered',
  OPTIMIZATION_TRIGGERED = 'optimization.triggered',
  SECURITY_ALERT = 'security.alert',
  PERFORMANCE_METRIC = 'performance.metric',
  AI_INSIGHT_GENERATED = 'ai.insight.generated',
  COLLABORATION_EVENT = 'collaboration.event',
  BACKUP_COMPLETED = 'backup.completed',
  CACHE_INVALIDATED = 'cache.invalidated',
  ERROR_OCCURRED = 'error.occurred',
}

// Event Base Interface
export interface BaseMemoryEvent {
  id: string;
  type: MemoryEventType;
  timestamp: Date;
  version: number;
  agentId: string;
  correlationId?: string;
  causationId?: string;
  metadata: Record<string, any>;
}

// Specific Event Interfaces
export interface MemoryCreatedEvent extends BaseMemoryEvent {
  type: MemoryEventType.MEMORY_CREATED;
  data: {
    memory: MemoryMetadata;
    source: 'user' | 'ai' | 'system' | 'import';
    validation: {
      passed: boolean;
      score: number;
      checks: string[];
    };
  };
}

export interface MemoryUpdatedEvent extends BaseMemoryEvent {
  type: MemoryEventType.MEMORY_UPDATED;
  data: {
    memoryId: string;
    changes: Partial<MemoryMetadata>;
    previousVersion: MemoryMetadata;
    updateType: 'content' | 'metadata' | 'classification' | 'relationship';
  };
}

export interface PatternDetectedEvent extends BaseMemoryEvent {
  type: MemoryEventType.PATTERN_DETECTED;
  data: {
    patternId: string;
    patternType: string;
    confidence: number;
    affectedMemories: string[];
    insights: string[];
    predictions: string[];
  };
}

export interface AIInsightGeneratedEvent extends BaseMemoryEvent {
  type: MemoryEventType.AI_INSIGHT_GENERATED;
  data: {
    insightType: 'classification' | 'pattern' | 'relationship' | 'optimization';
    confidence: number;
    targetMemories: string[];
    insights: string[];
    recommendations: string[];
    automationTriggers: string[];
  };
}

export interface SecurityAlertEvent extends BaseMemoryEvent {
  type: MemoryEventType.SECURITY_ALERT;
  data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    alertType: string;
    description: string;
    affectedResources: string[];
    mitigation: string[];
    autoResolved: boolean;
  };
}

export interface PerformanceMetricEvent extends BaseMemoryEvent {
  type: MemoryEventType.PERFORMANCE_METRIC;
  data: {
    metric: string;
    value: number;
    threshold?: number;
    trend: 'improving' | 'stable' | 'degrading';
    recommendations: string[];
  };
}

// Union type for all events
export type MemoryEvent =
  | MemoryCreatedEvent
  | MemoryUpdatedEvent
  | PatternDetectedEvent
  | AIInsightGeneratedEvent
  | SecurityAlertEvent
  | PerformanceMetricEvent;

// Event Store Interface
export interface EventStore {
  append(events: MemoryEvent[]): Promise<void>;
  getEvents(streamId: string, fromVersion?: number): Promise<MemoryEvent[]>;
  getEventsByType(
    eventType: MemoryEventType,
    limit?: number
  ): Promise<MemoryEvent[]>;
  getEventsByCorrelation(correlationId: string): Promise<MemoryEvent[]>;
  createSnapshot(streamId: string, version: number, state: any): Promise<void>;
  getSnapshot(
    streamId: string
  ): Promise<{ version: number; state: any } | null>;
}

// Event Bus Configuration
export interface EventBusConfig {
  enablePersistence: boolean;
  enableReplay: boolean;
  maxRetries: number;
  retryDelay: number;
  deadLetterQueue: boolean;
  enableMetrics: boolean;
  bufferSize: number;
  flushInterval: number;
}

// Advanced Event Bus with Processing Pipeline
export class AdvancedEventBus extends EventEmitter {
  private eventStore: EventStore;
  private config: EventBusConfig;
  private eventBuffer: MemoryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processors: Map<MemoryEventType, EventProcessor[]> = new Map();
  private middlewares: EventMiddleware[] = [];
  private metrics: Map<string, number> = new Map();

  constructor(eventStore: EventStore, config: Partial<EventBusConfig> = {}) {
    super();
    this.eventStore = eventStore;
    this.config = {
      enablePersistence: true,
      enableReplay: true,
      maxRetries: 3,
      retryDelay: 1000,
      deadLetterQueue: true,
      enableMetrics: true,
      bufferSize: 100,
      flushInterval: 5000,
      ...config,
    };

    this.startFlushTimer();
    this.setupMetrics();
  }

  // Publish event with advanced processing
  async publish(event: MemoryEvent): Promise<void> {
    try {
      // Apply middleware
      let processedEvent = event;
      for (const middleware of this.middlewares) {
        processedEvent = await middleware.process(processedEvent);
      }

      // Add to buffer for batching
      this.eventBuffer.push(processedEvent);

      // Emit for real-time listeners
      this.emit(event.type, processedEvent);
      this.emit('*', processedEvent);

      // Process immediately if buffer is full
      if (this.eventBuffer.length >= this.config.bufferSize) {
        await this.flushBuffer();
      }

      // Update metrics
      this.updateMetrics('events.published', 1);
      this.updateMetrics(`events.${event.type}`, 1);
    } catch (error) {
      this.handleError(error, event);
    }
  }

  // Subscribe to events with advanced filtering
  subscribe<T extends MemoryEvent>(
    eventType: MemoryEventType | '*',
    handler: (event: T) => Promise<void> | void,
    options: {
      filter?: (event: T) => boolean;
      retry?: boolean;
      priority?: number;
    } = {}
  ): () => void {
    const processor: EventProcessor = {
      id: nanoid(),
      handler,
      filter: options.filter,
      retry: options.retry ?? true,
      priority: options.priority ?? 0,
    };

    if (eventType === '*') {
      // Global subscription
      this.on('*', async (event: T) => {
        await this.processEvent(event, processor);
      });
    } else {
      // Type-specific subscription
      if (!this.processors.has(eventType)) {
        this.processors.set(eventType, []);
      }

      const processors = this.processors.get(eventType)!;
      processors.push(processor);
      processors.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    // Return unsubscribe function
    return () => {
      if (eventType === '*') {
        this.removeAllListeners('*');
      } else {
        const processors = this.processors.get(eventType);
        if (processors) {
          const index = processors.findIndex(p => p.id === processor.id);
          if (index >= 0) {
            processors.splice(index, 1);
          }
        }
      }
    };
  }

  // Add event middleware
  addMiddleware(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
  }

  // Replay events for recovery/debugging
  async replayEvents(
    streamId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<void> {
    if (!this.config.enableReplay) {
      throw new Error('Event replay is disabled');
    }

    const events = await this.eventStore.getEvents(streamId, fromVersion);

    for (const event of events) {
      if (toVersion && event.version > toVersion) break;

      this.emit('replay', event);
      await new Promise(resolve => setTimeout(resolve, 10)); // Throttle replay
    }
  }

  // Get event metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Private methods
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    if (this.config.enablePersistence) {
      try {
        await this.eventStore.append(events);
        this.updateMetrics('events.persisted', events.length);
      } catch (error) {
        console.error('Failed to persist events:', error);
        // Re-add to buffer for retry
        this.eventBuffer.unshift(...events);
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, this.config.flushInterval);
  }

  private async processEvent(
    event: MemoryEvent,
    processor: EventProcessor
  ): Promise<void> {
    try {
      // Apply filter if provided
      if (processor.filter && !processor.filter(event)) {
        return;
      }

      await processor.handler(event);
      this.updateMetrics('events.processed', 1);
    } catch (error) {
      console.error(`Event processing failed for ${event.type}:`, error);

      if (processor.retry) {
        // Implement retry logic
        await this.retryEventProcessing(event, processor);
      }
    }
  }

  private async retryEventProcessing(
    event: MemoryEvent,
    processor: EventProcessor,
    attempt: number = 1
  ): Promise<void> {
    if (attempt > this.config.maxRetries) {
      if (this.config.deadLetterQueue) {
        this.emit('dead-letter', { event, processor, attempts: attempt });
      }
      return;
    }

    await new Promise(resolve =>
      setTimeout(resolve, this.config.retryDelay * attempt)
    );

    try {
      await processor.handler(event);
      this.updateMetrics('events.retried.success', 1);
    } catch (error) {
      this.updateMetrics('events.retried.failed', 1);
      await this.retryEventProcessing(event, processor, attempt + 1);
    }
  }

  private handleError(error: any, event: MemoryEvent): void {
    console.error('Event bus error:', error);
    this.updateMetrics('events.errors', 1);
    this.emit('error', { error, event });
  }

  private updateMetrics(key: string, value: number): void {
    if (!this.config.enableMetrics) return;

    this.metrics.set(key, (this.metrics.get(key) || 0) + value);
  }

  private setupMetrics(): void {
    if (!this.config.enableMetrics) return;

    // Initialize key metrics
    const keys = [
      'events.published',
      'events.processed',
      'events.persisted',
      'events.errors',
      'events.retried.success',
      'events.retried.failed',
    ];

    keys.forEach(key => this.metrics.set(key, 0));
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    this.removeAllListeners();
    this.eventBuffer = [];
    this.processors.clear();
    this.middlewares = [];
    this.metrics.clear();
  }
}

// Supporting interfaces
interface EventProcessor {
  id: string;
  handler: (event: any) => Promise<void> | void;
  filter?: (event: any) => boolean;
  retry: boolean;
  priority: number;
}

interface EventMiddleware {
  process(event: MemoryEvent): Promise<MemoryEvent>;
}

// Memory Event Factory
export class MemoryEventFactory {
  static createMemoryCreatedEvent(
    memory: MemoryMetadata,
    agentId: string,
    source: 'user' | 'ai' | 'system' | 'import' = 'user',
    validation = { passed: true, score: 1.0, checks: [] }
  ): MemoryCreatedEvent {
    return {
      id: nanoid(),
      type: MemoryEventType.MEMORY_CREATED,
      timestamp: new Date(),
      version: 1,
      agentId,
      correlationId: nanoid(),
      metadata: {
        source,
        memoryType: memory.type,
        importance: memory.importance || 0.5,
      },
      data: {
        memory,
        source,
        validation,
      },
    };
  }

  static createPatternDetectedEvent(
    patternId: string,
    patternType: string,
    confidence: number,
    affectedMemories: string[],
    agentId: string,
    insights: string[] = [],
    predictions: string[] = []
  ): PatternDetectedEvent {
    return {
      id: nanoid(),
      type: MemoryEventType.PATTERN_DETECTED,
      timestamp: new Date(),
      version: 1,
      agentId,
      correlationId: nanoid(),
      metadata: {
        patternType,
        confidence,
        memoryCount: affectedMemories.length,
      },
      data: {
        patternId,
        patternType,
        confidence,
        affectedMemories,
        insights,
        predictions,
      },
    };
  }

  static createAIInsightEvent(
    insightType: 'classification' | 'pattern' | 'relationship' | 'optimization',
    confidence: number,
    targetMemories: string[],
    agentId: string,
    insights: string[] = [],
    recommendations: string[] = []
  ): AIInsightGeneratedEvent {
    return {
      id: nanoid(),
      type: MemoryEventType.AI_INSIGHT_GENERATED,
      timestamp: new Date(),
      version: 1,
      agentId,
      correlationId: nanoid(),
      metadata: {
        insightType,
        confidence,
        targetCount: targetMemories.length,
      },
      data: {
        insightType,
        confidence,
        targetMemories,
        insights,
        recommendations,
        automationTriggers: [],
      },
    };
  }

  static createSecurityAlertEvent(
    severity: 'low' | 'medium' | 'high' | 'critical',
    alertType: string,
    description: string,
    agentId: string,
    affectedResources: string[] = []
  ): SecurityAlertEvent {
    return {
      id: nanoid(),
      type: MemoryEventType.SECURITY_ALERT,
      timestamp: new Date(),
      version: 1,
      agentId,
      correlationId: nanoid(),
      metadata: {
        severity,
        alertType,
        resourceCount: affectedResources.length,
      },
      data: {
        severity,
        alertType,
        description,
        affectedResources,
        mitigation: [],
        autoResolved: false,
      },
    };
  }

  static createPerformanceMetricEvent(
    metric: string,
    value: number,
    agentId: string,
    threshold?: number,
    trend: 'improving' | 'stable' | 'degrading' = 'stable'
  ): PerformanceMetricEvent {
    return {
      id: nanoid(),
      type: MemoryEventType.PERFORMANCE_METRIC,
      timestamp: new Date(),
      version: 1,
      agentId,
      correlationId: nanoid(),
      metadata: {
        metric,
        value,
        trend,
        hasThreshold: threshold !== undefined,
      },
      data: {
        metric,
        value,
        threshold,
        trend,
        recommendations: [],
      },
    };
  }
}

// Event Sourced Aggregate Base
export abstract class EventSourcedAggregate {
  protected events: MemoryEvent[] = [];
  protected version: number = 0;
  protected id: string;

  constructor(id: string) {
    this.id = id;
  }

  // Apply events to rebuild state
  replayEvents(events: MemoryEvent[]): void {
    events.forEach(event => {
      this.apply(event);
      this.version = Math.max(this.version, event.version);
    });
  }

  // Get uncommitted events
  getUncommittedEvents(): MemoryEvent[] {
    return [...this.events];
  }

  // Mark events as committed
  markEventsAsCommitted(): void {
    this.events = [];
  }

  // Protected methods for subclasses
  protected addEvent(event: MemoryEvent): void {
    event.version = this.version + 1;
    this.events.push(event);
    this.apply(event);
    this.version = event.version;
  }

  protected abstract apply(event: MemoryEvent): void;
}

export default AdvancedEventBus;
