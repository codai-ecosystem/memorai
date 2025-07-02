import { Request, Response, Router } from 'express';
import { asyncHandler, createApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// Get general statistics
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryEngine } = req as any;

    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }

    try {
      // Get comprehensive stats from the memory engine's getStats method
      const engineStats = (await memoryEngine?.getStats?.()) || {
        totalMemories: 0,
        memoryTypes: {},
        avgImportance: 0,
        tenantCount: 0,
        agentCount: 0,
        storageSize: 0,
        lastUpdated: new Date().toISOString(),
      };

      const stats = {
        totalMemories: engineStats?.totalMemories || 0,
        memoryEngineStatus: 'operational',
        lastUpdated: new Date().toISOString(),
        memoryTypes: engineStats?.memoryTypes || {},
        indexStats: engineStats?.indexStats || {},
        performance: engineStats?.performance || {},
        avgResponseTime: 0.05, // API performance placeholder
        requestsPerSecond: 0, // API performance placeholder
        errorRate: 0, // API performance placeholder
      };

      const systemStats = {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      };

      const response = {
        success: true,
        data: {
          engine: stats,
          system: systemStats,
          performance: {
            avgResponseTime: stats.avgResponseTime,
            requestsPerSecond: stats.requestsPerSecond,
            errorRate: stats.errorRate,
          },
        },
      };

      res.json(response);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get statistics', { error: errorMessage });
      throw createApiError(
        `Failed to get statistics: ${errorMessage}`,
        500,
        'STATS_GET_FAILED'
      );
    }
  })
);

// Get statistics for a specific agent
router.get(
  '/agent/:agentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const { memoryEngine } = req as any;

    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }

    try {
      // Get agent-specific stats using getContext
      const contextResponse = await memoryEngine.getContext({
        tenant_id: 'default-tenant',
        agent_id: agentId,
        max_memories: 1000,
      });

      const agentStats = {
        agentId,
        totalMemories: contextResponse?.total_count || 0,
        memories: contextResponse?.memories || [],
        lastActivity: contextResponse?.memories?.[0]?.createdAt || null,
        status: 'active',
      };

      res.json({
        success: true,
        stats: agentStats,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get agent statistics', {
        agentId,
        error: errorMessage,
      });
      throw createApiError(
        `Failed to get agent statistics: ${errorMessage}`,
        500,
        'AGENT_STATS_FAILED'
      );
    }
  })
);

export { router as statsRouter };

// Utility functions for updating stats (used by websocket service)
export function updateStats(
  operation: string,
  agentId: string,
  responseTime: number
): void {
  // Implementation for updating stats
  logger.info('Stats updated', { operation, agentId, responseTime });
}

export function updateTierUsage(tier: string, usage: number): void {
  // Implementation for updating tier usage
  logger.info('Tier usage updated', { tier, usage });
}
