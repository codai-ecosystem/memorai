/**
 * @fileoverview MCP Protocol handler for Memorai operations
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { 
  MCPRequest, 
  MCPResponse, 
  MemoryRequest, 
  MemoryResponse,
  AuthenticatedRequest,
  MCPErrorCode 
} from '../types/index.js';
import { MemoryEngine } from '@codai/memorai-core';
import { Logger } from '../utils/Logger.js';

/**
 * Handles Model Context Protocol requests for memory operations
 */
export class MCPHandler {
  private memoryEngine: MemoryEngine;
  
  constructor(memoryEngine: MemoryEngine) {
    this.memoryEngine = memoryEngine;
  }
  
  /**
   * Handle MCP request and route to appropriate handler
   */
  public async handleRequest(
    request: AuthenticatedRequest,
    reply: FastifyReply
  ): Promise<void> {    try {
      const mcpRequest = request.body as MCPRequest;
      const requestId = mcpRequest.id;
      
      // Validate MCP request format
      if (!this.isValidMCPRequest(mcpRequest)) {
        await this.sendError(reply, -32600, 'Invalid Request', requestId ?? undefined);
        return;
      }
      
      // Route to appropriate handler
      const response = await this.routeRequest(mcpRequest, request);
      
      // Send successful response
      await reply.send({
        jsonrpc: '2.0',
        result: response,
        id: mcpRequest.id
      } as MCPResponse);
      
    } catch (error) {
      Logger.error('MCP request failed', error);
      await this.sendError(reply, -32603, 'Internal error', (request.body as any)?.id);
    }
  }
  
  /**
   * Route MCP request to appropriate memory operation
   */
  private async routeRequest(
    mcpRequest: MCPRequest,
    request: AuthenticatedRequest
  ): Promise<any> {
    const { method, params } = mcpRequest;
    
    switch (method) {
      case 'memory/remember':
        return this.handleRemember(params, request);
        
      case 'memory/recall':
        return this.handleRecall(params, request);
        
      case 'memory/forget':
        return this.handleForget(params, request);
        
      case 'memory/context':
        return this.handleContext(params, request);
        
      case 'server/health':
        return this.handleHealth();
        
      case 'server/capabilities':
        return this.handleCapabilities();
        
      default:
        throw new Error(`Method not found: ${method}`);
    }
  }
  
  /**
   * Handle memory creation
   */
  private async handleRemember(
    params: any,
    request: AuthenticatedRequest
  ): Promise<MemoryResponse> {
    const { content, context, metadata } = params;
    
    if (!content) {
      throw new Error('Content is required for remember operation');
    }
    
    const { result: memory, processingTime } = await this.withTiming(() => 
      this.memoryEngine.remember(content, {
        userId: request.auth.userId,
        tenantId: request.auth.tenantId,
        ...context
      })
    );
    
    return {
      success: true,
      data: memory,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        processingTime
      }
    };
  }
  
  /**
   * Handle memory retrieval
   */
  private async handleRecall(
    params: any,
    request: AuthenticatedRequest
  ): Promise<MemoryResponse> {
    const { query, limit = 10, threshold = 0.7 } = params;
    
    if (!query) {
      throw new Error('Query is required for recall operation');
    }
    
    const { result: memories, processingTime } = await this.withTiming(() => 
      this.memoryEngine.recall(
      query,
      request.auth.tenantId,
      request.auth.userId,
      {
        limit,
        threshold
      }
    ));
    
    return {
      success: true,
      memories: memories.map(result => result.memory),
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        processingTime
      }
    };
  }
  
  /**
   * Handle memory deletion
   */
  private async handleForget(
    params: any,
    request: AuthenticatedRequest
  ): Promise<MemoryResponse> {
    const { memoryId, query } = params;
    
    if (!memoryId && !query) {
      throw new Error('Either memoryId or query is required for forget operation');
    }
    
    const { result, processingTime } = await this.withTiming(() => 
      this.memoryEngine.forget(
      query || `id:${memoryId}`,
      request.auth.tenantId,
      request.auth.userId
    ));
    
    return {
      success: true,
      data: result,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        processingTime
      }
    };
  }
  
  /**
   * Handle context generation
   */
  private async handleContext(
    params: any,
    request: AuthenticatedRequest
  ): Promise<MemoryResponse> {
    const { topic, timeframe, limit = 50 } = params;
    
    const { result: context, processingTime } = await this.withTiming(() => 
      this.memoryEngine.context({
      topic,
      time_range: timeframe,
      max_memories: limit,
      tenant_id: request.auth.tenantId,
      agent_id: request.auth.userId
    }));
    
    return {
      success: true,
      context,
      metadata: {
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
        processingTime
      }
    };
  }
  
  /**
   * Handle health check
   */
  private async handleHealth(): Promise<any> {
    const health = await this.memoryEngine.getHealth();
    return health;
  }
  
  /**
   * Handle capabilities inquiry
   */
  private async handleCapabilities(): Promise<any> {
    return {
      methods: [
        'memory/remember',
        'memory/recall',
        'memory/forget',
        'memory/context',
        'server/health',
        'server/capabilities'
      ],
      features: [
        'semantic_search',
        'temporal_awareness',
        'context_generation',
        'multi_tenant',
        'encryption',
        'rate_limiting'
      ],
      version: '0.1.0'
    };
  }
  
  /**
   * Validate MCP request format
   */
  private isValidMCPRequest(request: any): request is MCPRequest {
    return (
      request &&
      request.jsonrpc === '2.0' &&
      typeof request.method === 'string'
    );
  }
  
  /**
   * Send error response
   */
  private async sendError(
    reply: FastifyReply,
    code: number,
    message: string,
    id?: string | number
  ): Promise<void> {
    await reply.send({
      jsonrpc: '2.0',
      error: { code, message },
      id: id || null
    } as MCPResponse);
  }
  
  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Utility to measure execution time of async operations
   */
  private async withTiming<T>(operation: () => Promise<T>): Promise<{ result: T; processingTime: number }> {
    const startTime = Date.now();
    const result = await operation();
    const processingTime = Date.now() - startTime;
    return { result, processingTime };
  }
}
