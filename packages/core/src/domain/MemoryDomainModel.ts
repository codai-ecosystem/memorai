/**
 * @fileoverview Domain-Driven Design Implementation
 * Implements DDD patterns for memory domain modeling
 */

import { nanoid } from 'nanoid';
import {
  EventSourcedAggregate,
  MemoryEvent,
  MemoryEventFactory,
  MemoryEventType,
} from '../events/EventDrivenArchitecture.js';
import { MemoryMetadata, MemoryType } from '../types/index.js';

// Value Objects
export class MemoryId {
  private readonly value: string;

  constructor(value?: string) {
    this.value = value || nanoid();
    this.validate();
  }

  toString(): string {
    return this.value;
  }

  equals(other: MemoryId): boolean {
    return this.value === other.value;
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('MemoryId cannot be empty');
    }
  }
}

export class MemoryContent {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
    this.validate();
  }

  toString(): string {
    return this.value;
  }

  get length(): number {
    return this.value.length;
  }

  get wordCount(): number {
    return this.value.split(/\s+/).filter(word => word.length > 0).length;
  }

  equals(other: MemoryContent): boolean {
    return this.value === other.value;
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('MemoryContent cannot be empty');
    }
    if (this.value.length > 1000000) {
      // 1MB text limit
      throw new Error('MemoryContent too large');
    }
  }
}

export class ImportanceScore {
  private readonly value: number;

  constructor(value: number) {
    this.value = value;
    this.validate();
  }

  toNumber(): number {
    return this.value;
  }

  isHigh(): boolean {
    return this.value >= 0.8;
  }

  isMedium(): boolean {
    return this.value >= 0.5 && this.value < 0.8;
  }

  isLow(): boolean {
    return this.value < 0.5;
  }

  equals(other: ImportanceScore): boolean {
    return Math.abs(this.value - other.value) < 0.001; // Float comparison
  }

  private validate(): void {
    if (this.value < 0 || this.value > 1) {
      throw new Error('ImportanceScore must be between 0 and 1');
    }
  }
}

export class AgentId {
  private readonly value: string;

  constructor(value: string) {
    this.value = value;
    this.validate();
  }

  toString(): string {
    return this.value;
  }

  equals(other: AgentId): boolean {
    return this.value === other.value;
  }

  private validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error('AgentId cannot be empty');
    }
  }
}

// Entities
export class MemoryClassification {
  constructor(
    public readonly id: string,
    public readonly category: string,
    public readonly confidence: number,
    public readonly tags: string[],
    public readonly createdAt: Date,
    public readonly agentId: AgentId
  ) {
    this.validate();
  }

  isHighConfidence(): boolean {
    return this.confidence >= 0.8;
  }

  hasTag(tag: string): boolean {
    return this.tags.some(t => t.toLowerCase() === tag.toLowerCase());
  }

  private validate(): void {
    if (this.confidence < 0 || this.confidence > 1) {
      throw new Error('Classification confidence must be between 0 and 1');
    }
    if (!this.category || this.category.trim().length === 0) {
      throw new Error('Classification category cannot be empty');
    }
  }
}

export class MemoryRelationship {
  constructor(
    public readonly id: string,
    public readonly sourceMemoryId: MemoryId,
    public readonly targetMemoryId: MemoryId,
    public readonly relationshipType: string,
    public readonly strength: number,
    public readonly createdAt: Date,
    public readonly agentId: AgentId,
    public readonly metadata: Record<string, any> = {}
  ) {
    this.validate();
  }

  isStrong(): boolean {
    return this.strength >= 0.7;
  }

  isBidirectional(): boolean {
    return ['similar', 'related', 'equivalent'].includes(this.relationshipType);
  }

  private validate(): void {
    if (this.strength < 0 || this.strength > 1) {
      throw new Error('Relationship strength must be between 0 and 1');
    }
    if (this.sourceMemoryId.equals(this.targetMemoryId)) {
      throw new Error('Memory cannot have relationship with itself');
    }
  }
}

// Domain Services
export interface MemoryClassificationService {
  classifyMemory(
    content: MemoryContent,
    agentId: AgentId
  ): Promise<MemoryClassification>;
  reclassifyMemory(
    memoryId: MemoryId,
    content: MemoryContent,
    agentId: AgentId
  ): Promise<MemoryClassification>;
}

export interface MemoryRelationshipService {
  findRelationships(
    memoryId: MemoryId,
    content: MemoryContent
  ): Promise<MemoryRelationship[]>;
  createRelationship(
    sourceId: MemoryId,
    targetId: MemoryId,
    type: string,
    strength: number,
    agentId: AgentId
  ): Promise<MemoryRelationship>;
}

export interface MemorySearchService {
  searchSemantic(query: string, limit: number): Promise<MemoryAggregate[]>;
  searchByTags(tags: string[], limit: number): Promise<MemoryAggregate[]>;
  searchByTimeRange(
    start: Date,
    end: Date,
    limit: number
  ): Promise<MemoryAggregate[]>;
}

// Memory Aggregate Root
export class MemoryAggregate extends EventSourcedAggregate {
  private memoryId: MemoryId;
  private content: MemoryContent;
  private importance: ImportanceScore;
  private createdBy: AgentId;
  private createdAt: Date;
  private updatedAt: Date;
  private isDeleted: boolean = false;
  private classifications: MemoryClassification[] = [];
  private relationships: MemoryRelationship[] = [];
  private accessCount: number = 0;
  private lastAccessedAt?: Date;

  constructor(
    memoryId: MemoryId,
    content: MemoryContent,
    importance: ImportanceScore,
    createdBy: AgentId
  ) {
    super(memoryId.toString());
    this.memoryId = memoryId;
    this.content = content;
    this.importance = importance;
    this.createdBy = createdBy;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Factory method
  static create(
    content: string,
    importance: number,
    agentId: string,
    metadata: Partial<MemoryMetadata> = {}
  ): MemoryAggregate {
    const memoryId = new MemoryId();
    const memoryContent = new MemoryContent(content);
    const importanceScore = new ImportanceScore(importance);
    const agentIdVo = new AgentId(agentId);

    const aggregate = new MemoryAggregate(
      memoryId,
      memoryContent,
      importanceScore,
      agentIdVo
    );

    // Create domain event
    const event = MemoryEventFactory.createMemoryCreatedEvent(
      {
        id: memoryId.toString(),
        content,
        type: (metadata.type as MemoryType) || 'fact',
        confidence: 1.0,
        importance,
        tags: metadata.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        tenant_id: metadata.tenant_id || 'default',
        agent_id: agentId,
        ...metadata,
      },
      agentId
    );

    aggregate.addEvent(event);
    return aggregate;
  }

  // Business logic methods
  updateContent(newContent: string, updatedBy: AgentId): void {
    if (this.isDeleted) {
      throw new Error('Cannot update deleted memory');
    }

    const oldContent = this.content;
    this.content = new MemoryContent(newContent);
    this.updatedAt = new Date();

    // Create domain event
    const event = MemoryEventFactory.createMemoryCreatedEvent(
      // Simplified for now
      this.toMemoryMetadata(),
      updatedBy.toString()
    );

    this.addEvent(event);
  }

  updateImportance(newImportance: number, updatedBy: AgentId): void {
    if (this.isDeleted) {
      throw new Error('Cannot update deleted memory');
    }

    this.importance = new ImportanceScore(newImportance);
    this.updatedAt = new Date();

    // Could create specific importance updated event
  }

  addClassification(classification: MemoryClassification): void {
    if (this.isDeleted) {
      throw new Error('Cannot classify deleted memory');
    }

    // Remove existing classification from same agent for same category
    this.classifications = this.classifications.filter(
      c =>
        !(
          c.category === classification.category &&
          c.agentId.equals(classification.agentId)
        )
    );

    this.classifications.push(classification);
    this.updatedAt = new Date();

    // Create classification event
    const event = MemoryEventFactory.createAIInsightEvent(
      'classification',
      classification.confidence,
      [this.memoryId.toString()],
      classification.agentId.toString(),
      [`Classified as ${classification.category}`],
      []
    );

    this.addEvent(event);
  }

  addRelationship(relationship: MemoryRelationship): void {
    if (this.isDeleted) {
      throw new Error('Cannot add relationship to deleted memory');
    }

    // Prevent duplicate relationships
    const exists = this.relationships.some(
      r =>
        r.targetMemoryId.equals(relationship.targetMemoryId) &&
        r.relationshipType === relationship.relationshipType
    );

    if (!exists) {
      this.relationships.push(relationship);
      this.updatedAt = new Date();
    }
  }

  markAsAccessed(accessedBy: AgentId): void {
    if (this.isDeleted) {
      return; // Silent fail for deleted memories
    }

    this.accessCount++;
    this.lastAccessedAt = new Date();

    // Create access event for analytics
    const event = MemoryEventFactory.createPerformanceMetricEvent(
      'memory.access',
      1,
      accessedBy.toString()
    );

    this.addEvent(event);
  }

  delete(deletedBy: AgentId, reason: string): void {
    if (this.isDeleted) {
      throw new Error('Memory already deleted');
    }

    this.isDeleted = true;
    this.updatedAt = new Date();

    // Create deletion event
    // Note: In a real implementation, we'd create a MemoryDeletedEvent
    const event = MemoryEventFactory.createAIInsightEvent(
      'optimization',
      1.0,
      [this.memoryId.toString()],
      deletedBy.toString(),
      [`Memory deleted: ${reason}`],
      []
    );

    this.addEvent(event);
  }

  // Query methods
  getId(): MemoryId {
    return this.memoryId;
  }

  getContent(): MemoryContent {
    return this.content;
  }

  getImportance(): ImportanceScore {
    return this.importance;
  }

  getCreatedBy(): AgentId {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getIsDeleted(): boolean {
    return this.isDeleted;
  }

  getClassifications(): ReadonlyArray<MemoryClassification> {
    return [...this.classifications];
  }

  getRelationships(): ReadonlyArray<MemoryRelationship> {
    return [...this.relationships];
  }

  getAccessCount(): number {
    return this.accessCount;
  }

  getLastAccessedAt(): Date | undefined {
    return this.lastAccessedAt;
  }

  // Business rule queries
  isHighImportance(): boolean {
    return this.importance.isHigh();
  }

  isRecentlyAccessed(withinHours: number = 24): boolean {
    if (!this.lastAccessedAt) return false;

    const threshold = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    return this.lastAccessedAt > threshold;
  }

  hasClassification(category: string): boolean {
    return this.classifications.some(c => c.category === category);
  }

  getHighConfidenceClassifications(): MemoryClassification[] {
    return this.classifications.filter(c => c.isHighConfidence());
  }

  getStrongRelationships(): MemoryRelationship[] {
    return this.relationships.filter(r => r.isStrong());
  }

  // Serialization
  toMemoryMetadata(): MemoryMetadata {
    return {
      id: this.memoryId.toString(),
      content: this.content.toString(),
      type: (this.getMainClassification()?.category as MemoryType) || 'fact',
      confidence: this.getMainClassification()?.confidence || 1.0,
      importance: this.importance.toNumber(),
      tags: this.getAllTags(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastAccessedAt: this.lastAccessedAt || this.createdAt,
      accessCount: this.accessCount,
      tenant_id: 'default',
      agent_id: this.createdBy.toString(),
    };
  }

  private getMainClassification(): MemoryClassification | undefined {
    return this.classifications.sort((a, b) => b.confidence - a.confidence)[0];
  }

  private getAllTags(): string[] {
    const allTags = this.classifications.flatMap(c => c.tags);
    return [...new Set(allTags)]; // Remove duplicates
  }

  // Event sourcing implementation
  protected apply(event: MemoryEvent): void {
    switch (event.type) {
      case MemoryEventType.MEMORY_CREATED:
        // State already set in constructor
        break;
      case MemoryEventType.MEMORY_UPDATED:
        // Apply updates from event
        this.updatedAt = event.timestamp;
        break;
      case MemoryEventType.PERFORMANCE_METRIC:
        if (event.data?.metric === 'memory.access') {
          this.accessCount++;
          this.lastAccessedAt = event.timestamp;
        }
        break;
      case MemoryEventType.AI_INSIGHT_GENERATED:
        // Handle classification insights
        break;
      default:
        // Unknown event type, log or ignore
        break;
    }
  }
}

// Repository Interface (Domain)
export interface MemoryRepository {
  save(aggregate: MemoryAggregate): Promise<void>;
  findById(id: MemoryId): Promise<MemoryAggregate | null>;
  findByAgentId(agentId: AgentId, limit?: number): Promise<MemoryAggregate[]>;
  findByImportance(
    minImportance: number,
    limit?: number
  ): Promise<MemoryAggregate[]>;
  findRecentlyUpdated(
    sinceDate: Date,
    limit?: number
  ): Promise<MemoryAggregate[]>;
  delete(id: MemoryId): Promise<void>;
}

// Domain Events (Additional)
export interface MemoryDomainEvent {
  id: string;
  type: MemoryEventType;
  timestamp: Date;
  version: number;
  agentId: string;
  correlationId?: string;
  causationId?: string;
  metadata: Record<string, any>;
  aggregateId: string;
  aggregateVersion: number;
}

// Specification Pattern for complex queries
export abstract class MemorySpecification {
  abstract isSatisfiedBy(memory: MemoryAggregate): boolean;

  and(other: MemorySpecification): MemorySpecification {
    return new AndSpecification(this, other);
  }

  or(other: MemorySpecification): MemorySpecification {
    return new OrSpecification(this, other);
  }

  not(): MemorySpecification {
    return new NotSpecification(this);
  }
}

export class HighImportanceSpecification extends MemorySpecification {
  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return memory.isHighImportance();
  }
}

export class RecentlyAccessedSpecification extends MemorySpecification {
  constructor(private withinHours: number = 24) {
    super();
  }

  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return memory.isRecentlyAccessed(this.withinHours);
  }
}

export class HasClassificationSpecification extends MemorySpecification {
  constructor(private category: string) {
    super();
  }

  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return memory.hasClassification(this.category);
  }
}

// Composite specifications
class AndSpecification extends MemorySpecification {
  constructor(
    private left: MemorySpecification,
    private right: MemorySpecification
  ) {
    super();
  }

  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return this.left.isSatisfiedBy(memory) && this.right.isSatisfiedBy(memory);
  }
}

class OrSpecification extends MemorySpecification {
  constructor(
    private left: MemorySpecification,
    private right: MemorySpecification
  ) {
    super();
  }

  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return this.left.isSatisfiedBy(memory) || this.right.isSatisfiedBy(memory);
  }
}

class NotSpecification extends MemorySpecification {
  constructor(private spec: MemorySpecification) {
    super();
  }

  isSatisfiedBy(memory: MemoryAggregate): boolean {
    return !this.spec.isSatisfiedBy(memory);
  }
}

export default MemoryAggregate;
