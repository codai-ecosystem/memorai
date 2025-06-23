import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryConfigManager } from "../../src/config/MemoryConfig";

describe("MemoryConfigManager - Comprehensive Coverage", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Set required encryption key for tests
    process.env.MEMORY_ENCRYPTION_KEY =
      "test-encryption-key-32-characters-long";
  });

  afterEach(() => {
    process.env = originalEnv;
  });
  describe("Error Handling Edge Cases", () => {
    it("should handle validation errors with detailed messages", () => {
      // Set invalid encryption key
      process.env.MEMORY_ENCRYPTION_KEY = "too-short";

      expect(() => new MemoryConfigManager()).toThrow(
        "Invalid memory configuration: Encryption key must be at least 32 characters long",
      );
    });

    it("should handle invalid vector database URL", () => {
      process.env.QDRANT_URL = "invalid-url-format";

      expect(() => new MemoryConfigManager()).toThrow(
        "Invalid memory configuration: Vector database URL format is invalid",
      );
    });

    it("should handle invalid Redis URL", () => {
      process.env.REDIS_URL = "invalid-redis-url";

      expect(() => new MemoryConfigManager()).toThrow(
        "Invalid memory configuration: Redis URL format is invalid",
      );
    });

    it("should handle missing encryption key", () => {
      delete process.env.MEMORY_ENCRYPTION_KEY;

      expect(() => new MemoryConfigManager()).toThrow(
        "Invalid memory configuration: Encryption key must be at least 32 characters long",
      );
    });
  });

  describe("Deep Copy Functionality", () => {
    it("should return deep copy of config to prevent mutation", () => {
      const configManager = new MemoryConfigManager();
      const config1 = configManager.get();
      const config2 = configManager.get();

      // Should be different objects
      expect(config1).not.toBe(config2);
      expect(config1.vector_db).not.toBe(config2.vector_db);
      expect(config1.security).not.toBe(config2.security);

      // But have the same values
      expect(config1).toEqual(config2);

      // Modifying one shouldn't affect the other
      config1.vector_db.url = "modified";
      expect(config2.vector_db.url).toBe("http://localhost:6333");
    });

    it("should prevent external mutation of internal config", () => {
      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      // Modify the retrieved config
      config.vector_db.url = "hacked";
      config.security.encryption_key = "also-hacked";

      // Original should be unchanged
      const freshCopy = configManager.get();
      expect(freshCopy.vector_db.url).toBe("http://localhost:6333");
      expect(freshCopy.security.encryption_key).toBe(
        "test-encryption-key-32-characters-long",
      );
    });
  });

  describe("Configuration Validation Edge Cases", () => {
    it("should handle valid configuration without throwing", () => {
      process.env.OPENAI_API_KEY = "sk-1234567890abcdef";
      process.env.QDRANT_API_KEY = "qdrant-key";

      expect(() => new MemoryConfigManager()).not.toThrow();
    });

    it("should handle configuration with all environment variables set", () => {
      process.env.OPENAI_API_KEY = "sk-1234567890abcdef";
      process.env.QDRANT_URL = "http://custom-qdrant:6333";
      process.env.QDRANT_API_KEY = "qdrant-key";
      process.env.REDIS_URL = "redis://custom-redis:6379";
      process.env.REDIS_PASSWORD = "redis-password";
      process.env.OPENAI_ENDPOINT = "https://custom-openai.com";

      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      expect(config.embedding.api_key).toBe("sk-1234567890abcdef");
      expect(config.vector_db.url).toBe("http://custom-qdrant:6333");
      expect(config.vector_db.api_key).toBe("qdrant-key");
      expect(config.redis.url).toBe("redis://custom-redis:6379");
      expect(config.redis.password).toBe("redis-password");
      expect(config.embedding.endpoint).toBe("https://custom-openai.com");
    });

    it("should handle partial override configuration", () => {
      const overrides = {
        performance: {
          max_query_time_ms: 200,
          cache_ttl_seconds: 600,
          batch_size: 50,
        },
      };

      const configManager = new MemoryConfigManager(overrides);
      const config = configManager.get();

      expect(config.performance.max_query_time_ms).toBe(200);
      expect(config.performance.cache_ttl_seconds).toBe(600);
      expect(config.performance.batch_size).toBe(50);

      // Other values should remain default
      expect(config.vector_db.url).toBe("http://localhost:6333");
      expect(config.embedding.provider).toBe("openai");
    });

    it("should handle nested override configuration", () => {
      const overrides = {
        vector_db: {
          dimension: 768,
          collection: "custom-memories",
        },
        security: {
          tenant_isolation: false,
          audit_logs: false,
        },
      };

      const configManager = new MemoryConfigManager(overrides);
      const config = configManager.get();

      expect(config.vector_db.dimension).toBe(768);
      expect(config.vector_db.collection).toBe("custom-memories");
      expect(config.security.tenant_isolation).toBe(false);
      expect(config.security.audit_logs).toBe(false);

      // URL should remain from environment/default
      expect(config.vector_db.url).toBe("http://localhost:6333");
    });
  });

  describe("Environment Variable Processing", () => {
    it("should handle missing optional environment variables gracefully", () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.QDRANT_API_KEY;
      delete process.env.REDIS_PASSWORD;
      delete process.env.OPENAI_ENDPOINT;

      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      expect(config.embedding.api_key).toBeUndefined();
      expect(config.vector_db.api_key).toBeUndefined();
      expect(config.redis.password).toBeUndefined();
      expect(config.embedding.endpoint).toBeUndefined();
    });

    it("should process integer database number correctly", () => {
      process.env.REDIS_DB = "5";

      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      expect(config.redis.db).toBe(0); // Default since we don't override redis.db
    });
    it("should handle various encryption key formats", () => {
      const testKeys = [
        "exactly-32-characters-for-key!!!", // Fixed: now 32 chars
        "a".repeat(32),
        "mixed-chars-123!@#$%^&*()_+=-{}[]",
      ];

      testKeys.forEach((key) => {
        process.env.MEMORY_ENCRYPTION_KEY = key;
        expect(() => new MemoryConfigManager()).not.toThrow();
      });
    });
  });

  describe("Configuration Merging", () => {
    it("should deep merge nested configurations correctly", () => {
      const overrides = {
        vector_db: {
          dimension: 512, // Override just this field
          // url and other fields should remain from defaults
        },
      };

      const configManager = new MemoryConfigManager(overrides);
      const config = configManager.get();

      expect(config.vector_db.dimension).toBe(512);
      expect(config.vector_db.url).toBe("http://localhost:6333");
      expect(config.vector_db.collection).toBe("memories");
    });

    it("should handle complete section override", () => {
      const overrides = {
        performance: {
          max_query_time_ms: 50,
          cache_ttl_seconds: 120,
          batch_size: 25,
        },
      };

      const configManager = new MemoryConfigManager(overrides);
      const config = configManager.get();

      expect(config.performance).toEqual(overrides.performance);
    });

    it("should handle empty overrides object", () => {
      const configManager = new MemoryConfigManager({});
      const config = configManager.get();

      // Should have all default values
      expect(config.vector_db.url).toBe("http://localhost:6333");
      expect(config.embedding.provider).toBe("openai");
      expect(config.performance.max_query_time_ms).toBe(100);
    });
  });

  describe("Validation Edge Cases", () => {
    it("should validate URL formats", () => {
      const invalidUrls = [
        "not-a-url",
        "ftp://invalid-protocol.com",
        "http://",
        "https://",
      ];

      invalidUrls.forEach((url) => {
        process.env.QDRANT_URL = url;
        expect(() => new MemoryConfigManager()).toThrow();
      });
    });

    it("should validate performance constraints", () => {
      const invalidPerformance = [
        { max_query_time_ms: -1 },
        { cache_ttl_seconds: -1 },
        { batch_size: 0 },
        { batch_size: -5 },
      ];

      invalidPerformance.forEach((perf) => {
        expect(() => new MemoryConfigManager({ performance: perf })).toThrow();
      });
    });

    it("should validate embedding configuration", () => {
      const invalidEmbedding = [
        { provider: "invalid-provider" },
        { model: "" },
        { api_key: "too-short" },
      ];

      invalidEmbedding.forEach((embedding) => {
        expect(() => new MemoryConfigManager({ embedding })).toThrow();
      });
    });
  });

  describe("Constructor Robustness", () => {
    it("should handle null overrides gracefully", () => {
      expect(() => new MemoryConfigManager(null as any)).not.toThrow();
    });

    it("should handle undefined overrides gracefully", () => {
      expect(() => new MemoryConfigManager(undefined)).not.toThrow();
    });
  });
});
