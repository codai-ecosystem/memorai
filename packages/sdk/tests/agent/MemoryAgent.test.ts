/**
 * @fileoverview Comprehensive tests for MemoryAgent class
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryAgent } from '../../src/agent/MemoryAgent.js';
import type { ClientOptions, AgentMemory, MemorySession } from '../../src/types/index.js';

describe('MemoryAgent', () => {
  let agent: MemoryAgent;
  let mockOptions: ClientOptions;
  let mockClient: any;

  beforeEach(() => {
    mockOptions = {
      serverUrl: 'http://localhost:3000',
      apiKey: 'test-api-key',
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      cache: {
        enabled: true,
        ttl: 3600,
        maxSize: 1000
      },
      logging: true
    };

    // Mock the client methods before creating agent
    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      remember: vi.fn().mockResolvedValue({
        id: 'mem-123',
        content: 'Test memory',
        context: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as AgentMemory),
      recall: vi.fn().mockResolvedValue([{
        id: 'mem-123',
        content: 'Test memory',
        context: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as AgentMemory]),
      forget: vi.fn().mockResolvedValue(undefined),
      getContext: vi.fn().mockResolvedValue([{
        id: 'ctx-123',
        content: 'Context memory',
        context: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      } as AgentMemory]),
      getSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        agentId: 'test-agent-001',
        startTime: new Date(),
        memories: [],
        context: {}
      } as MemorySession),
      clearSession: vi.fn().mockResolvedValue(undefined),
      getStats: vi.fn().mockResolvedValue({
        totalMemories: 150,
        sessionMemories: 10,
        averageConfidence: 0.85,
        lastActivity: new Date()
      }),
      get isConnected() { return true; }
    };

    agent = new MemoryAgent('test-agent-001', mockOptions);
    // Replace the internal client with our mock
    (agent as any).client = mockClient;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid options', () => {
      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-agent-001');
    });

    it('should create agent with proper client options', () => {
      const agentId = 'test-agent-002';
      const newAgent = new MemoryAgent(agentId, mockOptions);
      expect(newAgent.id).toBe(agentId);
    });
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.getSession).toHaveBeenCalled();
    });

    it('should initialize with custom session ID', async () => {
      const sessionId = 'custom-session-123';
      await agent.initialize(sessionId);
      
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.getSession).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'));
      
      await expect(agent.initialize()).rejects.toThrow('Connection failed');
    });
  });

  describe('memory operations', () => {
    it('should remember information successfully', async () => {
      const content = 'Test information';
      const result = await agent.remember(content);
      
      expect(result.id).toBe('mem-123');
      expect(result.content).toBe('Test memory');
      expect(mockClient.remember).toHaveBeenCalledWith(content, {});
    });

    it('should remember with options', async () => {
      const content = 'Test information';
      const options = { 
        content: 'override', 
        metadata: { type: 'fact' },
        tags: ['important'] 
      };
      
      await agent.remember(content, options);
      
      expect(mockClient.remember).toHaveBeenCalledWith(content, options);
    });

    it('should recall memories successfully', async () => {
      const query = 'test query';
      const memories = await agent.recall(query);
      
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe('Test memory');
      expect(mockClient.recall).toHaveBeenCalledWith(query, {});
    });

    it('should recall with options', async () => {
      const query = 'test query';
      const options = { 
        limit: 5, 
        threshold: 0.8,
        filters: { tags: ['important'] }
      };
      
      await agent.recall(query, options);
      
      expect(mockClient.recall).toHaveBeenCalledWith(query, options);
    });

    it('should get context successfully', async () => {
      const options = { topic: 'test topic', limit: 10 };
      const context = await agent.getContext(options);
      
      expect(context).toHaveLength(1);
      expect(context[0].content).toBe('Context memory');
      expect(mockClient.getContext).toHaveBeenCalledWith(options);
    });

    it('should forget memories successfully', async () => {
      const options = { memoryId: 'mem-123', confirmDeletion: true };
      await agent.forget(options);
      
      expect(mockClient.forget).toHaveBeenCalledWith(options);
    });

    it('should handle memory operation errors', async () => {
      mockClient.remember.mockRejectedValue(new Error('Operation failed'));
      
      await expect(agent.remember('Test')).rejects.toThrow('Operation failed');
    });
  });

  describe('session management', () => {
    it('should start new session', async () => {
      const session = await agent.startNewSession();
      
      expect(session.id).toBe('session-123');
      expect(session.agentId).toBe('test-agent-001');
      expect(mockClient.getSession).toHaveBeenCalled();
    });

    it('should end current session', async () => {
      // First start a session
      await agent.startNewSession();
      expect(agent.getCurrentSession()).toBeDefined();
      
      // Then end it
      await agent.endSession();
      
      expect(agent.getCurrentSession()).toBeUndefined();
      expect(mockClient.clearSession).toHaveBeenCalled();
    });

    it('should get current session', async () => {
      expect(agent.getCurrentSession()).toBeUndefined();
      
      await agent.startNewSession();
      const session = agent.getCurrentSession();
      
      expect(session).toBeDefined();
      expect(session?.id).toBe('session-123');
    });
  });

  describe('statistics and monitoring', () => {
    it('should get memory statistics', async () => {
      const stats = await agent.getStats();
      
      expect(stats.totalMemories).toBe(150);
      expect(stats.sessionMemories).toBe(10);
      expect(stats.averageConfidence).toBe(0.85);
      expect(mockClient.getStats).toHaveBeenCalled();
    });

    it('should handle stats errors', async () => {
      mockClient.getStats.mockRejectedValue(new Error('Stats unavailable'));
      
      await expect(agent.getStats()).rejects.toThrow('Stats unavailable');
    });
  });

  describe('connection management', () => {
    it('should disconnect successfully', async () => {
      await agent.disconnect();
      
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should check connection status', () => {
      expect(agent.isConnected).toBe(true);
    });

    it('should handle disconnection errors', async () => {
      mockClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));
      
      await expect(agent.disconnect()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('agent properties', () => {
    it('should return correct agent ID', () => {
      expect(agent.id).toBe('test-agent-001');
    });

    it('should maintain agent identity', () => {
      const agentId = 'unique-agent-id';
      const newAgent = new MemoryAgent(agentId, mockOptions);
      
      expect(newAgent.id).toBe(agentId);
      expect(newAgent.id).not.toBe(agent.id);
    });
  });

  describe('error handling', () => {
    it('should handle client errors gracefully', async () => {
      mockClient.remember.mockRejectedValue(new Error('Client error'));
      
      await expect(agent.remember('test')).rejects.toThrow('Client error');
    });

    it('should handle session errors', async () => {
      mockClient.getSession.mockRejectedValue(new Error('Session error'));
      
      await expect(agent.startNewSession()).rejects.toThrow('Session error');
    });

    it('should handle network timeouts', async () => {
      mockClient.recall.mockRejectedValue(new Error('Request timeout'));
      
      await expect(agent.recall('test')).rejects.toThrow('Request timeout');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete agent lifecycle', async () => {
      // Initialize
      await agent.initialize();
      expect(mockClient.connect).toHaveBeenCalled();

      // Start session
      const session = await agent.startNewSession();
      expect(session).toBeDefined();

      // Remember something
      const memory = await agent.remember('Important information');
      expect(memory.id).toBe('mem-123');

      // Recall information
      const memories = await agent.recall('Important');
      expect(memories).toHaveLength(1);

      // Get context
      const context = await agent.getContext({ topic: 'information' });
      expect(context).toHaveLength(1);

      // Check stats
      const stats = await agent.getStats();
      expect(stats.totalMemories).toBe(150);

      // End session
      await agent.endSession();
      expect(agent.getCurrentSession()).toBeUndefined();

      // Disconnect
      await agent.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        agent.remember('Memory 1'),
        agent.remember('Memory 2'),
        agent.recall('query'),
        agent.getStats()
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toBeDefined(); // remember result
      expect(results[1]).toBeDefined(); // remember result
      expect(Array.isArray(results[2])).toBe(true); // recall result
      expect(results[3]).toBeDefined(); // stats result
    });
  });
});
