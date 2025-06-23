import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { MCPConnection } from "../../src/connection/MCPConnection";
import type { ConnectionOptions } from "../../src/types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("MCPConnection - Simplified Tests", () => {
  let connection: MCPConnection;
  let options: ConnectionOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    options = {
      serverUrl: "http://localhost:8080",
      apiKey: "test-key",
      timeout: 10000,
    };
    connection = new MCPConnection(options);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Basic Properties", () => {
    it("should initialize with correct properties", () => {
      expect(connection.serverUrl).toBe("http://localhost:8080");
      expect(connection.isConnected).toBe(false);
      expect(connection.pendingRequestCount).toBe(0);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully when health check passes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      await connection.connect();

      expect(connection.isConnected).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/health",
        expect.objectContaining({
          method: "GET",
          headers: {
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
          },
        }),
      );
    });

    it("should throw error when health check fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });

      await expect(connection.connect()).rejects.toThrow(
        "Failed to connect to MCP server: Server returned 503: Service Unavailable",
      );
    });

    it("should disconnect and clear pending requests", async () => {
      // Connect first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      await connection.connect();

      await connection.disconnect();
      expect(connection.isConnected).toBe(false);
    });
  });

  describe("JSON-RPC Request Handling", () => {
    beforeEach(async () => {
      // Connect before testing requests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      await connection.connect();
    });

    it("should send memory/remember request successfully", async () => {
      const mockResponse = { success: true, id: "mem123" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const request = {
        jsonrpc: "2.0" as const,
        method: "memory/remember",
        params: { agentId: "test", content: "test content" },
        id: "123",
      };

      const response = await connection.send(request);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: "123",
        result: mockResponse,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/memory/remember",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-key",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ agentId: "test", content: "test content" }),
        }),
      );
    });

    it("should handle unsupported method error", async () => {
      const request = {
        jsonrpc: "2.0" as const,
        method: "unsupported-method",
        id: "123",
      };

      const response = await connection.send(request);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: "123",
        error: {
          code: -32603,
          message: "Unsupported method: unsupported-method",
        },
      });
    });

    it("should throw error when not connected", async () => {
      await connection.disconnect();

      const request = {
        jsonrpc: "2.0" as const,
        method: "memory/remember",
        id: "123",
      };

      await expect(connection.send(request)).rejects.toThrow(
        "MCP connection not established",
      );
    });

    it("should handle HTTP error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const request = {
        jsonrpc: "2.0" as const,
        method: "memory/remember",
        params: { agentId: "test", content: "test" },
        id: "123",
      };

      const response = await connection.send(request);

      expect(response).toEqual({
        jsonrpc: "2.0",
        id: "123",
        error: {
          code: 500,
          message: "HTTP 500: Internal Server Error",
        },
      });
    });
  });

  describe("Connection Testing", () => {
    it("should test connection successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });

      const result = await connection.testConnection();
      expect(result).toBe(true);
    });

    it("should return false when test connection fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await connection.testConnection();
      expect(result).toBe(false);
    });
  });

  describe("Direct Memory Operations", () => {
    beforeEach(async () => {
      // Connect before testing operations
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
      });
      await connection.connect();
    });

    it("should remember successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(
        connection.remember("test-agent", "test content"),
      ).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/memory/remember",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            agentId: "test-agent",
            content: "test content",
          }),
        }),
      );
    });
    it("should recall successfully", async () => {
      const mockResults = [{ id: "1", content: "remembered content" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ memories: mockResults }),
      });

      const results = await connection.recall("test-agent", "test query");
      expect(results).toEqual(mockResults);
    });
    it("should get context successfully", async () => {
      const mockContext = [{ summary: "test context" }];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ memories: mockContext }),
      });

      const context = await connection.getContext("test-agent");
      expect(context).toEqual(mockContext);
    });

    it("should forget successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await expect(
        connection.forget("test-agent", "mem123"),
      ).resolves.not.toThrow();
    });
  });
});
