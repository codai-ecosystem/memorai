/**
 * @fileoverview MCP Connection handler for SDK
 */

import type { ConnectionOptions } from '../types/index.js';

/**
 * JSON-RPC request interface
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

/**
 * JSON-RPC response interface
 */
interface JSONRPCResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number;
}

/**
 * MCP Connection class for communicating with Memorai server
 */
export class MCPConnection {
  private options: ConnectionOptions;
  private connected = false;  private pendingRequests = new Map<string | number, {
    resolve: (value: JSONRPCResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  constructor(options: ConnectionOptions) {
    this.options = options;
  }

  /**
   * Connect to the server
   */
  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {      // Test connection with a ping
      const response = await fetch(`${this.options.serverUrl}/health`, {
        method: 'GET',
        headers: this.options.headers || {},
        signal: AbortSignal.timeout(this.options.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.status} ${response.statusText}`);
      }

      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from the server
   */
  public async disconnect(): Promise<void> {
    this.connected = false;
    
    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Send a JSON-RPC request
   */
  public async send(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    if (!this.connected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout after ${this.options.timeout || 30000}ms`));
      }, this.options.timeout || 30000);

      this.pendingRequests.set(request.id, { resolve, reject, timeout });

      this.sendHTTPRequest(request)
        .then(response => {
          const pendingRequest = this.pendingRequests.get(request.id);
          if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(request.id);
            pendingRequest.resolve(response);
          }
        })
        .catch(error => {
          const pendingRequest = this.pendingRequests.get(request.id);
          if (pendingRequest) {
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(request.id);
            pendingRequest.reject(error);
          }
        });
    });
  }

  /**
   * Send HTTP request to server
   */
  private async sendHTTPRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      const response = await fetch(`${this.options.serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.options.timeout || 30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonResponse = await response.json() as JSONRPCResponse;
      
      // Validate JSON-RPC response format
      if (!jsonResponse.jsonrpc || jsonResponse.jsonrpc !== '2.0') {
        throw new Error('Invalid JSON-RPC response format');
      }

      if (jsonResponse.id !== request.id) {
        throw new Error('Response ID does not match request ID');
      }

      return jsonResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Request failed: ${String(error)}`);
    }
  }

  /**
   * Get connection status
   */
  public get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get server URL
   */
  public get serverUrl(): string {
    return this.options.serverUrl;
  }

  /**
   * Get pending request count
   */
  public get pendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Update connection options
   */
  public updateOptions(options: Partial<ConnectionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Test connection without changing state
   */
  public async testConnection(): Promise<boolean> {
    try {      const response = await fetch(`${this.options.serverUrl}/health`, {
        method: 'GET',
        headers: this.options.headers || {},
        signal: AbortSignal.timeout(5000) // 5 second timeout for test
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
