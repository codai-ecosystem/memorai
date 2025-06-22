/**
 * @fileoverview Main Memorai MCP Server implementation
 */

import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { MemoryEngine } from '@codai/memorai-core';
import { ServerConfig } from '../config/ServerConfig.js';
import { Logger } from '../utils/Logger.js';
import { AuthMiddleware } from '../middleware/AuthMiddleware.js';
import { RateLimitMiddleware } from '../middleware/RateLimitMiddleware.js';
import { TenantMiddleware } from '../middleware/TenantMiddleware.js';
import { MCPHandler } from '../handlers/MCPHandler.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import type { HealthStatus } from '../types/index.js';

/**
 * Main Memorai MCP Server class
 */
export class MemoraiServer {
  private server: FastifyInstance;
  private memoryEngine: MemoryEngine;
  private config: ServerConfig;
  private authMiddleware: AuthMiddleware;
  private rateLimitMiddleware: RateLimitMiddleware;
  private tenantMiddleware: TenantMiddleware;
  private mcpHandler: MCPHandler;
  private metricsCollector: MetricsCollector;
  private isStarted = false; constructor(memoryEngine: MemoryEngine) {
    if (!memoryEngine || memoryEngine === null || memoryEngine === undefined) {
      throw new Error('Memory engine cannot be null or undefined');
    }

    this.memoryEngine = memoryEngine;
    this.config = ServerConfig.getInstance();
    this.server = this.createServer();
    this.authMiddleware = new AuthMiddleware();
    this.rateLimitMiddleware = new RateLimitMiddleware();
    this.tenantMiddleware = new TenantMiddleware();
    this.mcpHandler = new MCPHandler(memoryEngine);
    this.metricsCollector = new MetricsCollector();

    this.setupMiddleware();
    this.setupRoutes();

    // Start periodic metrics collection
    this.metricsCollector.startPeriodicRecording();
  }

  /**
   * Create Fastify server instance
   */
  private createServer(): FastifyInstance {
    const server = Fastify({
      logger: false, // We use Winston instead
      bodyLimit: 1048576, // 1MB
      keepAliveTimeout: 30000 // 30 seconds
    });

    return server;
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    const { options } = this.config;

    // CORS
    if (options.cors) {
      this.server.register(import('@fastify/cors'), {
        origin: true,
        credentials: true
      });
    }

    // Security headers
    if (options.helmet) {
      this.server.register(import('@fastify/helmet'), {
        contentSecurityPolicy: false
      });
    }

    // Rate limiting
    this.server.register(import('@fastify/rate-limit'), {
      max: options.rateLimit.max,
      timeWindow: options.rateLimit.timeWindow
    });

    // JWT support
    this.server.register(import('@fastify/jwt'), {
      secret: options.jwt.secret
    });
    // Global hooks
    this.server.addHook('preHandler', async (request, reply) => {
      // Track request start time
      (request as any).startTime = Date.now();

      // Track new connection
      this.metricsCollector.recordConnection('open');

      // Skip auth for health check and capabilities
      if (request.url === '/health' || request.url === '/capabilities' || request.url === '/metrics') {
        return;
      }

      // Apply authentication
      await this.authMiddleware.authenticate(request, reply);

      // Apply tenant loading
      await this.tenantMiddleware.loadTenant(request, reply);

      // Apply rate limiting
      await this.rateLimitMiddleware.checkRateLimit(request, reply);
    });

    // Track response completion
    this.server.addHook('onResponse', async (request, reply) => {
      const startTime = (request as any).startTime;
      if (startTime) {
        const responseTime = Date.now() - startTime;
        const isError = reply.statusCode >= 400;
        this.metricsCollector.recordRequest(responseTime, isError);
      }

      // Track connection close
      this.metricsCollector.recordConnection('close');
    });

    // Error handler
    this.server.setErrorHandler(async (error, request, reply) => {
      // Record error metrics
      const startTime = (request as any).startTime;
      if (startTime) {
        const responseTime = Date.now() - startTime;
        this.metricsCollector.recordRequest(responseTime, true);
      }

      Logger.error('Server error', error);

      await reply.code(500).send({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: {
            type: 'server_error',
            timestamp: new Date().toISOString()
          }
        }
      });
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Main MCP endpoint
    this.server.post('/mcp', async (request, reply) => {
      await this.mcpHandler.handleRequest(request as any, reply);
    });

    // Health check
    this.server.get('/health', async (request, reply) => {
      const health = await this.getHealth();

      const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

      await reply.code(statusCode).send(health);
    });

    // Server capabilities
    this.server.get('/capabilities', async (request, reply) => {
      await reply.send({
        methods: [
          'memory/remember',
          'memory/recall',
          'memory/forget',
          'memory/context'
        ],
        features: [
          'semantic_search',
          'temporal_awareness',
          'context_generation',
          'multi_tenant',
          'encryption'
        ],
        version: '0.1.0'
      });
    });
    // Metrics endpoint (for monitoring)
    this.server.get('/metrics', async (request, reply) => {
      try {
        const format = (request.query as any)?.format || 'prometheus';

        if (format === 'prometheus') {
          // Return Prometheus format metrics
          const prometheusMetrics = this.metricsCollector.exportPrometheusMetrics();
          await reply
            .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
            .send(prometheusMetrics);
        } else if (format === 'json') {
          // Return JSON format metrics
          const jsonMetrics = this.metricsCollector.getDetailedMetrics();
          await reply
            .header('Content-Type', 'application/json')
            .send(jsonMetrics);
        } else {
          await reply.code(400).send({
            error: 'Invalid format. Supported: prometheus, json'
          });
        }
      } catch (error) {
        Logger.error('Error generating metrics', error);
        await reply.code(500).send({
          error: 'Failed to generate metrics'
        });
      }
    });
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('Server is already started');
    }

    try {
      await this.memoryEngine.initialize();

      const { host, port } = this.config.options;
      await this.server.listen({ host, port });

      this.isStarted = true;

      Logger.info(`Memorai MCP Server started`, {
        host,
        port,
        environment: this.config.isProduction() ? 'production' : 'development'
      });

    } catch (error) {
      Logger.error('Failed to start server', error);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      await this.server.close();
      await this.memoryEngine.close();

      this.isStarted = false;

      Logger.info('Memorai MCP Server stopped');

    } catch (error) {
      Logger.error('Error stopping server', error);
      throw error;
    }
  }

  /**
   * Get server health status
   */
  public async getHealth(): Promise<HealthStatus> {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    // Check memory engine health
    const engineHealth = await this.memoryEngine.getHealth();

    return {
      status: engineHealth.status === 'healthy' ? 'healthy' : 'degraded',
      version: '0.1.0',
      uptime,
      checks: [{
        name: 'memory_engine',
        status: engineHealth.status === 'healthy' ? 'pass' : 'fail',
        message: `Engine status: ${engineHealth.status}`
      },
      {
        name: 'memory_usage',
        status: memoryUsage.heapUsed < 1000000000 ? 'pass' : 'warn', // 1GB
        message: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`
      }
      ], metrics: this.metricsCollector.getServerMetrics()
    };
  }

  /**
   * Get server instance (for testing)
   */
  public getServer(): FastifyInstance {
    return this.server;
  }
}
