import { test as base, expect } from '@playwright/test';

// Memorai Memory Service Interface
interface MemoryService {
  remember(agentId: string, memory: {
    content: string;
    metadata?: {
      entityType?: string;
      importance?: number;
      tags?: string[];
      [key: string]: any;
    };
  }): Promise<{ id: string; success: boolean }>;
  
  recall(agentId: string, options: {
    query: string;
    limit?: number;
  }): Promise<{
    memories: Array<{
      id: string;
      content: string;
      metadata?: any;
      timestamp: string;
    }>;
  }>;
  
  context(agentId: string, options: {
    contextSize?: number;
  }): Promise<{
    memories: Array<{
      id: string;
      content: string;
      metadata?: any;
      timestamp: string;
    }>;
  }>;
  
  forget(agentId: string, memoryId: string): Promise<{ success: boolean }>;
}

// Memory Service Implementation using fetch
class PlaywrightMemoryService implements MemoryService {
  private baseUrl = 'http://localhost:6367';

  async remember(agentId: string, memory: {
    content: string;
    metadata?: {
      entityType?: string;
      importance?: number;
      tags?: string[];
      [key: string]: any;
    };
  }): Promise<{ id: string; success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          content: memory.content,
          metadata: memory.metadata || {},
        }),
      });
      
      const data = await response.json();
      return {
        id: data.memory || 'test-id',
        success: response.ok && data.success,
      };
    } catch (error) {
      return { id: 'error-id', success: false };
    }
  }

  async recall(agentId: string, options: {
    query: string;
    limit?: number;
  }): Promise<{
    memories: Array<{
      id: string;
      content: string;
      metadata?: any;
      timestamp: string;
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          query: options.query,
          limit: options.limit || 10,
        }),
      });
      
      if (!response.ok) {
        return { memories: [] };
      }
      
      const data = await response.json();
      return {
        memories: data.memories || [],
      };
    } catch (error) {
      return { memories: [] };
    }
  }

  async context(agentId: string, options: {
    contextSize?: number;
  }): Promise<{
    memories: Array<{
      id: string;
      content: string;
      metadata?: any;
      timestamp: string;
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          contextSize: options.contextSize || 10,
        }),
      });
      
      if (!response.ok) {
        return { memories: [] };
      }
      
      const data = await response.json();
      return {
        memories: data.context?.memories || [],
      };
    } catch (error) {
      return { memories: [] };
    }
  }

  async forget(agentId: string, memoryId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/memory/forget`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          memoryId,
        }),
      });
      
      return { success: response.ok };
    } catch (error) {
      return { success: false };
    }
  }
}

// Extend test fixtures
type MemoraiFixtures = {
  memoryService: MemoryService;
};

export const test = base.extend<MemoraiFixtures>({
  memoryService: async ({ }, use) => {
    const service = new PlaywrightMemoryService();
    await use(service);
  },
});

export { expect };
