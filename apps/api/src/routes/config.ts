import { Request, Response, Router } from 'express';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router: Router = Router();

// Get current configuration
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
      const tierInfo = memoryEngine.getTierInfo();
      // Get standardized features based on tier capabilities
      const features = {
        embedding:
          tierInfo.capabilities.embedding ||
          tierInfo.capabilities.embeddings ||
          false,
        similarity:
          tierInfo.capabilities.similarity ||
          tierInfo.capabilities.vectorSimilarity ||
          false,
        persistence: tierInfo.capabilities.persistence || true, // Always available with filesystem storage
        scalability:
          tierInfo.capabilities.scalability ||
          tierInfo.capabilities.performance === 'high',
      };

      const config = {
        tier: tierInfo,
        environment: {
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          hasAzureConfig: !!(
            process.env.AZURE_OPENAI_ENDPOINT &&
            process.env.AZURE_OPENAI_API_KEY
          ),
          hasLocalAI: true, // Always available as fallback
          pythonPath: process.env.PYTHON_PATH || 'python',
          cachePath: process.env.MEMORAI_CACHE_PATH || './cache',
        },
        features,
      };

      res.json({
        success: true,
        config,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get configuration', { error: errorMessage });
      throw createApiError(
        `Failed to get configuration: ${errorMessage}`,
        500,
        'CONFIG_GET_FAILED'
      );
    }
  })
);

// Test tier availability
router.post(
  '/test-tier',
  asyncHandler(async (req: Request, res: Response) => {
    const { tier } = req.body;

    // Check if tier is missing or undefined
    if (tier === undefined || tier === null) {
      throw createApiError('Tier not specified', 400, 'TIER_NOT_SPECIFIED');
    }

    // Validate tier value (including empty string)
    const validTiers = ['mock', 'basic', 'smart', 'advanced'];
    if (!validTiers.includes(tier)) {
      throw createApiError('Invalid tier specified', 400, 'INVALID_TIER');
    }

    try {
      const { memoryEngine } = req as any;
      if (!memoryEngine) {
        throw createApiError(
          'Memory engine not available',
          503,
          'MEMORY_ENGINE_UNAVAILABLE'
        );
      }

      await memoryEngine.testTier(tier);
      res.json({
        success: true,
        message: `Tier '${tier}' is available and working`,
      });
    } catch (error: unknown) {
      const apiError = error as any;
      if (apiError?.statusCode === 400 || apiError?.statusCode === 503) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to test tier', {
        tier: req.body.tier,
        error: errorMessage,
      });
      throw createApiError(
        `Failed to test tier: ${errorMessage}`,
        500,
        'TIER_TEST_FAILED'
      );
    }
  })
);

// Dashboard-specific configuration endpoint
router.get(
  '/dashboard',
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
      const tierInfo = memoryEngine.getTierInfo();

      // Return configuration in format expected by dashboard
      const dashboardConfig = {
        version: '2.0.55',
        environment: 'development',
        features: {
          memoryStorage: true,
          vectorSearch: tierInfo.capabilities.semanticSearch || false,
          agentTracking: true,
          realTimeUpdates: true,
        },
        settings: {
          maxMemories: 10000,
          retentionDays: 365,
          enableEmbeddings: tierInfo.capabilities.embeddings || false,
          enableCache: true,
        },
        endpoints: {
          api: 'http://localhost:6367/api',
          websocket: 'ws://localhost:6367',
        },
        security: {
          maxRequestsPerMinute: 1000,
          encryptionEnabled: true,
          authRequired: false,
          sessionTimeout: 3600,
        },
        providers: {
          embedding: tierInfo.currentTier === 'advanced' ? 'openai' : 'local',
          storage: 'qdrant',
        },
        performance: {
          queryTimeout: 30,
          cacheSize: 100,
          batchSize: 50,
          enablePreloading: true,
        },
        tier: tierInfo,
      };

      res.json({
        data: dashboardConfig,
        success: true,
        cached: false,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to get dashboard configuration', {
        error: errorMessage,
      });
      throw createApiError(
        `Failed to get dashboard configuration: ${errorMessage}`,
        500,
        'DASHBOARD_CONFIG_GET_FAILED'
      );
    }
  })
);

export { router as configRouter };
