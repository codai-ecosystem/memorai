import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  SecurityManager,
  ResilienceManager,
  PerformanceMonitor,
  MemoryEngine,
  MemoryConfigFactory,
} from "../../src/index.js";

describe("Advanced Features Integration", () => {
  let securityManager: SecurityManager;
  let resilienceManager: ResilienceManager;
  let performanceMonitor: PerformanceMonitor;
  let memoryEngine: MemoryEngine;

  beforeEach(async () => {
    // Initialize security manager
    securityManager = new SecurityManager({
      encryptionKey: "test-encryption-key-32-characters!",
      auditLog: true,
      dataRetention: {
        enabled: true,
        maxAge: 365,
        compressionEnabled: true,
      },
    });

    // Initialize resilience manager
    resilienceManager = new ResilienceManager();

    // Initialize performance monitor
    performanceMonitor = new PerformanceMonitor(60000, 10000); // 1 minute window, 10k max history    // Initialize memory engine with test config
    const configManager = MemoryConfigFactory.create({
      security: {
        encryption_key: "test-encryption-key-32-characters!",
        tenant_isolation: true,
        audit_logs: true,
      },
      vector_db: {
        url: "http://localhost:6333",
        collection: "test-memories",
        dimension: 1536,
        api_key: "test-key",
      },
      embedding: {
        provider: "openai",
        model: "text-embedding-3-small",
        api_key: "test-openai-key",
      },
    });

    memoryEngine = new MemoryEngine(configManager.get());
  });

  afterEach(async () => {
    await memoryEngine?.close();
  });

  describe("Security Integration", () => {
    it("should encrypt and decrypt sensitive data", () => {
      const sensitiveData = "user-password-123";
      const encrypted = securityManager.encrypt(sensitiveData);
      const decrypted = securityManager.decrypt(encrypted);

      expect(encrypted).not.toBe(sensitiveData);
      expect(decrypted).toBe(sensitiveData);
      expect(encrypted).toContain(":"); // IV:encrypted format
    });

    it("should hash and verify data", () => {
      const data = "test-data-to-hash";
      const hashed = securityManager.hash(data);
      const isValid = securityManager.verifyHash(data, hashed);
      const isInvalid = securityManager.verifyHash("wrong-data", hashed);

      expect(hashed).toContain(":"); // salt:hash format
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it("should validate input data correctly", () => {
      const validData = {
        username: "testuser",
        email: "test@example.com",
        age: 25,
      };

      const rules = [
        {
          field: "username",
          type: "string" as const,
          required: true,
          minLength: 3,
        },
        {
          field: "email",
          type: "string" as const,
          required: true,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        { field: "age", type: "number" as const, required: true },
      ];

      const result = securityManager.validateInput(validData, rules);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect validation errors", () => {
      const invalidData = {
        username: "ab", // too short
        email: "invalid-email", // invalid format
        age: "not-a-number", // wrong type
      };

      const rules = [
        {
          field: "username",
          type: "string" as const,
          required: true,
          minLength: 3,
        },
        {
          field: "email",
          type: "string" as const,
          required: true,
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        { field: "age", type: "number" as const, required: true },
      ];

      const result = securityManager.validateInput(invalidData, rules);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Resilience Integration", () => {
    it("should execute operations with resilience patterns", async () => {
      let callCount = 0;
      const operation = async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error("Simulated failure");
        }
        return "success";
      };

      // Execute with resilience (retry + circuit breaker)
      const result = await resilienceManager.executeResilient(
        "test-operation",
        operation,
        {
          retry: { maxAttempts: 3 },
        },
      );

      expect(result).toBe("success");
      expect(callCount).toBe(2);
    });

    it("should use fallback when operation fails", async () => {
      const failingOperation = async () => {
        throw new Error("Always fails");
      };

      const fallbackOperation = async () => {
        return "fallback-result";
      };

      const result = await resilienceManager.executeWithFallback(
        failingOperation,
        fallbackOperation,
        "fallback-test",
      );

      expect(result).toBe("fallback-result");
    });
  });

  describe("Performance Monitoring Integration", () => {
    it("should track query operations", () => {
      const timer = performanceMonitor.startQuery(
        "remember",
        "test-tenant",
        "test-agent",
      );

      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 10) {
        // Wait 10ms
      }

      timer.finish(true, undefined, 1, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.rememberCount).toBe(1);
      expect(metrics.avgRememberTime).toBeGreaterThan(5);
    });

    it("should track error operations", () => {
      const timer = performanceMonitor.startQuery(
        "recall",
        "test-tenant",
        "test-agent",
      );
      timer.finish(false, "Test error", 0, false);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.recallCount).toBe(1);
      expect(metrics.queryErrors).toBe(1);
      expect(metrics.querySuccessRate).toBe(0);
    });

    it("should calculate cache hit rates", () => {
      // Record cache hits and misses
      const timer1 = performanceMonitor.startQuery("recall", "test-tenant");
      timer1.finish(true, undefined, 5, true); // cache hit

      const timer2 = performanceMonitor.startQuery("recall", "test-tenant");
      timer2.finish(true, undefined, 3, false); // cache miss

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
      expect(metrics.cacheHitRate).toBe(0.5);
    });
  });

  describe("Integrated Security and Performance", () => {
    it("should monitor security operations performance", () => {
      const data = "sensitive-data-to-encrypt";

      // Manually time encryption operation
      const encryptTimer = performanceMonitor.startQuery(
        "remember",
        "security-tenant",
      );
      const encrypted = securityManager.encrypt(data);
      encryptTimer.finish(true, undefined, 1, false);

      // Manually time decryption operation
      const decryptTimer = performanceMonitor.startQuery(
        "recall",
        "security-tenant",
      );
      const decrypted = securityManager.decrypt(encrypted);
      decryptTimer.finish(true, undefined, 1, false);

      expect(decrypted).toBe(data);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.rememberCount).toBe(1);
      expect(metrics.recallCount).toBe(1);
    });
  });

  describe("Integrated Resilience and Security", () => {
    it("should handle security validation with retry logic", async () => {
      let attemptCount = 0;

      const secureOperation = async () => {
        attemptCount++;

        // Simulate intermittent validation failure
        if (attemptCount < 2) {
          throw new Error("Validation temporarily unavailable");
        }

        const testData = { username: "testuser", age: 25 };
        const rules = [
          { field: "username", type: "string" as const, required: true },
          { field: "age", type: "number" as const, required: true },
        ];

        return securityManager.validateInput(testData, rules);
      };

      const result = await resilienceManager.executeResilient(
        "secure-validation",
        secureOperation,
        {
          retry: { maxAttempts: 3 },
        },
      );

      expect(result.isValid).toBe(true);
      expect(attemptCount).toBe(2);
    });
  });
});
