/**
 * Graph API Routes for Memorai Dashboard
 * Provides entity-relationship graph data
 */

import { Request, Response, Router } from 'express';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router: Router = Router();

interface GraphEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface GraphRelation {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  weight: number;
  confidence: number;
}

interface GraphData {
  entities: GraphEntity[];
  relations: GraphRelation[];
  metadata: {
    entityCount: number;
    relationCount: number;
    lastUpdated: string;
  };
}

// PRODUCTION ARCHITECTURE: API calls MCP server instead of creating own memory engine
// This ensures all services share the same live memory data from the MCP server

// PRODUCTION REQUIREMENT: API must call MCP server, not create its own memory engine
// This prevents data isolation and ensures all services use the same live memory data

// PRODUCTION ARCHITECTURE: Use shared memory engine with advanced tier
// This ensures all services share the same live memory data via the advanced memory system

// Get memories from the shared memory engine (matches MCP server configuration)
async function getMCPMemories(memoryEngine: any): Promise<any[]> {
  try {
    // Use the actual tenant ID that the MCP server is using
    // Based on MCP server data, it's using "default-tenant", not the env var
    const tenantId = 'default-tenant'; // This matches what MCP server is actually using
    const agentId = 'production-testing';

    logger.info(
      '✅ LIVE DATA: API using shared memory engine with correct tenant ID',
      {
        tenantId,
        agentId,
        tier: memoryEngine?.getTierInfo()?.currentTier,
        status: 'using_shared_memory_engine_with_correct_tenant',
      }
    );

    // Get memory context using the correct ContextRequest format
    const contextData = await memoryEngine.getContext({
      tenant_id: tenantId,
      agent_id: agentId,
      max_memories: 50,
    });
    const memories = contextData?.memories || [];

    logger.info(
      `✅ LIVE DATA RETRIEVED: Got ${memories.length} memories from shared memory engine`,
      {
        status: 'shared_memory_success',
        memoriesCount: memories.length,
        tenantId,
        tier: memoryEngine?.getTierInfo()?.currentTier,
      }
    );

    return memories;
  } catch (error) {
    logger.error('Failed to get memories from shared memory engine:', error);
    throw error;
  }
}

// Get complete graph data
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Get memory data from MCP server
      let memories: unknown[] = [];

      try {
        memories = await getMCPMemories(req.memoryEngine);
        logger.info(
          `Retrieved ${memories.length} memories from shared memory engine`
        );
      } catch (mcpError) {
        logger.warn(
          'Failed to get memory context from shared memory engine, using demo data',
          {
            error: mcpError,
          }
        );
        // Fall back to demo data if memory engine has no data
        memories = [];
      }

      // Create entities from memory content (simplified approach)
      const entities: GraphEntity[] = [];
      const relations: GraphRelation[] = [];

      // Create entities from memories
      memories.forEach((memoryItem: any, index: number) => {
        const memory = memoryItem.memory || memoryItem; // Handle both nested and flat structures
        const content = memory.content || '';
        const words = content.split(' ').slice(0, 3).join(' '); // First 3 words as entity name

        if (words.length > 0) {
          entities.push({
            id: `entity_${index}`,
            name: words.length > 50 ? words.substring(0, 50) + '...' : words,
            type: memory.memory?.type || 'Memory',
            properties: {
              content: content,
              importance: memory.memory?.importance || 0.5,
              tags: memory.memory?.tags || [],
              timestamp: memory.memory?.createdAt || new Date().toISOString(),
              mcpMemoryId: memory.memory?.id,
              agentId: memory.memory?.agent_id,
              confidence: memory.memory?.confidence,
              accessCount: memory.memory?.accessCount,
            },
            createdAt: memory.memory?.createdAt || new Date().toISOString(),
            updatedAt: memory.memory?.updatedAt || new Date().toISOString(),
          });
        }
      });

      // Only add demo data if NO live MCP data is available
      if (entities.length === 0) {
        logger.warn(
          'No live MCP data available - this should not happen in production'
        );
        const demoEntities = [
          {
            id: 'no_live_data_warning',
            name: '⚠️ NO LIVE DATA - MCP Server Connection Issue',
            type: 'Warning',
            properties: {
              content:
                'WARNING: No live data retrieved from MCP server. Check MCP server connection and agent ID configuration.',
              importance: 1.0,
              tags: ['warning', 'no-data', 'mcp-issue'],
              status: 'no_live_data',
              mcpServerUrl:
                process.env.MCP_SERVER_URL || 'http://localhost:8080',
              expectedAgentId: 'production-testing',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo_api_server',
            name: 'API Server (Demo)',
            type: 'Server',
            properties: {
              content:
                'REST API server for Memorai dashboard running on port 6367 - DEMO DATA',
              importance: 0.9,
              tags: ['api', 'server', 'memorai', 'demo'],
              port: 6367,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo_dashboard',
            name: 'Dashboard',
            type: 'Web Application',
            properties: {
              content:
                'Next.js web application for visualizing memory data on port 6366',
              importance: 0.8,
              tags: ['dashboard', 'frontend', 'nextjs'],
              port: 6366,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo_mcp_server',
            name: 'MCP Server',
            type: 'Protocol Server',
            properties: {
              content: 'Model Context Protocol server for AI memory management',
              importance: 0.9,
              tags: ['mcp', 'server', 'protocol'],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo_memory_engine',
            name: 'Memory Engine',
            type: 'Core Component',
            properties: {
              content: 'Unified memory engine handling different memory tiers',
              importance: 1.0,
              tags: ['memory', 'engine', 'core'],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        entities.push(...demoEntities);

        // Add demo relations
        relations.push(
          {
            id: 'rel_dashboard_api',
            fromId: 'demo_dashboard',
            toId: 'demo_api_server',
            type: 'communicates_with',
            weight: 0.8,
            confidence: 0.9,
          },
          {
            id: 'rel_api_memory',
            fromId: 'demo_api_server',
            toId: 'demo_memory_engine',
            type: 'uses',
            weight: 0.9,
            confidence: 0.95,
          },
          {
            id: 'rel_mcp_memory',
            fromId: 'demo_mcp_server',
            toId: 'demo_memory_engine',
            type: 'manages',
            weight: 1.0,
            confidence: 1.0,
          }
        );
      } else {
        // Create some sample relations between memory entities
        for (let i = 0; i < entities.length - 1; i++) {
          if (i < entities.length - 1) {
            relations.push({
              id: `relation_${i}`,
              fromId: entities[i].id,
              toId: entities[i + 1].id,
              type: 'related_to',
              weight: Math.random() * 0.5 + 0.5, // Random weight between 0.5 and 1
              confidence: Math.random() * 0.3 + 0.7, // Random confidence between 0.7 and 1
            });
          }
        }
      }

      const graphData: GraphData = {
        entities,
        relations,
        metadata: {
          entityCount: entities.length,
          relationCount: relations.length,
          lastUpdated: new Date().toISOString(),
        },
      };

      logger.info('Graph data retrieved', {
        entityCount: entities.length,
        relationCount: relations.length,
      });

      res.json({
        success: true,
        data: graphData,
      });
    } catch (error: unknown) {
      logger.error('Failed to get graph data', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to get graph data: ${(error as Error).message}`,
        500,
        'GRAPH_RETRIEVAL_FAILED'
      );
    }
  })
);

// Get entities only
router.get(
  '/entities',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // This is a simplified implementation
      // In a full implementation, this would query the KnowledgeGraph directly

      const entities: GraphEntity[] = [
        {
          id: 'sample_entity_1',
          name: 'Sample Entity',
          type: 'Example',
          properties: {
            description: 'This is a sample entity for dashboard testing',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      res.json({
        success: true,
        entities,
      });
    } catch (error: unknown) {
      logger.error('Failed to get entities', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to get entities: ${(error as Error).message}`,
        500,
        'ENTITIES_RETRIEVAL_FAILED'
      );
    }
  })
);

// Get relations only
router.get(
  '/relations',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const relations: GraphRelation[] = [];

      res.json({
        success: true,
        relations,
      });
    } catch (error: unknown) {
      logger.error('Failed to get relations', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to get relations: ${(error as Error).message}`,
        500,
        'RELATIONS_RETRIEVAL_FAILED'
      );
    }
  })
);

export { router as graphRouter };
