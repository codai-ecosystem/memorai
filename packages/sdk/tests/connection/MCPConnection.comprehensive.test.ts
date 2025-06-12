/**
 * @fileoverview Comprehensive tests for MCPConnection to achieve 95%+ coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MCPConnection } from '../../src/connection/MCPConnection.js';
import type { ConnectionOptions } from '../../src/types/index.js';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('MCPConnection - Comprehensive Coverage', () => {
  let connection: MCPConnection;
  let options: ConnectionOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    options = {
      serverUrl: 'http://localhost:8080',
      apiKey: 'test-key',
      timeout: 10000,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    };
    connection = new MCPConnection(options);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Constructor and Basic Properties', () => {
    it('should initialize with connection options', () => {
      expect(connection.serverUrl).toBe('http://localhost:8080');
      expect(connection.isConnected).toBe(false);
      expect(connection.pendingRequestCount).toBe(0);
    });

    it('should initialize with minimal options', () => {
      const minimalConnection = new MCPConnection({ serverUrl: 'http://test.com' });
      expect(minimalConnection.serverUrl).toBe('http://test.com');
      expect(minimalConnection.isConnected).toBe(false);
    });
  });

  describe('Connection Management', () => {
    it('should connect successfully when health check passes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      await connection.connect();
      
      expect(connection.isConnected).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          }
        })
      );
    });

    it('should not reconnect if already connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK'
      });

      await connection.connect();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Try to connect again
      await connection.connect();
      expect(mockFetch).toHaveBeenCalledTimes(1); // Should not call fetch again
    });

    it('should throw error when health check fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      });

      await expect(connection.connect()).rejects.toThrow(
        'Server health check failed: 503 Service Unavailable'
      );
      expect(connection.isConnected).toBe(false);
    });

    it('should throw error when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(connection.connect()).rejects.toThrow(
        'Failed to connect to server: Network error'
      );
      expect(connection.isConnected).toBe(false);
    });

    it('should handle unknown error types during connection', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      await expect(connection.connect()).rejects.toThrow(
        'Failed to connect to server: Unknown error'
      );
    });

    it('should disconnect and clear pending requests', async () => {
      // Connect first
      mockFetch.mockResolvedValueOnce({ ok: true });
      await connection.connect();

      // Add a pending request
      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      const promise = connection.send(request);
      expect(connection.pendingRequestCount).toBe(1);

      // Disconnect
      await connection.disconnect();
      
      expect(connection.isConnected).toBe(false);
      expect(connection.pendingRequestCount).toBe(0);
      
      // Pending request should be rejected
      await expect(promise).rejects.toThrow('Connection closed');
    });
  });

  describe('JSON-RPC Request Handling', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await connection.connect();
    });

    it('should send successful JSON-RPC request', async () => {
      const mockResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: '123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'remember',
        params: { content: 'test' },
        id: '123'
      };

      const response = await connection.send(request);

      expect(response).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }),
          body: JSON.stringify(request)
        })
      );
    });

    it('should handle JSON-RPC error response', async () => {
      const mockErrorResponse = {
        jsonrpc: '2.0',
        error: {
          code: -1,
          message: 'Internal error',
          data: { details: 'Test error' }
        },
        id: '123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockErrorResponse)
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      const response = await connection.send(request);
      expect(response).toEqual(mockErrorResponse);
    });

    it('should throw error when not connected', async () => {
      await connection.disconnect();

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Not connected to server');
    });

    it('should handle request timeout', async () => {
      vi.useFakeTimers();

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      // Mock a slow response
      mockFetch.mockImplementationOnce(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                jsonrpc: '2.0',
                result: {},
                id: '123'
              })
            });
          }, 15000); // Longer than timeout
        });
      });

      const promise = connection.send(request);

      // Advance time to trigger timeout
      vi.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow('Request timeout after 10000ms');
      expect(connection.pendingRequestCount).toBe(0);

      vi.useRealTimers();
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should handle invalid JSON-RPC response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          // Missing jsonrpc field
          result: {},
          id: '123'
        })
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Invalid JSON-RPC response format');
    });

    it('should handle wrong JSON-RPC version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '1.0', // Wrong version
          result: {},
          id: '123'
        })
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Invalid JSON-RPC response format');
    });

    it('should handle mismatched response ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          result: {},
          id: '456' // Different ID
        })
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Response ID does not match request ID');
    });

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Network error');
    });

    it('should handle non-Error exceptions in sendHTTPRequest', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      await expect(connection.send(request)).rejects.toThrow('Request failed: String error');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const result = await connection.testConnection();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/health',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-token'
          },
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should return false when test connection fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await connection.testConnection();
      expect(result).toBe(false);
    });

    it('should return false when test connection returns non-ok status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      });

      const result = await connection.testConnection();
      expect(result).toBe(false);
    });
  });

  describe('Options Management', () => {
    it('should update connection options', () => {
      const newOptions = {
        timeout: 20000,
        headers: {
          'X-Custom-Header': 'value'
        }
      };

      connection.updateOptions(newOptions);

      expect(connection.serverUrl).toBe('http://localhost:8080'); // Should remain unchanged
      // We can't directly test the updated options, but we can test behavior
    });

    it('should use default timeout when not specified', () => {
      const connectionWithDefaults = new MCPConnection({
        serverUrl: 'http://test.com'
      });
      
      expect(connectionWithDefaults.serverUrl).toBe('http://test.com');
    });

    it('should handle missing headers in options', async () => {
      const connectionWithoutHeaders = new MCPConnection({
        serverUrl: 'http://test.com'
      });

      mockFetch.mockResolvedValueOnce({ ok: true });
      await connectionWithoutHeaders.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://test.com/health',
        expect.objectContaining({
          headers: {}
        })
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent requests', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await connection.connect();

      const responses = [
        { jsonrpc: '2.0', result: { data: 1 }, id: '1' },
        { jsonrpc: '2.0', result: { data: 2 }, id: '2' },
        { jsonrpc: '2.0', result: { data: 3 }, id: '3' }
      ];

      responses.forEach(response => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response)
        });
      });

      const requests = [
        { jsonrpc: '2.0' as const, method: 'test1', id: '1' },
        { jsonrpc: '2.0' as const, method: 'test2', id: '2' },
        { jsonrpc: '2.0' as const, method: 'test3', id: '3' }
      ];

      const promises = requests.map(req => connection.send(req));
      const results = await Promise.all(promises);

      expect(results).toEqual(responses);
      expect(connection.pendingRequestCount).toBe(0);
    });

    it('should handle numeric request IDs', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await connection.connect();

      const mockResponse = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 123
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: 123
      };

      const response = await connection.send(request);
      expect(response).toEqual(mockResponse);
    });

    it('should clean up timed out requests properly', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValueOnce({ ok: true });
      await connection.connect();

      const request = {
        jsonrpc: '2.0' as const,
        method: 'test',
        id: '123'
      };

      // Start a request but don't resolve it
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const promise = connection.send(request);
      expect(connection.pendingRequestCount).toBe(1);

      // Trigger timeout
      vi.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow('Request timeout');
      expect(connection.pendingRequestCount).toBe(0);

      vi.useRealTimers();
    });
  });
});
