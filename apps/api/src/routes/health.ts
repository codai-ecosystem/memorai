/**
 * Health Check Routes
 * Comprehensive health monitoring for all Memorai services
 */

import { UnifiedMemoryEngine } from '@codai/memorai-core';
import axios from 'axios';
import { Request, Response, Router } from 'express';
import { logger } from '../utils/logger';

export const healthRouter: Router = Router();

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  url?: string;
  port?: number;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: ServiceStatus[];
  memory: {
    engine: {
      initialized: boolean;
      tier: string;
      performance?: Record<string, any>;
    };
    system: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  dependencies: {
    qdrant?: ServiceStatus;
    vectorStore?: ServiceStatus;
  };
}

/**
 * Check if a service is responding
 */
async function checkService(
  name: string,
  url: string,
  timeout = 5000
): Promise<ServiceStatus> {
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout,
      validateStatus: status => status < 500, // Accept 2xx, 3xx, 4xx but not 5xx
    });

    const responseTime = Date.now() - startTime;

    return {
      name,
      status: response.status < 400 ? 'healthy' : 'degraded',
      url,
      responseTime,
      details: {
        httpStatus: response.status,
        headers: response.headers,
      },
    };
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;

    return {
      name,
      status: 'unhealthy',
      url,
      responseTime,
      error: (error as any).message,
      details: {
        code: (error as any).code,
        errno: (error as any).errno,
      },
    };
  }
}

/**
 * Get system memory usage
 */
function getSystemMemory() {
  const used = process.memoryUsage();
  const total = used.heapTotal;
  const percentage = (used.heapUsed / total) * 100;

  return {
    used: used.heapUsed,
    total,
    percentage: Math.round(percentage * 100) / 100,
  };
}

/**
 * Check memory engine health
 */
function checkMemoryEngine(memoryEngine: UnifiedMemoryEngine | null) {
  if (!memoryEngine) {
    return {
      initialized: false,
      tier: 'none',
    };
  }

  try {
    const tierInfo = memoryEngine.getTierInfo();
    return {
      initialized: true,
      tier: tierInfo.currentTier,
      performance: {
        responseTime: `${tierInfo.capabilities?.performance || 'unknown'}`,
        offline: tierInfo.capabilities?.offline || false,
        embeddings: tierInfo.capabilities?.embeddings || false,
      },
    };
  } catch (error) {
    return {
      initialized: false,
      tier: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Basic health check - lightweight for frequent polling
 */
healthRouter.get('/', (req: Request, res: Response) => {
  const memoryEngine = (req as any).memoryEngine as UnifiedMemoryEngine | null;

  const status: Partial<HealthResponse> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: {
      engine: checkMemoryEngine(memoryEngine),
      system: getSystemMemory(),
    },
  };

  res.json(status);
});

/**
 * Detailed health check - comprehensive status of all services
 */
healthRouter.get('/detailed', async (req: Request, res: Response) => {
  const memoryEngine = (req as any).memoryEngine as UnifiedMemoryEngine | null;
  const startTime = Date.now();

  try {
    // Check all known services
    const serviceChecks = await Promise.allSettled([
      checkService('Dashboard', 'http://localhost:6366'),
      checkService('API Server', 'http://localhost:6368/health'),
      checkService('HTTP MCP Server', 'http://localhost:6367/health'),
    ]);

    const services: ServiceStatus[] = serviceChecks.map((result, index) => {
      const serviceNames = ['Dashboard', 'API Server', 'HTTP MCP Server'];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: serviceNames[index],
          status: 'unknown',
          error: result.reason?.message || 'Check failed',
        };
      }
    });

    // Determine overall system status
    const unhealthyServices = services.filter(
      s => s.status === 'unhealthy'
    ).length;
    const degradedServices = services.filter(
      s => s.status === 'degraded'
    ).length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.55',
      uptime: process.uptime(),
      services,
      memory: {
        engine: checkMemoryEngine(memoryEngine),
        system: getSystemMemory(),
      },
      dependencies: {
        // Add vector store health check if available
        vectorStore: {
          name: 'Vector Store',
          status: memoryEngine ? 'healthy' : 'unknown',
        },
      },
    };

    const responseTime = Date.now() - startTime;
    logger.info(`Health check completed in ${responseTime}ms`, {
      status: overallStatus,
      servicesChecked: services.length,
    });

    res.json(healthResponse);
  } catch (error) {
    logger.error('Health check failed:', error);

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.55',
      uptime: process.uptime(),
      services: [],
      memory: {
        engine: checkMemoryEngine(memoryEngine),
        system: getSystemMemory(),
      },
      dependencies: {},
    };

    res.status(503).json(errorResponse);
  }
});

/**
 * Ready check - simple endpoint for readiness probes
 */
healthRouter.get('/ready', (req: Request, res: Response) => {
  const memoryEngine = (req as any).memoryEngine as UnifiedMemoryEngine | null;

  if (!memoryEngine) {
    res.status(503).json({
      ready: false,
      reason: 'Memory engine not initialized',
    });
    return;
  }

  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Live check - simple endpoint for liveness probes
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
