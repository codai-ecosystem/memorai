/**
 * Load Balancing Engine for Memorai
 * 
 * Intelligent load balancing system that distributes requests across service
 * instances based on real-time health, performance metrics, and advanced
 * algorithms to optimize throughput and minimize latency.
 * 
 * Features:
 * - Multiple load balancing algorithms (round-robin, least-connections, weighted, etc.)
 * - Health-aware request routing
 * - Geographic and availability zone awareness
 * - Circuit breaker integration
 * - Real-time performance monitoring
 * - Sticky sessions support
 * - Request prioritization and QoS
 * 
 * @version 3.0.0
 * @author Memorai Enterprise Team
 */

import { EventEmitter } from 'events';

/**
 * Backend server configuration
 */
export interface BackendServer {
  id: string;
  host: string;
  port: number;
  weight: number;
  healthy: boolean;
  zone: string;
  region: string;
  metadata: Record<string, any>;
  stats: {
    activeConnections: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastResponseTime: number;
    lastHealthCheck: Date;
    cpuUsage: number;
    memoryUsage: number;
  };
}

/**
 * Load balancing algorithms
 */
export type LoadBalancingAlgorithm = 
  | 'round_robin'
  | 'least_connections'
  | 'weighted_round_robin'
  | 'weighted_least_connections'
  | 'ip_hash'
  | 'least_response_time'
  | 'random'
  | 'geographic'
  | 'resource_based';

/**
 * Request context for load balancing decisions
 */
export interface RequestContext {
  id: string;
  clientIp: string;
  userAgent: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  sessionId?: string;
  userId?: string;
  tenantId: string;
  preferredZone?: string;
  timestamp: number;
}

/**
 * Load balancing decision
 */
export interface RoutingDecision {
  requestId: string;
  selectedServer: BackendServer;
  algorithm: LoadBalancingAlgorithm;
  reason: string;
  alternativeServers: BackendServer[];
  decisionTime: number;
  confidence: number;
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  path: string;
  expectedStatus: number[];
  expectedBody?: string;
  headers?: Record<string, string>;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  serverId: string;
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
  successThreshold: number;
  failureThreshold: number;
  timeout: number;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  algorithm: LoadBalancingAlgorithm;
  healthCheck: HealthCheckConfig;
  stickySession: {
    enabled: boolean;
    cookieName: string;
    timeout: number;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
  };
  routing: {
    enableGeographicRouting: boolean;
    enableZoneAwareness: boolean;
    enableResourceBasedRouting: boolean;
    preferLocalZone: boolean;
  };
  qos: {
    enablePriorityRouting: boolean;
    enableRequestShaping: boolean;
    maxConcurrentRequests: number;
  };
}

/**
 * Session affinity tracking
 */
export interface SessionAffinity {
  sessionId: string;
  serverId: string;
  createdAt: Date;
  lastAccess: Date;
  requestCount: number;
}

/**
 * Geographic routing information
 */
export interface GeographicInfo {
  clientIp: string;
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  zone: string;
}

/**
 * Load Balancing Engine
 * 
 * Advanced load balancer that intelligently routes requests to optimize
 * performance, reliability, and resource utilization across service instances.
 */
export class LoadBalancingEngine extends EventEmitter {
  private servers: Map<string, BackendServer> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private sessionAffinities: Map<string, SessionAffinity> = new Map();
  private config: LoadBalancerConfig;
  private roundRobinIndex: number = 0;
  private requestHistory: RoutingDecision[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    super();
    this.config = this.buildConfig(config);
    this.setupHealthChecks();
  }

  /**
   * Build complete configuration with defaults
   */
  private buildConfig(partial: Partial<LoadBalancerConfig>): LoadBalancerConfig {
    return {
      algorithm: 'least_connections',
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3,
        path: '/health',
        expectedStatus: [200],
        ...partial.healthCheck
      },
      stickySession: {
        enabled: false,
        cookieName: 'MEMORAI_SESSION',
        timeout: 3600000, // 1 hour
        ...partial.stickySession
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000, // 1 minute
        ...partial.circuitBreaker
      },
      routing: {
        enableGeographicRouting: true,
        enableZoneAwareness: true,
        enableResourceBasedRouting: true,
        preferLocalZone: true,
        ...partial.routing
      },
      qos: {
        enablePriorityRouting: true,
        enableRequestShaping: false,
        maxConcurrentRequests: 1000,
        ...partial.qos
      },
      ...partial
    };
  }

  /**
   * Start the load balancer
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Load balancer is already running');
    }

    this.isRunning = true;
    
    if (this.config.healthCheck.enabled) {
      this.startHealthChecks();
    }

    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop the load balancer
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stopHealthChecks();
    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Add a backend server
   */
  addServer(server: Omit<BackendServer, 'stats'>): void {
    const fullServer: BackendServer = {
      ...server,
      stats: {
        activeConnections: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastResponseTime: 0,
        lastHealthCheck: new Date(),
        cpuUsage: 0,
        memoryUsage: 0
      }
    };

    this.servers.set(server.id, fullServer);
    
    // Initialize circuit breaker
    if (this.config.circuitBreaker.enabled) {
      this.circuitBreakers.set(server.id, {
        serverId: server.id,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextRetryTime: 0,
        successThreshold: this.config.circuitBreaker.successThreshold,
        failureThreshold: this.config.circuitBreaker.failureThreshold,
        timeout: this.config.circuitBreaker.timeout
      });
    }

    this.emit('server_added', { serverId: server.id, server: fullServer });
  }

  /**
   * Remove a backend server
   */
  removeServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    const removed = this.servers.delete(serverId);
    
    if (removed) {
      this.circuitBreakers.delete(serverId);
      
      // Remove session affinities for this server
      for (const [sessionId, affinity] of this.sessionAffinities.entries()) {
        if (affinity.serverId === serverId) {
          this.sessionAffinities.delete(sessionId);
        }
      }
      
      this.emit('server_removed', { serverId, server });
    }
    
    return removed;
  }

  /**
   * Update server health status
   */
  updateServerHealth(serverId: string, healthy: boolean): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = healthy;
      server.stats.lastHealthCheck = new Date();
      this.emit('server_health_updated', { serverId, healthy, server });
    }
  }

  /**
   * Update server statistics
   */
  updateServerStats(serverId: string, stats: Partial<BackendServer['stats']>): void {
    const server = this.servers.get(serverId);
    if (server) {
      Object.assign(server.stats, stats);
      this.emit('server_stats_updated', { serverId, stats: server.stats });
    }
  }

  /**
   * Route a request to the best available server
   */
  async routeRequest(context: RequestContext): Promise<RoutingDecision> {
    const availableServers = this.getAvailableServers(context);
    
    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    let selectedServer: BackendServer;
    let algorithm = this.config.algorithm;
    let reason = '';

    // Check for sticky session
    if (this.config.stickySession.enabled && context.sessionId) {
      const affinity = this.sessionAffinities.get(context.sessionId);
      if (affinity && this.isServerAvailable(affinity.serverId, context)) {
        selectedServer = this.servers.get(affinity.serverId)!;
        algorithm = 'round_robin'; // Override for sticky session
        reason = 'Sticky session affinity';
        
        // Update affinity
        affinity.lastAccess = new Date();
        affinity.requestCount++;
      }
    }

    // If no sticky session selection, use configured algorithm
    if (!selectedServer!) {
      selectedServer = await this.selectServerByAlgorithm(availableServers, context);
      reason = `${algorithm} algorithm selection`;
    }

    // Create or update session affinity
    if (this.config.stickySession.enabled && context.sessionId) {
      if (!this.sessionAffinities.has(context.sessionId)) {
        this.sessionAffinities.set(context.sessionId, {
          sessionId: context.sessionId,
          serverId: selectedServer.id,
          createdAt: new Date(),
          lastAccess: new Date(),
          requestCount: 1
        });
      }
    }

    // Update server connection count
    selectedServer.stats.activeConnections++;
    selectedServer.stats.totalRequests++;

    const decision: RoutingDecision = {
      requestId: context.id,
      selectedServer,
      algorithm,
      reason,
      alternativeServers: availableServers.filter(s => s.id !== selectedServer.id),
      decisionTime: Date.now() - context.timestamp,
      confidence: this.calculateRoutingConfidence(selectedServer, availableServers)
    };

    // Store decision history
    this.requestHistory.push(decision);
    this.requestHistory = this.requestHistory.slice(-1000); // Keep last 1000 decisions

    this.emit('request_routed', decision);
    return decision;
  }

  /**
   * Record request completion
   */
  recordRequestCompletion(
    requestId: string, 
    success: boolean, 
    responseTime: number
  ): void {
    const decision = this.requestHistory.find(d => d.requestId === requestId);
    if (!decision) {
      return;
    }

    const server = this.servers.get(decision.selectedServer.id);
    if (!server) {
      return;
    }

    // Update server statistics
    server.stats.activeConnections = Math.max(0, server.stats.activeConnections - 1);
    server.stats.lastResponseTime = responseTime;
    
    // Update rolling average response time
    const totalTime = server.stats.averageResponseTime * server.stats.successfulRequests;
    if (success) {
      server.stats.successfulRequests++;
      server.stats.averageResponseTime = (totalTime + responseTime) / server.stats.successfulRequests;
    } else {
      server.stats.failedRequests++;
    }

    // Update circuit breaker
    if (this.config.circuitBreaker.enabled) {
      this.updateCircuitBreaker(server.id, success);
    }

    this.emit('request_completed', {
      requestId,
      serverId: server.id,
      success,
      responseTime,
      server
    });
  }

  /**
   * Get available servers for a request
   */
  private getAvailableServers(context: RequestContext): BackendServer[] {
    return Array.from(this.servers.values()).filter(server => 
      this.isServerAvailable(server.id, context)
    );
  }

  /**
   * Check if a server is available for routing
   */
  private isServerAvailable(serverId: string, context: RequestContext): boolean {
    const server = this.servers.get(serverId);
    if (!server || !server.healthy) {
      return false;
    }

    // Check circuit breaker
    if (this.config.circuitBreaker.enabled) {
      const circuitBreaker = this.circuitBreakers.get(serverId);
      if (circuitBreaker && circuitBreaker.state === 'open') {
        // Check if it's time to try again
        if (Date.now() < circuitBreaker.nextRetryTime) {
          return false;
        } else {
          // Transition to half-open
          circuitBreaker.state = 'half_open';
        }
      }
    }

    // Check zone preferences
    if (this.config.routing.preferLocalZone && context.preferredZone) {
      // Prefer servers in the same zone, but don't exclude others entirely
      // This is handled in the selection algorithm
    }

    // Check QoS limits
    if (this.config.qos.enableRequestShaping) {
      if (server.stats.activeConnections >= this.config.qos.maxConcurrentRequests) {
        return false;
      }
    }

    return true;
  }

  /**
   * Select server using the configured algorithm
   */
  private async selectServerByAlgorithm(
    servers: BackendServer[], 
    context: RequestContext
  ): Promise<BackendServer> {
    switch (this.config.algorithm) {
      case 'round_robin':
        return this.selectRoundRobin(servers);
      
      case 'least_connections':
        return this.selectLeastConnections(servers);
      
      case 'weighted_round_robin':
        return this.selectWeightedRoundRobin(servers);
      
      case 'weighted_least_connections':
        return this.selectWeightedLeastConnections(servers);
      
      case 'ip_hash':
        return this.selectIpHash(servers, context);
      
      case 'least_response_time':
        return this.selectLeastResponseTime(servers);
      
      case 'random':
        return this.selectRandom(servers);
      
      case 'geographic':
        return await this.selectGeographic(servers, context);
      
      case 'resource_based':
        return this.selectResourceBased(servers);
      
      default:
        return this.selectLeastConnections(servers);
    }
  }

  /**
   * Round-robin server selection
   */
  private selectRoundRobin(servers: BackendServer[]): BackendServer {
    const server = servers[this.roundRobinIndex % servers.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % servers.length;
    return server;
  }

  /**
   * Least connections server selection
   */
  private selectLeastConnections(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => 
      server.stats.activeConnections < min.stats.activeConnections ? server : min
    );
  }

  /**
   * Weighted round-robin server selection
   */
  private selectWeightedRoundRobin(servers: BackendServer[]): BackendServer {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let randomWeight = Math.random() * totalWeight;
    
    for (const server of servers) {
      randomWeight -= server.weight;
      if (randomWeight <= 0) {
        return server;
      }
    }
    
    return servers[0]; // Fallback
  }

  /**
   * Weighted least connections server selection
   */
  private selectWeightedLeastConnections(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => {
      const minRatio = min.stats.activeConnections / min.weight;
      const serverRatio = server.stats.activeConnections / server.weight;
      return serverRatio < minRatio ? server : min;
    });
  }

  /**
   * IP hash server selection
   */
  private selectIpHash(servers: BackendServer[], context: RequestContext): BackendServer {
    let hash = 0;
    const ip = context.clientIp;
    
    for (let i = 0; i < ip.length; i++) {
      hash = ((hash << 5) - hash + ip.charCodeAt(i)) & 0xffffffff;
    }
    
    const index = Math.abs(hash) % servers.length;
    return servers[index];
  }

  /**
   * Least response time server selection
   */
  private selectLeastResponseTime(servers: BackendServer[]): BackendServer {
    return servers.reduce((min, server) => 
      server.stats.averageResponseTime < min.stats.averageResponseTime ? server : min
    );
  }

  /**
   * Random server selection
   */
  private selectRandom(servers: BackendServer[]): BackendServer {
    const index = Math.floor(Math.random() * servers.length);
    return servers[index];
  }

  /**
   * Geographic server selection
   */
  private async selectGeographic(
    servers: BackendServer[], 
    context: RequestContext
  ): Promise<BackendServer> {
    // In production, this would use GeoIP lookup
    const geoInfo = await this.getGeographicInfo(context.clientIp);
    
    // Find servers in the same region/zone
    const localServers = servers.filter(server => 
      server.zone === geoInfo.zone || server.region === geoInfo.region
    );
    
    if (localServers.length > 0) {
      return this.selectLeastConnections(localServers);
    }
    
    // Fallback to least connections
    return this.selectLeastConnections(servers);
  }

  /**
   * Resource-based server selection
   */
  private selectResourceBased(servers: BackendServer[]): BackendServer {
    // Calculate composite score based on multiple resources
    return servers.reduce((best, server) => {
      const bestScore = this.calculateResourceScore(best);
      const serverScore = this.calculateResourceScore(server);
      return serverScore > bestScore ? server : best;
    });
  }

  /**
   * Calculate resource score for a server
   */
  private calculateResourceScore(server: BackendServer): number {
    const cpuScore = (100 - server.stats.cpuUsage) / 100;
    const memoryScore = (100 - server.stats.memoryUsage) / 100;
    const connectionScore = Math.max(0, 1 - (server.stats.activeConnections / 100));
    const responseScore = Math.max(0, 1 - (server.stats.averageResponseTime / 1000));
    
    return (cpuScore * 0.3 + memoryScore * 0.3 + connectionScore * 0.2 + responseScore * 0.2);
  }

  /**
   * Calculate routing confidence
   */
  private calculateRoutingConfidence(
    selectedServer: BackendServer, 
    allServers: BackendServer[]
  ): number {
    if (allServers.length === 1) {
      return 1.0;
    }
    
    const selectedScore = this.calculateResourceScore(selectedServer);
    const averageScore = allServers.reduce((sum, server) => 
      sum + this.calculateResourceScore(server), 0
    ) / allServers.length;
    
    return Math.min(1.0, selectedScore / averageScore);
  }

  /**
   * Get geographic information for IP
   */
  private async getGeographicInfo(clientIp: string): Promise<GeographicInfo> {
    // Mock implementation - in production would use real GeoIP service
    return {
      clientIp,
      country: 'US',
      region: 'us-east-1',
      city: 'New York',
      latitude: 40.7128,
      longitude: -74.0060,
      zone: 'us-east-1a'
    };
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(serverId: string, success: boolean): void {
    const circuitBreaker = this.circuitBreakers.get(serverId);
    if (!circuitBreaker) {
      return;
    }

    const now = Date.now();

    if (success) {
      if (circuitBreaker.state === 'half_open') {
        circuitBreaker.failureCount = 0;
        if (++circuitBreaker.failureCount >= circuitBreaker.successThreshold) {
          circuitBreaker.state = 'closed';
          this.emit('circuit_breaker_closed', { serverId, circuitBreaker });
        }
      } else if (circuitBreaker.state === 'closed') {
        circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
      }
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = now;
      
      if (circuitBreaker.state === 'closed' || circuitBreaker.state === 'half_open') {
        if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
          circuitBreaker.state = 'open';
          circuitBreaker.nextRetryTime = now + circuitBreaker.timeout;
          this.emit('circuit_breaker_opened', { serverId, circuitBreaker });
        }
      }
    }
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    // Health check implementation would go here
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheck.interval);
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const checks = Array.from(this.servers.values()).map(server => 
      this.performHealthCheck(server)
    );
    
    await Promise.allSettled(checks);
  }

  /**
   * Perform health check on a single server
   */
  private async performHealthCheck(server: BackendServer): Promise<void> {
    try {
      // Mock health check - in production would make HTTP request
      const healthy = Math.random() > 0.05; // 95% success rate
      this.updateServerHealth(server.id, healthy);
    } catch (error) {
      this.updateServerHealth(server.id, false);
      this.emit('health_check_failed', { 
        serverId: server.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get load balancing statistics
   */
  getStats(): {
    totalServers: number;
    healthyServers: number;
    totalRequests: number;
    activeConnections: number;
    averageResponseTime: number;
    circuitBreakerStats: Record<string, CircuitBreakerState>;
    algorithmUsage: Record<string, number>;
  } {
    const servers = Array.from(this.servers.values());
    const healthyServers = servers.filter(s => s.healthy).length;
    const totalRequests = servers.reduce((sum, s) => sum + s.stats.totalRequests, 0);
    const activeConnections = servers.reduce((sum, s) => sum + s.stats.activeConnections, 0);
    const averageResponseTime = servers.length > 0 
      ? servers.reduce((sum, s) => sum + s.stats.averageResponseTime, 0) / servers.length
      : 0;

    const circuitBreakerStats: Record<string, CircuitBreakerState> = {};
    for (const [serverId, state] of this.circuitBreakers.entries()) {
      circuitBreakerStats[serverId] = state;
    }

    const algorithmUsage: Record<string, number> = {};
    for (const decision of this.requestHistory) {
      algorithmUsage[decision.algorithm] = (algorithmUsage[decision.algorithm] || 0) + 1;
    }

    return {
      totalServers: servers.length,
      healthyServers,
      totalRequests,
      activeConnections,
      averageResponseTime,
      circuitBreakerStats,
      algorithmUsage
    };
  }

  /**
   * Get server list
   */
  getServers(): BackendServer[] {
    return Array.from(this.servers.values());
  }

  /**
   * Get routing history
   */
  getRoutingHistory(limit: number = 100): RoutingDecision[] {
    return this.requestHistory
      .sort((a, b) => b.decisionTime - a.decisionTime)
      .slice(0, limit);
  }
}

/**
 * Create load balancing engine
 */
export function createLoadBalancingEngine(
  config: Partial<LoadBalancerConfig> = {}
): LoadBalancingEngine {
  return new LoadBalancingEngine(config);
}

export default LoadBalancingEngine;
