#!/usr/bin/env node

/**
 * Simple Memorai MCP Server - Minimal working version
 * This is a simplified version that works around dependency issues
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Simple in-memory storage for demonstration
interface MemoryEntry {
  id: string;
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class SimpleMemoryStore {
  private memories: Map<string, MemoryEntry> = new Map();

  remember(content: string, metadata?: Record<string, any>): string {
    const id = Math.random().toString(36).substring(2, 15);
    const entry: MemoryEntry = {
      id,
      content,
      metadata,
      timestamp: new Date().toISOString()
    };
    this.memories.set(id, entry);
    return id;
  }

  recall(query: string): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    for (const memory of this.memories.values()) {
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        results.push(memory);
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  forget(id: string): boolean {
    return this.memories.delete(id);
  }

  context(): MemoryEntry[] {
    return Array.from(this.memories.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

const memoryStore = new SimpleMemoryStore();

class SimpleMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "memorai-simple",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "remember",
            description: "Store information in memory",
            inputSchema: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "Information to remember"
                },
                metadata: {
                  type: "object",
                  description: "Optional metadata for the memory"
                }
              },
              required: ["content"]
            }
          },
          {
            name: "recall",
            description: "Search and retrieve memories",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query for memories"
                }
              },
              required: ["query"]
            }
          },
          {
            name: "forget",
            description: "Remove specific memory",
            inputSchema: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "ID of the memory to forget"
                }
              },
              required: ["id"]
            }
          },
          {
            name: "context",
            description: "Get all memories",
            inputSchema: {
              type: "object",
              properties: {},
              required: []
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;      try {
        // Ensure args is defined and has the expected structure
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments provided');
        }

        switch (name) {
          case "remember":
            const id = memoryStore.remember(
              (args as any).content as string, 
              (args as any).metadata as Record<string, any> | undefined
            );
            return {
              content: [
                {
                  type: "text",
                  text: `Memory stored with ID: ${id}`
                }
              ]
            };

          case "recall":
            const memories = memoryStore.recall((args as any).query as string);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    query: (args as any).query,
                    results: memories,
                    count: memories.length
                  }, null, 2)
                }
              ]
            };

          case "forget":
            const success = memoryStore.forget((args as any).id as string);
            return {
              content: [
                {
                  type: "text",
                  text: success ? `Memory ${(args as any).id} forgotten` : `Memory ${(args as any).id} not found`
                }
              ]
            };

          case "context":
            const allMemories = memoryStore.context();
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    memories: allMemories,
                    total: allMemories.length
                  }, null, 2)
                }
              ]
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Simple Memorai MCP Server running on stdio");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SimpleMCPServer();
  server.run().catch(console.error);
}

export { SimpleMCPServer };
