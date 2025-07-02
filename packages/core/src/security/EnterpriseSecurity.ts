/**
 * @fileoverview Enterprise Security Implementation (Phase 3.1)
 * Advanced Authentication, Authorization, and Security Features
 */

import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { MemoryMetadata, MemoryQuery } from '../types/index.js';
import { createAgentId, AgentId, Result } from '../typescript/TypeScriptAdvanced.js';

// Advanced Authentication System
export namespace EnterpriseAuthentication {
  
  /**
   * JWT Token Management with Enterprise Features
   */
  export interface JWTPayload {
    sub: string; // Subject (agent ID)
    iss: string; // Issuer
    aud: string; // Audience
    exp: number; // Expiration time
    iat: number; // Issued at
    jti: string; // JWT ID
    scope: string[]; // Permissions
    tenantId: string;
    sessionId: string;
    // Custom claims
    agentType: 'human' | 'ai' | 'service';
    securityLevel: 'basic' | 'elevated' | 'admin';
    mfaVerified: boolean;
    lastPasswordChange?: number;
    allowedOrigins?: string[];
  }

  export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: 'Bearer';
  }

  export class AdvancedJWTManager {
    private secretKey: Buffer;
    private algorithm = 'HS256';
    private issuer: string;
    private audience: string;

    constructor(config: {
      secretKey: string;
      issuer: string;
      audience: string;
    }) {
      this.secretKey = Buffer.from(config.secretKey, 'base64');
      this.issuer = config.issuer;
      this.audience = config.audience;
    }

    // Simplified JWT implementation for demo
    async generateTokenPair(payload: Omit<JWTPayload, 'iss' | 'aud' | 'iat' | 'exp' | 'jti'>): Promise<TokenPair> {
      const now = Math.floor(Date.now() / 1000);
      const jti = randomBytes(16).toString('hex');

      const accessPayload: JWTPayload = {
        ...payload,
        iss: this.issuer,
        aud: this.audience,
        iat: now,
        exp: now + 3600, // 1 hour
        jti
      };

      const refreshPayload = {
        ...payload,
        iss: this.issuer,
        aud: this.audience,
        iat: now,
        exp: now + 604800, // 7 days
        jti: jti + '_refresh',
        type: 'refresh'
      };

      // Simplified token generation (in production, use proper JWT library)
      const accessToken = this.createToken(accessPayload);
      const refreshToken = this.createToken(refreshPayload);

      return {
        accessToken,
        refreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      };
    }

    private createToken(payload: any): string {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = createHash('sha256')
        .update(`${header}.${body}`)
        .update(this.secretKey)
        .digest('base64url');
      
      return `${header}.${body}.${signature}`;
    }

    async verifyToken(token: string): Promise<Result<JWTPayload, string>> {
      try {
        const [headerB64, payloadB64, signature] = token.split('.');
        
        if (!headerB64 || !payloadB64 || !signature) {
          return { success: false, error: 'Invalid token format', data: undefined };
        }

        // Verify signature
        const expectedSignature = createHash('sha256')
          .update(`${headerB64}.${payloadB64}`)
          .update(this.secretKey)
          .digest('base64url');

        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
          return { success: false, error: 'Invalid token signature', data: undefined };
        }

        const payload: JWTPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

        // Check expiration
        if (payload.exp < Math.floor(Date.now() / 1000)) {
          return { success: false, error: 'Token expired', data: undefined };
        }

        // Check issuer and audience
        if (payload.iss !== this.issuer || payload.aud !== this.audience) {
          return { success: false, error: 'Invalid token claims', data: undefined };
        }

        return { success: true, data: payload, error: undefined };
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Token verification failed',
          data: undefined 
        };
      }
    }

    async refreshTokenPair(refreshToken: string): Promise<Result<TokenPair, string>> {
      const verificationResult = await this.verifyToken(refreshToken);
      
      if (!verificationResult.success) {
        return { success: false, error: 'Invalid refresh token', data: undefined };
      }

      const payload = verificationResult.data;
      
      // Ensure it's a refresh token
      if ((payload as any).type !== 'refresh') {
        return { success: false, error: 'Not a refresh token', data: undefined };
      }

      // Generate new token pair
      const newTokenPair = await this.generateTokenPair({
        sub: payload.sub,
        scope: payload.scope,
        tenantId: payload.tenantId,
        sessionId: payload.sessionId,
        agentType: payload.agentType,
        securityLevel: payload.securityLevel,
        mfaVerified: payload.mfaVerified,
        lastPasswordChange: payload.lastPasswordChange,
        allowedOrigins: payload.allowedOrigins
      });

      return { success: true, data: newTokenPair, error: undefined };
    }
  }

  /**
   * Multi-Factor Authentication System
   */
  export class MFAManager {
    private totpSecrets = new Map<string, string>();
    private backupCodes = new Map<string, string[]>();

    generateTOTPSecret(): string {
      return randomBytes(20).toString('hex');
    }

    async setupTOTP(agentId: string): Promise<{
      secret: string;
      qrCodeUrl: string;
      backupCodes: string[];
    }> {
      const secret = this.generateTOTPSecret();
      this.totpSecrets.set(agentId, secret);

      const backupCodes = Array.from({ length: 10 }, () => 
        randomBytes(4).toString('hex').toUpperCase()
      );
      this.backupCodes.set(agentId, backupCodes);

      const qrCodeUrl = `otpauth://totp/Memorai:${agentId}?secret=${secret}&issuer=Memorai`;

      return { secret, qrCodeUrl, backupCodes };
    }

    async verifyTOTP(agentId: string, token: string): Promise<boolean> {
      const secret = this.totpSecrets.get(agentId);
      if (!secret) return false;

      // Simplified TOTP verification (use proper TOTP library in production)
      const timeWindow = Math.floor(Date.now() / 30000);
      const expectedToken = this.generateTOTP(secret, timeWindow);
      
      return timingSafeEqual(
        Buffer.from(token.padStart(6, '0')), 
        Buffer.from(expectedToken)
      );
    }

    private generateTOTP(secret: string, timeWindow: number): string {
      // Simplified TOTP generation
      const hash = createHash('sha1')
        .update(secret)
        .update(timeWindow.toString())
        .digest();
      
      const offset = hash[hash.length - 1] & 0xf;
      const code = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
      
      return (code % 1000000).toString().padStart(6, '0');
    }

    async verifyBackupCode(agentId: string, code: string): Promise<boolean> {
      const codes = this.backupCodes.get(agentId);
      if (!codes) return false;

      const index = codes.findIndex(c => timingSafeEqual(
        Buffer.from(c), 
        Buffer.from(code.toUpperCase())
      ));

      if (index !== -1) {
        // Remove used backup code
        codes.splice(index, 1);
        this.backupCodes.set(agentId, codes);
        return true;
      }

      return false;
    }
  }

  /**
   * Session Management with Security Features
   */
  export interface Session {
    id: string;
    agentId: string;
    createdAt: Date;
    lastAccessed: Date;
    expiresAt: Date;
    ipAddress: string;
    userAgent: string;
    securityLevel: 'basic' | 'elevated' | 'admin';
    mfaVerified: boolean;
    permissions: string[];
    metadata: Record<string, any>;
  }

  export class SecureSessionManager {
    private sessions = new Map<string, Session>();
    private sessionsByAgent = new Map<string, Set<string>>();
    private maxSessionsPerAgent = 10;
    private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

    async createSession(params: {
      agentId: string;
      ipAddress: string;
      userAgent: string;
      securityLevel: Session['securityLevel'];
      mfaVerified: boolean;
      permissions: string[];
      metadata?: Record<string, any>;
    }): Promise<Session> {
      const sessionId = randomBytes(32).toString('hex');
      const now = new Date();

      const session: Session = {
        id: sessionId,
        agentId: params.agentId,
        createdAt: now,
        lastAccessed: now,
        expiresAt: new Date(now.getTime() + this.sessionTimeout),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        securityLevel: params.securityLevel,
        mfaVerified: params.mfaVerified,
        permissions: params.permissions,
        metadata: params.metadata || {}
      };

      this.sessions.set(sessionId, session);

      // Track sessions by agent
      if (!this.sessionsByAgent.has(params.agentId)) {
        this.sessionsByAgent.set(params.agentId, new Set());
      }
      
      const agentSessions = this.sessionsByAgent.get(params.agentId)!;
      agentSessions.add(sessionId);

      // Enforce session limit
      if (agentSessions.size > this.maxSessionsPerAgent) {
        const oldestSession = this.findOldestSession(Array.from(agentSessions));
        if (oldestSession) {
          this.invalidateSession(oldestSession);
        }
      }

      return session;
    }

    async getSession(sessionId: string): Promise<Session | null> {
      const session = this.sessions.get(sessionId);
      
      if (!session) return null;

      // Check expiration
      if (session.expiresAt < new Date()) {
        this.invalidateSession(sessionId);
        return null;
      }

      // Update last accessed
      session.lastAccessed = new Date();
      this.sessions.set(sessionId, session);

      return session;
    }

    async invalidateSession(sessionId: string): Promise<void> {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.sessions.delete(sessionId);
        
        const agentSessions = this.sessionsByAgent.get(session.agentId);
        if (agentSessions) {
          agentSessions.delete(sessionId);
          if (agentSessions.size === 0) {
            this.sessionsByAgent.delete(session.agentId);
          }
        }
      }
    }

    async invalidateAllSessions(agentId: string): Promise<void> {
      const agentSessions = this.sessionsByAgent.get(agentId);
      if (agentSessions) {
        for (const sessionId of agentSessions) {
          this.sessions.delete(sessionId);
        }
        this.sessionsByAgent.delete(agentId);
      }
    }

    private findOldestSession(sessionIds: string[]): string | null {
      let oldestId: string | null = null;
      let oldestTime = Date.now();

      for (const id of sessionIds) {
        const session = this.sessions.get(id);
        if (session && session.lastAccessed.getTime() < oldestTime) {
          oldestTime = session.lastAccessed.getTime();
          oldestId = id;
        }
      }

      return oldestId;
    }

    getActiveSessions(agentId: string): Session[] {
      const sessionIds = this.sessionsByAgent.get(agentId);
      if (!sessionIds) return [];

      return Array.from(sessionIds)
        .map(id => this.sessions.get(id))
        .filter((session): session is Session => session !== undefined);
    }
  }
}

// Authorization and Access Control
export namespace EnterpriseAuthorization {
  
  /**
   * Role-Based Access Control (RBAC)
   */
  export interface Permission {
    resource: string;
    action: string;
    conditions?: Record<string, any>;
  }

  export interface Role {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
    inherits?: string[]; // Role inheritance
  }

  export interface PolicyRule {
    effect: 'allow' | 'deny';
    principals: string[];
    resources: string[];
    actions: string[];
    conditions?: Record<string, any>;
    priority: number;
  }

  export class RBACManager {
    private roles = new Map<string, Role>();
    private userRoles = new Map<string, Set<string>>();
    private policies: PolicyRule[] = [];

    constructor() {
      this.initializeDefaultRoles();
    }

    private initializeDefaultRoles(): void {
      // Memory Admin Role
      this.createRole({
        id: 'memory-admin',
        name: 'Memory Administrator',
        description: 'Full access to memory operations',
        permissions: [
          { resource: 'memory', action: '*' },
          { resource: 'agent', action: 'read' },
          { resource: 'system', action: 'monitor' }
        ]
      });

      // Memory User Role
      this.createRole({
        id: 'memory-user',
        name: 'Memory User',
        description: 'Standard memory operations',
        permissions: [
          { resource: 'memory', action: 'create', conditions: { owner: true } },
          { resource: 'memory', action: 'read', conditions: { owner: true } },
          { resource: 'memory', action: 'update', conditions: { owner: true } },
          { resource: 'memory', action: 'delete', conditions: { owner: true } }
        ]
      });

      // Read-Only Role
      this.createRole({
        id: 'memory-readonly',
        name: 'Memory Read-Only',
        description: 'Read-only access to memories',
        permissions: [
          { resource: 'memory', action: 'read', conditions: { owner: true } }
        ]
      });

      // Service Role
      this.createRole({
        id: 'service-account',
        name: 'Service Account',
        description: 'API service access',
        permissions: [
          { resource: 'memory', action: 'create' },
          { resource: 'memory', action: 'read' },
          { resource: 'memory', action: 'search' },
          { resource: 'system', action: 'health-check' }
        ]
      });
    }

    createRole(role: Role): void {
      this.roles.set(role.id, role);
    }

    assignRole(agentId: string, roleId: string): boolean {
      if (!this.roles.has(roleId)) return false;

      if (!this.userRoles.has(agentId)) {
        this.userRoles.set(agentId, new Set());
      }

      this.userRoles.get(agentId)!.add(roleId);
      return true;
    }

    removeRole(agentId: string, roleId: string): boolean {
      const userRoles = this.userRoles.get(agentId);
      if (!userRoles) return false;

      return userRoles.delete(roleId);
    }

    getUserRoles(agentId: string): Role[] {
      const roleIds = this.userRoles.get(agentId);
      if (!roleIds) return [];

      return Array.from(roleIds)
        .map(id => this.roles.get(id))
        .filter((role): role is Role => role !== undefined);
    }

    getUserPermissions(agentId: string): Permission[] {
      const roles = this.getUserRoles(agentId);
      const permissions: Permission[] = [];

      for (const role of roles) {
        permissions.push(...role.permissions);
        
        // Handle role inheritance
        if (role.inherits) {
          for (const inheritedRoleId of role.inherits) {
            const inheritedRole = this.roles.get(inheritedRoleId);
            if (inheritedRole) {
              permissions.push(...inheritedRole.permissions);
            }
          }
        }
      }

      return permissions;
    }

    checkPermission(
      agentId: string, 
      resource: string, 
      action: string, 
      context?: Record<string, any>
    ): boolean {
      const permissions = this.getUserPermissions(agentId);

      for (const permission of permissions) {
        if (this.matchesPermission(permission, resource, action, agentId, context)) {
          return true;
        }
      }

      // Check explicit policies
      return this.evaluatePolicies(agentId, resource, action, context);
    }

    private matchesPermission(
      permission: Permission,
      resource: string,
      action: string,
      agentId: string,
      context?: Record<string, any>
    ): boolean {
      // Check resource match
      if (permission.resource !== '*' && permission.resource !== resource) {
        return false;
      }

      // Check action match
      if (permission.action !== '*' && permission.action !== action) {
        return false;
      }

      // Check conditions
      if (permission.conditions) {
        for (const [key, value] of Object.entries(permission.conditions)) {
          if (key === 'owner' && value === true) {
            // Check if the agent owns the resource
            if (context?.ownerId !== agentId) {
              return false;
            }
          }
          // Add more condition checks as needed
        }
      }

      return true;
    }

    private evaluatePolicies(
      agentId: string,
      resource: string,
      action: string,
      context?: Record<string, any>
    ): boolean {
      const applicablePolicies = this.policies
        .filter(policy => 
          policy.principals.includes(agentId) || policy.principals.includes('*')
        )
        .filter(policy =>
          policy.resources.includes(resource) || policy.resources.includes('*')
        )
        .filter(policy =>
          policy.actions.includes(action) || policy.actions.includes('*')
        )
        .sort((a, b) => b.priority - a.priority);

      for (const policy of applicablePolicies) {
        if (policy.effect === 'deny') {
          return false;
        }
        if (policy.effect === 'allow') {
          return true;
        }
      }

      return false; // Deny by default
    }

    addPolicy(policy: PolicyRule): void {
      this.policies.push(policy);
      // Sort by priority (higher priority first)
      this.policies.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Attribute-Based Access Control (ABAC)
   */
  export interface AttributeContext {
    subject: {
      agentId: string;
      agentType: 'human' | 'ai' | 'service';
      securityLevel: string;
      tenantId: string;
      roles: string[];
      attributes: Record<string, any>;
    };
    resource: {
      type: string;
      id: string;
      ownerId: string;
      classification: string;
      attributes: Record<string, any>;
    };
    action: {
      type: string;
      method: string;
    };
    environment: {
      timestamp: Date;
      ipAddress: string;
      userAgent: string;
      location?: string;
      securityContext: Record<string, any>;
    };
  }

  export interface ABACRule {
    id: string;
    name: string;
    description: string;
    condition: string; // JSON Logic or similar expression
    effect: 'permit' | 'deny';
    priority: number;
  }

  export class ABACManager {
    private rules: ABACRule[] = [];

    constructor() {
      this.initializeDefaultRules();
    }

    private initializeDefaultRules(): void {
      this.addRule({
        id: 'owner-access',
        name: 'Owner Access',
        description: 'Allow owners to access their own resources',
        condition: JSON.stringify({
          and: [
            { "==": [{ var: "subject.agentId" }, { var: "resource.ownerId" }] },
            { in: [{ var: "action.type" }, ["read", "update", "delete"]] }
          ]
        }),
        effect: 'permit',
        priority: 100
      });

      this.addRule({
        id: 'admin-override',
        name: 'Admin Override',
        description: 'Allow admins to access all resources',
        condition: JSON.stringify({
          and: [
            { in: ["memory-admin", { var: "subject.roles" }] },
            { "==": [{ var: "subject.securityLevel" }, "admin"] }
          ]
        }),
        effect: 'permit',
        priority: 200
      });

      this.addRule({
        id: 'cross-tenant-deny',
        name: 'Cross-Tenant Deny',
        description: 'Deny access to resources from different tenants',
        condition: JSON.stringify({
          and: [
            { "!=": [{ var: "subject.tenantId" }, { var: "resource.attributes.tenantId" }] },
            { "!=": [{ var: "subject.securityLevel" }, "admin"] }
          ]
        }),
        effect: 'deny',
        priority: 300
      });

      this.addRule({
        id: 'time-based-access',
        name: 'Time-Based Access',
        description: 'Restrict access during certain hours',
        condition: JSON.stringify({
          and: [
            { "==": [{ var: "subject.agentType" }, "human"] },
            {
              or: [
                { "<": [{ var: "environment.hour" }, 8] },
                { ">": [{ var: "environment.hour" }, 18] }
              ]
            },
            { "!=": [{ var: "action.type" }, "read"] }
          ]
        }),
        effect: 'deny',
        priority: 50
      });
    }

    addRule(rule: ABACRule): void {
      this.rules.push(rule);
      this.rules.sort((a, b) => b.priority - a.priority);
    }

    evaluateAccess(context: AttributeContext): {
      decision: 'permit' | 'deny' | 'not-applicable';
      reason: string;
      appliedRules: string[];
    } {
      const appliedRules: string[] = [];
      
      // Add environment context
      const enrichedContext = {
        ...context,
        environment: {
          ...context.environment,
          hour: context.environment.timestamp.getHours()
        }
      };

      for (const rule of this.rules) {
        try {
          const result = this.evaluateCondition(rule.condition, enrichedContext);
          
          if (result) {
            appliedRules.push(rule.id);
            
            if (rule.effect === 'deny') {
              return {
                decision: 'deny',
                reason: `Denied by rule: ${rule.name}`,
                appliedRules
              };
            }
            
            if (rule.effect === 'permit') {
              return {
                decision: 'permit',
                reason: `Permitted by rule: ${rule.name}`,
                appliedRules
              };
            }
          }
        } catch (error) {
          console.error(`Error evaluating rule ${rule.id}:`, error);
        }
      }

      return {
        decision: 'deny', // Default deny
        reason: 'No applicable rules found - default deny',
        appliedRules
      };
    }

    private evaluateCondition(condition: string, context: AttributeContext): boolean {
      try {
        // Simplified condition evaluation (use proper JSON Logic library in production)
        const conditionObj = JSON.parse(condition);
        return this.evaluateJsonLogic(conditionObj, context);
      } catch (error) {
        console.error('Error evaluating condition:', error);
        return false;
      }
    }

    private evaluateJsonLogic(logic: any, data: any): boolean {
      // Simplified JSON Logic implementation
      if (typeof logic !== 'object' || logic === null) {
        return Boolean(logic);
      }

      if ('and' in logic) {
        return logic.and.every((condition: any) => this.evaluateJsonLogic(condition, data));
      }

      if ('or' in logic) {
        return logic.or.some((condition: any) => this.evaluateJsonLogic(condition, data));
      }

      if ('==' in logic) {
        const [left, right] = logic['=='];
        return this.resolveVar(left, data) === this.resolveVar(right, data);
      }

      if ('!=' in logic) {
        const [left, right] = logic['!='];
        return this.resolveVar(left, data) !== this.resolveVar(right, data);
      }

      if ('in' in logic) {
        const [needle, haystack] = logic.in;
        const needleValue = this.resolveVar(needle, data);
        const haystackValue = this.resolveVar(haystack, data);
        
        if (Array.isArray(haystackValue)) {
          return haystackValue.includes(needleValue);
        }
        return false;
      }

      if ('<' in logic) {
        const [left, right] = logic['<'];
        return Number(this.resolveVar(left, data)) < Number(this.resolveVar(right, data));
      }

      if ('>' in logic) {
        const [left, right] = logic['>'];
        return Number(this.resolveVar(left, data)) > Number(this.resolveVar(right, data));
      }

      return false;
    }

    private resolveVar(variable: any, data: any): any {
      if (typeof variable === 'object' && variable !== null && 'var' in variable) {
        const path = variable.var.split('.');
        let current = data;
        
        for (const key of path) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return undefined;
          }
        }
        
        return current;
      }
      
      return variable;
    }
  }
}

// Security Monitoring and Audit
export namespace SecurityMonitoring {
  
  /**
   * Security Event Types
   */
  export type SecurityEventType = 
    | 'authentication_success'
    | 'authentication_failure'
    | 'authorization_denied'
    | 'suspicious_activity'
    | 'data_access'
    | 'data_modification'
    | 'session_created'
    | 'session_invalidated'
    | 'mfa_enabled'
    | 'mfa_disabled'
    | 'password_changed'
    | 'privilege_escalation'
    | 'rate_limit_exceeded'
    | 'ip_blocked'
    | 'anomaly_detected';

  export interface SecurityEvent {
    id: string;
    type: SecurityEventType;
    timestamp: Date;
    agentId: string;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    resource?: string;
    action?: string;
    result: 'success' | 'failure' | 'blocked';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: Record<string, any>;
    geolocation?: {
      country?: string;
      region?: string;
      city?: string;
      coordinates?: [number, number];
    };
  }

  export class SecurityAuditLogger {
    private events: SecurityEvent[] = [];
    private maxEvents = 100000;

    logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
      const securityEvent: SecurityEvent = {
        ...event,
        id: randomBytes(16).toString('hex'),
        timestamp: new Date()
      };

      this.events.push(securityEvent);

      // Maintain event limit
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }

      // Real-time alerting for critical events
      if (securityEvent.severity === 'critical') {
        this.handleCriticalEvent(securityEvent);
      }

      // Log to console for demo
      console.log(`[SECURITY] ${securityEvent.type}: ${securityEvent.result}`, {
        agentId: securityEvent.agentId,
        severity: securityEvent.severity,
        details: securityEvent.details
      });
    }

    private handleCriticalEvent(event: SecurityEvent): void {
      // In production, this would trigger alerts, notifications, etc.
      console.error('CRITICAL SECURITY EVENT:', event);
      
      // Auto-block suspicious IPs
      if (event.type === 'suspicious_activity') {
        this.blockIP(event.ipAddress, 'Automatic block due to suspicious activity');
      }
    }

    private blockIP(ipAddress: string, reason: string): void {
      // Implementation would integrate with firewall/rate limiting
      console.warn(`IP ${ipAddress} blocked: ${reason}`);
    }

    getEvents(filter?: {
      agentId?: string;
      type?: SecurityEventType;
      severity?: SecurityEvent['severity'];
      startTime?: Date;
      endTime?: Date;
      limit?: number;
    }): SecurityEvent[] {
      let filteredEvents = [...this.events];

      if (filter) {
        if (filter.agentId) {
          filteredEvents = filteredEvents.filter(e => e.agentId === filter.agentId);
        }
        
        if (filter.type) {
          filteredEvents = filteredEvents.filter(e => e.type === filter.type);
        }
        
        if (filter.severity) {
          filteredEvents = filteredEvents.filter(e => e.severity === filter.severity);
        }
        
        if (filter.startTime) {
          filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.startTime!);
        }
        
        if (filter.endTime) {
          filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.endTime!);
        }
        
        if (filter.limit) {
          filteredEvents = filteredEvents.slice(-filter.limit);
        }
      }

      return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    generateSecurityReport(): {
      summary: {
        totalEvents: number;
        criticalEvents: number;
        failedAuthentications: number;
        suspiciousActivities: number;
        blockedActions: number;
      };
      topRisks: {
        type: SecurityEventType;
        count: number;
        lastOccurrence: Date;
      }[];
      recommendations: string[];
    } {
      const events = this.events;
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const recentEvents = events.filter(e => e.timestamp >= last24h);
      
      const summary = {
        totalEvents: recentEvents.length,
        criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
        failedAuthentications: recentEvents.filter(e => 
          e.type === 'authentication_failure' || e.type === 'authorization_denied'
        ).length,
        suspiciousActivities: recentEvents.filter(e => e.type === 'suspicious_activity').length,
        blockedActions: recentEvents.filter(e => e.result === 'blocked').length
      };

      // Calculate top risks
      const eventCounts = new Map<SecurityEventType, { count: number; lastOccurrence: Date }>();
      
      for (const event of recentEvents) {
        if (['high', 'critical'].includes(event.severity)) {
          const current = eventCounts.get(event.type) || { count: 0, lastOccurrence: new Date(0) };
          eventCounts.set(event.type, {
            count: current.count + 1,
            lastOccurrence: event.timestamp > current.lastOccurrence ? event.timestamp : current.lastOccurrence
          });
        }
      }

      const topRisks = Array.from(eventCounts.entries())
        .map(([type, data]) => ({ type, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (summary.failedAuthentications > 10) {
        recommendations.push('Consider implementing additional rate limiting for authentication attempts');
      }
      
      if (summary.criticalEvents > 0) {
        recommendations.push('Review critical security events and enhance monitoring');
      }
      
      if (summary.suspiciousActivities > 5) {
        recommendations.push('Investigate patterns in suspicious activity and update detection rules');
      }

      return { summary, topRisks, recommendations };
    }
  }

  /**
   * Anomaly Detection System
   */
  export class SecurityAnomalyDetector {
    private baselineMetrics = new Map<string, {
      avgRequestsPerHour: number;
      avgDataAccess: number;
      commonIPs: Set<string>;
      commonUserAgents: Set<string>;
      lastUpdated: Date;
    }>();

    analyzeAgentBehavior(agentId: string, events: SecurityEvent[]): {
      anomalies: {
        type: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        evidence: any;
      }[];
      riskScore: number;
    } {
      const anomalies: any[] = [];
      const now = new Date();
      const recentEvents = events.filter(e => 
        e.agentId === agentId && 
        e.timestamp >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
      );

      // Check for unusual access patterns
      const hourlyRequests = this.groupEventsByHour(recentEvents);
      const avgRequests = Array.from(hourlyRequests.values()).reduce((a, b) => a + b, 0) / 24;
      
      if (avgRequests > 100) { // Threshold for unusual activity
        anomalies.push({
          type: 'high_request_volume',
          severity: 'medium',
          description: `Unusually high request volume: ${avgRequests.toFixed(1)} requests/hour`,
          evidence: { hourlyRequests: Object.fromEntries(hourlyRequests) }
        });
      }

      // Check for unusual IP addresses
      const ipAddresses = new Set(recentEvents.map(e => e.ipAddress));
      if (ipAddresses.size > 5) {
        anomalies.push({
          type: 'multiple_ip_addresses',
          severity: 'high',
          description: `Access from ${ipAddresses.size} different IP addresses`,
          evidence: { ipAddresses: Array.from(ipAddresses) }
        });
      }

      // Check for unusual timing patterns
      const nightTimeEvents = recentEvents.filter(e => {
        const hour = e.timestamp.getHours();
        return hour < 6 || hour > 22;
      });
      
      if (nightTimeEvents.length > 10) {
        anomalies.push({
          type: 'unusual_timing',
          severity: 'medium',
          description: `${nightTimeEvents.length} events during unusual hours`,
          evidence: { nightTimeEventCount: nightTimeEvents.length }
        });
      }

      // Check for failed authentication spikes
      const failedAuths = recentEvents.filter(e => 
        e.type === 'authentication_failure' || e.result === 'failure'
      );
      
      if (failedAuths.length > 5) {
        anomalies.push({
          type: 'authentication_failures',
          severity: 'high',
          description: `${failedAuths.length} authentication failures`,
          evidence: { failureCount: failedAuths.length }
        });
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(anomalies);

      return { anomalies, riskScore };
    }

    private groupEventsByHour(events: SecurityEvent[]): Map<number, number> {
      const hourlyCount = new Map<number, number>();
      
      for (let hour = 0; hour < 24; hour++) {
        hourlyCount.set(hour, 0);
      }

      for (const event of events) {
        const hour = event.timestamp.getHours();
        hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
      }

      return hourlyCount;
    }

    private calculateRiskScore(anomalies: any[]): number {
      let score = 0;
      
      for (const anomaly of anomalies) {
        switch (anomaly.severity) {
          case 'low': score += 10; break;
          case 'medium': score += 25; break;
          case 'high': score += 50; break;
        }
      }

      return Math.min(score, 100); // Cap at 100
    }
  }
}


