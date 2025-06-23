import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { memoryRouter } from "../../../src/routes/memory";
import { errorHandler } from "../../../src/middleware/errorHandler";
import {
  createMockMemoryEngine,
  createFailingMemoryEngine,
  generateTestMemory,
} from "../../helpers/testHelpers";

// Mock logger
vi.mock("../../../src/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Memory Routes", () => {
  let app: express.Application;
  let mockMemoryEngine: any;
  beforeEach(() => {
    app = express();
    app.use(express.json());

    mockMemoryEngine = createMockMemoryEngine();

    // Add memory engine to request
    app.use((req: any, res, next) => {
      req.memoryEngine = mockMemoryEngine;
      next();
    });

    app.use("/api/memory", memoryRouter);

    // Add error handler middleware
    app.use(errorHandler);
  });

  describe("POST /remember", () => {
    it("should store a memory successfully", async () => {
      const testMemory = generateTestMemory();

      const response = await request(app)
        .post("/api/memory/remember")
        .send(testMemory)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.memory).toBe("memory-1"); // Now returns memory ID string
      expect(response.body.message).toBe("Memory stored successfully");
      expect(mockMemoryEngine.remember).toHaveBeenCalledWith(
        testMemory.content,
        "default",
        testMemory.agentId,
        testMemory.metadata,
      );
    });
    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/api/memory/remember")
        .send({})
        .expect(400);

      expect(response.body.error).toContain("agentId");
    });

    it("should validate agentId is not empty", async () => {
      const response = await request(app)
        .post("/api/memory/remember")
        .send({ agentId: "", content: "test" })
        .expect(400);

      expect(response.body.error).toContain("agentId");
    });

    it("should validate content is not empty", async () => {
      const response = await request(app)
        .post("/api/memory/remember")
        .send({ agentId: "test", content: "" })
        .expect(400);

      expect(response.body.error).toContain("content");
    });
    it("should handle memory engine failure", async () => {
      const failingApp = express();
      failingApp.use(express.json());

      const failingEngine = createFailingMemoryEngine();
      failingApp.use((req: any, res, next) => {
        req.memoryEngine = failingEngine;
        next();
      });
      failingApp.use("/api/memory", memoryRouter);
      failingApp.use(errorHandler);

      const testMemory = generateTestMemory();

      const response = await request(failingApp)
        .post("/api/memory/remember")
        .send(testMemory)
        .expect(500);

      expect(response.body.error).toContain("Failed to store memory");
      expect(response.body.code).toBe("MEMORY_STORE_FAILED");
    });
    it("should handle missing memory engine", async () => {
      const noEngineApp = express();
      noEngineApp.use(express.json());

      noEngineApp.use((req: any, res, next) => {
        req.memoryEngine = null;
        next();
      });
      noEngineApp.use("/api/memory", memoryRouter);
      noEngineApp.use(errorHandler);

      const testMemory = generateTestMemory();

      const response = await request(noEngineApp)
        .post("/api/memory/remember")
        .send(testMemory)
        .expect(503);

      expect(response.body.error).toBe("Memory engine not available");
      expect(response.body.code).toBe("MEMORY_ENGINE_UNAVAILABLE");
    });
  });

  describe("POST /recall", () => {
    it("should recall memories successfully", async () => {
      const recallData = {
        agentId: "test-agent",
        query: "test query",
        limit: 5,
      };

      const response = await request(app)
        .post("/api/memory/recall")
        .send(recallData)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.memories).toBeDefined();
      expect(response.body.count).toBeDefined();
      expect(response.body.query).toBe(recallData.query);
      expect(mockMemoryEngine.recall).toHaveBeenCalledWith(
        recallData.query,
        "default",
        recallData.agentId,
        { limit: recallData.limit },
      );
    });
    it("should use default limit when not provided", async () => {
      const recallData = {
        agentId: "test-agent",
        query: "test query",
      };

      await request(app)
        .post("/api/memory/recall")
        .send(recallData)
        .expect(200);

      expect(mockMemoryEngine.recall).toHaveBeenCalledWith(
        recallData.query,
        "default",
        recallData.agentId,
        { limit: 10 }, // default limit
      );
    });

    it("should validate required fields for recall", async () => {
      const response = await request(app)
        .post("/api/memory/recall")
        .send({ agentId: "test" })
        .expect(400);

      expect(response.body.error).toContain("query");
    });

    it("should validate limit bounds", async () => {
      const response = await request(app)
        .post("/api/memory/recall")
        .send({
          agentId: "test",
          query: "test",
          limit: 101, // exceeds max
        })
        .expect(400);

      expect(response.body.error).toContain("limit");
    });
    it("should handle recall engine failure", async () => {
      const failingApp = express();
      failingApp.use(express.json());

      const failingEngine = createFailingMemoryEngine();
      failingApp.use((req: any, res, next) => {
        req.memoryEngine = failingEngine;
        next();
      });
      failingApp.use("/api/memory", memoryRouter);
      failingApp.use(errorHandler);

      const response = await request(failingApp)
        .post("/api/memory/recall")
        .send({ agentId: "test", query: "test" })
        .expect(500);

      expect(response.body.error).toContain("Failed to recall memories");
      expect(response.body.code).toBe("MEMORY_RECALL_FAILED");
    });
  });

  describe("POST /context", () => {
    it("should get context successfully", async () => {
      const contextData = {
        agentId: "test-agent",
        contextSize: 15,
      };

      const response = await request(app)
        .post("/api/memory/context")
        .send(contextData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.context).toBeDefined();
      expect(mockMemoryEngine.getContext).toHaveBeenCalledWith({
        tenant_id: "default",
        agent_id: contextData.agentId,
        max_memories: contextData.contextSize,
      });
    });
    it("should use default context size when not provided", async () => {
      const contextData = {
        agentId: "test-agent",
      };

      await request(app)
        .post("/api/memory/context")
        .send(contextData)
        .expect(200);

      expect(mockMemoryEngine.getContext).toHaveBeenCalledWith({
        tenant_id: "default",
        agent_id: contextData.agentId,
        max_memories: 10, // default context size
      });
    });

    it("should validate context size bounds", async () => {
      const response = await request(app)
        .post("/api/memory/context")
        .send({
          agentId: "test",
          contextSize: 51, // exceeds max
        })
        .expect(400);

      expect(response.body.error).toContain("contextSize");
    });
  });
  describe("DELETE /forget", () => {
    it("should forget a memory successfully", async () => {
      // First, store a memory
      const testMemory = generateTestMemory();
      const storeResponse = await request(app)
        .post("/api/memory/remember")
        .send(testMemory);

      const memoryId = storeResponse.body.memory; // Now just an ID string

      const forgetData = {
        agentId: testMemory.agentId,
        memoryId: memoryId,
      };

      const response = await request(app)
        .delete("/api/memory/forget")
        .send(forgetData)
        .expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Memory forgotten successfully");
      expect(mockMemoryEngine.forget).toHaveBeenCalledWith(forgetData.memoryId);
    });

    it("should handle memory not found", async () => {
      mockMemoryEngine.forget.mockResolvedValue(false);

      const response = await request(app)
        .delete("/api/memory/forget")
        .send({
          agentId: "test-agent",
          memoryId: "non-existent",
        })
        .expect(404);

      expect(response.body.error).toBe(
        "Memory not found or could not be deleted",
      );
      expect(response.body.code).toBe("MEMORY_NOT_FOUND");
    });

    it("should validate required fields for forget", async () => {
      const response = await request(app)
        .delete("/api/memory/forget")
        .send({ agentId: "test" })
        .expect(400);

      expect(response.body.error).toContain("memoryId");
    });
  });

  describe("GET /list/:agentId", () => {
    it("should list memories with pagination", async () => {
      const agentId = "test-agent";

      const response = await request(app)
        .get(`/api/memory/list/${agentId}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.memories).toBeDefined();
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
      });
    });

    it("should use default pagination values", async () => {
      const agentId = "test-agent";

      const response = await request(app)
        .get(`/api/memory/list/${agentId}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
    });

    it("should handle search parameter", async () => {
      const agentId = "test-agent";

      await request(app)
        .get(`/api/memory/list/${agentId}`)
        .query({ search: "test query" })
        .expect(200);
      expect(mockMemoryEngine.recall).toHaveBeenCalledWith(
        "test query",
        "default",
        agentId,
        { limit: expect.any(Number) },
      );
    });
  });

  describe("GET /export/:agentId", () => {
    it("should export memories as JSON", async () => {
      const agentId = "test-agent";

      const response = await request(app)
        .get(`/api/memory/export/${agentId}`)
        .expect(200);

      expect(response.headers["content-type"]).toContain("application/json");
      expect(response.headers["content-disposition"]).toContain("attachment");
      expect(response.body.agentId).toBe(agentId);
      expect(response.body.memories).toBeDefined();
      expect(response.body.exportedAt).toBeDefined();
    });

    it("should handle unsupported export format", async () => {
      const agentId = "test-agent";

      const response = await request(app)
        .get(`/api/memory/export/${agentId}`)
        .query({ format: "xml" })
        .expect(400);

      expect(response.body.error).toBe("Unsupported export format");
      expect(response.body.code).toBe("UNSUPPORTED_FORMAT");
    });
    it("should handle export engine failure", async () => {
      const failingApp = express();
      failingApp.use(express.json());

      const failingEngine = createFailingMemoryEngine();
      failingApp.use((req: any, res, next) => {
        req.memoryEngine = failingEngine;
        next();
      });
      failingApp.use("/api/memory", memoryRouter);
      failingApp.use(errorHandler);

      const response = await request(failingApp)
        .get("/api/memory/export/test-agent")
        .expect(500);

      expect(response.body.error).toContain("Failed to export memories");
      expect(response.body.code).toBe("MEMORY_EXPORT_FAILED");
    });
  });
});
