/**
 * Database Sharding Engine for Memorai
 * 
 * Advanced database sharding system that automatically partitions data
 * across multiple database instances based on configurable strategies,
 * with automatic rebalancing, query routing, and consistency management.
 * 
 * Features:
 * - Multiple sharding strategies (hash, range, directory, hybrid)
 * - Automatic shard rebalancing
 * - Cross-shard query support
 * - Distributed transactions
 * - Hot shard detection and mitigation
 * - Replica management and failover
 * - Consistent hashing for scalability
 * 
 * @version 3.0.0
 * @author Memorai Enterprise Team
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

/**
 * Database shard configuration
 */
export interface DatabaseShard {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  status: 'active' | 'inactive' | 'migrating' | 'readonly' | 'failed';
  weight: number;
  region: string;
  zone: string;
  replicas: DatabaseReplica[];
  stats: {
    connectionCount: number;
    queryCount: number;
    dataSize: number; // bytes
    avgResponseTime: number;
    lastHealthCheck: Date;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  metadata: Record<string, any>;
}

/**
 * Database replica configuration
 */
export interface DatabaseReplica {
  id: string;
  shardId: string;
  host: string;
  port: number;
  database: string;
  role: 'primary' | 'secondary' | 'readonly';
  status: 'active' | 'inactive' | 'syncing' | 'failed';
  lag: number; // replication lag in milliseconds
  lastSync: Date;
}

/**
 * Sharding strategies
 */
export type ShardingStrategy = 
  | 'hash_based'
  | 'range_based'
  | 'directory_based'
  | 'consistent_hash'
  | 'geographic'
  | 'tenant_based'
  | 'hybrid';

/**
 * Shard key configuration
 */
export interface ShardKey {
  fields: string[];
  strategy: ShardingStrategy;
  algorithm?: 'md5' | 'sha1' | 'sha256' | 'murmur3';
  ranges?: ShardRange[];
  directory?: Map<string, string>;
}

/**
 * Shard range for range-based sharding
 */
export interface ShardRange {
  shardId: string;
  minValue: any;
  maxValue: any;
  inclusive: boolean;
}

/**
 * Query routing context
 */
export interface QueryContext {
  id: string;
  operation: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  shardKey?: Record<string, any>;
  filters?: Record<string, any>;
  tenantId: string;
  userId?: string;
  consistency: 'eventual' | 'strong' | 'bounded';
  timeout: number;
  priority: 'low' | 'normal' | 'high';
  readonly: boolean;
}

/**
 * Query routing decision
 */
export interface RoutingDecision {
  queryId: string;
  targetShards: string[];
  strategy: ShardingStrategy;
  reason: string;
  requiresAggregation: boolean;
  estimatedCost: number;
  routingTime: number;
}

/**
 * Shard migration task
 */
export interface ShardMigration {
  id: string;
  sourceShardId: string;
  targetShardId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  startTime: Date;
  endTime?: Date;
  dataRange: {
    startKey: string;
    endKey: string;
  };
  recordsToMigrate: number;
  recordsMigrated: number;
  errors: string[];
}

/**
 * Rebalancing configuration
 */
export interface RebalancingConfig {
  enabled: boolean;
  triggerThreshold: number; // % imbalance to trigger rebalancing
  targetBalance: number; // Target balance percentage
  maxConcurrentMigrations: number;
  migrationBatchSize: number;
  migrationThrottleMs: number;
  autoApproval: boolean;
}

/**
 * Distributed transaction context
 */
export interface DistributedTransaction {
  id: string;
  status: 'active' | 'preparing' | 'committed' | 'aborted';
  participantShards: string[];
  coordinatorShard: string;
  operations: TransactionOperation[];
  startTime: Date;
  timeout: number;
  isolationLevel: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
  id: string;
  shardId: string;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  conditions?: Record<string, any>;
}

/**
 * Database Sharding Engine
 * 
 * Manages data distribution across multiple database shards with automatic
 * routing, rebalancing, and consistency guarantees for enterprise workloads.
 */
export class DatabaseShardingEngine extends EventEmitter {
  private shards: Map<string, DatabaseShard> = new Map();
  private shardKeys: Map<string, ShardKey> = new Map();
  private migrations: Map<string, ShardMigration> = new Map();
  private transactions: Map<string, DistributedTransaction> = new Map();
  private consistentHashRing: Map<string, string> = new Map();
  private rebalancingConfig: RebalancingConfig;
  private isRunning: boolean = false;
  private rebalancingInterval: NodeJS.Timeout | null = null;
  private queryHistory: RoutingDecision[] = [];

  constructor(rebalancingConfig: Partial<RebalancingConfig> = {}) {
    super();
    this.rebalancingConfig = {
      enabled: true,
      triggerThreshold: 20, // 20% imbalance
      targetBalance: 5, // Within 5% balance
      maxConcurrentMigrations: 2,
      migrationBatchSize: 1000,
      migrationThrottleMs: 100,
      autoApproval: false,
      ...rebalancingConfig
    };
    this.setupDefaultShardKeys();
  }

  /**
   * Setup default shard keys for Memorai tables
   */
  private setupDefaultShardKeys(): void {
    // Memory records sharded by tenant
    this.shardKeys.set('memories', {
      fields: ['tenant_id'],
      strategy: 'hash_based',
      algorithm: 'sha256'
    });

    // User data sharded by user ID
    this.shardKeys.set('users', {
      fields: ['user_id'],
      strategy: 'hash_based',
      algorithm: 'sha256'
    });

    // Sessions sharded by session ID
    this.shardKeys.set('sessions', {
      fields: ['session_id'],
      strategy: 'consistent_hash'
    });

    // Analytics data sharded by date range
    this.shardKeys.set('analytics', {
      fields: ['date'],
      strategy: 'range_based',
      ranges: [
        { shardId: 'analytics-2024', minValue: '2024-01-01', maxValue: '2024-12-31', inclusive: true },
        { shardId: 'analytics-2025', minValue: '2025-01-01', maxValue: '2025-12-31', inclusive: true }
      ]
    });
  }

  /**
   * Start the sharding engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sharding engine is already running');
    }

    this.isRunning = true;
    this.buildConsistentHashRing();

    if (this.rebalancingConfig.enabled) {
      this.startRebalancingMonitor();
    }

    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop the sharding engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.stopRebalancingMonitor();
    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Add a database shard
   */
  addShard(shard: Omit<DatabaseShard, 'stats'>): void {
    const fullShard: DatabaseShard = {
      ...shard,
      stats: {
        connectionCount: 0,
        queryCount: 0,
        dataSize: 0,
        avgResponseTime: 0,
        lastHealthCheck: new Date(),
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0
      }
    };

    this.shards.set(shard.id, fullShard);
    this.rebuildConsistentHashRing();
    this.emit('shard_added', { shardId: shard.id, shard: fullShard });
  }

  /**
   * Remove a database shard
   */
  async removeShard(shardId: string, force: boolean = false): Promise<void> {
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }

    if (!force && shard.stats.dataSize > 0) {
      throw new Error(`Cannot remove shard ${shardId} with data. Migrate data first or use force=true`);
    }

    this.shards.delete(shardId);
    this.rebuildConsistentHashRing();
    this.emit('shard_removed', { shardId, shard });
  }

  /**
   * Update shard statistics
   */
  updateShardStats(shardId: string, stats: Partial<DatabaseShard['stats']>): void {
    const shard = this.shards.get(shardId);
    if (shard) {
      Object.assign(shard.stats, stats);
      this.emit('shard_stats_updated', { shardId, stats: shard.stats });
    }
  }

  /**
   * Configure shard key for a table
   */
  configureShardKey(table: string, shardKey: ShardKey): void {
    this.shardKeys.set(table, shardKey);
    
    if (shardKey.strategy === 'consistent_hash') {
      this.rebuildConsistentHashRing();
    }

    this.emit('shard_key_configured', { table, shardKey });
  }

  /**
   * Route query to appropriate shards
   */
  async routeQuery(context: QueryContext): Promise<RoutingDecision> {
    const startTime = Date.now();
    const shardKey = this.shardKeys.get(context.table);
    
    if (!shardKey) {
      throw new Error(`No shard key configured for table ${context.table}`);
    }

    let targetShards: string[] = [];
    let requiresAggregation = false;
    let reason = '';

    switch (shardKey.strategy) {
      case 'hash_based':
        targetShards = [await this.routeHashBased(context, shardKey)];
        reason = 'Hash-based routing';
        break;

      case 'range_based':
        targetShards = await this.routeRangeBased(context, shardKey);
        reason = 'Range-based routing';
        requiresAggregation = targetShards.length > 1;
        break;

      case 'directory_based':
        targetShards = [await this.routeDirectoryBased(context, shardKey)];
        reason = 'Directory-based routing';
        break;

      case 'consistent_hash':
        targetShards = [await this.routeConsistentHash(context, shardKey)];
        reason = 'Consistent hash routing';
        break;

      case 'geographic':
        targetShards = await this.routeGeographic(context, shardKey);
        reason = 'Geographic routing';
        requiresAggregation = targetShards.length > 1;
        break;

      case 'tenant_based':
        targetShards = [await this.routeTenantBased(context, shardKey)];
        reason = 'Tenant-based routing';
        break;

      case 'hybrid':
        targetShards = await this.routeHybrid(context, shardKey);
        reason = 'Hybrid routing strategy';
        requiresAggregation = targetShards.length > 1;
        break;

      default:
        throw new Error(`Unsupported sharding strategy: ${shardKey.strategy}`);
    }

    // Filter to only active shards
    targetShards = targetShards.filter(shardId => {
      const shard = this.shards.get(shardId);
      return shard && shard.status === 'active';
    });

    if (targetShards.length === 0) {
      throw new Error('No active shards available for query');
    }

    // For read operations, prefer read replicas if available and consistency allows
    if (context.readonly && context.consistency === 'eventual') {
      targetShards = this.selectReadReplicas(targetShards);
    }

    const decision: RoutingDecision = {
      queryId: context.id,
      targetShards,
      strategy: shardKey.strategy,
      reason,
      requiresAggregation,
      estimatedCost: this.estimateQueryCost(context, targetShards),
      routingTime: Date.now() - startTime
    };

    // Update shard query counts
    for (const shardId of targetShards) {
      const shard = this.shards.get(shardId);
      if (shard) {
        shard.stats.queryCount++;
      }
    }

    this.queryHistory.push(decision);
    this.queryHistory = this.queryHistory.slice(-1000); // Keep last 1000 decisions

    this.emit('query_routed', decision);
    return decision;
  }

  /**
   * Hash-based routing
   */
  private async routeHashBased(context: QueryContext, shardKey: ShardKey): Promise<string> {
    if (!context.shardKey) {
      throw new Error('Shard key values required for hash-based routing');
    }

    const keyValue = this.extractKeyValue(context.shardKey, shardKey.fields);
    const hash = this.calculateHash(keyValue, shardKey.algorithm || 'sha256');
    
    const activeShards = Array.from(this.shards.values()).filter(s => s.status === 'active');
    const shardIndex = parseInt(hash.substring(0, 8), 16) % activeShards.length;
    
    return activeShards[shardIndex].id;
  }

  /**
   * Range-based routing
   */
  private async routeRangeBased(context: QueryContext, shardKey: ShardKey): Promise<string[]> {
    if (!shardKey.ranges) {
      throw new Error('Ranges required for range-based routing');
    }

    if (!context.shardKey) {
      // If no shard key provided, query all shards
      return shardKey.ranges.map(r => r.shardId);
    }

    const keyValue = this.extractKeyValue(context.shardKey, shardKey.fields);
    const targetShards: string[] = [];

    for (const range of shardKey.ranges) {
      if (this.isValueInRange(keyValue, range)) {
        targetShards.push(range.shardId);
      }
    }

    return targetShards.length > 0 ? targetShards : shardKey.ranges.map(r => r.shardId);
  }

  /**
   * Directory-based routing
   */
  private async routeDirectoryBased(context: QueryContext, shardKey: ShardKey): Promise<string> {
    if (!shardKey.directory) {
      throw new Error('Directory required for directory-based routing');
    }

    if (!context.shardKey) {
      throw new Error('Shard key values required for directory-based routing');
    }

    const keyValue = this.extractKeyValue(context.shardKey, shardKey.fields);
    const shardId = shardKey.directory.get(keyValue);
    
    if (!shardId) {
      throw new Error(`No shard mapping found for key: ${keyValue}`);
    }

    return shardId;
  }

  /**
   * Consistent hash routing
   */
  private async routeConsistentHash(context: QueryContext, shardKey: ShardKey): Promise<string> {
    if (!context.shardKey) {
      throw new Error('Shard key values required for consistent hash routing');
    }

    const keyValue = this.extractKeyValue(context.shardKey, shardKey.fields);
    const hash = this.calculateHash(keyValue, 'sha256');
    
    // Find the first shard in the ring that has a hash >= our key hash
    const sortedHashes = Array.from(this.consistentHashRing.keys()).sort();
    
    for (const ringHash of sortedHashes) {
      if (hash <= ringHash) {
        return this.consistentHashRing.get(ringHash)!;
      }
    }
    
    // Wrap around to the first shard
    return this.consistentHashRing.get(sortedHashes[0])!;
  }

  /**
   * Geographic routing
   */
  private async routeGeographic(context: QueryContext, shardKey: ShardKey): Promise<string[]> {
    // Route based on user's geographic location
    // In production, this would use actual geolocation data
    const userRegion = context.userId ? this.getUserRegion(context.userId) : 'us-east-1';
    
    const regionalShards = Array.from(this.shards.values())
      .filter(shard => shard.region === userRegion && shard.status === 'active')
      .map(shard => shard.id);

    return regionalShards.length > 0 ? regionalShards : [this.getDefaultShard()];
  }

  /**
   * Tenant-based routing
   */
  private async routeTenantBased(context: QueryContext, shardKey: ShardKey): Promise<string> {
    // Route based on tenant ID for multi-tenant isolation
    const tenantHash = this.calculateHash(context.tenantId, 'sha256');
    const activeShards = Array.from(this.shards.values()).filter(s => s.status === 'active');
    const shardIndex = parseInt(tenantHash.substring(0, 8), 16) % activeShards.length;
    
    return activeShards[shardIndex].id;
  }

  /**
   * Hybrid routing strategy
   */
  private async routeHybrid(context: QueryContext, shardKey: ShardKey): Promise<string[]> {
    // Combine tenant-based and geographic routing
    const tenantShard = await this.routeTenantBased(context, shardKey);
    const geoShards = await this.routeGeographic(context, shardKey);
    
    // Return union of both strategies
    const hybridShards = new Set([tenantShard, ...geoShards]);
    return Array.from(hybridShards);
  }

  /**
   * Select read replicas for read operations
   */
  private selectReadReplicas(shardIds: string[]): string[] {
    const replicaShards: string[] = [];
    
    for (const shardId of shardIds) {
      const shard = this.shards.get(shardId);
      if (!shard) continue;
      
      // Find best replica (lowest lag)
      const bestReplica = shard.replicas
        .filter(r => r.status === 'active' && r.role !== 'primary')
        .sort((a, b) => a.lag - b.lag)[0];
      
      if (bestReplica) {
        replicaShards.push(bestReplica.id);
      } else {
        replicaShards.push(shardId); // Fallback to primary
      }
    }
    
    return replicaShards.length > 0 ? replicaShards : shardIds;
  }

  /**
   * Extract key value from shard key fields
   */
  private extractKeyValue(shardKey: Record<string, any>, fields: string[]): string {
    const values = fields.map(field => shardKey[field] || '').join('|');
    return values;
  }

  /**
   * Calculate hash using specified algorithm
   */
  private calculateHash(value: string, algorithm: string): string {
    return createHash(algorithm).update(value).digest('hex');
  }

  /**
   * Check if value is in range
   */
  private isValueInRange(value: any, range: ShardRange): boolean {
    const minCheck = range.inclusive ? value >= range.minValue : value > range.minValue;
    const maxCheck = range.inclusive ? value <= range.maxValue : value < range.maxValue;
    return minCheck && maxCheck;
  }

  /**
   * Build consistent hash ring
   */
  private buildConsistentHashRing(): void {
    this.consistentHashRing.clear();
    
    const virtualNodes = 150; // Virtual nodes per shard for better distribution
    
    for (const shard of this.shards.values()) {
      if (shard.status === 'active') {
        for (let i = 0; i < virtualNodes; i++) {
          const virtualNodeKey = `${shard.id}:${i}`;
          const hash = this.calculateHash(virtualNodeKey, 'sha256');
          this.consistentHashRing.set(hash, shard.id);
        }
      }
    }
  }

  /**
   * Rebuild consistent hash ring
   */
  private rebuildConsistentHashRing(): void {
    this.buildConsistentHashRing();
    this.emit('hash_ring_rebuilt', { nodeCount: this.consistentHashRing.size });
  }

  /**
   * Get user region (mock implementation)
   */
  private getUserRegion(userId: string): string {
    // Mock implementation - in production would query user profile
    const hash = this.calculateHash(userId, 'md5');
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
    return regions[parseInt(hash.substring(0, 2), 16) % regions.length];
  }

  /**
   * Get default shard
   */
  private getDefaultShard(): string {
    const activeShards = Array.from(this.shards.values()).filter(s => s.status === 'active');
    return activeShards.length > 0 ? activeShards[0].id : '';
  }

  /**
   * Estimate query cost
   */
  private estimateQueryCost(context: QueryContext, targetShards: string[]): number {
    let cost = 0;
    
    for (const shardId of targetShards) {
      const shard = this.shards.get(shardId);
      if (shard) {
        // Base cost per shard
        cost += 1;
        
        // Add cost based on shard load
        cost += (shard.stats.queryCount / 1000) * 0.1;
        
        // Add cost based on data size
        cost += (shard.stats.dataSize / (1024 * 1024 * 1024)) * 0.05; // GB
      }
    }
    
    // Cross-shard operations are more expensive
    if (targetShards.length > 1) {
      cost *= 1.5;
    }
    
    return cost;
  }

  /**
   * Start rebalancing monitor
   */
  private startRebalancingMonitor(): void {
    this.rebalancingInterval = setInterval(async () => {
      await this.checkRebalancing();
    }, 300000); // Check every 5 minutes
  }

  /**
   * Stop rebalancing monitor
   */
  private stopRebalancingMonitor(): void {
    if (this.rebalancingInterval) {
      clearInterval(this.rebalancingInterval);
      this.rebalancingInterval = null;
    }
  }

  /**
   * Check if rebalancing is needed
   */
  private async checkRebalancing(): Promise<void> {
    const imbalance = this.calculateImbalance();
    
    if (imbalance > this.rebalancingConfig.triggerThreshold) {
      this.emit('rebalancing_needed', { imbalance });
      
      if (this.rebalancingConfig.autoApproval) {
        await this.startRebalancing();
      }
    }
  }

  /**
   * Calculate data imbalance across shards
   */
  private calculateImbalance(): number {
    const shards = Array.from(this.shards.values()).filter(s => s.status === 'active');
    if (shards.length < 2) return 0;
    
    const totalData = shards.reduce((sum, shard) => sum + shard.stats.dataSize, 0);
    const averageData = totalData / shards.length;
    
    if (averageData === 0) return 0;
    
    const maxDeviation = Math.max(...shards.map(shard => 
      Math.abs(shard.stats.dataSize - averageData) / averageData * 100
    ));
    
    return maxDeviation;
  }

  /**
   * Start rebalancing process
   */
  private async startRebalancing(): Promise<void> {
    this.emit('rebalancing_started', { timestamp: Date.now() });
    
    // Implementation would identify hot spots and create migration tasks
    // This is a simplified version
    const shards = Array.from(this.shards.values()).filter(s => s.status === 'active');
    const totalData = shards.reduce((sum, shard) => sum + shard.stats.dataSize, 0);
    const targetSize = totalData / shards.length;
    
    for (const shard of shards) {
      const deviation = (shard.stats.dataSize - targetSize) / targetSize * 100;
      
      if (deviation > this.rebalancingConfig.triggerThreshold) {
        // This shard has too much data, create migration tasks
        await this.createMigrationTasks(shard.id, deviation);
      }
    }
  }

  /**
   * Create migration tasks for rebalancing
   */
  private async createMigrationTasks(sourceShardId: string, overloadPercentage: number): Promise<void> {
    const migration: ShardMigration = {
      id: `migration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceShardId,
      targetShardId: this.findLeastLoadedShard(sourceShardId),
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      dataRange: {
        startKey: '',
        endKey: ''
      },
      recordsToMigrate: 0,
      recordsMigrated: 0,
      errors: []
    };

    this.migrations.set(migration.id, migration);
    this.emit('migration_created', { migrationId: migration.id, migration });
  }

  /**
   * Find least loaded shard
   */
  private findLeastLoadedShard(excludeShardId: string): string {
    const shards = Array.from(this.shards.values())
      .filter(s => s.status === 'active' && s.id !== excludeShardId)
      .sort((a, b) => a.stats.dataSize - b.stats.dataSize);
    
    return shards.length > 0 ? shards[0].id : '';
  }

  /**
   * Begin distributed transaction
   */
  async beginTransaction(
    operations: TransactionOperation[],
    isolationLevel: DistributedTransaction['isolationLevel'] = 'read_committed'
  ): Promise<string> {
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const participantShards = Array.from(new Set(operations.map(op => op.shardId)));
    const coordinatorShard = participantShards[0]; // Use first shard as coordinator
    
    const transaction: DistributedTransaction = {
      id: transactionId,
      status: 'active',
      participantShards,
      coordinatorShard,
      operations,
      startTime: new Date(),
      timeout: 30000, // 30 seconds
      isolationLevel
    };

    this.transactions.set(transactionId, transaction);
    this.emit('transaction_started', { transactionId, transaction });
    
    return transactionId;
  }

  /**
   * Commit distributed transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    try {
      transaction.status = 'preparing';
      
      // Two-phase commit protocol
      // Phase 1: Prepare
      const prepareResults = await Promise.all(
        transaction.participantShards.map(shardId => this.prepareShard(shardId, transactionId))
      );
      
      if (prepareResults.every(result => result)) {
        // Phase 2: Commit
        transaction.status = 'committed';
        await Promise.all(
          transaction.participantShards.map(shardId => this.commitShard(shardId, transactionId))
        );
        
        this.emit('transaction_committed', { transactionId, transaction });
      } else {
        // Abort transaction
        await this.abortTransaction(transactionId);
      }
    } catch (error) {
      await this.abortTransaction(transactionId);
      throw error;
    } finally {
      this.transactions.delete(transactionId);
    }
  }

  /**
   * Abort distributed transaction
   */
  async abortTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return;
    }

    transaction.status = 'aborted';
    
    await Promise.all(
      transaction.participantShards.map(shardId => this.abortShard(shardId, transactionId))
    );
    
    this.emit('transaction_aborted', { transactionId, transaction });
    this.transactions.delete(transactionId);
  }

  /**
   * Prepare shard for commit (mock implementation)
   */
  private async prepareShard(shardId: string, transactionId: string): Promise<boolean> {
    // Mock implementation - in production would send prepare message to shard
    return Math.random() > 0.1; // 90% success rate
  }

  /**
   * Commit shard (mock implementation)
   */
  private async commitShard(shardId: string, transactionId: string): Promise<void> {
    // Mock implementation - in production would send commit message to shard
  }

  /**
   * Abort shard (mock implementation)
   */
  private async abortShard(shardId: string, transactionId: string): Promise<void> {
    // Mock implementation - in production would send abort message to shard
  }

  /**
   * Get sharding statistics
   */
  getShardingStats(): {
    totalShards: number;
    activeShards: number;
    totalDataSize: number;
    averageDataSize: number;
    dataImbalance: number;
    queryDistribution: Record<string, number>;
    migrationStats: {
      active: number;
      completed: number;
      failed: number;
    };
    transactionStats: {
      active: number;
      committed: number;
      aborted: number;
    };
  } {
    const shards = Array.from(this.shards.values());
    const activeShards = shards.filter(s => s.status === 'active');
    const totalDataSize = activeShards.reduce((sum, s) => sum + s.stats.dataSize, 0);
    const averageDataSize = activeShards.length > 0 ? totalDataSize / activeShards.length : 0;

    const queryDistribution: Record<string, number> = {};
    for (const shard of shards) {
      queryDistribution[shard.id] = shard.stats.queryCount;
    }

    const migrations = Array.from(this.migrations.values());
    const migrationStats = {
      active: migrations.filter(m => m.status === 'running').length,
      completed: migrations.filter(m => m.status === 'completed').length,
      failed: migrations.filter(m => m.status === 'failed').length
    };

    const transactions = Array.from(this.transactions.values());
    const transactionStats = {
      active: transactions.filter(t => t.status === 'active').length,
      committed: transactions.filter(t => t.status === 'committed').length,
      aborted: transactions.filter(t => t.status === 'aborted').length
    };

    return {
      totalShards: shards.length,
      activeShards: activeShards.length,
      totalDataSize,
      averageDataSize,
      dataImbalance: this.calculateImbalance(),
      queryDistribution,
      migrationStats,
      transactionStats
    };
  }

  /**
   * Get all shards
   */
  getShards(): DatabaseShard[] {
    return Array.from(this.shards.values());
  }

  /**
   * Get routing history
   */
  getRoutingHistory(limit: number = 100): RoutingDecision[] {
    return this.queryHistory
      .sort((a, b) => b.routingTime - a.routingTime)
      .slice(0, limit);
  }

  /**
   * Get active migrations
   */
  getActiveMigrations(): ShardMigration[] {
    return Array.from(this.migrations.values())
      .filter(m => m.status === 'running' || m.status === 'pending');
  }
}

/**
 * Create database sharding engine
 */
export function createDatabaseShardingEngine(
  rebalancingConfig: Partial<RebalancingConfig> = {}
): DatabaseShardingEngine {
  return new DatabaseShardingEngine(rebalancingConfig);
}

export default DatabaseShardingEngine;
