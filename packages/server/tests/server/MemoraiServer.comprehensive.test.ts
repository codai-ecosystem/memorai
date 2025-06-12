/**
 * @fileoverview Comprehensive tests for MemoraiServer to achieve 95%+ coverage
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

describe('MemoraiServer Comprehensive Coverage Tests', () => {
  let memoryEngine: MockedObject<MemoryEngine>;
  let server: MemoraiServer;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset the Fastify mock to resolved state
    mockFastifyInstance.listen.mockResolvedValue(undefined);
    mockFastifyInstance.close.mockResolvedValue(undefined);
    
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
        // Ignore errors during cleanup
      }
    }
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully', async () => {
      server = new MemoraiServer(memoryEngine);

      await server.start();

      expect(memoryEngine.initialize).toHaveBeenCalled();
      expect(mockFastifyInstance.listen).toHaveBeenCalledWith({
        host: expect.any(String),
        port: expect.any(Number)
      });
    });

    it('should handle start error when server is already started', async () => {
      server = new MemoraiServer(memoryEngine);

      await server.start();

      await expect(server.start()).rejects.toThrow('Server is already started');
    });

    it('should handle memory engine initialization failure', async () => {
      const initError = new Error('Memory engine initialization failed');
      memoryEngine.initialize.mockRejectedValue(initError);

      server = new MemoraiServer(memoryEngine);

      await expect(server.start()).rejects.toThrow(initError);
    });

    it('should handle server listen failure', async () => {
      const listenError = new Error('Server listen failed');
      mockFastifyInstance.listen.mockRejectedValue(listenError);

      server = new MemoraiServer(memoryEngine);

      await expect(server.start()).rejects.toThrow(listenError);
    });

    it('should stop server successfully', async () => {
      server = new MemoraiServer(memoryEngine);
      await server.start();

      await server.stop();

      expect(mockFastifyInstance.close).toHaveBeenCalled();
      expect(memoryEngine.close).toHaveBeenCalled();
    });

    it('should handle stop when server is not started', async () => {
      server = new MemoraiServer(memoryEngine);

      // Should not throw error
      await server.stop();

      expect(mockFastifyInstance.close).not.toHaveBeenCalled();
      expect(memoryEngine.close).not.toHaveBeenCalled();
    });

    it('should handle server close error during stop', async () => {
      const closeError = new Error('Server close failed');
      mockFastifyInstance.close.mockRejectedValue(closeError);

      server = new MemoraiServer(memoryEngine);
      await server.start();

      await expect(server.stop()).rejects.toThrow(closeError);
    });

    it('should handle memory engine close error during stop', async () => {
      const closeError = new Error('Memory engine close failed');
      memoryEngine.close.mockRejectedValue(closeError);

      server = new MemoraiServer(memoryEngine);
      await server.start();
      
      await expect(server.stop()).rejects.toThrow(closeError);
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      server = new MemoraiServer(memoryEngine);
    });

    it('should return healthy status when memory engine is healthy', async () => {
      memoryEngine.getHealth.mockResolvedValue({
        status: 'healthy',
        initialized: true,
        components: {}
      });

      const health = await server.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.checks).toContainEqual({
        name: 'memory_engine',
        status: 'pass',
        message: 'Engine status: healthy'
      });
    });

    it('should return degraded status when memory engine is unhealthy', async () => {
      memoryEngine.getHealth.mockResolvedValue({
        status: 'unhealthy',
        initialized: true,
        components: {}
      });

      const health = await server.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks).toContainEqual({
        name: 'memory_engine',
        status: 'fail',
        message: 'Engine status: unhealthy'
      });
    });

    it('should return degraded status when memory engine is degraded', async () => {
      memoryEngine.getHealth.mockResolvedValue({
        status: 'degraded',
        initialized: true,
        components: {}
      });

      const health = await server.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks).toContainEqual({
        name: 'memory_engine',
        status: 'fail',
        message: 'Engine status: degraded'
      });
    });

    it('should include memory usage check with pass status for low memory', async () => {
      // Mock process.memoryUsage to return low memory usage
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

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });    it('should include memory usage check with warn status for high memory', async () => {
      // Mock process.memoryUsage to return high memory usage (over 1GB)
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        heapUsed: 1200 * 1024 * 1024, // 1200MB (over 1GB threshold)
        rss: 1500 * 1024 * 1024,
        heapTotal: 1300 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        arrayBuffers: 20 * 1024 * 1024
      }) as any;

      const health = await server.getHealth();

      expect(health.checks).toContainEqual({
        name: 'memory_usage',
        status: 'warn',
        message: '1200MB used'
      });

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });
});
