import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import request from "supertest";
import express from "express";
import { UnifiedMemoryEngine } from "@codai/memorai-core";
import {
  generateTestMemory,
  generateTestMemories,
  setTestEnv,
} from "../helpers/testHelpers";

// Mock memory engine core completely
vi.mock("@codai/memorai-core", () => ({
  UnifiedMemoryEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    remember: vi
      .fn()
      .mockImplementation(
        async (agentId: string, content: string, metadata?: any) => ({
          id: `memory-${Math.random().toString(36).substr(2, 9)}`,
          agentId,
          content,
          metadata: metadata || {},
          timestamp: new Date().toISOString(),
          similarity: 1.0,
        }),
      ),
    recall: vi
      .fn()
      .mockImplementation(
        async (agentId: string, query: string, limit: number = 10) => {
          const memories = generateTestMemories(Math.min(limit, 5), agentId);
          return memories.map((m) => ({ ...m, similarity: 0.9 }));
        },
      ),
    forget: vi.fn().mockResolvedValue(true),
    getContext: vi
      .fn()
      .mockImplementation(
        async (agentId: string, contextSize: number = 10) => ({
          agentId,
          memories: generateTestMemories(Math.min(contextSize, 3), agentId),
          contextSize: 3,
          summary: `Context for ${agentId}`,
        }),
      ),
    getTierInfo: vi.fn().mockReturnValue({
      level: "mock",
      currentTier: "mock",
      message: "Mock memory engine for integration testing",
      capabilities: {
        embedding: true,
        similarity: true,
        persistence: true,
        scalability: false,
      },
    }),
    testTier: vi.fn().mockImplementation(async (tier: string) => {
      if (!tier) {
        throw new Error("Tier not specified");
      }
      if (["mock", "basic", "smart", "advanced"].includes(tier)) {
        return {
          success: true,
          message: `Tier '${tier}' is available and working`,
        };
      } else {
        throw new Error(`Invalid tier: ${tier}`);
      }
    }),
    getStatistics: vi.fn().mockResolvedValue({
      totalMemories: 10,
      memoryTypes: { semantic: 5, episodic: 3, procedural: 2, meta: 0 },
      avgConfidence: 0.9,
      recentActivity: 5,
      currentTier: "mock",
    }),
  })),
}));

// Import after mocking
import { memoryRouter } from "../../src/routes/memory";
import { configRouter } from "../../src/routes/config";
import { statsRouter } from "../../src/routes/stats";
import { errorHandler } from "../../src/middleware/errorHandler";

describe("API Integration Tests", () => {
  let app: express.Application;
  let restoreEnv: () => void;
  let mockMemoryEngine: any;

  beforeAll(() => {
    restoreEnv = setTestEnv({
      NODE_ENV: "test",
      CORS_ORIGIN: "http://localhost:3000",
    });
  });

  afterAll(() => {
    restoreEnv();
  });

  beforeEach(() => {
    // Create fresh app instance for each test
    app = express();
    app.use(express.json());

    // Create mock memory engine
    mockMemoryEngine = new UnifiedMemoryEngine({});

    // Add memory engine to request
    app.use((req: any, res, next) => {
      req.memoryEngine = mockMemoryEngine;
      next();
    });

    // Add routes
    app.use("/api/memory", memoryRouter);
    app.use("/api/config", configRouter);
    app.use("/api/stats", statsRouter);

    // Health check
    app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        memoryEngine: {
          initialized: !!mockMemoryEngine,
          tier: mockMemoryEngine?.getTierInfo?.()?.currentTier || "none",
        },
      });
    });

    // Error handling
    app.use(errorHandler);
    app.use("*", (req, res) => {
      res.status(404).json({ error: "Endpoint not found" });
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toMatchObject({
        status: "healthy",
        timestamp: expect.any(String),
        version: expect.any(String),
        memoryEngine: {
          initialized: true,
          tier: "mock",
        },
      });
    });
  });

  describe("Memory Workflow Integration", () => {
    const testAgent = "integration-test-agent";

    it("should complete full memory workflow", async () => {
      // 1. Store a memory
      const memoryData = generateTestMemory({ agentId: testAgent });
      const storeResponse = await request(app)
        .post("/api/memory/remember")
        .send(memoryData)
        .expect(200);

      expect(storeResponse.body.success).toBe(true);
      expect(storeResponse.body.memory.id).toBeDefined();

      // 2. Recall memories
      const recallResponse = await request(app)
        .post("/api/memory/recall")
        .send({
          agentId: testAgent,
          query: "test",
          limit: 10,
        })
        .expect(200);

      expect(recallResponse.body.success).toBe(true);
      expect(recallResponse.body.memories).toBeInstanceOf(Array);

      // 3. Get context
      const contextResponse = await request(app)
        .post("/api/memory/context")
        .send({
          agentId: testAgent,
          contextSize: 5,
        })
        .expect(200);
      expect(contextResponse.body.success).toBe(true);
      expect(contextResponse.body.context).toBeDefined();
      // The context is a ContextResponse object with context_summary, summary, etc.

      // 4. List memories
      const listResponse = await request(app)
        .get(`/api/memory/list/${testAgent}`)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.memories).toBeInstanceOf(Array);

      // 5. Export memories
      const exportResponse = await request(app)
        .get(`/api/memory/export/${testAgent}`)
        .expect(200);

      expect(exportResponse.body.agentId).toBe(testAgent);
      expect(exportResponse.body.memories).toBeInstanceOf(Array);

      // 6. Forget a memory (using the stored memory ID)
      const forgetResponse = await request(app)
        .delete("/api/memory/forget")
        .send({
          agentId: testAgent,
          memoryId: storeResponse.body.memory.id,
        })
        .expect(200);

      expect(forgetResponse.body.success).toBe(true);
    });
  });

  describe("Configuration Integration", () => {
    it("should get and validate configuration", async () => {
      const response = await request(app).get("/api/config").expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.config).toMatchObject({
        tier: {
          level: "mock",
          capabilities: expect.any(Object),
        },
        environment: {
          hasOpenAIKey: expect.any(Boolean),
          hasAzureConfig: expect.any(Boolean),
          hasLocalAI: true,
          pythonPath: expect.any(String),
          cachePath: expect.any(String),
        },
        features: {
          embedding: true,
          similarity: true,
          persistence: true,
          scalability: false,
        },
      });
    });

    it("should test tier switching", async () => {
      const response = await request(app)
        .post("/api/config/test-tier")
        .send({ tier: "mock" })
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle 404 for unknown endpoints", async () => {
      const response = await request(app).get("/api/unknown").expect(404);

      expect(response.body.error).toBe("Endpoint not found");
    });

    it("should handle validation errors", async () => {
      const response = await request(app)
        .post("/api/memory/remember")
        .send({
          agentId: "", // invalid - empty string
          content: "test",
        })
        .expect(400);

      expect(response.body.error).toContain("agentId");
    });
  });

  describe("Stats Integration", () => {
    it("should get comprehensive statistics", async () => {
      const response = await request(app).get("/api/stats").expect(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });
});
