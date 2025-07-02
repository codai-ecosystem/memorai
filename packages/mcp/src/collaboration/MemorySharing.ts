/**
 * MCP v3.0 - Memory Sharing System
 * Distributed memory access and sharing across multiple agents
 */

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SharedMemory extends Memory {
  ownerId: string;
  shareId: string;
  permissions: MemoryPermissions;
  accessHistory: AccessRecord[];
  syncStatus: 'pending' | 'synced' | 'conflict' | 'outdated';
  version: number;
  checksum: string;
  replicas: MemoryReplica[];
}

export interface MemoryPermissions {
  read: string[]; // Agent IDs with read access
  write: string[]; // Agent IDs with write access
  delete: string[]; // Agent IDs with delete access
  share: string[]; // Agent IDs that can share this memory
  public: boolean; // Whether memory is publicly readable
  expiry?: number; // Optional expiry timestamp
}

export interface AccessRecord {
  agentId: string;
  action: 'read' | 'write' | 'delete' | 'share' | 'copy';
  timestamp: number;
  success: boolean;
  details?: Record<string, any>;
}

export interface MemoryReplica {
  agentId: string;
  version: number;
  timestamp: number;
  status: 'active' | 'stale' | 'corrupted' | 'unreachable';
  checksum: string;
  location: string;
}

export interface SharingPolicy {
  defaultPermissions: MemoryPermissions;
  maxReplicas: number;
  replicationStrategy: 'immediate' | 'lazy' | 'on_demand' | 'smart';
  consistencyLevel: 'eventual' | 'strong' | 'weak';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  accessLogging: boolean;
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
}

export interface SharingMetrics {
  totalSharedMemories: number;
  totalReplicas: number;
  averageReplicationFactor: number;
  syncSuccessRate: number;
  accessRequestsPerSecond: number;
  storageUtilization: number;
  networkBandwidthUsage: number;
  cacheHitRate: number;
}

export interface MemoryQuery {
  agentIds?: string[];
  types?: string[];
  tags?: string[];
  timeRange?: {
    start?: number;
    end?: number;
  };
  permissions?: {
    requireRead?: boolean;
    requireWrite?: boolean;
  };
  content?: {
    search?: string;
    similarity?: number;
  };
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'relevance' | 'access_count' | 'version';
  sortOrder?: 'asc' | 'desc';
}

export interface SharingRequest {
  id: string;
  memoryId: string;
  requesterId: string;
  targetAgentIds: string[];
  permissions: Partial<MemoryPermissions>;
  message?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  createdAt: number;
  respondedAt?: number;
  responses: SharingResponse[];
}

export interface SharingResponse {
  agentId: string;
  approved: boolean;
  permissions?: Partial<MemoryPermissions>;
  message?: string;
  timestamp: number;
}

export class MemorySharing {
  private sharedMemories: Map<string, SharedMemory> = new Map();
  private sharingRequests: Map<string, SharingRequest> = new Map();
  private accessCache: Map<
    string,
    { data: any; timestamp: number; ttl: number }
  > = new Map();
  private metrics: SharingMetrics = {
    totalSharedMemories: 0,
    totalReplicas: 0,
    averageReplicationFactor: 0,
    syncSuccessRate: 1.0,
    accessRequestsPerSecond: 0,
    storageUtilization: 0,
    networkBandwidthUsage: 0,
    cacheHitRate: 0,
  };

  private cleanupInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private localAgentId: string,
    private sharingPolicy: SharingPolicy = {
      defaultPermissions: {
        read: [],
        write: [],
        delete: [],
        share: [],
        public: false,
      },
      maxReplicas: 5,
      replicationStrategy: 'smart',
      consistencyLevel: 'eventual',
      compressionEnabled: true,
      encryptionEnabled: true,
      accessLogging: true,
      autoCleanup: true,
      cleanupInterval: 300000, // 5 minutes
    }
  ) {
    this.startCleanupProcess();
    this.startMetricsCollection();
  }

  /**
   * Share a memory with other agents
   */
  async shareMemory(
    memory: Memory,
    targetAgentIds: string[],
    permissions: Partial<MemoryPermissions> = {}
  ): Promise<string> {
    const shareId = this.generateShareId();

    const fullPermissions: MemoryPermissions = {
      ...this.sharingPolicy.defaultPermissions,
      ...permissions,
      read: [...(permissions.read || []), ...targetAgentIds],
      write: permissions.write || [],
      delete: permissions.delete || [],
      share: permissions.share || [],
    };

    const sharedMemory: SharedMemory = {
      ...memory,
      ownerId: this.localAgentId,
      shareId,
      permissions: fullPermissions,
      accessHistory: [
        {
          agentId: this.localAgentId,
          action: 'share',
          timestamp: Date.now(),
          success: true,
          details: { targetAgents: targetAgentIds },
        },
      ],
      syncStatus: 'pending',
      version: 1,
      checksum: this.calculateChecksum(memory),
      replicas: [],
    };

    this.sharedMemories.set(shareId, sharedMemory);

    // Create replicas based on replication strategy
    await this.createReplicas(sharedMemory, targetAgentIds);

    // Log sharing event
    await this.logAccess(sharedMemory, 'share', this.localAgentId, true);

    this.updateMetrics();

    console.log(
      `Memory shared: ${memory.id} -> ${shareId} with agents: ${targetAgentIds.join(', ')}`
    );
    return shareId;
  }

  /**
   * Request access to a shared memory
   */
  async requestMemoryAccess(
    shareId: string,
    requestedPermissions: Partial<MemoryPermissions>,
    message?: string
  ): Promise<string> {
    const requestId = this.generateRequestId();

    const sharedMemory = this.sharedMemories.get(shareId);
    if (!sharedMemory) {
      throw new Error(`Shared memory not found: ${shareId}`);
    }

    const request: SharingRequest = {
      id: requestId,
      memoryId: shareId,
      requesterId: this.localAgentId,
      targetAgentIds: [sharedMemory.ownerId],
      permissions: requestedPermissions,
      message,
      status: 'pending',
      createdAt: Date.now(),
      responses: [],
    };

    this.sharingRequests.set(requestId, request);

    // Send request to memory owner
    await this.sendSharingRequest(request);

    console.log(`Memory access requested: ${shareId} by ${this.localAgentId}`);
    return requestId;
  }

  /**
   * Respond to a sharing request
   */
  async respondToSharingRequest(
    requestId: string,
    approved: boolean,
    permissions?: Partial<MemoryPermissions>,
    message?: string
  ): Promise<void> {
    const request = this.sharingRequests.get(requestId);
    if (!request) {
      throw new Error(`Sharing request not found: ${requestId}`);
    }

    const response: SharingResponse = {
      agentId: this.localAgentId,
      approved,
      permissions,
      message,
      timestamp: Date.now(),
    };

    request.responses.push(response);

    if (approved) {
      request.status = 'approved';

      // Update memory permissions
      const sharedMemory = this.sharedMemories.get(request.memoryId);
      if (sharedMemory) {
        await this.updateMemoryPermissions(
          sharedMemory,
          request.requesterId,
          permissions || {}
        );
      }
    } else {
      request.status = 'denied';
    }

    request.respondedAt = Date.now();

    // Notify requester
    await this.notifySharingResponse(request, response);

    console.log(
      `Sharing request ${approved ? 'approved' : 'denied'}: ${requestId}`
    );
  }

  /**
   * Access a shared memory
   */
  async accessSharedMemory(
    shareId: string,
    action: 'read' | 'write' | 'delete' = 'read'
  ): Promise<SharedMemory | null> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.accessCache.get(`${shareId}_${action}`);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.metrics.cacheHitRate = this.metrics.cacheHitRate * 0.9 + 0.1;
      await this.logAccess(cached.data, action, this.localAgentId, true, {
        cacheHit: true,
      });
      return cached.data;
    }

    const sharedMemory = this.sharedMemories.get(shareId);
    if (!sharedMemory) {
      await this.logAccess(null, action, this.localAgentId, false, {
        reason: 'not_found',
      });
      return null;
    }

    // Check permissions
    if (!this.hasPermission(sharedMemory, this.localAgentId, action)) {
      await this.logAccess(sharedMemory, action, this.localAgentId, false, {
        reason: 'permission_denied',
      });
      throw new Error(`Permission denied for ${action} on ${shareId}`);
    }

    // Update cache
    this.accessCache.set(`${shareId}_${action}`, {
      data: sharedMemory,
      timestamp: Date.now(),
      ttl: 60000, // 1 minute TTL
    });

    // Update metrics
    this.metrics.cacheHitRate = this.metrics.cacheHitRate * 0.9;
    this.updateAccessMetrics();

    await this.logAccess(sharedMemory, action, this.localAgentId, true, {
      responseTime: Date.now() - startTime,
    });

    return sharedMemory;
  }

  /**
   * Update a shared memory
   */
  async updateSharedMemory(
    shareId: string,
    updates: Partial<Memory>
  ): Promise<void> {
    const sharedMemory = this.sharedMemories.get(shareId);
    if (!sharedMemory) {
      throw new Error(`Shared memory not found: ${shareId}`);
    }

    // Check write permissions
    if (!this.hasPermission(sharedMemory, this.localAgentId, 'write')) {
      throw new Error(`Write permission denied for ${shareId}`);
    }

    // Create new version
    const updatedMemory: SharedMemory = {
      ...sharedMemory,
      ...updates,
      version: sharedMemory.version + 1,
      timestamp: Date.now(),
      syncStatus: 'pending',
    };

    updatedMemory.checksum = this.calculateChecksum(updatedMemory);
    this.sharedMemories.set(shareId, updatedMemory);

    // Propagate changes to replicas
    await this.propagateUpdate(updatedMemory);

    // Invalidate cache
    this.invalidateCache(shareId);

    await this.logAccess(updatedMemory, 'write', this.localAgentId, true);

    console.log(
      `Shared memory updated: ${shareId} to version ${updatedMemory.version}`
    );
  }

  /**
   * Delete a shared memory
   */
  async deleteSharedMemory(shareId: string): Promise<void> {
    const sharedMemory = this.sharedMemories.get(shareId);
    if (!sharedMemory) {
      throw new Error(`Shared memory not found: ${shareId}`);
    }

    // Check delete permissions
    if (!this.hasPermission(sharedMemory, this.localAgentId, 'delete')) {
      throw new Error(`Delete permission denied for ${shareId}`);
    }

    // Remove from all replicas
    await this.removeFromReplicas(sharedMemory);

    // Remove locally
    this.sharedMemories.delete(shareId);

    // Invalidate cache
    this.invalidateCache(shareId);

    await this.logAccess(sharedMemory, 'delete', this.localAgentId, true);

    this.updateMetrics();

    console.log(`Shared memory deleted: ${shareId}`);
  }

  /**
   * Query shared memories
   */
  async querySharedMemories(query: MemoryQuery): Promise<SharedMemory[]> {
    let results = Array.from(this.sharedMemories.values());

    // Apply agent filter
    if (query.agentIds && query.agentIds.length > 0) {
      results = results.filter(
        memory =>
          query.agentIds!.includes(memory.ownerId) ||
          memory.replicas.some(replica =>
            query.agentIds!.includes(replica.agentId)
          )
      );
    }

    // Apply type filter
    if (query.types && query.types.length > 0) {
      results = results.filter(memory => query.types!.includes(memory.type));
    }

    // Apply time range filter
    if (query.timeRange) {
      results = results.filter(memory => {
        const timestamp = memory.timestamp;
        return (
          (!query.timeRange!.start || timestamp >= query.timeRange!.start) &&
          (!query.timeRange!.end || timestamp <= query.timeRange!.end)
        );
      });
    }

    // Apply permission filter
    if (query.permissions) {
      results = results.filter(memory => {
        if (
          query.permissions!.requireRead &&
          !this.hasPermission(memory, this.localAgentId, 'read')
        ) {
          return false;
        }
        if (
          query.permissions!.requireWrite &&
          !this.hasPermission(memory, this.localAgentId, 'write')
        ) {
          return false;
        }
        return true;
      });
    }

    // Apply content search
    if (query.content?.search) {
      const searchTerm = query.content.search.toLowerCase();
      results = results.filter(
        memory =>
          memory.content.toLowerCase().includes(searchTerm) ||
          (memory.metadata &&
            JSON.stringify(memory.metadata).toLowerCase().includes(searchTerm))
      );
    }

    // Apply metadata filter
    if (query.metadata) {
      results = results.filter(memory => {
        if (!memory.metadata) return false;

        return Object.entries(query.metadata!).every(([key, value]) => {
          return memory.metadata![key] === value;
        });
      });
    }

    // Apply tags filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(memory => {
        const memoryTags = memory.metadata?.tags || [];
        return query.tags!.some(tag => memoryTags.includes(tag));
      });
    }

    // Sort results
    if (query.sortBy) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (query.sortBy) {
          case 'timestamp':
            aValue = a.timestamp;
            bValue = b.timestamp;
            break;
          case 'relevance':
            // Simplified relevance scoring
            aValue = this.calculateRelevanceScore(a, query);
            bValue = this.calculateRelevanceScore(b, query);
            break;
          case 'access_count':
            aValue = a.accessHistory.length;
            bValue = b.accessHistory.length;
            break;
          case 'version':
            aValue = a.version;
            bValue = b.version;
            break;
          default:
            return 0;
        }

        const order = query.sortOrder === 'desc' ? -1 : 1;
        return aValue < bValue ? -order : aValue > bValue ? order : 0;
      });
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || results.length;
    results = results.slice(offset, offset + limit);

    // Log access for each result
    for (const memory of results) {
      await this.logAccess(memory, 'read', this.localAgentId, true, {
        queryAccess: true,
      });
    }

    return results;
  }

  /**
   * Get sharing statistics
   */
  getSharingStats(): {
    totalShared: number;
    ownedMemories: number;
    accessibleMemories: number;
    recentAccess: AccessRecord[];
    topSharedMemories: Array<{
      shareId: string;
      accessCount: number;
      lastAccess: number;
    }>;
    metrics: SharingMetrics;
  } {
    const ownedMemories = Array.from(this.sharedMemories.values()).filter(
      memory => memory.ownerId === this.localAgentId
    ).length;

    const accessibleMemories = Array.from(this.sharedMemories.values()).filter(
      memory => this.hasPermission(memory, this.localAgentId, 'read')
    ).length;

    const recentAccess = Array.from(this.sharedMemories.values())
      .flatMap(memory => memory.accessHistory)
      .filter(access => Date.now() - access.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    const topSharedMemories = Array.from(this.sharedMemories.values())
      .map(memory => ({
        shareId: memory.shareId,
        accessCount: memory.accessHistory.length,
        lastAccess: Math.max(...memory.accessHistory.map(a => a.timestamp)),
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      totalShared: this.sharedMemories.size,
      ownedMemories,
      accessibleMemories,
      recentAccess,
      topSharedMemories,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Export sharing data
   */
  exportSharingData(): {
    sharedMemories: SharedMemory[];
    sharingRequests: SharingRequest[];
    metrics: SharingMetrics;
    policy: SharingPolicy;
  } {
    return {
      sharedMemories: Array.from(this.sharedMemories.values()),
      sharingRequests: Array.from(this.sharingRequests.values()),
      metrics: { ...this.metrics },
      policy: { ...this.sharingPolicy },
    };
  }

  /**
   * Import sharing data
   */
  importSharingData(data: {
    sharedMemories?: SharedMemory[];
    sharingRequests?: SharingRequest[];
    policy?: Partial<SharingPolicy>;
  }): void {
    if (data.sharedMemories) {
      this.sharedMemories.clear();
      for (const memory of data.sharedMemories) {
        this.sharedMemories.set(memory.shareId, memory);
      }
    }

    if (data.sharingRequests) {
      this.sharingRequests.clear();
      for (const request of data.sharingRequests) {
        this.sharingRequests.set(request.id, request);
      }
    }

    if (data.policy) {
      this.sharingPolicy = { ...this.sharingPolicy, ...data.policy };
    }

    this.updateMetrics();
  }

  /**
   * Private methods
   */

  private async createReplicas(
    sharedMemory: SharedMemory,
    targetAgentIds: string[]
  ): Promise<void> {
    const maxReplicas = Math.min(
      targetAgentIds.length,
      this.sharingPolicy.maxReplicas
    );

    for (let i = 0; i < maxReplicas; i++) {
      const agentId = targetAgentIds[i];
      const replica: MemoryReplica = {
        agentId,
        version: sharedMemory.version,
        timestamp: Date.now(),
        status: 'active',
        checksum: sharedMemory.checksum,
        location: `agent://${agentId}`,
      };

      sharedMemory.replicas.push(replica);

      // Send memory to replica (simulated)
      await this.sendToReplica(sharedMemory, replica);
    }

    sharedMemory.syncStatus = 'synced';
  }

  private async propagateUpdate(sharedMemory: SharedMemory): Promise<void> {
    const promises = sharedMemory.replicas.map(async replica => {
      try {
        await this.sendToReplica(sharedMemory, replica);
        replica.version = sharedMemory.version;
        replica.timestamp = Date.now();
        replica.checksum = sharedMemory.checksum;
        replica.status = 'active';
      } catch (error) {
        replica.status = 'unreachable';
        console.error(`Failed to update replica ${replica.agentId}:`, error);
      }
    });

    await Promise.allSettled(promises);

    const activeReplicas = sharedMemory.replicas.filter(
      r => r.status === 'active'
    ).length;
    const totalReplicas = sharedMemory.replicas.length;

    sharedMemory.syncStatus =
      activeReplicas === totalReplicas ? 'synced' : 'conflict';
  }

  private async removeFromReplicas(sharedMemory: SharedMemory): Promise<void> {
    const promises = sharedMemory.replicas.map(async replica => {
      try {
        await this.removeFromReplica(sharedMemory, replica);
      } catch (error) {
        console.error(
          `Failed to remove from replica ${replica.agentId}:`,
          error
        );
      }
    });

    await Promise.allSettled(promises);
  }

  private hasPermission(
    memory: SharedMemory,
    agentId: string,
    action: 'read' | 'write' | 'delete' | 'share'
  ): boolean {
    // Owner has all permissions
    if (memory.ownerId === agentId) {
      return true;
    }

    // Check public read access
    if (action === 'read' && memory.permissions.public) {
      return true;
    }

    // Check specific permissions
    const permissionList = memory.permissions[action];
    return Array.isArray(permissionList) && permissionList.includes(agentId);
  }

  private async updateMemoryPermissions(
    sharedMemory: SharedMemory,
    agentId: string,
    permissions: Partial<MemoryPermissions>
  ): Promise<void> {
    const updatedPermissions = { ...sharedMemory.permissions };

    // Add agent to specified permission lists
    Object.entries(permissions).forEach(([key, value]) => {
      if (
        Array.isArray(value) &&
        !updatedPermissions[key as keyof MemoryPermissions]
      ) {
        (updatedPermissions as any)[key] = [];
      }

      if (Array.isArray(value)) {
        const currentList = (updatedPermissions as any)[key] as string[];
        if (!currentList.includes(agentId)) {
          currentList.push(agentId);
        }
      } else if (typeof value === 'boolean') {
        (updatedPermissions as any)[key] = value;
      }
    });

    sharedMemory.permissions = updatedPermissions;
    sharedMemory.version++;
    sharedMemory.syncStatus = 'pending';

    // Propagate permission changes
    await this.propagateUpdate(sharedMemory);
  }

  private async logAccess(
    memory: SharedMemory | null,
    action: AccessRecord['action'],
    agentId: string,
    success: boolean,
    details?: Record<string, any>
  ): Promise<void> {
    if (!this.sharingPolicy.accessLogging) return;

    const accessRecord: AccessRecord = {
      agentId,
      action,
      timestamp: Date.now(),
      success,
      details,
    };

    if (memory) {
      memory.accessHistory.push(accessRecord);

      // Limit access history size
      if (memory.accessHistory.length > 1000) {
        memory.accessHistory = memory.accessHistory.slice(-500); // Keep last 500 records
      }
    }

    // Could also log to external system
    console.log(
      `Access logged: ${agentId} ${action} ${memory?.shareId || 'unknown'} - ${success ? 'success' : 'failed'}`
    );
  }

  private calculateRelevanceScore(
    memory: SharedMemory,
    query: MemoryQuery
  ): number {
    let score = 0;

    // Content relevance
    if (query.content?.search) {
      const searchTerm = query.content.search.toLowerCase();
      const content = memory.content.toLowerCase();
      const matches = (content.match(new RegExp(searchTerm, 'g')) || []).length;
      score += matches * 10;
    }

    // Recency bonus
    const age = Date.now() - memory.timestamp;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    score += Math.max(0, (maxAge - age) / maxAge) * 5;

    // Access frequency bonus
    score += memory.accessHistory.length * 0.1;

    // Version bonus (newer versions)
    score += memory.version * 0.5;

    return score;
  }

  private calculateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private invalidateCache(shareId: string): void {
    // Remove all cached entries for this share
    for (const key of this.accessCache.keys()) {
      if (key.startsWith(shareId)) {
        this.accessCache.delete(key);
      }
    }
  }

  private updateMetrics(): void {
    this.metrics.totalSharedMemories = this.sharedMemories.size;
    this.metrics.totalReplicas = Array.from(
      this.sharedMemories.values()
    ).reduce((total, memory) => total + memory.replicas.length, 0);

    this.metrics.averageReplicationFactor =
      this.metrics.totalSharedMemories > 0
        ? this.metrics.totalReplicas / this.metrics.totalSharedMemories
        : 0;

    // Calculate storage utilization (simplified)
    const totalMemorySize = Array.from(this.sharedMemories.values()).reduce(
      (total, memory) => total + memory.content.length,
      0
    );
    this.metrics.storageUtilization = totalMemorySize;

    // Update sync success rate
    const allMemories = Array.from(this.sharedMemories.values());
    const syncedMemories = allMemories.filter(
      m => m.syncStatus === 'synced'
    ).length;
    this.metrics.syncSuccessRate =
      allMemories.length > 0 ? syncedMemories / allMemories.length : 1.0;
  }

  private updateAccessMetrics(): void {
    this.metrics.accessRequestsPerSecond =
      this.metrics.accessRequestsPerSecond * 0.9 + 0.1;
  }

  private startCleanupProcess(): void {
    if (this.sharingPolicy.autoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, this.sharingPolicy.cleanupInterval);
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 60000); // Update metrics every minute
  }

  private performCleanup(): void {
    const now = Date.now();

    // Clean up expired sharing requests
    for (const [requestId, request] of this.sharingRequests) {
      const age = now - request.createdAt;
      if (age > 24 * 60 * 60 * 1000) {
        // 24 hours
        request.status = 'expired';
      }
    }

    // Clean up old cache entries
    for (const [key, cached] of this.accessCache) {
      if (now - cached.timestamp > cached.ttl) {
        this.accessCache.delete(key);
      }
    }

    // Clean up expired memories
    for (const [shareId, memory] of this.sharedMemories) {
      if (memory.permissions.expiry && now > memory.permissions.expiry) {
        this.sharedMemories.delete(shareId);
        console.log(`Expired memory cleaned up: ${shareId}`);
      }
    }

    console.log('Memory sharing cleanup completed');
  }

  // Mock network operations (would be implemented with actual network calls)
  private async sendToReplica(
    memory: SharedMemory,
    replica: MemoryReplica
  ): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));

    // Simulate potential network failures
    if (Math.random() < 0.05) {
      // 5% failure rate
      throw new Error(`Network error sending to ${replica.agentId}`);
    }
  }

  private async removeFromReplica(
    memory: SharedMemory,
    replica: MemoryReplica
  ): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
  }

  private async sendSharingRequest(request: SharingRequest): Promise<void> {
    // Simulate sending request
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    console.log(`Sharing request sent: ${request.id}`);
  }

  private async notifySharingResponse(
    request: SharingRequest,
    response: SharingResponse
  ): Promise<void> {
    // Simulate sending notification
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 25));
    console.log(`Sharing response sent: ${request.id} -> ${response.agentId}`);
  }

  // Utility methods
  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Public API methods
   */

  /**
   * Update sharing policy
   */
  updateSharingPolicy(policy: Partial<SharingPolicy>): void {
    this.sharingPolicy = { ...this.sharingPolicy, ...policy };

    // Restart cleanup if interval changed
    if (policy.cleanupInterval && this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.startCleanupProcess();
    }
  }

  /**
   * Get sharing policy
   */
  getSharingPolicy(): SharingPolicy {
    return { ...this.sharingPolicy };
  }

  /**
   * Get shared memory by ID
   */
  getSharedMemory(shareId: string): SharedMemory | undefined {
    return this.sharedMemories.get(shareId);
  }

  /**
   * Get sharing requests
   */
  getSharingRequests(status?: SharingRequest['status']): SharingRequest[] {
    const requests = Array.from(this.sharingRequests.values());
    return status ? requests.filter(req => req.status === status) : requests;
  }

  /**
   * Get memory replicas status
   */
  getReplicasStatus(): Array<{
    shareId: string;
    totalReplicas: number;
    activeReplicas: number;
    status: string;
  }> {
    return Array.from(this.sharedMemories.values()).map(memory => ({
      shareId: memory.shareId,
      totalReplicas: memory.replicas.length,
      activeReplicas: memory.replicas.filter(r => r.status === 'active').length,
      status: memory.syncStatus,
    }));
  }

  /**
   * Force sync all memories
   */
  async forceSyncAll(): Promise<void> {
    console.log('Starting force sync of all shared memories...');

    const promises = Array.from(this.sharedMemories.values()).map(
      async memory => {
        try {
          await this.propagateUpdate(memory);
        } catch (error) {
          console.error(`Failed to sync memory ${memory.shareId}:`, error);
        }
      }
    );

    await Promise.allSettled(promises);
    this.updateMetrics();

    console.log('Force sync completed');
  }

  /**
   * Shutdown sharing system
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.accessCache.clear();

    console.log('Memory sharing system shutdown');
  }
}

export default MemorySharing;
