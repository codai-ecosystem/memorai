import type { SecurityConfig, AuditLogEntry, SecurityEvent } from '../types/Security.js';

// Simple logger implementation
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

interface SecurityAlert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  details: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface ComplianceReport {
  reportId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  totalEvents: number;
  securityIncidents: number;
  complianceScore: number;
  findings: Array<{
    category: string;
    severity: string;
    count: number;
    description: string;
  }>;
}

/**
 * Security Audit Framework
 * 
 * Provides comprehensive security monitoring, audit logging,
 * and compliance reporting for enterprise security requirements.
 */
export class SecurityAuditFramework {
  private config: SecurityConfig;
  private auditLogs: AuditLogEntry[] = [];
  private securityEvents: SecurityEvent[] = [];
  private securityAlerts: SecurityAlert[] = [];
  private isActive: boolean = false;
  private alertIdCounter: number = 0;

  constructor(config: SecurityConfig) {
    this.config = config;
    logger.info('SecurityAuditFramework initialized');
  }

  /**
   * Start security auditing
   */
  public start(): void {
    this.isActive = true;
    this.startMonitoringTasks();
    logger.info('Security audit monitoring started');
  }

  /**
   * Stop security auditing
   */
  public stop(): void {
    this.isActive = false;
    logger.info('Security audit monitoring stopped');
  }

  /**
   * Log security event
   */
  public logSecurityEvent(event: SecurityEvent): void {
    if (!this.isActive) return;

    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }

    // Check if this event should trigger an alert
    this.checkForAlerts(event);

    logger.debug('Security event logged', {
      eventType: event.eventType,
      confidence: event.confidence,
      action: event.action
    });
  }

  /**
   * Log audit entry
   */
  public logAuditEntry(entry: AuditLogEntry): void {
    if (!this.isActive) return;

    this.auditLogs.push(entry);
    
    // Keep only recent audit logs
    if (this.auditLogs.length > 50000) {
      this.auditLogs = this.auditLogs.slice(-50000);
    }

    // Log high-severity actions
    if (entry.result === 'blocked' || entry.action.includes('delete') || entry.action.includes('admin')) {
      logger.warn('High-severity audit event', {
        action: entry.action,
        result: entry.result,
        tenantId: entry.tenantId,
        userId: entry.userId
      });
    }
  }

  /**
   * Create audit log entry for memory operations
   */
  public auditMemoryOperation(
    action: 'remember' | 'recall' | 'delete' | 'clear',
    tenantId: string,
    agentId: string | undefined,
    result: 'success' | 'failure' | 'blocked',
    ipAddress: string,
    userAgent: string,
    details?: Record<string, unknown>
  ): void {
    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      tenantId,
      agentId,
      action: `memory_${action}`,
      resource: 'memory_engine',
      result,
      ipAddress,
      userAgent,
      details
    };

    this.logAuditEntry(auditEntry);
  }

  /**
   * Check for security alerts based on events
   */
  private checkForAlerts(event: SecurityEvent): void {
    // High confidence threats
    if (event.confidence > 0.8) {
      this.createAlert('critical', 'threat_detection', 
        `High confidence threat detected: ${event.threatTypes.join(', ')}`,
        { event }
      );
    }

    // Multiple threats from same IP
    const recentEvents = this.securityEvents.filter(
      e => e.clientIP === event.clientIP && 
           Date.now() - e.timestamp.getTime() < 300000 // 5 minutes
    );

    if (recentEvents.length > 10) {
      this.createAlert('high', 'multiple_threats',
        `Multiple security threats from IP ${event.clientIP}`,
        { 
          ip: event.clientIP,
          eventCount: recentEvents.length,
          threatTypes: [...new Set(recentEvents.flatMap(e => e.threatTypes))]
        }
      );
    }

    // Tenant-specific anomalies
    const tenantEvents = this.securityEvents.filter(
      e => e.tenantId === event.tenantId &&
           Date.now() - e.timestamp.getTime() < 3600000 // 1 hour
    );

    if (tenantEvents.length > 50) {
      this.createAlert('medium', 'tenant_anomaly',
        `High security event volume for tenant ${event.tenantId}`,
        { 
          tenantId: event.tenantId,
          eventCount: tenantEvents.length
        }
      );
    }
  }

  /**
   * Create security alert
   */
  private createAlert(
    severity: 'low' | 'medium' | 'high' | 'critical',
    category: string,
    message: string,
    details: Record<string, any>
  ): void {
    const alert: SecurityAlert = {
      id: `alert_${++this.alertIdCounter}_${Date.now()}`,
      timestamp: new Date(),
      severity,
      category,
      message,
      details,
      resolved: false
    };

    this.securityAlerts.push(alert);

    // Keep only recent alerts
    if (this.securityAlerts.length > 1000) {
      this.securityAlerts = this.securityAlerts.slice(-1000);
    }

    logger.warn('Security alert created', {
      alertId: alert.id,
      severity: alert.severity,
      category: alert.category,
      message: alert.message
    });

    // Auto-resolve low severity alerts after 24 hours
    if (severity === 'low') {
      setTimeout(() => {
        this.resolveAlert(alert.id, 'auto_resolved');
      }, 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Resolve security alert
   */
  public resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.securityAlerts.find(a => a.id === alertId);
    
    if (!alert) {
      logger.warn('Alert not found for resolution', { alertId });
      return false;
    }

    if (alert.resolved) {
      logger.info('Alert already resolved', { alertId });
      return true;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    logger.info('Security alert resolved', {
      alertId,
      resolvedBy,
      severity: alert.severity
    });

    return true;
  }

  /**
   * Generate compliance report
   */
  public generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): ComplianceReport {
    const reportId = `compliance_${Date.now()}`;
    
    // Filter events within the period
    const periodEvents = this.securityEvents.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );

    const periodAudits = this.auditLogs.filter(
      e => e.timestamp >= startDate && e.timestamp <= endDate
    );

    // Calculate compliance metrics
    const totalEvents = periodEvents.length + periodAudits.length;
    const securityIncidents = periodEvents.filter(e => e.action === 'block').length;
    const blockedRequests = periodAudits.filter(a => a.result === 'blocked').length;
    
    // Calculate compliance score (0-100)
    let complianceScore = 100;
    
    // Deduct points for security incidents
    if (totalEvents > 0) {
      const incidentRate = securityIncidents / totalEvents;
      complianceScore -= Math.min(incidentRate * 50, 50);
      
      const blockRate = blockedRequests / totalEvents;
      complianceScore -= Math.min(blockRate * 30, 30);
    }

    // Generate findings
    const findings = this.generateComplianceFindings(periodEvents, periodAudits);

    const report: ComplianceReport = {
      reportId,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      totalEvents,
      securityIncidents,
      complianceScore: Math.max(complianceScore, 0),
      findings
    };

    logger.info('Compliance report generated', {
      reportId,
      period: report.period,
      score: report.complianceScore,
      findings: findings.length
    });

    return report;
  }

  /**
   * Generate compliance findings
   */
  private generateComplianceFindings(
    events: SecurityEvent[],
    audits: AuditLogEntry[]
  ): Array<{
    category: string;
    severity: string;
    count: number;
    description: string;
  }> {
    const findings: Array<{
      category: string;
      severity: string;
      count: number;
      description: string;
    }> = [];

    // Analyze security events
    const threatCounts = new Map<string, number>();
    for (const event of events) {
      for (const threat of event.threatTypes) {
        threatCounts.set(threat, (threatCounts.get(threat) || 0) + 1);
      }
    }

    // High-frequency threats
    for (const [threat, count] of threatCounts) {
      if (count > 10) {
        findings.push({
          category: 'security_threats',
          severity: count > 100 ? 'high' : count > 50 ? 'medium' : 'low',
          count,
          description: `High frequency of ${threat} attacks detected`
        });
      }
    }

    // Failed authentication attempts
    const failedAuths = audits.filter(a => 
      a.action.includes('auth') && a.result === 'failure'
    ).length;

    if (failedAuths > 20) {
      findings.push({
        category: 'authentication',
        severity: failedAuths > 100 ? 'high' : 'medium',
        count: failedAuths,
        description: 'High number of failed authentication attempts'
      });
    }

    // Data access violations
    const dataViolations = audits.filter(a => 
      a.result === 'blocked' && a.action.includes('data')
    ).length;

    if (dataViolations > 5) {
      findings.push({
        category: 'data_access',
        severity: dataViolations > 20 ? 'high' : 'medium',
        count: dataViolations,
        description: 'Unauthorized data access attempts blocked'
      });
    }

    return findings;
  }

  /**
   * Get security dashboard data
   */
  public getSecurityDashboard(): {
    overview: {
      totalEvents: number;
      activeAlerts: number;
      resolvedAlerts: number;
      complianceScore: number;
    };
    recentEvents: SecurityEvent[];
    activeAlerts: SecurityAlert[];
    threatTrends: Array<{ date: string; count: number; types: string[] }>;
    topThreats: Array<{ type: string; count: number }>;
  } {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recent events (last 24 hours)
    const recentEvents = this.securityEvents
      .filter(e => e.timestamp >= last24h)
      .slice(-50);

    // Active alerts
    const activeAlerts = this.securityAlerts.filter(a => !a.resolved);
    const resolvedAlerts = this.securityAlerts.filter(a => a.resolved);

    // Generate compliance score for last 7 days
    const weeklyReport = this.generateComplianceReport(last7d, now);

    // Threat trends (daily counts for last 7 days)
    const threatTrends: Array<{ date: string; count: number; types: string[] }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const dayEvents = this.securityEvents.filter(
        e => e.timestamp >= dayStart && e.timestamp < dayEnd
      );
      
      const threatTypes = [...new Set(dayEvents.flatMap(e => e.threatTypes))];
      
      threatTrends.push({
        date: dayStart.toISOString().split('T')[0],
        count: dayEvents.length,
        types: threatTypes
      });
    }

    // Top threats (last 7 days)
    const threatCounts = new Map<string, number>();
    const weekEvents = this.securityEvents.filter(e => e.timestamp >= last7d);
    
    for (const event of weekEvents) {
      for (const threat of event.threatTypes) {
        threatCounts.set(threat, (threatCounts.get(threat) || 0) + 1);
      }
    }

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      overview: {
        totalEvents: this.securityEvents.length + this.auditLogs.length,
        activeAlerts: activeAlerts.length,
        resolvedAlerts: resolvedAlerts.length,
        complianceScore: weeklyReport.complianceScore
      },
      recentEvents,
      activeAlerts: activeAlerts.slice(-20),
      threatTrends,
      topThreats
    };
  }

  /**
   * Export audit logs for external analysis
   */
  public exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): string {
    const filteredLogs = this.auditLogs.filter(
      log => log.timestamp >= startDate && log.timestamp <= endDate
    );

    if (format === 'csv') {
      const headers = ['timestamp', 'tenantId', 'agentId', 'action', 'resource', 'result', 'ipAddress', 'userAgent'];
      const csvLines = [headers.join(',')];
      
      for (const log of filteredLogs) {
        const values = [
          log.timestamp.toISOString(),
          log.tenantId,
          log.agentId || '',
          log.action,
          log.resource,
          log.result,
          log.ipAddress,
          `"${log.userAgent.replace(/"/g, '""')}"`
        ];
        csvLines.push(values.join(','));
      }
      
      return csvLines.join('\n');
    }

    return JSON.stringify(filteredLogs, null, 2);
  }

  /**
   * Clear audit data (for testing)
   */
  public clearAuditData(): void {
    this.auditLogs = [];
    this.securityEvents = [];
    this.securityAlerts = [];
    this.alertIdCounter = 0;
    logger.info('Security audit data cleared');
  }

  /**
   * Start monitoring tasks
   */
  private startMonitoringTasks(): void {
    // Alert correlation task (every 5 minutes)
    setInterval(() => {
      if (!this.isActive) return;
      this.correlateSecurityEvents();
    }, 300000);

    // Cleanup task (every hour)
    setInterval(() => {
      if (!this.isActive) return;
      this.cleanupOldData();
    }, 3600000);

    // Health monitoring (every 30 seconds)
    setInterval(() => {
      if (!this.isActive) return;
      this.monitorSecurityHealth();
    }, 30000);
  }

  /**
   * Correlate security events for pattern detection
   */
  private correlateSecurityEvents(): void {
    const now = Date.now();
    const correlationWindow = 3600000; // 1 hour
    const recentEvents = this.securityEvents.filter(
      e => now - e.timestamp.getTime() < correlationWindow
    );

    // Detect coordinated attacks (multiple IPs, same tenant)
    const tenantAttacks = new Map<string, Set<string>>();
    for (const event of recentEvents) {
      if (event.action === 'block') {
        if (!tenantAttacks.has(event.tenantId)) {
          tenantAttacks.set(event.tenantId, new Set());
        }
        tenantAttacks.get(event.tenantId)!.add(event.clientIP);
      }
    }

    for (const [tenantId, ips] of tenantAttacks) {
      if (ips.size > 5) {
        this.createAlert('high', 'coordinated_attack',
          `Coordinated attack detected on tenant ${tenantId}`,
          { tenantId, attackingIPs: Array.from(ips) }
        );
      }
    }

    logger.debug('Security event correlation completed', {
      eventsAnalyzed: recentEvents.length,
      tenantsChecked: tenantAttacks.size
    });
  }

  /**
   * Cleanup old audit data
   */
  private cleanupOldData(): void {
    const now = Date.now();
    const retentionPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
    const cutoff = new Date(now - retentionPeriod);

    const beforeLogs = this.auditLogs.length;
    const beforeEvents = this.securityEvents.length;
    const beforeAlerts = this.securityAlerts.length;

    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoff);
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoff);
    this.securityAlerts = this.securityAlerts.filter(alert => alert.timestamp >= cutoff);

    const removedLogs = beforeLogs - this.auditLogs.length;
    const removedEvents = beforeEvents - this.securityEvents.length;
    const removedAlerts = beforeAlerts - this.securityAlerts.length;

    if (removedLogs > 0 || removedEvents > 0 || removedAlerts > 0) {
      logger.info('Security audit data cleanup completed', {
        removedLogs,
        removedEvents,
        removedAlerts,
        retentionDays: 90
      });
    }
  }

  /**
   * Monitor security system health
   */
  private monitorSecurityHealth(): void {
    const recentAlerts = this.securityAlerts.filter(
      a => Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
    
    if (criticalAlerts.length > 3) {
      logger.error('SECURITY SYSTEM ALERT: Multiple critical security alerts', {
        criticalAlerts: criticalAlerts.length,
        totalRecentAlerts: recentAlerts.length
      });
    }

    // Check for system overload
    const recentEvents = this.securityEvents.filter(
      e => Date.now() - e.timestamp.getTime() < 60000 // 1 minute
    );

    if (recentEvents.length > 1000) {
      logger.warn('High security event volume detected', {
        eventsPerMinute: recentEvents.length,
        threshold: 1000
      });
    }
  }
}
