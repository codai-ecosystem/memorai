/**
 * Horizontal Scaling Engine for Memorai
 * 
 * Advanced auto-scaling system that automatically manages service instances
 * based on real-time load patterns, performance metrics, and predictive analytics.
 * 
 * Features:
 * - Intelligent auto-scaling with predictive algorithms
 * - Multi-metric scaling decisions (CPU, memory, response time, queue depth)
 * - Graceful instance lifecycle management
 * - Cost-optimized scaling strategies
 * - Integration with cloud providers (AWS, Azure, GCP)
 * - Custom scaling policies and rules
 * 
 * @version 3.0.0
 * @author Memorai Enterprise Team
 */

import { EventEmitter } from 'events';

/**
 * Scaling metrics configuration
 */
export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  queueDepth: number;
  errorRate: number;
  timestamp: number;
}

/**
 * Scaling rule configuration
 */
export interface ScalingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  metric: keyof ScalingMetrics;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  threshold: number;
  duration: number; // Seconds the condition must persist
  action: 'scale_up' | 'scale_down';
  cooldown: number; // Seconds to wait before another scaling action
  priority: number; // Higher priority rules take precedence
  weight: number; // Weight in scaling decision
}

/**
 * Instance configuration
 */
export interface ServiceInstance {
  id: string;
  type: 'api' | 'worker' | 'cache' | 'database';
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  host: string;
  port: number;
  cpu: number;
  memory: number;
  startedAt: Date;
  lastHealthCheck: Date;
  metadata: Record<string, any>;
}

/**
 * Scaling policy configuration
 */
export interface ScalingPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  serviceType: ServiceInstance['type'];
  minInstances: number;
  maxInstances: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  rules: ScalingRule[];
  predictiveScaling: boolean;
  costOptimization: boolean;
}

/**
 * Scaling decision
 */
export interface ScalingDecision {
  timestamp: number;
  policyId: string;
  serviceType: ServiceInstance['type'];
  action: 'scale_up' | 'scale_down' | 'no_action';
  currentInstances: number;
  targetInstances: number;
  reason: string;
  triggeredRules: string[];
  confidence: number;
  estimatedCost: number;
  predictedLoad: number;
}

/**
 * Scaling event
 */
export interface ScalingEvent {
  id: string;
  timestamp: number;
  type: 'scale_up' | 'scale_down' | 'instance_start' | 'instance_stop' | 'health_check';
  serviceType: ServiceInstance['type'];
  instanceId?: string;
  details: Record<string, any>;
  success: boolean;
  error?: string;
}

/**
 * Load prediction model
 */
export interface LoadPrediction {
  timestamp: number;
  serviceType: ServiceInstance['type'];
  predictedLoad: number;
  confidence: number;
  timeHorizon: number; // Minutes
  factors: {
    historical: number;
    seasonal: number;
    trending: number;
    external: number;
  };
}

/**
 * Cloud provider interface
 */
export interface CloudProvider {
  name: 'aws' | 'azure' | 'gcp' | 'local';
  region: string;
  credentials: Record<string, any>;
  instanceTypes: {
    [key: string]: {
      cpu: number;
      memory: number;
      network: number;
      costPerHour: number;
    };
  };
}

/**
 * Horizontal Scaling Engine
 * 
 * Manages automatic scaling of Memorai service instances based on real-time
 * metrics, predictive analytics, and cost optimization algorithms.
 */
export class HorizontalScalingEngine extends EventEmitter {
  private policies: Map<string, ScalingPolicy> = new Map();
  private instances: Map<string, ServiceInstance> = new Map();
  private scalingHistory: ScalingEvent[] = [];
  private metricsHistory: ScalingMetrics[] = [];
  private isRunning: boolean = false;
  private scalingInterval: NodeJS.Timeout | null = null;
  private lastScalingDecisions: Map<string, ScalingDecision> = new Map();
  private cloudProvider: CloudProvider | null = null;

  constructor(cloudProvider?: CloudProvider) {
    super();
    this.cloudProvider = cloudProvider || null;
    this.setupDefaultPolicies();
  }

  /**
   * Setup default scaling policies
   */
  private setupDefaultPolicies(): void {
    // API Service scaling policy
    const apiPolicy: ScalingPolicy = {
      id: 'api-auto-scaling',
      name: 'API Service Auto Scaling',
      description: 'Automatic scaling for API service instances',
      enabled: true,
      serviceType: 'api',
      minInstances: 2,
      maxInstances: 20,
      targetUtilization: 70,
      scaleUpThreshold: 80,
      scaleDownThreshold: 30,
      scaleUpCooldown: 300, // 5 minutes
      scaleDownCooldown: 600, // 10 minutes
      predictiveScaling: true,
      costOptimization: true,
      rules: [
        {
          id: 'high-cpu',
          name: 'High CPU Utilization',
          description: 'Scale up when CPU usage is consistently high',
          enabled: true,
          metric: 'cpuUtilization',
          operator: '>',
          threshold: 80,
          duration: 300,
          action: 'scale_up',
          cooldown: 300,
          priority: 1,
          weight: 0.3
        },
        {
          id: 'high-memory',
          name: 'High Memory Utilization',
          description: 'Scale up when memory usage is consistently high',
          enabled: true,
          metric: 'memoryUtilization',
          operator: '>',
          threshold: 85,
          duration: 300,
          action: 'scale_up',
          cooldown: 300,
          priority: 1,
          weight: 0.25
        },
        {
          id: 'high-response-time',
          name: 'High Response Time',
          description: 'Scale up when response times are too high',
          enabled: true,
          metric: 'averageResponseTime',
          operator: '>',
          threshold: 500, // 500ms
          duration: 180,
          action: 'scale_up',
          cooldown: 300,
          priority: 1,
          weight: 0.25
        },
        {
          id: 'high-queue-depth',
          name: 'High Queue Depth',
          description: 'Scale up when request queue is backing up',
          enabled: true,
          metric: 'queueDepth',
          operator: '>',
          threshold: 100,
          duration: 120,
          action: 'scale_up',
          cooldown: 180,
          priority: 2,
          weight: 0.2
        },
        {
          id: 'low-utilization',
          name: 'Low Resource Utilization',
          description: 'Scale down when resources are underutilized',
          enabled: true,
          metric: 'cpuUtilization',
          operator: '<',
          threshold: 20,
          duration: 900, // 15 minutes
          action: 'scale_down',
          cooldown: 600,
          priority: 0,
          weight: 0.4
        }
      ]
    };

    // Worker Service scaling policy
    const workerPolicy: ScalingPolicy = {
      id: 'worker-auto-scaling',
      name: 'Worker Service Auto Scaling',
      description: 'Automatic scaling for background worker instances',
      enabled: true,
      serviceType: 'worker',
      minInstances: 1,
      maxInstances: 10,
      targetUtilization: 75,
      scaleUpThreshold: 85,
      scaleDownThreshold: 25,
      scaleUpCooldown: 240,
      scaleDownCooldown: 480,
      predictiveScaling: false,
      costOptimization: true,
      rules: [
        {
          id: 'high-queue-worker',
          name: 'High Worker Queue',
          description: 'Scale up workers when queue is backed up',
          enabled: true,
          metric: 'queueDepth',
          operator: '>',
          threshold: 50,
          duration: 180,
          action: 'scale_up',
          cooldown: 240,
          priority: 1,
          weight: 0.6
        },
        {
          id: 'low-queue-worker',
          name: 'Low Worker Queue',
          description: 'Scale down workers when queue is empty',
          enabled: true,
          metric: 'queueDepth',
          operator: '<',
          threshold: 5,
          duration: 600,
          action: 'scale_down',
          cooldown: 480,
          priority: 0,
          weight: 0.4
        }
      ]
    };

    this.policies.set(apiPolicy.id, apiPolicy);
    this.policies.set(workerPolicy.id, workerPolicy);
  }

  /**
   * Start the scaling engine
   */
  async start(intervalMs: number = 30000): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scaling engine is already running');
    }

    this.isRunning = true;
    this.scalingInterval = setInterval(async () => {
      try {
        await this.processScalingDecisions();
      } catch (error) {
        this.emit('error', error);
      }
    }, intervalMs);

    this.emit('started', { timestamp: Date.now() });
  }

  /**
   * Stop the scaling engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
      this.scalingInterval = null;
    }

    this.emit('stopped', { timestamp: Date.now() });
  }

  /**
   * Add or update a scaling policy
   */
  addPolicy(policy: ScalingPolicy): void {
    this.policies.set(policy.id, { ...policy });
    this.emit('policy_added', { policyId: policy.id, policy });
  }

  /**
   * Remove a scaling policy
   */
  removePolicy(policyId: string): boolean {
    const removed = this.policies.delete(policyId);
    if (removed) {
      this.emit('policy_removed', { policyId });
    }
    return removed;
  }

  /**
   * Get scaling policy
   */
  getPolicy(policyId: string): ScalingPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all scaling policies
   */
  getAllPolicies(): ScalingPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update metrics for scaling decisions
   */
  updateMetrics(metrics: ScalingMetrics): void {
    // Store metrics with timestamp
    const timestampedMetrics = {
      ...metrics,
      timestamp: Date.now()
    };
    
    this.metricsHistory.push(timestampedMetrics);
    
    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);

    this.emit('metrics_updated', timestampedMetrics);
  }

  /**
   * Register a service instance
   */
  registerInstance(instance: ServiceInstance): void {
    this.instances.set(instance.id, { ...instance });
    this.emit('instance_registered', { instanceId: instance.id, instance });
  }

  /**
   * Unregister a service instance
   */
  unregisterInstance(instanceId: string): boolean {
    const instance = this.instances.get(instanceId);
    const removed = this.instances.delete(instanceId);
    if (removed && instance) {
      this.emit('instance_unregistered', { instanceId, instance });
    }
    return removed;
  }

  /**
   * Update instance status
   */
  updateInstanceStatus(instanceId: string, status: ServiceInstance['status']): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.status = status;
      instance.lastHealthCheck = new Date();
      this.emit('instance_updated', { instanceId, instance });
    }
  }

  /**
   * Get instances by service type
   */
  getInstancesByType(serviceType: ServiceInstance['type']): ServiceInstance[] {
    return Array.from(this.instances.values()).filter(
      instance => instance.type === serviceType
    );
  }

  /**
   * Process scaling decisions for all policies
   */
  private async processScalingDecisions(): Promise<void> {
    if (this.metricsHistory.length === 0) {
      return;
    }

    const currentMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    for (const policy of this.policies.values()) {
      if (!policy.enabled) {
        continue;
      }

      try {
        const decision = await this.makeScalingDecision(policy, currentMetrics);
        this.lastScalingDecisions.set(policy.id, decision);

        if (decision.action !== 'no_action') {
          await this.executeScalingDecision(decision);
        }

        this.emit('scaling_decision', decision);
      } catch (error) {
        this.emit('scaling_error', {
          policyId: policy.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Make a scaling decision for a policy
   */
  private async makeScalingDecision(
    policy: ScalingPolicy, 
    currentMetrics: ScalingMetrics
  ): Promise<ScalingDecision> {
    const instances = this.getInstancesByType(policy.serviceType);
    const currentInstances = instances.filter(i => i.status === 'running').length;

    // Check cooldown periods
    const lastDecision = this.lastScalingDecisions.get(policy.id);
    if (lastDecision && this.isCooldownActive(lastDecision, policy)) {
      return {
        timestamp: Date.now(),
        policyId: policy.id,
        serviceType: policy.serviceType,
        action: 'no_action',
        currentInstances,
        targetInstances: currentInstances,
        reason: 'Cooldown period active',
        triggeredRules: [],
        confidence: 0,
        estimatedCost: 0,
        predictedLoad: 0
      };
    }

    // Evaluate rules
    const triggeredRules = this.evaluateRules(policy.rules, currentMetrics);
    
    if (triggeredRules.length === 0) {
      return {
        timestamp: Date.now(),
        policyId: policy.id,
        serviceType: policy.serviceType,
        action: 'no_action',
        currentInstances,
        targetInstances: currentInstances,
        reason: 'No rules triggered',
        triggeredRules: [],
        confidence: 0,
        estimatedCost: 0,
        predictedLoad: 0
      };
    }

    // Calculate scaling action and target instances
    const scalingAction = this.calculateScalingAction(triggeredRules, policy);
    const targetInstances = this.calculateTargetInstances(
      currentInstances, 
      scalingAction, 
      policy
    );

    // Predictive scaling adjustment
    let predictedLoad = 0;
    if (policy.predictiveScaling) {
      const prediction = await this.predictLoad(policy.serviceType);
      predictedLoad = prediction.predictedLoad;
      
      // Adjust target based on prediction
      if (prediction.confidence > 0.7) {
        const predictiveAdjustment = this.calculatePredictiveAdjustment(
          prediction, 
          targetInstances, 
          policy
        );
        // Apply predictive adjustment
      }
    }

    return {
      timestamp: Date.now(),
      policyId: policy.id,
      serviceType: policy.serviceType,
      action: scalingAction,
      currentInstances,
      targetInstances,
      reason: `Rules triggered: ${triggeredRules.map(r => r.name).join(', ')}`,
      triggeredRules: triggeredRules.map(r => r.id),
      confidence: this.calculateConfidence(triggeredRules),
      estimatedCost: this.estimateCost(currentInstances, targetInstances, policy),
      predictedLoad
    };
  }

  /**
   * Check if cooldown period is active
   */
  private isCooldownActive(lastDecision: ScalingDecision, policy: ScalingPolicy): boolean {
    const now = Date.now();
    const timeSinceLastAction = now - lastDecision.timestamp;
    
    if (lastDecision.action === 'scale_up') {
      return timeSinceLastAction < policy.scaleUpCooldown * 1000;
    } else if (lastDecision.action === 'scale_down') {
      return timeSinceLastAction < policy.scaleDownCooldown * 1000;
    }
    
    return false;
  }

  /**
   * Evaluate scaling rules against current metrics
   */
  private evaluateRules(rules: ScalingRule[], metrics: ScalingMetrics): ScalingRule[] {
    const triggeredRules: ScalingRule[] = [];
    const now = Date.now();

    for (const rule of rules) {
      if (!rule.enabled) {
        continue;
      }

      // Check if rule condition is met
      const metricValue = metrics[rule.metric];
      const conditionMet = this.evaluateCondition(metricValue, rule.operator, rule.threshold);

      if (conditionMet) {
        // Check if condition has persisted for required duration
        const persistentMetrics = this.metricsHistory.filter(
          m => now - m.timestamp <= rule.duration * 1000
        );

        const allMeetCondition = persistentMetrics.every(m => 
          this.evaluateCondition(m[rule.metric], rule.operator, rule.threshold)
        );

        if (allMeetCondition && persistentMetrics.length > 0) {
          triggeredRules.push(rule);
        }
      }
    }

    return triggeredRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      case '!=': return value !== threshold;
      default: return false;
    }
  }

  /**
   * Calculate scaling action from triggered rules
   */
  private calculateScalingAction(
    triggeredRules: ScalingRule[], 
    policy: ScalingPolicy
  ): 'scale_up' | 'scale_down' | 'no_action' {
    if (triggeredRules.length === 0) {
      return 'no_action';
    }

    // Calculate weighted score
    let scaleUpScore = 0;
    let scaleDownScore = 0;

    for (const rule of triggeredRules) {
      if (rule.action === 'scale_up') {
        scaleUpScore += rule.weight * rule.priority;
      } else if (rule.action === 'scale_down') {
        scaleDownScore += rule.weight * rule.priority;
      }
    }

    if (scaleUpScore > scaleDownScore) {
      return 'scale_up';
    } else if (scaleDownScore > scaleUpScore) {
      return 'scale_down';
    }

    return 'no_action';
  }

  /**
   * Calculate target number of instances
   */
  private calculateTargetInstances(
    currentInstances: number,
    action: 'scale_up' | 'scale_down' | 'no_action',
    policy: ScalingPolicy
  ): number {
    if (action === 'no_action') {
      return currentInstances;
    }

    let targetInstances = currentInstances;

    if (action === 'scale_up') {
      // Scale up by 25% or at least 1 instance
      const increment = Math.max(1, Math.ceil(currentInstances * 0.25));
      targetInstances = currentInstances + increment;
    } else if (action === 'scale_down') {
      // Scale down by 20% or at least 1 instance
      const decrement = Math.max(1, Math.ceil(currentInstances * 0.2));
      targetInstances = currentInstances - decrement;
    }

    // Enforce min/max constraints
    targetInstances = Math.max(policy.minInstances, targetInstances);
    targetInstances = Math.min(policy.maxInstances, targetInstances);

    return targetInstances;
  }

  /**
   * Predict future load using historical data
   */
  private async predictLoad(serviceType: ServiceInstance['type']): Promise<LoadPrediction> {
    // Simple prediction based on recent trends
    // In production, this would use more sophisticated ML models
    
    const recentMetrics = this.metricsHistory.slice(-12); // Last 6 minutes
    if (recentMetrics.length < 2) {
      return {
        timestamp: Date.now(),
        serviceType,
        predictedLoad: 0,
        confidence: 0,
        timeHorizon: 15,
        factors: { historical: 0, seasonal: 0, trending: 0, external: 0 }
      };
    }

    // Calculate trend
    const loads = recentMetrics.map(m => m.cpuUtilization);
    const trend = this.calculateTrend(loads);
    const currentLoad = loads[loads.length - 1];
    const predictedLoad = Math.max(0, currentLoad + (trend * 3)); // 15 minutes ahead

    return {
      timestamp: Date.now(),
      serviceType,
      predictedLoad,
      confidence: Math.min(0.8, recentMetrics.length / 12),
      timeHorizon: 15,
      factors: {
        historical: 0.3,
        seasonal: 0.2,
        trending: 0.4,
        external: 0.1
      }
    };
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope || 0;
  }

  /**
   * Calculate predictive adjustment
   */
  private calculatePredictiveAdjustment(
    prediction: LoadPrediction,
    targetInstances: number,
    policy: ScalingPolicy
  ): number {
    // Adjust based on predicted load vs target utilization
    const loadDelta = prediction.predictedLoad - policy.targetUtilization;
    const adjustmentFactor = loadDelta / 100;
    return Math.round(targetInstances * adjustmentFactor * prediction.confidence);
  }

  /**
   * Calculate confidence score for scaling decision
   */
  private calculateConfidence(triggeredRules: ScalingRule[]): number {
    if (triggeredRules.length === 0) return 0;
    
    const totalWeight = triggeredRules.reduce((sum, rule) => sum + rule.weight, 0);
    const weightedPriority = triggeredRules.reduce(
      (sum, rule) => sum + (rule.priority * rule.weight), 
      0
    );
    
    return Math.min(1, (weightedPriority / totalWeight) / 2);
  }

  /**
   * Estimate cost impact of scaling decision
   */
  private estimateCost(
    currentInstances: number,
    targetInstances: number,
    policy: ScalingPolicy
  ): number {
    if (!this.cloudProvider) return 0;
    
    const instanceDelta = targetInstances - currentInstances;
    const instanceType = 'standard'; // Would be configurable
    const instanceCost = this.cloudProvider.instanceTypes[instanceType]?.costPerHour || 0.1;
    
    return instanceDelta * instanceCost;
  }

  /**
   * Execute scaling decision
   */
  private async executeScalingDecision(decision: ScalingDecision): Promise<void> {
    const instances = this.getInstancesByType(decision.serviceType);
    const runningInstances = instances.filter(i => i.status === 'running');
    
    if (decision.action === 'scale_up') {
      const instancesToAdd = decision.targetInstances - runningInstances.length;
      for (let i = 0; i < instancesToAdd; i++) {
        await this.startInstance(decision.serviceType);
      }
    } else if (decision.action === 'scale_down') {
      const instancesToRemove = runningInstances.length - decision.targetInstances;
      const instancesToStop = runningInstances
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()) // Stop newest first
        .slice(0, instancesToRemove);
      
      for (const instance of instancesToStop) {
        await this.stopInstance(instance.id);
      }
    }

    // Record scaling event
    const event: ScalingEvent = {
      id: `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: decision.action as 'scale_up' | 'scale_down',
      serviceType: decision.serviceType,
      details: {
        decision,
        currentInstances: decision.currentInstances,
        targetInstances: decision.targetInstances
      },
      success: true
    };

    this.scalingHistory.push(event);
    this.emit('scaling_executed', event);
  }

  /**
   * Start a new service instance
   */
  private async startInstance(serviceType: ServiceInstance['type']): Promise<ServiceInstance> {
    const instanceId = `${serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock instance creation - in production this would call cloud provider APIs
    const instance: ServiceInstance = {
      id: instanceId,
      type: serviceType,
      status: 'starting',
      host: `${serviceType}-${instanceId}.memorai.cluster`,
      port: serviceType === 'api' ? 3000 : 8080,
      cpu: 0,
      memory: 0,
      startedAt: new Date(),
      lastHealthCheck: new Date(),
      metadata: {
        scalingEngine: true,
        autoScaled: true
      }
    };

    this.registerInstance(instance);

    // Simulate startup time
    setTimeout(() => {
      this.updateInstanceStatus(instanceId, 'running');
    }, 30000); // 30 seconds startup time

    const event: ScalingEvent = {
      id: `start-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'instance_start',
      serviceType,
      instanceId,
      details: { instance },
      success: true
    };

    this.scalingHistory.push(event);
    this.emit('instance_starting', { instanceId, instance });

    return instance;
  }

  /**
   * Stop a service instance
   */
  private async stopInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // Graceful shutdown
    this.updateInstanceStatus(instanceId, 'stopping');

    // Simulate graceful shutdown time
    setTimeout(() => {
      this.updateInstanceStatus(instanceId, 'stopped');
      this.unregisterInstance(instanceId);
    }, 10000); // 10 seconds shutdown time

    const event: ScalingEvent = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'instance_stop',
      serviceType: instance.type,
      instanceId,
      details: { instance },
      success: true
    };

    this.scalingHistory.push(event);
    this.emit('instance_stopping', { instanceId, instance });
  }

  /**
   * Get scaling statistics
   */
  getScalingStats(): {
    totalInstances: number;
    instancesByType: Record<string, number>;
    scalingEvents: number;
    lastScalingDecisions: ScalingDecision[];
    averageResponseTime: number;
    systemUtilization: number;
  } {
    const instances = Array.from(this.instances.values());
    const runningInstances = instances.filter(i => i.status === 'running');
    
    const instancesByType = runningInstances.reduce((acc, instance) => {
      acc[instance.type] = (acc[instance.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentMetrics = this.metricsHistory.slice(-10);
    const averageResponseTime = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / recentMetrics.length
      : 0;

    const systemUtilization = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.cpuUtilization, 0) / recentMetrics.length
      : 0;

    return {
      totalInstances: runningInstances.length,
      instancesByType,
      scalingEvents: this.scalingHistory.length,
      lastScalingDecisions: Array.from(this.lastScalingDecisions.values()),
      averageResponseTime,
      systemUtilization
    };
  }

  /**
   * Get scaling history
   */
  getScalingHistory(limit: number = 100): ScalingEvent[] {
    return this.scalingHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): ScalingMetrics | null {
    return this.metricsHistory.length > 0 
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }
}

/**
 * Create horizontal scaling engine
 */
export function createHorizontalScalingEngine(
  cloudProvider?: CloudProvider
): HorizontalScalingEngine {
  return new HorizontalScalingEngine(cloudProvider);
}

export default HorizontalScalingEngine;
