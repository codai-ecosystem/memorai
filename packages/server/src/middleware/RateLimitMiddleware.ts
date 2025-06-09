/**
 * @fileoverview Rate limiting middleware for Memorai MCP Server
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { Logger } from '../utils/Logger.js';

/**
 * Rate limiting middleware to prevent abuse
 */
export class RateLimitMiddleware {
  private requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if request should be rate limited
   */
  public async checkRateLimit(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const clientId = this.getClientId(request);
    const now = Date.now();
    
    // Get existing requests for this client
    let requests = this.requests.get(clientId) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(time => now - time < this.windowMs);
    
    // Check if limit exceeded
    if (requests.length >= this.maxRequests) {
      Logger.warn('Rate limit exceeded', {
        clientId,
        requests: requests.length,
        limit: this.maxRequests
      });
      
      await this.sendRateLimitError(reply);
      return;
    }
    
    // Add current request
    requests.push(now);
    this.requests.set(clientId, requests);
    
    // Set rate limit headers
    reply.header('X-RateLimit-Limit', this.maxRequests);
    reply.header('X-RateLimit-Remaining', this.maxRequests - requests.length);
    reply.header('X-RateLimit-Reset', new Date(now + this.windowMs).toISOString());
  }
  
  /**
   * Get unique client identifier
   */
  private getClientId(request: FastifyRequest): string {
    // Use auth context if available, fallback to IP
    const auth = (request as any).auth;
    if (auth) {
      return `user:${auth.userId}`;
    }
    
    return `ip:${request.ip}`;
  }
  
  /**
   * Send rate limit error response
   */
  private async sendRateLimitError(reply: FastifyReply): Promise<void> {
    await reply.code(429).send({
      jsonrpc: '2.0',
      error: {
        code: -32002, // MCPErrorCode.RATE_LIMIT_EXCEEDED
        message: 'Rate limit exceeded',
        data: {
          type: 'rate_limit_error',
          retryAfter: Math.ceil(this.windowMs / 1000),
          timestamp: new Date().toISOString()
        }
      }
    });
  }
  
  /**
   * Clean up old entries periodically
   */
  public cleanup(): void {
    const now = Date.now();
    
    for (const [clientId, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      
      if (validRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, validRequests);
      }
    }
  }
}
