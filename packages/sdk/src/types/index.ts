/**
 * @fileoverview Type definitions for Memorai SDK
 */

import type { MemoryContext } from '@codai/memorai-core';

// Client Configuration
export interface ClientOptions {
  serverUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cache?: CacheOptions;
  logging?: boolean;
}

export interface ConnectionOptions {
  serverUrl: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface CacheOptions {
  enabled: boolean;
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo';
}

// Memory Operations
export interface MemoryOperation {
  operation: 'remember' | 'recall' | 'forget' | 'context';
  data?: unknown;
  options?: OperationOptions;
}

export interface OperationOptions {
  timeout?: number;
  retry?: boolean;
  cache?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export interface RememberOptions {
  content: string;
  context?: MemoryContext;
  metadata?: Record<string, unknown>;
  tags?: string[];
  priority?: number;
  expires?: Date;
}

export interface RecallOptions {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: RecallFilters;
  context?: MemoryContext;
  useCache?: boolean;
}

export interface RecallFilters {
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface ForgetOptions {
  memoryId?: string;
  query?: string;
  filters?: RecallFilters;
  confirmDeletion?: boolean;
}

export interface ContextOptions {
  topic?: string;
  timeframe?: {
    start?: Date;
    end?: Date;
  };
  limit?: number;
  includeMemories?: boolean;
  summaryType?: 'brief' | 'detailed' | 'highlights';
}

// Agent Types
export interface AgentMemory {
  id: string;
  content: string;
  context: MemoryContext;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  relevanceScore?: number;
}

export interface MemorySession {
  id: string;
  agentId: string;
  startTime: Date;
  endTime?: Date;
  memories: AgentMemory[];
  context: MemoryContext;
  summary?: string;
}

// Response Types
export interface MemoryResponse<T = any> {
  success: boolean;
  data?: T;
  memories?: AgentMemory[];
  context?: MemoryContext;
  error?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  processingTime: number;
  tokensUsed?: number;
  cacheHit?: boolean;
  rateLimit?: {
    remaining: number;
    reset: string;
  };
}

// Error Types
export interface SDKError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export class MemoraiSDKError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly retryable: boolean;

  constructor(code: string, message: string, details?: unknown, retryable = false) {
    super(message);
    this.name = 'MemoraiSDKError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

// Event Types
export interface MemoryEvent {
  type:
    | 'memory_created'
    | 'memory_recalled'
    | 'memory_forgotten'
    | 'context_generated';
  data: unknown;
  timestamp: Date;
  sessionId?: string;
}

export type EventHandler = (event: MemoryEvent) => void;

// Utility Types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    cursor?: string;
  };
}
