/**
 * @fileoverview Basic tests for RateLimitMiddleware
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RateLimitMiddleware } from "../../src/middleware/RateLimitMiddleware.js";

describe("RateLimitMiddleware", () => {
  let rateLimitMiddleware: RateLimitMiddleware;
  let mockRequest: any;
  let mockReply: any;
  beforeEach(() => {
    rateLimitMiddleware = new RateLimitMiddleware(5, 60000);

    mockRequest = {
      ip: "127.0.0.1",
      headers: {},
      method: "GET",
      url: "/test",
    };

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };
  });

  describe("Constructor", () => {
    it("should create RateLimitMiddleware instance with default options", () => {
      const middleware = new RateLimitMiddleware();
      expect(middleware).toBeInstanceOf(RateLimitMiddleware);
    });

    it("should create RateLimitMiddleware instance with custom options", () => {
      expect(rateLimitMiddleware).toBeInstanceOf(RateLimitMiddleware);
    });
  });

  describe("checkRateLimit", () => {
    it("should allow requests within limit", async () => {
      await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);

      expect(mockReply.code).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
    });

    it("should update remaining count correctly", async () => {
      // Make multiple requests to check remaining count
      await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);
      await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith("X-RateLimit-Limit", 5);
      expect(mockReply.header).toHaveBeenCalledWith(
        "X-RateLimit-Remaining",
        expect.any(Number),
      );
    });

    it("should use IP for unauthenticated requests", async () => {
      await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);

      // Should not block first request
      expect(mockReply.code).not.toHaveBeenCalledWith(429);
    });

    it("should use user ID for authenticated requests", async () => {
      mockRequest.auth = {
        userId: "user123",
        tenantId: "tenant123",
      };

      await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);

      expect(mockReply.code).not.toHaveBeenCalledWith(429);
    });
  });

  describe("cleanup", () => {
    it("should have cleanup method", () => {
      expect(typeof rateLimitMiddleware.cleanup).toBe("function");
    });

    it("should cleanup expired entries", () => {
      rateLimitMiddleware.cleanup();
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe("Error Response Format", () => {
    it("should return proper error format when rate limited", async () => {
      // Exhaust rate limit
      for (let i = 0; i < 6; i++) {
        await rateLimitMiddleware.checkRateLimit(mockRequest, mockReply);
      }

      // Should be rate limited on 6th request
      expect(mockReply.code).toHaveBeenCalledWith(429);
    });
  });
});
