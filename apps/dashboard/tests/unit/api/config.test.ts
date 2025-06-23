import { describe, it, expect } from "vitest";
import { GET } from "../../../src/app/api/config/route";

describe("Config API Route", () => {
  describe("GET /api/config", () => {
    it("should return system configuration successfully", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("version");
      expect(data.data).toHaveProperty("environment");
      expect(data.data).toHaveProperty("features");
      expect(data.data).toHaveProperty("settings");
      expect(data.data).toHaveProperty("endpoints");
      expect(data.data).toHaveProperty("security");
      expect(data.data).toHaveProperty("providers");
    });

    it("should return valid version information", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.version).toBe("string");
      expect(data.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(typeof data.environment).toBe("string");
    });

    it("should return feature flags object", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.features).toBe("object");
      expect(typeof data.features.memoryStorage).toBe("boolean");
      expect(typeof data.features.vectorSearch).toBe("boolean");
      expect(typeof data.features.agentTracking).toBe("boolean");
      expect(typeof data.features.realTimeUpdates).toBe("boolean");
    });

    it("should return settings configuration", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.settings).toBe("object");
      expect(typeof data.settings.maxMemories).toBe("number");
      expect(typeof data.settings.retentionDays).toBe("number");
      expect(typeof data.settings.enableEmbeddings).toBe("boolean");
      expect(typeof data.settings.enableCache).toBe("boolean");

      expect(data.settings.maxMemories).toBeGreaterThan(0);
      expect(data.settings.retentionDays).toBeGreaterThan(0);
    });

    it("should return endpoint configuration", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.endpoints).toBe("object");
      expect(typeof data.endpoints.api).toBe("string");
      expect(typeof data.endpoints.websocket).toBe("string");

      expect(data.endpoints.api).toMatch(/^https?:\/\//);
      expect(data.endpoints.websocket).toMatch(/^wss?:\/\//);
    });

    it("should return security configuration", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.security).toBe("object");
      expect(typeof data.security.maxRequestsPerMinute).toBe("number");
      expect(typeof data.security.encryptionEnabled).toBe("boolean");
      expect(typeof data.security.authRequired).toBe("boolean");

      expect(data.security.maxRequestsPerMinute).toBeGreaterThan(0);
    });

    it("should return providers configuration", async () => {
      const response = await GET();
      const result = await response.json();
      const data = result.data;

      expect(typeof data.providers).toBe("object");
      expect(data.providers).toHaveProperty("embedding");
      expect(typeof data.providers.embedding).toBe("string");
    });

    it("should have consistent structure across multiple calls", async () => {
      const response1 = await GET();
      const result1 = await response1.json();
      const data1 = result1.data;

      const response2 = await GET();
      const result2 = await response2.json();
      const data2 = result2.data;

      expect(Object.keys(data1).sort()).toEqual(Object.keys(data2).sort());
      expect(data1.version).toBe(data2.version);
      expect(data1.environment).toBe(data2.environment);
    });
  });
});
