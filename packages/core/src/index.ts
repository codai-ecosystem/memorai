// Memory Core - Agent-Native Memory Engine
export * from "./engine/MemoryEngine.js";
export {
  UnifiedMemoryEngine,
  type UnifiedMemoryConfig,
} from "./engine/UnifiedMemoryEngine.js";
export { BasicMemoryEngine } from "./engine/BasicMemoryEngine.js";
export * from "./engine/MemoryTier.js";
export * from "./vector/VectorStore.js";
export * from "./context/ContextEngine.js";
export * from "./types/index.js";
export * from "./embedding/EmbeddingService.js";
export {
  LocalEmbeddingService,
  type LocalEmbeddingConfig,
} from "./embedding/LocalEmbeddingService.js";
export * from "./storage/StorageAdapter.js";
export * from "./classification/MemoryClassifier.js";
export * from "./temporal/TemporalEngine.js";
export {
  MemoryConfigManager,
  MemoryConfigFactory,
} from "./config/MemoryConfig.js";

// Advanced Enterprise Features
export * from "./security/SecurityManager.js";
export * from "./resilience/ResilienceManager.js";
export * from "./monitoring/PerformanceMonitor.js";

// High Performance Components
export { HighPerformanceMemoryEngine } from "./engine/HighPerformanceMemoryEngine.js";
export {
  PerformanceOptimizer,
  performanceOptimizer,
} from "./performance/PerformanceOptimizer.js";

// Advanced Relationship and Integration Features
export { MemoryRelationshipManager } from "./relationships/MemoryRelationshipManager.js";
export { GitHubIntegration, type GitHubIntegrationConfig } from "./integrations/GitHubIntegration.js";
