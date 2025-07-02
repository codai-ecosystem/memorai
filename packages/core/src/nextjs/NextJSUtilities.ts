/**
 * @fileoverview Next.js 15 Server Actions and Utilities (Phase 2.2)
 * TypeScript-only implementation for server-side functionality
 */

import { MemoryMetadata, MemoryQuery, MemoryResult } from '../types/index.js';
import { createMemoryId, createAgentId, Result, Ok, Err } from '../typescript/TypeScriptAdvanced.js';

// Next.js Server Actions (TypeScript Implementation)
export namespace NextJSServerActions {
  /**
   * Create a new memory with proper validation and caching
   */
  export async function createMemory(
    agentId: string,
    content: string,
    importance: number = 0.5,
    metadata: Partial<MemoryMetadata> = {}
  ): Promise<Result<string, string>> {
    try {
      // Validate inputs
      if (!content.trim()) {
        return Err('Memory content cannot be empty');
      }

      if (importance < 0 || importance > 1) {
        return Err('Importance must be between 0 and 1');
      }

      // Create memory ID (simple string generation)
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In real implementation, would call the memory service
      // const result = await MemoryService.create({
      //   id: createMemoryId(memoryId),
      //   agentId: createAgentId(agentId),
      //   content,
      //   importance,
      //   ...metadata
      // });

      // Simulate cache invalidation
      NextJSCache.revalidateTag('memories');
      NextJSCache.revalidatePath('/memories');
      NextJSCache.revalidatePath(`/agents/${agentId}/memories`);

      return { success: true, data: memoryId, error: undefined } as Result<string, string>;
    } catch (error) {
      return Err(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing memory
   */
  export async function updateMemory(
    memoryId: string,
    updates: Partial<MemoryMetadata>,
    agentId: string
  ): Promise<Result<boolean, string>> {
    try {
      // In real implementation, would call the memory service
      // const result = await MemoryService.update(memoryId, updates);

      // Simulate cache invalidation
      NextJSCache.revalidateTag(`memory:${memoryId}`);
      NextJSCache.revalidateTag('memories');
      NextJSCache.revalidatePath(`/memories/${memoryId}`);

      return { success: true, data: true, error: undefined } as Result<boolean, string>;
    } catch (error) {
      return Err(`Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a memory
   */
  export async function deleteMemory(
    memoryId: string,
    agentId: string
  ): Promise<Result<boolean, string>> {
    try {
      // In real implementation, would call the memory service
      // const result = await MemoryService.delete(memoryId);
      
      // Simulate cache invalidation
      NextJSCache.revalidateTag('memories');
      NextJSCache.revalidatePath('/memories');
      
      return { success: true, data: true, error: undefined } as Result<boolean, string>;
    } catch (error) {
      return Err(`Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search memories with advanced query capabilities
   */
  export async function searchMemories(
    query: MemoryQuery
  ): Promise<Result<MemoryResult[], string>> {
    try {
      // In real implementation, would call the memory service
      // const results = await MemoryService.search(query);
      const results: MemoryResult[] = [];
      
      return { success: true, data: results, error: undefined } as Result<MemoryResult[], string>;
    } catch (error) {
      return Err(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Caching utilities
export namespace NextJSCache {
  const cacheStore = new Map<string, { data: any; timestamp: number; ttl: number }>();

  export function cache<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      const cached = cacheStore.get(key);
      
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }

      const result = await fn(...args);
      cacheStore.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: 60000 // 1 minute default
      });

      return result;
    }) as T;
  }

  export function unstableCache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keys: string[],
    options: { tags?: string[]; revalidate?: number } = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keys.join(':') + ':' + JSON.stringify(args);
      const cached = cacheStore.get(key);
      const ttl = (options.revalidate || 60) * 1000;
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }

      const result = await fn(...args);
      cacheStore.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl
      });

      return result;
    }) as T;
  }

  export function revalidateTag(tag: string): void {
    // In real Next.js environment, this would invalidate cache
    console.log(`Revalidating cache tag: ${tag}`);
    
    // Clear all cache entries with this tag
    for (const [key, value] of cacheStore.entries()) {
      if (key.includes(tag)) {
        cacheStore.delete(key);
      }
    }
  }

  export function revalidatePath(path: string): void {
    // In real Next.js environment, this would invalidate cache
    console.log(`Revalidating cache path: ${path}`);
    
    // Clear all cache entries for this path
    for (const [key, value] of cacheStore.entries()) {
      if (key.includes(path)) {
        cacheStore.delete(key);
      }
    }
  }
}

// Data fetching utilities with caching
export namespace NextJSDataFetching {
  /**
   * Get a single memory by ID with request-level caching
   */
  export const getMemory = NextJSCache.cache(
    async (memoryId: string): Promise<MemoryMetadata | null> => {
      try {
        // In real implementation, would call the memory service
        // return await MemoryService.getById(memoryId);
        return null;
      } catch (error) {
        console.error('Failed to fetch memory:', error);
        return null;
      }
    }
  );

  /**
   * Get memories by agent with data cache
   */
  export const getMemoriesByAgent = NextJSCache.unstableCache(
    async (agentId: string, limit: number = 50): Promise<MemoryMetadata[]> => {
      try {
        // In real implementation, would call the memory service
        // return await MemoryService.getByAgent(agentId, { limit });
        return [];
      } catch (error) {
        console.error('Failed to fetch memories by agent:', error);
        return [];
      }
    },
    ['memories-by-agent'],
    {
      tags: ['memories'],
      revalidate: 60 // 1 minute
    }
  );

  /**
   * Get memory insights with longer cache duration
   */
  export const getMemoryInsights = NextJSCache.unstableCache(
    async (agentId: string): Promise<{ insights: string[]; patterns: any[] }> => {
      try {
        // In real implementation, would call the AI service
        // return await AIService.generateInsights(agentId);
        return { insights: [], patterns: [] };
      } catch (error) {
        console.error('Failed to fetch memory insights:', error);
        return { insights: [], patterns: [] };
      }
    },
    ['memory-insights'],
    {
      tags: ['insights'],
      revalidate: 300 // 5 minutes
    }
  );
}

// Route handler utilities
export namespace NextJSRouteHandlers {
  export interface RouteContext {
    params: Record<string, string>;
    searchParams: Record<string, string>;
  }

  export interface ApiRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: any;
  }

  export interface ApiResponse {
    status: number;
    data: any;
    headers?: Record<string, string>;
  }

  /**
   * Handle GET requests for memories
   */
  export async function handleGetMemories(
    request: ApiRequest,
    context: RouteContext
  ): Promise<ApiResponse> {
    try {
      const agentId = context.params.agentId;
      const limit = Number(context.searchParams.limit) || 50;
      const offset = Number(context.searchParams.offset) || 0;
      const type = context.searchParams.type;

      // Get memories with pagination
      const memories = await NextJSDataFetching.getMemoriesByAgent(agentId, limit);
      
      // Apply filters if needed
      const filteredMemories = type 
        ? memories.filter(m => m.type === type)
        : memories;

      return {
        status: 200,
        data: {
          memories: filteredMemories.slice(offset, offset + limit),
          pagination: {
            limit,
            offset,
            total: filteredMemories.length,
            hasMore: offset + limit < filteredMemories.length
          }
        }
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: 'Failed to fetch memories' }
      };
    }
  }

  /**
   * Handle POST requests for creating memories
   */
  export async function handleCreateMemory(
    request: ApiRequest
  ): Promise<ApiResponse> {
    try {
      const { agentId, content, importance, metadata } = request.body;

      if (!agentId || !content) {
        return {
          status: 400,
          data: { error: 'agentId and content are required' }
        };
      }

      const result = await NextJSServerActions.createMemory(agentId, content, importance, metadata);
      
      if (result.success) {
        return {
          status: 201,
          data: { memoryId: result.data }
        };
      } else {
        return {
          status: 400,
          data: { error: result.error }
        };
      }
    } catch (error) {
      return {
        status: 400,
        data: { error: 'Invalid request body' }
      };
    }
  }
}

// Middleware utilities
export namespace NextJSMiddleware {
  export interface MiddlewareRequest {
    headers: Record<string, string>;
    url: string;
    method: string;
  }

  export interface MiddlewareResponse {
    headers: Record<string, string>;
    status?: number;
    redirect?: string;
  }

  /**
   * Authentication middleware for memory routes
   */
  export function authMiddleware(request: MiddlewareRequest): MiddlewareResponse | null {
    const agentId = request.headers['x-agent-id'];
    
    if (!agentId) {
      return {
        status: 401,
        headers: {},
      };
    }

    // Add agent ID to response headers for downstream use
    return {
      headers: {
        'x-agent-id': agentId,
        'x-authenticated': 'true'
      }
    };
  }

  /**
   * Rate limiting middleware
   */
  export function rateLimitMiddleware(request: MiddlewareRequest): MiddlewareResponse | null {
    // In real implementation, would check rate limits
    const rateLimitRemaining = 100;
    const rateLimitReset = Date.now() + 3600000; // 1 hour

    return {
      headers: {
        'x-ratelimit-remaining': rateLimitRemaining.toString(),
        'x-ratelimit-reset': rateLimitReset.toString()
      }
    };
  }

  /**
   * CORS middleware
   */
  export function corsMiddleware(request: MiddlewareRequest): MiddlewareResponse | null {
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-agent-id'
      }
    };
  }
}

// Metadata generation utilities
export namespace NextJSMetadata {
  export interface MetadataResult {
    title: string;
    description: string;
    openGraph?: {
      title: string;
      description: string;
      images: string[];
      type: string;
      publishedTime?: string;
      modifiedTime?: string;
    };
    twitter?: {
      card: string;
      title: string;
      description: string;
      images: string[];
    };
    alternates?: {
      canonical: string;
    };
  }

  /**
   * Generate metadata for a memory page
   */
  export async function generateMemoryMetadata(
    memoryId: string
  ): Promise<MetadataResult> {
    const memory = await NextJSDataFetching.getMemory(memoryId);

    if (!memory) {
      return {
        title: 'Memory Not Found',
        description: 'The requested memory could not be found.'
      };
    }

    return {
      title: `Memory: ${memory.content.substring(0, 50)}...`,
      description: `Memory created ${memory.createdAt.toLocaleDateString()} with ${(memory.confidence * 100).toFixed(1)}% confidence`,
      openGraph: {
        title: `Memory from Agent ${memory.agent_id}`,
        description: memory.content.substring(0, 200),
        images: ['/memory-og-image.png'],
        type: 'article',
        publishedTime: memory.createdAt.toISOString(),
        modifiedTime: memory.updatedAt.toISOString(),
      },
      twitter: {
        card: 'summary_large_image',
        title: `Memory: ${memory.content.substring(0, 50)}...`,
        description: memory.content.substring(0, 200),
        images: ['/memory-twitter-image.png'],
      },
      alternates: {
        canonical: `/memories/${memoryId}`,
      },
    };
  }

  /**
   * Generate metadata for agent memories page
   */
  export async function generateAgentMetadata(
    agentId: string
  ): Promise<MetadataResult> {
    const memories = await NextJSDataFetching.getMemoriesByAgent(agentId, 10);
    const memoryCount = memories.length;

    return {
      title: `Agent ${agentId} - ${memoryCount} Memories`,
      description: `View and manage memories for Agent ${agentId}. ${memoryCount} memories stored.`,
      openGraph: {
        title: `Agent ${agentId} Memory Dashboard`,
        description: `Comprehensive memory management for Agent ${agentId}`,
        images: ['/agent-memories-og-image.png'],
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `Agent ${agentId} Memories`,
        description: `${memoryCount} memories stored`,
        images: ['/agent-memories-twitter-image.png'],
      },
      alternates: {
        canonical: `/agents/${agentId}/memories`,
      },
    };
  }
}

// Performance optimization utilities
export namespace NextJSPerformance {
  /**
   * Streaming utilities for large data sets
   */
  export class MemoryStream {
    private memories: MemoryMetadata[] = [];
    private batchSize: number = 10;

    constructor(agentId: string, batchSize: number = 10) {
      this.batchSize = batchSize;
      // In real implementation, would initialize stream from database
    }

    async *getBatch(): AsyncIterableIterator<MemoryMetadata[]> {
      for (let i = 0; i < this.memories.length; i += this.batchSize) {
        yield this.memories.slice(i, i + this.batchSize);
      }
    }

    async *getMemories(): AsyncIterableIterator<MemoryMetadata> {
      for (const memory of this.memories) {
        yield memory;
      }
    }
  }

  /**
   * Prefetch utilities for optimistic loading
   */
  export class MemoryPrefetcher {
    private cache = new Map<string, Promise<any>>();

    prefetchMemory(memoryId: string): Promise<MemoryMetadata | null> {
      if (!this.cache.has(memoryId)) {
        this.cache.set(memoryId, NextJSDataFetching.getMemory(memoryId));
      }
      return this.cache.get(memoryId)!;
    }

    prefetchMemoriesByAgent(agentId: string): Promise<MemoryMetadata[]> {
      const key = `agent:${agentId}`;
      if (!this.cache.has(key)) {
        this.cache.set(key, NextJSDataFetching.getMemoriesByAgent(agentId));
      }
      return this.cache.get(key)!;
    }

    clearCache(): void {
      this.cache.clear();
    }
  }
}

// Export namespaces separately to avoid conflicts
// Commented out to avoid conflicts - use the namespaces directly
// export {
//   NextJSServerActions,
//   NextJSCache,
//   NextJSDataFetching,
//   NextJSRouteHandlers,
//   NextJSMiddleware,
//   NextJSMetadata,
//   NextJSPerformance
// };
