import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler, createApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Zod error interfaces for proper typing
interface ZodErrorItem {
  path: (string | number)[];
  message: string;
  code: string;
}

interface ZodErrorObject extends Error {
  name: 'ZodError';
  errors: ZodErrorItem[];
}

// API error interface
interface ApiError extends Error {
  statusCode: number;
}

// Memory interfaces for proper typing
interface MemoryResult {
  memory: MemoryObject;
}

interface MemoryObject {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  similarity?: number;
}

interface ContextResponse {
  memories?: MemoryResult[];
}

const router: Router = Router();

// Validation schemas
const rememberSchema = z.object({
  agentId: z.string().min(1),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const recallSchema = z.object({
  agentId: z.string().min(1),
  query: z.string().min(1),
  limit: z.number().min(1).max(100).optional(),
});

const forgetSchema = z.object({
  agentId: z.string().min(1),
  memoryId: z.string().min(1),
});

const contextSchema = z.object({
  agentId: z.string().min(1),
  contextSize: z.number().min(1).max(50).optional(),
});

// Store a memory
router.post(
  '/remember',
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
      const { agentId, content, metadata } = rememberSchema.parse(req.body);

      const result = await memoryEngine.remember(
        content,
        'default-tenant',
        agentId,
        metadata
      );
      logger.info('Memory stored', { agentId, memoryId: result });

      res.json({
        success: true,
        memory: result,
        message: 'Memory stored successfully',
      });
    } catch (error: unknown) {
      if ((error as ZodErrorObject)?.name === 'ZodError') {
        logger.error('Validation error in remember', {
          error: (error as ZodErrorObject)?.errors,
        });
        const fieldErrors = (error as ZodErrorObject)?.errors.map(
          (err: ZodErrorItem) =>
            `${err.path.join('.')}: ${err.message}`
        );
        throw createApiError(
          `Validation error: ${fieldErrors.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      logger.error('Failed to store memory', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to store memory: ${(error as Error).message}`,
        500,
        'MEMORY_STORE_FAILED'
      );
    }
  })
);

// Recall memories
router.post(
  '/recall',
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
      const { agentId, query, limit = 10 } = recallSchema.parse(req.body);

      const results = await memoryEngine.recall(
        query,
        'default-tenant',
        agentId,
        { limit }
      );

      logger.info('Memory recalled', {
        agentId,
        query,
        resultsCount: results.length,
      });

      res.json({
        success: true,
        memories: results,
        count: results.length,
        query,
      });
    } catch (error: unknown) {
      if ((error as ZodErrorObject)?.name === 'ZodError') {
        logger.error('Validation error in recall', {
          error: (error as ZodErrorObject)?.errors,
        });
        const fieldErrors = (error as ZodErrorObject)?.errors.map(
          (err: ZodErrorItem) =>
            `${err.path.join('.')}: ${err.message}`
        );
        throw createApiError(
          `Validation error: ${fieldErrors.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      logger.error('Failed to recall memories', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to recall memories: ${(error as Error).message}`,
        500,
        'MEMORY_RECALL_FAILED'
      );
    }
  })
);

// Get context
router.post(
  '/context',
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
      const { agentId, contextSize = 10 } = contextSchema.parse(req.body);

      const contextRequest = {
        tenant_id: 'default-tenant',
        agent_id: agentId,
        max_memories: contextSize,
      };

      const context = await memoryEngine.getContext(contextRequest);

      logger.info('Context retrieved', {
        agentId,
        contextSize: context.total_count,
      });

      res.json({
        success: true,
        context,
      });
    } catch (error: unknown) {
      if ((error as ZodErrorObject)?.name === 'ZodError') {
        logger.error('Validation error in context', {
          error: (error as ZodErrorObject)?.errors,
        });
        const fieldErrors = (error as ZodErrorObject)?.errors.map(
          (err: ZodErrorItem) =>
            `${err.path.join('.')}: ${err.message}`
        );
        throw createApiError(
          `Validation error: ${fieldErrors.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }

      logger.error('Failed to get context', {
        agentId: req.body.agentId,
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to get context: ${(error as Error).message}`,
        500,
        'CONTEXT_RETRIEVAL_FAILED'
      );
    }
  })
);

// Forget a memory
router.delete(
  '/forget',
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
      const { agentId, memoryId } = forgetSchema.parse(req.body);

      const success = await memoryEngine.forget(memoryId);

      if (!success) {
        throw createApiError(
          'Memory not found or could not be deleted',
          404,
          'MEMORY_NOT_FOUND'
        );
      }

      logger.info('Memory forgotten', { agentId, memoryId });

      res.json({
        success: true,
        message: 'Memory forgotten successfully',
      });
    } catch (error: unknown) {
      if ((error as ZodErrorObject)?.name === 'ZodError') {
        logger.error('Validation error in forget', {
          error: (error as ZodErrorObject)?.errors,
        });
        const fieldErrors = (error as ZodErrorObject)?.errors.map(
          (err: ZodErrorItem) =>
            `${err.path.join('.')}: ${err.message}`
        );
        throw createApiError(
          `Validation error: ${fieldErrors.join(', ')}`,
          400,
          'VALIDATION_ERROR'
        );
      }
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        (error as ApiError).statusCode === 404
      ) {
        throw error; // Re-throw 404 errors as-is
      }

      logger.error('Failed to forget memory', {
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to forget memory: ${(error as Error).message}`,
        500,
        'MEMORY_FORGET_FAILED'
      );
    }
  })
);

// List all memories for an agent
router.get(
  '/list/:agentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryEngine } = req;
    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }
    const agentId = req.params.agentId;
    const page = parseInt(String(req.query.page || '1')) || 1;
    const limit = parseInt(String(req.query.limit || '20')) || 20;
    const search = String(req.query.search || '');

    try {
      let memories: unknown[];

      if (search) {
        // Use recall for search functionality
        const results = await memoryEngine.recall(
          search,
          'default-tenant',
          agentId,
          { limit: limit * page }
        );
        memories = results.map((r: unknown) => (r as MemoryResult).memory);
      } else {
        // For listing all, use the getContext method
        const contextResponse = await memoryEngine.getContext({
          tenant_id: 'default-tenant',
          agent_id: agentId,
          max_memories: limit * page,
        });
        memories =
          (contextResponse as unknown as ContextResponse).memories?.map((m: unknown) => (m as MemoryResult).memory) || [];
      }

      // Simple pagination (this should be improved in the memory engine)
      const startIndex = (page - 1) * limit;
      const paginatedMemories = memories.slice(startIndex, startIndex + limit);

      res.json({
        success: true,
        memories: paginatedMemories,
        pagination: {
          page,
          limit,
          total: memories.length,
          pages: Math.ceil(memories.length / limit),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to list memories', {
        agentId,
        error: (error as Error).message,
      });
      throw createApiError(
        `Failed to list memories: ${(error as Error).message}`,
        500,
        'MEMORY_LIST_FAILED'
      );
    }
  })
);

// Export memories for an agent
router.get(
  '/export/:agentId',
  asyncHandler(async (req: Request, res: Response) => {
    const { memoryEngine } = req;
    if (!memoryEngine) {
      throw createApiError(
        'Memory engine not available',
        503,
        'MEMORY_ENGINE_UNAVAILABLE'
      );
    }

    const agentId = req.params.agentId;
    const format = String(req.query.format || 'json');

    try {
      // Validate format
      if (!['json'].includes(format)) {
        throw createApiError(
          'Unsupported export format',
          400,
          'UNSUPPORTED_FORMAT'
        );
      } // Get all memories for the agent
      const memories = await memoryEngine.recall('', 'default', agentId, {
        limit: 1000,
      }); // Large limit for export

      const exportData = {
        agentId,
        exportedAt: new Date().toISOString(),
        memoryCount: memories.length,
        memories: memories.map((memory: unknown) => ({
          id: (memory as MemoryObject).id,
          content: (memory as MemoryObject).content,
          metadata: (memory as MemoryObject).metadata,
          timestamp: (memory as MemoryObject).timestamp,
          similarity: (memory as MemoryObject).similarity,
        })),
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="memorai-export-${agentId}-${Date.now()}.json"`
      );
      res.json(exportData);

      logger.info('Memories exported', {
        agentId,
        count: memories.length,
        format,
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'statusCode' in error &&
        (error as ApiError).statusCode === 400
      ) {
        throw error; // Re-throw validation errors as-is
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Failed to export memories', {
        agentId,
        error: errorMessage,
      });
      throw createApiError(
        `Failed to export memories: ${errorMessage}`,
        500,
        'MEMORY_EXPORT_FAILED'
      );
    }
  })
);

export { router as memoryRouter };
