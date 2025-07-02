import type { SecurityEvent, ThreatPattern, SecurityConfig } from '../types/Security.js';

// Simple logger implementation for security module
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

/**
 * Advanced Threat Detection Engine
 * 
 * Provides real-time threat monitoring and response capabilities
 * for the Memorai enterprise memory system.
 */
export class ThreatDetectionEngine {
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private config: SecurityConfig;
  private isMonitoringActive: boolean = false;
  private suspiciousIPs: Set<string> = new Set();
  private bruteForceAttempts: Map<string, number> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.initializeThreatPatterns();
    logger.info('ThreatDetectionEngine initialized with advanced monitoring');
  }

  /**
   * Initialize common threat patterns for detection
   */
  private initializeThreatPatterns(): void {
    // SQL Injection patterns
    this.threatPatterns.set('sql_injection', {
      id: 'sql_injection',
      name: 'SQL Injection Attack',
      patterns: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b.*?(\b(FROM|WHERE|INTO)\b))/i,
        /((\%27)|(')|(\-\-)|(\%23)|(#))/i,
        /(((\%3D)|(=))[^\n]*((\%27)|(')|(\-\-)|(\%3B)|(;)))/i,
        /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      ],
      severity: 'high',
      action: 'block',
      description: 'Detects common SQL injection attack patterns'
    });

    // XSS patterns
    this.threatPatterns.set('xss_attack', {
      id: 'xss_attack',
      name: 'Cross-Site Scripting (XSS)',
      patterns: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
        /eval\s*\(/gi,
        /document\.cookie/gi,
      ],
      severity: 'high',
      action: 'block',
      description: 'Detects XSS attack attempts in user input'
    });

    // Path traversal patterns
    this.threatPatterns.set('path_traversal', {
      id: 'path_traversal',
      name: 'Path Traversal Attack',
      patterns: [
        /\.\.[\/\\]/g,
        /\.\.[%2F|%5C]/gi,
        /\.\.%c0%af/gi,
        /\.\.%c1%9c/gi,
      ],
      severity: 'medium',
      action: 'block',
      description: 'Detects directory traversal attempts'
    });

    // Command injection patterns
    this.threatPatterns.set('command_injection', {
      id: 'command_injection',
      name: 'Command Injection',
      patterns: [
        /[;&|`$\(\)]/g,
        /\b(cat|ls|pwd|whoami|id|uname|curl|wget)\b/gi,
        /\|\s*\w+/g,
        /&&\s*\w+/g,
      ],
      severity: 'high',
      action: 'block',
      description: 'Detects command injection attempts'
    });

    // Memory-specific patterns
    this.threatPatterns.set('memory_abuse', {
      id: 'memory_abuse',
      name: 'Memory System Abuse',
      patterns: [
        // Excessive repetition
        /(.{1,50})\1{10,}/g,
        // Large memory payload
        /.{10000,}/g,
        // Binary data injection
        /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g,
      ],
      severity: 'medium',
      action: 'throttle',
      description: 'Detects abuse of memory storage system'
    });

    logger.info(`Initialized ${this.threatPatterns.size} threat detection patterns`);
  }

  /**
   * Start threat monitoring
   */
  public startMonitoring(): void {
    this.isMonitoringActive = true;
    this.startCleanupTask();
    logger.info('Threat detection monitoring started');
  }

  /**
   * Stop threat monitoring
   */
  public stopMonitoring(): void {
    this.isMonitoringActive = false;
    logger.info('Threat detection monitoring stopped');
  }

  /**
   * Analyze incoming request for threats
   */
  public async analyzeRequest(
    content: string,
    clientIP: string,
    userAgent: string,
    tenantId: string,
    agentId?: string
  ): Promise<{
    isThreat: boolean;
    threats: string[];
    action: 'allow' | 'block' | 'throttle';
    confidence: number;
  }> {
    if (!this.isMonitoringActive) {
      return { isThreat: false, threats: [], action: 'allow', confidence: 0 };
    }

    const threats: string[] = [];
    let maxSeverityAction: 'allow' | 'block' | 'throttle' = 'allow';
    let totalConfidence = 0;

    // Check for brute force attempts
    const bruteForceCheck = this.checkBruteForce(clientIP);
    if (bruteForceCheck.isBruteForce) {
      threats.push('brute_force_attempt');
      maxSeverityAction = 'block';
      totalConfidence += 0.9;
    }

    // Check against threat patterns
    for (const [id, pattern] of this.threatPatterns) {
      const detection = this.checkThreatPattern(content, pattern);
      if (detection.detected) {
        threats.push(id);
        totalConfidence += detection.confidence;
        
        if (pattern.action === 'block' && maxSeverityAction !== 'block') {
          maxSeverityAction = 'block';
        } else if (pattern.action === 'throttle' && maxSeverityAction === 'allow') {
          maxSeverityAction = 'throttle';
        }
      }
    }

    // Check for suspicious IP patterns
    if (this.suspiciousIPs.has(clientIP)) {
      threats.push('suspicious_ip');
      maxSeverityAction = maxSeverityAction === 'allow' ? 'throttle' : maxSeverityAction;
      totalConfidence += 0.5;
    }

    // Analyze access patterns
    const accessPatternAnalysis = await this.analyzeAccessPatterns(
      clientIP, userAgent, tenantId, agentId
    );
    if (accessPatternAnalysis.suspicious) {
      threats.push('suspicious_access_pattern');
      totalConfidence += accessPatternAnalysis.confidence;
      if (accessPatternAnalysis.severity === 'high') {
        maxSeverityAction = 'block';
      }
    }

    const isThreat = threats.length > 0;
    const normalizedConfidence = Math.min(totalConfidence / threats.length || 0, 1);

    // Log security event
    if (isThreat) {
      this.logSecurityEvent({
        timestamp: new Date(),
        eventType: 'threat_detected',
        threatTypes: threats,
        clientIP,
        userAgent,
        tenantId,
        agentId,
        action: maxSeverityAction,
        confidence: normalizedConfidence,
        content: content.substring(0, 500), // Log first 500 chars for analysis
      });
    }

    return {
      isThreat,
      threats,
      action: maxSeverityAction,
      confidence: normalizedConfidence,
    };
  }

  /**
   * Check content against a specific threat pattern
   */
  private checkThreatPattern(
    content: string,
    pattern: ThreatPattern
  ): { detected: boolean; confidence: number; matches: number } {
    let matches = 0;
    let totalMatches = 0;

    for (const regex of pattern.patterns) {
      const patternMatches = content.match(regex);
      if (patternMatches) {
        matches++;
        totalMatches += patternMatches.length;
      }
    }

    const detected = matches > 0;
    const confidence = detected ? 
      Math.min(0.3 + (matches / pattern.patterns.length) * 0.7, 1) : 0;

    return { detected, confidence, matches: totalMatches };
  }

  /**
   * Check for brute force attempts
   */
  private checkBruteForce(clientIP: string): { isBruteForce: boolean; attempts: number } {
    const currentAttempts = this.bruteForceAttempts.get(clientIP) || 0;
    const newAttempts = currentAttempts + 1;
    
    this.bruteForceAttempts.set(clientIP, newAttempts);

    const isBruteForce = newAttempts > this.config.bruteForceThreshold;
    
    if (isBruteForce) {
      this.suspiciousIPs.add(clientIP);
      logger.warn('Brute force attempt detected', { 
        clientIP, 
        attempts: newAttempts 
      });
    }

    return { isBruteForce, attempts: newAttempts };
  }

  /**
   * Analyze access patterns for anomalies
   */
  private async analyzeAccessPatterns(
    clientIP: string,
    userAgent: string,
    tenantId: string,
    agentId?: string
  ): Promise<{ suspicious: boolean; confidence: number; severity: 'low' | 'medium' | 'high' }> {
    // Check for suspicious user agent patterns
    const suspiciousUAPatterns = [
      /bot|crawler|spider|scraper/i,
      /curl|wget|python|go-http|java/i,
      /automated|script|tool/i,
    ];

    let suspicious = false;
    let confidence = 0;
    let severity: 'low' | 'medium' | 'high' = 'low';

    // User agent analysis
    for (const pattern of suspiciousUAPatterns) {
      if (pattern.test(userAgent)) {
        suspicious = true;
        confidence += 0.3;
        severity = 'medium';
        break;
      }
    }

    // Empty or very short user agent
    if (!userAgent || userAgent.length < 10) {
      suspicious = true;
      confidence += 0.4;
      severity = 'medium';
    }

    // Check request frequency from this IP
    const recentEvents = this.getRecentSecurityEvents(clientIP, 300000); // 5 minutes
    if (recentEvents.length > this.config.maxRequestsPerWindow) {
      suspicious = true;
      confidence += 0.6;
      severity = 'high';
    }

    // Check for tenant hopping (accessing multiple tenants from same IP)
    const uniqueTenants = new Set(recentEvents.map(e => e.tenantId));
    if (uniqueTenants.size > 3) {
      suspicious = true;
      confidence += 0.5;
      severity = 'high';
    }

    return { 
      suspicious, 
      confidence: Math.min(confidence, 1), 
      severity 
    };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    // Keep only recent events to prevent memory leak
    if (this.securityEvents.length > this.config.maxSecurityEvents) {
      this.securityEvents = this.securityEvents.slice(-this.config.maxSecurityEvents);
    }

    logger.warn('Security threat detected', {
      eventType: event.eventType,
      threats: event.threatTypes,
      action: event.action,
      confidence: event.confidence,
      clientIP: event.clientIP,
      tenantId: event.tenantId,
    });

    // Trigger alerts for high-severity threats
    if (event.confidence > 0.8 || event.action === 'block') {
      this.triggerSecurityAlert(event);
    }
  }

  /**
   * Trigger security alert for high-severity threats
   */
  private triggerSecurityAlert(event: SecurityEvent): void {
    // In production, this would integrate with alerting systems
    logger.error('HIGH SEVERITY SECURITY ALERT', {
      timestamp: event.timestamp,
      threatTypes: event.threatTypes,
      clientIP: event.clientIP,
      confidence: event.confidence,
      action: event.action,
    });

    // Auto-block high-confidence threats
    if (event.confidence > 0.9) {
      this.suspiciousIPs.add(event.clientIP);
    }
  }

  /**
   * Get recent security events for analysis
   */
  private getRecentSecurityEvents(clientIP: string, timeWindowMs: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.securityEvents.filter(
      event => event.clientIP === clientIP && event.timestamp >= cutoff
    );
  }

  /**
   * Get security statistics
   */
  public getSecurityStats(): {
    totalEvents: number;
    threatsStopped: number;
    suspiciousIPs: number;
    topThreats: Array<{ type: string; count: number }>;
    recentAlerts: SecurityEvent[];
  } {
    const threatCounts = new Map<string, number>();
    let threatsStopped = 0;

    for (const event of this.securityEvents) {
      if (event.action === 'block') {
        threatsStopped++;
      }
      
      for (const threat of event.threatTypes) {
        threatCounts.set(threat, (threatCounts.get(threat) || 0) + 1);
      }
    }

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentAlerts = this.securityEvents
      .filter(event => event.confidence > 0.7)
      .slice(-10);

    return {
      totalEvents: this.securityEvents.length,
      threatsStopped,
      suspiciousIPs: this.suspiciousIPs.size,
      topThreats,
      recentAlerts,
    };
  }

  /**
   * Clear suspicious IP from blocklist
   */
  public clearSuspiciousIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
    this.bruteForceAttempts.delete(ip);
    logger.info('Cleared suspicious IP from blocklist', { ip });
  }

  /**
   * Clear all security data
   */
  public clearSecurityData(): void {
    this.securityEvents = [];
    this.suspiciousIPs.clear();
    this.bruteForceAttempts.clear();
    logger.info('Security data cleared');
  }

  /**
   * Start periodic cleanup task
   */
  private startCleanupTask(): void {
    setInterval(() => {
      if (!this.isMonitoringActive) return;

      const cutoff = new Date(Date.now() - this.config.eventRetentionMs);
      const beforeCount = this.securityEvents.length;
      
      this.securityEvents = this.securityEvents.filter(
        event => event.timestamp >= cutoff
      );

      // Clear old brute force attempts
      const bruteForceToRemove: string[] = [];
      for (const [ip, attempts] of this.bruteForceAttempts) {
        if (attempts < this.config.bruteForceThreshold / 2) {
          bruteForceToRemove.push(ip);
        }
      }
      
      for (const ip of bruteForceToRemove) {
        this.bruteForceAttempts.delete(ip);
      }

      if (beforeCount > this.securityEvents.length) {
        logger.debug('Security event cleanup completed', {
          removed: beforeCount - this.securityEvents.length,
          remaining: this.securityEvents.length,
        });
      }
    }, this.config.cleanupIntervalMs);
  }
}
