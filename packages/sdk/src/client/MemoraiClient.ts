/**
 * @fileoverview Main Memorai SDK client for agent-native memory operations
 */

import type {
  ClientOptions,
  MemoryOperation,
  RememberOptions,
  RecallOptions,  ForgetOptions,
  ContextOptions,
  AgentMemory,
  MemorySession
} from '../types/index.js';
import { MCPConnection } from '../connection/MCPConnection.js';
import { SDKConfig } from '../config/SDKConfig.js';
import { MemoryCache } from '../cache/MemoryCache.js';

/**
 * Main client class for interacting with Memorai memory system
 */
export class MemoraiClient {
  private connection: MCPConnection;  private config: SDKConfig;
  private cache: MemoryCache;
  private sessionId: string;
  private agentId: string;
  private tenantId: string | undefined;

  constructor(options: ClientOptions & { agentId: string; sessionId?: string; tenantId?: string }) {
    this.config = new SDKConfig(options);
    this.connection = new MCPConnection(this.config.getConnectionOptions());
    this.cache = new MemoryCache(options.cache || { enabled: false });
    this.sessionId = options.sessionId || this.generateSessionId();
    this.agentId = options.agentId;
    this.tenantId = options.tenantId;
  }

  /**
   * Initialize connection to Memorai server
   */
  public async connect(): Promise<void> {
    await this.connection.connect();
    
    // Initialize session
    await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/initialize',
      params: {
        agentId: this.agentId,
        sessionId: this.sessionId,
        tenantId: this.tenantId
      },
      id: this.generateRequestId()
    });
  }

  /**
   * Disconnect from Memorai server
   */
  public async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Remember information for the agent
   */
  public async remember(
    content: string,
    options: Partial<RememberOptions> = {}
  ): Promise<AgentMemory> {
    const operation: MemoryOperation = {
      operation: 'remember',
      data: {
        content,
        context: options.context,
        metadata: {
          agentId: this.agentId,
          sessionId: this.sessionId,
          tenantId: this.tenantId,
          timestamp: new Date().toISOString(),
          ...options.metadata
        },
        tags: options.tags || [],
        priority: options.priority || 1,
        expires: options.expires
      }
    };

    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/remember',
      params: operation,
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Memory operation failed: ${response.error.message}`);
    }

    const memory = response.result as AgentMemory;
    
    // Cache the memory if caching is enabled
    if (this.config.cacheEnabled) {
      await this.cache.set(memory.id, memory);
    }

    return memory;
  }

  /**
   * Recall memories based on query
   */
  public async recall(
    query: string,
    options: Partial<RecallOptions> = {}
  ): Promise<AgentMemory[]> {    // Check cache first if enabled
    if (this.config.cacheEnabled && options.useCache !== false) {
      const cached = await this.cache.search(query, options.limit);
      if (cached.length > 0) {
        return cached;
      }
    }

    const operation: MemoryOperation = {
      operation: 'recall',
      data: {
        query: options.query || query,
        limit: options.limit || 10,
        threshold: options.threshold || 0.7,
        filters: options.filters,
        context: {
          agentId: this.agentId,
          sessionId: this.sessionId,
          tenantId: this.tenantId,
          ...options.context
        }
      }
    };

    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/recall',
      params: operation,
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Memory operation failed: ${response.error.message}`);
    }

    const memories = response.result as AgentMemory[];
    
    // Cache the results if caching is enabled
    if (this.config.cacheEnabled) {
      for (const memory of memories) {
        await this.cache.set(memory.id, memory);
      }
    }

    return memories;
  }

  /**
   * Forget specific memories
   */
  public async forget(
    options: ForgetOptions
  ): Promise<void> {
    const operation: MemoryOperation = {
      operation: 'forget',
      data: {
        memoryId: options.memoryId,
        query: options.query,
        filters: options.filters,
        confirmDeletion: options.confirmDeletion || false,
        context: {
          agentId: this.agentId,
          sessionId: this.sessionId,
          tenantId: this.tenantId
        }
      }
    };

    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/forget',
      params: operation,
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Memory operation failed: ${response.error.message}`);
    }

    // Remove from cache if caching is enabled and we have a specific memory ID
    if (this.config.cacheEnabled && options.memoryId) {
      await this.cache.delete(options.memoryId);
    }
  }

  /**
   * Get contextual information for current conversation
   */
  public async getContext(
    options: ContextOptions = {}
  ): Promise<AgentMemory[]> {
    const operation: MemoryOperation = {
      operation: 'context',
      data: {
        topic: options.topic,
        timeframe: options.timeframe,
        limit: options.limit || 5,
        includeMemories: options.includeMemories !== false,
        summaryType: options.summaryType || 'brief',
        context: {
          agentId: this.agentId,
          sessionId: this.sessionId,
          tenantId: this.tenantId
        }
      }
    };

    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/context',
      params: operation,
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Memory operation failed: ${response.error.message}`);
    }

    return response.result as AgentMemory[];
  }

  /**
   * Get current memory session information
   */
  public async getSession(): Promise<MemorySession> {
    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/session',
      params: {
        agentId: this.agentId,
        sessionId: this.sessionId,
        tenantId: this.tenantId
      },
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Failed to get session: ${response.error.message}`);
    }

    return response.result as MemorySession;
  }

  /**
   * Clear all memories for current session
   */
  public async clearSession(): Promise<void> {
    await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/clear-session',
      params: {
        agentId: this.agentId,
        sessionId: this.sessionId,
        tenantId: this.tenantId
      },
      id: this.generateRequestId()
    });

    // Clear cache as well
    if (this.config.cacheEnabled) {
      await this.cache.clear();
    }
  }

  /**
   * Get memory statistics for the agent
   */
  public async getStats(): Promise<{
    totalMemories: number;
    memoryTypes: Record<string, number>;
    memorySize: number;
    sessionMemories: number;
  }> {
    const response = await this.connection.send({
      jsonrpc: '2.0',
      method: 'memory/stats',
      params: {
        agentId: this.agentId,
        sessionId: this.sessionId,
        tenantId: this.tenantId
      },
      id: this.generateRequestId()
    });

    if (response.error) {
      throw new Error(`Failed to get stats: ${response.error.message}`);
    }

    return response.result as {
      totalMemories: number;
      memoryTypes: Record<string, number>;
      memorySize: number;
      sessionMemories: number;
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get connection status
   */  public get isConnected(): boolean {
    return this.connection.isConnected;
  }

  /**
   * Get current agent ID
   */
  public get currentAgentId(): string {
    return this.agentId;
  }

  /**
   * Get current session ID
   */
  public get currentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current tenant ID
   */
  public get currentTenantId(): string | undefined {
    return this.tenantId;
  }
}
