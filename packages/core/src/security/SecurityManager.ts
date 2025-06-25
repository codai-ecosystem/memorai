/**
 * Security utilities and enhancements for Memorai
 * Includes input validation, rate limiting, and security auditing
 */

import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from 'crypto';
import { logger } from '../utils/logger.js';

export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  allowedValues?: string[] | number[];
  customValidator?: (value: unknown) => boolean | string;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (tenantId: string, agentId?: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface SecurityAuditEvent {
  timestamp: Date;
  eventType:
    | 'auth'
    | 'access'
    | 'modification'
    | 'error'
    | 'security_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenantId: string;
  agentId?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export class InputValidator {
  /**
   * Validate input against a set of rules
   */
  public static validate(
    input: Record<string, unknown>,
    rules: ValidationRule[]
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const rule of rules) {
      const value = input[rule.field];

      // Check required fields
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Field '${rule.field}' is required`);
        continue;
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (!this.validateType(value, rule.type)) {
        errors.push(`Field '${rule.field}' must be of type ${rule.type}`);
        continue;
      }

      // String-specific validations
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(
            `Field '${rule.field}' must be at least ${rule.minLength} characters`
          );
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(
            `Field '${rule.field}' must be no more than ${rule.maxLength} characters`
          );
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`Field '${rule.field}' format is invalid`);
        }
      }

      // Array-specific validations
      if (rule.type === 'array' && Array.isArray(value)) {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(
            `Field '${rule.field}' must have at least ${rule.minLength} items`
          );
        }

        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(
            `Field '${rule.field}' must have no more than ${rule.maxLength} items`
          );
        }
      } // Allowed values validation
      if (rule.allowedValues && rule.allowedValues.length > 0) {
        const allowedValues = rule.allowedValues as (string | number)[];
        if (!allowedValues.includes(value as string | number)) {
          errors.push(
            `Field '${rule.field}' must be one of: ${rule.allowedValues.join(', ')}`
          );
        }
      }

      // Custom validation
      if (rule.customValidator) {
        const customResult = rule.customValidator(value);
        if (customResult !== true) {
          errors.push(
            typeof customResult === 'string'
              ? customResult
              : `Field '${rule.field}' is invalid`
          );
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize string input to prevent injection attacks
   */
  public static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes that could break SQL/JS
      .replace(/[\\]/g, '') // Remove backslashes
      .trim();
  }

  /**
   * Validate and sanitize memory content
   */
  public static validateMemoryContent(content: string): {
    isValid: boolean;
    sanitizedContent: string;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!content || typeof content !== 'string') {
      errors.push('Content must be a non-empty string');
      return { isValid: false, sanitizedContent: '', errors };
    }

    if (content.length > 10000) {
      errors.push('Content exceeds maximum length of 10,000 characters');
    }

    if (content.length < 1) {
      errors.push('Content cannot be empty');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /expression\s*\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        errors.push('Content contains potentially malicious code');
        break;
      }
    }

    const sanitizedContent = this.sanitizeString(content);

    return {
      isValid: errors.length === 0,
      sanitizedContent,
      errors,
    };
  }

  private static validateType(value: unknown, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return (
          typeof value === 'object' && value !== null && !Array.isArray(value)
        );
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }
}

export class RateLimiter {
  private requests = new Map<string, { count: number; windowStart: number }>();

  constructor(private config: RateLimitConfig) {}

  /**
   * Check if a request should be allowed
   */
  public isAllowed(
    tenantId: string,
    agentId?: string
  ): {
    allowed: boolean;
    remainingRequests: number;
    resetTime: Date;
  } {
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(tenantId, agentId)
      : `${tenantId}:${agentId || 'default'}`;

    const now = Date.now();
    const windowStart =
      Math.floor(now / this.config.windowMs) * this.config.windowMs;

    let requestData = this.requests.get(key);

    // Initialize or reset window
    if (!requestData || requestData.windowStart < windowStart) {
      requestData = { count: 0, windowStart };
      this.requests.set(key, requestData);
    }

    const allowed = requestData.count < this.config.maxRequests;

    if (allowed) {
      requestData.count++;
    }

    return {
      allowed,
      remainingRequests: Math.max(
        0,
        this.config.maxRequests - requestData.count
      ),
      resetTime: new Date(windowStart + this.config.windowMs),
    };
  }

  /**
   * Get current rate limit status for a tenant/agent
   */
  public getStatus(
    tenantId: string,
    agentId?: string
  ): {
    requestCount: number;
    remainingRequests: number;
    resetTime: Date;
  } {
    const result = this.isAllowed(tenantId, agentId);
    const key = this.config.keyGenerator
      ? this.config.keyGenerator(tenantId, agentId)
      : `${tenantId}:${agentId || 'default'}`;

    const requestData = this.requests.get(key);

    return {
      requestCount: requestData?.count || 0,
      remainingRequests: result.remainingRequests,
      resetTime: result.resetTime,
    };
  }

  /**
   * Clear rate limit data (useful for testing)
   */
  public clear(): void {
    this.requests.clear();
  }
}

export class SecurityAuditor {
  private auditLog: SecurityAuditEvent[] = [];
  private readonly maxLogSize = 10000;

  /**
   * Log a security audit event
   */
  public logEvent(event: Omit<SecurityAuditEvent, 'timestamp'>): void {
    const auditEvent: SecurityAuditEvent = {
      timestamp: new Date(),
      ...event,
    };

    this.auditLog.push(auditEvent);

    // Rotate log if it gets too large
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-Math.floor(this.maxLogSize * 0.8));
    } // Log critical events immediately
    if (event.severity === 'critical') {
      logger.error('CRITICAL SECURITY EVENT:', auditEvent);
    }
  }

  /**
   * Get audit events for a specific tenant
   */
  public getTenantAuditLog(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      eventType?: SecurityAuditEvent['eventType'];
      severity?: SecurityAuditEvent['severity'];
      limit?: number;
    } = {}
  ): SecurityAuditEvent[] {
    let events = this.auditLog.filter(event => event.tenantId === tenantId);

    if (options.startDate) {
      events = events.filter(event => event.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      events = events.filter(event => event.timestamp <= options.endDate!);
    }

    if (options.eventType) {
      events = events.filter(event => event.eventType === options.eventType);
    }

    if (options.severity) {
      events = events.filter(event => event.severity === options.severity);
    }

    // Sort by timestamp descending (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(tenantId?: string): {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
    failureRate: number;
    recentCriticalEvents: number;
  } {
    const events = tenantId
      ? this.auditLog.filter(event => event.tenantId === tenantId)
      : this.auditLog;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentEvents = events.filter(event => event.timestamp >= oneDayAgo);
    const recentCriticalEvents = recentEvents.filter(
      event => event.severity === 'critical'
    ).length;

    const eventsBySeverity = events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const eventsByType = events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const failedEvents = events.filter(event => !event.success).length;
    const failureRate = events.length > 0 ? failedEvents / events.length : 0;

    return {
      totalEvents: events.length,
      eventsBySeverity,
      eventsByType,
      failureRate,
      recentCriticalEvents,
    };
  }

  /**
   * Export audit log for external security systems
   */
  public exportAuditLog(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp',
        'eventType',
        'severity',
        'tenantId',
        'agentId',
        'action',
        'resource',
        'success',
        'errorMessage',
      ];

      const rows = this.auditLog.map(event => [
        event.timestamp.toISOString(),
        event.eventType,
        event.severity,
        event.tenantId,
        event.agentId || '',
        event.action,
        event.resource || '',
        event.success.toString(),
        event.errorMessage || '',
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(this.auditLog, null, 2);
  }
}

export class EncryptionManager {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;

  constructor(private encryptionKey: string) {
    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
    // Create a 32-byte key from the input string
    this.key = createHash('sha256').update(encryptionKey).digest();
  } /**
   * Encrypt sensitive data
   */
  public encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }
  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    const ivPart = parts[0];
    const encryptedPart = parts[1];

    if (!ivPart || !encryptedPart) {
      throw new Error('Invalid encrypted text format - missing parts');
    }
    const iv = Buffer.from(ivPart, 'hex');

    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    let decrypted: string = decipher.update(encryptedPart, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash data for secure comparison
   */
  public hash(data: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256');
    hash.update(data + actualSalt);

    return actualSalt + ':' + hash.digest('hex');
  }
  /**
   * Verify hashed data
   */
  public verifyHash(data: string, hashedData: string): boolean {
    const parts = hashedData.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const salt = parts[0];
    const expectedHash = parts[1];

    if (!salt || !expectedHash) {
      return false;
    }

    const actualHashWithSalt = this.hash(data, salt);
    const actualHashParts = actualHashWithSalt.split(':');

    if (actualHashParts.length !== 2) {
      return false;
    }

    const actualHash = actualHashParts[1];

    if (!actualHash) {
      return false;
    }

    return timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(actualHash, 'hex')
    );
  }
}

/**
 * Main SecurityManager class that coordinates all security functionality
 */
export interface SecurityManagerConfig {
  encryptionKey: string;
  auditLog?: boolean;
  rateLimiting?: RateLimitConfig;
  dataRetention?: {
    enabled: boolean;
    maxAge: number;
    compressionEnabled?: boolean;
  };
}

export class SecurityManager {
  private encryptionManager: EncryptionManager;
  private auditor: SecurityAuditor;
  private rateLimiter: RateLimiter;
  private config: SecurityManagerConfig;

  constructor(config: SecurityManagerConfig) {
    this.config = config;
    this.encryptionManager = new EncryptionManager(config.encryptionKey);
    this.auditor = new SecurityAuditor();

    const rateLimitConfig = config.rateLimiting || {
      windowMs: 60000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    };
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  /**
   * Encrypt sensitive data
   */
  public encrypt(data: string): string {
    return this.encryptionManager.encrypt(data);
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedData: string): string {
    return this.encryptionManager.decrypt(encryptedData);
  }

  /**
   * Hash data for secure comparison
   */
  public hash(data: string, salt?: string): string {
    return this.encryptionManager.hash(data, salt);
  }

  /**
   * Verify hashed data
   */
  public verifyHash(data: string, hashedData: string): boolean {
    return this.encryptionManager.verifyHash(data, hashedData);
  }

  /**
   * Validate input data
   */
  public validateInput(
    input: Record<string, unknown>,
    rules: ValidationRule[]
  ): {
    isValid: boolean;
    errors: string[];
  } {
    return InputValidator.validate(input, rules);
  }
  /**
   * Check if operation is rate limited
   */
  public checkRateLimit(tenantId: string, agentId?: string): boolean {
    const result = this.rateLimiter.isAllowed(tenantId, agentId);
    return result.allowed;
  }

  /**
   * Record security audit event
   */
  public auditEvent(event: SecurityAuditEvent): void {
    if (this.config.auditLog) {
      this.auditor.logEvent(event);
    }
  }
  /**
   * Get security audit events
   */
  public getAuditEvents(filter?: {
    tenantId?: string;
    eventType?: string;
    severity?: string;
    startDate?: Date;
    endDate?: Date;
  }): SecurityAuditEvent[] {
    if (!filter?.tenantId) {
      return [];
    }

    const auditOptions: {
      startDate?: Date;
      endDate?: Date;
      eventType?: SecurityAuditEvent['eventType'];
      severity?: SecurityAuditEvent['severity'];
    } = {};

    if (filter.startDate) {
      auditOptions.startDate = filter.startDate;
    }
    if (filter.endDate) {
      auditOptions.endDate = filter.endDate;
    }
    if (filter.eventType) {
      auditOptions.eventType =
        filter.eventType as SecurityAuditEvent['eventType'];
    }
    if (filter.severity) {
      auditOptions.severity = filter.severity as SecurityAuditEvent['severity'];
    }

    return this.auditor.getTenantAuditLog(filter.tenantId, auditOptions);
  }

  /**
   * Get security statistics
   */
  public getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    rateLimitStatus: Record<string, unknown>;
  } {
    const securityStats = this.auditor.getSecurityStats();

    return {
      totalEvents: securityStats.totalEvents,
      eventsByType: securityStats.eventsByType,
      eventsBySeverity: securityStats.eventsBySeverity,
      rateLimitStatus: {}, // Rate limiter doesn't have persistent stats
    };
  }
}

// Global instances for convenience
export const globalRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute per tenant
});

export const securityAuditor = new SecurityAuditor();
