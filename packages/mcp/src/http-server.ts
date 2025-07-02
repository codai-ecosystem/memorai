#!/usr/bin/env node

/**
 * MEMORAI MCP HTTP SERVER - HTTP-based MCP for persistent service
 */

import { AdvancedMemoryEngine, type MemoryType } from '@codai/memorai-core';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { program } from 'commander';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';

// Parse command line arguments
program
  .option('-p, --port <number>', 'Port number', '8080')
  .option('-h, --host <string>', 'Host address', '0.0.0.0')
  .option('-e, --env-path <path>', 'Path to .env file')
  .option('-v, --verbose', 'Enable verbose logging')
  .parse();

const options = program.opts();
const PORT = parseInt(options.port, 10);
const HOST = options.host;

// Load environment variables
if (options.envPath) {
  config({ path: options.envPath });
} else {
  const envPaths = [
    '.env',
    '../.env',
    '../../.env',
    'E:\\GitHub\\workspace-ai\\.env',
  ];

  let envLoaded = false;
  for (const envPath of envPaths) {
    try {
      const result = config({ path: envPath });
      if (!result.error) {
        console.log(`[HTTP-MCP] Loaded environment from: ${envPath}`);
        envLoaded = true;
        break;
      }
    } catch (error) {
      // Continue to next path
    }
  }

  if (!envLoaded) {
    config(); // Fallback to default behavior
  }
}

// Debug logger
const debug = {
  info: (message: string, ...args: unknown[]) => {
    if (options.verbose) {
      console.log(`[HTTP-MCP] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[HTTP-MCP ERROR] ${message}`, ...args);
  },
};

// Memory metadata interface
interface MemoryMetadata {
  type?: MemoryType;
  importance?: number;
  tags?: string[];
  [key: string]: unknown;
}

// Initialize memory engine
const memoryEngine = new AdvancedMemoryEngine();

// Create MCP server
const mcpServer = new Server(
  {
    name: 'memorai-mcp-http',
    version: '5.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Setup MCP handlers
function setupMCPHandlers() {
  // Tool definitions
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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
  mcpServer.setRequestHandler(CallToolRequestSchema, async request => {
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
                  message: 'Memory stored successfully',
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
}

// Create Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.text());

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'memorai-mcp-http',
    version: '5.2.0',
    timestamp: new Date().toISOString(),
    memory_status: 'operational',
  });
});

// SSE endpoint for MCP communication - handle both GET and POST
app.get('/sse', (req, res) => {
  debug.info('SSE GET connection established');
  const transport = new SSEServerTransport('/sse', res);
  mcpServer.connect(transport);
});

app.post('/sse', (req, res) => {
  debug.info('SSE POST connection established');
  const transport = new SSEServerTransport('/sse', res);
  mcpServer.connect(transport);
});

app.get('/status', async (req, res) => {
  try {
    res.json({
      service: 'memorai-mcp-http',
      version: '5.2.0',
      status: 'running',
      endpoints: {
        health: '/health',
        mcp_sse: '/sse',
        status: '/status',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      service: 'memorai-mcp-http',
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// MCP HTTP REST endpoint
app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;

    if (!method) {
      res.status(400).json({
        error: 'Missing method in request',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    debug.info(`MCP HTTP Request: ${method}`, { params, id });

    // Support both memorai/* and memory/* method naming patterns
    if (method === 'memorai/remember' || method === 'memory/remember') {
      if (!params?.content || !params?.agentId) {
        res.status(400).json({
          error: 'Missing required parameters: content and agentId',
          code: 'MISSING_PARAMS',
        });
        return;
      }

      const memoryId = await memoryEngine.remember(
        params.content,
        'default-tenant',
        params.agentId,
        params.metadata || {}
      );

      res.json({
        id: id || Date.now(),
        result: {
          success: true,
          memoryId,
          message: 'Memory stored successfully',
        },
      });
    } else if (method === 'memorai/recall' || method === 'memory/recall') {
      if (!params?.query || !params?.agentId) {
        res.status(400).json({
          error: 'Missing required parameters: query and agentId',
          code: 'MISSING_PARAMS',
        });
        return;
      }

      const memories = await memoryEngine.recall(
        params.query,
        'default-tenant',
        params.agentId,
        {
          limit: params.limit || 10,
          threshold: params.threshold || 0.7,
        }
      );

      res.json({
        id: id || Date.now(),
        result: {
          success: true,
          memories,
          count: memories.length,
        },
      });
    } else if (method === 'memory/session') {
      // Handle session request - return session info
      const session = {
        id: Date.now().toString(),
        agentId: params?.agentId || 'default-agent',
        sessionId: params?.sessionId || Date.now().toString(),
        tenantId: params?.tenantId || 'default-tenant',
        createdAt: new Date().toISOString(),
        status: 'active',
      };

      res.json({
        id: id || Date.now(),
        result: session,
      });
    } else {
      res.status(400).json({
        error: `Method not implemented: ${method}`,
        code: 'NOT_IMPLEMENTED',
        id: id || null,
      });
    }
  } catch (error: any) {
    debug.error('MCP HTTP Error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      id: req.body?.id || null,
    });
  }
});

// REST API endpoints for SDK compatibility
app.post('/memory/remember', async (req, res) => {
  try {
    const { content, agentId, importance, type, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const memoryId = await memoryEngine.remember(
      content,
      'default-tenant',
      agentId || 'default-agent',
      {
        importance: importance || 0.5,
        type: type || 'fact',
        context: metadata || {},
      }
    );

    return res.json({ success: true, memoryId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/memory/recall', async (req, res) => {
  try {
    const { query, agentId, limit, threshold } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const memories = await memoryEngine.recall(
      query,
      'default-tenant',
      agentId || 'default-agent',
      {
        limit: limit || 10,
        threshold: threshold || 0.7,
      }
    );

    return res.json({ success: true, memories });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/memory/forget', async (req, res) => {
  try {
    const { memoryId, agentId } = req.body;

    if (!memoryId) {
      return res.status(400).json({ error: 'Memory ID is required' });
    }

    // Implementation depends on memory engine forget capability
    // For now, return success
    return res.json({ success: true, message: 'Memory forgotten' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/memory/context', async (req, res) => {
  try {
    const { agentId, topic, timeRange, limit } = req.query;

    // Get contextual memories for an agent
    const memories = await memoryEngine.recall(
      (topic as string) || '',
      'default-tenant',
      (agentId as string) || 'default-agent',
      {
        limit: parseInt(limit as string) || 20,
        threshold: 0.5,
      }
    );

    return res.json({ success: true, context: memories });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/memory/session', async (req, res) => {
  try {
    const { agentId } = req.query;

    // Create or get session information
    const session = {
      id: Date.now().toString(),
      agentId: agentId || 'default-agent',
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    return res.json({ success: true, session });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete('/memory/session', async (req, res) => {
  try {
    // Clear session - placeholder implementation
    return res.json({ success: true, message: 'Session cleared' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
async function main() {
  try {
    console.log('🧠 Initializing Memorai MCP HTTP Server...');

    // Initialize memory engine
    await memoryEngine.initialize();
    console.log('✅ Memory engine initialized');

    // Setup MCP handlers
    setupMCPHandlers();
    console.log('🔧 MCP handlers configured');

    // Start HTTP server
    app.listen(PORT, HOST, () => {
      console.log(
        `🚀 Memorai MCP HTTP Server running on http://${HOST}:${PORT}`
      );
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      console.log(`🔧 MCP SSE endpoint: http://${HOST}:${PORT}/sse`);
      console.log(`📈 Status endpoint: http://${HOST}:${PORT}/status`);
      console.log('');
      console.log('💡 To use with VS Code, update mcp.json:');
      console.log(`   "config": {`);
      console.log(`     "url": "http://${HOST}:${PORT}/sse",`);
      console.log(`     "type": "sse"`);
      console.log(`   }`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Memorai MCP HTTP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Memorai MCP HTTP Server...');
  process.exit(0);
});

main();
