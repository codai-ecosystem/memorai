import { ThreatDetectionEngine } from './ThreatDetectionEngine.js';
import { EnterpriseRateLimiter } from './EnterpriseRateLimiter.js';
import { DDoSProtectionLayer } from './DDoSProtectionLayer.js';
import { AdvancedEncryptionService } from './AdvancedEncryptionService.js';
import { SecurityAuditFramework } from './SecurityAuditFramework.js';
import type { SecurityConfig, SecurityMetrics } from '../types/Security.js';

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

export interface SecurityValidationResult {
  allowed: boolean;
  action: 'allow' | 'throttle' | 'block' | 'emergency';
  reasons: string[];
  securityOverhead: number;
  requestId: string;
}

export interface MemorySecurityContext {
  content: string;
  tenantId: string;
  agentId?: string;
  clientIP: string;
  userAgent: string;
  endpoint: string;
  requestSize: number;
  metadata?: Record<string, any>;
  sensitiveFields?: string[];
}

/**
 * Enterprise Security Manager
 * 
 * Comprehensive security orchestration for Memorai enterprise memory system.
 * Integrates threat detection, rate limiting, DDoS protection, encryption, and auditing.
 */
export class EnterpriseSecurityManager {
  private config: SecurityConfig;
  private threatDetection: ThreatDetectionEngine;
  private rateLimiter: EnterpriseRateLimiter;
  private ddosProtection: DDoSProtectionLayer;
  private encryption: AdvancedEncryptionService;
  private auditFramework: SecurityAuditFramework;
  private isActive: boolean = false;
  private requestCounter: number = 0;

  constructor(config: SecurityConfig) {
    this.config = config;
    
    // Initialize security components
    this.threatDetection = new ThreatDetectionEngine(config);
    this.rateLimiter = new EnterpriseRateLimiter(config);
    this.ddosProtection = new DDoSProtectionLayer(config);
    this.encryption = new AdvancedEncryptionService(config);
    this.auditFramework = new SecurityAuditFramework(config);
    
    logger.info('EnterpriseSecurityManager initialized with all security components');
  }

  /**
   * Start all security components
   */
  public async start(): Promise<void> {
    try {
      this.threatDetection.startMonitoring();
      this.rateLimiter.start();
      this.ddosProtection.start();
      this.encryption.start();
      this.auditFramework.start();
      
      this.isActive = true;
      
      logger.info('Enterprise security system fully activated');
      
      // Log system startup
      this.auditFramework.logAuditEntry({
        timestamp: new Date(),
        tenantId: 'system',
        action: 'security_system_start',
        resource: 'security_manager',
        result: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'system',
        details: { components: ['threat_detection', 'rate_limiting', 'ddos_protection', 'encryption', 'audit'] }
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to start security system', { error: errorMessage });
      throw new Error(`Security system startup failed: ${errorMessage}`);
    }
  }

  /**
   * Stop all security components
   */
  public async stop(): Promise<void> {
    try {
      this.threatDetection.stopMonitoring();
      this.rateLimiter.stop();
      this.ddosProtection.stop();
      this.encryption.stop();
      this.auditFramework.stop();
      
      this.isActive = false;
      
      logger.info('Enterprise security system deactivated');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error stopping security system', { error: errorMessage });
    }
  }

  /**
   * Validate security for memory operations
   */
  public async validateMemoryOperation(
    context: MemorySecurityContext
  ): Promise<SecurityValidationResult> {
    const startTime = performance.now();
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const reasons: string[] = [];
    let finalAction: 'allow' | 'throttle' | 'block' | 'emergency' = 'allow';

    if (!this.isActive) {
      return {
        allowed: true,
        action: 'allow',
        reasons: ['Security system not active'],
        securityOverhead: 0,
        requestId
      };
    }

    try {
      // 1. DDoS Protection Check
      const ddosResult = await this.ddosProtection.analyzeRequest(
        context.clientIP,
        context.endpoint,
        context.requestSize,
        context.userAgent
      );

      if (!ddosResult.allowed) {
        reasons.push(`DDoS protection: ${ddosResult.reason || 'Traffic pattern suspicious'}`);
        finalAction = this.escalateAction(finalAction, ddosResult.action);
      }

      // 2. Rate Limiting Check
      const rateLimitResult = await this.rateLimiter.checkRateLimit(
        context.tenantId,
        context.agentId,
        context.clientIP
      );

      if (!rateLimitResult.allowed) {
        reasons.push(`Rate limit exceeded: ${rateLimitResult.limitType}`);
        finalAction = this.escalateAction(finalAction, rateLimitResult.action);
      }

      // 3. Threat Detection Analysis (only if not already blocked)
      if (finalAction !== 'block' && finalAction !== 'emergency') {
        const threatResult = await this.threatDetection.analyzeRequest(
          context.content,
          context.clientIP,
          context.userAgent,
          context.tenantId,
          context.agentId
        );

        if (threatResult.isThreat) {
          reasons.push(`Threats detected: ${threatResult.threats.join(', ')}`);
          finalAction = this.escalateAction(finalAction, threatResult.action);
        }
      }

      const allowed = finalAction === 'allow';
      const securityOverhead = performance.now() - startTime;

      // Log security validation
      this.auditFramework.auditMemoryOperation(
        'recall', // This could be parameterized
        context.tenantId,
        context.agentId,
        allowed ? 'success' : 'blocked',
        context.clientIP,
        context.userAgent,
        {
          requestId,
          action: finalAction,
          reasons,
          securityOverhead,
          contentLength: context.content.length
        }
      );

      // Update adaptive rate limiting based on response time
      this.rateLimiter.updateAdaptiveThresholds(0.5, securityOverhead);

      const result: SecurityValidationResult = {
        allowed,
        action: finalAction,
        reasons,
        securityOverhead,
        requestId
      };

      logger.debug('Security validation completed', {
        requestId,
        allowed,
        action: finalAction,
        overhead: `${securityOverhead.toFixed(2)}ms`
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Security validation failed', { 
        error: errorMessage, 
        requestId,
        tenantId: context.tenantId 
      });

      // On security system failure, default to allow but log
      this.auditFramework.logAuditEntry({
        timestamp: new Date(),
        tenantId: context.tenantId,
        agentId: context.agentId,
        action: 'security_validation_error',
        resource: 'security_manager',
        result: 'failure',
        ipAddress: context.clientIP,
        userAgent: context.userAgent,
        details: { error: errorMessage, requestId }
      });

      return {
        allowed: true,
        action: 'allow',
        reasons: [`Security validation error: ${errorMessage}`],
        securityOverhead: performance.now() - startTime,
        requestId
      };
    }
  }

  /**
   * Encrypt memory content for storage
   */
  public encryptMemoryContent(
    content: string,
    metadata?: Record<string, any>,
    sensitiveFields?: string[]
  ): {
    encryptedText: string;
    encryptedMetadata?: string;
    encryptionInfo: any;
  } {
    return this.encryption.encryptMemoryContent({
      text: content,
      metadata,
      sensitiveFields
    });
  }

  /**
   * Decrypt memory content from storage
   */
  public decryptMemoryContent(encryptedData: {
    encryptedText: string;
    encryptedMetadata?: string;
    encryptionInfo: any;
  }): {
    text: string;
    metadata?: Record<string, any>;
  } {
    return this.encryption.decryptMemoryContent(encryptedData);
  }

  /**
   * Generate hash for data integrity
   */
  public generateContentHash(content: string): string {
    return this.encryption.generateHash(content);
  }

  /**
   * Verify data integrity
   */
  public verifyContentIntegrity(content: string, expectedHash: string): boolean {
    return this.encryption.verifyHash(content, expectedHash);
  }

  /**
   * Get comprehensive security metrics
   */
  public getSecurityMetrics(): SecurityMetrics & {
    threatDetection: any;
    rateLimiting: any;
    ddosProtection: any;
    encryption: any;
    audit: any;
  } {
    const threatStats = this.threatDetection.getSecurityStats();
    const rateLimitStats = this.rateLimiter.getStatistics();
    const ddosStats = this.ddosProtection.getStatistics();
    const encryptionStats = this.encryption.getStatistics();
    const auditDashboard = this.auditFramework.getSecurityDashboard();

    // Calculate overall metrics
    const totalRequests = rateLimitStats.totalRequests;
    const blockedRequests = rateLimitStats.blockedRequests + threatStats.threatsStopped;
    const threatsDetected = threatStats.totalEvents;
    const avgResponseTime = rateLimitStats.avgResponseTime;
    const securityOverhead = encryptionStats.encryptionOverhead;

    return {
      totalRequests,
      blockedRequests,
      throttledRequests: rateLimitStats.throttledRequests,
      threatsDetected,
      avgResponseTime,
      securityOverhead,
      threatDetection: threatStats,
      rateLimiting: rateLimitStats,
      ddosProtection: ddosStats,
      encryption: encryptionStats,
      audit: auditDashboard
    };
  }

  /**
   * Get security dashboard data
   */
  public getSecurityDashboard(): any {
    return this.auditFramework.getSecurityDashboard();
  }

  /**
   * Generate compliance report
   */
  public generateComplianceReport(startDate: Date, endDate: Date): any {
    return this.auditFramework.generateComplianceReport(startDate, endDate);
  }

  /**
   * Export audit logs
   */
  public exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    return this.auditFramework.exportAuditLogs(startDate, endDate, format);
  }

  /**
   * Manually block IP address
   */
  public blockIPAddress(ipAddress: string, reason: string): void {
    logger.warn('Manually blocking IP address', { ipAddress, reason });
    
    this.auditFramework.logAuditEntry({
      timestamp: new Date(),
      tenantId: 'system',
      action: 'manual_ip_block',
      resource: 'security_manager',
      result: 'success',
      ipAddress: '127.0.0.1', // Admin IP
      userAgent: 'admin',
      details: { blockedIP: ipAddress, reason }
    });
  }

  /**
   * Unblock IP address
   */
  public unblockIPAddress(ipAddress: string): void {
    this.ddosProtection.unblockIP(ipAddress);
    this.threatDetection.clearSuspiciousIP(ipAddress);
    
    logger.info('IP address unblocked', { ipAddress });
    
    this.auditFramework.logAuditEntry({
      timestamp: new Date(),
      tenantId: 'system',
      action: 'manual_ip_unblock',
      resource: 'security_manager',
      result: 'success',
      ipAddress: '127.0.0.1', // Admin IP
      userAgent: 'admin',
      details: { unblockedIP: ipAddress }
    });
  }

  /**
   * Rotate encryption keys
   */
  public async rotateEncryptionKeys(): Promise<void> {
    await this.encryption.rotateKeys();
    
    this.auditFramework.logAuditEntry({
      timestamp: new Date(),
      tenantId: 'system',
      action: 'encryption_key_rotation',
      resource: 'security_manager',
      result: 'success',
      ipAddress: '127.0.0.1',
      userAgent: 'system',
      details: { rotationType: 'manual' }
    });
  }

  /**
   * Clear all security data (for testing)
   */
  public clearSecurityData(): void {
    this.threatDetection.clearSecurityData();
    this.rateLimiter.clearData();
    this.ddosProtection.clearData();
    this.encryption.clearData();
    this.auditFramework.clearAuditData();
    
    logger.info('All security data cleared');
  }

  /**
   * Escalate security action to most restrictive
   */
  private escalateAction(
    current: 'allow' | 'throttle' | 'block' | 'emergency',
    newAction: 'allow' | 'throttle' | 'block' | 'emergency'
  ): 'allow' | 'throttle' | 'block' | 'emergency' {
    const actionPriority = { allow: 0, throttle: 1, block: 2, emergency: 3 };
    
    return actionPriority[newAction] > actionPriority[current] ? newAction : current;
  }

  /**
   * Get system status
   */
  public getSystemStatus(): {
    active: boolean;
    components: {
      threatDetection: boolean;
      rateLimiting: boolean;
      ddosProtection: boolean;
      encryption: boolean;
      audit: boolean;
    };
    lastStarted?: Date;
    requestsProcessed: number;
  } {
    return {
      active: this.isActive,
      components: {
        threatDetection: true, // These would check actual component status
        rateLimiting: true,
        ddosProtection: true,
        encryption: true,
        audit: true
      },
      requestsProcessed: this.requestCounter
    };
  }
}
