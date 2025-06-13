/**
 * @fileoverview Targeted coverage tests for MemoraiServer to improve coverage metrics
 * Focuses on specific uncovered lines rather than complex integration testing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoraiServer } from '../../src/server/MemoraiServer.js';
import type { MemoryEngine } from '@codai/memorai-core';

// Mock all external dependencies
vi.mock('fastify', () => ({
  default: vi.fn(() => ({
    register: vi.fn().mockResolvedValue(undefined),
    addHook: vi.fn(),
    setErrorHandler: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
    listen: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../config/ServerConfig.js', () => ({
  ServerConfig: {
    getInstance: vi.fn(() => ({
      options: {
        host: 'localhost',
        port: 6367,
        cors: true,
        helmet: true,
        rateLimit: { max: 100, timeWindow: 60000 },
        jwt: { secret: 'test-secret' },
        logging: { level: 'info', format: 'json', file: 'test.log' }
      },
      isProduction: vi.fn(() => false)
    }))
  }
}));

vi.mock('../utils/Logger.js', () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../middleware/AuthMiddleware.js', () => ({
  AuthMiddleware: vi.fn(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../middleware/RateLimitMiddleware.js', () => ({
  RateLimitMiddleware: vi.fn(() => ({
    checkRateLimit: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../middleware/TenantMiddleware.js', () => ({
  TenantMiddleware: vi.fn(() => ({
    loadTenant: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../handlers/MCPHandler.js', () => ({
  MCPHandler: vi.fn(() => ({
    handleRequest: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('MemoraiServer Targeted Coverage Tests', () => {
  let mockMemoryEngine: MemoryEngine;
  let server: MemoraiServer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMemoryEngine = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getHealth: vi.fn().mockResolvedValue({ status: 'healthy' }),
      remember: vi.fn(),
      recall: vi.fn(),
      forget: vi.fn(),
      getContext: vi.fn()
    } as unknown as MemoryEngine;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor Validation', () => {
    it('should throw error for null memory engine', () => {
      expect(() => {
        new MemoraiServer(null as any);
      }).toThrow('Memory engine cannot be null or undefined');
    });

    it('should throw error for undefined memory engine', () => {
      expect(() => {
        new MemoraiServer(undefined as any);
      }).toThrow('Memory engine cannot be null or undefined');
    });

    it('should create server successfully with valid memory engine', () => {
      expect(() => {
        server = new MemoraiServer(mockMemoryEngine);
      }).not.toThrow();
      expect(server).toBeDefined();
    });
  });

  describe('Health Check Logic', () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it('should return healthy status when memory engine is healthy', async () => {
      mockMemoryEngine.getHealth = vi.fn().mockResolvedValue({ status: 'healthy' });

      const health = await server.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.checks).toHaveLength(2);
      expect(health.checks[0].name).toBe('memory_engine');
      expect(health.checks[0].status).toBe('pass');
    });

    it('should return degraded status when memory engine is unhealthy', async () => {
      mockMemoryEngine.getHealth = vi.fn().mockResolvedValue({ status: 'unhealthy' });

      const health = await server.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.checks[0].status).toBe('fail');
    }); it('should warn about high memory usage', async () => {
      // Mock high memory usage (over 1GB)
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 1100000000, // 1.1GB
        external: 0,
        arrayBuffers: 0
      }) as any;

      const health = await server.getHealth();

      expect(health.checks[1].status).toBe('warn');
      expect(health.checks[1].message).toContain('MB used');

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });

    it('should pass memory check for normal usage', async () => {
      // Mock normal memory usage (under 1GB)
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        rss: 0,
        heapTotal: 0,
        heapUsed: 500000000, // 500MB
        external: 0,
        arrayBuffers: 0
      }) as any;

      const health = await server.getHealth();

      expect(health.checks[1].status).toBe('pass');

      // Restore original
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Server Lifecycle Edge Cases', () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it('should handle double start error', async () => {
      // Manually set isStarted to true to simulate already started server
      (server as any).isStarted = true;

      await expect(server.start()).rejects.toThrow('Server is already started');
    });

    it('should handle stop when not started gracefully', async () => {
      // Server is not started by default
      expect((server as any).isStarted).toBe(false);

      // Should not throw and should return cleanly
      await expect(server.stop()).resolves.toBeUndefined();
    });

    it('should handle memory engine initialization failure', async () => {
      const initError = new Error('Engine init failed');
      mockMemoryEngine.initialize = vi.fn().mockRejectedValue(initError);

      await expect(server.start()).rejects.toThrow('Engine init failed');
    });

    it('should handle server listen failure', async () => {
      const listenError = new Error('Port already in use');
      const mockServer = (server as any).server;
      mockServer.listen = vi.fn().mockRejectedValue(listenError);

      await expect(server.start()).rejects.toThrow('Port already in use');
    });

    it('should handle server close error during stop', async () => {
      // Start server first
      await server.start();

      const closeError = new Error('Close failed');
      const mockServer = (server as any).server;
      mockServer.close = vi.fn().mockRejectedValue(closeError);

      await expect(server.stop()).rejects.toThrow('Close failed');
    });

    it('should handle memory engine close error during stop', async () => {
      // Start server first
      await server.start();

      const closeError = new Error('Engine close failed');
      mockMemoryEngine.close = vi.fn().mockRejectedValue(closeError);

      await expect(server.stop()).rejects.toThrow('Engine close failed');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it('should return server instance for testing', () => {
      const fastifyInstance = server.getServer();
      expect(fastifyInstance).toBeDefined();
      expect(typeof fastifyInstance).toBe('object');
    });
  }); describe('Route Handler Coverage', () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it('should setup MCP route with proper handler', () => {
      const mockServer = (server as any).server;
      expect(mockServer.post).toHaveBeenCalledWith('/mcp', expect.any(Function));
    });

    it('should setup health route with proper handler', () => {
      const mockServer = (server as any).server;
      expect(mockServer.get).toHaveBeenCalledWith('/health', expect.any(Function));
    });

    it('should setup capabilities route with proper handler', () => {
      const mockServer = (server as any).server;
      expect(mockServer.get).toHaveBeenCalledWith('/capabilities', expect.any(Function));
    });

    it('should setup metrics route with proper handler', () => {
      const mockServer = (server as any).server;
      expect(mockServer.get).toHaveBeenCalledWith('/metrics', expect.any(Function));
    });
  });
});
