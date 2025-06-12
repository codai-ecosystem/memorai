/**
 * @fileoverview Basic tests for AuthMiddleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthMiddleware } from '../../src/middleware/AuthMiddleware.js';

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    authMiddleware = new AuthMiddleware();
    
    mockRequest = {
      headers: {},
      method: 'GET',
      url: '/test'
    };
    
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };
  });

  describe('Constructor', () => {
    it('should create AuthMiddleware instance', () => {
      expect(authMiddleware).toBeInstanceOf(AuthMiddleware);
    });
  });

  describe('authenticate', () => {    it('should handle missing authorization header', async () => {
      await authMiddleware.authenticate(mockRequest, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Authentication token required'
          })
        })
      );
    });

    it('should handle invalid authorization format', async () => {
      mockRequest.headers.authorization = 'InvalidFormat token123';
      
      await authMiddleware.authenticate(mockRequest, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });

    it('should handle empty bearer token', async () => {
      mockRequest.headers.authorization = 'Bearer ';
      
      await authMiddleware.authenticate(mockRequest, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });

    it('should handle malformed bearer token', async () => {
      mockRequest.headers.authorization = 'Bearer';
      
      await authMiddleware.authenticate(mockRequest, mockReply);
      
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });
  });

  describe('Static Helper Methods', () => {
    it('should have extractToken method', () => {
      expect(typeof (authMiddleware as any).extractToken).toBe('function');
    });

    it('should have validateToken method', () => {
      expect(typeof (authMiddleware as any).validateToken).toBe('function');
    });

    it('should have sendAuthError method', () => {
      expect(typeof (authMiddleware as any).sendAuthError).toBe('function');
    });
  });
});
