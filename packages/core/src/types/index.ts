import { z } from 'zod';

// Core Memory Types
export const MemoryTypeSchema = z.enum(['personality', 'procedure', 'preference', 'fact', 'thread']);
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
  embedding: z.object({
    provider: z.enum(['openai', 'azure', 'local']).default('openai'),
    model: z.string().default('text-embedding-3-small'),
    api_key: z.string().optional(),
    endpoint: z.string().url().optional(),
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
