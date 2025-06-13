import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router: Router = Router();

// Get current configuration
router.get('/', asyncHandler(async (req: any, res: any) => {
    const { memoryEngine } = req;
    if (!memoryEngine) {
        throw createApiError('Memory engine not available', 503, 'MEMORY_ENGINE_UNAVAILABLE');
    }

    try {
        const tierInfo = memoryEngine.getTierInfo();
        const config = {
            tier: tierInfo,
            environment: {
                hasOpenAIKey: !!process.env.OPENAI_API_KEY,
                hasAzureConfig: !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
                hasLocalAI: true, // Always available as fallback
                pythonPath: process.env.PYTHON_PATH || 'python',
                cachePath: process.env.MEMORAI_CACHE_PATH || './cache',
            },
            features: {
                embedding: tierInfo.capabilities.embedding,
                similarity: tierInfo.capabilities.similarity,
                persistence: tierInfo.capabilities.persistence,
                scalability: tierInfo.capabilities.scalability,
            },
        };

        res.json({
            success: true,
            config,
        });
    } catch (error: any) {
        logger.error('Failed to get configuration', { error: error.message });
        throw createApiError(`Failed to get configuration: ${error.message}`, 500, 'CONFIG_GET_FAILED');
    }
}));

// Update configuration (limited - mainly for testing)
router.post('/test-tier', asyncHandler(async (req: any, res: any) => {
    try {
        const { tier } = req.body;

        if (!tier) {
            throw createApiError('Invalid tier specified', 400, 'INVALID_TIER');
        }

        if (!['advanced', 'smart', 'basic', 'mock'].includes(tier)) {
            throw createApiError('Invalid tier specified', 400, 'INVALID_TIER');
        }

        // This would reinitialize the memory engine with a specific tier
        // For now, we'll just return the current status
        const { memoryEngine } = req;
        if (!memoryEngine) {
            throw createApiError('Memory engine not available', 503, 'MEMORY_ENGINE_UNAVAILABLE');
        }

        const tierInfo = memoryEngine.getTierInfo();

        res.json({
            success: true,
            message: `Current tier: ${tierInfo.level}`,
            tierInfo,
        });
    } catch (error: any) {
        if (error.statusCode === 400 || error.statusCode === 503) {
            throw error; // Re-throw validation and unavailable errors as-is
        }

        logger.error('Failed to test tier', { tier: req.body.tier, error: error.message });
        throw createApiError(`Failed to test tier: ${error.message}`, 500, 'TIER_TEST_FAILED');
    }
}));

// Health check for specific components
router.get('/health', asyncHandler(async (req: any, res: any) => {
    const { memoryEngine } = req;

    const health = {
        memoryEngine: {
            available: !!memoryEngine,
            tier: memoryEngine ? memoryEngine.getTierInfo().level : 'none',
            capabilities: memoryEngine ? memoryEngine.getTierInfo().capabilities : {},
        },
        environment: {
            openai: !!process.env.OPENAI_API_KEY,
            azure: !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
            python: process.env.PYTHON_PATH || 'python',
        },
        timestamp: new Date().toISOString(),
    };

    res.json({
        success: true,
        health,
    });
}));

// Get available tiers and their requirements
router.get('/tiers', asyncHandler(async (req: any, res: any) => {
    const tiers = [
        {
            level: 'advanced',
            name: 'Advanced (OpenAI)',
            description: 'High-quality embeddings using OpenAI API',
            requirements: ['OPENAI_API_KEY'],
            capabilities: {
                embedding: 'high',
                similarity: 'high',
                persistence: 'high',
                scalability: 'high',
            },
        },
        {
            level: 'advanced',
            name: 'Advanced (Azure OpenAI)',
            description: 'High-quality embeddings using Azure OpenAI',
            requirements: ['AZURE_OPENAI_ENDPOINT', 'AZURE_OPENAI_API_KEY', 'AZURE_OPENAI_DEPLOYMENT_NAME'],
            capabilities: {
                embedding: 'high',
                similarity: 'high',
                persistence: 'high',
                scalability: 'high',
            },
        },
        {
            level: 'smart',
            name: 'Smart (Local AI)',
            description: 'Local embeddings using sentence-transformers',
            requirements: ['Python with sentence-transformers'],
            capabilities: {
                embedding: 'medium',
                similarity: 'medium',
                persistence: 'high',
                scalability: 'medium',
            },
        },
        {
            level: 'basic',
            name: 'Basic (Keyword)',
            description: 'Simple keyword-based matching',
            requirements: ['None'],
            capabilities: {
                embedding: 'low',
                similarity: 'low',
                persistence: 'high',
                scalability: 'high',
            },
        },
        {
            level: 'mock',
            name: 'Mock (Testing)',
            description: 'Mock implementation for testing',
            requirements: ['None'],
            capabilities: {
                embedding: 'none',
                similarity: 'none',
                persistence: 'none',
                scalability: 'high',
            },
        },
    ];

    // Check which tiers are currently available
    const availableTiers = tiers.map(tier => ({
        ...tier,
        available: checkTierAvailability(tier.requirements),
    }));

    res.json({
        success: true,
        tiers: availableTiers,
    });
}));

function checkTierAvailability(requirements: string[]): boolean {
    return requirements.every(req => {
        switch (req) {
            case 'OPENAI_API_KEY':
                return !!process.env.OPENAI_API_KEY;
            case 'AZURE_OPENAI_ENDPOINT':
                return !!process.env.AZURE_OPENAI_ENDPOINT;
            case 'AZURE_OPENAI_API_KEY':
                return !!process.env.AZURE_OPENAI_API_KEY;
            case 'AZURE_OPENAI_DEPLOYMENT_NAME':
                return !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
            case 'Python with sentence-transformers':
                return true; // Assume available for now
            case 'None':
                return true;
            default:
                return false;
        }
    });
}

export { router as configRouter };
