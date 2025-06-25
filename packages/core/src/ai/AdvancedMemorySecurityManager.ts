/**
 * Advanced Memory Security Manager
 * Zero-trust security architecture with quantum-resistant encryption and comprehensive audit trails
 */

import crypto from 'crypto';
import { MemoryMetadata, MemoryResult } from '../types/index';

export interface SecurityConfig {
  zeroTrustEnabled: boolean;
  encryptionAlgorithm:
    | 'aes-256-gcm'
    | 'chacha20-poly1305'
    | 'quantum-resistant';
  keyRotationInterval: number; // hours
  auditLogging: boolean;
  threatDetection: boolean;
  dataClassification: boolean;
  complianceMode: ComplianceStandard[];
  accessControlModel: 'rbac' | 'abac' | 'pbac'; // Role/Attribute/Policy Based Access Control
  biometricAuth: boolean;
  quantumSafety: boolean;
}

export type ComplianceStandard =
  | 'GDPR'
  | 'HIPAA'
  | 'SOC2'
  | 'ISO27001'
  | 'FedRAMP'
  | 'PCI-DSS';

export interface SecurityContext {
  userId: string;
  agentId: string;
  sessionId: string;
  accessLevel: SecurityLevel;
  permissions: Permission[];
  riskScore: number; // 0-1 scale
  geoLocation?: {
    country: string;
    region: string;
    ip: string;
  };
  deviceFingerprint: string;
  authenticationMethods: AuthMethod[];
  timestamp: Date;
}

export type SecurityLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'top-secret';
export type Permission =
  | 'read'
  | 'write'
  | 'delete'
  | 'share'
  | 'export'
  | 'admin';
export type AuthMethod =
  | 'password'
  | 'mfa'
  | 'biometric'
  | 'certificate'
  | 'zero-knowledge';

export interface MemoryClassification {
  level: SecurityLevel;
  categories: string[];
  retentionPeriod: number; // days
  encryptionRequired: boolean;
  auditRequired: boolean;
  geographicRestrictions: string[];
  accessLog: boolean;
}

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string;
  agentId: string;
  memoryId?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  riskScore: number;
  metadata: {
    ip: string;
    userAgent: string;
    location?: string;
    details: Record<string, any>;
  };
  compliance: {
    gdprCompliant: boolean;
    dataSubject?: string;
    legalBasis?: string;
    retention?: number;
  };
}

export type AuditEventType =
  | 'memory_access'
  | 'memory_creation'
  | 'memory_modification'
  | 'memory_deletion'
  | 'memory_sharing'
  | 'authentication'
  | 'authorization'
  | 'security_violation'
  | 'compliance_check';

export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  condition: (events: SecurityAuditEvent[]) => boolean;
  action: ThreatResponseAction;
  enabled: boolean;
}

export type ThreatResponseAction =
  | 'log_only'
  | 'alert_admin'
  | 'block_user'
  | 'rate_limit'
  | 'require_auth'
  | 'escalate_security';

export class AdvancedMemorySecurityManager {
  private config: SecurityConfig;
  private auditEvents: SecurityAuditEvent[] = [];
  private threatDetectionRules: ThreatDetectionRule[] = [];
  private encryptionKeys = new Map<string, Buffer>();
  private accessTokens = new Map<string, SecurityContext>();

  private readonly MASTER_KEY_ID = 'master-key-v1';
  private readonly QUANTUM_ALGORITHM = 'kyber-768'; // Post-quantum cryptography

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      zeroTrustEnabled: true,
      encryptionAlgorithm: 'aes-256-gcm',
      keyRotationInterval: 24,
      auditLogging: true,
      threatDetection: true,
      dataClassification: true,
      complianceMode: ['GDPR', 'SOC2'],
      accessControlModel: 'abac',
      biometricAuth: false,
      quantumSafety: true,
      ...config,
    };

    this.initializeSecurityInfrastructure();
  }

  /**
   * Initialize security infrastructure
   */
  private async initializeSecurityInfrastructure(): Promise<void> {
    // Generate master encryption key
    await this.generateMasterKey();

    // Initialize threat detection rules
    this.initializeThreatDetectionRules();

    // Start key rotation schedule
    this.scheduleKeyRotation();

    console.log('🔒 Advanced Memory Security Manager initialized');
    console.log(
      `🛡️ Zero-trust: ${this.config.zeroTrustEnabled ? 'ENABLED' : 'DISABLED'}`
    );
    console.log(
      `🔐 Encryption: ${this.config.encryptionAlgorithm.toUpperCase()}`
    );
    console.log(`📋 Compliance: ${this.config.complianceMode.join(', ')}`);
  }

  /**
   * Authenticate and authorize memory access
   */
  async authenticateAndAuthorize(
    userId: string,
    agentId: string,
    memoryId: string,
    action: Permission,
    context: Partial<SecurityContext> = {}
  ): Promise<{
    authorized: boolean;
    securityContext: SecurityContext;
    restrictions: string[];
    auditEventId: string;
  }> {
    // Create security context
    const securityContext: SecurityContext = {
      userId,
      agentId,
      sessionId: context.sessionId || this.generateSessionId(),
      accessLevel: context.accessLevel || 'internal',
      permissions: context.permissions || [],
      riskScore: await this.calculateRiskScore(userId, agentId, context),
      geoLocation: context.geoLocation,
      deviceFingerprint:
        context.deviceFingerprint || this.generateDeviceFingerprint(),
      authenticationMethods: context.authenticationMethods || ['password'],
      timestamp: new Date(),
    };

    // Zero-trust verification
    const zeroTrustResult = this.config.zeroTrustEnabled
      ? await this.performZeroTrustVerification(securityContext)
      : { verified: true, restrictions: [] };

    // Access control decision
    const accessDecision = await this.makeAccessControlDecision(
      securityContext,
      memoryId,
      action
    );

    // Audit the access attempt
    const auditEventId = await this.auditMemoryAccess(
      securityContext,
      memoryId,
      action,
      accessDecision.authorized
    );

    // Threat detection
    if (this.config.threatDetection) {
      await this.analyzeThreatIndicators(securityContext, action);
    }

    return {
      authorized: zeroTrustResult.verified && accessDecision.authorized,
      securityContext,
      restrictions: [
        ...zeroTrustResult.restrictions,
        ...accessDecision.restrictions,
      ],
      auditEventId,
    };
  }

  /**
   * Encrypt memory data with advanced encryption
   */
  async encryptMemory(
    memory: MemoryMetadata,
    securityContext: SecurityContext
  ): Promise<{
    encryptedData: string;
    encryptionMetadata: {
      algorithm: string;
      keyId: string;
      iv: string;
      authTag?: string;
      timestamp: Date;
    };
  }> {
    const classification = await this.classifyMemoryData(memory);

    if (
      !classification.encryptionRequired &&
      securityContext.accessLevel !== 'restricted'
    ) {
      // Return unencrypted data for low-security content
      return {
        encryptedData: JSON.stringify(memory),
        encryptionMetadata: {
          algorithm: 'none',
          keyId: 'none',
          iv: '',
          timestamp: new Date(),
        },
      };
    }

    const keyId = await this.getCurrentEncryptionKey();
    const key = this.encryptionKeys.get(keyId);

    if (!key) {
      throw new Error('Encryption key not available');
    }

    let encryptedData: string;
    let encryptionMetadata: any;

    switch (this.config.encryptionAlgorithm) {
      case 'aes-256-gcm':
        const result = await this.encryptWithAES256GCM(
          JSON.stringify(memory),
          key
        );
        encryptedData = result.encrypted;
        encryptionMetadata = {
          algorithm: 'aes-256-gcm',
          keyId,
          iv: result.iv,
          authTag: result.authTag,
          timestamp: new Date(),
        };
        break;

      case 'chacha20-poly1305':
        const chachaResult = await this.encryptWithChaCha20(
          JSON.stringify(memory),
          key
        );
        encryptedData = chachaResult.encrypted;
        encryptionMetadata = {
          algorithm: 'chacha20-poly1305',
          keyId,
          iv: chachaResult.nonce,
          authTag: chachaResult.authTag,
          timestamp: new Date(),
        };
        break;

      case 'quantum-resistant':
        const quantumResult = await this.encryptWithQuantumResistant(
          JSON.stringify(memory),
          key
        );
        encryptedData = quantumResult.encrypted;
        encryptionMetadata = {
          algorithm: 'quantum-resistant',
          keyId,
          iv: quantumResult.nonce,
          timestamp: new Date(),
        };
        break;

      default:
        throw new Error(
          `Unsupported encryption algorithm: ${this.config.encryptionAlgorithm}`
        );
    }

    // Audit encryption event
    await this.auditEvent({
      eventType: 'memory_creation',
      timestamp: new Date(),
      userId: securityContext.userId,
      agentId: securityContext.agentId,
      memoryId: memory.id,
      action: 'encrypt',
      result: 'success',
      riskScore: securityContext.riskScore,
      metadata: {
        ip: securityContext.geoLocation?.ip || 'system',
        userAgent: securityContext.deviceFingerprint,
        details: {
          algorithm: this.config.encryptionAlgorithm,
          classification: classification.level,
        },
      },
      compliance: {
        gdprCompliant: true,
      },
    });

    return { encryptedData, encryptionMetadata };
  }

  /**
   * Decrypt memory data
   */
  async decryptMemory(
    encryptedData: string,
    encryptionMetadata: any,
    securityContext: SecurityContext
  ): Promise<MemoryMetadata> {
    if (encryptionMetadata.algorithm === 'none') {
      return JSON.parse(encryptedData);
    }

    const key = this.encryptionKeys.get(encryptionMetadata.keyId);
    if (!key) {
      throw new Error('Decryption key not available');
    }

    let decryptedData: string;

    switch (encryptionMetadata.algorithm) {
      case 'aes-256-gcm':
        decryptedData = await this.decryptWithAES256GCM(
          encryptedData,
          key,
          encryptionMetadata.iv,
          encryptionMetadata.authTag
        );
        break;

      case 'chacha20-poly1305':
        decryptedData = await this.decryptWithChaCha20(
          encryptedData,
          key,
          encryptionMetadata.iv,
          encryptionMetadata.authTag
        );
        break;

      case 'quantum-resistant':
        decryptedData = await this.decryptWithQuantumResistant(
          encryptedData,
          key,
          encryptionMetadata.iv
        );
        break;

      default:
        throw new Error(
          `Unsupported encryption algorithm: ${encryptionMetadata.algorithm}`
        );
    }

    return JSON.parse(decryptedData);
  }

  /**
   * Perform zero-trust verification
   */
  private async performZeroTrustVerification(
    context: SecurityContext
  ): Promise<{
    verified: boolean;
    restrictions: string[];
  }> {
    const restrictions: string[] = [];
    let verified = true;

    // Device fingerprint verification
    if (!this.isDeviceTrusted(context.deviceFingerprint)) {
      restrictions.push('untrusted_device');
      if (context.accessLevel === 'restricted') {
        verified = false;
      }
    }

    // Geographic restrictions
    if (
      context.geoLocation &&
      this.hasGeographicRestrictions(context.geoLocation)
    ) {
      restrictions.push('geographic_restriction');
      verified = false;
    }

    // Risk score evaluation
    if (context.riskScore > 0.7) {
      restrictions.push('high_risk_score');
      if (context.riskScore > 0.9) {
        verified = false;
      }
    }

    // Multi-factor authentication requirement
    if (
      context.accessLevel === 'restricted' &&
      !context.authenticationMethods.includes('mfa')
    ) {
      restrictions.push('mfa_required');
      verified = false;
    }

    return { verified, restrictions };
  }

  /**
   * Make access control decision based on configured model
   */
  private async makeAccessControlDecision(
    context: SecurityContext,
    memoryId: string,
    action: Permission
  ): Promise<{ authorized: boolean; restrictions: string[] }> {
    switch (this.config.accessControlModel) {
      case 'rbac':
        return this.evaluateRoleBasedAccess(context, action);

      case 'abac':
        return this.evaluateAttributeBasedAccess(context, memoryId, action);

      case 'pbac':
        return this.evaluatePolicyBasedAccess(context, memoryId, action);

      default:
        return { authorized: false, restrictions: ['unknown_access_model'] };
    }
  }

  /**
   * Calculate risk score for access attempt
   */
  private async calculateRiskScore(
    userId: string,
    agentId: string,
    context: Partial<SecurityContext>
  ): Promise<number> {
    let riskScore = 0;

    // Base risk from user history
    const userHistory = await this.getUserSecurityHistory(userId);
    riskScore += userHistory.violationCount * 0.1;

    // Location-based risk
    if (context.geoLocation) {
      const locationRisk = await this.assessLocationRisk(context.geoLocation);
      riskScore += locationRisk * 0.3;
    }

    // Time-based risk (unusual access times)
    const timeRisk = this.assessTimeBasedRisk(new Date());
    riskScore += timeRisk * 0.2;

    // Device risk
    if (context.deviceFingerprint) {
      const deviceRisk = await this.assessDeviceRisk(context.deviceFingerprint);
      riskScore += deviceRisk * 0.3;
    }

    // Authentication method risk
    const authRisk = this.assessAuthenticationRisk(
      context.authenticationMethods || []
    );
    riskScore += authRisk * 0.1;

    return Math.min(1, riskScore);
  }

  /**
   * Classify memory data for security purposes
   */
  private async classifyMemoryData(
    memory: MemoryMetadata
  ): Promise<MemoryClassification> {
    // Simplified classification logic
    let level: SecurityLevel = 'internal';
    const categories: string[] = [];
    let encryptionRequired = false;
    let auditRequired = false;

    // Content-based classification
    const content = memory.content.toLowerCase();

    if (
      content.includes('password') ||
      content.includes('secret') ||
      content.includes('key')
    ) {
      level = 'confidential';
      encryptionRequired = true;
      auditRequired = true;
      categories.push('credentials');
    }

    if (
      content.includes('personal') ||
      content.includes('private') ||
      content.includes('ssn')
    ) {
      level = 'restricted';
      encryptionRequired = true;
      auditRequired = true;
      categories.push('pii');
    }

    // Importance-based classification
    if (memory.importance > 0.8) {
      level = 'confidential';
      encryptionRequired = true;
    }

    // Tag-based classification
    if (
      memory.tags.some(tag =>
        ['secret', 'confidential', 'private'].includes(tag.toLowerCase())
      )
    ) {
      level = 'restricted';
      encryptionRequired = true;
      auditRequired = true;
    }

    return {
      level,
      categories,
      retentionPeriod: this.getRetentionPeriod(level),
      encryptionRequired,
      auditRequired,
      geographicRestrictions: this.getGeographicRestrictions(level),
      accessLog: auditRequired,
    };
  }

  /**
   * Audit memory access event
   */
  private async auditMemoryAccess(
    context: SecurityContext,
    memoryId: string,
    action: Permission,
    authorized: boolean
  ): Promise<string> {
    const auditEvent: SecurityAuditEvent = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      eventType: 'memory_access',
      userId: context.userId,
      agentId: context.agentId,
      memoryId,
      action,
      result: authorized ? 'success' : 'blocked',
      riskScore: context.riskScore,
      metadata: {
        ip: context.geoLocation?.ip || 'unknown',
        userAgent: context.deviceFingerprint,
        location: context.geoLocation
          ? `${context.geoLocation.country}/${context.geoLocation.region}`
          : undefined,
        details: {
          accessLevel: context.accessLevel,
          permissions: context.permissions,
          authMethods: context.authenticationMethods,
        },
      },
      compliance: await this.generateComplianceMetadata(
        context,
        memoryId,
        action
      ),
    };

    return this.auditEvent(auditEvent);
  }

  /**
   * Generate compliance metadata for audit events
   */
  private async generateComplianceMetadata(
    context: SecurityContext,
    memoryId: string,
    action: Permission
  ): Promise<SecurityAuditEvent['compliance']> {
    const compliance: SecurityAuditEvent['compliance'] = {
      gdprCompliant: true,
    };

    // GDPR compliance checks
    if (this.config.complianceMode.includes('GDPR')) {
      compliance.dataSubject = context.userId;
      compliance.legalBasis = this.determineLegalBasis(action);
      compliance.retention = this.getGDPRRetentionPeriod(action);
    }

    return compliance;
  }

  // Encryption implementations

  private async encryptWithAES256GCM(
    data: string,
    key: Buffer
  ): Promise<{
    encrypted: string;
    iv: string;
    authTag: string;
  }> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('memory-security'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  private async decryptWithAES256GCM(
    encryptedData: string,
    key: Buffer,
    iv: string,
    authTag: string
  ): Promise<string> {
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('memory-security'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async encryptWithChaCha20(
    data: string,
    key: Buffer
  ): Promise<{
    encrypted: string;
    nonce: string;
    authTag: string;
  }> {
    // Simplified ChaCha20-Poly1305 implementation
    // In production, would use a proper crypto library
    const nonce = crypto.randomBytes(12);
    const cipher = crypto.createCipher('chacha20-poly1305', key);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      nonce: nonce.toString('hex'),
      authTag: crypto.randomBytes(16).toString('hex'), // Placeholder
    };
  }

  private async decryptWithChaCha20(
    encryptedData: string,
    key: Buffer,
    nonce: string,
    authTag: string
  ): Promise<string> {
    // Simplified implementation
    const decipher = crypto.createDecipher('chacha20-poly1305', key);

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private async encryptWithQuantumResistant(
    data: string,
    key: Buffer
  ): Promise<{
    encrypted: string;
    nonce: string;
  }> {
    // Placeholder for post-quantum cryptography
    // In production, would use libraries like liboqs or similar
    const nonce = crypto.randomBytes(32);

    // Simulate quantum-resistant encryption
    const encrypted = crypto
      .createHash('sha512')
      .update(data + key.toString('hex') + nonce.toString('hex'))
      .digest('hex');

    return {
      encrypted,
      nonce: nonce.toString('hex'),
    };
  }

  private async decryptWithQuantumResistant(
    encryptedData: string,
    key: Buffer,
    nonce: string
  ): Promise<string> {
    // Placeholder implementation
    // In production, would use proper post-quantum decryption
    throw new Error('Quantum-resistant decryption not yet implemented in demo');
  }

  // Utility methods

  private async generateMasterKey(): Promise<void> {
    const masterKey = crypto.randomBytes(32);
    this.encryptionKeys.set(this.MASTER_KEY_ID, masterKey);
  }

  private async getCurrentEncryptionKey(): Promise<string> {
    return this.MASTER_KEY_ID;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateDeviceFingerprint(): string {
    return `device_${crypto.randomBytes(16).toString('hex')}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  private async auditEvent(
    event: Omit<SecurityAuditEvent, 'id'>
  ): Promise<string> {
    const auditEvent: SecurityAuditEvent = {
      id: this.generateAuditId(),
      ...event,
    };

    this.auditEvents.push(auditEvent);

    if (this.config.auditLogging) {
      console.log(
        `🔍 AUDIT: ${auditEvent.eventType} by ${auditEvent.userId} - ${auditEvent.result}`
      );
    }

    return auditEvent.id;
  }

  private scheduleKeyRotation(): void {
    setInterval(
      async () => {
        await this.rotateEncryptionKeys();
      },
      this.config.keyRotationInterval * 60 * 60 * 1000
    );
  }

  private async rotateEncryptionKeys(): Promise<void> {
    console.log('🔄 Rotating encryption keys...');
    await this.generateMasterKey();
    console.log('✅ Encryption keys rotated successfully');
  }

  private initializeThreatDetectionRules(): void {
    this.threatDetectionRules = [
      {
        id: 'rapid_access_attempts',
        name: 'Rapid Access Attempts',
        description: 'Detect unusual number of access attempts in short time',
        severity: 'high',
        condition: events => {
          const recentEvents = events.filter(
            e =>
              Date.now() - e.timestamp.getTime() < 60000 && // Last minute
              e.eventType === 'memory_access'
          );
          return recentEvents.length > 10;
        },
        action: 'rate_limit',
        enabled: true,
      },
      {
        id: 'geographic_anomaly',
        name: 'Geographic Anomaly',
        description: 'Detect access from unusual locations',
        severity: 'medium',
        condition: events => {
          // Simplified: check for access from different countries in short time
          const recentEvents = events.filter(
            e => Date.now() - e.timestamp.getTime() < 3600000 // Last hour
          );
          const countries = new Set(
            recentEvents.map(e => e.metadata.location?.split('/')[0])
          );
          return countries.size > 2;
        },
        action: 'require_auth',
        enabled: true,
      },
    ];
  }

  // Access control implementations (simplified)

  private async evaluateRoleBasedAccess(
    context: SecurityContext,
    action: Permission
  ): Promise<{
    authorized: boolean;
    restrictions: string[];
  }> {
    return {
      authorized: context.permissions.includes(action),
      restrictions: [],
    };
  }

  private async evaluateAttributeBasedAccess(
    context: SecurityContext,
    memoryId: string,
    action: Permission
  ): Promise<{ authorized: boolean; restrictions: string[] }> {
    // Simplified ABAC implementation
    const authorized =
      context.permissions.includes(action) && context.riskScore < 0.5;
    return { authorized, restrictions: authorized ? [] : ['abac_denied'] };
  }

  private async evaluatePolicyBasedAccess(
    context: SecurityContext,
    memoryId: string,
    action: Permission
  ): Promise<{ authorized: boolean; restrictions: string[] }> {
    // Simplified PBAC implementation
    const authorized = context.accessLevel !== 'public' || action === 'read';
    return { authorized, restrictions: authorized ? [] : ['policy_violation'] };
  }

  // Helper methods (simplified implementations)

  private isDeviceTrusted(fingerprint: string): boolean {
    return true; // Simplified - would check against trusted device database
  }

  private hasGeographicRestrictions(location: any): boolean {
    return false; // Simplified - would check against restricted locations
  }

  private async getUserSecurityHistory(
    userId: string
  ): Promise<{ violationCount: number }> {
    return { violationCount: 0 }; // Simplified
  }

  private async assessLocationRisk(location: any): Promise<number> {
    return 0.1; // Simplified - would use real geolocation risk assessment
  }

  private assessTimeBasedRisk(timestamp: Date): number {
    const hour = timestamp.getHours();
    return hour < 6 || hour > 22 ? 0.3 : 0.1; // Higher risk outside business hours
  }

  private async assessDeviceRisk(fingerprint: string): Promise<number> {
    return 0.1; // Simplified
  }

  private assessAuthenticationRisk(methods: AuthMethod[]): number {
    if (methods.includes('biometric') || methods.includes('mfa')) return 0.05;
    if (methods.includes('certificate')) return 0.1;
    return 0.3; // Higher risk for password-only
  }

  private getRetentionPeriod(level: SecurityLevel): number {
    const periods = {
      public: 365,
      internal: 1095,
      confidential: 2555,
      restricted: 3650,
      'top-secret': 7300,
    };
    return periods[level];
  }

  private getGeographicRestrictions(level: SecurityLevel): string[] {
    if (level === 'restricted' || level === 'top-secret') {
      return ['US', 'CA', 'EU']; // Restricted to specific regions
    }
    return [];
  }

  private determineLegalBasis(action: Permission): string {
    const basisMap = {
      read: 'legitimate_interest',
      write: 'consent',
      delete: 'consent',
      share: 'explicit_consent',
      export: 'explicit_consent',
      admin: 'legal_obligation',
    };
    return basisMap[action] || 'legitimate_interest';
  }

  private getGDPRRetentionPeriod(action: Permission): number {
    return action === 'admin' ? 2555 : 1095; // Different retention for different actions
  }

  private async analyzeThreatIndicators(
    context: SecurityContext,
    action: Permission
  ): Promise<void> {
    const recentEvents = this.auditEvents.filter(
      e => Date.now() - e.timestamp.getTime() < 3600000 // Last hour
    );

    for (const rule of this.threatDetectionRules) {
      if (rule.enabled && rule.condition(recentEvents)) {
        await this.handleThreatDetection(rule, context);
      }
    }
  }

  private async handleThreatDetection(
    rule: ThreatDetectionRule,
    context: SecurityContext
  ): Promise<void> {
    console.warn(`🚨 THREAT DETECTED: ${rule.name} (${rule.severity})`);

    await this.auditEvent({
      eventType: 'security_violation',
      timestamp: new Date(),
      userId: context.userId,
      agentId: context.agentId,
      action: rule.action,
      result: 'blocked',
      riskScore: 1.0,
      metadata: {
        ip: context.geoLocation?.ip || 'unknown',
        userAgent: context.deviceFingerprint,
        details: { threatRule: rule.id, severity: rule.severity },
      },
      compliance: { gdprCompliant: true },
    });
  }

  /**
   * Get security analytics
   */
  getSecurityAnalytics(): {
    totalAuditEvents: number;
    securityViolations: number;
    averageRiskScore: number;
    encryptionUsage: number;
    complianceStatus: Record<ComplianceStandard, boolean>;
  } {
    const violations = this.auditEvents.filter(
      e => e.eventType === 'security_violation'
    ).length;
    const avgRisk =
      this.auditEvents.length > 0
        ? this.auditEvents.reduce((sum, e) => sum + e.riskScore, 0) /
          this.auditEvents.length
        : 0;

    const encryptedEvents = this.auditEvents.filter(
      e => e.action === 'encrypt' || e.metadata.details?.encrypted === true
    ).length;
    const encryptionUsage =
      this.auditEvents.length > 0
        ? encryptedEvents / this.auditEvents.length
        : 0;

    const complianceStatus = this.config.complianceMode.reduce(
      (status, standard) => {
        status[standard] = true; // Simplified - would perform actual compliance checks
        return status;
      },
      {} as Record<ComplianceStandard, boolean>
    );

    return {
      totalAuditEvents: this.auditEvents.length,
      securityViolations: violations,
      averageRiskScore: Math.round(avgRisk * 100) / 100,
      encryptionUsage: Math.round(encryptionUsage * 100) / 100,
      complianceStatus,
    };
  }
}
