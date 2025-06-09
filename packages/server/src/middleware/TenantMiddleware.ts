/**
 * @fileoverview Tenant middleware for multi-tenancy support
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext, TenantContext } from '../types/index.js';
import { Logger } from '../utils/Logger.js';

/**
 * Tenant middleware for handling multi-tenant context
 */
export class TenantMiddleware {
  private tenantCache = new Map<string, TenantContext>();
  
  /**
   * Load tenant context based on authentication
   */
  public async loadTenant(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthContext;
      
      if (!auth) {
        await this.sendTenantError(reply, 'Authentication required for tenant access');
        return;
      }
      
      const tenantContext = await this.getTenantContext(auth.tenantId);
      
      if (!tenantContext) {
        await this.sendTenantError(reply, 'Tenant not found');
        return;
      }
      
      // Add tenant context to request
      (request as any).tenant = tenantContext;
      
      Logger.debug('Tenant loaded', {
        tenantId: tenantContext.tenantId,
        plan: tenantContext.plan
      });
      
    } catch (error) {
      Logger.error('Failed to load tenant context', error);
      await this.sendTenantError(reply, 'Failed to load tenant information');
    }
  }
  
  /**
   * Get tenant context from cache or database
   */
  private async getTenantContext(tenantId: string): Promise<TenantContext | null> {
    // Check cache first
    if (this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }
    
    // TODO: Load from database
    // For now, return mock tenant for development
    if (tenantId === 'dev-tenant') {
      const tenant: TenantContext = {
        tenantId: 'dev-tenant',
        name: 'Development Tenant',
        plan: 'enterprise',
        limits: {
          maxMemories: 1000000,
          maxQueryRate: 1000,
          maxStorageSize: 10737418240, // 10GB
          retentionDays: 365
        },
        settings: {
          encryption: true,
          auditLog: true,
          customModels: true,
          vectorDimensions: 1536
        }
      };
      
      this.tenantCache.set(tenantId, tenant);
      return tenant;
    }
    
    return null;
  }
  
  /**
   * Check if tenant has exceeded limits
   */
  public static checkLimits(
    tenant: TenantContext,
    operation: string,
    currentUsage?: any
  ): boolean {
    // TODO: Implement proper limit checking
    // For now, always allow in development
    return true;
  }
  
  /**
   * Send tenant error response
   */
  private async sendTenantError(
    reply: FastifyReply,
    message: string
  ): Promise<void> {
    await reply.code(403).send({
      jsonrpc: '2.0',
      error: {
        code: -32003, // MCPErrorCode.TENANT_NOT_FOUND
        message,
        data: {
          type: 'tenant_error',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  /**
   * Clear tenant cache entry
   */
  public clearTenantCache(tenantId: string): void {
    this.tenantCache.delete(tenantId);
  }
  
  /**
   * Clear all tenant cache
   */
  public clearAllCache(): void {
    this.tenantCache.clear();
  }
}
