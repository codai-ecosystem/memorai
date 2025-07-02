/**
 * Security Types for Memorai Enterprise Memory System
 */

export interface SecurityEvent {
  timestamp: Date;
  eventType: string;
  threatTypes: string[];
  clientIP: string;
  userAgent: string;
  tenantId: string;
  agentId?: string;
  action: 'allow' | 'block' | 'throttle';
  confidence: number;
  content?: string;
}

export interface ThreatPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  severity: 'low' | 'medium' | 'high';
  action: 'allow' | 'block' | 'throttle';
  description: string;
}

export interface SecurityConfig {
  bruteForceThreshold: number;
  maxRequestsPerWindow: number;
  maxSecurityEvents: number;
  eventRetentionMs: number;
  cleanupIntervalMs: number;
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  ddosProtection: {
    enabled: boolean;
    threshold: number;
    blockDurationMs: number;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    rotationIntervalMs: number;
  };
}

export interface RateLimitRule {
  tenantId?: string;
  agentId?: string;
  ipAddress?: string;
  maxRequests: number;
  windowMs: number;
  action: 'throttle' | 'block';
}

export interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  throttledRequests: number;
  threatsDetected: number;
  avgResponseTime: number;
  securityOverhead: number;
}

export interface EncryptionKey {
  id: string;
  algorithm: string;
  key: Buffer;
  createdAt: Date;
  lastUsed: Date;
  rotationDue: Date;
}

export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  tenantId: string;
  agentId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'blocked';
  ipAddress: string;
  userAgent: string;
  details?: Record<string, unknown>;
}
