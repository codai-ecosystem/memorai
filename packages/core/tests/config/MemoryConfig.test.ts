/**
 * Comprehensive tests for MemoryConfig
 * Testing configuration validation, factory methods, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MemoryConfigManager,
  MemoryConfigFactory,
} from "../../src/config/MemoryConfig.js";

describe("MemoryConfigManager", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    // Clear all environment variables
    process.env = { ...originalEnv };
    // Set required encryption key for tests
    process.env.MEMORY_ENCRYPTION_KEY =
      "test-encryption-key-32-characters-long";
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("Configuration Loading", () => {
    it("should load configuration with defaults", () => {
      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://localhost:6333");
      expect(config.redis.url).toBe("redis://localhost:6379");
      expect(config.embedding.provider).toBe("openai");
      expect(config.embedding.model).toBe("text-embedding-3-small");
      expect(config.security.tenant_isolation).toBe(true);
      expect(config.security.audit_logs).toBe(true);
    });

    it("should override configuration with custom values", () => {
      const customConfig = {
        vector_db: {
          url: "http://custom:6333",
          collection: "custom-collection",
          dimension: 768,
        },
        embedding: {
          provider: "openai" as const,
          model: "text-embedding-ada-002",
          api_key: "custom-key",
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://custom:6333");
      expect(config.vector_db.collection).toBe("custom-collection");
      expect(config.vector_db.dimension).toBe(768);
      expect(config.embedding.model).toBe("text-embedding-ada-002");
      expect(config.embedding.api_key).toBe("custom-key");
    });
    it("should preserve defaults for non-overridden values", () => {
      const partialConfig = {
        vector_db: {
          url: "http://custom:6333",
          collection: "memories",
          dimension: 1536,
        },
      };

      const configManager = new MemoryConfigManager(partialConfig);
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://custom:6333");
      expect(config.vector_db.collection).toBe("memories"); // Should keep default
      expect(config.redis.url).toBe("redis://localhost:6379"); // Should keep default
    });

    it("should handle environment variables for defaults", () => {
      process.env.QDRANT_URL = "http://env-qdrant:6333";
      process.env.REDIS_URL = "redis://env-redis:6379";
      process.env.OPENAI_API_KEY = "env-openai-key";
      process.env.MEMORY_ENCRYPTION_KEY =
        "env-encryption-key-32-characters-long";

      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://env-qdrant:6333");
      expect(config.redis.url).toBe("redis://env-redis:6379");
      expect(config.embedding.api_key).toBe("env-openai-key");
      expect(config.security.encryption_key).toBe(
        "env-encryption-key-32-characters-long",
      );
    });
  });

  describe("Configuration Access Methods", () => {
    it("should provide vector DB configuration", () => {
      const customConfig = {
        vector_db: {
          url: "http://test:6333",
          api_key: "test-api-key",
          collection: "test-collection",
          dimension: 1024,
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const vectorConfig = configManager.getVectorDB();

      expect(vectorConfig.url).toBe("http://test:6333");
      expect(vectorConfig.api_key).toBe("test-api-key");
      expect(vectorConfig.collection).toBe("test-collection");
      expect(vectorConfig.dimension).toBe(1024);
    });

    it("should provide Redis configuration", () => {
      const customConfig = {
        redis: {
          url: "redis://test:6379",
          password: "test-password",
          db: 2,
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const redisConfig = configManager.getRedis();

      expect(redisConfig.url).toBe("redis://test:6379");
      expect(redisConfig.password).toBe("test-password");
      expect(redisConfig.db).toBe(2);
    });

    it("should provide embedding configuration", () => {
      const customConfig = {
        embedding: {
          provider: "openai" as const,
          model: "text-embedding-3-large",
          api_key: "test-embedding-key",
          endpoint: "https://custom-endpoint.com",
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const embeddingConfig = configManager.getEmbedding();

      expect(embeddingConfig.provider).toBe("openai");
      expect(embeddingConfig.model).toBe("text-embedding-3-large");
      expect(embeddingConfig.api_key).toBe("test-embedding-key");
      expect(embeddingConfig.endpoint).toBe("https://custom-endpoint.com");
    });

    it("should provide security configuration", () => {
      const customConfig = {
        security: {
          encryption_key: "test-encryption-key-32-characters-long",
          tenant_isolation: false,
          audit_logs: true,
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const securityConfig = configManager.getSecurity();

      expect(securityConfig.encryption_key).toBe(
        "test-encryption-key-32-characters-long",
      );
      expect(securityConfig.tenant_isolation).toBe(false);
      expect(securityConfig.audit_logs).toBe(true);
    });

    it("should provide performance configuration", () => {
      const customConfig = {
        performance: {
          max_query_time_ms: 200,
          cache_ttl_seconds: 600,
          batch_size: 50,
        },
      };

      const configManager = new MemoryConfigManager(customConfig);
      const performanceConfig = configManager.getPerformance();

      expect(performanceConfig.max_query_time_ms).toBe(200);
      expect(performanceConfig.cache_ttl_seconds).toBe(600);
      expect(performanceConfig.batch_size).toBe(50);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate encryption key length", () => {
      const invalidConfig = {
        security: {
          encryption_key: "short-key",
          tenant_isolation: true,
          audit_logs: false,
        },
      };

      expect(() => new MemoryConfigManager(invalidConfig)).toThrow(
        "Encryption key must be at least 32 characters long",
      );
    });

    it("should accept valid encryption key", () => {
      const validConfig = {
        security: {
          encryption_key: "valid-encryption-key-32-characters-long",
          tenant_isolation: true,
          audit_logs: false,
        },
      };

      expect(() => new MemoryConfigManager(validConfig)).not.toThrow();
    });
    it("should reject empty encryption key from environment", () => {
      process.env.MEMORY_ENCRYPTION_KEY = "";

      expect(() => new MemoryConfigManager()).toThrow(
        "Invalid memory configuration: Encryption key must be at least 32 characters long",
      );
    });
  });

  describe("Configuration Immutability", () => {
    it("should return a copy of the configuration", () => {
      const configManager = new MemoryConfigManager();
      const config1 = configManager.get();
      const config2 = configManager.get();

      expect(config1).not.toBe(config2); // Different object references
      expect(config1).toEqual(config2); // Same values
    });

    it("should not allow external modification of returned config", () => {
      const configManager = new MemoryConfigManager();
      const config = configManager.get();

      config.vector_db.url = "modified-url";

      // Getting config again should return original values
      const freshConfig = configManager.get();
      expect(freshConfig.vector_db.url).toBe("http://localhost:6333");
    });

    it("should return copies of subsection configurations", () => {
      const configManager = new MemoryConfigManager();
      const vectorConfig1 = configManager.getVectorDB();
      const vectorConfig2 = configManager.getVectorDB();

      expect(vectorConfig1).not.toBe(vectorConfig2);
      expect(vectorConfig1).toEqual(vectorConfig2);

      vectorConfig1.url = "modified";
      expect(vectorConfig2.url).toBe("http://localhost:6333");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined override values", () => {
      const configWithUndefined = {
        vector_db: {
          url: "http://test:6333",
          api_key: undefined,
          collection: "test",
          dimension: 1536,
        },
      };

      const configManager = new MemoryConfigManager(configWithUndefined);
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://test:6333");
      expect(config.vector_db.collection).toBe("test");
      expect(config.vector_db.api_key).toBeUndefined();
    });
    it("should handle deep merging of nested objects", () => {
      const configManager = new MemoryConfigManager({
        vector_db: {
          url: "http://custom:6333",
          collection: "memories",
          dimension: 1536,
          // Only override URL, not other vector_db properties
        },
      });

      const config = configManager.get();
      expect(config.vector_db.url).toBe("http://custom:6333");
      expect(config.vector_db.collection).toBe("memories"); // Should keep default
      expect(config.vector_db.dimension).toBe(1536); // Should keep default
    });

    it("should handle complex nested overrides", () => {
      const complexConfig = {
        vector_db: {
          url: "http://complex:6333",
          api_key: "complex-key",
          collection: "memories",
          dimension: 1536,
        },
        security: {
          encryption_key: "complex-encryption-key-32-characters-long",
          tenant_isolation: true,
          audit_logs: true,
        },
      };

      const configManager = new MemoryConfigManager(complexConfig);
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://complex:6333");
      expect(config.vector_db.api_key).toBe("complex-key");
      expect(config.vector_db.collection).toBe("memories"); // Default preserved
      expect(config.security.encryption_key).toBe(
        "complex-encryption-key-32-characters-long",
      );
      expect(config.security.tenant_isolation).toBe(true); // Default preserved
    });
  });
});

describe("MemoryConfigFactory", () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = { ...originalEnv };
    // Set required encryption key for tests
    process.env.MEMORY_ENCRYPTION_KEY =
      "test-encryption-key-32-characters-long";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Factory Methods", () => {
    it("should create config manager from environment", () => {
      const configManager = MemoryConfigFactory.fromEnv();
      expect(configManager).toBeInstanceOf(MemoryConfigManager);

      const config = configManager.get();
      expect(config).toBeDefined();
      expect(config.vector_db).toBeDefined();
      expect(config.redis).toBeDefined();
      expect(config.embedding).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    it("should create multiple independent instances", () => {
      const configManager1 = MemoryConfigFactory.fromEnv();
      const configManager2 = MemoryConfigFactory.fromEnv();

      expect(configManager1).not.toBe(configManager2);
      expect(configManager1).toBeInstanceOf(MemoryConfigManager);
      expect(configManager2).toBeInstanceOf(MemoryConfigManager);
    });

    it("should use environment variables when available", () => {
      process.env.QDRANT_URL = "http://factory-test:6333";
      process.env.OPENAI_API_KEY = "factory-test-key";

      const configManager = MemoryConfigFactory.fromEnv();
      const config = configManager.get();

      expect(config.vector_db.url).toBe("http://factory-test:6333");
      expect(config.embedding.api_key).toBe("factory-test-key");
    });
  });
});
