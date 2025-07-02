import type {
  AgentMemory,
  ConnectionOptions,
  ContextOptions,
  RecallOptions,
} from '../types/index.js';

export interface MCPConnectionOptions extends ConnectionOptions {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

export class MCPConnection {
  private connected = false;
  private baseUrl: string;
  private headers: Record<string, string>;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: unknown) => void;
      timeout?: NodeJS.Timeout;
    }
  >();

  constructor(private options: MCPConnectionOptions) {
    this.baseUrl = options.serverUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.apiKey) {
      this.headers['Authorization'] = `Bearer ${options.apiKey}`;
    }
  }

  get serverUrl(): string {
    return this.baseUrl;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get pendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  async connect(): Promise<void> {
    try {
      // Test connection with a simple health check
      const response = await this.makeRequest('GET', '/health');
      if (response.ok) {
        this.connected = true;
      } else {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }
    } catch (error) {
      this.connected = false;
      throw new Error(
        `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  async disconnect(): Promise<void> {
    this.connected = false;
    // Clear all pending requests
    for (const [, request] of this.pendingRequests) {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  updateOptions(newOptions: Partial<MCPConnectionOptions>): void {
    // Note: Cannot change serverUrl after initialization for safety
    if (newOptions.headers) {
      this.headers = {
        ...this.headers,
        ...newOptions.headers,
      };
    }

    if (newOptions.apiKey) {
      this.headers['Authorization'] = `Bearer ${newOptions.apiKey}`;
    }
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      method,
      headers: this.headers,
      ...(this.options.timeout && {
        signal: AbortSignal.timeout(this.options.timeout),
      }),
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    return fetch(url, config);
  }

  async remember(
    agentId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('MCP connection not established');
    }

    try {
      const response = await this.makeRequest('POST', '/memory/remember', {
        agentId,
        content,
        metadata,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to store memory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async recall(
    agentId: string,
    query: string,
    options?: RecallOptions
  ): Promise<AgentMemory[]> {
    if (!this.connected) {
      throw new Error('MCP connection not established');
    }

    try {
      const response = await this.makeRequest('POST', '/memory/recall', {
        agentId,
        query,
        limit: options?.limit || 10,
        threshold: options?.threshold,
        filters: options?.filters,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = (await response.json()) as { memories?: AgentMemory[] };
      return result.memories || [];
    } catch (error) {
      throw new Error(
        `Failed to recall memories: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getContext(
    agentId: string,
    options?: ContextOptions
  ): Promise<AgentMemory[]> {
    if (!this.connected) {
      throw new Error('MCP connection not established');
    }

    try {
      const response = await this.makeRequest('POST', '/memory/context', {
        agentId,
        limit: options?.limit || 5,
        topic: options?.topic,
        timeframe: options?.timeframe,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = (await response.json()) as { memories?: AgentMemory[] };
      return result.memories || [];
    } catch (error) {
      throw new Error(
        `Failed to get context: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async forget(agentId: string, memoryId: string): Promise<void> {
    if (!this.connected) {
      throw new Error('MCP connection not established');
    }

    try {
      const response = await this.makeRequest('POST', '/memory/forget', {
        agentId,
        memoryId,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to forget memory: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  async send(request: {
    jsonrpc: string;
    method: string;
    params?: unknown;
    id?: string | number;
  }): Promise<{
    jsonrpc: string;
    id?: string | number;
    result?: unknown;
    error?: { code: number; message: string };
  }> {
    if (!this.connected) {
      throw new Error('MCP connection not established');
    }

    const requestId = request.id || this.generateId();
    const timeout = this.options.timeout || 10000;

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      // Store the request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutId,
      });

      // Execute the request
      this.executeRequest(request)
        .then(result => {
          const pendingRequest = this.pendingRequests.get(requestId);
          if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(requestId);
            resolve(result);
          }
        })
        .catch(error => {
          const pendingRequest = this.pendingRequests.get(requestId);
          if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(requestId);
            reject(error);
          }
        });
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private async executeRequest(request: {
    jsonrpc: string;
    method: string;
    params?: unknown;
    id?: string | number;
  }): Promise<{
    jsonrpc: string;
    id?: string | number;
    result?: unknown;
    error?: { code: number; message: string };
  }> {
    try {
      // Use the unified MCP endpoint for all JSON-RPC calls
      const response = await this.makeRequest('POST', '/mcp', request);

      if (!response.ok) {
        return {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        };
      }

      const result = (await response.json()) as any;

      // Return JSON-RPC style response
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: result.result,
        error: result.error,
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
