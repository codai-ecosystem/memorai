// Memory Core - Agent-Native Memory Engine
export * from './classification/MemoryClassifier.js';
export {
  MemoryConfigFactory,
  MemoryConfigManager,
} from './config/MemoryConfig.js';
export * from './context/ContextEngine.js';
export * from './embedding/EmbeddingService.js';
export {
  LocalEmbeddingService,
  type LocalEmbeddingConfig,
} from './embedding/LocalEmbeddingService.js';
export {
  AdvancedMemoryEngine,
  type AdvancedMemoryConfig,
} from './engine/AdvancedMemoryEngine.js';
export { BasicMemoryEngine } from './engine/BasicMemoryEngine.js';
export * from './engine/MemoryEngine.js';

export * from './storage/StorageAdapter.js';
export * from './temporal/TemporalEngine.js';
export * from './types/index.js';
export * from './vector/VectorStore.js';

// Advanced Enterprise Features
export * from './monitoring/PerformanceMonitor.js';
export * from './resilience/ResilienceManager.js';
export * from './security/SecurityManager.js';

// Event-Driven Architecture (Phase 1.1)
export * from './events/EventDrivenArchitecture.js';
export * from './cqrs/CQRSImplementation.js';
export {
  MemoryAggregate,
  MemoryId,
  MemoryContent,
  ImportanceScore,
  AgentId,
  MemoryClassification as DomainMemoryClassification,
  MemoryRelationship as DomainMemoryRelationship,
  MemoryRepository,
  MemorySpecification,
  HighImportanceSpecification,
  RecentlyAccessedSpecification,
  HasClassificationSpecification
} from './domain/MemoryDomainModel.js';
export * from './hexagonal/HexagonalArchitecture.js';

// High Performance Components
export { HighPerformanceMemoryEngine } from './engine/HighPerformanceMemoryEngine.js';
export {
  PerformanceOptimizer,
  performanceOptimizer,
} from './performance/PerformanceOptimizer.js';

// Advanced Relationship and Integration Features
export {
  GitHubIntegration,
  type GitHubIntegrationConfig,
} from './integrations/GitHubIntegration.js';
export { MemoryRelationshipManager } from './relationships/MemoryRelationshipManager.js';

// AI-Powered Memory Intelligence (v3.0 Features)
export * from './ai/index.js';

// Advanced Architecture Patterns (Phase 1.1-1.3) - Individual Exports
export { AdvancedEventBus, EventSourcedAggregate } from './events/EventDrivenArchitecture.js';
export { CQRSOrchestrator, CommandBus, QueryBus } from './cqrs/CQRSImplementation.js';
export { MemoryApplicationService } from './hexagonal/HexagonalArchitecture.js';

// Modern Technology Stack (Phase 2.1-2.4) - Specific Exports to Avoid Conflicts
export { 
  createMemoryId as createAdvancedMemoryId,
  createAgentId as createAdvancedAgentId,
  Result as AdvancedResult,
  Ok as AdvancedOk,
  Err as AdvancedErr,
  Brand,
  MemoryId as AdvancedMemoryId,
  AgentId as AdvancedAgentId
} from './typescript/TypeScriptAdvanced.js';

export { NextJSServerActions, NextJSCache, NextJSDataFetching } from './nextjs/NextJSUtilities.js';
export { React19Patterns, ConcurrentPatterns, PerformancePatterns } from './react/React19Features.js';
export { NodeJS22Features } from './nodejs/NodeJS22Features.js';
