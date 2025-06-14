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
  private isStarted = false;
    constructor(memoryEngine: MemoryEngine) {
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
    
    this.setupMiddleware();
    this.setupRoutes();
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
      // Skip auth for health check and capabilities
      if (request.url === '/health' || request.url === '/capabilities') {
        return;
      }
      
      // Apply authentication
      await this.authMiddleware.authenticate(request, reply);
      
      // Apply tenant loading
      await this.tenantMiddleware.loadTenant(request, reply);
      
      // Apply rate limiting
      await this.rateLimitMiddleware.checkRateLimit(request, reply);
    });
    
    // Error handler
    this.server.setErrorHandler(async (error, request, reply) => {
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
      // TODO: Implement Prometheus metrics
      await reply.send({ message: 'Metrics endpoint not implemented' });
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
      checks: [        {
          name: 'memory_engine',
          status: engineHealth.status === 'healthy' ? 'pass' : 'fail',
          message: `Engine status: ${engineHealth.status}`
        },
        {
          name: 'memory_usage',
          status: memoryUsage.heapUsed < 1000000000 ? 'pass' : 'warn', // 1GB
          message: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used`
        }
      ],
      metrics: {
        requestsPerSecond: 0, // TODO: Implement metrics collection
        averageResponseTime: 0,
        memoryUsage: memoryUsage.heapUsed,
        activeConnections: 0,
        errorRate: 0
      }
    };
  }
  
  /**
   * Get server instance (for testing)
   */
  public getServer(): FastifyInstance {
    return this.server;
  }
}
