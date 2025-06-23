/**
 * Mock Memory Engine - Testing and Development Mode
 * Provides deterministic responses for testing
 */

import type {
  MemoryMetadata,
  MemoryQuery,
  MemoryResult,
  MemoryType,
} from "../types/index.js";

export interface MockMemoryConfig {
  simulateDelay?: boolean;
  delayMs?: number;
  failureRate?: number;
  deterministicResponses?: boolean;
}

export class MockMemoryEngine {
  private config: MockMemoryConfig;
  private mockMemories: Map<string, MemoryMetadata> = new Map();
  private callCount = 0;

  constructor(config: MockMemoryConfig = {}) {
    this.config = {
      simulateDelay: false,
      delayMs: 100,
      failureRate: 0,
      deterministicResponses: true,
      ...config,
    };

    // Pre-populate with mock data
    this.initializeMockData();
  }

  /**
   * Mock remember operation
   */
  public async remember(memory: MemoryMetadata): Promise<void> {
    await this.simulateDelay();
    this.simulateFailure();

    this.mockMemories.set(memory.id, memory);
    this.callCount++;
  }

  /**
   * Mock recall operation with deterministic responses
   */
  public async recall(query: MemoryQuery): Promise<MemoryResult[]> {
    await this.simulateDelay();
    this.simulateFailure();

    this.callCount++;

    if (this.config.deterministicResponses) {
      return this.getDeterministicResults(query);
    }

    // Filter mock memories based on query
    const results: MemoryResult[] = [];
    for (const memory of this.mockMemories.values()) {
      if (memory.tenant_id === query.tenant_id) {
        if (!query.type || memory.type === query.type) {
          if (!query.agent_id || memory.agent_id === query.agent_id) {
            const score = this.calculateMockScore(memory, query);
            if (score >= query.threshold) {
              results.push({
                memory,
                score,
                relevance_reason: `Mock match for "${query.query}"`,
              });
            }
          }
        }
      }
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, query.limit);
  }

  /**
   * Mock context retrieval
   */
  public async getContext(
    tenantId: string,
    agentId?: string,
    limit = 10,
  ): Promise<MemoryMetadata[]> {
    await this.simulateDelay();
    this.simulateFailure();

    this.callCount++;

    const memories = Array.from(this.mockMemories.values())
      .filter((memory) => {
        if (memory.tenant_id !== tenantId) return false;
        if (agentId && memory.agent_id !== agentId) return false;
        return true;
      })
      .slice(0, limit);

    return memories;
  }

  /**
   * Mock forget operation
   */
  public async forget(memoryId: string): Promise<boolean> {
    await this.simulateDelay();
    this.simulateFailure();

    this.callCount++;
    return this.mockMemories.delete(memoryId);
  }

  /**
   * Get deterministic test results based on query
   */
  private getDeterministicResults(query: MemoryQuery): MemoryResult[] {
    const queryLower = query.query.toLowerCase();

    // Predefined test responses for common queries
    const testResponses: Record<string, MemoryResult[]> = {
      hello: [
        {
          memory: this.createMockMemory(
            "test-1",
            "personality",
            "User prefers friendly greetings",
            query.tenant_id,
            query.agent_id,
          ),
          score: 0.9,
          relevance_reason: "Matches greeting pattern",
        },
      ],
      test: [
        {
          memory: this.createMockMemory(
            "test-2",
            "fact",
            "This is a test memory for validation",
            query.tenant_id,
            query.agent_id,
          ),
          score: 0.85,
          relevance_reason: "Direct test match",
        },
        {
          memory: this.createMockMemory(
            "test-3",
            "procedure",
            "Testing procedure: run all tests",
            query.tenant_id,
            query.agent_id,
          ),
          score: 0.7,
          relevance_reason: "Testing procedure",
        },
      ],
      user: [
        {
          memory: this.createMockMemory(
            "user-1",
            "preference",
            "User likes dark mode",
            query.tenant_id,
            query.agent_id,
          ),
          score: 0.8,
          relevance_reason: "User preference",
        },
      ],
      project: [
        {
          memory: this.createMockMemory(
            "proj-1",
            "task",
            "Project deadline is next week",
            query.tenant_id,
            query.agent_id,
          ),
          score: 0.75,
          relevance_reason: "Project information",
        },
      ],
    };

    // Find matching test response
    for (const [key, results] of Object.entries(testResponses)) {
      if (queryLower.includes(key)) {
        return results
          .filter((result) => !query.type || result.memory.type === query.type)
          .slice(0, query.limit);
      }
    }

    // Default empty response for unknown queries
    return [];
  }

  /**
   * Create a mock memory for testing
   */
  private createMockMemory(
    id: string,
    type: MemoryType,
    content: string,
    tenantId: string,
    agentId?: string,
  ): MemoryMetadata {
    const now = new Date();
    return {
      id,
      type,
      content,
      confidence: 0.9,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      importance: 0.5,
      tags: ["mock", "test"],
      tenant_id: tenantId,
      agent_id: agentId,
    };
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    const mockData = [
      {
        id: "mock-personality-1",
        type: "personality" as MemoryType,
        content:
          "User is enthusiastic about technology and prefers detailed explanations",
        tenant_id: "test-tenant",
        agent_id: "test-agent",
      },
      {
        id: "mock-procedure-1",
        type: "procedure" as MemoryType,
        content:
          "When debugging, always check logs first, then network requests",
        tenant_id: "test-tenant",
        agent_id: "test-agent",
      },
      {
        id: "mock-fact-1",
        type: "fact" as MemoryType,
        content:
          "The project uses TypeScript and Node.js for backend development",
        tenant_id: "test-tenant",
        agent_id: "test-agent",
      },
      {
        id: "mock-preference-1",
        type: "preference" as MemoryType,
        content: "User prefers concise responses with code examples",
        tenant_id: "test-tenant",
        agent_id: "test-agent",
      },
    ];

    for (const data of mockData) {
      const memory = this.createMockMemory(
        data.id,
        data.type,
        data.content,
        data.tenant_id,
        data.agent_id,
      );
      this.mockMemories.set(memory.id, memory);
    }
  }

  /**
   * Calculate mock relevance score
   */
  private calculateMockScore(
    memory: MemoryMetadata,
    query: MemoryQuery,
  ): number {
    const queryWords = query.query.toLowerCase().split(/\s+/);
    const contentWords = memory.content.toLowerCase().split(/\s+/);

    let matches = 0;
    for (const word of queryWords) {
      if (contentWords.some((cw) => cw.includes(word) || word.includes(cw))) {
        matches++;
      }
    }

    return Math.min(matches / queryWords.length + 0.1, 1.0);
  }

  /**
   * Simulate network delay if configured
   */
  private async simulateDelay(): Promise<void> {
    if (
      this.config.simulateDelay &&
      this.config.delayMs &&
      this.config.delayMs > 0
    ) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }
  }

  /**
   * Simulate random failures if configured
   */
  private simulateFailure(): void {
    if (this.config.failureRate && this.config.failureRate > 0) {
      if (Math.random() < this.config.failureRate) {
        throw new Error("Mock failure simulation");
      }
    }
  }

  /**
   * Get mock engine statistics
   */
  public getStats(): {
    totalCalls: number;
    totalMemories: number;
    config: MockMemoryConfig;
  } {
    return {
      totalCalls: this.callCount,
      totalMemories: this.mockMemories.size,
      config: this.config,
    };
  }

  /**
   * Reset mock engine state
   */
  public reset(): void {
    this.callCount = 0;
    this.mockMemories.clear();
    this.initializeMockData();
  }

  /**
   * Add custom mock memory for testing
   */
  public addMockMemory(memory: MemoryMetadata): void {
    this.mockMemories.set(memory.id, memory);
  }

  /**
   * Configure mock engine behavior
   */
  public configure(config: Partial<MockMemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
