import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { memoryRouter } from "../../src/routes/memory";
import { errorHandler } from "../../src/middleware/errorHandler";

// Mock logger
vi.mock("../../src/utils/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("DEBUG: Route existence check", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock memory engine
    app.use((req: any, res, next) => {
      req.memoryEngine = {
        forget: vi.fn().mockResolvedValue(true),
      };
      next();
    });

    app.use("/api/memory", memoryRouter);
    app.use(errorHandler);
  });

  it("should respond to DELETE /api/memory/forget", async () => {
    const response = await request(app).delete("/api/memory/forget").send({
      agentId: "test",
      memoryId: "memory-1",
    });

    console.log("Status:", response.status);
    console.log("Body:", response.body);
    console.log("Headers:", response.headers);
  });
});
