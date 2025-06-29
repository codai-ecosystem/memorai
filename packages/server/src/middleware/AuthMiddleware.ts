/**
 * @fileoverview Authentication middleware for Memorai MCP Server
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { ServerConfig } from '../config/ServerConfig.js';
import type { AuthContext } from '../types/index.js';
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

      Logger.debug('Authentication successful');
    } catch (error: unknown) {
      Logger.error('Authentication failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.sendAuthError(reply, 'Invalid authentication token');
    }
  }

  /**
   * Extract JWT token from request headers
   */
  private extractToken(_request: FastifyRequest): string | null {
    const authHeader = _request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }
  /**
   * Validate JWT token and return auth context
   */
  private async validateToken(token: string): Promise<AuthContext> {
    try {
      // Development mode: simplified validation
      if (this.config.isDevelopment() && token === 'dev-token') {
        return {
          userId: 'dev-user',
          tenantId: 'dev-tenant',
          roles: ['user'],
          permissions: ['memory:read', 'memory:write'],
          token,
          expiresAt: Date.now() + 86400000, // 24 hours
        };
      }

      // Production JWT validation with enhanced security
      if (!this.config.isDevelopment()) {
        return await this.validateProductionJWT(token);
      }

      // Development mode fallback - should not reach here
      throw new Error('Invalid authentication configuration');
    } catch (error: unknown) {
      throw new Error(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate JWT token with full signature verification for production
   */
  private async validateProductionJWT(token: string): Promise<AuthContext> {
    try {
      // Basic JWT structure validation
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const [headerStr, payloadStr, signature] = parts;

      if (!headerStr || !payloadStr || !signature) {
        throw new Error('Missing JWT components');
      }

      // Verify JWT signature
      const secretKey = process.env.JWT_SECRET || 'memorai-default-secret';
      const expectedSignature = await this.generateJWTSignature(
        `${headerStr}.${payloadStr}`,
        secretKey
      );

      // Constant-time comparison for security
      if (!this.timingSafeEqual(signature, expectedSignature)) {
        throw new Error('Invalid token signature');
      }

      // Decode and validate payload
      const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());

      // Enhanced validation for production
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired');
      }

      if (!payload.sub || !payload.tenant_id) {
        throw new Error('Invalid token payload - missing required fields');
      }

      // Additional security checks
      const expectedIssuer = process.env.JWT_ISSUER || 'memorai';
      if (payload.iss && payload.iss !== expectedIssuer) {
        throw new Error('Invalid token issuer');
      }

      // Validate audience if present
      const expectedAudience = process.env.JWT_AUDIENCE || 'memorai-api';
      if (payload.aud && payload.aud !== expectedAudience) {
        throw new Error('Invalid token audience');
      }

      return {
        userId: payload.sub,
        tenantId: payload.tenant_id,
        roles: payload.roles || ['user'],
        permissions: payload.permissions || ['memory:read'],
        token,
        expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 3600000,
      };
    } catch (error) {
      throw new Error(
        `JWT validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate JWT signature using HMAC-SHA256
   */
  private async generateJWTSignature(
    data: string,
    secret: string
  ): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHmac('sha256', secret).update(data).digest('base64url');
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
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
          timestamp: new Date().toISOString(),
        },
      },
    });
  }

  /**
   * Check if user has required permission
   */
  public static hasPermission(auth: AuthContext, permission: string): boolean {
    return (
      auth.permissions.includes(permission) || auth.permissions.includes('*')
    );
  }

  /**
   * Check if user has required role
   */
  public static hasRole(auth: AuthContext, role: string): boolean {
    return auth.roles.includes(role) || auth.roles.includes('admin');
  }
}
