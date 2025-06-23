import { vi } from "vitest";

// Mock memory engine for testing
export const createMockMemoryEngine = (config: Partial<any> = {}) => {
  const memories = new Map();
  let idCounter = 1;

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    remember: vi
      .fn()
      .mockImplementation(
        async (
          content: string,
          tenantId: string,
          agentId?: string,
          options?: any,
        ) => {
          const memoryId = `memory-${idCounter++}`;
          const memory = {
            id: memoryId,
            agentId,
            content,
            metadata: options || {},
            timestamp: new Date().toISOString(),
            similarity: 1.0,
            tenantId,
          };
          memories.set(memory.id, memory);
          return memoryId;
        },
      ),
    recall: vi
      .fn()
      .mockImplementation(
        async (
          query: string,
          tenantId: string,
          agentId?: string,
          options?: any,
        ) => {
          const agentMemories = Array.from(memories.values()).filter(
            (m: any) => m.agentId === agentId,
          );
          return agentMemories
            .slice(0, options?.limit || 10)
            .map((memory: any) => ({
              memory,
              score: 0.9,
            }));
        },
      ),
    forget: vi.fn().mockImplementation(async (memoryId: string) => {
      const memory = memories.get(memoryId);
      if (memory) {
        memories.delete(memoryId);
        return true;
      }
      return false;
    }),
    getContext: vi.fn().mockImplementation(async (request: any) => {
      const agentId = request.agent_id || request.agentId;
      const maxMemories = request.max_memories || request.contextSize || 10;
      const agentMemories = Array.from(memories.values()).filter(
        (m: any) => m.agentId === agentId,
      );
      return {
        context: `Context for ${agentId} with ${agentMemories.length} memories`,
        memories: agentMemories
          .slice(0, maxMemories)
          .map((memory: any) => ({ memory, score: 0.9 })),
        summary: `Context for ${agentId} with ${agentMemories.length} memories`,
        confidence: 0.9,
        generated_at: new Date(),
        total_count: agentMemories.length,
        context_summary: `Context for ${agentId} with ${agentMemories.length} memories`,
      };
    }),
    getTierInfo: vi.fn().mockReturnValue({
      level: "mock",
      currentTier: "mock",
      message: "Mock memory engine for testing",
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
      totalMemories: memories.size,
      memoryTypes: { semantic: 0, episodic: 0, procedural: 0, meta: 0 },
      avgConfidence: 0.9,
      recentActivity: 0,
      currentTier: "mock",
    }),
    ...config,
  };
};

// Mock failing memory engine
export const createFailingMemoryEngine = () => {
  return {
    initialize: vi.fn().mockRejectedValue(new Error("Failed to initialize")),
    remember: vi.fn().mockRejectedValue(new Error("Failed to remember")),
    recall: vi.fn().mockRejectedValue(new Error("Failed to recall")),
    forget: vi.fn().mockRejectedValue(new Error("Failed to forget")),
    getContext: vi.fn().mockRejectedValue(new Error("Failed to get context")),
    getTierInfo: vi.fn().mockReturnValue({
      level: "error",
      currentTier: "error",
      message: "Error state",
      capabilities: {
        embedding: false,
        similarity: false,
        persistence: false,
        scalability: false,
      },
    }),
  };
};

// Test data generators
export const generateTestMemory = (overrides: Partial<any> = {}) => ({
  agentId: "test-agent",
  content: "Test memory content",
  metadata: { type: "test", priority: "low" },
  ...overrides,
});

export const generateTestMemories = (
  count: number,
  agentId: string = "test-agent",
) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `memory-${i + 1}`,
    agentId,
    content: `Test memory content ${i + 1}`,
    metadata: { index: i + 1, type: "test" },
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    similarity: 1.0 - i * 0.1,
  }));
};

// Environment helpers
export const setTestEnv = (env: Record<string, string> = {}) => {
  const originalEnv = { ...process.env };

  // Set test defaults (skip NODE_ENV due to readonly restrictions)
  process.env.PORT = "0"; // Use random port for testing
  process.env.CORS_ORIGIN = "http://localhost:3000";

  // Apply custom env vars
  Object.assign(process.env, env);

  return () => {
    // Restore original env
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  };
};

// Mock logger to avoid console spam in tests
export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};
