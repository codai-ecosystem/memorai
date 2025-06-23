/**
 * Comprehensive tests for MemoryEngine
 * Testing all methods, edge cases, error handling, and business logic
 */

import { describe, it, expect, beforeEach, vi, MockedFunction } from "vitest";
import {
  MemoryEngine,
  type RememberOptions,
  type RecallOptions,
} from "../../src/engine/MemoryEngine.js";
import {
  MemoryError,
  type MemoryMetadata,
  type MemoryResult,
} from "../../src/types/index.js";
import { EmbeddingService } from "../../src/embedding/EmbeddingService.js";
import { MemoryVectorStore } from "../../src/vector/VectorStore.js";

// Mock dependencies
vi.mock("../../src/embedding/EmbeddingService.js");
vi.mock("../../src/vector/VectorStore.js");

describe("MemoryEngine - Comprehensive Tests", () => {
  let memoryEngine: MemoryEngine;
  let mockEmbeddingService: EmbeddingService;
  let mockVectorStore: MemoryVectorStore;

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

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockEmbeddingResult = {
    embedding: mockEmbedding,
    tokens: 10,
    model: "text-embedding-3-small",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mocks
    mockEmbeddingService = {
      embed: vi.fn().mockResolvedValue(mockEmbeddingResult),
      embedBatch: vi.fn(),
      getDimension: vi.fn().mockReturnValue(1536),
    } as unknown as EmbeddingService;

    mockVectorStore = {
      initialize: vi.fn().mockResolvedValue(undefined),
      storeMemory: vi.fn().mockResolvedValue(undefined),
      searchMemories: vi.fn().mockResolvedValue([]),
      deleteMemories: vi.fn().mockResolvedValue(undefined),
      updateMemory: vi.fn().mockResolvedValue(undefined),
      getMemory: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(undefined),
      getHealth: vi.fn().mockResolvedValue({ status: "healthy" }),
    } as unknown as MemoryVectorStore;

    // Mock the constructors
    vi.mocked(EmbeddingService).mockImplementation(() => mockEmbeddingService);
    vi.mocked(MemoryVectorStore).mockImplementation(() => mockVectorStore);

    memoryEngine = new MemoryEngine(testConfig);
  });

  describe("Initialization", () => {
    it("should create MemoryEngine instance", () => {
      expect(memoryEngine).toBeDefined();
      expect(memoryEngine).toBeInstanceOf(MemoryEngine);
    });

    it("should initialize successfully", async () => {
      await memoryEngine.initialize();
      expect(mockVectorStore.initialize).toHaveBeenCalledOnce();
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      vi.mocked(mockVectorStore.initialize).mockRejectedValue(error);

      await expect(memoryEngine.initialize()).rejects.toThrow(MemoryError);
      await expect(memoryEngine.initialize()).rejects.toThrow(
        "Failed to initialize memory engine: Initialization failed",
      );
    });

    it("should handle unknown initialization errors", async () => {
      vi.mocked(mockVectorStore.initialize).mockRejectedValue("Unknown error");

      await expect(memoryEngine.initialize()).rejects.toThrow(MemoryError);
      await expect(memoryEngine.initialize()).rejects.toThrow(
        "Unknown initialization error",
      );
    });

    it("should not reinitialize if already initialized", async () => {
      await memoryEngine.initialize();
      await memoryEngine.initialize();

      // Should only call initialize once
      expect(mockVectorStore.initialize).toHaveBeenCalledOnce();
    });
  });

  describe("Remember functionality", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    it("should remember a simple memory", async () => {
      const content = "User prefers dark mode";
      const tenantId = "tenant-1";
      const agentId = "agent-1";

      const memoryId = await memoryEngine.remember(content, tenantId, agentId);

      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe("string");
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith(content);
      expect(mockVectorStore.storeMemory).toHaveBeenCalledOnce();
    });

    it("should remember with options", async () => {
      const content = "Important project deadline";
      const tenantId = "tenant-1";
      const options: RememberOptions = {
        type: "task",
        importance: 0.9,
        emotional_weight: 0.8,
        tags: ["work", "deadline"],
        context: { project: "memorai" },
        ttl: new Date(Date.now() + 86400000), // 24 hours
      };

      const memoryId = await memoryEngine.remember(
        content,
        tenantId,
        undefined,
        options,
      );

      expect(memoryId).toBeDefined();
      expect(mockVectorStore.storeMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content,
          type: "task",
          importance: 0.9,
          emotional_weight: 0.8,
          tags: ["work", "deadline"],
          context: { project: "memorai" },
          tenant_id: tenantId,
        }),
        mockEmbedding,
      );
    });

    it("should handle empty content", async () => {
      await expect(memoryEngine.remember("", "tenant-1")).rejects.toThrow(
        MemoryError,
      );
      await expect(memoryEngine.remember("   ", "tenant-1")).rejects.toThrow(
        "Content cannot be empty",
      );
    });

    it("should handle embedding errors", async () => {
      const error = new Error("Embedding failed");
      vi.mocked(mockEmbeddingService.embed).mockRejectedValue(error);

      await expect(
        memoryEngine.remember("test content", "tenant-1"),
      ).rejects.toThrow(MemoryError);
      await expect(
        memoryEngine.remember("test content", "tenant-1"),
      ).rejects.toThrow("Failed to remember: Embedding failed");
    });

    it("should handle storage errors", async () => {
      const error = new Error("Storage failed");
      vi.mocked(mockVectorStore.storeMemory).mockRejectedValue(error);

      await expect(
        memoryEngine.remember("test content", "tenant-1"),
      ).rejects.toThrow(MemoryError);
      await expect(
        memoryEngine.remember("test content", "tenant-1"),
      ).rejects.toThrow("Failed to remember: Storage failed");
    });

    it("should require initialization before remembering", async () => {
      const uninitializedEngine = new MemoryEngine(testConfig);

      await expect(
        uninitializedEngine.remember("test", "tenant-1"),
      ).rejects.toThrow(MemoryError);
    });
  });

  describe("Recall functionality", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    const mockMemoryResult: MemoryResult = {
      memory: {
        id: "memory-1",
        type: "fact",
        content: "User prefers dark mode",
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        importance: 0.8,
        tags: [],
        tenant_id: "tenant-1",
        agent_id: "agent-1",
      },
      score: 0.85,
      relevance_reason: "High semantic similarity",
    };

    it("should recall memories successfully", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        mockMemoryResult,
      ]);

      const results = await memoryEngine.recall(
        "dark mode",
        "tenant-1",
        "agent-1",
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockMemoryResult);
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith("dark mode");
      expect(mockVectorStore.searchMemories).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({
          query: "dark mode",
          limit: 10,
          threshold: 0.7,
          tenant_id: "tenant-1",
          agent_id: "agent-1",
          include_context: true,
          time_decay: true,
        }),
      );
    });

    it("should recall with custom options", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        mockMemoryResult,
      ]);

      const options: RecallOptions = {
        type: "fact",
        limit: 5,
        threshold: 0.8,
        include_context: false,
        time_decay: false,
      };

      const results = await memoryEngine.recall(
        "test query",
        "tenant-1",
        undefined,
        options,
      );

      expect(mockVectorStore.searchMemories).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({
          query: "test query",
          type: "fact",
          limit: 5,
          threshold: 0.8,
          include_context: false,
          time_decay: false,
        }),
      );
    });

    it("should handle empty query", async () => {
      await expect(memoryEngine.recall("", "tenant-1")).rejects.toThrow(
        MemoryError,
      );
      await expect(memoryEngine.recall("   ", "tenant-1")).rejects.toThrow(
        "Query cannot be empty",
      );
    });

    it("should handle embedding errors during recall", async () => {
      const error = new Error("Embedding failed");
      vi.mocked(mockEmbeddingService.embed).mockRejectedValue(error);

      await expect(
        memoryEngine.recall("test query", "tenant-1"),
      ).rejects.toThrow(MemoryError);
      await expect(
        memoryEngine.recall("test query", "tenant-1"),
      ).rejects.toThrow("Failed to recall: Embedding failed");
    });

    it("should handle search errors", async () => {
      const error = new Error("Search failed");
      vi.mocked(mockVectorStore.searchMemories).mockRejectedValue(error);

      await expect(
        memoryEngine.recall("test query", "tenant-1"),
      ).rejects.toThrow(MemoryError);
      await expect(
        memoryEngine.recall("test query", "tenant-1"),
      ).rejects.toThrow("Failed to recall: Search failed");
    });

    it("should apply time decay when enabled", async () => {
      const oldMemory = {
        ...mockMemoryResult,
        memory: {
          ...mockMemoryResult.memory,
          createdAt: new Date(Date.now() - 86400000 * 30), // 30 days ago
        },
      };

      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([oldMemory]);

      const results = await memoryEngine.recall(
        "test query",
        "tenant-1",
        undefined,
        { time_decay: true },
      );

      expect(results).toHaveLength(1);
      // Score should be adjusted for time decay (should be less than original)
      expect(results[0].score).toBeLessThan(oldMemory.score);
    });

    it("should not apply time decay when disabled", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        mockMemoryResult,
      ]);

      const results = await memoryEngine.recall(
        "test query",
        "tenant-1",
        undefined,
        { time_decay: false },
      );

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(mockMemoryResult.score);
    });
  });

  describe("Forget functionality", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    const mockMemoryResult: MemoryResult = {
      memory: {
        id: "memory-1",
        type: "fact",
        content: "Outdated information",
        confidence: 0.9,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 1,
        importance: 0.5,
        tags: [],
        tenant_id: "tenant-1",
        agent_id: "agent-1",
      },
      score: 0.95,
      relevance_reason: "Exact match",
    };

    it("should forget memories successfully", async () => {
      // Mock recall to find memories
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        mockMemoryResult,
      ]);

      const deletedCount = await memoryEngine.forget(
        "outdated information",
        "tenant-1",
        "agent-1",
      );

      expect(deletedCount).toBe(1);
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledWith(["memory-1"]);
    });

    it("should forget multiple memories", async () => {
      const memory1 = {
        ...mockMemoryResult,
        memory: { ...mockMemoryResult.memory, id: "memory-1" },
      };
      const memory2 = {
        ...mockMemoryResult,
        memory: { ...mockMemoryResult.memory, id: "memory-2" },
      };

      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        memory1,
        memory2,
      ]);

      const deletedCount = await memoryEngine.forget("test query", "tenant-1");

      expect(deletedCount).toBe(2);
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledWith([
        "memory-1",
        "memory-2",
      ]);
    });

    it("should return 0 when no memories match", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([]);

      const deletedCount = await memoryEngine.forget("nonexistent", "tenant-1");

      expect(deletedCount).toBe(0);
      expect(mockVectorStore.deleteMemories).not.toHaveBeenCalled();
    });
    it("should use custom confirm threshold", async () => {
      // Create memories with different scores
      const memories = [
        { memory: { id: "high-score" }, score: 0.98 }, // Above threshold
        { memory: { id: "low-score" }, score: 0.85 }, // Below threshold
      ];

      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue(
        memories as any,
      );

      const deletedCount = await memoryEngine.forget(
        "test query",
        "tenant-1",
        "agent-1",
        0.95,
      );

      // Should search with low threshold to get all candidates
      expect(mockVectorStore.searchMemories).toHaveBeenCalledWith(
        mockEmbedding,
        expect.objectContaining({
          threshold: 0.1,
          limit: 100,
        }),
      );

      // Should only delete memories above the confirm threshold (0.95)
      expect(deletedCount).toBe(1);
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledWith([
        "high-score",
      ]);
    });

    it("should handle deletion errors", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([
        mockMemoryResult,
      ]);
      const error = new Error("Deletion failed");
      vi.mocked(mockVectorStore.deleteMemories).mockRejectedValue(error);

      await expect(
        memoryEngine.forget("test query", "tenant-1"),
      ).rejects.toThrow(MemoryError);
      await expect(
        memoryEngine.forget("test query", "tenant-1"),
      ).rejects.toThrow("Failed to forget: Deletion failed");
    });
  });

  describe("Context functionality", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    it("should get context successfully", async () => {
      const mockContextMemories = [
        {
          memory: {
            id: "memory-1",
            type: "fact" as const,
            content: "User prefers dark mode",
            confidence: 0.9,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastAccessedAt: new Date(),
            accessCount: 1,
            importance: 0.8,
            tags: ["preference"],
            tenant_id: "tenant-1",
            agent_id: "agent-1",
          },
          score: 0.9,
          relevance_reason: "Recent memory",
        },
      ];

      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue(
        mockContextMemories,
      );

      const contextRequest = {
        tenant_id: "tenant-1",
        agent_id: "agent-1",
        max_memories: 5,
      };
      const response = await memoryEngine.context(contextRequest);

      expect(response).toEqual({
        context: expect.any(String),
        memories: mockContextMemories,
        summary: expect.any(String),
        confidence: expect.any(Number),
        generated_at: expect.any(Date),
        total_count: 1,
        context_summary: expect.any(String),
      });
    });

    it("should handle context request without agent_id", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValue([]);

      const contextRequest = {
        tenant_id: "tenant-1",
        max_memories: 3,
      };

      const response = await memoryEngine.context(contextRequest);

      expect(response.memories).toEqual([]);
      expect(response.total_count).toBe(0);
    });

    it("should handle context errors", async () => {
      const error = new Error("Context search failed");
      vi.mocked(mockVectorStore.searchMemories).mockRejectedValue(error);

      const contextRequest = {
        tenant_id: "tenant-1",
        max_memories: 5,
      };

      await expect(memoryEngine.context(contextRequest)).rejects.toThrow(
        MemoryError,
      );
      await expect(memoryEngine.context(contextRequest)).rejects.toThrow(
        "Failed to get context: Context search failed",
      );
    });
  });

  describe("Health and lifecycle", () => {
    it("should get health status", async () => {
      await memoryEngine.initialize();

      const health = await memoryEngine.getHealth();

      expect(health).toEqual({
        status: "healthy",
        initialized: true,
        components: {
          vectorStore: { status: "healthy" },
          embedding: "healthy",
        },
      });
    });

    it("should report unhealthy when not initialized", async () => {
      const health = await memoryEngine.getHealth();

      expect(health.status).toBe("unhealthy");
      expect(health.initialized).toBe(false);
    });

    it("should close successfully", async () => {
      await memoryEngine.initialize();
      await memoryEngine.close();

      expect(mockVectorStore.close).toHaveBeenCalledOnce();
    });

    it("should handle close errors", async () => {
      await memoryEngine.initialize();
      const error = new Error("Close failed");
      vi.mocked(mockVectorStore.close).mockRejectedValue(error);

      await expect(memoryEngine.close()).rejects.toThrow(MemoryError);
      await expect(memoryEngine.close()).rejects.toThrow(
        "Failed to close: Close failed",
      );
    });
  });

  describe("Helper methods", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    it("should calculate importance correctly", () => {
      // Access private method through bracket notation for testing
      const engine = memoryEngine as any;

      expect(engine.calculateImportance("password: secret123")).toBeGreaterThan(
        0.8,
      );
      expect(engine.calculateImportance("deadline tomorrow")).toBeGreaterThan(
        0.7,
      );
      expect(engine.calculateImportance("weather is nice")).toBeLessThan(0.5);
    });

    it("should classify memory types correctly", () => {
      const engine = memoryEngine as any;

      expect(engine.classifyMemoryType("I like coffee")).toBe("preference");
      expect(engine.classifyMemoryType("Meeting at 3pm")).toBe("task");
      expect(
        engine.classifyMemoryType("Python is a programming language"),
      ).toBe("fact");
      expect(engine.classifyMemoryType("I felt happy today")).toBe("emotion");
    });

    it("should generate context summary", () => {
      const engine = memoryEngine as any;
      const memories = [
        { memory: { content: "User prefers dark mode", type: "preference" } },
        { memory: { content: "Meeting at 3pm", type: "task" } },
      ];

      const summary = engine.generateContextSummary(memories);

      expect(summary).toContain("2 memories");
      expect(summary).toContain("1 preference");
      expect(summary).toContain("1 task");
    });

    it("should apply time decay correctly", () => {
      const engine = memoryEngine as any;
      const now = Date.now();

      const recentMemory = {
        memory: { createdAt: new Date(now - 3600000) }, // 1 hour ago
        score: 0.9,
      };

      const oldMemory = {
        memory: { createdAt: new Date(now - 86400000 * 30) }, // 30 days ago
        score: 0.9,
      };

      const results = engine.applyTimeDecay([recentMemory, oldMemory]);

      expect(results[0].score).toBeGreaterThan(results[1].score);
      expect(results[1].score).toBeLessThan(0.9);
    });
  });

  describe("Error edge cases", () => {
    it("should handle unknown errors gracefully", async () => {
      await memoryEngine.initialize();

      // Mock embedding to throw non-Error object
      vi.mocked(mockEmbeddingService.embed).mockRejectedValue("String error");

      await expect(memoryEngine.remember("test", "tenant-1")).rejects.toThrow(
        "Unknown remember error",
      );
    });

    it("should handle vector store health check failures", async () => {
      await memoryEngine.initialize();
      vi.mocked(mockVectorStore.getHealth).mockRejectedValue(
        new Error("Health check failed"),
      );
      const health = await memoryEngine.getHealth();

      expect(health.components).toBeDefined();
      expect(health.components!.vectorStore).toEqual({
        status: "unhealthy",
        error: "Health check failed",
      });
    });
  });
  describe("Edge Cases and Error Conditions", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });
    it("should handle empty query in recall", async () => {
      await expect(
        memoryEngine.recall("", "tenant1", "agent1"),
      ).rejects.toThrow("Query cannot be empty");
    });

    it("should handle whitespace-only query in recall", async () => {
      await expect(
        memoryEngine.recall("   \n\t   ", "tenant1", "agent1"),
      ).rejects.toThrow("Query cannot be empty");
    });
    it("should handle memory with no lastAccessedAt in time decay", async () => {
      const memoryWithoutLastAccess = {
        type: "fact" as const,
        id: "mem1",
        content: "Test content",
        confidence: 0.8,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 86400000),
        lastAccessedAt: new Date(Date.now() - 86400000), // 1 day ago
        accessCount: 1,
        importance: 0.8,
        emotional_weight: 0,
        tags: [],
        tenant_id: "tenant1",
        agent_id: "agent1",
      };
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValueOnce([
        { memory: memoryWithoutLastAccess, score: 0.9 },
      ]);

      const results = await memoryEngine.recall(
        "test query",
        "tenant1",
        "agent1",
        { time_decay: true },
      );
      expect(results).toHaveLength(1);
      // After 1 day with 30-day half-life: decay = exp(-1/30) ≈ 0.967
      // Adjusted score: 0.9 * 0.967 ≈ 0.87
      expect(results[0].score).toBeGreaterThan(0.8);
      expect(results[0].score).toBeLessThan(0.9);
    });

    it("should handle very old memories with extreme time decay", async () => {
      const veryOldMemory = {
        type: "fact" as const,
        id: "mem1",
        content: "Very old memory",
        confidence: 0.8,
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        lastAccessedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        accessCount: 1,
        importance: 0.8,
        emotional_weight: 0,
        tags: [],
        tenant_id: "tenant1",
        agent_id: "agent1",
      };
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValueOnce([
        { memory: veryOldMemory, score: 0.9 },
      ]);

      const results = await memoryEngine.recall(
        "test query",
        "tenant1",
        "agent1",
        { time_decay: true },
      );
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.1); // Should hit minimum score
    });

    it("should handle edge case in importance calculation - casual content", async () => {
      const casualContent =
        "The weather is nice today, everything is okay and fine, good times";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      const memoryId = await memoryEngine.remember(
        casualContent,
        "tenant1",
        "agent1",
      );
      expect(memoryId).toBeDefined();
      // Verify the importance was reduced for casual content
      expect(storedMemory.importance).toBeLessThan(0.4);
    });

    it("should handle edge case in importance calculation - long content", async () => {
      const longContent =
        "A".repeat(250) +
        " this is important and critical information with a password";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      const memoryId = await memoryEngine.remember(
        longContent,
        "tenant1",
        "agent1",
      );
      expect(memoryId).toBeDefined();
      // Verify the importance was boosted for long + important content
      expect(storedMemory.importance).toBeGreaterThan(0.8);
    });

    it("should ensure importance never exceeds 1.0", async () => {
      const superImportantContent =
        "critical urgent important password secret key token deadline remember always never";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      const memoryId = await memoryEngine.remember(
        superImportantContent,
        "tenant1",
        "agent1",
      );
      expect(memoryId).toBeDefined();
      // Verify the importance was capped at 1.0
      expect(storedMemory.importance).toBeLessThanOrEqual(1.0);
    });

    it("should ensure importance never goes below 0.1", async () => {
      const casualContent =
        "weather nice okay fine good " +
        "weather nice okay fine good ".repeat(10);

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      const memoryId = await memoryEngine.remember(
        casualContent,
        "tenant1",
        "agent1",
      );
      expect(memoryId).toBeDefined();
      // Verify the importance has a minimum value
      expect(storedMemory.importance).toBeGreaterThanOrEqual(0.1);
    });

    it("should handle personality detection edge cases", async () => {
      const personalityContent =
        "This user has a calm personality and good behavior style";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      const memoryId = await memoryEngine.remember(
        personalityContent,
        "tenant1",
        "agent1",
      );
      expect(memoryId).toBeDefined();
      // Verify the type was classified as personality
      expect(storedMemory.type).toBe("personality");
    });

    it("should handle embedding service failures gracefully", async () => {
      vi.mocked(mockEmbeddingService.embed).mockRejectedValueOnce(
        new Error("Embedding failed"),
      );

      await expect(
        memoryEngine.remember("test", "tenant1", "agent1"),
      ).rejects.toThrow("Embedding failed");
    });

    it("should handle vector store failures gracefully", async () => {
      vi.mocked(mockVectorStore.storeMemory).mockRejectedValueOnce(
        new Error("Vector store failed"),
      );

      await expect(
        memoryEngine.remember("test", "tenant1", "agent1"),
      ).rejects.toThrow("Vector store failed");
    });

    it("should handle context request without memories", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValueOnce([]);

      const context = await memoryEngine.context({
        tenant_id: "tenant1",
        agent_id: "agent1",
        max_memories: 5,
      });
      expect(context.memories).toEqual([]);
      expect(context.total_count).toBe(0);
      expect(context.context_summary).toBe("No relevant memories found.");
    });

    it("should handle forget with no matches", async () => {
      vi.mocked(mockVectorStore.searchMemories).mockResolvedValueOnce([]);

      const deletedCount = await memoryEngine.forget(
        "nonexistent query",
        "tenant1",
        "agent1",
      );
      expect(deletedCount).toBe(0);
    });
    it("should handle forget with threshold filtering", async () => {
      const memories = [
        { memory: { id: "mem1" }, score: 0.95 }, // Above threshold
        { memory: { id: "mem2" }, score: 0.4 }, // Below threshold
        { memory: { id: "mem3" }, score: 0.92 }, // Above threshold
      ];

      vi.mocked(mockVectorStore.searchMemories).mockResolvedValueOnce(
        memories as any,
      );

      const deletedCount = await memoryEngine.forget(
        "test query",
        "tenant1",
        "agent1",
        0.9,
      );
      expect(deletedCount).toBe(2); // Only mem1 and mem3 should be deleted (above 0.9 threshold)
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledTimes(1);
      expect(mockVectorStore.deleteMemories).toHaveBeenCalledWith([
        "mem1",
        "mem3",
      ]);
    });
  });

  describe("Memory Type Classification Edge Cases", () => {
    beforeEach(async () => {
      await memoryEngine.initialize();
    });

    it("should classify task-related content correctly", async () => {
      const taskContent =
        "Please complete the task of reviewing the code by tomorrow";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      await memoryEngine.remember(taskContent, "tenant1", "agent1");

      expect(storedMemory.type).toBe("task");
    });

    it("should classify emotional content correctly", async () => {
      const emotionalContent =
        "I feel happy and excited about this project, love working on it";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      await memoryEngine.remember(emotionalContent, "tenant1", "agent1");

      expect(storedMemory.type).toBe("emotion");
    });

    it("should default to thread type for conversational content", async () => {
      const conversationalContent =
        "Let me know what you think about this idea";

      // Mock store to capture the call
      let storedMemory: any;
      vi.mocked(mockVectorStore.storeMemory).mockImplementation((memory) => {
        storedMemory = memory;
        return Promise.resolve();
      });

      await memoryEngine.remember(conversationalContent, "tenant1", "agent1");

      expect(storedMemory.type).toBe("thread");
    });
  });
});
