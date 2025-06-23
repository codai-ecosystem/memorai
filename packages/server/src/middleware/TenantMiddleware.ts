/**
 * @fileoverview Tenant middleware for multi-tenancy support
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { AuthContext, TenantContext } from "../types/index.js";
import { Logger } from "../utils/Logger.js";

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
    reply: FastifyReply,
  ): Promise<void> {
    try {
      const auth = (request as any).auth as AuthContext;

      if (!auth) {
        await this.sendTenantError(
          reply,
          "Authentication required for tenant access",
        );
        return;
      }

      const tenantContext = await this.getTenantContext(auth.tenantId);

      if (!tenantContext) {
        await this.sendTenantError(reply, "Tenant not found");
        return;
      }

      // Add tenant context to request
      (request as any).tenant = tenantContext;

      Logger.debug("Tenant loaded");
    } catch (error: unknown) {
      Logger.error("Failed to load tenant context", {
        error: error instanceof Error ? error.message : String(error),
      });
      await this.sendTenantError(reply, "Failed to load tenant information");
    }
  }
  /**
   * Get tenant context from cache or database
   */
  private async getTenantContext(
    tenantId: string,
  ): Promise<TenantContext | null> {
    // Check cache first
    if (this.tenantCache.has(tenantId)) {
      return this.tenantCache.get(tenantId)!;
    }

    // Load from database with fallback to built-in tenants
    const tenant = await this.loadTenantFromDatabase(tenantId);

    if (tenant) {
      // Cache the tenant for 10 minutes
      this.tenantCache.set(tenantId, tenant);
      setTimeout(() => this.tenantCache.delete(tenantId), 10 * 60 * 1000);
      return tenant;
    }

    return null;
  }

  /**
   * Load tenant from database or return predefined tenant
   */
  private async loadTenantFromDatabase(
    tenantId: string,
  ): Promise<TenantContext | null> {
    try {
      // Built-in tenants for different environments
      const builtInTenants: Record<string, TenantContext> = {
        "dev-tenant": {
          tenantId: "dev-tenant",
          name: "Development Tenant",
          plan: "enterprise",
          limits: {
            maxMemories: 1000000,
            maxQueryRate: 1000,
            maxStorageSize: 10737418240, // 10GB
            retentionDays: 365,
          },
          settings: {
            encryption: true,
            auditLog: true,
            customModels: true,
            vectorDimensions: 1536,
          },
        },
        "demo-tenant": {
          tenantId: "demo-tenant",
          name: "Demo Tenant",
          plan: "pro",
          limits: {
            maxMemories: 100000,
            maxQueryRate: 100,
            maxStorageSize: 1073741824, // 1GB
            retentionDays: 90,
          },
          settings: {
            encryption: true,
            auditLog: false,
            customModels: false,
            vectorDimensions: 1536,
          },
        },
        "test-tenant": {
          tenantId: "test-tenant",
          name: "Test Tenant",
          plan: "free",
          limits: {
            maxMemories: 10000,
            maxQueryRate: 50,
            maxStorageSize: 104857600, // 100MB
            retentionDays: 30,
          },
          settings: {
            encryption: false,
            auditLog: false,
            customModels: false,
            vectorDimensions: 1536,
          },
        },
      };

      // Return built-in tenant if exists
      if (builtInTenants[tenantId]) {
        return builtInTenants[tenantId];
      }

      // TODO: Replace with actual database query when database is implemented
      // Example database query:
      // const tenant = await this.databaseService.getTenant(tenantId);
      // if (tenant) return tenant;

      Logger.warn("Tenant not found in built-in tenants");
      return null;
    } catch (error: unknown) {
      Logger.error("Error loading tenant from database", {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
  /**
   * Check if tenant has exceeded limits
   */
  public static checkLimits(
    tenant: TenantContext,
    operation: string,
    currentUsage?: {
      memoryCount?: number;
      storageUsed?: number;
      requestsInWindow?: number;
      requestWindowMs?: number;
    },
  ): boolean {
    try {
      if (!currentUsage) {
        // If no usage data provided, allow operation
        return true;
      }

      const { limits } = tenant;

      switch (operation) {
        case "create_memory":
          // Check memory count limit
          if (
            currentUsage.memoryCount !== undefined &&
            currentUsage.memoryCount >= limits.maxMemories
          ) {
            Logger.warn("Memory count limit exceeded");
            return false;
          }

          // Check storage limit
          if (
            currentUsage.storageUsed !== undefined &&
            currentUsage.storageUsed >= limits.maxStorageSize
          ) {
            Logger.warn("Storage limit exceeded");
            return false;
          }
          break;

        case "query_memory":
        case "search_memory":
          // Check rate limiting
          if (
            currentUsage.requestsInWindow !== undefined &&
            currentUsage.requestWindowMs !== undefined
          ) {
            const requestsPerSecond =
              (currentUsage.requestsInWindow * 1000) /
              currentUsage.requestWindowMs;
            if (requestsPerSecond > limits.maxQueryRate) {
              Logger.warn("Query rate limit exceeded");
              return false;
            }
          }
          break;

        case "bulk_operation":
          // Apply stricter limits for bulk operations
          if (
            currentUsage.requestsInWindow !== undefined &&
            currentUsage.requestWindowMs !== undefined
          ) {
            const requestsPerSecond =
              (currentUsage.requestsInWindow * 1000) /
              currentUsage.requestWindowMs;
            const bulkLimit = Math.floor(limits.maxQueryRate * 0.5); // 50% of normal rate for bulk
            if (requestsPerSecond > bulkLimit) {
              Logger.warn("Bulk operation rate limit exceeded");
              return false;
            }
          }
          break;

        default:
          // For unknown operations, apply general rate limiting
          if (
            currentUsage.requestsInWindow !== undefined &&
            currentUsage.requestWindowMs !== undefined
          ) {
            const requestsPerSecond =
              (currentUsage.requestsInWindow * 1000) /
              currentUsage.requestWindowMs;
            if (requestsPerSecond > limits.maxQueryRate) {
              Logger.warn("General rate limit exceeded");
              return false;
            }
          }
          break;
      }

      return true;
    } catch (error: unknown) {
      Logger.error("Error checking tenant limits", {
        tenantId: tenant.tenantId,
        operation,
        error,
      });
      // Default to allowing operation if checking fails
      return true;
    }
  }

  /**
   * Send tenant error response
   */
  private async sendTenantError(
    reply: FastifyReply,
    message: string,
  ): Promise<void> {
    await reply.code(403).send({
      jsonrpc: "2.0",
      error: {
        code: -32003, // MCPErrorCode.TENANT_NOT_FOUND
        message,
        data: {
          type: "tenant_error",
          timestamp: new Date().toISOString(),
        },
      },
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
