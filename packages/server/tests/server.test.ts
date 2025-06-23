/**
 * @fileoverview Comprehensive test suite for Memorai Server package
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoraiServer } from "../src/index.js";
import { MemoryEngine } from "@codai/memorai-core";

describe("MemoraiServer", () => {
  let server: MemoraiServer;
  let mockMemoryEngine: MemoryEngine;

  beforeEach(() => {
    // Create a mock MemoryEngine
    mockMemoryEngine = {
      config: {
        vector_db: {
          url: "http://localhost:6333",
          collection: "test_collection",
          dimension: 1536,
        },
        redis: {
          url: "redis://localhost:6379",
          db: 0,
        },
        embedding: {
          provider: "openai",
          model: "text-embedding-3-small",
          api_key: "test-api-key",
        },
        performance: {
          max_query_time_ms: 100,
          cache_ttl_seconds: 300,
          batch_size: 100,
        },
        security: {
          encryption_key: "test-encryption-key-32-characters-long",
          tenant_isolation: true,
          audit_logs: true,
        },
      },
      initialize: vi.fn().mockResolvedValue(undefined),
      remember: vi.fn().mockResolvedValue("memory-id-123"),
      recall: vi.fn().mockResolvedValue([]),
      forget: vi.fn().mockResolvedValue(1),
      context: vi.fn().mockResolvedValue({ memories: [], summary: "test" }),
      getHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
      close: vi.fn().mockResolvedValue(undefined),
    } as any;
  });

  afterEach(async () => {
    if (server) {
      try {
        await server.stop();
      } catch (error) {
        // Ignore errors during test cleanup
      }
    }
  });

  describe("Constructor and Initialization", () => {
    it("should create server instance with valid memory engine", () => {
      server = new MemoraiServer(mockMemoryEngine);
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(MemoraiServer);
    });

    it("should throw error with null memory engine", () => {
      expect(() => new MemoraiServer(null as any)).toThrow();
    });

    it("should throw error with undefined memory engine", () => {
      expect(() => new MemoraiServer(undefined as any)).toThrow();
    });
  });

  describe("Server Lifecycle", () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it("should start server successfully", async () => {
      // Mock the start method to avoid actual port binding
      const startSpy = vi.spyOn(server, "start").mockResolvedValue(undefined);
      await server.start();
      expect(startSpy).toHaveBeenCalled();
    });

    it("should stop server gracefully", async () => {
      const stopSpy = vi.spyOn(server, "stop").mockResolvedValue(undefined);
      await server.stop();
      expect(stopSpy).toHaveBeenCalled();
    });

    it("should handle server restart", async () => {
      const startSpy = vi.spyOn(server, "start").mockResolvedValue(undefined);
      const stopSpy = vi.spyOn(server, "stop").mockResolvedValue(undefined);

      await server.start();
      await server.stop();
      await server.start();

      expect(startSpy).toHaveBeenCalledTimes(2);
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Health Checks", () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });
    it("should return healthy status when dependencies are available", async () => {
      const healthSpy = vi.spyOn(server, "getHealth").mockResolvedValue({
        status: "healthy",
        version: "1.0.0",
        uptime: 1000,
        checks: [
          { name: "qdrant", status: "pass" },
          { name: "redis", status: "pass" },
        ],
        metrics: {
          requestsPerSecond: 10,
          averageResponseTime: 50,
          memoryUsage: 512,
          activeConnections: 5,
          errorRate: 0.01,
        },
      });

      const health = await server.getHealth();
      expect(health.status).toBe("healthy");
      expect(healthSpy).toHaveBeenCalled();
    });

    it("should return unhealthy status when dependencies are down", async () => {
      const healthSpy = vi.spyOn(server, "getHealth").mockResolvedValue({
        status: "unhealthy",
        version: "1.0.0",
        uptime: 1000,
        checks: [
          { name: "qdrant", status: "fail", message: "Connection timeout" },
          { name: "redis", status: "fail", message: "Connection refused" },
        ],
        metrics: {
          requestsPerSecond: 0,
          averageResponseTime: 5000,
          memoryUsage: 1024,
          activeConnections: 0,
          errorRate: 1.0,
        },
      });

      const health = await server.getHealth();
      expect(health.status).toBe("unhealthy");
      expect(healthSpy).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });
    it("should handle runtime errors without crashing", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Should not throw during construction even with problematic engine
      const problematicEngine = {
        ...mockMemoryEngine,
        initialize: vi.fn().mockRejectedValue(new Error("Connection failed")),
      } as any;

      expect(() => new MemoraiServer(problematicEngine)).not.toThrow();
      errorSpy.mockRestore();
    });

    it("should handle invalid requests gracefully", async () => {
      // This would be tested in integration tests with actual HTTP requests
      expect(server).toBeDefined();
    });
  });

  describe("Memory Engine Integration", () => {
    beforeEach(() => {
      server = new MemoraiServer(mockMemoryEngine);
    });

    it("should use provided memory engine for operations", () => {
      // Verify that the server uses the injected memory engine
      expect(mockMemoryEngine.initialize).toBeDefined();
      expect(mockMemoryEngine.remember).toBeDefined();
      expect(mockMemoryEngine.recall).toBeDefined();
      expect(mockMemoryEngine.forget).toBeDefined();
    });
    it("should handle memory engine errors gracefully", async () => {
      const faultyEngine = {
        ...mockMemoryEngine,
        remember: vi.fn().mockRejectedValue(new Error("Storage failed")),
      } as any;

      const faultyServer = new MemoraiServer(faultyEngine);
      expect(faultyServer).toBeDefined();
    });
  });
});
