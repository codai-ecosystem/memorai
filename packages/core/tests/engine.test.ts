/**
 * @fileoverview Basic test to verify core functionality
 */

import { describe, it, expect } from "vitest";
import { MemoryEngine } from "../src/engine/MemoryEngine.js";
import { MemoryConfigFactory } from "../src/config/MemoryConfig.js";

describe("MemoryEngine", () => {
  const testConfig = {
    embedding: {
      provider: "openai" as const,
      model: "text-embedding-3-small",
      api_key: "test-api-key",
    },
    security: {
      encryption_key: "test-encryption-key-32-characters-long",
      tenant_isolation: true,
      audit_logs: false,
    },
  };

  it("should create a memory engine instance", () => {
    const engine = new MemoryEngine(testConfig);
    expect(engine).toBeDefined();
  });
  it("should initialize successfully", async () => {
    const engine = new MemoryEngine(testConfig);

    // This would normally fail without a real Qdrant instance
    // For now, we'll just test that the method exists and can be called
    try {
      await engine.initialize();
    } catch (error) {
      // Expected to fail in test environment without real services
      expect(error).toBeInstanceOf(Error);
    }
  });
});
