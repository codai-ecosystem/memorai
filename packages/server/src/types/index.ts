/**
 * @fileoverview Type definitions for Memorai MCP Server
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { MemoryMetadata, MemoryQuery, ContextResponse } from '@codai/memorai-core';

// Server Configuration
export interface ServerOptions {
  port: number;
  host: string;
  cors: boolean;
  helmet: boolean;
  rateLimit: RateLimitOptions;
  jwt: JWTOptions;
  logging: LoggingOptions;
}

export interface RateLimitOptions {
  max: number;
  timeWindow: string;
  cache?: number;
}

export interface JWTOptions {
  secret: string;
  expiresIn: string;
  issuer: string;
}

export interface LoggingOptions {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'simple';
  file?: string;
}

// MCP Protocol Types
export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
  id?: string | number;
  jsonrpc: '2.0';
}

export interface MCPResponse {
  result?: any;
  error?: MCPError;
  id?: string | number;
  jsonrpc: '2.0';
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Authentication & Authorization
export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  token: string;
  expiresAt: number;
}

export interface TenantContext {
  tenantId: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  limits: TenantLimits;
  settings: TenantSettings;
}

export interface TenantLimits {
  maxMemories: number;
  maxQueryRate: number;
  maxStorageSize: number;
  retentionDays: number;
}

export interface TenantSettings {
  encryption: boolean;
  auditLog: boolean;
  customModels: boolean;
  vectorDimensions: number;
}

// Memory Operations
export interface MemoryRequest {
  operation: 'remember' | 'recall' | 'forget' | 'context';
  data?: any;
  query?: MemoryQuery;
  memoryId?: string;
  context?: ContextResponse;
}

export interface MemoryResponse {
  success: boolean;
  data?: any;
  memories?: MemoryMetadata[];
  context?: ContextResponse;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  processingTime: number;
  tokensUsed?: number;
  cacheHit?: boolean;
}

// Health & Monitoring
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheck[];
  metrics: ServerMetrics;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  duration?: number;
}

export interface ServerMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  memoryUsage: number;
  activeConnections: number;
  errorRate: number;
}

// Middleware Types
export interface AuthenticatedRequest extends FastifyRequest {
  auth: AuthContext;
  tenant: TenantContext;
}

export type MCPRouteHandler = (
  request: AuthenticatedRequest,
  reply: FastifyReply
) => Promise<MCPResponse>;

// Error Types
export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // Custom errors
  AUTHENTICATION_REQUIRED = -32000,
  AUTHORIZATION_FAILED = -32001,
  RATE_LIMIT_EXCEEDED = -32002,
  TENANT_NOT_FOUND = -32003,
  MEMORY_NOT_FOUND = -32004,
  INVALID_QUERY = -32005,
  STORAGE_ERROR = -32006
}
