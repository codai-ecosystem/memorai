import type { SecurityConfig } from '../types/Security.js';

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

interface ConnectionData {
  connections: number;
  lastSeen: number;
  blocked: boolean;
  blockExpiry?: number;
}

interface TrafficPattern {
  requestsPerSecond: number;
  averageSize: number;
  uniqueEndpoints: Set<string>;
  suspiciousPatterns: string[];
}

/**
 * DDoS Protection Layer
 *
 * Provides comprehensive protection against distributed denial of service attacks
 * with intelligent traffic analysis and automatic response.
 */
export class DDoSProtectionLayer {
  private config: SecurityConfig;
  private connectionData: Map<string, ConnectionData> = new Map();
  private trafficPatterns: Map<string, TrafficPattern> = new Map();
  private blockedIPs: Set<string> = new Set();
  private isActive: boolean = false;
  private emergencyMode: boolean = false;
  private globalRequestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: SecurityConfig) {
    this.config = config;
    logger.info('DDoSProtectionLayer initialized');
  }

  /**
   * Start DDoS protection monitoring
   */
  public start(): void {
    this.isActive = true;
    this.startMonitoringTasks();
    logger.info('DDoS protection monitoring started');
  }

  /**
   * Stop DDoS protection monitoring
   */
  public stop(): void {
    this.isActive = false;
    this.emergencyMode = false;
    logger.info('DDoS protection monitoring stopped');
  }

  /**
   * Analyze incoming request for DDoS patterns
   */
  public async analyzeRequest(
    clientIP: string,
    endpoint: string,
    requestSize: number,
    userAgent: string
  ): Promise<{
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block' | 'emergency';
    reason?: string;
    retryAfter?: number;
  }> {
    if (!this.isActive) {
      return { allowed: true, action: 'allow' };
    }

    // Check if IP is already blocked
    if (this.blockedIPs.has(clientIP)) {
      const connectionData = this.connectionData.get(clientIP);
      if (
        connectionData?.blockExpiry &&
        Date.now() < connectionData.blockExpiry
      ) {
        return {
          allowed: false,
          action: 'block',
          reason: 'IP temporarily blocked due to DDoS activity',
          retryAfter: Math.ceil(
            (connectionData.blockExpiry - Date.now()) / 1000
          ),
        };
      } else {
        // Block expired, remove from blocked list
        this.unblockIP(clientIP);
      }
    }

    // Update connection tracking
    this.updateConnectionData(clientIP);

    // Update traffic patterns
    this.updateTrafficPatterns(clientIP, endpoint, requestSize);

    // Check for various DDoS indicators
    const connectionCheck = this.checkConnectionLimits(clientIP);
    if (!connectionCheck.allowed) {
      return connectionCheck;
    }

    const patternCheck = this.checkTrafficPatterns(clientIP);
    if (!patternCheck.allowed) {
      return patternCheck;
    }

    const globalCheck = this.checkGlobalLimits();
    if (!globalCheck.allowed) {
      return globalCheck;
    }

    // Check for suspicious user agent patterns
    const userAgentCheck = this.checkUserAgent(userAgent);
    if (!userAgentCheck.allowed) {
      return userAgentCheck;
    }

    // If emergency mode is active, be more restrictive
    if (this.emergencyMode) {
      return this.applyEmergencyLimits(clientIP);
    }

    this.globalRequestCount++;
    return { allowed: true, action: 'allow' };
  }

  /**
   * Update connection data for IP
   */
  private updateConnectionData(clientIP: string): void {
    const now = Date.now();
    const existing = this.connectionData.get(clientIP);

    if (existing) {
      existing.connections++;
      existing.lastSeen = now;
    } else {
      this.connectionData.set(clientIP, {
        connections: 1,
        lastSeen: now,
        blocked: false,
      });
    }
  }

  /**
   * Update traffic patterns for analysis
   */
  private updateTrafficPatterns(
    clientIP: string,
    endpoint: string,
    requestSize: number
  ): void {
    const pattern = this.trafficPatterns.get(clientIP);
    const now = Date.now();

    if (pattern) {
      // Update existing pattern
      pattern.requestsPerSecond = this.calculateRequestsPerSecond(clientIP);
      pattern.averageSize = (pattern.averageSize + requestSize) / 2;
      pattern.uniqueEndpoints.add(endpoint);

      // Check for suspicious patterns
      if (pattern.requestsPerSecond > 100) {
        pattern.suspiciousPatterns.push('high_frequency');
      }
      if (pattern.uniqueEndpoints.size > 50) {
        pattern.suspiciousPatterns.push('endpoint_scanning');
      }
      if (requestSize > 1024 * 1024) {
        // 1MB
        pattern.suspiciousPatterns.push('large_payload');
      }
    } else {
      this.trafficPatterns.set(clientIP, {
        requestsPerSecond: 1,
        averageSize: requestSize,
        uniqueEndpoints: new Set([endpoint]),
        suspiciousPatterns: [],
      });
    }
  }

  /**
   * Check connection limits for IP
   */
  private checkConnectionLimits(clientIP: string): {
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    reason?: string;
    retryAfter?: number;
  } {
    const connectionData = this.connectionData.get(clientIP);
    if (!connectionData) {
      return { allowed: true, action: 'allow' };
    }

    const requestsPerSecond = this.calculateRequestsPerSecond(clientIP);

    // High frequency threshold
    if (requestsPerSecond > this.config.ddosProtection.threshold) {
      this.blockIP(clientIP, 'High request frequency');
      return {
        allowed: false,
        action: 'block',
        reason: `Request frequency too high: ${requestsPerSecond} req/s`,
        retryAfter: this.config.ddosProtection.blockDurationMs / 1000,
      };
    }

    // Medium frequency - throttle
    if (requestsPerSecond > this.config.ddosProtection.threshold * 0.7) {
      return {
        allowed: false,
        action: 'throttle',
        reason: 'Request frequency elevated - throttling applied',
      };
    }

    return { allowed: true, action: 'allow' };
  }

  /**
   * Check traffic patterns for suspicious activity
   */
  private checkTrafficPatterns(clientIP: string): {
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    reason?: string;
  } {
    const pattern = this.trafficPatterns.get(clientIP);
    if (!pattern) {
      return { allowed: true, action: 'allow' };
    }

    const suspiciousScore = this.calculateSuspiciousScore(pattern);

    // High suspicion - block
    if (suspiciousScore > 0.8) {
      this.blockIP(clientIP, 'Suspicious traffic patterns');
      return {
        allowed: false,
        action: 'block',
        reason: `Suspicious traffic patterns detected (score: ${suspiciousScore.toFixed(2)})`,
      };
    }

    // Medium suspicion - throttle
    if (suspiciousScore > 0.5) {
      return {
        allowed: false,
        action: 'throttle',
        reason: 'Potentially suspicious traffic patterns',
      };
    }

    return { allowed: true, action: 'allow' };
  }

  /**
   * Check global system limits
   */
  private checkGlobalLimits(): {
    allowed: boolean;
    action: 'allow' | 'emergency';
    reason?: string;
  } {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const globalRequestsPerSecond =
      this.globalRequestCount / (timeSinceReset / 1000);

    // Check if we should enter emergency mode
    if (globalRequestsPerSecond > 10000) {
      // 10k req/s global threshold
      if (!this.emergencyMode) {
        this.activateEmergencyMode();
      }
      return {
        allowed: false,
        action: 'emergency',
        reason: 'System under heavy load - emergency mode activated',
      };
    }

    return { allowed: true, action: 'allow' };
  }

  /**
   * Check user agent for bot patterns
   */
  private checkUserAgent(userAgent: string): {
    allowed: boolean;
    action: 'allow' | 'throttle';
    reason?: string;
  } {
    const suspiciousUAPatterns = [
      /bot|crawler|spider|scraper/i,
      /attack|hack|exploit/i,
      /stress|load|test|benchmark/i,
      /^$/, // Empty user agent
      /.{200,}/, // Very long user agent
    ];

    for (const pattern of suspiciousUAPatterns) {
      if (pattern.test(userAgent)) {
        return {
          allowed: false,
          action: 'throttle',
          reason: 'Suspicious user agent pattern detected',
        };
      }
    }

    return { allowed: true, action: 'allow' };
  }

  /**
   * Apply emergency mode restrictions
   */
  private applyEmergencyLimits(clientIP: string): {
    allowed: boolean;
    action: 'allow' | 'throttle' | 'block';
    reason?: string;
  } {
    const connectionData = this.connectionData.get(clientIP);
    if (!connectionData) {
      return { allowed: true, action: 'allow' };
    }

    // In emergency mode, be very restrictive
    const requestsPerSecond = this.calculateRequestsPerSecond(clientIP);

    if (requestsPerSecond > 5) {
      // Much lower threshold in emergency mode
      return {
        allowed: false,
        action: 'block',
        reason: 'Emergency mode active - strict limits enforced',
      };
    }

    if (requestsPerSecond > 2) {
      return {
        allowed: false,
        action: 'throttle',
        reason: 'Emergency mode active - throttling applied',
      };
    }

    return { allowed: true, action: 'allow' };
  }

  /**
   * Calculate requests per second for an IP
   */
  private calculateRequestsPerSecond(clientIP: string): number {
    const connectionData = this.connectionData.get(clientIP);
    if (!connectionData) return 0;

    const now = Date.now();
    const timeDiff = (now - connectionData.lastSeen) / 1000;

    if (timeDiff === 0) return connectionData.connections;

    return connectionData.connections / Math.max(timeDiff, 1);
  }

  /**
   * Calculate suspicious score based on traffic patterns
   */
  private calculateSuspiciousScore(pattern: TrafficPattern): number {
    let score = 0;

    // High request frequency
    if (pattern.requestsPerSecond > 50) score += 0.3;
    if (pattern.requestsPerSecond > 100) score += 0.2;

    // Large number of unique endpoints (scanning)
    if (pattern.uniqueEndpoints.size > 20) score += 0.2;
    if (pattern.uniqueEndpoints.size > 50) score += 0.2;

    // Large request sizes
    if (pattern.averageSize > 100 * 1024) score += 0.1;

    // Specific suspicious patterns
    for (const suspiciousPattern of pattern.suspiciousPatterns) {
      switch (suspiciousPattern) {
        case 'high_frequency':
          score += 0.3;
          break;
        case 'endpoint_scanning':
          score += 0.2;
          break;
        case 'large_payload':
          score += 0.1;
          break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Block an IP address
   */
  private blockIP(clientIP: string, reason: string): void {
    this.blockedIPs.add(clientIP);

    const connectionData = this.connectionData.get(clientIP);
    if (connectionData) {
      connectionData.blocked = true;
      connectionData.blockExpiry =
        Date.now() + this.config.ddosProtection.blockDurationMs;
    }

    logger.warn('IP blocked for DDoS activity', { clientIP, reason });
  }

  /**
   * Unblock an IP address
   */
  public unblockIP(clientIP: string): void {
    this.blockedIPs.delete(clientIP);

    const connectionData = this.connectionData.get(clientIP);
    if (connectionData) {
      connectionData.blocked = false;
      connectionData.blockExpiry = undefined;
    }

    logger.info('IP unblocked', { clientIP });
  }

  /**
   * Activate emergency mode
   */
  private activateEmergencyMode(): void {
    this.emergencyMode = true;
    logger.error('EMERGENCY MODE ACTIVATED - System under DDoS attack');

    // In emergency mode, temporarily block new IPs more aggressively
    setTimeout(() => {
      if (this.emergencyMode) {
        this.deactivateEmergencyMode();
      }
    }, 300000); // 5 minutes
  }

  /**
   * Deactivate emergency mode
   */
  private deactivateEmergencyMode(): void {
    this.emergencyMode = false;
    logger.info('Emergency mode deactivated');
  }

  /**
   * Get DDoS protection statistics
   */
  public getStatistics(): {
    activeConnections: number;
    blockedIPs: number;
    emergencyMode: boolean;
    globalRequestsPerSecond: number;
    topSuspiciousIPs: Array<{ ip: string; score: number; reason: string }>;
    protectionEvents: Array<{
      timestamp: Date;
      ip: string;
      action: string;
      reason: string;
    }>;
  } {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    const globalRequestsPerSecond =
      this.globalRequestCount / (timeSinceReset / 1000);

    // Calculate top suspicious IPs
    const suspiciousIPs: Array<{ ip: string; score: number; reason: string }> =
      [];
    for (const [ip, pattern] of this.trafficPatterns) {
      const score = this.calculateSuspiciousScore(pattern);
      if (score > 0.3) {
        suspiciousIPs.push({
          ip,
          score,
          reason:
            pattern.suspiciousPatterns.join(', ') || 'High request frequency',
        });
      }
    }

    suspiciousIPs.sort((a, b) => b.score - a.score);

    return {
      activeConnections: this.connectionData.size,
      blockedIPs: this.blockedIPs.size,
      emergencyMode: this.emergencyMode,
      globalRequestsPerSecond: Math.round(globalRequestsPerSecond * 100) / 100,
      topSuspiciousIPs: suspiciousIPs.slice(0, 10),
      protectionEvents: [], // Would be populated with actual events
    };
  }

  /**
   * Clear all DDoS protection data
   */
  public clearData(): void {
    this.connectionData.clear();
    this.trafficPatterns.clear();
    this.blockedIPs.clear();
    this.emergencyMode = false;
    this.globalRequestCount = 0;
    this.lastResetTime = Date.now();
    logger.info('DDoS protection data cleared');
  }

  /**
   * Start monitoring tasks
   */
  private startMonitoringTasks(): void {
    // Reset global counters every minute
    setInterval(() => {
      if (!this.isActive) return;

      this.globalRequestCount = 0;
      this.lastResetTime = Date.now();
    }, 60000);

    // Cleanup expired data every 5 minutes
    setInterval(() => {
      if (!this.isActive) return;

      this.cleanupExpiredData();
    }, 300000);

    // Monitor system health every 30 seconds
    setInterval(() => {
      if (!this.isActive) return;

      this.monitorSystemHealth();
    }, 30000);
  }

  /**
   * Cleanup expired connection data
   */
  private cleanupExpiredData(): void {
    const now = Date.now();
    const expiry = 3600000; // 1 hour
    const keysToRemove: string[] = [];

    for (const [ip, data] of this.connectionData) {
      if (now - data.lastSeen > expiry) {
        keysToRemove.push(ip);
      }
    }

    for (const key of keysToRemove) {
      this.connectionData.delete(key);
      this.trafficPatterns.delete(key);
    }

    // Clean up expired blocks
    for (const ip of this.blockedIPs) {
      const data = this.connectionData.get(ip);
      if (data?.blockExpiry && now > data.blockExpiry) {
        this.unblockIP(ip);
      }
    }

    if (keysToRemove.length > 0) {
      logger.debug('DDoS protection cleanup completed', {
        removedConnections: keysToRemove.length,
        activeConnections: this.connectionData.size,
      });
    }
  }

  /**
   * Monitor system health and adjust thresholds
   */
  private monitorSystemHealth(): void {
    const stats = this.getStatistics();

    // Auto-deactivate emergency mode if traffic normalizes
    if (this.emergencyMode && stats.globalRequestsPerSecond < 1000) {
      this.deactivateEmergencyMode();
    }

    // Log health metrics
    logger.debug('DDoS protection health check', {
      activeConnections: stats.activeConnections,
      blockedIPs: stats.blockedIPs,
      emergencyMode: stats.emergencyMode,
      globalRPS: stats.globalRequestsPerSecond,
    });
  }
}
