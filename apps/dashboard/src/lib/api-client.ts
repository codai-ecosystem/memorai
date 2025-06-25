/**
 * API Client for Memorai Dashboard
 * Handles HTTP requests to the Memorai MCP server and backend APIs
 */

import { Memory, Config } from '../stores/types';

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface StatsData {
  totalMemories: number;
  activeAgents: number;
  memoryOperations: number;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    agent: string;
    content: string;
  }>;
  memoryDistribution: Array<{
    type: string;
    count: number;
  }>;
  performanceMetrics: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new APIError(
          `Request failed: ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      const responseData = await response.json();

      // If the server already returns {data, success} format, use it directly
      if (
        responseData &&
        typeof responseData === 'object' &&
        'success' in responseData
      ) {
        return responseData;
      }

      // Otherwise, wrap the data
      return { data: responseData, success: true };
    } catch (_error) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  // Memory Operations
  async createMemory(
    agentId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<Memory>> {
    return this.request<Memory>('/memory/remember', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        content,
        metadata: metadata || {},
      }),
    });
  }

  async searchMemories(
    agentId: string,
    query: string,
    limit = 10
  ): Promise<ApiResponse<Memory[]>> {
    return this.request<Memory[]>('/memory/recall', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        query,
        limit,
      }),
    });
  }

  async deleteMemory(
    agentId: string,
    memoryId: string
  ): Promise<ApiResponse<boolean>> {
    return this.request<boolean>('/memory/forget', {
      method: 'DELETE',
      body: JSON.stringify({
        agentId,
        memoryId,
      }),
    });
  }

  async getMemoryContext(
    agentId: string,
    contextSize = 10
  ): Promise<ApiResponse<Memory[]>> {
    return this.request<Memory[]>('/memory/context', {
      method: 'POST',
      body: JSON.stringify({
        agentId,
        contextSize,
      }),
    });
  }

  // Configuration
  async getConfig(): Promise<ApiResponse<Config>> {
    return this.request<Config>('/config');
  }

  async updateConfig(config: Partial<Config>): Promise<ApiResponse<Config>> {
    return this.request<Config>('/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  // Statistics
  async getStats(): Promise<ApiResponse<StatsData>> {
    return this.request<StatsData>('/stats');
  }

  // Health Check
  async healthCheck(): Promise<
    ApiResponse<{ status: string; timestamp: string }>
  > {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // Export/Import
  async exportMemories(agentId: string): Promise<ApiResponse<Memory[]>> {
    return this.request<Memory[]>(`/memory/export/${agentId}`);
  }

  async importMemories(
    agentId: string,
    memories: Memory[]
  ): Promise<ApiResponse<{ imported: number; failed: number }>> {
    return this.request<{ imported: number; failed: number }>(
      '/memory/import',
      {
        method: 'POST',
        body: JSON.stringify({
          agentId,
          memories,
        }),
      }
    );
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Utility functions for common operations
export const memoryApi = {
  create: (
    agentId: string,
    content: string,
    metadata?: Record<string, unknown>
  ) => apiClient.createMemory(agentId, content, metadata),
  search: (agentId: string, query: string, limit?: number) =>
    apiClient.searchMemories(agentId, query, limit),
  delete: (agentId: string, memoryId: string) =>
    apiClient.deleteMemory(agentId, memoryId),
  context: (agentId: string, contextSize?: number) =>
    apiClient.getMemoryContext(agentId, contextSize),
  export: (agentId: string) => apiClient.exportMemories(agentId),
  import: (agentId: string, memories: Memory[]) =>
    apiClient.importMemories(agentId, memories),
};

export const configApi = {
  get: () => apiClient.getConfig(),
  update: (config: Partial<Config>) => apiClient.updateConfig(config),
};

export const statsApi = {
  get: () => apiClient.getStats(),
};

export default apiClient;
