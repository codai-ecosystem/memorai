import type {
  RateLimitRule,
  SecurityConfig,
  SecurityMetrics,
} from '../types/Security.js';

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) =>
    console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) =>
    console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) =>
    console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message: string, meta?: any) =>
    console.debug(`[DEBUG] ${message}`, meta || ''),
};

/**
 * Enterprise Rate Limiting System
 *
 * Provides multi-tiered rate limiting with adaptive capabilities
 * to prevent abuse and ensure fair resource usage.
 */
export class EnterpriseRateLimiter {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> =
    new Map();
  private rateLimitRules: Map<string, RateLimitRule> = new Map();
  private violationLog: Array<{
    key: string;
    timestamp: Date;
    action: string;
  }> = [];
  private isActive: boolean = false;
  private adaptiveThresholds: Map<string, number> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeDefaultRules();
    logger.info('EnterpriseRateLimiter initialized');
  }

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    // Global rate limit
    this.rateLimitRules.set('global', {
      maxRequests: 10000,
      windowMs: 60000, // 1 minute
      action: 'throttle',
    });

    // Default tenant rate limit
    this.rateLimitRules.set('tenant_default', {
      maxRequests: 1000,
      windowMs: 60000,
      action: 'throttle',
    });

    // Default agent rate limit
    this.rateLimitRules.set('agent_default', {
      maxRequests: 100,
      windowMs: 60000,
      action: 'throttle',
    });

    // IP-based rate limit
    this.rateLimitRules.set('ip_default', {
      maxRequests: 300,
      windowMs: 60000,
      action: 'block',
    });

    logger.info(
      `Initialized ${this.rateLimitRules.size} default rate limit rules`
    );
  }

  /**
   * Start rate limiting monitoring
   */
  public start(): void {
    this.isActive = true;
    this.startCleanupTask();
    logger.info('Rate limiting monitoring started');
  }

  /**
   * Stop rate limiting monitoring
   */
  public stop(): void {
    this.isActive = false;
    logger.info('Rate limiting monitoring stopped');
  }

  /**
   * Check if request should be rate limited
   */
  public async checkRateLimit(
    tenantId: string,
    agentId?: string,
    ipAddress?: string
  ): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  }> {
    if (!this.isActive) {
      return {
        allowed: true,
        action: 'allow',
        resetTime: 0,
        remaining: Infinity,
        limit: Infinity,
        limitType: 'disabled',
      };
    }

    // Check multiple rate limit tiers
    const checks = [
      await this.checkGlobalRateLimit(),
      await this.checkTenantRateLimit(tenantId),
    ];

    if (agentId) {
      checks.push(await this.checkAgentRateLimit(tenantId, agentId));
    }

    if (ipAddress) {
      checks.push(await this.checkIPRateLimit(ipAddress));
    }

    // Find the most restrictive limit that's exceeded
    for (const check of checks) {
      if (!check.allowed) {
        this.logViolation(check.limitType, check.action);
        return check;
      }
    }

    // If all checks pass, increment counters
    this.incrementCounters(tenantId, agentId, ipAddress);

    return {
      allowed: true,
      action: 'allow',
      resetTime: 0,
      remaining: Math.min(...checks.map(c => c.remaining)),
      limit: Math.min(...checks.map(c => c.limit)),
      limitType: 'none',
    };
  }

  /**
   * Check global rate limit
   */
  private async checkGlobalRateLimit(): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  }> {
    const rule = this.rateLimitRules.get('global')!;
    const key = 'global';

    return this.evaluateRateLimit(key, rule, 'global');
  }

  /**
   * Check tenant-specific rate limit
   */
  private async checkTenantRateLimit(tenantId: string): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  }> {
    const tenantRuleKey = `tenant_${tenantId}`;
    let rule = this.rateLimitRules.get(tenantRuleKey);

    if (!rule) {
      rule = this.rateLimitRules.get('tenant_default')!;
    }

    // Apply adaptive thresholds
    const adaptiveLimit = this.getAdaptiveLimit(
      tenantRuleKey,
      rule.maxRequests
    );
    const adaptiveRule = { ...rule, maxRequests: adaptiveLimit };

    return this.evaluateRateLimit(tenantRuleKey, adaptiveRule, 'tenant');
  }

  /**
   * Check agent-specific rate limit
   */
  private async checkAgentRateLimit(
    tenantId: string,
    agentId: string
  ): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  }> {
    const agentRuleKey = `agent_${tenantId}_${agentId}`;
    let rule = this.rateLimitRules.get(agentRuleKey);

    if (!rule) {
      rule = this.rateLimitRules.get('agent_default')!;
    }

    return this.evaluateRateLimit(agentRuleKey, rule, 'agent');
  }

  /**
   * Check IP-based rate limit
   */
  private async checkIPRateLimit(ipAddress: string): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  }> {
    const ipRuleKey = `ip_${ipAddress}`;
    let rule = this.rateLimitRules.get(ipRuleKey);

    if (!rule) {
      rule = this.rateLimitRules.get('ip_default')!;
    }

    return this.evaluateRateLimit(ipRuleKey, rule, 'ip');
  }

  /**
   * Evaluate rate limit for a specific key and rule
   */
  private evaluateRateLimit(
    key: string,
    rule: RateLimitRule,
    limitType: string
  ): {
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    resetTime: number;
    remaining: number;
    limit: number;
    limitType: string;
  } {
    const now = Date.now();
    const bucket = this.requestCounts.get(key);

    if (!bucket || now >= bucket.resetTime) {
      // Initialize or reset bucket
      this.requestCounts.set(key, {
        count: 0,
        resetTime: now + rule.windowMs,
      });

      return {
        allowed: true,
        action: 'allow',
        resetTime: now + rule.windowMs,
        remaining: rule.maxRequests - 1,
        limit: rule.maxRequests,
        limitType,
      };
    }

    const allowed = bucket.count < rule.maxRequests;
    const remaining = Math.max(0, rule.maxRequests - bucket.count - 1);

    return {
      allowed,
      action: allowed ? 'allow' : rule.action,
      resetTime: bucket.resetTime,
      remaining,
      limit: rule.maxRequests,
      limitType,
    };
  }

  /**
   * Increment request counters
   */
  private incrementCounters(
    tenantId: string,
    agentId?: string,
    ipAddress?: string
  ): void {
    const keys = ['global', `tenant_${tenantId}`];

    if (agentId) {
      keys.push(`agent_${tenantId}_${agentId}`);
    }

    if (ipAddress) {
      keys.push(`ip_${ipAddress}`);
    }

    for (const key of keys) {
      const bucket = this.requestCounts.get(key);
      if (bucket) {
        bucket.count++;
      }
    }
  }

  /**
   * Get adaptive rate limit based on system load
   */
  private getAdaptiveLimit(key: string, baseLimit: number): number {
    const adaptiveThreshold = this.adaptiveThresholds.get(key);

    if (!adaptiveThreshold) {
      return baseLimit;
    }

    // Reduce limits during high load
    if (adaptiveThreshold > 0.8) {
      return Math.floor(baseLimit * 0.7);
    } else if (adaptiveThreshold > 0.6) {
      return Math.floor(baseLimit * 0.85);
    }

    return baseLimit;
  }

  /**
   * Update adaptive thresholds based on system metrics
   */
  public updateAdaptiveThresholds(
    systemLoad: number,
    responseTime: number
  ): void {
    // Calculate adaptive threshold based on system performance
    const threshold = Math.min(
      systemLoad * 0.7 + (responseTime / 1000) * 0.3,
      1.0
    );

    // Update all adaptive thresholds
    for (const key of this.rateLimitRules.keys()) {
      if (key.includes('_')) {
        this.adaptiveThresholds.set(key, threshold);
      }
    }

    logger.debug('Updated adaptive rate limit thresholds', {
      systemLoad,
      responseTime,
      threshold,
    });
  }

  /**
   * Add custom rate limit rule
   */
  public addRateLimitRule(key: string, rule: RateLimitRule): void {
    this.rateLimitRules.set(key, rule);
    logger.info('Added custom rate limit rule', { key, rule });
  }

  /**
   * Remove rate limit rule
   */
  public removeRateLimitRule(key: string): void {
    this.rateLimitRules.delete(key);
    this.requestCounts.delete(key);
    this.adaptiveThresholds.delete(key);
    logger.info('Removed rate limit rule', { key });
  }

  /**
   * Log rate limit violation
   */
  private logViolation(limitType: string, action: string): void {
    this.violationLog.push({
      key: limitType,
      timestamp: new Date(),
      action,
    });

    // Keep only recent violations
    if (this.violationLog.length > 1000) {
      this.violationLog = this.violationLog.slice(-1000);
    }

    logger.warn('Rate limit violation', { limitType, action });
  }

  /**
   * Get rate limiting statistics
   */
  public getStatistics(): SecurityMetrics & {
    activeRules: number;
    totalViolations: number;
    recentViolations: number;
    topViolatingKeys: Array<{ key: string; count: number }>;
  } {
    const now = Date.now();
    const recentViolations = this.violationLog.filter(
      v => now - v.timestamp.getTime() < 3600000 // 1 hour
    );

    const violationCounts = new Map<string, number>();
    for (const violation of this.violationLog) {
      violationCounts.set(
        violation.key,
        (violationCounts.get(violation.key) || 0) + 1
      );
    }

    const topViolatingKeys = Array.from(violationCounts.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: this.getTotalRequests(),
      blockedRequests: this.getBlockedRequests(),
      throttledRequests: this.getThrottledRequests(),
      threatsDetected: 0, // This would be provided by threat detection
      avgResponseTime: this.getAverageResponseTime(),
      securityOverhead: this.getSecurityOverhead(),
      activeRules: this.rateLimitRules.size,
      totalViolations: this.violationLog.length,
      recentViolations: recentViolations.length,
      topViolatingKeys,
    };
  }

  /**
   * Clear all rate limiting data
   */
  public clearData(): void {
    this.requestCounts.clear();
    this.violationLog = [];
    this.adaptiveThresholds.clear();
    logger.info('Rate limiting data cleared');
  }

  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      if (!this.isActive) return;

      const now = Date.now();
      const keysToRemove: string[] = [];

      // Clean up expired buckets
      for (const [key, bucket] of this.requestCounts) {
        if (now >= bucket.resetTime) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        this.requestCounts.delete(key);
      }

      // Clean up old violations
      const cutoff = new Date(now - 86400000); // 24 hours
      this.violationLog = this.violationLog.filter(v => v.timestamp >= cutoff);

      if (keysToRemove.length > 0) {
        logger.debug('Rate limiter cleanup completed', {
          removedBuckets: keysToRemove.length,
          remainingBuckets: this.requestCounts.size,
        });
      }
    }, 60000); // Run every minute
  }

  // Helper methods for statistics
  private getTotalRequests(): number {
    let total = 0;
    for (const bucket of this.requestCounts.values()) {
      total += bucket.count;
    }
    return total;
  }

  private getBlockedRequests(): number {
    return this.violationLog.filter(v => v.action === 'block').length;
  }

  private getThrottledRequests(): number {
    return this.violationLog.filter(v => v.action === 'throttle').length;
  }

  private getAverageResponseTime(): number {
    // This would be calculated from actual response time metrics
    return 0; // Placeholder
  }

  private getSecurityOverhead(): number {
    // This would be calculated from performance metrics
    return 0; // Placeholder
  }
}
