import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoraiClient } from '../../src/client/MemoraiClient';
import { MCPConnection } from '../../src/connection/MCPConnection';
import type { ClientOptions } from '../../src/types';

// Mock the MCPConnection
vi.mock('../../src/connection/MCPConnection');

describe('MemoraiClient - Coverage Enhancement', () => {
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

    const clientOptions: ClientOptions & {
      agentId: string;
      sessionId?: string;
      tenantId?: string;
    } = {
      serverUrl: 'http://localhost:3000',
      agentId: 'test-agent',
      sessionId: 'test-session',
      tenantId: 'test-tenant',
    };

    client = new MemoraiClient(clientOptions);
  });

  describe('getStats error handling', () => {
    it('should handle getStats error response (lines 302-303)', async () => {
      // Mock error response to trigger lines 302-303
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: -32603,
          message: 'Internal error occurred while getting stats',
        },
      });

      await expect(client.getStats()).rejects.toThrow(
        'Failed to get stats: Internal error occurred while getting stats'
      );

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/stats',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant',
        },
        id: expect.any(String),
      });
    });

    it('should handle getStats with different error message format', async () => {
      // Test another error scenario
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: -32602,
          message: 'Invalid params: missing required fields',
        },
      });

      await expect(client.getStats()).rejects.toThrow(
        'Failed to get stats: Invalid params: missing required fields'
      );
    });
  });
  describe('clearSession functionality', () => {
    it('should handle cache clear during clearSession when cache enabled (line 277-278)', async () => {
      // Create client with cache enabled
      const clientOptionsWithCache: ClientOptions & {
        agentId: string;
        sessionId?: string;
        tenantId?: string;
      } = {
        serverUrl: 'http://localhost:3000',
        agentId: 'test-agent',
        sessionId: 'test-session',
        tenantId: 'test-tenant',
        cache: {
          enabled: true,
          ttl: 300,
          maxSize: 1000,
        },
      };

      const clientWithCache = new MemoraiClient(clientOptionsWithCache);

      // Mock successful clearSession response
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true },
      });

      // This should trigger the cache.clear() call in lines 277-278
      await clientWithCache.clearSession();
      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/clear-session',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant',
        },
        id: expect.any(String),
      });
    });

    it('should handle clearSession when cache disabled', async () => {
      // Create client with cache disabled
      const clientOptionsNoCache: ClientOptions & {
        agentId: string;
        sessionId?: string;
        tenantId?: string;
      } = {
        serverUrl: 'http://localhost:3000',
        agentId: 'test-agent',
        sessionId: 'test-session',
        tenantId: 'test-tenant',
        cache: {
          enabled: false,
        },
      };

      const clientNoCache = new MemoraiClient(clientOptionsNoCache);

      // Mock successful clearSession response
      mockConnection.send.mockResolvedValue({
        jsonrpc: '2.0',
        id: 'test-id',
        result: { success: true },
      });

      // This should NOT trigger the cache.clear() call
      await clientNoCache.clearSession();

      expect(mockConnection.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        method: 'memory/clear-session',
        params: {
          agentId: 'test-agent',
          sessionId: 'test-session',
          tenantId: 'test-tenant',
        },
        id: expect.any(String),
      });
    });
  });

  describe('edge case scenarios', () => {
    it('should handle connection status changes', () => {
      mockConnection.isConnected = false;
      expect(client.isConnected).toBe(false);

      mockConnection.isConnected = true;
      expect(client.isConnected).toBe(true);
    });

    it('should generate unique request and session IDs', () => {
      // Access private methods through testing to ensure they generate unique IDs
      const id1 = (client as any).generateRequestId();
      const id2 = (client as any).generateRequestId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);

      const sessionId1 = (client as any).generateSessionId();
      const sessionId2 = (client as any).generateSessionId();
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]{8}$/);
      expect(sessionId2).toMatch(/^session_\d+_[a-z0-9]{8}$/);
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});
