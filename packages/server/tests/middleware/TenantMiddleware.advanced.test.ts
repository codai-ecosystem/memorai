import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TenantMiddleware } from '../../src/middleware/TenantMiddleware';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { TenantContext } from '../../src/types/index';

describe('TenantMiddleware Advanced Coverage', () => {
  let tenantMiddleware: TenantMiddleware;
  let mockRequest: FastifyRequest;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    tenantMiddleware = new TenantMiddleware();

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockResolvedValue(undefined)
    };

    mockRequest = {
      headers: {},
      ip: '127.0.0.1'
    } as FastifyRequest;
  });

  describe('Tenant Context Loading Edge Cases', () => {
    it('should handle tenant context loading failure', async () => {
      // Mock request with auth but invalid tenant
      (mockRequest as any).auth = {
        tenantId: 'invalid-tenant'
      };

      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32003,
          message: 'Tenant not found',
          data: {
            type: 'tenant_error',
            timestamp: expect.any(String)
          }
        }
      });
    });

    it('should handle successful tenant loading', async () => {
      // Mock request with valid dev tenant
      (mockRequest as any).auth = {
        tenantId: 'dev-tenant'
      };

      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);

      expect((mockRequest as any).tenant).toBeDefined();
      expect((mockRequest as any).tenant.tenantId).toBe('dev-tenant');
      expect((mockRequest as any).tenant.name).toBe('Development Tenant');
      expect(mockReply.code).not.toHaveBeenCalled();
    });

    it('should use cached tenant context on subsequent requests', async () => {
      // First request
      (mockRequest as any).auth = {
        tenantId: 'dev-tenant'
      };

      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);
      
      // Second request with same tenant
      const mockRequest2 = {
        headers: {},
        ip: '127.0.0.1'
      } as FastifyRequest;
      
      (mockRequest2 as any).auth = {
        tenantId: 'dev-tenant'
      };

      await tenantMiddleware.loadTenant(mockRequest2, mockReply as FastifyReply);

      expect((mockRequest2 as any).tenant).toBeDefined();
      expect((mockRequest2 as any).tenant.tenantId).toBe('dev-tenant');
      expect(mockReply.code).not.toHaveBeenCalled();
    });
  });

  describe('Static Limit Checking Methods', () => {
    const mockTenantContext: TenantContext = {
      tenantId: 'test-tenant',
      name: 'Test Tenant',
      plan: 'enterprise',
      limits: {
        maxMemories: 1000,
        maxQueryRate: 100,
        maxStorageSize: 10737418240,
        retentionDays: 365
      },
      settings: {
        encryption: true,
        auditLog: true,
        customModels: true,
        vectorDimensions: 1536
      }
    };

    it('should check limits correctly', () => {
      // Test limit checking for different operations
      expect(TenantMiddleware.checkLimits(mockTenantContext, 'memory:create')).toBe(true);
      expect(TenantMiddleware.checkLimits(mockTenantContext, 'memory:query')).toBe(true);
      expect(TenantMiddleware.checkLimits(mockTenantContext, 'memory:delete')).toBe(true);
    });

    it('should handle limits with current usage', () => {
      const currentUsage = {
        memoriesCount: 500,
        storageUsed: 5368709120 // 5GB
      };

      expect(TenantMiddleware.checkLimits(mockTenantContext, 'memory:create', currentUsage)).toBe(true);
    });

    it('should handle different tenant plans', () => {
      const freeTenant: TenantContext = {
        ...mockTenantContext,
        plan: 'free'
      };

      const proTenant: TenantContext = {
        ...mockTenantContext,
        plan: 'pro'
      };

      expect(TenantMiddleware.checkLimits(freeTenant, 'memory:create')).toBe(true);
      expect(TenantMiddleware.checkLimits(proTenant, 'memory:create')).toBe(true);
    });
  });

  describe('Error Handling', () => {    it('should handle error during tenant context loading', async () => {
      // Mock an error by providing malformed auth
      (mockRequest as any).auth = null;

      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32003,
          message: 'Authentication required for tenant access',
          data: {
            type: 'tenant_error',
            timestamp: expect.any(String)
          }
        }
      });
    });    it('should handle missing auth context', async () => {
      // Request without auth context
      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32003,
          message: 'Authentication required for tenant access',
          data: {
            type: 'tenant_error',
            timestamp: expect.any(String)
          }
        }
      });
    });
  });

  describe('Cache Management', () => {
    it('should properly cache tenant contexts', async () => {
      // Load tenant context multiple times
      (mockRequest as any).auth = {
        tenantId: 'dev-tenant'
      };

      // First load
      await tenantMiddleware.loadTenant(mockRequest, mockReply as FastifyReply);
      const firstTenant = (mockRequest as any).tenant;

      // Second load (should use cache)
      const mockRequest2 = {
        headers: {},
        ip: '127.0.0.1'
      } as FastifyRequest;
      
      (mockRequest2 as any).auth = {
        tenantId: 'dev-tenant'
      };

      await tenantMiddleware.loadTenant(mockRequest2, mockReply as FastifyReply);
      const secondTenant = (mockRequest2 as any).tenant;

      // Should be the same cached object
      expect(firstTenant).toBeDefined();
      expect(secondTenant).toBeDefined();
      expect(firstTenant.tenantId).toBe(secondTenant.tenantId);
    });
  });
});
