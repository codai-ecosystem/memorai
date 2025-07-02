/**
 * MCP v3.0 - Agent Synchronization System
 * Real-time agent coordination and state synchronization for multi-agent environments
 */

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  type: 'memory' | 'processing' | 'analysis' | 'coordination' | 'custom';
  capabilities: string[];
  status: 'online' | 'offline' | 'busy' | 'error' | 'maintenance';
  lastSeen: number;
  metadata: Record<string, any>;
}

export interface AgentState {
  agentId: string;
  state: Record<string, any>;
  version: number;
  timestamp: number;
  checksum: string;
}

export interface SyncOperation {
  id: string;
  type: 'memory_sync' | 'state_sync' | 'capability_sync' | 'configuration_sync';
  sourceAgentId: string;
  targetAgentIds: string[];
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ConflictResolution {
  conflictId: string;
  type:
    | 'data_conflict'
    | 'state_conflict'
    | 'capability_conflict'
    | 'resource_conflict';
  involvedAgents: string[];
  conflictData: any;
  resolutionStrategy: 'merge' | 'priority' | 'vote' | 'manual' | 'latest_wins';
  resolution?: any;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface SyncMetrics {
  totalOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  conflictsResolved: number;
  networkLatency: number;
  dataIntegrity: number; // 0-1 scale
}

export interface SyncPolicy {
  frequency: number; // milliseconds
  batchSize: number;
  conflictResolution: ConflictResolution['resolutionStrategy'];
  retryCount: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  priorityThresholds: Record<string, number>;
}

export class AgentSync {
  private agents: Map<string, Agent> = new Map();
  private agentStates: Map<string, AgentState> = new Map();
  private syncOperations: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, ConflictResolution> = new Map();
  private syncQueue: SyncOperation[] = [];
  private metrics: SyncMetrics = {
    totalOperations: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    conflictsResolved: 0,
    networkLatency: 0,
    dataIntegrity: 1.0,
  };

  private isProcessing = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor(
    private syncPolicy: SyncPolicy = {
      frequency: 5000, // 5 seconds
      batchSize: 10,
      conflictResolution: 'merge',
      retryCount: 3,
      compressionEnabled: true,
      encryptionEnabled: true,
      priorityThresholds: {
        low: 60000, // 1 minute
        medium: 30000, // 30 seconds
        high: 10000, // 10 seconds
        critical: 1000, // 1 second
      },
    },
    private localAgentId: string = 'memorai-agent'
  ) {
    this.startSyncProcess();
    this.registerLocalAgent();
  }

  /**
   * Register a new agent in the system
   */
  async registerAgent(agent: Omit<Agent, 'lastSeen'>): Promise<void> {
    const fullAgent: Agent = {
      ...agent,
      lastSeen: Date.now(),
    };

    this.agents.set(agent.id, fullAgent);

    // Initialize agent state
    await this.initializeAgentState(agent.id);

    // Notify other agents of new registration
    await this.broadcastAgentRegistration(fullAgent);

    console.log(`Agent registered: ${agent.id} (${agent.name})`);
  }

  /**
   * Unregister an agent from the system
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Cleanup agent data
      this.agents.delete(agentId);
      this.agentStates.delete(agentId);

      // Cancel pending operations
      this.cancelAgentOperations(agentId);

      // Notify other agents
      await this.broadcastAgentUnregistration(agentId);

      console.log(`Agent unregistered: ${agentId}`);
    }
  }

  /**
   * Update agent status
   */
  async updateAgentStatus(
    agentId: string,
    status: Agent['status'],
    metadata?: Record<string, any>
  ): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = Date.now();

      if (metadata) {
        agent.metadata = { ...agent.metadata, ...metadata };
      }

      // Sync agent status to other agents
      await this.syncAgentStatus(agent);
    }
  }

  /**
   * Sync memory data between agents
   */
  async syncMemory(
    memories: Memory[],
    targetAgentIds?: string[]
  ): Promise<string> {
    const operationId = this.generateOperationId();
    const targets = targetAgentIds || this.getActiveAgentIds();

    const operation: SyncOperation = {
      id: operationId,
      type: 'memory_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: targets,
      data: {
        memories: await this.prepareMemoriesForSync(memories),
        timestamp: Date.now(),
      },
      priority: 'medium',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
    return operationId;
  }

  /**
   * Sync agent state across the network
   */
  async syncAgentState(
    agentId: string,
    state: Record<string, any>
  ): Promise<string> {
    const operationId = this.generateOperationId();
    const currentState = this.agentStates.get(agentId);

    const newState: AgentState = {
      agentId,
      state,
      version: (currentState?.version || 0) + 1,
      timestamp: Date.now(),
      checksum: this.calculateChecksum(state),
    };

    this.agentStates.set(agentId, newState);

    const operation: SyncOperation = {
      id: operationId,
      type: 'state_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: this.getActiveAgentIds(),
      data: newState,
      priority: 'high',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
    return operationId;
  }

  /**
   * Broadcast capability updates to other agents
   */
  async syncCapabilities(
    agentId: string,
    capabilities: string[]
  ): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.capabilities = capabilities;
    agent.lastSeen = Date.now();

    const operationId = this.generateOperationId();
    const operation: SyncOperation = {
      id: operationId,
      type: 'capability_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: this.getActiveAgentIds(),
      data: {
        agentId,
        capabilities,
        timestamp: Date.now(),
      },
      priority: 'low',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
    return operationId;
  }

  /**
   * Handle incoming sync data from other agents
   */
  async handleIncomingSync(operation: SyncOperation): Promise<void> {
    try {
      switch (operation.type) {
        case 'memory_sync':
          await this.handleMemorySync(operation);
          break;
        case 'state_sync':
          await this.handleStateSync(operation);
          break;
        case 'capability_sync':
          await this.handleCapabilitySync(operation);
          break;
        case 'configuration_sync':
          await this.handleConfigurationSync(operation);
          break;
        default:
          console.warn(`Unknown sync type: ${operation.type}`);
      }

      // Mark operation as completed
      operation.status = 'completed';
      operation.completedAt = Date.now();
      this.metrics.successfulSyncs++;
    } catch (error) {
      console.error(`Sync operation failed: ${operation.id}`, error);
      operation.status = 'failed';
      operation.error =
        error instanceof Error ? error.message : 'Unknown error';
      operation.completedAt = Date.now();
      this.metrics.failedSyncs++;
    }

    this.updateMetrics();
  }

  /**
   * Resolve conflicts between agents
   */
  async resolveConflict(conflictId: string, resolution?: any): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    switch (conflict.resolutionStrategy) {
      case 'merge':
        conflict.resolution = await this.mergeConflictData(conflict);
        break;
      case 'priority':
        conflict.resolution = await this.resolvePriorityConflict(conflict);
        break;
      case 'vote':
        conflict.resolution = await this.resolveVoteConflict(conflict);
        break;
      case 'manual':
        if (!resolution) {
          throw new Error(
            'Manual resolution requires explicit resolution data'
          );
        }
        conflict.resolution = resolution;
        break;
      case 'latest_wins':
        conflict.resolution = await this.resolveLatestWinsConflict(conflict);
        break;
    }

    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = this.localAgentId;
    this.metrics.conflictsResolved++;

    // Apply resolution to all involved agents
    await this.applyConflictResolution(conflict);

    console.log(
      `Conflict resolved: ${conflictId} using ${conflict.resolutionStrategy}`
    );
  }

  /**
   * Get sync status for monitoring
   */
  getSyncStatus(): {
    activeAgents: number;
    pendingOperations: number;
    recentConflicts: number;
    networkHealth: number;
    metrics: SyncMetrics;
  } {
    const activeAgents = Array.from(this.agents.values()).filter(
      agent => agent.status === 'online'
    ).length;

    const pendingOperations = this.syncQueue.length;

    const recentConflicts = Array.from(this.conflicts.values()).filter(
      conflict => Date.now() - conflict.resolvedAt! < 1000 * 60 * 60
    ).length; // Last hour

    const networkHealth = this.calculateNetworkHealth();

    return {
      activeAgents,
      pendingOperations,
      recentConflicts,
      networkHealth,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get list of connected agents
   */
  getConnectedAgents(): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === 'online')
      .sort((a, b) => b.lastSeen - a.lastSeen);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent state
   */
  getAgentState(agentId: string): AgentState | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Force sync with specific agents
   */
  async forceSyncWithAgents(agentIds: string[]): Promise<string[]> {
    const operationIds: string[] = [];

    for (const agentId of agentIds) {
      if (this.agents.has(agentId)) {
        const operationId = await this.syncAgentState(this.localAgentId, {
          forceSync: true,
          timestamp: Date.now(),
        });
        operationIds.push(operationId);
      }
    }

    return operationIds;
  }

  /**
   * Private methods
   */

  private registerLocalAgent(): void {
    const localAgent: Agent = {
      id: this.localAgentId,
      name: 'Memorai MCP Agent',
      type: 'memory',
      capabilities: [
        'memory_storage',
        'semantic_search',
        'pattern_analysis',
        'natural_language_processing',
        'predictive_loading',
        'automatic_organization',
      ],
      status: 'online',
      lastSeen: Date.now(),
      metadata: {
        version: '3.0.0',
        features: ['mcp_v3', 'ai_tools', 'collaboration'],
        location: 'local',
      },
    };

    this.agents.set(this.localAgentId, localAgent);
    this.initializeAgentState(this.localAgentId);
  }

  private async initializeAgentState(agentId: string): Promise<void> {
    const initialState: AgentState = {
      agentId,
      state: {
        initialized: true,
        syncVersion: '3.0.0',
        capabilities: this.agents.get(agentId)?.capabilities || [],
      },
      version: 1,
      timestamp: Date.now(),
      checksum: '',
    };

    initialState.checksum = this.calculateChecksum(initialState.state);
    this.agentStates.set(agentId, initialState);
  }

  private startSyncProcess(): void {
    this.syncInterval = setInterval(async () => {
      if (!this.isProcessing && this.syncQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, this.syncPolicy.frequency);

    // Health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      // Process operations by priority
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const batch = this.syncQueue.splice(0, this.syncPolicy.batchSize);

      for (const operation of batch) {
        await this.executeSyncOperation(operation);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<void> {
    const startTime = Date.now();
    operation.status = 'in_progress';

    try {
      // Simulate network operation
      await this.sendToAgents(operation);

      operation.status = 'completed';
      operation.completedAt = Date.now();
      this.metrics.successfulSyncs++;
    } catch (error) {
      console.error(`Sync operation failed: ${operation.id}`, error);
      operation.status = 'failed';
      operation.error =
        error instanceof Error ? error.message : 'Unknown error';
      operation.completedAt = Date.now();
      this.metrics.failedSyncs++;

      // Retry if within limit
      if ((operation.metadata?.retryCount || 0) < this.syncPolicy.retryCount) {
        operation.metadata = {
          ...operation.metadata,
          retryCount: (operation.metadata?.retryCount || 0) + 1,
        };
        operation.status = 'pending';
        this.syncQueue.push(operation);
      }
    }

    // Update timing metrics
    const duration = Date.now() - startTime;
    this.metrics.averageSyncTime =
      this.metrics.averageSyncTime * 0.9 + duration * 0.1;
    this.metrics.totalOperations++;
  }

  private async sendToAgents(operation: SyncOperation): Promise<void> {
    // Simulate sending to target agents
    const promises = operation.targetAgentIds.map(async agentId => {
      const agent = this.agents.get(agentId);
      if (agent && agent.status === 'online') {
        // Simulate network latency
        await new Promise(resolve =>
          setTimeout(resolve, Math.random() * 100 + 50)
        );

        // Simulate possible conflicts
        if (Math.random() < 0.05) {
          // 5% chance of conflict
          await this.detectAndCreateConflict(operation, agentId);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  private async queueSyncOperation(operation: SyncOperation): Promise<void> {
    this.syncOperations.set(operation.id, operation);

    // Check priority threshold for immediate processing
    const threshold = this.syncPolicy.priorityThresholds[operation.priority];
    if (threshold <= 1000) {
      // Critical operations
      this.syncQueue.unshift(operation); // Add to front
    } else {
      this.syncQueue.push(operation);
    }
  }

  private async handleMemorySync(operation: SyncOperation): Promise<void> {
    const { memories } = operation.data;

    // Process each memory
    for (const memory of memories) {
      // Check for conflicts
      const existingMemory = await this.getExistingMemory(memory.id);
      if (existingMemory && existingMemory.timestamp !== memory.timestamp) {
        await this.createMemoryConflict(
          existingMemory,
          memory,
          operation.sourceAgentId
        );
      } else {
        // Apply memory update
        await this.applyMemoryUpdate(memory);
      }
    }
  }

  private async handleStateSync(operation: SyncOperation): Promise<void> {
    const incomingState = operation.data as AgentState;
    const existingState = this.agentStates.get(incomingState.agentId);

    if (existingState) {
      // Check for version conflicts
      if (existingState.version >= incomingState.version) {
        await this.createStateConflict(
          existingState,
          incomingState,
          operation.sourceAgentId
        );
        return;
      }
    }

    // Apply state update
    this.agentStates.set(incomingState.agentId, incomingState);
  }

  private async handleCapabilitySync(operation: SyncOperation): Promise<void> {
    const { agentId, capabilities } = operation.data;
    const agent = this.agents.get(agentId);

    if (agent) {
      agent.capabilities = capabilities;
      agent.lastSeen = Date.now();
    }
  }

  private async handleConfigurationSync(
    operation: SyncOperation
  ): Promise<void> {
    const { configuration } = operation.data;

    // Apply configuration updates
    if (configuration.syncPolicy) {
      this.syncPolicy = { ...this.syncPolicy, ...configuration.syncPolicy };
    }
  }

  private async detectAndCreateConflict(
    operation: SyncOperation,
    agentId: string
  ): Promise<void> {
    const conflictId = this.generateConflictId();

    const conflict: ConflictResolution = {
      conflictId,
      type: 'data_conflict',
      involvedAgents: [operation.sourceAgentId, agentId],
      conflictData: {
        operation,
        agentId,
        timestamp: Date.now(),
      },
      resolutionStrategy: this.syncPolicy.conflictResolution,
    };

    this.conflicts.set(conflictId, conflict);

    // Auto-resolve if strategy allows
    if (conflict.resolutionStrategy !== 'manual') {
      await this.resolveConflict(conflictId);
    }
  }

  private async createMemoryConflict(
    existing: Memory,
    incoming: Memory,
    sourceAgentId: string
  ): Promise<void> {
    const conflictId = this.generateConflictId();

    const conflict: ConflictResolution = {
      conflictId,
      type: 'data_conflict',
      involvedAgents: [this.localAgentId, sourceAgentId],
      conflictData: {
        existing,
        incoming,
        type: 'memory',
      },
      resolutionStrategy: this.syncPolicy.conflictResolution,
    };

    this.conflicts.set(conflictId, conflict);
    await this.resolveConflict(conflictId);
  }

  private async createStateConflict(
    existing: AgentState,
    incoming: AgentState,
    sourceAgentId: string
  ): Promise<void> {
    const conflictId = this.generateConflictId();

    const conflict: ConflictResolution = {
      conflictId,
      type: 'state_conflict',
      involvedAgents: [this.localAgentId, sourceAgentId],
      conflictData: {
        existing,
        incoming,
        type: 'state',
      },
      resolutionStrategy: this.syncPolicy.conflictResolution,
    };

    this.conflicts.set(conflictId, conflict);
    await this.resolveConflict(conflictId);
  }

  private async mergeConflictData(conflict: ConflictResolution): Promise<any> {
    const { conflictData } = conflict;

    if (conflictData.type === 'memory') {
      // Merge memory objects
      return {
        ...conflictData.existing,
        ...conflictData.incoming,
        timestamp: Math.max(
          conflictData.existing.timestamp,
          conflictData.incoming.timestamp
        ),
        metadata: {
          ...conflictData.existing.metadata,
          ...conflictData.incoming.metadata,
          conflictResolved: true,
          mergedAt: Date.now(),
        },
      };
    } else if (conflictData.type === 'state') {
      // Merge state objects
      return {
        ...conflictData.existing,
        state: {
          ...conflictData.existing.state,
          ...conflictData.incoming.state,
        },
        version:
          Math.max(
            conflictData.existing.version,
            conflictData.incoming.version
          ) + 1,
        timestamp: Date.now(),
        checksum: this.calculateChecksum({
          ...conflictData.existing.state,
          ...conflictData.incoming.state,
        }),
      };
    }

    return conflictData.incoming; // Default to incoming
  }

  private async resolvePriorityConflict(
    conflict: ConflictResolution
  ): Promise<any> {
    // Resolve based on agent priority (could be configured)
    const agentPriorities = new Map([
      [this.localAgentId, 10], // Local agent has highest priority
    ]);

    let highestPriority = 0;
    let winningAgent = '';

    for (const agentId of conflict.involvedAgents) {
      const priority = agentPriorities.get(agentId) || 1;
      if (priority > highestPriority) {
        highestPriority = priority;
        winningAgent = agentId;
      }
    }

    // Return data from winning agent
    return winningAgent === this.localAgentId
      ? conflict.conflictData.existing
      : conflict.conflictData.incoming;
  }

  private async resolveVoteConflict(
    conflict: ConflictResolution
  ): Promise<any> {
    // Simplified voting - would need actual voting mechanism
    return conflict.conflictData.incoming;
  }

  private async resolveLatestWinsConflict(
    conflict: ConflictResolution
  ): Promise<any> {
    const { conflictData } = conflict;

    if (conflictData.type === 'memory') {
      return conflictData.existing.timestamp > conflictData.incoming.timestamp
        ? conflictData.existing
        : conflictData.incoming;
    } else if (conflictData.type === 'state') {
      return conflictData.existing.timestamp > conflictData.incoming.timestamp
        ? conflictData.existing
        : conflictData.incoming;
    }

    return conflictData.incoming;
  }

  private async applyConflictResolution(
    conflict: ConflictResolution
  ): Promise<void> {
    if (!conflict.resolution) return;

    // Apply resolution based on conflict type
    if (conflict.conflictData.type === 'memory') {
      await this.applyMemoryUpdate(conflict.resolution);
    } else if (conflict.conflictData.type === 'state') {
      this.agentStates.set(conflict.resolution.agentId, conflict.resolution);
    }

    // Notify involved agents of resolution
    const notificationOperation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'configuration_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: conflict.involvedAgents.filter(
        id => id !== this.localAgentId
      ),
      data: {
        type: 'conflict_resolution',
        conflictId: conflict.conflictId,
        resolution: conflict.resolution,
      },
      priority: 'high',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(notificationOperation);
  }

  private performHealthCheck(): void {
    const currentTime = Date.now();
    const staleThreshold = 60000; // 1 minute

    // Mark stale agents as offline
    for (const [agentId, agent] of this.agents) {
      if (
        agent.status === 'online' &&
        currentTime - agent.lastSeen > staleThreshold
      ) {
        agent.status = 'offline';
        console.log(`Agent marked offline due to inactivity: ${agentId}`);
      }
    }

    // Update network health
    this.updateNetworkHealth();
  }

  private calculateNetworkHealth(): number {
    const totalAgents = this.agents.size;
    const onlineAgents = Array.from(this.agents.values()).filter(
      agent => agent.status === 'online'
    ).length;

    const connectivityScore = totalAgents > 0 ? onlineAgents / totalAgents : 1;
    const latencyScore = Math.max(0, 1 - this.metrics.networkLatency / 1000);
    const integrityScore = this.metrics.dataIntegrity;

    return connectivityScore * 0.4 + latencyScore * 0.3 + integrityScore * 0.3;
  }

  private updateNetworkHealth(): void {
    // Update network latency (simplified)
    this.metrics.networkLatency = Math.random() * 200 + 50; // 50-250ms

    // Update data integrity
    const totalOps = this.metrics.totalOperations;
    const successRate =
      totalOps > 0 ? this.metrics.successfulSyncs / totalOps : 1;
    this.metrics.dataIntegrity = successRate;
  }

  private updateMetrics(): void {
    this.updateNetworkHealth();
  }

  private getActiveAgentIds(): string[] {
    return Array.from(this.agents.values())
      .filter(
        agent => agent.status === 'online' && agent.id !== this.localAgentId
      )
      .map(agent => agent.id);
  }

  private async prepareMemoriesForSync(memories: Memory[]): Promise<Memory[]> {
    // Prepare memories for sync (compression, encryption, etc.)
    return memories.map(memory => ({
      ...memory,
      metadata: {
        ...memory.metadata,
        syncPreparedAt: Date.now(),
        syncSource: this.localAgentId,
      },
    }));
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation
    const jsonString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private async broadcastAgentRegistration(agent: Agent): Promise<void> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'configuration_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: this.getActiveAgentIds(),
      data: {
        type: 'agent_registration',
        agent,
      },
      priority: 'medium',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
  }

  private async broadcastAgentUnregistration(agentId: string): Promise<void> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'configuration_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: this.getActiveAgentIds(),
      data: {
        type: 'agent_unregistration',
        agentId,
      },
      priority: 'medium',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
  }

  private async syncAgentStatus(agent: Agent): Promise<void> {
    const operation: SyncOperation = {
      id: this.generateOperationId(),
      type: 'configuration_sync',
      sourceAgentId: this.localAgentId,
      targetAgentIds: this.getActiveAgentIds(),
      data: {
        type: 'agent_status',
        agentId: agent.id,
        status: agent.status,
        metadata: agent.metadata,
      },
      priority: 'low',
      status: 'pending',
      createdAt: Date.now(),
    };

    await this.queueSyncOperation(operation);
  }

  private cancelAgentOperations(agentId: string): void {
    // Cancel operations involving the agent
    for (const operation of this.syncQueue) {
      if (
        operation.sourceAgentId === agentId ||
        operation.targetAgentIds.includes(agentId)
      ) {
        operation.status = 'cancelled';
      }
    }

    // Remove from sync queue
    this.syncQueue = this.syncQueue.filter(op => op.status !== 'cancelled');
  }

  // Utility methods
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  // Mock methods for memory operations (would integrate with actual memory system)
  private async getExistingMemory(memoryId: string): Promise<Memory | null> {
    // Mock implementation
    return null;
  }

  private async applyMemoryUpdate(memory: Memory): Promise<void> {
    // Mock implementation
    console.log(`Applying memory update: ${memory.id}`);
  }

  /**
   * Public API for configuration and monitoring
   */

  /**
   * Update sync policy
   */
  updateSyncPolicy(policy: Partial<SyncPolicy>): void {
    this.syncPolicy = { ...this.syncPolicy, ...policy };

    // Restart sync process if frequency changed
    if (policy.frequency && this.syncInterval) {
      clearInterval(this.syncInterval);
      this.startSyncProcess();
    }
  }

  /**
   * Get sync policy
   */
  getSyncPolicy(): SyncPolicy {
    return { ...this.syncPolicy };
  }

  /**
   * Get pending operations
   */
  getPendingOperations(): SyncOperation[] {
    return this.syncQueue.filter(op => op.status === 'pending');
  }

  /**
   * Get operation status
   */
  getOperationStatus(operationId: string): SyncOperation | undefined {
    return this.syncOperations.get(operationId);
  }

  /**
   * Get unresolved conflicts
   */
  getUnresolvedConflicts(): ConflictResolution[] {
    return Array.from(this.conflicts.values()).filter(
      conflict => !conflict.resolvedAt
    );
  }

  /**
   * Manual conflict resolution
   */
  async manualResolveConflict(
    conflictId: string,
    resolution: any
  ): Promise<void> {
    await this.resolveConflict(conflictId, resolution);
  }

  /**
   * Export sync data for backup
   */
  exportSyncData(): {
    agents: Agent[];
    states: AgentState[];
    metrics: SyncMetrics;
    configuration: SyncPolicy;
  } {
    return {
      agents: Array.from(this.agents.values()),
      states: Array.from(this.agentStates.values()),
      metrics: { ...this.metrics },
      configuration: { ...this.syncPolicy },
    };
  }

  /**
   * Import sync data from backup
   */
  importSyncData(data: {
    agents?: Agent[];
    states?: AgentState[];
    configuration?: SyncPolicy;
  }): void {
    if (data.agents) {
      this.agents.clear();
      for (const agent of data.agents) {
        this.agents.set(agent.id, agent);
      }
    }

    if (data.states) {
      this.agentStates.clear();
      for (const state of data.states) {
        this.agentStates.set(state.agentId, state);
      }
    }

    if (data.configuration) {
      this.updateSyncPolicy(data.configuration);
    }
  }

  /**
   * Shutdown sync system
   */
  shutdown(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Mark local agent as offline
    const localAgent = this.agents.get(this.localAgentId);
    if (localAgent) {
      localAgent.status = 'offline';
    }

    console.log('Agent sync system shutdown');
  }
}

export default AgentSync;
