import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthMiddleware } from '../../src/middleware/AuthMiddleware';
import { ServerConfig } from '../../src/config/ServerConfig';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext } from '../../src/types/index';

describe('AuthMiddleware Advanced Coverage', () => {
  let authMiddleware: AuthMiddleware;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Clear singleton
    (ServerConfig as any).instance = undefined;
    process.env.NODE_ENV = 'development';

    authMiddleware = new AuthMiddleware();

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined),
    };

    mockRequest = {
      headers: {},
    };
  });

  describe('Token Validation Edge Cases', () => {
    it('should handle production token validation failure', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'production-secret';
      (ServerConfig as any).instance = undefined;
      const prodAuth = new AuthMiddleware();

      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      await prodAuth.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Invalid authentication token',
          data: {
            type: 'authentication_error',
            timestamp: expect.any(String),
          },
        },
      });
    });

    it('should handle development token validation success', async () => {
      mockRequest.headers = {
        authorization: 'Bearer dev-token',
      };

      await authMiddleware.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect((mockRequest as any).auth).toBeDefined();
      expect((mockRequest as any).auth.userId).toBe('dev-user');
      expect((mockRequest as any).auth.tenantId).toBe('dev-tenant');
    });

    it('should handle development token validation failure', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-dev-token',
      };

      await authMiddleware.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Invalid authentication token',
          data: {
            type: 'authentication_error',
            timestamp: expect.any(String),
          },
        },
      });
    });
  });

  describe('Static Permission Methods', () => {
    const mockAuthContext: AuthContext = {
      userId: 'test-user',
      tenantId: 'test-tenant',
      roles: ['user', 'editor'],
      permissions: ['memory:read', 'memory:write'],
      token: 'test-token',
      expiresAt: Date.now() + 86400000,
    };

    it('should check permissions correctly', () => {
      expect(AuthMiddleware.hasPermission(mockAuthContext, 'memory:read')).toBe(
        true
      );
      expect(
        AuthMiddleware.hasPermission(mockAuthContext, 'memory:delete')
      ).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const adminAuth: AuthContext = {
        ...mockAuthContext,
        permissions: ['*'],
      };

      expect(AuthMiddleware.hasPermission(adminAuth, 'any:permission')).toBe(
        true
      );
    });

    it('should check roles correctly', () => {
      expect(AuthMiddleware.hasRole(mockAuthContext, 'user')).toBe(true);
      expect(AuthMiddleware.hasRole(mockAuthContext, 'admin')).toBe(false);
    });

    it('should handle admin role override', () => {
      const adminAuth: AuthContext = {
        ...mockAuthContext,
        roles: ['admin'],
      };

      expect(AuthMiddleware.hasRole(adminAuth, 'any-role')).toBe(true);
    });
  });

  describe('Token Extraction Edge Cases', () => {
    it('should handle missing authorization header', async () => {
      mockRequest.headers = {};

      await authMiddleware.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Authentication token required',
          data: {
            type: 'authentication_error',
            timestamp: expect.any(String),
          },
        },
      });
    });

    it('should handle invalid authorization header format', async () => {
      mockRequest.headers = {
        authorization: 'Basic invalid-format',
      };

      await authMiddleware.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Authentication token required',
          data: {
            type: 'authentication_error',
            timestamp: expect.any(String),
          },
        },
      });
    });
    it('should handle Bearer token without value', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      await authMiddleware.authenticate(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Authentication token required',
          data: {
            type: 'authentication_error',
            timestamp: expect.any(String),
          },
        },
      });
    });
  });
});
