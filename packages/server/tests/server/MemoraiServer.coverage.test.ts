/**
 * @fileoverview Targeted MemoraiServer tests to achieve 95%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockedObject } from 'vitest';
import { MemoraiServer } from '../../src/server/MemoraiServer.js';
import { MemoryEngine } from '@codai/memorai-core';

// Simple mocks
vi.mock('@codai/memorai-core');
vi.mock('../../src/config/ServerConfig.js', () => ({
  ServerConfig: {
    getInstance: vi.fn(() => ({
      options: {
        port: 3000,
        host: 'localhost',
        cors: true,
        helmet: true,
        rateLimit: { max: 100, timeWindow: '1 minute', cache: 5000 },
        jwt: { secret: 'test-secret', expiresIn: '24h', issuer: 'memorai-mcp' },
        logging: { level: 'info', format: 'json' }
      },
      isProduction: vi.fn(() => false)
    }))
  }
}));
vi.mock('../../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), error: vi.fn() } }));
vi.mock('../../src/middleware/AuthMiddleware.js', () => ({ AuthMiddleware: vi.fn() }));
vi.mock('../../src/middleware/RateLimitMiddleware.js', () => ({ RateLimitMiddleware: vi.fn() }));
vi.mock('../../src/middleware/TenantMiddleware.js', () => ({ TenantMiddleware: vi.fn() }));
vi.mock('../../src/handlers/MCPHandler.js', () => ({ MCPHandler: vi.fn() }));

// Mock Fastify at the module level
const mockFastifyInstance = {
  register: vi.fn(),
  addHook: vi.fn(),
  setErrorHandler: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined)
};

vi.mock('fastify', () => ({
  default: vi.fn(() => mockFastifyInstance)
}));

describe('MemoraiServer Coverage Tests', () => {
  let memoryEngine: MockedObject<MemoryEngine>;
  let server: MemoraiServer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    memoryEngine = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getHealth: vi.fn().mockResolvedValue({
        status: 'healthy',
        initialized: true,
        components: {}
      })
    } as any;
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Server Lifecycle Coverage', () => {
    it('should start server and set isStarted flag', async () => {
      server = new MemoraiServer(memoryEngine);
      
      await server.start();
      
      expect(memoryEngine.initialize).toHaveBeenCalled();
      expect(mockFastifyInstance.listen).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3000
      });
    });

    it('should prevent double start', async () => {
      server = new MemoraiServer(memoryEngine);
      await server.start();
      
      await expect(server.start()).rejects.toThrow('Server is already started');
    });

    it('should handle initialization error', async () => {
      const error = new Error('Init failed');
      memoryEngine.initialize.mockRejectedValue(error);
      
      server = new MemoraiServer(memoryEngine);
      
      await expect(server.start()).rejects.toThrow(error);
    });

    it('should handle listen error', async () => {
      const error = new Error('Listen failed');
      mockFastifyInstance.listen.mockRejectedValue(error);
      
      server = new MemoraiServer(memoryEngine);
      
      await expect(server.start()).rejects.toThrow(error);
    });    it('should handle stop when not started', async () => {
      server = new MemoraiServer(memoryEngine);
      
      // Should not throw
      await server.stop();
      
      expect(mockFastifyInstance.close).not.toHaveBeenCalled();
      expect(memoryEngine.close).not.toHaveBeenCalled();
    });
  });

  describe('Health Check Coverage', () => {
    beforeEach(() => {
      server = new MemoraiServer(memoryEngine);
    });

    it('should return healthy status', async () => {
      memoryEngine.getHealth.mockResolvedValue({
        status: 'healthy',
        initialized: true,
        components: {}
      });

      const health = await server.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.checks).toHaveLength(2);
      expect(health.checks[0].name).toBe('memory_engine');
      expect(health.checks[0].status).toBe('pass');
    });

    it('should return degraded status for unhealthy engine', async () => {
      memoryEngine.getHealth.mockResolvedValue({
        status: 'unhealthy',
        initialized: false,
        components: {}
      });

      const health = await server.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks[0].status).toBe('fail');
    });

    it('should include memory usage check with pass status', async () => {
      // Mock low memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        heapTotal: 120 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024
      }) as any;

      const health = await server.getHealth();

      expect(health.checks).toContainEqual({
        name: 'memory_usage',
        status: 'pass',
        message: '100MB used'
      });

      process.memoryUsage = originalMemoryUsage;
    });

    it('should include memory usage check with warn status', async () => {
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 1200 * 1024 * 1024, // 1.2GB
        rss: 1300 * 1024 * 1024,
        heapTotal: 1250 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 25 * 1024 * 1024
      }) as any;

      const health = await server.getHealth();

      expect(health.checks).toContainEqual({
        name: 'memory_usage',
        status: 'warn',
        message: '1200MB used'
      });

      process.memoryUsage = originalMemoryUsage;
    });

    it('should include metrics and version info', async () => {
      const health = await server.getHealth();

      expect(health.version).toBe('0.1.0');
      expect(health.uptime).toBeTypeOf('number');
      expect(health.metrics).toEqual({
        requestsPerSecond: 0,
        averageResponseTime: 0,
        memoryUsage: expect.any(Number),
        activeConnections: 0,
        errorRate: 0
      });
    });
  });

  describe('Basic Functionality Coverage', () => {
    it('should create server instance', () => {
      server = new MemoraiServer(memoryEngine);
      expect(server).toBeDefined();
    });

    it('should return server instance for testing', () => {
      server = new MemoraiServer(memoryEngine);
      const instance = server.getServer();
      expect(instance).toBe(mockFastifyInstance);
    });

    it('should validate memory engine parameter', () => {
      expect(() => new MemoraiServer(null as any)).toThrow('Memory engine cannot be null or undefined');
      expect(() => new MemoraiServer(undefined as any)).toThrow('Memory engine cannot be null or undefined');
    });
  });

  describe('Route Registration Coverage', () => {
    it('should register routes during construction', () => {
      server = new MemoraiServer(memoryEngine);
      
      // Verify route registration calls
      expect(mockFastifyInstance.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
      expect(mockFastifyInstance.get).toHaveBeenCalledWith('/health', expect.any(Function));
      expect(mockFastifyInstance.get).toHaveBeenCalledWith('/capabilities', expect.any(Function));
      expect(mockFastifyInstance.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
    });

    it('should register middleware during construction', () => {
      server = new MemoraiServer(memoryEngine);
      
      // Verify middleware registration
      expect(mockFastifyInstance.register).toHaveBeenCalled();
      expect(mockFastifyInstance.addHook).toHaveBeenCalledWith('preHandler', expect.any(Function));
      expect(mockFastifyInstance.setErrorHandler).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Route Handler Coverage', () => {
    it('should handle health route with healthy status code', async () => {
      server = new MemoraiServer(memoryEngine);
      
      // Get the health route handler
      const healthCall = mockFastifyInstance.get.mock.calls.find(
        call => call[0] === '/health'
      );
      expect(healthCall).toBeDefined();

      const handler = healthCall![1];
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(undefined)
      };

      memoryEngine.getHealth.mockResolvedValue({
        status: 'healthy',
        initialized: true,
        components: {}
      });

      await handler({}, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should handle health route with unhealthy status code', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const healthCall = mockFastifyInstance.get.mock.calls.find(
        call => call[0] === '/health'
      );
      const handler = healthCall![1];
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(undefined)
      };      memoryEngine.getHealth.mockResolvedValue({
        status: 'unhealthy',
        initialized: false,
        components: {}
      });

      await handler({}, mockReply);

      // MemoraiServer converts 'unhealthy' to 'degraded' which gets 200 status
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should handle capabilities route', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const capabilitiesCall = mockFastifyInstance.get.mock.calls.find(
        call => call[0] === '/capabilities'
      );
      const handler = capabilitiesCall![1];
      const mockReply = {
        send: vi.fn().mockResolvedValue(undefined)
      };

      await handler({}, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        methods: ['memory/remember', 'memory/recall', 'memory/forget', 'memory/context'],
        features: ['semantic_search', 'temporal_awareness', 'context_generation', 'multi_tenant', 'encryption'],
        version: '0.1.0'
      });
    });

    it('should handle metrics route', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const metricsCall = mockFastifyInstance.get.mock.calls.find(
        call => call[0] === '/metrics'
      );
      const handler = metricsCall![1];
      const mockReply = {
        send: vi.fn().mockResolvedValue(undefined)
      };

      await handler({}, mockReply);

      expect(mockReply.send).toHaveBeenCalledWith({
        message: 'Metrics endpoint not implemented'
      });
    });
  });

  describe('Error Handler Coverage', () => {
    it('should handle errors with JSON-RPC format', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const errorHandlerCall = mockFastifyInstance.setErrorHandler.mock.calls[0];
      const errorHandler = errorHandlerCall[0];
      
      const mockError = new Error('Test error');
      const mockRequest = {};
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockResolvedValue(undefined)
      };

      await errorHandler(mockError, mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
          data: {
            type: 'server_error',
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('PreHandler Hook Coverage', () => {
    it('should skip auth for health endpoint', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const preHandlerCall = mockFastifyInstance.addHook.mock.calls.find(
        call => call[0] === 'preHandler'
      );
      const preHandler = preHandlerCall![1];
      
      const mockRequest = { url: '/health' };
      const mockReply = {};

      const result = await preHandler(mockRequest, mockReply);
      expect(result).toBeUndefined();
    });

    it('should skip auth for capabilities endpoint', async () => {
      server = new MemoraiServer(memoryEngine);
      
      const preHandlerCall = mockFastifyInstance.addHook.mock.calls.find(
        call => call[0] === 'preHandler'
      );
      const preHandler = preHandlerCall![1];
      
      const mockRequest = { url: '/capabilities' };
      const mockReply = {};

      const result = await preHandler(mockRequest, mockReply);
      expect(result).toBeUndefined();
    });
  });
});
