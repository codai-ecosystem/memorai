#!/usr/bin/env node

/**
 * ENTERPRISE-GRADE MCP SERVER - Advanced Multi-Tier Implementation
 * Uses UnifiedMemoryEngine and PerformanceMonitor for production-ready performance
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { UnifiedMemoryEngine, type UnifiedMemoryConfig } from '@codai/memorai-core';
import { PerformanceMonitor } from '@codai/memorai-core';

// Enterprise-grade configuration
const memoryConfig: UnifiedMemoryConfig = {
  enableFallback: true,
  autoDetect: true,
  preferredTier: undefined, // Auto-detect best tier
  
  // Azure OpenAI configuration (if available)
  azureOpenAI: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'text-embedding-ada-002',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2023-05-15'
  },
  
  // OpenAI configuration (if available) 
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'text-embedding-ada-002',
  
  // Local embedding fallback
  localEmbedding: {
    model: 'all-MiniLM-L6-v2',
    cachePath: './embeddings-cache'
  },
  
  // Mock configuration for testing
  mock: {
    simulateDelay: false,
    delayMs: 0,
    failureRate: 0
  }
};

class EnterpriseMemoryEngine {
  private unifiedEngine: UnifiedMemoryEngine;
  private performanceMonitor: PerformanceMonitor;
  private initialized = false;

  constructor() {
    this.unifiedEngine = new UnifiedMemoryEngine(memoryConfig);
    this.performanceMonitor = new PerformanceMonitor(60000, 1000); // 1 minute window, 1000 queries max
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.unifiedEngine.initialize();
    this.initialized = true;
    
    console.error('🚀 Enterprise Memory Engine initialized successfully');
    console.error('📊 Performance monitoring enabled');
  }

  async remember(agentId: string, content: string, metadata: any = {}): Promise<{ id: string }> {
    const start = performance.now();
    
    try {
      const memoryId = await this.unifiedEngine.remember(
        content,
        'default-tenant', // Use default tenant for MCP
        agentId,
        {
          type: metadata.type || 'general',
          importance: metadata.importance || 0.5,
          tags: metadata.tags || [],
          context: metadata
        }
      );
      
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'remember',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: true,
        tenantId: 'default-tenant',
        agentId,
        resultCount: 1,
        cacheHit: false
      });
      
      return { id: memoryId };
    } catch (error) {
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'remember',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: 'default-tenant',
        agentId
      });
      throw error;
    }
  }

  async recall(agentId: string, query: string, limit = 10): Promise<any[]> {
    const start = performance.now();
    
    try {
      const results = await this.unifiedEngine.recall(
        query,
        'default-tenant',
        agentId,
        {
          limit,
          threshold: 0.1,
          include_context: true,
          time_decay: true
        }
      );
      
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'recall',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: true,
        tenantId: 'default-tenant',
        agentId,
        resultCount: results.length,
        cacheHit: false // UnifiedEngine handles its own caching
      });
        return results.map(result => ({
        id: result.memory.id,
        content: result.memory.content,
        relevance: result.score,
        metadata: {
          type: result.memory.type,
          importance: result.memory.importance,
          tags: result.memory.tags,
          context: result.memory.context,
          emotional_weight: result.memory.emotional_weight
        },
        timestamp: result.memory.createdAt
      }));
    } catch (error) {
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'recall',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: 'default-tenant',
        agentId
      });
      throw error;
    }
  }

  async context(agentId: string, size = 5): Promise<any> {
    const start = performance.now();
    
    try {      const contextData = await this.unifiedEngine.getContext({
        tenant_id: 'default-tenant',
        agent_id: agentId,
        max_memories: size
      });
      
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'context',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: true,
        tenantId: 'default-tenant',
        agentId,
        resultCount: contextData.memories?.length || 0,
        cacheHit: false
      });
      
      return {
        context: contextData.summary || `Context for ${agentId}`,
        memories: contextData.memories || [],
        summary: contextData.summary || 'No context available',
        windowSize: size,
        totalMemories: contextData.total_count || 0
      };
    } catch (error) {
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'context',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: 'default-tenant',
        agentId
      });
      throw error;
    }
  }

  async forget(agentId: string, memoryId: string): Promise<boolean> {
    const start = performance.now();
    
    try {
      await this.unifiedEngine.forget(memoryId);
      
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'forget',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: true,
        tenantId: 'default-tenant',
        agentId,
        resultCount: 1,
        cacheHit: false
      });
      
      return true;
    } catch (error) {
      const end = performance.now();
      this.performanceMonitor.recordQuery({
        operation: 'forget',
        startTime: start,
        endTime: end,
        duration: end - start,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tenantId: 'default-tenant',
        agentId
      });
      return false;
    }
  }

  getMetrics(): any {
    return this.performanceMonitor.getMetrics();
  }

  getTierInfo(): any {
    return this.unifiedEngine.getTierInfo();
  }
}

const enterpriseEngine = new EnterpriseMemoryEngine();

const server = new Server(
  {
    name: "memorai-enterprise",
    version: "2.0.3",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Advanced tool handlers with real performance tracking
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "remember",
        description: "Store information in memory with enterprise-grade performance tracking",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Unique agent identifier" },
            content: { type: "string", description: "Information to remember" },
            metadata: { type: "object", description: "Optional metadata with type, importance, tags" }
          },
          required: ["agentId", "content"]
        }
      },
      {
        name: "recall",
        description: "Search memories with unified multi-tier engine and performance optimization",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Unique agent identifier" },
            query: { type: "string", description: "Search query" },
            limit: { type: "number", description: "Max results", default: 10 }
          },
          required: ["agentId", "query"]
        }
      },
      {
        name: "context",
        description: "Get contextual memory summary with enterprise analytics",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Unique agent identifier" },
            contextSize: { type: "number", description: "Context window size", default: 5 }
          },
          required: ["agentId"]
        }
      },
      {
        name: "forget",
        description: "Remove specific memory with performance tracking",
        inputSchema: {
          type: "object",
          properties: {
            agentId: { type: "string", description: "Unique agent identifier" },
            memoryId: { type: "string", description: "Memory ID to forget" }
          },
          required: ["agentId", "memoryId"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = performance.now();
  
  try {
    const { name, arguments: args } = request.params;
    
    if (!args) {
      throw new Error('Missing arguments');
    }
    
    const agentId = args.agentId as string;
    
    if (!agentId) {
      throw new Error('Missing agentId');
    }
    
    switch (name) {
      case "remember":
        const result = await enterpriseEngine.remember(agentId, args.content as string, args.metadata);
        const metrics = enterpriseEngine.getMetrics();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              memoryId: result.id,
              tierInfo: enterpriseEngine.getTierInfo(),
              performance: {
                responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
                metrics: {
                  avgQueryTime: `${metrics.avgQueryTime.toFixed(2)}ms`,
                  queryCount: metrics.queryCount,
                  successRate: `${(metrics.querySuccessRate * 100).toFixed(1)}%`,
                  cacheHitRate: `${(metrics.cacheHitRate * 100).toFixed(1)}%`,
                  memoryUsage: `${metrics.memoryUsage.toFixed(1)}MB`
                }
              }
            })
          }]
        };
        
      case "recall":
        const memories = await enterpriseEngine.recall(agentId, args.query as string, args.limit as number);
        const recallMetrics = enterpriseEngine.getMetrics();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              memories,
              tierInfo: enterpriseEngine.getTierInfo(),
              performance: {
                responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
                metrics: {
                  avgQueryTime: `${recallMetrics.avgQueryTime.toFixed(2)}ms`,
                  queryCount: recallMetrics.queryCount,
                  successRate: `${(recallMetrics.querySuccessRate * 100).toFixed(1)}%`,
                  cacheHitRate: `${(recallMetrics.cacheHitRate * 100).toFixed(1)}%`,
                  memoryUsage: `${recallMetrics.memoryUsage.toFixed(1)}MB`
                }
              }
            })
          }]
        };
        
      case "context":
        const context = await enterpriseEngine.context(agentId, args.contextSize as number);
        const contextMetrics = enterpriseEngine.getMetrics();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              ...context,
              tierInfo: enterpriseEngine.getTierInfo(),
              performance: {
                responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
                metrics: {
                  avgQueryTime: `${contextMetrics.avgQueryTime.toFixed(2)}ms`,
                  queryCount: contextMetrics.queryCount,
                  successRate: `${(contextMetrics.querySuccessRate * 100).toFixed(1)}%`,
                  cacheHitRate: `${(contextMetrics.cacheHitRate * 100).toFixed(1)}%`,
                  memoryUsage: `${contextMetrics.memoryUsage.toFixed(1)}MB`
                }
              }
            })
          }]
        };
        
      case "forget":
        const forgotten = await enterpriseEngine.forget(agentId, args.memoryId as string);
        const forgetMetrics = enterpriseEngine.getMetrics();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: forgotten,
              tierInfo: enterpriseEngine.getTierInfo(),
              performance: {
                responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
                metrics: {
                  avgQueryTime: `${forgetMetrics.avgQueryTime.toFixed(2)}ms`,
                  queryCount: forgetMetrics.queryCount,
                  successRate: `${(forgetMetrics.querySuccessRate * 100).toFixed(1)}%`,
                  cacheHitRate: `${(forgetMetrics.cacheHitRate * 100).toFixed(1)}%`,
                  memoryUsage: `${forgetMetrics.memoryUsage.toFixed(1)}MB`
                }
              }
            })
          }]
        };
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text', 
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          performance: {
            responseTime: `${(performance.now() - startTime).toFixed(2)}ms`,
            tierInfo: enterpriseEngine.getTierInfo()
          }
        })
      }]
    };
  }
});

// Start enterprise server
async function main() {
  try {
    await enterpriseEngine.initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('🚀 ENTERPRISE MCP SERVER - Multi-Tier Architecture');
    console.error('📊 Tier Info:', enterpriseEngine.getTierInfo());
    console.error('⚡ Performance monitoring enabled');
  } catch (error) {
    console.error('❌ Enterprise server failed to start:', error);
    process.exit(1);
  }
}

// Auto-start server
main().catch((error) => {
  console.error('❌ Server failed:', error);
  process.exit(1);
});

export default server;