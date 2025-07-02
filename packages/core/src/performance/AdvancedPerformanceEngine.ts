/**
 * @fileoverview Performance Engineering Implementation (Phase 1.2)
 * Sub-10ms query optimization with multi-tier caching
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import {
  AdvancedEventBus,
  MemoryEventType,
} from '../events/EventDrivenArchitecture.js';
import {
  CachePort,
  MonitoringPort,
} from '../hexagonal/HexagonalArchitecture.js';

// Performance Configuration
export interface PerformanceConfig {
  targetQueryTime: number; // Target query response time in ms
  cacheConfig: {
    l1: { size: number; ttl: number }; // Memory cache
    l2: { size: number; ttl: number }; // Redis cache
    l3: { size: number; ttl: number }; // Distributed cache
  };
  preloadingConfig: {
    enabled: boolean;
    strategies: string[];
    batchSize: number;
  };
  compressionConfig: {
    enabled: boolean;
    threshold: number; // Compress data larger than this
    algorithm: 'gzip' | 'brotli' | 'lz4';
  };
  optimizationConfig: {
    enableBatching: boolean;
    batchSize: number;
    enablePipelining: boolean;
    enableQueryPlan: boolean;
  };
}

// Performance Metrics
export interface PerformanceMetrics {
  queryTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  cacheMetrics: {
    l1: { hits: number; misses: number; hitRate: number };
    l2: { hits: number; misses: number; hitRate: number };
    l3: { hits: number; misses: number; hitRate: number };
    overall: { hits: number; misses: number; hitRate: number };
  };
  throughput: {
    queriesPerSecond: number;
    operationsPerSecond: number;
  };
  resourceUsage: {
    memoryUsage: number;
    cpuUsage: number;
    networkIO: number;
  };
}

// Query Performance Tracker
export class QueryPerformanceTracker {
  private queryTimes: number[] = [];
  private maxSamples: number = 10000;

  recordQuery(duration: number): void {
    this.queryTimes.push(duration);

    // Keep only recent samples
    if (this.queryTimes.length > this.maxSamples) {
      this.queryTimes = this.queryTimes.slice(-this.maxSamples);
    }
  }

  getMetrics(): PerformanceMetrics['queryTime'] {
    if (this.queryTimes.length === 0) {
      return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }

    const sorted = [...this.queryTimes].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      avg: this.queryTimes.reduce((sum, time) => sum + time, 0) / len,
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      min: sorted[0],
      max: sorted[len - 1],
    };
  }

  isPerformingWell(targetTime: number): boolean {
    const metrics = this.getMetrics();
    return metrics.p95 <= targetTime;
  }
}

// Multi-Tier Cache System
export class MultiTierCache implements CachePort {
  private l1Cache: Map<string, CacheEntry> = new Map(); // Memory
  private l2Cache: CachePort; // Redis
  private l3Cache: CachePort; // Distributed
  private config: PerformanceConfig['cacheConfig'];
  private metrics = {
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    l3: { hits: 0, misses: 0 },
  };

  constructor(
    l2Cache: CachePort,
    l3Cache: CachePort,
    config: PerformanceConfig['cacheConfig']
  ) {
    this.l2Cache = l2Cache;
    this.l3Cache = l3Cache;
    this.config = config;

    // L1 cleanup
    setInterval(() => this.cleanupL1Cache(), 60000); // Every minute
  }

  async get<T>(key: string): Promise<T | null> {
    // L1 Cache (Memory) - fastest
    const l1Result = this.getFromL1<T>(key);
    if (l1Result !== null) {
      this.metrics.l1.hits++;
      return l1Result;
    }
    this.metrics.l1.misses++;

    // L2 Cache (Redis) - fast
    try {
      const l2Result = await this.l2Cache.get<T>(key);
      if (l2Result !== null) {
        this.metrics.l2.hits++;
        // Promote to L1
        await this.setL1(key, l2Result, this.config.l1.ttl);
        return l2Result;
      }
      this.metrics.l2.misses++;
    } catch (error) {
      console.warn('L2 cache error:', error);
    }

    // L3 Cache (Distributed) - slower but comprehensive
    try {
      const l3Result = await this.l3Cache.get<T>(key);
      if (l3Result !== null) {
        this.metrics.l3.hits++;
        // Promote to L2 and L1
        await Promise.all([
          this.l2Cache.set(key, l3Result, this.config.l2.ttl),
          this.setL1(key, l3Result, this.config.l1.ttl),
        ]);
        return l3Result;
      }
      this.metrics.l3.misses++;
    } catch (error) {
      console.warn('L3 cache error:', error);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in all cache tiers
    await Promise.all([
      this.setL1(key, value, ttl || this.config.l1.ttl),
      this.l2Cache
        .set(key, value, ttl || this.config.l2.ttl)
        .catch(console.warn),
      this.l3Cache
        .set(key, value, ttl || this.config.l3.ttl)
        .catch(console.warn),
    ]);
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await Promise.all([
      this.l2Cache.delete(key).catch(console.warn),
      this.l3Cache.delete(key).catch(console.warn),
    ]);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.l1Cache) {
        if (regex.test(key)) {
          this.l1Cache.delete(key);
        }
      }
    } else {
      this.l1Cache.clear();
    }

    await Promise.all([
      this.l2Cache.clear(pattern).catch(console.warn),
      this.l3Cache.clear(pattern).catch(console.warn),
    ]);
  }

  async exists(key: string): Promise<boolean> {
    if (this.l1Cache.has(key)) return true;

    try {
      if (await this.l2Cache.exists(key)) return true;
      return await this.l3Cache.exists(key);
    } catch {
      return false;
    }
  }

  getCacheMetrics(): PerformanceMetrics['cacheMetrics'] {
    const l1 = this.metrics.l1;
    const l2 = this.metrics.l2;
    const l3 = this.metrics.l3;

    const totalHits = l1.hits + l2.hits + l3.hits;
    const totalMisses = l1.misses + l2.misses + l3.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      l1: {
        hits: l1.hits,
        misses: l1.misses,
        hitRate: totalRequests > 0 ? l1.hits / totalRequests : 0,
      },
      l2: {
        hits: l2.hits,
        misses: l2.misses,
        hitRate: totalRequests > 0 ? l2.hits / totalRequests : 0,
      },
      l3: {
        hits: l3.hits,
        misses: l3.misses,
        hitRate: totalRequests > 0 ? l3.hits / totalRequests : 0,
      },
      overall: {
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      },
    };
  }

  private getFromL1<T>(key: string): T | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.l1Cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  private async setL1<T>(key: string, value: T, ttl: number): Promise<void> {
    // Evict if at capacity
    if (this.l1Cache.size >= this.config.l1.size) {
      const firstKey = this.l1Cache.keys().next().value;
      if (firstKey) {
        this.l1Cache.delete(firstKey);
      }
    }

    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  private cleanupL1Cache(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache) {
      if (now > entry.expiresAt) {
        this.l1Cache.delete(key);
      }
    }
  }
}

// Query Optimizer with Plan Generation
export class QueryOptimizer {
  private queryPlans: Map<string, QueryPlan> = new Map();
  private planStats: Map<string, PlanStats> = new Map();

  generateQueryPlan(query: any): QueryPlan {
    const queryHash = this.hashQuery(query);
    const existingPlan = this.queryPlans.get(queryHash);

    if (existingPlan && this.isPlanEffective(queryHash)) {
      return existingPlan;
    }

    // Generate optimized query plan
    const plan: QueryPlan = {
      id: queryHash,
      steps: this.optimizeQuerySteps(query),
      estimatedCost: 0,
      cacheStrategy: this.determineCacheStrategy(query),
      parallelization: this.determineParallelization(query),
      indexHints: this.generateIndexHints(query),
    };

    plan.estimatedCost = this.calculatePlanCost(plan);
    this.queryPlans.set(queryHash, plan);

    return plan;
  }

  recordPlanExecution(planId: string, actualDuration: number): void {
    const stats = this.planStats.get(planId) || {
      executions: 0,
      totalTime: 0,
      avgTime: 0,
      lastUpdated: Date.now(),
    };

    stats.executions++;
    stats.totalTime += actualDuration;
    stats.avgTime = stats.totalTime / stats.executions;
    stats.lastUpdated = Date.now();

    this.planStats.set(planId, stats);
  }

  private optimizeQuerySteps(query: any): QueryStep[] {
    const steps: QueryStep[] = [];

    // Vector search optimization
    if (query.embedding) {
      steps.push({
        type: 'vector_search',
        operation: 'similarity_search',
        optimizations: ['use_approximate_search', 'limit_early'],
        estimatedTime: 5,
      });
    }

    // Filter optimization
    if (query.filters) {
      steps.push({
        type: 'filter',
        operation: 'apply_filters',
        optimizations: ['index_scan', 'early_termination'],
        estimatedTime: 2,
      });
    }

    // Result assembly
    steps.push({
      type: 'assembly',
      operation: 'build_results',
      optimizations: ['lazy_loading', 'batch_processing'],
      estimatedTime: 3,
    });

    return steps;
  }

  private determineCacheStrategy(query: any): CacheStrategy {
    // Simple heuristics - could be ML-based
    if (query.limit && query.limit <= 10) {
      return { tier: 'l1', ttl: 300 }; // 5 minutes in memory
    }
    if (query.type === 'exact_match') {
      return { tier: 'l2', ttl: 900 }; // 15 minutes in Redis
    }
    return { tier: 'l3', ttl: 3600 }; // 1 hour in distributed cache
  }

  private determineParallelization(query: any): ParallelizationStrategy {
    if (query.limit && query.limit > 50) {
      return {
        enabled: true,
        concurrency: 4,
        chunkSize: Math.ceil(query.limit / 4),
      };
    }
    return { enabled: false, concurrency: 1, chunkSize: 0 };
  }

  private generateIndexHints(query: any): string[] {
    const hints: string[] = [];

    if (query.type) hints.push('use_type_index');
    if (query.agentId) hints.push('use_agent_index');
    if (query.timeRange) hints.push('use_time_index');

    return hints;
  }

  private calculatePlanCost(plan: QueryPlan): number {
    return plan.steps.reduce((total, step) => total + step.estimatedTime, 0);
  }

  private hashQuery(query: any): string {
    // Simple hash - in production would use more sophisticated method
    return Buffer.from(JSON.stringify(query)).toString('base64').slice(0, 16);
  }

  private isPlanEffective(planId: string): boolean {
    const stats = this.planStats.get(planId);
    if (!stats) return false;

    // Consider plan effective if average time is reasonable and recently used
    const isRecent = Date.now() - stats.lastUpdated < 3600000; // 1 hour
    const isEffective = stats.avgTime < 10; // Target 10ms

    return isRecent && isEffective;
  }
}

// Performance Optimizer Engine
export class PerformanceOptimizer extends EventEmitter {
  private config: PerformanceConfig;
  private queryTracker: QueryPerformanceTracker;
  private cache: MultiTierCache;
  private queryOptimizer: QueryOptimizer;
  private monitoring: MonitoringPort;
  private eventBus: AdvancedEventBus;

  constructor(
    config: PerformanceConfig,
    l2Cache: CachePort,
    l3Cache: CachePort,
    monitoring: MonitoringPort,
    eventBus: AdvancedEventBus
  ) {
    super();
    this.config = config;
    this.queryTracker = new QueryPerformanceTracker();
    this.cache = new MultiTierCache(l2Cache, l3Cache, config.cacheConfig);
    this.queryOptimizer = new QueryOptimizer();
    this.monitoring = monitoring;
    this.eventBus = eventBus;

    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  // Optimized query execution wrapper
  async executeOptimizedQuery<T>(
    queryFn: () => Promise<T>,
    queryContext: any
  ): Promise<T> {
    const startTime = performance.now();

    try {
      // Generate query plan
      const plan = this.queryOptimizer.generateQueryPlan(queryContext);

      // Check cache first
      const cacheKey = this.generateCacheKey(queryContext);
      const cachedResult = await this.cache.get<T>(cacheKey);

      if (cachedResult !== null) {
        const duration = performance.now() - startTime;
        this.recordQueryPerformance(duration, true);
        return cachedResult;
      }

      // Execute optimized query
      const result = await this.executeWithOptimizations(queryFn, plan);

      // Cache result
      await this.cache.set(cacheKey, result, plan.cacheStrategy.ttl);

      const duration = performance.now() - startTime;
      this.recordQueryPerformance(duration, false);
      this.queryOptimizer.recordPlanExecution(plan.id, duration);

      // Check if performance target is met
      if (duration > this.config.targetQueryTime) {
        await this.handleSlowQuery(queryContext, duration, plan);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      await this.monitoring.recordError(error as Error, {
        operation: 'optimized_query',
        duration,
        queryContext,
      });
      throw error;
    }
  }

  // Get comprehensive performance metrics
  getPerformanceMetrics(): PerformanceMetrics {
    const queryMetrics = this.queryTracker.getMetrics();
    const cacheMetrics = this.cache.getCacheMetrics();

    return {
      queryTime: queryMetrics,
      cacheMetrics,
      throughput: {
        queriesPerSecond: this.calculateQPS(),
        operationsPerSecond: this.calculateOPS(),
      },
      resourceUsage: {
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        cpuUsage: process.cpuUsage().user / 1000, // ms
        networkIO: 0, // Would be implemented with proper monitoring
      },
    };
  }

  // Performance optimization recommendations
  generateOptimizationRecommendations(): string[] {
    const metrics = this.getPerformanceMetrics();
    const recommendations: string[] = [];

    if (metrics.queryTime.p95 > this.config.targetQueryTime) {
      recommendations.push(
        'Query performance is below target - consider query optimization'
      );
    }

    if (metrics.cacheMetrics.overall.hitRate < 0.7) {
      recommendations.push('Cache hit rate is low - review caching strategy');
    }

    if (metrics.resourceUsage.memoryUsage > 500) {
      recommendations.push(
        'High memory usage detected - consider garbage collection tuning'
      );
    }

    return recommendations;
  }

  private async executeWithOptimizations<T>(
    queryFn: () => Promise<T>,
    plan: QueryPlan
  ): Promise<T> {
    if (plan.parallelization.enabled) {
      // Execute with parallelization if beneficial
      return this.executeParallel(queryFn, plan.parallelization);
    }

    // Standard execution with monitoring
    return queryFn();
  }

  private async executeParallel<T>(
    queryFn: () => Promise<T>,
    strategy: ParallelizationStrategy
  ): Promise<T> {
    // Simplified parallel execution - would implement proper chunking
    return queryFn();
  }

  private recordQueryPerformance(duration: number, fromCache: boolean): void {
    this.queryTracker.recordQuery(duration);

    this.monitoring.recordMetric('query.duration', duration, {
      cached: fromCache.toString(),
    });

    this.monitoring.recordMetric('query.count', 1, {
      cached: fromCache.toString(),
    });
  }

  private async handleSlowQuery(
    queryContext: any,
    duration: number,
    plan: QueryPlan
  ): Promise<void> {
    await this.monitoring.recordEvent('slow_query_detected', {
      duration,
      planId: plan.id,
      estimatedCost: plan.estimatedCost,
      queryContext,
    });

    this.emit('slow_query', {
      duration,
      queryContext,
      plan,
      recommendations: this.generateQueryOptimizations(queryContext, plan),
    });
  }

  private generateQueryOptimizations(
    queryContext: any,
    plan: QueryPlan
  ): string[] {
    const optimizations: string[] = [];

    if (plan.estimatedCost > 20) {
      optimizations.push('Consider adding more specific filters');
    }

    if (!plan.indexHints.length) {
      optimizations.push('Query could benefit from better indexing');
    }

    return optimizations;
  }

  private generateCacheKey(queryContext: any): string {
    // Create deterministic cache key
    const normalized = {
      ...queryContext,
      // Remove non-deterministic fields
      timestamp: undefined,
      requestId: undefined,
    };

    return `query:${Buffer.from(JSON.stringify(normalized)).toString('base64')}`;
  }

  private calculateQPS(): number {
    // Simple calculation - would use time-windowed approach in production
    const metrics = this.queryTracker.getMetrics();
    return metrics.avg > 0 ? 1000 / metrics.avg : 0;
  }

  private calculateOPS(): number {
    // Operations per second - would track all operations, not just queries
    return this.calculateQPS() * 1.5; // Estimate based on query ratio
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe(MemoryEventType.PERFORMANCE_METRIC, async event => {
      const data = event.data as any;
      if (data?.metric === 'slow_query') {
        // Handle slow query events
        await this.optimizeForSlowQueries();
      }
    });
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();

      // Record performance metrics
      this.monitoring.recordMetric(
        'performance.query_time.p95',
        metrics.queryTime.p95
      );
      this.monitoring.recordMetric(
        'performance.cache_hit_rate',
        metrics.cacheMetrics.overall.hitRate
      );
      this.monitoring.recordMetric(
        'performance.memory_usage',
        metrics.resourceUsage.memoryUsage
      );

      // Check performance thresholds
      if (metrics.queryTime.p95 > this.config.targetQueryTime * 2) {
        this.monitoring.createAlert(
          'high_query_latency',
          `Query latency P95 (${metrics.queryTime.p95}ms) exceeds threshold`
        );
      }
    }, 30000); // Every 30 seconds
  }

  private async optimizeForSlowQueries(): Promise<void> {
    // Implement automatic optimization strategies
    const recommendations = this.generateOptimizationRecommendations();

    for (const recommendation of recommendations) {
      this.emit('optimization_recommendation', recommendation);
    }
  }
}

// Supporting interfaces
interface CacheEntry {
  value: any;
  expiresAt: number;
}

interface QueryPlan {
  id: string;
  steps: QueryStep[];
  estimatedCost: number;
  cacheStrategy: CacheStrategy;
  parallelization: ParallelizationStrategy;
  indexHints: string[];
}

interface QueryStep {
  type: string;
  operation: string;
  optimizations: string[];
  estimatedTime: number;
}

interface CacheStrategy {
  tier: 'l1' | 'l2' | 'l3';
  ttl: number;
}

interface ParallelizationStrategy {
  enabled: boolean;
  concurrency: number;
  chunkSize: number;
}

interface PlanStats {
  executions: number;
  totalTime: number;
  avgTime: number;
  lastUpdated: number;
}

export default PerformanceOptimizer;
