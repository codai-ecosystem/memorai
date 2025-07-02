/**
 * @fileoverview Next.js 15 Advanced Features Implementation (Phase 2.2)
 * Modern Next.js patterns with App Router, Server Components, and React 19
 * Note: This is a blueprint - requires Next.js app context to run
 */

import React, { Suspense } from 'react';
import { MemoryMetadata, MemoryQuery, MemoryResult } from '../types/index.js';
import { createMemoryId, createAgentId, Result, Ok, Err } from '../typescript/TypeScriptAdvanced.js';

// Type definitions for Next.js features (when available)
interface MetadataProps {
  params: { memoryId: string };
}

interface NextRequest {
  url: string;
  headers: Headers;
  json(): Promise<any>;
}

interface NextResponse {
  json(data: any, options?: { status?: number }): Response;
  next(): Response;
}

// Mock Next.js functions for development
const mockCache = <T extends (...args: any[]) => any>(fn: T): T => fn;
const mockUnstableCache = <T extends (...args: any[]) => any>(
  fn: T,
  keys: string[],
  options?: any
): T => fn;
const mockRevalidateTag = (tag: string) => console.log(`Revalidating tag: ${tag}`);
const mockRevalidatePath = (path: string) => console.log(`Revalidating path: ${path}`);
const mockNotFound = () => { throw new Error('Not found'); };

// Use mocks when Next.js is not available
const cache = typeof window !== 'undefined' ? mockCache : mockCache;
const unstable_cache = mockUnstableCache;
const revalidateTag = mockRevalidateTag;
const revalidatePath = mockRevalidatePath;
const notFound = mockNotFound;

// Type-safe Server Actions
export async function createMemoryAction(
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

    // In real implementation, would call the memory service
    const memoryId = createMemoryId(`mem_${Date.now()}`);
    
    // Revalidate memory-related pages
    revalidateTag('memories');
    revalidatePath('/memories');
    revalidatePath(`/agents/${agentId}/memories`);

    return Ok(memoryId);
  } catch (error) {
    return Err(`Failed to create memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function updateMemoryAction(
  memoryId: string,
  updates: Partial<MemoryMetadata>,
  agentId: string
): Promise<Result<boolean, string>> {
  try {
    // In real implementation, would call the memory service
    
    // Revalidate specific memory and related pages
    revalidateTag(`memory:${memoryId}`);
    revalidateTag('memories');
    revalidatePath(`/memories/${memoryId}`);

    return Ok(true);
  } catch (error) {
    return Err(`Failed to update memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteMemoryAction(
  memoryId: string,
  agentId: string
): Promise<Result<boolean, string>> {
  try {
    // In real implementation, would call the memory service
    
    // Revalidate memory lists
    revalidateTag('memories');
    revalidatePath('/memories');
    
    return Ok(true);
  } catch (error) {
    return Err(`Failed to delete memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function searchMemoriesAction(
  query: MemoryQuery
): Promise<Result<MemoryResult[], string>> {
  try {
    // In real implementation, would call the memory service
    const results: MemoryResult[] = [];
    
    return Ok(results);
  } catch (error) {
    return Err(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Cached Data Fetching Functions
export const getMemory = cache(async (memoryId: string): Promise<MemoryMetadata | null> => {
  // This would be cached per request
  try {
    // In real implementation, would call the memory service
    return null;
  } catch (error) {
    console.error('Failed to fetch memory:', error);
    return null;
  }
});

export const getMemoriesByAgent = unstable_cache(
  async (agentId: string, limit: number = 50): Promise<MemoryMetadata[]> => {
    try {
      // In real implementation, would call the memory service
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

export const getMemoryInsights = unstable_cache(
  async (agentId: string): Promise<{ insights: string[]; patterns: any[] }> => {
    try {
      // In real implementation, would call the AI service
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

// Advanced Metadata Generation
export async function generateMetadata(
  { params }: { params: { memoryId: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Fetch memory data
  const memory = await getMemory(params.memoryId);

  if (!memory) {
    return {
      title: 'Memory Not Found',
      description: 'The requested memory could not be found.'
    };
  }

  // Get parent metadata
  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `Memory: ${memory.content.substring(0, 50)}...`,
    description: `Memory created ${memory.createdAt.toLocaleDateString()} with ${memory.confidence * 100}% confidence`,
    openGraph: {
      title: `Memory from Agent ${memory.agent_id}`,
      description: memory.content.substring(0, 200),
      images: ['/memory-og-image.png', ...previousImages],
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
      canonical: `/memories/${params.memoryId}`,
    },
  };
}

// Streaming Components
export async function MemoryStreamingList({ agentId }: { agentId: string }) {
  // This would stream memories as they load
  const memories = await getMemoriesByAgent(agentId);
  
  return (
    <div className="memory-list">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}

export function MemoryCard({ memory }: { memory: MemoryMetadata }) {
  return (
    <div className="memory-card">
      <h3>{memory.content.substring(0, 100)}...</h3>
      <p>Created: {memory.createdAt.toLocaleDateString()}</p>
      <p>Confidence: {(memory.confidence * 100).toFixed(1)}%</p>
      <div className="tags">
        {memory.tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </div>
  );
}

// Error Boundaries and Not Found Pages
export function MemoryNotFound() {
  notFound();
}

export function MemoryError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}

// Route Handlers with Advanced Features
export async function GET(
  request: NextRequest,
  context: { params: { agentId: string } }
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;
    const type = searchParams.get('type');

    // Get memories with pagination
    const memories = await getMemoriesByAgent(context.params.agentId, limit);
    
    // Apply filters if needed
    const filteredMemories = type 
      ? memories.filter(m => m.type === type)
      : memories;

    return NextResponse.json({
      memories: filteredMemories.slice(offset, offset + limit),
      pagination: {
        limit,
        offset,
        total: filteredMemories.length,
        hasMore: offset + limit < filteredMemories.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { agentId, content, importance, metadata } = body;

    if (!agentId || !content) {
      return NextResponse.json(
        { error: 'agentId and content are required' },
        { status: 400 }
      );
    }

    const result = await createMemoryAction(agentId, content, importance, metadata);
    
    if (result.success) {
      return NextResponse.json({ memoryId: result.data }, { status: 201 });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Middleware for Memory Routes
export function memoryMiddleware(request: NextRequest) {
  // Add authentication, rate limiting, etc.
  const agentId = request.headers.get('x-agent-id');
  
  if (!agentId) {
    return NextResponse.json(
      { error: 'Agent ID required' },
      { status: 401 }
    );
  }

  // Add agent ID to the response headers for downstream use
  const response = NextResponse.next();
  response.headers.set('x-agent-id', agentId);
  
  return response;
}

// React 19 Features - Form Actions and Optimistic Updates
'use client';

import { useActionState, useOptimistic, useFormStatus } from 'react';
import { useState, useTransition } from 'react';

export function MemoryForm({ agentId }: { agentId: string }) {
  const [isPending, startTransition] = useTransition();
  const [memories, setMemories] = useState<MemoryMetadata[]>([]);
  const [optimisticMemories, addOptimisticMemory] = useOptimistic(
    memories,
    (state, newMemory: MemoryMetadata) => [...state, newMemory]
  );

  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const content = formData.get('content') as string;
      const importance = Number(formData.get('importance')) || 0.5;

      // Add optimistic update
      const optimisticMemory: MemoryMetadata = {
        id: createMemoryId(`temp_${Date.now()}`),
        content,
        importance: importance as any,
        type: 'fact',
        confidence: 1.0 as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        tags: [],
        metadata: {},
        tenant_id: 'default',
        agent_id: agentId,
        version: 1,
        createdBy: createAgentId(agentId),
        updatedBy: createAgentId(agentId)
      };

      addOptimisticMemory(optimisticMemory);

      // Perform actual creation
      const result = await createMemoryAction(agentId, content, importance);
      
      if (result.success) {
        return { success: true, message: 'Memory created successfully' };
      } else {
        return { success: false, error: result.error };
      }
    },
    { success: false, error: null }
  );

  return (
    <div>
      <form action={formAction}>
        <div>
          <label htmlFor="content">Memory Content:</label>
          <textarea
            id="content"
            name="content"
            required
            rows={4}
            cols={50}
            placeholder="Enter memory content..."
          />
        </div>
        
        <div>
          <label htmlFor="importance">Importance (0-1):</label>
          <input
            id="importance"
            name="importance"
            type="number"
            min="0"
            max="1"
            step="0.1"
            defaultValue="0.5"
          />
        </div>

        <SubmitButton />
      </form>

      {state.error && (
        <div className="error">Error: {state.error}</div>
      )}

      {state.success && (
        <div className="success">Memory created successfully!</div>
      )}

      <div className="memory-list">
        <h3>Memories ({optimisticMemories.length})</h3>
        {optimisticMemories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Creating...' : 'Create Memory'}
    </button>
  );
}

// Advanced Layout with Parallel Routes
export function MemoryLayout({
  children,
  sidebar,
  insights
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  insights: React.ReactNode;
}) {
  return (
    <div className="memory-layout">
      <aside className="sidebar">
        {sidebar}
      </aside>
      
      <main className="main-content">
        {children}
      </main>
      
      <section className="insights-panel">
        {insights}
      </section>
    </div>
  );
}

// Suspense and Streaming
export function MemoryPage({ agentId }: { agentId: string }) {
  return (
    <div>
      <h1>Memories for Agent {agentId}</h1>
      
      <Suspense fallback={<MemoryListSkeleton />}>
        <MemoryStreamingList agentId={agentId} />
      </Suspense>
      
      <Suspense fallback={<InsightsSkeleton />}>
        <MemoryInsights agentId={agentId} />
      </Suspense>
    </div>
  );
}

export function MemoryListSkeleton() {
  return (
    <div className="skeleton">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-title" />
          <div className="skeleton-content" />
          <div className="skeleton-tags" />
        </div>
      ))}
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="insights-skeleton">
      <div className="skeleton-insight" />
      <div className="skeleton-insight" />
      <div className="skeleton-insight" />
    </div>
  );
}

export async function MemoryInsights({ agentId }: { agentId: string }) {
  const insights = await getMemoryInsights(agentId);
  
  return (
    <div className="insights">
      <h3>Memory Insights</h3>
      <ul>
        {insights.insights.map((insight, i) => (
          <li key={i}>{insight}</li>
        ))}
      </ul>
    </div>
  );
}

// Export all components and functions
export {
  createMemoryAction,
  updateMemoryAction,
  deleteMemoryAction,
  searchMemoriesAction,
  getMemory,
  getMemoriesByAgent,
  getMemoryInsights,
  generateMetadata,
  memoryMiddleware
};

export default {
  MemoryForm,
  MemoryLayout,
  MemoryPage,
  MemoryCard,
  MemoryStreamingList,
  MemoryInsights
};
