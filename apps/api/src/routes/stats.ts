import { Router, Request, Response } from "express";
import { asyncHandler, createApiError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router: Router = Router();

// Get general statistics
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryEngine } = req as any;

    if (!memoryEngine) {
      throw createApiError(
        "Memory engine not available",
        503,
        "MEMORY_ENGINE_UNAVAILABLE",
      );
    }

    try {
      const stats = await memoryEngine.getStatistics();
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
            avgResponseTime: stats.avgResponseTime ?? 0,
            requestsPerSecond: stats.requestsPerSecond ?? 0,
            errorRate: stats.errorRate ?? 0,
          },
        },
      };

      res.json(response);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to get statistics", { error: errorMessage });
      throw createApiError(
        `Failed to get statistics: ${errorMessage}`,
        500,
        "STATS_GET_FAILED",
      );
    }
  }),
);

// Get statistics for a specific agent
router.get(
  "/agent/:agentId",
  asyncHandler(async (req: Request, res: Response) => {
    const { agentId } = req.params;
    const { memoryEngine } = req as any;

    if (!memoryEngine) {
      throw createApiError(
        "Memory engine not available",
        503,
        "MEMORY_ENGINE_UNAVAILABLE",
      );
    }

    try {
      const agentStats = await memoryEngine.getAgentStatistics(agentId);

      res.json({
        success: true,
        stats: agentStats,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("Failed to get agent statistics", {
        agentId,
        error: errorMessage,
      });
      throw createApiError(
        `Failed to get agent statistics: ${errorMessage}`,
        500,
        "AGENT_STATS_FAILED",
      );
    }
  }),
);

export { router as statsRouter };

// Utility functions for updating stats (used by websocket service)
export function updateStats(
  operation: string,
  agentId: string,
  responseTime: number,
): void {
  // Implementation for updating stats
  logger.info("Stats updated", { operation, agentId, responseTime });
}

export function updateTierUsage(tier: string, usage: number): void {
  // Implementation for updating tier usage
  logger.info("Tier usage updated", { tier, usage });
}
