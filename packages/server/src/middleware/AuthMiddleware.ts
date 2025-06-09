/**
 * @fileoverview Authentication middleware for Memorai MCP Server
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthContext, MCPErrorCode } from '../types/index.js';
import { ServerConfig } from '../config/ServerConfig.js';
import { Logger } from '../utils/Logger.js';

/**
 * Authentication middleware for validating JWT tokens and user context
 */
export class AuthMiddleware {
  private config: ServerConfig;
  
  constructor() {
    this.config = ServerConfig.getInstance();
  }
  
  /**
   * Fastify hook for authentication
   */
  public async authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const token = this.extractToken(request);
      
      if (!token) {
        return this.sendAuthError(reply, 'Authentication token required');
      }
      
      const authContext = await this.validateToken(token);
      
      // Add auth context to request
      (request as any).auth = authContext;
      
      Logger.debug('Authentication successful', {
        userId: authContext.userId,
        tenantId: authContext.tenantId
      });
      
    } catch (error) {
      Logger.error('Authentication failed', error);
      return this.sendAuthError(reply, 'Invalid authentication token');
    }
  }
  
  /**
   * Extract JWT token from request headers
   */
  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
  
  /**
   * Validate JWT token and return auth context
   */
  private async validateToken(token: string): Promise<AuthContext> {
    // TODO: Implement proper JWT validation with your JWT library
    // For now, return a mock context for development
    
    if (this.config.isDevelopment() && token === 'dev-token') {
      return {
        userId: 'dev-user',
        tenantId: 'dev-tenant',
        roles: ['user'],
        permissions: ['memory:read', 'memory:write'],
        token,
        expiresAt: Date.now() + 86400000 // 24 hours
      };
    }
    
    // In production, implement proper JWT verification here
    throw new Error('Token validation not implemented');
  }
  
  /**
   * Send authentication error response
   */
  private async sendAuthError(
    reply: FastifyReply,
    message: string
  ): Promise<void> {
    await reply.code(401).send({
      jsonrpc: '2.0',
      error: {
        code: -32000, // MCPErrorCode.AUTHENTICATION_REQUIRED
        message,
        data: {
          type: 'authentication_error',
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  /**
   * Check if user has required permission
   */
  public static hasPermission(
    auth: AuthContext,
    permission: string
  ): boolean {
    return auth.permissions.includes(permission) || 
           auth.permissions.includes('*');
  }
  
  /**
   * Check if user has required role
   */
  public static hasRole(auth: AuthContext, role: string): boolean {
    return auth.roles.includes(role) || auth.roles.includes('admin');
  }
}
