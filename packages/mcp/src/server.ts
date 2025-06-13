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
import { InputValidator, SecurityManager } from '@codai/memorai-core';
import { config } from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import { createConnection } from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// First try to load from workspace-ai directory, then fallback to local
const envPaths = [
  path.resolve(__dirname, '../../../../../workspace-ai/.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.error(`📁 Loaded environment variables from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  config(); // Fallback to default behavior
  console.error('⚠️  No .env file found, using system environment variables');
}

/**
 * CLI Configuration
 */
interface CLIOptions {
  dashboard?: boolean;
  port?: number;
  help?: boolean;
  version?: boolean;
}

/**
 * Parse CLI arguments
 */
function parseCliArguments(): CLIOptions {
  const program = new Command();
  program
    .name('memorai-mcp')
    .description('Enterprise-grade memory management MCP server for AI agents')
    .version('2.0.0')
    .option('--no-dashboard', 'Disable automatic dashboard startup')
    .option('-p, --port <port>', 'Dashboard port (default: 6366)', '6366')
    .option('-h, --help', 'Display help information')
    .helpOption('-h, --help', 'Display help information');

  // Handle help separately to avoid starting the server
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    program.outputHelp();
    process.exit(0);
  }

  program.parse(process.argv);
  const options = program.opts();

  return {
    dashboard: options.dashboard !== false, // Default to true unless --no-dashboard
    port: parseInt(options.port) || 6366,
  };
}

/**
 * Dashboard management for MCP server
 */
const DASHBOARD_PORT = 6366;
const DASHBOARD_LOCKFILE = path.join(process.cwd(), '.memorai-dashboard.lock');

interface DashboardProcess {
  pid: number;
  port: number;
  startTime: number;
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const connection = createConnection({ port, host: 'localhost' }, () => {
      connection.end();
      resolve(false); // Port is in use
    });

    connection.on('error', () => {
      resolve(true); // Port is available
    });
  });
}

/**
 * Check if dashboard is already running
 */
function isDashboardRunning(): DashboardProcess | null {
  try {
    if (fs.existsSync(DASHBOARD_LOCKFILE)) {
      const lockData = JSON.parse(fs.readFileSync(DASHBOARD_LOCKFILE, 'utf8'));

      // Check if process is still alive
      try {
        process.kill(lockData.pid, 0); // Signal 0 to check if process exists
        return lockData;
      } catch {
        // Process doesn't exist, remove stale lockfile
        fs.unlinkSync(DASHBOARD_LOCKFILE);
        return null;
      }
    }
  } catch (error) {
    // Ignore errors, assume not running
  }
  return null;
}

/**
 * Create dashboard lockfile
 */
function createDashboardLock(dashboardProcess: ChildProcess): void {
  const lockData: DashboardProcess = {
    pid: dashboardProcess.pid!,
    port: DASHBOARD_PORT,
    startTime: Date.now()
  };

  fs.writeFileSync(DASHBOARD_LOCKFILE, JSON.stringify(lockData, null, 2));
}

/**
 * Start the web dashboard
 */
async function startDashboard(port?: number): Promise<ChildProcess | null> {
  const dashboardPort = port || DASHBOARD_PORT;

  // Check if dashboard is already running
  const existing = isDashboardRunning();
  if (existing) {
    console.error(`🌐 Dashboard already running on port ${existing.port} (PID: ${existing.pid})`);
    console.error(`📱 Access at: http://localhost:${existing.port}`);
    return null;
  }

  // Check if port is available
  const portAvailable = await isPortAvailable(dashboardPort);
  if (!portAvailable) {
    console.error(`⚠️  Port ${dashboardPort} is in use by another process`);
    console.error(`🔍 Please check what's running on port ${dashboardPort} and stop it`);
    return null;
  }

  // Find dashboard directory
  const dashboardPaths = [
    path.resolve(__dirname, '../../../apps/web-dashboard'),
    path.resolve(__dirname, '../../apps/web-dashboard'),
    path.resolve(process.cwd(), 'apps/web-dashboard'),
    path.resolve(process.cwd(), '../apps/web-dashboard')
  ];

  let dashboardPath: string | null = null;
  for (const testPath of dashboardPaths) {
    if (fs.existsSync(path.join(testPath, 'package.json'))) {
      dashboardPath = testPath;
      break;
    }
  }

  if (!dashboardPath) {
    console.log('⚠️  Dashboard not found. Please ensure the web-dashboard is available.');
    return null;
  }
  console.error('🚀 Starting Memorai Web Dashboard...');
  console.error(`📍 Dashboard path: ${dashboardPath}`);

  // Start dashboard process
  const dashboardProcess = spawn('node', ['src/server.js'], {
    cwd: dashboardPath,
    env: {
      ...process.env,
      WEB_PORT: dashboardPort.toString(),
      NODE_ENV: 'production'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  });

  if (dashboardProcess.pid) {
    createDashboardLock(dashboardProcess);

    // Log dashboard output
    dashboardProcess.stdout?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[Dashboard] ${output}`);
      }
    });

    dashboardProcess.stderr?.on('data', (data: Buffer) => {
      const output = data.toString().trim();
      if (output) {
        console.error(`[Dashboard Error] ${output}`);
      }
    });

    dashboardProcess.on('exit', (code) => {
      console.error(`🛑 Dashboard process exited with code ${code}`);
      try {
        if (fs.existsSync(DASHBOARD_LOCKFILE)) {
          fs.unlinkSync(DASHBOARD_LOCKFILE);
        }
      } catch {
        // Ignore cleanup errors
      }
    });

    // Give dashboard time to start
    setTimeout(() => {
      console.error(`🌐 Dashboard started on port ${dashboardPort}`);
      console.error(`📱 Access at: http://localhost:${dashboardPort}`);
    }, 2000);
  }

  return dashboardProcess;
}

/**
 * Cleanup dashboard on exit
 */
function setupCleanup(dashboardProcess: ChildProcess | null): void {
  const cleanup = () => {
    if (dashboardProcess && !dashboardProcess.killed) {
      console.log('🧹 Cleaning up dashboard process...');
      dashboardProcess.kill('SIGTERM');
    }

    try {
      if (fs.existsSync(DASHBOARD_LOCKFILE)) {
        fs.unlinkSync(DASHBOARD_LOCKFILE);
      }
    } catch {
      // Ignore cleanup errors
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('uncaughtException', cleanup);
}

/**
 * Create and configure the Memorai MCP Server
 */
async function createServer(options: CLIOptions = {}) {
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

  console.error('🧠 Memorai MCP Server starting...');

  // Start dashboard if enabled
  let dashboardProcess: ChildProcess | null = null;
  if (options.dashboard !== false) {
    try {
      dashboardProcess = await startDashboard(options.port);
      setupCleanup(dashboardProcess);
    } catch (error) {
      console.error('⚠️  Failed to start dashboard:', error);
      console.error('🔄 MCP server will continue without dashboard');
    }
  }  // Initialize memory engine with fallback
  let memoryEngine: MemoryEngine | any = null;
  try {
    // First try to initialize with default configuration
    memoryEngine = new MemoryEngine();
    await memoryEngine.initialize();

    console.error('✅ Memorai MCP Server initialized with full functionality');
    console.error('📋 Available tools: remember, recall, forget, context');
    console.error('⚡ Ready to handle MCP requests via stdio');

  } catch (error) {
    console.error('⚠️  Failed to initialize full memory engine:', error);
    console.error('🔄 Falling back to basic in-memory storage...');

    try {      // Create a basic in-memory implementation with correct signatures
      memoryEngine = {
        memories: new Map(), async remember(content: string, tenantId: string, agentId?: string, options: any = {}) {
          const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const memory = {
            id,
            content,
            tenantId,
            agentId,
            timestamp: new Date().toISOString(),
            options
          };
          this.memories.set(id, memory);
          return id;
        }, async recall(query: string, tenantId: string, agentId?: string, options: any = {}) {
          const results = [];
          for (const [id, memory] of this.memories.entries()) {
            if (memory.tenantId === tenantId &&
              (!agentId || memory.agentId === agentId) &&
              (memory.content.toLowerCase().includes(query.toLowerCase()) ||
                query.toLowerCase().includes(memory.content.toLowerCase()))) {
              results.push({
                memory: {
                  id,
                  content: memory.content,
                  type: 'general',
                  confidence: 0.8,
                  createdAt: new Date(memory.timestamp),
                  updatedAt: new Date(memory.timestamp),
                  lastAccessedAt: new Date(),
                  accessCount: 1,
                  importance: 0.5,
                  tags: [],
                  tenant_id: memory.tenantId,
                  agent_id: memory.agentId
                },
                score: 0.8,
                relevance_reason: 'Content match in basic memory engine'
              });
            }
          }
          return results.slice(0, options.limit || 10);
        },
        async forget(memoryId: string, tenantId: string) {
          const deleted = this.memories.delete(memoryId);
          return deleted ? 1 : 0;
        }, async getContext(tenantId: string, contextSize: number = 15) {
          const memories = Array.from(this.memories.values())
            .filter((m: any) => m.tenantId === tenantId)
            .slice(-contextSize);
          return {
            memories: memories.map((m: any) => ({
              content: m.content,
              timestamp: m.timestamp,
              agentId: m.agentId
            })),
            totalCount: this.memories.size
          };
        }
      };

      console.error('✅ Basic memory engine initialized successfully');
      console.error('📋 Available tools: remember, recall, forget, context (basic mode)');
      console.error('⚡ Ready to handle MCP requests via stdio');
    } catch (mockError) {
      console.error('❌ Failed to initialize basic memory engine:', mockError);
      console.error('🔄 Server will start with very limited functionality');
      memoryEngine = null;
    }
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
    const { name, arguments: args } = request.params;

    // Validate that args is an object
    if (!args || typeof args !== 'object') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Invalid arguments: must be an object',
              success: false
            })
          }
        ]
      };
    } if (!memoryEngine) {
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
      switch (name) {
        case 'remember': {
          // Validate input
          const validation = InputValidator.validate(args, [
            { field: 'agentId', type: 'string', required: true, minLength: 1, maxLength: 255 },
            { field: 'content', type: 'string', required: true, minLength: 1, maxLength: 10000 },
            { field: 'metadata', type: 'object', required: false }
          ]);

          if (!validation.isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Validation failed: ' + validation.errors.join(', '),
                    success: false
                  })
                }
              ]
            };
          }          // Sanitize content
          const contentValidation = InputValidator.validateMemoryContent(args.content as string);
          if (!contentValidation.isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Content validation failed: ' + contentValidation.errors.join(', '),
                    success: false
                  })
                }
              ]
            };
          }

          const { agentId, metadata } = args as any;
          const sanitizedContent = contentValidation.sanitizedContent;
          const memoryId = await memoryEngine.remember(sanitizedContent, agentId, agentId, metadata);
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
        } case 'recall': {
          // Validate input
          const validation = InputValidator.validate(args, [
            { field: 'agentId', type: 'string', required: true, minLength: 1, maxLength: 255 },
            { field: 'query', type: 'string', required: true, minLength: 1, maxLength: 1000 },
            { field: 'limit', type: 'number', required: false, customValidator: (val) => !val || (typeof val === 'number' && val >= 1 && val <= 100) }
          ]);

          if (!validation.isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Validation failed: ' + validation.errors.join(', '),
                    success: false
                  })
                }
              ]
            };
          }

          // Sanitize query
          const sanitizedQuery = InputValidator.sanitizeString(args.query as string);
          if (!sanitizedQuery) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Invalid query: query cannot be empty after sanitization',
                    success: false
                  })
                }
              ]
            };
          }

          const { agentId, limit = 10 } = args as any;
          const results = await memoryEngine.recall(sanitizedQuery, agentId, agentId, { limit });
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
        } case 'forget': {
          // Validate input
          const validation = InputValidator.validate(args, [
            { field: 'agentId', type: 'string', required: true, minLength: 1, maxLength: 255 },
            { field: 'memoryId', type: 'string', required: true, minLength: 1, maxLength: 255 }
          ]);

          if (!validation.isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Validation failed: ' + validation.errors.join(', '),
                    success: false
                  })
                }
              ]
            };
          }

          const { agentId, memoryId } = args as any;
          const count = await memoryEngine.forget('user', memoryId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Forgotten memory successfully`
                })
              }
            ]
          };
        } case 'context': {
          // Validate input
          const validation = InputValidator.validate(args, [
            { field: 'agentId', type: 'string', required: true, minLength: 1, maxLength: 255 },
            { field: 'contextSize', type: 'number', required: false, customValidator: (val) => !val || (typeof val === 'number' && val >= 1 && val <= 50) }
          ]);

          if (!validation.isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'Validation failed: ' + validation.errors.join(', '),
                    success: false
                  })
                }
              ]
            };
          }

          const { agentId, contextSize = 5 } = args as any;
          let contextResponse;

          if (typeof memoryEngine.context === 'function') {
            // Full MemoryEngine
            contextResponse = await memoryEngine.context({
              tenant_id: agentId,
              agent_id: agentId,
              max_memories: contextSize
            });
          } else if (typeof memoryEngine.getContext === 'function') {
            // Basic memory engine
            contextResponse = await memoryEngine.getContext(agentId, contextSize);
          } else {
            throw new Error('Context function not available');
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  context: contextResponse.context || contextResponse.summary,
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
    // Parse CLI arguments first
    const cliOptions = parseCliArguments();

    console.error('🚀 Starting Memorai MCP Server...');
    const server = await createServer(cliOptions);
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
