#!/usr/bin/env node

/**
 * Memorai MCP Server
 * Enterprise-grade memory management for AI agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryEngine } from '@codai/memorai-core';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Create and configure the Memorai MCP Server
 */
async function createServer() {
  const server = new Server(
    {
      name: 'memorai-mcp',
      version: '1.0.4',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  // Initialize memory engine
  let memoryEngine: MemoryEngine | null = null;
  try {
    // Check for required environment variables
    if (!process.env.MEMORAI_OPENAI_API_KEY) {
      console.error('⚠️  MEMORAI_OPENAI_API_KEY not set - memory operations will be disabled');
      console.error('💡 Set environment variables or use .env file for full functionality');
    } else {
      memoryEngine = new MemoryEngine({
        vector_db: {
          url: process.env.MEMORAI_QDRANT_URL || 'http://localhost:6333',
          api_key: process.env.MEMORAI_QDRANT_API_KEY,
          collection: 'memorai_mcp',
          dimension: 1536
        },
        redis: {
          url: process.env.MEMORAI_REDIS_URL || 'redis://localhost:6379',
          password: process.env.MEMORAI_REDIS_PASSWORD,
          db: 0
        },
        embedding: {
          provider: 'openai',
          model: 'text-embedding-3-small',
          api_key: process.env.MEMORAI_OPENAI_API_KEY
        },
        performance: {
          max_query_time_ms: 100,
          cache_ttl_seconds: 300,
          batch_size: 100
        },
        security: {
          encryption_key: process.env.MEMORAI_ENCRYPTION_KEY || 'memorai-default-key-32-chars-long-1234',
          tenant_isolation: true,
          audit_logs: true
        }
      });

      await memoryEngine.initialize();
      console.error('✅ Memory engine initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize memory engine:', error);
    console.error('⚠️  Server will continue but memory operations will return configuration errors');
    // Continue with null engine - tools will return appropriate errors
  }

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'remember',
          description: 'Store information in memory with optional metadata',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'Unique identifier for the agent'
              },
              content: {
                type: 'string',
                description: 'Information to remember'
              },
              metadata: {
                type: 'object',
                description: 'Optional metadata for the memory'
              }
            },
            required: ['agentId', 'content']
          }
        },
        {
          name: 'recall',
          description: 'Search and retrieve relevant memories',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'Unique identifier for the agent'
              },
              query: {
                type: 'string',
                description: 'Search query for memories'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return'
              }
            },
            required: ['agentId', 'query']
          }
        },
        {
          name: 'forget',
          description: 'Remove specific memories',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'Unique identifier for the agent'
              },
              memoryId: {
                type: 'string',
                description: 'ID of the memory to forget'
              }
            },
            required: ['agentId', 'memoryId']
          }
        },
        {
          name: 'context',
          description: 'Get contextual memory summary for the agent',
          inputSchema: {
            type: 'object',
            properties: {
              agentId: {
                type: 'string',
                description: 'Unique identifier for the agent'
              },
              contextSize: {
                type: 'number',
                description: 'Number of recent memories to include'
              }
            },
            required: ['agentId']
          }
        }
      ]
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;    if (!memoryEngine) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Memory engine not initialized. Please check that MEMORAI_OPENAI_API_KEY and other required environment variables are set.',
              success: false,
              help: 'See https://github.com/dragoscv/memorai-mcp#configuration for setup instructions'
            })
          }
        ]
      };
    }

    try {
      switch (name) {        case 'remember': {
          const { agentId, content, metadata } = args as any;
          const memoryId = await memoryEngine.remember(content, agentId, agentId, metadata);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  memoryId: memoryId,
                  message: 'Memory stored successfully'
                })
              }
            ]
          };
        }        case 'recall': {
          const { agentId, query, limit = 10 } = args as any;
          const results = await memoryEngine.recall(query, agentId, agentId, { limit });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  memories: results,
                  count: results.length
                })
              }
            ]
          };
        }        case 'forget': {
          const { agentId, memoryId } = args as any;
          const count = await memoryEngine.forget(memoryId, agentId, agentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Forgotten ${count} memories successfully`
                })
              }
            ]
          };
        }        case 'context': {
          const { agentId, contextSize = 5 } = args as any;
          const contextResponse = await memoryEngine.context({
            tenant_id: agentId,
            agent_id: agentId,
            max_memories: contextSize
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  context: contextResponse.context,
                  memories: contextResponse.memories,
                  summary: contextResponse.summary
                })
              }
            ]
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Unknown tool: ${name}`,
                  success: false
                })
              }
            ]
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
              success: false
            })
          }
        ]
      };
    }
  });

  return server;
}

/**
 * Main function to start the MCP server
 */
async function main() {
  try {
    console.error('🚀 Starting Memorai MCP Server...');
    const server = await createServer();
    console.error('📡 Server created, connecting to stdio transport...');
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Log to stderr so it doesn't interfere with MCP protocol
    console.error('🧠 Memorai MCP Server started successfully');
    console.error('📋 Available tools: remember, recall, forget, context');
    console.error('⚡ Ready to handle MCP requests via stdio');
  } catch (error) {
    console.error('❌ Failed to start Memorai MCP Server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
