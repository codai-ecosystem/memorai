#!/usr/bin/env node

/**
 * MEMORAI MCP SERVER - Simplified Advanced Memory System
 * Direct usage of AdvancedMemoryEngine with no tier complexity
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';

import { AdvancedMemoryEngine, type MemoryType } from '@codai/memorai-core';

// Load environment variables
config();

// Simple debug logger
const debug = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`[MCP] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[MCP ERROR] ${message}`, ...args);
  },
};

// Memory metadata interface
interface MemoryMetadata {
  type?: MemoryType;
  importance?: number;
  tags?: string[];
  [key: string]: unknown;
}

// Initialize the memory engine
debug.info('🧠 Initializing memory engine...');
const memoryEngine = new AdvancedMemoryEngine();

// Create MCP server
const server = new Server(
  {
    name: 'memorai-mcp',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
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
              description: 'Unique agent identifier',
            },
            content: {
              type: 'string',
              description: 'Information to remember',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata with type, importance, tags',
              properties: {
                type: { type: 'string' },
                importance: { type: 'number' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          required: ['agentId', 'content'],
        },
      },
      {
        name: 'recall',
        description: 'Search memories with unified multi-tier engine',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier',
            },
            query: {
              type: 'string',
              description: 'Search query',
            },
            limit: {
              type: 'number',
              description: 'Max results',
              default: 10,
            },
          },
          required: ['agentId', 'query'],
        },
      },
      {
        name: 'forget',
        description: 'Remove specific memory',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier',
            },
            memoryId: {
              type: 'string',
              description: 'Memory ID to forget',
            },
          },
          required: ['agentId', 'memoryId'],
        },
      },
      {
        name: 'context',
        description: 'Get contextual memory summary',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'Unique agent identifier',
            },
            contextSize: {
              type: 'number',
              description: 'Context window size',
              default: 5,
            },
          },
          required: ['agentId'],
        },
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'remember': {
        const {
          agentId,
          content,
          metadata = {},
        } = args as {
          agentId: string;
          content: string;
          metadata?: MemoryMetadata;
        };

        const memoryId = await memoryEngine.remember(
          content,
          'default-tenant',
          agentId,
          {
            type: metadata.type || 'fact',
            importance: metadata.importance || 0.5,
            tags: metadata.tags || [],
            context: metadata,
          }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                memoryId,
                message: `Memory stored successfully`,
              }),
            },
          ],
        };
      }

      case 'recall': {
        const {
          agentId,
          query,
          limit = 10,
        } = args as {
          agentId: string;
          query: string;
          limit?: number;
        };

        const memories = await memoryEngine.recall(
          query,
          'default-tenant',
          agentId,
          { limit }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                memories,
                message: `Found ${memories.length} memories`,
              }),
            },
          ],
        };
      }

      case 'forget': {
        const { agentId, memoryId } = args as {
          agentId: string;
          memoryId: string;
        };

        await memoryEngine.forget(memoryId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: `Memory ${memoryId} removed successfully`,
              }),
            },
          ],
        };
      }

      case 'context': {
        const { agentId, contextSize = 5 } = args as {
          agentId: string;
          contextSize?: number;
        };

        const context = await memoryEngine.getContext({
          tenant_id: 'default-tenant',
          agent_id: agentId,
          max_memories: contextSize,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                context,
                message: `Context retrieved with ${context.memories?.length || 0} recent memories`,
              }),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    debug.error(`Tool ${name} failed:`, error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }),
        },
      ],
      isError: true,
    };
  }
});

// Initialize and start server
async function main() {
  try {
    debug.info('🎯 Starting simplified MCP server...');

    // Initialize memory engine
    await memoryEngine.initialize();
    debug.info('🧠 Memory engine initialized');

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    debug.info('✅ Memorai MCP Server ready!');
    debug.info('🔧 Configuration: Direct AdvancedMemoryEngine (no tiers)');
    debug.info('🎯 Ready to handle memory operations');
  } catch (error) {
    debug.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
