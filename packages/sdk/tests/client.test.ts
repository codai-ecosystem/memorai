import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoraiClient } from '../src/client/MemoraiClient';
import { MCPConnection } from '../src/connection/MCPConnection';
import type { ClientOptions, RememberOptions, RecallOptions, ForgetOptions, ContextOptions, AgentMemory, MemorySession } from '../src/types';

// Mock the MCPConnection
vi.mock('../src/connection/MCPConnection');

describe('MemoraiClient', () => {
  let client: MemoraiClient;
  let mockConnection: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a mock connection instance
    mockConnection = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      send: vi.fn(),
      isConnected: true,
    };

    // Mock the MCPConnection constructor to return our mock
    (MCPConnection as any).mockImplementation(() => mockConnection);

    const clientOptions: ClientOptions & { agentId: string; sessionId?: string; tenantId?: string } = {
      serverUrl: 'http://localhost:3000',
      agentId: 'test-agent',
      sessionId: 'test-session',
      tenantId: 'test-tenant'
    };

    client = new MemoraiClient(clientOptions);
  });

  describe('connection management', () => {
    it('should connect to the server', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      });

      await client.connect();

      expect(mockConnection.connect).toHaveBeenCalled();
      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/initialize',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant'
        },
        id: expect.any(String)
      });
    });

    it('should disconnect from the server', async () => {
      await client.disconnect();
      expect(mockConnection.disconnect).toHaveBeenCalled();
    });

    it('should return connection status', () => {
      expect(client.isConnected).toBe(true);
    });
  });

  describe('remember', () => {
    it('should remember information successfully', async () => {
      const mockMemory: AgentMemory = {
        id: 'memory-1',
        content: 'Test content',
        context: { sessionId: 'test-session' },
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: mockMemory
      });

      const options: Partial<RememberOptions> = {
        tags: ['test'],
        priority: 1
      };

      const result = await client.remember('Test content', options);

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/remember',
        params: {
          operation: 'remember',
          data: {
            content: 'Test content',
            context: undefined,
            metadata: {
              agentId: 'test-agent',
              sessionId: 'test-session',
              tenantId: 'test-tenant',
              timestamp: expect.any(String)
            },
            tags: ['test'],
            priority: 1,
            expires: undefined
          }
        },
        id: expect.any(String)
      });

      expect(result).toEqual(mockMemory);
    });

    it('should handle remember errors', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: -1,
          message: 'Failed to remember'
        }
      });

      await expect(client.remember('Test content')).rejects.toThrow('Memory operation failed: Failed to remember');
    });
  });

  describe('recall', () => {
    it('should recall memories successfully', async () => {
      const mockMemories: AgentMemory[] = [
        {
          id: 'memory-1',
          content: 'Test content',
          context: { sessionId: 'test-session' },
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          relevanceScore: 0.9
        }
      ];

      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: mockMemories
      });

      const options: Partial<RecallOptions> = {
        limit: 5,
        threshold: 0.8
      };

      const result = await client.recall('Test query', options);

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/recall',
        params: {
          operation: 'recall',
          data: {
            query: 'Test query',
            limit: 5,
            threshold: 0.8,
            filters: undefined,
            context: {
              agentId: 'test-agent',
              sessionId: 'test-session',
              tenantId: 'test-tenant'
            }
          }
        },
        id: expect.any(String)
      });

      expect(result).toEqual(mockMemories);
    });

    it('should handle recall errors', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: -1,
          message: 'Failed to recall'
        }
      });

      await expect(client.recall('Test query')).rejects.toThrow('Memory operation failed: Failed to recall');
    });
  });

  describe('forget', () => {
    it('should forget memories successfully', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      });

      const options: ForgetOptions = {
        memoryId: 'memory-1',
        confirmDeletion: true
      };

      await client.forget(options);

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/forget',
        params: {
          operation: 'forget',
          data: {
            memoryId: 'memory-1',
            query: undefined,
            filters: undefined,
            confirmDeletion: true,
            context: {
              agentId: 'test-agent',
              sessionId: 'test-session',
              tenantId: 'test-tenant'
            }
          }
        },
        id: expect.any(String)
      });
    });

    it('should handle forget errors', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: -1,
          message: 'Failed to forget'
        }
      });

      await expect(client.forget({ memoryId: 'memory-1' })).rejects.toThrow('Memory operation failed: Failed to forget');
    });
  });

  describe('getContext', () => {
    it('should get context successfully', async () => {
      const mockMemories: AgentMemory[] = [
        {
          id: 'memory-1',
          content: 'Context content',
          context: { sessionId: 'test-session' },
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: mockMemories
      });

      const options: ContextOptions = {
        topic: 'test topic',
        limit: 3
      };

      const result = await client.getContext(options);

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/context',
        params: {
          operation: 'context',
          data: {
            topic: 'test topic',
            timeframe: undefined,
            limit: 3,
            includeMemories: true,
            summaryType: 'brief',
            context: {
              agentId: 'test-agent',
              sessionId: 'test-session',
              tenantId: 'test-tenant'
            }
          }
        },
        id: expect.any(String)
      });

      expect(result).toEqual(mockMemories);
    });
  });

  describe('session management', () => {
    it('should get session information', async () => {
      const mockSession: MemorySession = {
        id: 'test-session',
        agentId: 'test-agent',
        startTime: new Date(),
        memories: [],
        context: { sessionId: 'test-session' }
      };

      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: mockSession
      });

      const result = await client.getSession();

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/session',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant'
        },
        id: expect.any(String)
      });

      expect(result).toEqual(mockSession);
    });

    it('should clear session', async () => {
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true }
      });

      await client.clearSession();

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/clear-session',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant'
        },
        id: expect.any(String)
      });
    });
  });

  describe('getStats', () => {
    it('should get memory statistics', async () => {
      const mockStats = {
        totalMemories: 10,
        memoryTypes: { 'conversation': 5, 'fact': 3, 'task': 2 },
        memorySize: 1024,
        sessionMemories: 3
      };

      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: mockStats
      });

      const result = await client.getStats();

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/stats',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant'
        },
        id: expect.any(String)
      });

      expect(result).toEqual(mockStats);
    });
  });

  describe('getters', () => {
    it('should return current agent ID', () => {
      expect(client.currentAgentId).toBe('test-agent');
    });

    it('should return current session ID', () => {
      expect(client.currentSessionId).toBe('test-session');
    });

    it('should return current tenant ID', () => {
      expect(client.currentTenantId).toBe('test-tenant');
    });
  });
});
