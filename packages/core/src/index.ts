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
export { BasicMemoryEngine } from './engine/BasicMemoryEngine.js';
export * from './engine/MemoryEngine.js';
export * from './engine/MemoryTier.js';
export {
  UnifiedMemoryEngine,
  type UnifiedMemoryConfig,
} from './engine/UnifiedMemoryEngine.js';
export * from './storage/StorageAdapter.js';
export * from './temporal/TemporalEngine.js';
export * from './types/index.js';
export * from './vector/VectorStore.js';

// Advanced Enterprise Features
export * from './monitoring/PerformanceMonitor.js';
export * from './resilience/ResilienceManager.js';
export * from './security/SecurityManager.js';

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
