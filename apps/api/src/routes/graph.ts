/**
 * Graph API Routes for Memorai Dashboard
 * Provides entity-relationship graph data
 */

import { Request, Response, Router } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler, createApiError } from '../middleware/errorHandler';

const router = Router();

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

// Get complete graph data
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryEngine } = req;
    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }

    try {
      // For now, we'll return demo data based on memory content
      // This will be replaced with actual graph data from KnowledgeGraph integration

      let memories: any[] = [];
      
      try {
        // Get some memory data to derive graph information
        const contextResponse = await memoryEngine.getContext({
          tenant_id: 'default-tenant',
          agent_id: 'dashboard-agent',
          max_memories: 100,
        });
        memories = contextResponse.memories || [];
      } catch (memoryError) {
        logger.warn('Failed to get memory context, using demo data', { error: memoryError });
        // Fall back to demo data if memory engine has no data
        memories = [];
      }

      // Create entities from memory content (simplified approach)
      const entities: GraphEntity[] = [];
      const relations: GraphRelation[] = [];

      // Create entities from memories
      memories.forEach((memory: any, index: number) => {
        const content = memory.memory?.content || '';
        const words = content.split(' ').slice(0, 3).join(' '); // First 3 words as entity name

        if (words.length > 0) {
          entities.push({
            id: `entity_${index}`,
            name: words.length > 50 ? words.substring(0, 50) + '...' : words,
            type: memory.memory?.metadata?.type || 'Memory',
            properties: {
              content: content,
              importance: memory.memory?.metadata?.importance || 0.5,
              tags: memory.memory?.metadata?.tags || [],
              timestamp: memory.memory?.timestamp || new Date().toISOString(),
            },
            createdAt: memory.memory?.timestamp || new Date().toISOString(),
            updatedAt: memory.memory?.timestamp || new Date().toISOString(),
          });
        }
      });

      // If no entities from memories, add demo data
      if (entities.length === 0) {
        const demoEntities = [
          {
            id: 'demo_api_server',
            name: 'API Server',
            type: 'Server',
            properties: {
              content: 'REST API server for Memorai dashboard running on port 6367',
              importance: 0.9,
              tags: ['api', 'server', 'memorai'],
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
              content: 'Next.js web application for visualizing memory data on port 6366',
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
          },
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
    const { memoryEngine } = req;
    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }

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
