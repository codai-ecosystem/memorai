import { Router } from 'express';
// Removed unused imports: Request, Response
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router: Router = Router();

// In-memory stats storage (in production, this would be in a database)
interface MemoryStats {
    totalMemories: number;
    memoriesByAgent: Record<string, number>;
    memoriesByDate: Record<string, number>;
    apiCalls: {
        remember: number;
        recall: number;
        forget: number;
        context: number;
    };
    averageResponseTime: number;
    lastActivity: string;
    tierUsage: Record<string, number>;
}

const stats: MemoryStats = {
    totalMemories: 0,
    memoriesByAgent: {},
    memoriesByDate: {},
    apiCalls: {
        remember: 0,
        recall: 0,
        forget: 0,
        context: 0,
    },
    averageResponseTime: 0,
    lastActivity: new Date().toISOString(),
    tierUsage: {},
};

// Get comprehensive statistics
router.get('/', asyncHandler(async (req: any, res: any) => {
    const { memoryEngine } = req;

    try {
        // Get real-time stats from memory engine if available
        let engineStats = {};
        if (memoryEngine) {
            const tierInfo = memoryEngine.getTierInfo();
            engineStats = {
                currentTier: tierInfo.level,
                tierCapabilities: tierInfo.capabilities,
                tierMessage: tierInfo.message,
            };
        }

        // Calculate derived statistics
        const totalAgents = Object.keys(stats.memoriesByAgent).length;
        const mostActiveAgent = Object.entries(stats.memoriesByAgent)
            .sort(([, a], [, b]) => b - a)[0];

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        });

        const weeklyActivity = last7Days.map(date => ({
            date,
            memories: stats.memoriesByDate[date] || 0,
        })).reverse();

        const response = {
            success: true,
            stats: {
                ...stats,
                ...engineStats,
                derived: {
                    totalAgents,
                    mostActiveAgent: mostActiveAgent ? {
                        agentId: mostActiveAgent[0],
                        memoryCount: mostActiveAgent[1],
                    } : null,
                    weeklyActivity,
                    totalApiCalls: Object.values(stats.apiCalls).reduce((sum, count) => sum + count, 0),
                },
            },
        };

        res.json(response);
    } catch (error: any) {
        logger.error('Failed to get statistics', { error: error.message });
        throw createApiError(`Failed to get statistics: ${error.message}`, 500, 'STATS_GET_FAILED');
    }
}));

// Get statistics for a specific agent
router.get('/agent/:agentId', asyncHandler(async (req: any, res: any) => {
    const agentId = req.params.agentId;

    try {
        const agentStats = {
            agentId,
            totalMemories: stats.memoriesByAgent[agentId] || 0,
            lastActivity: stats.lastActivity,
            // Add more agent-specific stats here
        };

        res.json({
            success: true,
            stats: agentStats,
        });
    } catch (error: any) {
        logger.error('Failed to get agent statistics', { agentId, error: error.message });
        throw createApiError(`Failed to get agent statistics: ${error.message}`, 500, 'AGENT_STATS_FAILED');
    }
}));

// Get memory usage over time
router.get('/timeline', asyncHandler(async (req: any, res: any) => {
    const days = parseInt(req.query.days as string) || 30;

    try {
        const timeline = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            return {
                date: dateStr,
                memories: stats.memoriesByDate[dateStr] || 0,
            };
        }).reverse();

        res.json({
            success: true,
            timeline,
        });
    } catch (error: any) {
        logger.error('Failed to get timeline statistics', { error: error.message });
        throw createApiError(`Failed to get timeline statistics: ${error.message}`, 500, 'TIMELINE_STATS_FAILED');
    }
}));

// Get API performance metrics
router.get('/performance', asyncHandler(async (req: any, res: any) => {
    try {
        const performance = {
            averageResponseTime: stats.averageResponseTime,
            apiCalls: stats.apiCalls,
            tierUsage: stats.tierUsage,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
        };

        res.json({
            success: true,
            performance,
        });
    } catch (error: any) {
        logger.error('Failed to get performance statistics', { error: error.message });
        throw createApiError(`Failed to get performance statistics: ${error.message}`, 500, 'PERFORMANCE_STATS_FAILED');
    }
}));

// Update statistics (internal use)
export function updateStats(operation: string, agentId?: string, responseTime?: number) {
    stats.lastActivity = new Date().toISOString();

    if (operation in stats.apiCalls) {
        stats.apiCalls[operation as keyof typeof stats.apiCalls]++;
    }

    if (agentId) {
        stats.memoriesByAgent[agentId] = (stats.memoriesByAgent[agentId] || 0) + 1;

        const today = new Date().toISOString().split('T')[0];
        stats.memoriesByDate[today] = (stats.memoriesByDate[today] || 0) + 1;

        if (operation === 'remember') {
            stats.totalMemories++;
        } else if (operation === 'forget') {
            stats.totalMemories = Math.max(0, stats.totalMemories - 1);
            stats.memoriesByAgent[agentId] = Math.max(0, stats.memoriesByAgent[agentId] - 1);
        }
    }

    if (responseTime !== undefined) {
        stats.averageResponseTime = (stats.averageResponseTime + responseTime) / 2;
    }
}

export function updateTierUsage(tier: string) {
    stats.tierUsage[tier] = (stats.tierUsage[tier] || 0) + 1;
}

export { router as statsRouter };
