// Security Module Exports
export { ThreatDetectionEngine } from './ThreatDetectionEngine.js';
export { EnterpriseRateLimiter } from './EnterpriseRateLimiter.js';
export { DDoSProtectionLayer } from './DDoSProtectionLayer.js';
export { AdvancedEncryptionService } from './AdvancedEncryptionService.js';
export { SecurityAuditFramework } from './SecurityAuditFramework.js';
export { 
  EnterpriseSecurityManager,
  type SecurityValidationResult,
  type MemorySecurityContext
} from './EnterpriseSecurityManager.js';

// Security Types
export type {
  SecurityEvent,
  ThreatPattern,
  SecurityConfig,
  RateLimitRule,
  SecurityMetrics,
  EncryptionKey,
  AuditLogEntry
} from '../types/Security.js';

import type { SecurityConfig } from '../types/Security.js';
import { EnterpriseSecurityManager } from './EnterpriseSecurityManager.js';

/**
 * Default Security Configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  bruteForceThreshold: 10,
  maxRequestsPerWindow: 100,
  maxSecurityEvents: 10000,
  eventRetentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  cleanupIntervalMs: 60 * 60 * 1000, // 1 hour
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false
  },
  ddosProtection: {
    enabled: true,
    threshold: 1000, // requests per second
    blockDurationMs: 15 * 60 * 1000 // 15 minutes
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    rotationIntervalMs: 24 * 60 * 60 * 1000 // 24 hours
  }
};

/**
 * Create enterprise security manager with default configuration
 */
export function createSecurityManager(config?: Partial<SecurityConfig>): EnterpriseSecurityManager {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  return new EnterpriseSecurityManager(finalConfig);
}

/**
 * Security utilities
 */
export const SecurityUtils = {
  /**
   * Generate secure random string
   */
  generateSecureToken(length: number = 32): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  /**
   * Validate IP address format
   */
  isValidIP(ip: string): boolean {
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },

  /**
   * Check if IP is in private range
   */
  isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fe80:/
    ];
    return privateRanges.some(range => range.test(ip));
  },

  /**
   * Calculate threat confidence score
   */
  calculateThreatConfidence(factors: {
    patternMatches: number;
    totalPatterns: number;
    severity: 'low' | 'medium' | 'high';
    repeatOffender: boolean;
  }): number {
    let confidence = factors.patternMatches / factors.totalPatterns;
    
    // Adjust for severity
    switch (factors.severity) {
      case 'high':
        confidence *= 1.5;
        break;
      case 'medium':
        confidence *= 1.2;
        break;
      case 'low':
        confidence *= 0.8;
        break;
    }
    
    // Adjust for repeat offenders
    if (factors.repeatOffender) {
      confidence *= 1.3;
    }
    
    return Math.min(confidence, 1.0);
  }
};
