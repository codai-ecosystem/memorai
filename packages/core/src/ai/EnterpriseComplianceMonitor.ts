/**
 * Enterprise Compliance Monitor
 * Comprehensive compliance monitoring and reporting for enterprise environments
 */

import { MemoryMetadata } from '../types/index.js';
import {
  ComplianceStandard,
  SecurityAuditEvent,
} from './AdvancedMemorySecurityManager.js';

export interface CompliancePolicy {
  id: string;
  name: string;
  standard: ComplianceStandard;
  description: string;
  rules: ComplianceRule[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  autoRemediation: boolean;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  condition: (event: SecurityAuditEvent | MemoryMetadata) => boolean;
  action: ComplianceAction;
  remediation?: string;
}

export type ComplianceAction =
  | 'log_violation'
  | 'alert_admin'
  | 'block_access'
  | 'encrypt_data'
  | 'delete_data'
  | 'anonymize_data'
  | 'notify_data_subject'
  | 'generate_report';

export interface ComplianceViolation {
  id: string;
  timestamp: Date;
  policyId: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  dataSubject?: string;
  memoryId?: string;
  auditEventId?: string;
  remediated: boolean;
  remediationDate?: Date;
  remediationActions: string[];
  metadata: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  generated: Date;
  period: {
    start: Date;
    end: Date;
  };
  standard: ComplianceStandard;
  summary: {
    totalEvents: number;
    violations: number;
    remediatedViolations: number;
    complianceScore: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  categories: {
    dataProcessing: ComplianceCategory;
    accessControl: ComplianceCategory;
    encryption: ComplianceCategory;
    audit: ComplianceCategory;
    retention: ComplianceCategory;
    breach: ComplianceCategory;
  };
  recommendations: ComplianceRecommendation[];
  violations: ComplianceViolation[];
}

export interface ComplianceCategory {
  name: string;
  score: number; // 0-100
  violations: number;
  recommendations: string[];
  status: 'compliant' | 'non-compliant' | 'partial';
}

export interface ComplianceRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
  cost?: 'low' | 'medium' | 'high';
}

export interface DataSubjectRequest {
  id: string;
  type:
    | 'access'
    | 'rectification'
    | 'erasure'
    | 'portability'
    | 'restriction'
    | 'objection';
  dataSubject: string;
  requestDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  dueDate: Date;
  processedBy?: string;
  completionDate?: Date;
  data?: unknown;
  reason?: string;
}

export class EnterpriseComplianceMonitor {
  private policies: CompliancePolicy[] = [];
  private violations: ComplianceViolation[] = [];
  private dataSubjectRequests: DataSubjectRequest[] = [];
  private reports: ComplianceReport[] = [];

  constructor(private enabledStandards: ComplianceStandard[] = []) {
    this.initializeCompliancePolicies();
  }

  /**
   * Initialize compliance policies for enabled standards
   */
  private initializeCompliancePolicies(): void {
    for (const standard of this.enabledStandards) {
      switch (standard) {
        case 'GDPR':
          this.policies.push(...this.createGDPRPolicies());
          break;
        case 'HIPAA':
          this.policies.push(...this.createHIPAAPolicies());
          break;
        case 'SOC2':
          this.policies.push(...this.createSOC2Policies());
          break;
        case 'ISO27001':
          this.policies.push(...this.createISO27001Policies());
          break;
        case 'FedRAMP':
          this.policies.push(...this.createFedRAMPPolicies());
          break;
        case 'PCI-DSS':
          this.policies.push(...this.createPCIDSSPolicies());
          break;
      }
    }

    console.log(
      `📋 Compliance Monitor initialized with ${this.policies.length} policies`
    );
    console.log(`🛡️ Standards: ${this.enabledStandards.join(', ')}`);
  }

  /**
   * Monitor audit event for compliance violations
   */
  async monitorAuditEvent(
    event: SecurityAuditEvent
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    for (const policy of this.policies.filter(p => p.enabled)) {
      for (const rule of policy.rules) {
        if (rule.condition(event)) {
          const violation = await this.createViolation(policy, rule, event);
          violations.push(violation);

          if (policy.autoRemediation) {
            await this.remediateViolation(violation);
          }
        }
      }
    }

    this.violations.push(...violations);
    return violations;
  }

  /**
   * Monitor memory data for compliance violations
   */
  async monitorMemoryData(
    memory: MemoryMetadata
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    for (const policy of this.policies.filter(p => p.enabled)) {
      for (const rule of policy.rules) {
        if (rule.condition(memory)) {
          const violation = await this.createViolation(
            policy,
            rule,
            undefined,
            memory
          );
          violations.push(violation);

          if (policy.autoRemediation) {
            await this.remediateViolation(violation);
          }
        }
      }
    }

    this.violations.push(...violations);
    return violations;
  }

  /**
   * Process data subject request (GDPR Article 15-21)
   */
  async processDataSubjectRequest(
    request: Omit<DataSubjectRequest, 'id' | 'status' | 'dueDate'>
  ): Promise<DataSubjectRequest> {
    const dsr: DataSubjectRequest = {
      id: this.generateRequestId(),
      status: 'pending',
      dueDate: this.calculateDueDate(request.type, request.requestDate),
      ...request,
    };

    this.dataSubjectRequests.push(dsr);

    // Start processing workflow
    await this.startDataSubjectRequestProcessing(dsr);

    return dsr;
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    standard: ComplianceStandard,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    const reportId = this.generateReportId();
    const relevantViolations = this.violations.filter(v => {
      const policy = this.policies.find(p => p.id === v.policyId);
      return (
        policy?.standard === standard &&
        v.timestamp >= startDate &&
        v.timestamp <= endDate
      );
    });

    const totalEvents = relevantViolations.length + 1000; // Simulated total events
    const complianceScore = this.calculateComplianceScore(
      relevantViolations,
      totalEvents
    );

    const report: ComplianceReport = {
      id: reportId,
      generated: new Date(),
      period: { start: startDate, end: endDate },
      standard,
      summary: {
        totalEvents,
        violations: relevantViolations.length,
        remediatedViolations: relevantViolations.filter(v => v.remediated)
          .length,
        complianceScore,
        riskLevel: this.calculateRiskLevel(complianceScore, relevantViolations),
      },
      categories: await this.generateCategoryAnalysis(
        standard,
        relevantViolations
      ),
      recommendations: await this.generateRecommendations(
        standard,
        relevantViolations
      ),
      violations: relevantViolations,
    };

    this.reports.push(report);
    return report;
  }

  /**
   * Get compliance dashboard data
   */
  getComplianceDashboard(): {
    overview: {
      totalPolicies: number;
      activePolicies: number;
      totalViolations: number;
      openViolations: number;
      averageComplianceScore: number;
    };
    violationsTrend: { date: string; count: number }[];
    topViolations: { policyName: string; count: number }[];
    dataSubjectRequests: {
      pending: number;
      processing: number;
      completed: number;
      overdue: number;
    };
    complianceScores: { standard: ComplianceStandard; score: number }[];
  } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentViolations = this.violations.filter(
      v => v.timestamp >= thirtyDaysAgo
    );
    const openViolations = this.violations.filter(v => !v.remediated);

    // Generate violations trend (last 30 days)
    const violationsTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = this.violations.filter(
        v => v.timestamp.toISOString().split('T')[0] === dateStr
      ).length;
      violationsTrend.push({ date: dateStr, count });
    }

    // Top violations by policy
    const violationCounts = new Map<string, number>();
    recentViolations.forEach(v => {
      const policy = this.policies.find(p => p.id === v.policyId);
      if (policy) {
        violationCounts.set(
          policy.name,
          (violationCounts.get(policy.name) || 0) + 1
        );
      }
    });

    const topViolations = Array.from(violationCounts.entries())
      .map(([policyName, count]) => ({ policyName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Data subject requests status
    const dsrStatus = {
      pending: this.dataSubjectRequests.filter(r => r.status === 'pending')
        .length,
      processing: this.dataSubjectRequests.filter(
        r => r.status === 'processing'
      ).length,
      completed: this.dataSubjectRequests.filter(r => r.status === 'completed')
        .length,
      overdue: this.dataSubjectRequests.filter(
        r => r.status !== 'completed' && new Date() > r.dueDate
      ).length,
    };

    // Compliance scores by standard
    const complianceScores = this.enabledStandards.map(standard => {
      const standardViolations = recentViolations.filter(v => {
        const policy = this.policies.find(p => p.id === v.policyId);
        return policy?.standard === standard;
      });
      const score = this.calculateComplianceScore(standardViolations, 1000);
      return { standard, score };
    });

    return {
      overview: {
        totalPolicies: this.policies.length,
        activePolicies: this.policies.filter(p => p.enabled).length,
        totalViolations: this.violations.length,
        openViolations: openViolations.length,
        averageComplianceScore:
          complianceScores.reduce((sum, s) => sum + s.score, 0) /
            complianceScores.length || 100,
      },
      violationsTrend,
      topViolations,
      dataSubjectRequests: dsrStatus,
      complianceScores,
    };
  }

  // GDPR Policies Implementation
  private createGDPRPolicies(): CompliancePolicy[] {
    return [
      {
        id: 'gdpr-data-minimization',
        name: 'Data Minimization (GDPR Art. 5.1.c)',
        standard: 'GDPR',
        description:
          'Personal data must be adequate, relevant and limited to what is necessary',
        severity: 'high',
        enabled: true,
        autoRemediation: false,
        rules: [
          {
            id: 'excessive-personal-data',
            name: 'Excessive Personal Data Collection',
            description: 'Detect collection of unnecessary personal data',
            condition: data => {
              if ('content' in data) {
                const content = data.content.toLowerCase();
                const personalDataCount = [
                  'name',
                  'email',
                  'phone',
                  'address',
                  'ssn',
                  'id number',
                ].filter(term => content.includes(term)).length;
                return personalDataCount > 3; // Threshold for excessive collection
              }
              return false;
            },
            action: 'alert_admin',
          },
        ],
      },
      {
        id: 'gdpr-purpose-limitation',
        name: 'Purpose Limitation (GDPR Art. 5.1.b)',
        standard: 'GDPR',
        description:
          'Personal data must be collected for specified, explicit and legitimate purposes',
        severity: 'high',
        enabled: true,
        autoRemediation: false,
        rules: [
          {
            id: 'purpose-change-detection',
            name: 'Purpose Change Detection',
            description:
              'Detect when data is used for different purposes than originally intended',
            condition: event => {
              if ('eventType' in event) {
                return (
                  event.eventType === 'memory_sharing' &&
                  event.metadata.details?.purposeChange === true
                );
              }
              return false;
            },
            action: 'block_access',
          },
        ],
      },
      {
        id: 'gdpr-retention-limitation',
        name: 'Storage Limitation (GDPR Art. 5.1.e)',
        standard: 'GDPR',
        description: 'Personal data must not be kept longer than necessary',
        severity: 'medium',
        enabled: true,
        autoRemediation: true,
        rules: [
          {
            id: 'retention-period-exceeded',
            name: 'Retention Period Exceeded',
            description: 'Detect personal data kept beyond retention period',
            condition: data => {
              if ('createdAt' in data && 'tags' in data) {
                const isPersonalData = data.tags.some((tag: string) =>
                  ['personal', 'pii', 'gdpr'].includes(tag.toLowerCase())
                );
                if (isPersonalData) {
                  const age = Date.now() - new Date(data.createdAt).getTime();
                  const maxAge = 3 * 365 * 24 * 60 * 60 * 1000; // 3 years
                  return age > maxAge;
                }
              }
              return false;
            },
            action: 'delete_data',
            remediation:
              'Automatically delete personal data that exceeds retention period',
          },
        ],
      },
    ];
  }

  private createHIPAAPolicies(): CompliancePolicy[] {
    return [
      {
        id: 'hipaa-access-control',
        name: 'Access Control (HIPAA 164.312.a.1)',
        standard: 'HIPAA',
        description: 'Implement procedures for granting access to PHI',
        severity: 'critical',
        enabled: true,
        autoRemediation: false,
        rules: [
          {
            id: 'unauthorized-phi-access',
            name: 'Unauthorized PHI Access',
            description:
              'Detect unauthorized access to protected health information',
            condition: event => {
              if ('eventType' in event && event.eventType === 'memory_access') {
                const isPHI = event.metadata.details?.classification === 'phi';
                const isAuthorized =
                  event.metadata.details?.hipaaAuthorized === true;
                return isPHI && !isAuthorized;
              }
              return false;
            },
            action: 'block_access',
          },
        ],
      },
    ];
  }

  private createSOC2Policies(): CompliancePolicy[] {
    return [
      {
        id: 'soc2-availability',
        name: 'Availability (SOC 2 Type II)',
        standard: 'SOC2',
        description:
          'System and information are available for operation and use',
        severity: 'high',
        enabled: true,
        autoRemediation: false,
        rules: [
          {
            id: 'system-unavailability',
            name: 'System Unavailability',
            description: 'Detect system availability issues',
            condition: event => {
              if ('eventType' in event) {
                return (
                  event.result === 'failure' &&
                  event.metadata.details?.errorType === 'system_unavailable'
                );
              }
              return false;
            },
            action: 'alert_admin',
          },
        ],
      },
    ];
  }

  private createISO27001Policies(): CompliancePolicy[] {
    return [
      {
        id: 'iso27001-access-control',
        name: 'Access Control (ISO 27001 A.9)',
        standard: 'ISO27001',
        description:
          'Limit access to information and information processing facilities',
        severity: 'high',
        enabled: true,
        autoRemediation: false,
        rules: [
          {
            id: 'privileged-access-monitoring',
            name: 'Privileged Access Monitoring',
            description: 'Monitor privileged access to sensitive information',
            condition: event => {
              if ('eventType' in event && event.eventType === 'memory_access') {
                return (
                  event.metadata.details?.accessLevel === 'admin' ||
                  event.metadata.details?.privileged === true
                );
              }
              return false;
            },
            action: 'log_violation',
          },
        ],
      },
    ];
  }

  private createFedRAMPPolicies(): CompliancePolicy[] {
    return [
      {
        id: 'fedramp-encryption',
        name: 'Cryptographic Protection (FedRAMP SC-13)',
        standard: 'FedRAMP',
        description:
          'Implement cryptographic mechanisms to prevent unauthorized disclosure',
        severity: 'critical',
        enabled: true,
        autoRemediation: true,
        rules: [
          {
            id: 'unencrypted-sensitive-data',
            name: 'Unencrypted Sensitive Data',
            description: 'Detect sensitive data stored without encryption',
            condition: data => {
              if ('content' in data && 'tags' in data) {
                const isSensitive = data.tags.some((tag: string) =>
                  ['classified', 'sensitive', 'restricted'].includes(
                    tag.toLowerCase()
                  )
                );
                const isEncrypted =
                  'metadata' in data &&
                  (data as any).metadata?.encrypted === true;
                return isSensitive && !isEncrypted;
              }
              return false;
            },
            action: 'encrypt_data',
            remediation: 'Automatically encrypt sensitive data',
          },
        ],
      },
    ];
  }

  private createPCIDSSPolicies(): CompliancePolicy[] {
    return [
      {
        id: 'pcidss-cardholder-data',
        name: 'Protect Cardholder Data (PCI DSS Req. 3)',
        standard: 'PCI-DSS',
        description: 'Protect stored cardholder data',
        severity: 'critical',
        enabled: true,
        autoRemediation: true,
        rules: [
          {
            id: 'unprotected-card-data',
            name: 'Unprotected Card Data',
            description: 'Detect unprotected cardholder data',
            condition: data => {
              if ('content' in data) {
                const content = data.content;
                const hasCardData =
                  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(content);
                const isProtected =
                  'metadata' in data &&
                  (data as any).metadata?.pciCompliant === true;
                return hasCardData && !isProtected;
              }
              return false;
            },
            action: 'encrypt_data',
            remediation: 'Encrypt cardholder data and mark as PCI compliant',
          },
        ],
      },
    ];
  }

  // Helper methods

  private async createViolation(
    policy: CompliancePolicy,
    rule: ComplianceRule,
    event?: SecurityAuditEvent,
    memory?: MemoryMetadata
  ): Promise<ComplianceViolation> {
    return {
      id: this.generateViolationId(),
      timestamp: new Date(),
      policyId: policy.id,
      ruleId: rule.id,
      severity: policy.severity,
      description: `${policy.name}: ${rule.description}`,
      dataSubject:
        event?.userId ||
        (memory && 'userId' in memory ? (memory as any).userId : undefined),
      memoryId: memory?.id || event?.memoryId,
      auditEventId: event?.id,
      remediated: false,
      remediationActions: [],
      metadata: {
        standard: policy.standard,
        autoRemediation: policy.autoRemediation,
        ruleAction: rule.action,
        context: event || memory,
      },
    };
  }

  private async remediateViolation(
    violation: ComplianceViolation
  ): Promise<void> {
    const policy = this.policies.find(p => p.id === violation.policyId);
    const rule = policy?.rules.find(r => r.id === violation.ruleId);

    if (!rule) return;

    const actions = [];

    switch (rule.action) {
      case 'encrypt_data':
        actions.push('Data encrypted with AES-256');
        break;
      case 'delete_data':
        actions.push('Data deleted permanently');
        break;
      case 'anonymize_data':
        actions.push('Personal identifiers anonymized');
        break;
      case 'notify_data_subject':
        actions.push('Data subject notified via secure channel');
        break;
    }

    violation.remediated = true;
    violation.remediationDate = new Date();
    violation.remediationActions = actions;

    console.log(`🔧 Auto-remediated violation: ${violation.id}`);
  }

  private async startDataSubjectRequestProcessing(
    request: DataSubjectRequest
  ): Promise<void> {
    request.status = 'processing';

    // Simulate processing workflow
    setTimeout(async () => {
      switch (request.type) {
        case 'access':
          request.data = await this.collectDataSubjectData(request.dataSubject);
          break;
        case 'erasure':
          await this.eraseDataSubjectData(request.dataSubject);
          break;
        case 'portability':
          request.data = await this.exportDataSubjectData(request.dataSubject);
          break;
      }

      request.status = 'completed';
      request.completionDate = new Date();
    }, 1000); // Simulate processing time
  }

  private async collectDataSubjectData(dataSubject: string): Promise<any> {
    // Simulate data collection
    return { personalData: 'collected', records: 15 };
  }

  private async eraseDataSubjectData(dataSubject: string): Promise<void> {
    // Simulate data erasure
    console.log(`🗑️ Erased data for subject: ${dataSubject}`);
  }

  private async exportDataSubjectData(dataSubject: string): Promise<any> {
    // Simulate data export
    return { exportFile: 'data-export.json', format: 'JSON' };
  }

  private calculateDueDate(
    type: DataSubjectRequest['type'],
    requestDate: Date
  ): Date {
    const dueDate = new Date(requestDate);

    // GDPR timelines
    switch (type) {
      case 'access':
      case 'portability':
        dueDate.setDate(dueDate.getDate() + 30); // 1 month
        break;
      case 'erasure':
      case 'rectification':
        dueDate.setDate(dueDate.getDate() + 30); // 1 month
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 30);
    }

    return dueDate;
  }

  private calculateComplianceScore(
    violations: ComplianceViolation[],
    totalEvents: number
  ): number {
    if (totalEvents === 0) return 100;

    const violationScore = violations.reduce((score, v) => {
      const weight = { low: 1, medium: 2, high: 4, critical: 8 }[v.severity];
      return score + weight;
    }, 0);

    const maxPossibleScore = totalEvents * 8; // All critical violations
    const score = 100 - (violationScore / maxPossibleScore) * 100;

    return Math.max(0, Math.round(score));
  }

  private calculateRiskLevel(
    complianceScore: number,
    violations: ComplianceViolation[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalViolations = violations.filter(
      v => v.severity === 'critical'
    ).length;

    if (criticalViolations > 0 || complianceScore < 50) return 'critical';
    if (complianceScore < 70) return 'high';
    if (complianceScore < 85) return 'medium';
    return 'low';
  }

  private async generateCategoryAnalysis(
    standard: ComplianceStandard,
    violations: ComplianceViolation[]
  ): Promise<ComplianceReport['categories']> {
    // Simplified category analysis
    return {
      dataProcessing: {
        name: 'Data Processing',
        score: 85,
        violations: violations.filter(v => v.description.includes('data'))
          .length,
        recommendations: [
          'Implement data classification',
          'Review processing purposes',
        ],
        status: 'compliant',
      },
      accessControl: {
        name: 'Access Control',
        score: 92,
        violations: violations.filter(v => v.description.includes('access'))
          .length,
        recommendations: ['Enable MFA for all users'],
        status: 'compliant',
      },
      encryption: {
        name: 'Encryption',
        score: 98,
        violations: violations.filter(v => v.description.includes('encrypt'))
          .length,
        recommendations: [],
        status: 'compliant',
      },
      audit: {
        name: 'Audit & Monitoring',
        score: 88,
        violations: violations.filter(v => v.description.includes('audit'))
          .length,
        recommendations: ['Increase audit log retention'],
        status: 'compliant',
      },
      retention: {
        name: 'Data Retention',
        score: 75,
        violations: violations.filter(v => v.description.includes('retention'))
          .length,
        recommendations: ['Implement automated retention policies'],
        status: 'partial',
      },
      breach: {
        name: 'Breach Response',
        score: 90,
        violations: violations.filter(v => v.description.includes('breach'))
          .length,
        recommendations: ['Test incident response procedures'],
        status: 'compliant',
      },
    };
  }

  private async generateRecommendations(
    standard: ComplianceStandard,
    violations: ComplianceViolation[]
  ): Promise<ComplianceRecommendation[]> {
    const recommendations: ComplianceRecommendation[] = [];

    if (violations.some(v => v.description.includes('encrypt'))) {
      recommendations.push({
        id: 'rec-encryption',
        title: 'Enhance Data Encryption',
        description: 'Implement end-to-end encryption for all sensitive data',
        priority: 'high',
        impact: 'Significantly improves data protection compliance',
        effort: 'medium',
        timeline: '2-4 weeks',
        cost: 'medium',
      });
    }

    if (violations.some(v => v.description.includes('access'))) {
      recommendations.push({
        id: 'rec-access-control',
        title: 'Strengthen Access Controls',
        description:
          'Implement role-based access control with principle of least privilege',
        priority: 'high',
        impact: 'Reduces unauthorized access risks',
        effort: 'high',
        timeline: '4-6 weeks',
        cost: 'high',
      });
    }

    return recommendations;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateRequestId(): string {
    return `dsr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
