import { z } from 'zod';

// Core Memory Types
export const MemoryTypeSchema = z.enum([
  'personality',
  'procedure',
  'preference',
  'fact',
  'thread',
  'task',
  'emotion',
]);
export type MemoryType = z.infer<typeof MemoryTypeSchema>;

export const MemoryMetadataSchema = z.object({
  id: z.string(),
  type: MemoryTypeSchema,
  content: z.string(),
  embedding: z.array(z.number()).optional(),
  confidence: z.number().min(0).max(1),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date(),
  accessCount: z.number().int().min(0),
  importance: z.number().min(0).max(1),
  emotional_weight: z.number().min(-1).max(1).optional(),
  tags: z.array(z.string()).default([]),
  context: z.record(z.unknown()).optional(),
  tenant_id: z.string(),
  agent_id: z.string().optional(),
  ttl: z.date().optional(),
});

export type MemoryMetadata = z.infer<typeof MemoryMetadataSchema>;

export const MemoryQuerySchema = z.object({
  query: z.string(),
  type: MemoryTypeSchema.optional(),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  tenant_id: z.string(),
  agent_id: z.string().optional(),
  include_context: z.boolean().default(true),
  time_decay: z.boolean().default(true),
});

export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

export const MemoryResultSchema = z.object({
  memory: MemoryMetadataSchema,
  score: z.number().min(0).max(1),
  relevance_reason: z.string().optional(),
});

export type MemoryResult = z.infer<typeof MemoryResultSchema>;

export const ContextRequestSchema = z.object({
  topic: z.string().optional(),
  time_range: z.string().optional(),
  memory_types: z.array(MemoryTypeSchema).optional(),
  tenant_id: z.string(),
  agent_id: z.string().optional(),
  max_memories: z.number().int().min(1).max(50).default(20),
});

export type ContextRequest = z.infer<typeof ContextRequestSchema>;

export const ContextResponseSchema = z.object({
  context: z.string(),
  memories: z.array(MemoryResultSchema),
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  generated_at: z.date(),
  // Additional fields for comprehensive testing
  total_count: z.number().int().min(0),
  context_summary: z.string(),
});

export type ContextResponse = z.infer<typeof ContextResponseSchema>;

// Memory Context Types
export const MemoryContextSchema = z.object({
  sessionId: z.string().optional(),
  topic: z.string().optional(),
  timestamp: z.date().optional(),
  location: z.string().optional(),
  participants: z.array(z.string()).optional(),
  environment: z.record(z.unknown()).optional(),
  previousContext: z.string().optional(),
  userIntent: z.string().optional(),
  conversationTurn: z.number().optional(),
});

export type MemoryContext = z.infer<typeof MemoryContextSchema>;

// Configuration Types
export const MemoryConfigSchema = z.object({
  vector_db: z.object({
    url: z.string().url(),
    api_key: z.string().optional(),
    collection: z.string().default('memories'),
    dimension: z.number().int().min(1).default(1536),
  }),
  redis: z.object({
    url: z.string().url(),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0),
  }),
  // OpenAI/Azure configuration for language model - Default to Azure
  openai: z
    .object({
      provider: z.enum(['openai', 'azure']).default('azure'), // Changed default to azure
      api_key: z.string().optional(),
      model: z.string().default('memorai-model-r'), // Azure deployment name

      // Standard OpenAI configuration
      base_url: z.string().url().optional(),

      // Azure OpenAI specific configuration
      azure_endpoint: z.string().url().optional(),
      azure_deployment: z.string().optional(),
      azure_api_version: z.string().optional(),
    })
    .optional(),
  embedding: z.object({
    provider: z.enum(['openai', 'azure', 'local']).default('azure'), // Changed default to azure
    model: z.string().default('memorai-model-r'), // Azure deployment name
    api_key: z.string().optional(),

    // Standard OpenAI configuration
    endpoint: z.string().url().optional(),

    // Azure OpenAI specific configuration
    azure_endpoint: z.string().url().optional(),
    azure_deployment: z.string().optional(),
    azure_api_version: z.string().optional(),

    // Additional Azure settings
    dimensions: z.number().int().min(1).optional(),
  }),
  performance: z.object({
    max_query_time_ms: z.number().int().min(1).default(100),
    cache_ttl_seconds: z.number().int().min(1).default(300),
    batch_size: z.number().int().min(1).default(100),
  }),
  security: z.object({
    encryption_key: z.string().min(32),
    tenant_isolation: z.boolean().default(true),
    audit_logs: z.boolean().default(true),
  }),
});

export type MemoryConfig = z.infer<typeof MemoryConfigSchema>;

// Error Types
export class MemoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class VectorStoreError extends MemoryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VECTOR_STORE_ERROR', context);
    this.name = 'VectorStoreError';
  }
}

export class EmbeddingError extends MemoryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'EMBEDDING_ERROR', context);
    this.name = 'EmbeddingError';
  }
}

export class ContextError extends MemoryError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONTEXT_ERROR', context);
    this.name = 'ContextError';
  }
}

// Advanced Memory Relationship Types
export const MemoryRelationshipTypeSchema = z.enum([
  'parent',
  'child',
  'sibling',
  'derived',
  'references',
  'conflicts',
  'supersedes',
  'complements',
  'triggers',
  'context',
]);
export type MemoryRelationshipType = z.infer<
  typeof MemoryRelationshipTypeSchema
>;

export const MemoryRelationshipSchema = z.object({
  id: z.string(),
  sourceMemoryId: z.string(),
  targetMemoryId: z.string(),
  relationshipType: MemoryRelationshipTypeSchema,
  strength: z.number().min(0).max(1).default(1.0),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tenantId: z.string(),
  isActive: z.boolean().default(true),
});

export type MemoryRelationship = z.infer<typeof MemoryRelationshipSchema>;

// Enhanced Memory with Relationships
export const EnhancedMemoryMetadataSchema = MemoryMetadataSchema.extend({
  // Hierarchical relationships
  parentId: z.string().optional(),
  childIds: z.array(z.string()).default([]),
  relationships: z.array(MemoryRelationshipSchema).default([]),

  // Version tracking
  version: z.number().int().min(1).default(1),
  previousVersionId: z.string().optional(),

  // Enhanced metadata
  sourceType: z
    .enum(['user', 'system', 'agent', 'api', 'integration'])
    .default('user'),
  sourceId: z.string().optional(),

  // Smart categorization
  autoTags: z.array(z.string()).default([]),
  suggestedRelationships: z.array(z.string()).default([]),

  // Usage patterns
  accessPattern: z
    .object({
      frequency: z.number().default(0),
      recency: z.number().default(0),
      contextRelevance: z.number().default(0),
    })
    .optional(),
});

export type EnhancedMemoryMetadata = z.infer<
  typeof EnhancedMemoryMetadataSchema
>;

// Memory Graph Operations
export const MemoryGraphQuerySchema = z.object({
  startMemoryId: z.string(),
  relationshipTypes: z.array(MemoryRelationshipTypeSchema).optional(),
  maxDepth: z.number().int().min(1).max(10).default(3),
  includeInactive: z.boolean().default(false).optional(),
  tenantId: z.string(),
});

export type MemoryGraphQuery = z.infer<typeof MemoryGraphQuerySchema>;

export const MemoryGraphResultSchema = z.object({
  nodes: z.array(EnhancedMemoryMetadataSchema),
  edges: z.array(MemoryRelationshipSchema),
  paths: z.array(z.array(z.string())),
  statistics: z.object({
    totalNodes: z.number(),
    totalEdges: z.number(),
    maxDepth: z.number(),
    averageConnectivity: z.number(),
  }),
});

export type MemoryGraphResult = z.infer<typeof MemoryGraphResultSchema>;
