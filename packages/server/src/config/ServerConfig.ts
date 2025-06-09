/**
 * @fileoverview Server configuration for Memorai MCP Server
 */

import { config } from 'dotenv';
import type { ServerOptions, RateLimitOptions, JWTOptions, LoggingOptions } from '../types/index.js';

// Load environment variables
config();

/**
 * Server configuration class
 */
export class ServerConfig {
  private static instance: ServerConfig;
  
  public readonly options: ServerOptions;
  
  private constructor() {
    this.options = this.loadConfiguration();
  }
  
  public static getInstance(): ServerConfig {
    if (!ServerConfig.instance) {
      ServerConfig.instance = new ServerConfig();
    }
    return ServerConfig.instance;
  }
  
  private loadConfiguration(): ServerOptions {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || 'localhost';
    
    const rateLimit: RateLimitOptions = {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
      cache: parseInt(process.env.RATE_LIMIT_CACHE || '5000', 10)
    };
    
    const jwt: JWTOptions = {
      secret: process.env.JWT_SECRET || this.generateSecret(),
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: process.env.JWT_ISSUER || 'memorai-mcp'
    };
      const logging: LoggingOptions = {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json',
      ...(process.env.LOG_FILE && { file: process.env.LOG_FILE })
    };
    
    return {
      port,
      host,
      cors: process.env.CORS !== 'false',
      helmet: process.env.HELMET !== 'false',
      rateLimit,
      jwt,
      logging
    };
  }
  
  private generateSecret(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    return 'development-secret-key-change-in-production';
  }
  
  public getPort(): number {
    return this.options.port;
  }
  
  public getHost(): string {
    return this.options.host;
  }
  
  public getJWTSecret(): string {
    return this.options.jwt.secret;
  }
  
  public isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
  
  public isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }
}
