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
export * from './cqrs/CQRSImplementation.js';
export {
  AgentId,
  MemoryClassification as DomainMemoryClassification,
  MemoryRelationship as DomainMemoryRelationship,
  HasClassificationSpecification,
  HighImportanceSpecification,
  ImportanceScore,
  MemoryAggregate,
  MemoryContent,
  MemoryId,
  MemoryRepository,
  MemorySpecification,
  RecentlyAccessedSpecification,
} from './domain/MemoryDomainModel.js';
export * from './events/EventDrivenArchitecture.js';
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
export {
  CQRSOrchestrator,
  CommandBus,
  QueryBus,
} from './cqrs/CQRSImplementation.js';
export {
  AdvancedEventBus,
  EventSourcedAggregate,
} from './events/EventDrivenArchitecture.js';
export { MemoryApplicationService } from './hexagonal/HexagonalArchitecture.js';

// Modern Technology Stack (Phase 2.1-2.4) - Specific Exports to Avoid Conflicts
export {
  AgentId as AdvancedAgentId,
  Err as AdvancedErr,
  MemoryId as AdvancedMemoryId,
  Ok as AdvancedOk,
  Result as AdvancedResult,
  Brand,
  createAgentId as createAdvancedAgentId,
  createMemoryId as createAdvancedMemoryId,
} from './typescript/TypeScriptAdvanced.js';

// export { NextJSServerActions, NextJSCache, NextJSDataFetching } from './nextjs/NextJSUtilities.js';
export { NodeJS22Features } from './nodejs/NodeJS22Features.js';
export {
  ConcurrentPatterns,
  PerformancePatterns,
  React19Patterns,
} from './react/React19Features.js';
