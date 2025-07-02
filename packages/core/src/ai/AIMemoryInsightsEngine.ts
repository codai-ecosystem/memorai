/**
 * AI-Powered Memory Insights Engine
 * 
 * Advanced AI system that provides intelligent insights, predictions, and recommendations
 * for enterprise memory operations. Uses machine learning to optimize memory usage patterns,
 * predict user needs, and provide intelligent automation.
 */

import { EventEmitter } from 'events';

export interface MemoryInsight {
  id: string;
  type: 'pattern' | 'prediction' | 'recommendation' | 'anomaly' | 'optimization';
  category: 'usage' | 'performance' | 'security' | 'business' | 'technical' | 'optimization';
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  evidence: Array<{
    source: string;
    data: any;
    weight: number;
  }>;
  recommendations: Array<{
    action: string;
    priority: number;
    estimatedBenefit: string;
    implementation: string;
  }>;
  timestamp: Date;
  expiresAt?: Date;
  tenantId?: string;
  agentId?: string;
}

export interface MemoryPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  strength: number;
  participants: Array<{
    entityType: 'tenant' | 'agent' | 'memory_type' | 'operation';
    entityId: string;
    involvement: number;
  }>;
  timePattern: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
  correlations: Array<{
    patternId: string;
    correlation: number;
    causation?: 'causes' | 'caused_by' | 'correlates';
  }>;
  metadata: Record<string, any>;
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'memory_usage' | 'performance' | 'growth' | 'churn' | 'optimization';
  algorithm: 'linear_regression' | 'neural_network' | 'time_series' | 'ensemble';
  accuracy: number;
  lastTrained: Date;
  nextTraining: Date;
  features: string[];
  parameters: Record<string, any>;
  validationMetrics: {
    rmse: number;
    mae: number;
    r2: number;
    precision?: number;
    recall?: number;
  };
}

export interface MemoryPrediction {
  id: string;
  modelId: string;
  type: 'memory_demand' | 'performance_impact' | 'resource_usage' | 'user_behavior';
  horizon: number; // milliseconds into future
  predictions: Array<{
    timestamp: Date;
    value: number;
    confidence: number;
    bounds: {
      lower: number;
      upper: number;
    };
  }>;
  features: Record<string, number>;
  generated: Date;
  tenantId?: string;
  agentId?: string;
}

export interface AIInsightsConfig {
  patternDetection: {
    enabled: boolean;
    minPatternStrength: number;
    analysisWindowDays: number;
    updateIntervalMs: number;
  };
  predictionModels: {
    enabled: boolean;
    trainingIntervalMs: number;
    minDataPoints: number;
    validationSplit: number;
  };
  recommendations: {
    enabled: boolean;
    confidenceThreshold: number;
    maxRecommendationsPerInsight: number;
  };
  anomalyDetection: {
    enabled: boolean;
    sensitivityLevel: number;
    adaptiveThresholds: boolean;
  };
  realTimeProcessing: {
    enabled: boolean;
    batchSize: number;
    processingDelayMs: number;
  };
}

/**
 * AI-Powered Memory Insights Engine
 * 
 * Advanced AI system that analyzes memory usage patterns, generates predictions,
 * and provides intelligent recommendations for optimization and automation.
 */
export class AIMemoryInsightsEngine extends EventEmitter {
  private config: AIInsightsConfig;
  private insights: Map<string, MemoryInsight> = new Map();
  private patterns: Map<string, MemoryPattern> = new Map();
  private predictionModels: Map<string, PredictionModel> = new Map();
  private predictions: Map<string, MemoryPrediction> = new Map();
  private isRunning = false;
  private analysisIntervalId: NodeJS.Timeout | null = null;
  private trainingIntervalId: NodeJS.Timeout | null = null;
  private memoryData: Array<{
    timestamp: Date;
    tenantId: string;
    agentId?: string;
    operation: string;
    duration: number;
    memoryCount: number;
    success: boolean;
    metadata?: Record<string, any>;
  }> = [];

  constructor(config: AIInsightsConfig) {
    super();
    this.config = config;
    this.initializePredictionModels();
  }

  /**
   * Start the AI insights engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;

    // Start pattern detection and analysis
    if (this.config.patternDetection.enabled) {
      this.analysisIntervalId = setInterval(() => {
        this.runPatternAnalysis().catch(error => {
          this.emit('error', error);
        });
      }, this.config.patternDetection.updateIntervalMs);
    }

    // Start model training
    if (this.config.predictionModels.enabled) {
      this.trainingIntervalId = setInterval(() => {
        this.trainPredictionModels().catch(error => {
          this.emit('error', error);
        });
      }, this.config.predictionModels.trainingIntervalMs);
    }

    // Initial analysis
    await this.runInitialAnalysis();

    console.log('[AIMemoryInsights] Started with intelligent analysis capabilities');
    this.emit('started');
  }

  /**
   * Stop the AI insights engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.analysisIntervalId) {
      clearInterval(this.analysisIntervalId);
      this.analysisIntervalId = null;
    }

    if (this.trainingIntervalId) {
      clearInterval(this.trainingIntervalId);
      this.trainingIntervalId = null;
    }

    console.log('[AIMemoryInsights] Stopped');
    this.emit('stopped');
  }

  /**
   * Add memory operation data for analysis
   */
  public addMemoryData(data: {
    timestamp: Date;
    tenantId: string;
    agentId?: string;
    operation: string;
    duration: number;
    memoryCount: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): void {
    this.memoryData.push(data);

    // Keep only recent data to prevent memory issues
    const cutoff = new Date(Date.now() - this.config.patternDetection.analysisWindowDays * 24 * 60 * 60 * 1000);
    this.memoryData = this.memoryData.filter(d => d.timestamp >= cutoff);

    // Real-time processing if enabled
    if (this.config.realTimeProcessing.enabled && this.isRunning) {
      this.processRealTimeData(data);
    }
  }

  /**
   * Get all insights
   */
  public getInsights(
    type?: MemoryInsight['type'],
    category?: MemoryInsight['category'],
    tenantId?: string
  ): MemoryInsight[] {
    let insights = Array.from(this.insights.values());

    if (type) {
      insights = insights.filter(i => i.type === type);
    }

    if (category) {
      insights = insights.filter(i => i.category === category);
    }

    if (tenantId) {
      insights = insights.filter(i => !i.tenantId || i.tenantId === tenantId);
    }

    // Filter out expired insights
    const now = new Date();
    insights = insights.filter(i => !i.expiresAt || i.expiresAt > now);

    return insights.sort((a, b) => {
      // Sort by impact and confidence
      const aScore = this.getInsightScore(a);
      const bScore = this.getInsightScore(b);
      return bScore - aScore;
    });
  }

  /**
   * Get detected patterns
   */
  public getPatterns(minStrength?: number): MemoryPattern[] {
    let patterns = Array.from(this.patterns.values());

    if (minStrength !== undefined) {
      patterns = patterns.filter(p => p.strength >= minStrength);
    }

    return patterns.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get predictions for a specific type and time horizon
   */
  public getPredictions(
    type?: MemoryPrediction['type'],
    horizonMs?: number,
    tenantId?: string
  ): MemoryPrediction[] {
    let predictions = Array.from(this.predictions.values());

    if (type) {
      predictions = predictions.filter(p => p.type === type);
    }

    if (horizonMs) {
      predictions = predictions.filter(p => p.horizon <= horizonMs);
    }

    if (tenantId) {
      predictions = predictions.filter(p => !p.tenantId || p.tenantId === tenantId);
    }

    return predictions.sort((a, b) => b.generated.getTime() - a.generated.getTime());
  }

  /**
   * Generate memory usage forecast
   */
  public async generateMemoryForecast(
    tenantId: string,
    horizonHours: number = 24
  ): Promise<{
    forecast: Array<{
      timestamp: Date;
      expectedOperations: number;
      expectedMemories: number;
      resourceRequirements: {
        cpu: number;
        memory: number;
        storage: number;
      };
      confidence: number;
    }>;
    insights: MemoryInsight[];
    recommendations: Array<{
      action: string;
      reasoning: string;
      estimatedImpact: string;
    }>;
  }> {
    // Analyze historical data for tenant
    const tenantData = this.memoryData.filter(d => d.tenantId === tenantId);
    
    if (tenantData.length < 10) {
      // Insufficient data for forecasting
      return {
        forecast: [],
        insights: [{
          id: `insufficient-data-${Date.now()}`,
          type: 'recommendation',
          category: 'technical',
          title: 'Insufficient Data for Forecasting',
          description: 'More historical data is needed to generate accurate forecasts',
          confidence: 1.0,
          impact: 'medium',
          evidence: [{
            source: 'data-analysis',
            data: { dataPoints: tenantData.length, minimumRequired: 10 },
            weight: 1.0
          }],
          recommendations: [{
            action: 'Continue collecting data',
            priority: 1,
            estimatedBenefit: 'Enable accurate forecasting and optimization',
            implementation: 'Allow system to collect more operational data over time'
          }],
          timestamp: new Date()
        }],
        recommendations: [{
          action: 'Continue normal operations',
          reasoning: 'Insufficient data for optimization',
          estimatedImpact: 'Forecasting will improve with more data'
        }]
      };
    }

    // Generate hourly forecast
    const forecast: Array<{
      timestamp: Date;
      expectedOperations: number;
      expectedMemories: number;
      resourceRequirements: {
        cpu: number;
        memory: number;
        storage: number;
      };
      confidence: number;
    }> = [];

    const now = new Date();
    
    for (let hour = 0; hour < horizonHours; hour++) {
      const timestamp = new Date(now.getTime() + hour * 60 * 60 * 1000);
      
      // Simple time-series prediction based on historical patterns
      const hourOfDay = timestamp.getHours();
      const dayOfWeek = timestamp.getDay();
      
      const historicalForHour = tenantData.filter(d => d.timestamp.getHours() === hourOfDay);
      const avgOperationsPerHour = historicalForHour.length / Math.max(this.config.patternDetection.analysisWindowDays, 1);
      const avgMemoriesPerHour = historicalForHour.reduce((sum, d) => sum + d.memoryCount, 0) / Math.max(historicalForHour.length, 1);
      
      // Apply weekly pattern adjustment
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0;
      
      const expectedOperations = Math.round(avgOperationsPerHour * weekendMultiplier);
      const expectedMemories = Math.round(avgMemoriesPerHour * weekendMultiplier);
      
      forecast.push({
        timestamp,
        expectedOperations,
        expectedMemories,
        resourceRequirements: {
          cpu: Math.min(expectedOperations * 0.5, 100), // Estimated CPU usage
          memory: expectedMemories * 1024, // Estimated memory in bytes
          storage: expectedMemories * 2048 // Estimated storage in bytes
        },
        confidence: Math.min(historicalForHour.length / 10, 1.0) // Confidence based on data availability
      });
    }

    // Generate insights
    const insights = await this.generateForecastInsights(tenantData, forecast);
    
    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(forecast, insights);

    return { forecast, insights, recommendations };
  }

  /**
   * Detect memory usage anomalies
   */
  public detectAnomalies(lookbackHours: number = 24): MemoryInsight[] {
    if (!this.config.anomalyDetection.enabled) {
      return [];
    }

    const cutoff = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
    const recentData = this.memoryData.filter(d => d.timestamp >= cutoff);
    
    if (recentData.length < 10) {
      return []; // Insufficient data for anomaly detection
    }

    const anomalies: MemoryInsight[] = [];

    // Detect unusual response times
    const durations = recentData.map(d => d.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const stdDuration = Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length);
    
    const threshold = avgDuration + (stdDuration * this.config.anomalyDetection.sensitivityLevel);
    const slowOperations = recentData.filter(d => d.duration > threshold);
    
    if (slowOperations.length > recentData.length * 0.1) { // More than 10% slow operations
      anomalies.push({
        id: `slow-operations-${Date.now()}`,
        type: 'anomaly',
        category: 'performance',
        title: 'Unusual Response Time Pattern Detected',
        description: `${slowOperations.length} operations (${((slowOperations.length / recentData.length) * 100).toFixed(1)}%) exceeded normal response time`,
        confidence: 0.85,
        impact: 'high',
        evidence: [{
          source: 'performance-analysis',
          data: {
            slowOperations: slowOperations.length,
            totalOperations: recentData.length,
            averageDuration: avgDuration,
            threshold: threshold
          },
          weight: 1.0
        }],
        recommendations: [{
          action: 'Investigate system performance',
          priority: 1,
          estimatedBenefit: 'Restore normal response times',
          implementation: 'Check system resources, database performance, and network connectivity'
        }],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
      });
    }

    // Detect unusual error rates
    const errorRate = recentData.filter(d => !d.success).length / recentData.length;
    if (errorRate > 0.05) { // More than 5% error rate
      anomalies.push({
        id: `high-error-rate-${Date.now()}`,
        type: 'anomaly',
        category: 'performance',
        title: 'Elevated Error Rate Detected',
        description: `Error rate of ${(errorRate * 100).toFixed(1)}% exceeds normal threshold`,
        confidence: 0.95,
        impact: 'critical',
        evidence: [{
          source: 'error-analysis',
          data: {
            errorRate: errorRate,
            errors: recentData.filter(d => !d.success).length,
            totalOperations: recentData.length
          },
          weight: 1.0
        }],
        recommendations: [{
          action: 'Investigate error patterns',
          priority: 1,
          estimatedBenefit: 'Reduce system errors and improve reliability',
          implementation: 'Analyze error logs, check system dependencies, and review recent changes'
        }],
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // Expires in 12 hours
      });
    }

    return anomalies;
  }

  /**
   * Generate optimization recommendations based on patterns
   */
  public generateOptimizationRecommendations(tenantId?: string): MemoryInsight[] {
    if (!this.config.recommendations.enabled) {
      return [];
    }

    const recommendations: MemoryInsight[] = [];
    const dataToAnalyze = tenantId ? 
      this.memoryData.filter(d => d.tenantId === tenantId) : 
      this.memoryData;

    if (dataToAnalyze.length < 10) {
      return [];
    }

    // Analyze operation patterns
    const operationCounts = new Map<string, number>();
    const operationDurations = new Map<string, number[]>();

    dataToAnalyze.forEach(d => {
      operationCounts.set(d.operation, (operationCounts.get(d.operation) || 0) + 1);
      
      if (!operationDurations.has(d.operation)) {
        operationDurations.set(d.operation, []);
      }
      operationDurations.get(d.operation)!.push(d.duration);
    });

    // Recommend caching for frequently accessed operations
    const frequentOperations = Array.from(operationCounts.entries())
      .filter(([_, count]) => count > dataToAnalyze.length * 0.2) // More than 20% of operations
      .sort((a, b) => b[1] - a[1]);

    if (frequentOperations.length > 0) {
      recommendations.push({
        id: `caching-recommendation-${Date.now()}`,
        type: 'recommendation',
        category: 'optimization',
        title: 'Implement Caching for Frequent Operations',
        description: `${frequentOperations.length} operation types account for ${((frequentOperations.reduce((sum, [_, count]) => sum + count, 0) / dataToAnalyze.length) * 100).toFixed(1)}% of total operations`,
        confidence: 0.9,
        impact: 'high',
        evidence: [{
          source: 'usage-pattern-analysis',
          data: {
            frequentOperations: frequentOperations.map(([op, count]) => ({ operation: op, count, percentage: (count / dataToAnalyze.length * 100).toFixed(1) }))
          },
          weight: 1.0
        }],
        recommendations: [{
          action: 'Implement intelligent caching',
          priority: 1,
          estimatedBenefit: '30-50% reduction in response time for cached operations',
          implementation: 'Enable preemptive caching for frequently accessed memory patterns'
        }],
        timestamp: new Date(),
        tenantId
      });
    }

    // Recommend batch processing for high-volume operations
    const hourlyVolume = this.calculateHourlyVolume(dataToAnalyze);
    const peakHours = hourlyVolume
      .map((volume, hour) => ({ hour, volume }))
      .filter(({ volume }) => volume > hourlyVolume.reduce((a, b) => a + b, 0) / 24 * 1.5) // 50% above average
      .sort((a, b) => b.volume - a.volume);

    if (peakHours.length > 0) {
      recommendations.push({
        id: `batch-processing-recommendation-${Date.now()}`,
        type: 'recommendation',
        category: 'optimization',
        title: 'Optimize for Peak Usage Patterns',
        description: `Peak usage detected during ${peakHours.length} hour(s) with ${peakHours[0].volume.toFixed(0)} operations/hour`,
        confidence: 0.8,
        impact: 'medium',
        evidence: [{
          source: 'temporal-pattern-analysis',
          data: {
            peakHours: peakHours.map(({ hour, volume }) => ({ hour, volume: volume.toFixed(0) })),
            averageVolume: (hourlyVolume.reduce((a, b) => a + b, 0) / 24).toFixed(0)
          },
          weight: 0.8
        }],
        recommendations: [{
          action: 'Implement load balancing for peak hours',
          priority: 2,
          estimatedBenefit: '20-30% improvement in peak hour performance',
          implementation: 'Configure auto-scaling and load distribution for identified peak periods'
        }],
        timestamp: new Date(),
        tenantId
      });
    }

    return recommendations.filter(r => r.confidence >= this.config.recommendations.confidenceThreshold);
  }

  /**
   * Initialize prediction models
   */
  private initializePredictionModels(): void {
    // Memory usage prediction model
    this.predictionModels.set('memory-usage', {
      id: 'memory-usage',
      name: 'Memory Usage Forecasting',
      type: 'memory_usage',
      algorithm: 'time_series',
      accuracy: 0.0, // Will be calculated after training
      lastTrained: new Date(0),
      nextTraining: new Date(),
      features: ['hour_of_day', 'day_of_week', 'historical_avg', 'trend'],
      parameters: {
        seasonalPeriods: [24, 168], // 24 hours, 168 hours (week)
        trendSmoothingFactor: 0.3,
        seasonalSmoothingFactor: 0.2
      },
      validationMetrics: {
        rmse: 0,
        mae: 0,
        r2: 0
      }
    });

    // Performance prediction model
    this.predictionModels.set('performance', {
      id: 'performance',
      name: 'Performance Forecasting',
      type: 'performance',
      algorithm: 'neural_network',
      accuracy: 0.0,
      lastTrained: new Date(0),
      nextTraining: new Date(),
      features: ['operation_type', 'memory_count', 'tenant_load', 'time_features'],
      parameters: {
        hiddenLayers: [64, 32, 16],
        activationFunction: 'relu',
        learningRate: 0.001,
        epochs: 100
      },
      validationMetrics: {
        rmse: 0,
        mae: 0,
        r2: 0
      }
    });

    console.log('[AIMemoryInsights] Initialized prediction models');
  }

  /**
   * Run initial analysis on startup
   */
  private async runInitialAnalysis(): Promise<void> {
    if (this.memoryData.length >= this.config.predictionModels.minDataPoints) {
      await this.runPatternAnalysis();
      await this.trainPredictionModels();
    }
  }

  /**
   * Run pattern analysis
   */
  private async runPatternAnalysis(): Promise<void> {
    try {
      // Analyze temporal patterns
      await this.analyzeTemporalPatterns();
      
      // Analyze operation patterns
      await this.analyzeOperationPatterns();
      
      // Analyze tenant patterns
      await this.analyzeTenantPatterns();
      
      this.emit('patternsUpdated', Array.from(this.patterns.values()));
      
    } catch (error) {
      console.error('[AIMemoryInsights] Error in pattern analysis:', error);
      this.emit('error', error);
    }
  }

  /**
   * Train prediction models
   */
  private async trainPredictionModels(): Promise<void> {
    try {
      if (this.memoryData.length < this.config.predictionModels.minDataPoints) {
        return;
      }

      for (const model of this.predictionModels.values()) {
        await this.trainModel(model);
      }
      
      this.emit('modelsUpdated', Array.from(this.predictionModels.values()));
      
    } catch (error) {
      console.error('[AIMemoryInsights] Error in model training:', error);
      this.emit('error', error);
    }
  }

  /**
   * Process real-time data
   */
  private processRealTimeData(data: any): void {
    // Real-time anomaly detection
    if (this.config.anomalyDetection.enabled) {
      const anomalies = this.detectAnomalies(1); // Check last hour
      anomalies.forEach(anomaly => {
        this.insights.set(anomaly.id, anomaly);
        this.emit('insight', anomaly);
      });
    }
  }

  /**
   * Analyze temporal patterns
   */
  private async analyzeTemporalPatterns(): Promise<void> {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    
    this.memoryData.forEach(d => {
      hourlyDistribution[d.timestamp.getHours()]++;
      dailyDistribution[d.timestamp.getDay()]++;
    });

    // Find peak hours
    const maxHourly = Math.max(...hourlyDistribution);
    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count > maxHourly * 0.8)
      .map(({ hour }) => hour);

    if (peakHours.length > 0) {
      const pattern: MemoryPattern = {
        id: 'temporal-peak-hours',
        name: 'Peak Usage Hours',
        description: `Peak memory operations occur during hours: ${peakHours.join(', ')}`,
        frequency: peakHours.length / 24,
        strength: Math.max(...hourlyDistribution) / (this.memoryData.length / 24),
        participants: [{
          entityType: 'operation',
          entityId: 'all',
          involvement: 1.0
        }],
        timePattern: {
          hourly: hourlyDistribution,
          daily: dailyDistribution,
          weekly: [] // Would be calculated with more data
        },
        correlations: [],
        metadata: {
          peakHours,
          analysisDate: new Date(),
          dataPoints: this.memoryData.length
        }
      };

      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Analyze operation patterns
   */
  private async analyzeOperationPatterns(): Promise<void> {
    const operationStats = new Map<string, {
      count: number;
      avgDuration: number;
      successRate: number;
      hourlyDistribution: number[];
    }>();

    this.memoryData.forEach(d => {
      if (!operationStats.has(d.operation)) {
        operationStats.set(d.operation, {
          count: 0,
          avgDuration: 0,
          successRate: 0,
          hourlyDistribution: new Array(24).fill(0)
        });
      }

      const stats = operationStats.get(d.operation)!;
      stats.count++;
      stats.avgDuration = (stats.avgDuration * (stats.count - 1) + d.duration) / stats.count;
      stats.successRate = (stats.successRate * (stats.count - 1) + (d.success ? 1 : 0)) / stats.count;
      stats.hourlyDistribution[d.timestamp.getHours()]++;
    });

    // Create patterns for significant operations
    operationStats.forEach((stats, operation) => {
      if (stats.count > this.memoryData.length * 0.05) { // At least 5% of operations
        const pattern: MemoryPattern = {
          id: `operation-${operation}`,
          name: `${operation} Operation Pattern`,
          description: `Pattern for ${operation} operations: ${stats.count} occurrences with ${stats.avgDuration.toFixed(2)}ms avg duration`,
          frequency: stats.count / this.memoryData.length,
          strength: Math.min(stats.successRate * (stats.count / this.memoryData.length) * 2, 1.0),
          participants: [{
            entityType: 'operation',
            entityId: operation,
            involvement: 1.0
          }],
          timePattern: {
            hourly: stats.hourlyDistribution,
            daily: [],
            weekly: []
          },
          correlations: [],
          metadata: {
            averageDuration: stats.avgDuration,
            successRate: stats.successRate,
            totalOccurrences: stats.count
          }
        };

        this.patterns.set(pattern.id, pattern);
      }
    });
  }

  /**
   * Analyze tenant patterns
   */
  private async analyzeTenantPatterns(): Promise<void> {
    const tenantStats = new Map<string, {
      operations: number;
      memories: number;
      avgDuration: number;
      errorRate: number;
      operationTypes: Set<string>;
    }>();

    this.memoryData.forEach(d => {
      if (!tenantStats.has(d.tenantId)) {
        tenantStats.set(d.tenantId, {
          operations: 0,
          memories: 0,
          avgDuration: 0,
          errorRate: 0,
          operationTypes: new Set()
        });
      }

      const stats = tenantStats.get(d.tenantId)!;
      stats.operations++;
      stats.memories += d.memoryCount;
      stats.avgDuration = (stats.avgDuration * (stats.operations - 1) + d.duration) / stats.operations;
      stats.errorRate = (stats.errorRate * (stats.operations - 1) + (d.success ? 0 : 1)) / stats.operations;
      stats.operationTypes.add(d.operation);
    });

    // Identify high-usage tenants
    const sortedTenants = Array.from(tenantStats.entries())
      .sort((a, b) => b[1].operations - a[1].operations);

    if (sortedTenants.length > 0) {
      const topTenant = sortedTenants[0];
      if (topTenant[1].operations > this.memoryData.length * 0.1) { // More than 10% of operations
        const pattern: MemoryPattern = {
          id: `high-usage-tenant-${topTenant[0]}`,
          name: `High Usage Tenant: ${topTenant[0]}`,
          description: `Tenant ${topTenant[0]} accounts for ${((topTenant[1].operations / this.memoryData.length) * 100).toFixed(1)}% of operations`,
          frequency: topTenant[1].operations / this.memoryData.length,
          strength: Math.min(topTenant[1].operations / this.memoryData.length * 3, 1.0),
          participants: [{
            entityType: 'tenant',
            entityId: topTenant[0],
            involvement: 1.0
          }],
          timePattern: {
            hourly: [],
            daily: [],
            weekly: []
          },
          correlations: [],
          metadata: {
            totalOperations: topTenant[1].operations,
            totalMemories: topTenant[1].memories,
            averageDuration: topTenant[1].avgDuration,
            errorRate: topTenant[1].errorRate,
            operationTypes: Array.from(topTenant[1].operationTypes)
          }
        };

        this.patterns.set(pattern.id, pattern);
      }
    }
  }

  /**
   * Train a specific model
   */
  private async trainModel(model: PredictionModel): Promise<void> {
    // Simplified model training - in production would use actual ML libraries
    const trainingData = this.prepareTrainingData(model);
    
    if (trainingData.length < this.config.predictionModels.minDataPoints) {
      return;
    }

    // Split data for validation
    const splitIndex = Math.floor(trainingData.length * (1 - this.config.predictionModels.validationSplit));
    const trainData = trainingData.slice(0, splitIndex);
    const validData = trainingData.slice(splitIndex);

    // Simple linear regression for demonstration
    const { slope, intercept, r2 } = this.performLinearRegression(trainData);
    
    // Validate model
    const predictions = validData.map(d => slope * d.features[0] + intercept);
    const actual = validData.map(d => d.target);
    
    const rmse = Math.sqrt(
      predictions.reduce((sum, pred, i) => sum + Math.pow(pred - actual[i], 2), 0) / predictions.length
    );
    const mae = predictions.reduce((sum, pred, i) => sum + Math.abs(pred - actual[i]), 0) / predictions.length;

    // Update model
    model.lastTrained = new Date();
    model.nextTraining = new Date(Date.now() + this.config.predictionModels.trainingIntervalMs);
    model.accuracy = Math.max(0, 1 - (rmse / (Math.max(...actual) - Math.min(...actual))));
    model.validationMetrics = { rmse, mae, r2 };
    model.parameters = { ...model.parameters, slope, intercept };

    console.log(`[AIMemoryInsights] Trained model ${model.name}: accuracy=${model.accuracy.toFixed(3)}, rmse=${rmse.toFixed(2)}`);
  }

  /**
   * Prepare training data for a model
   */
  private prepareTrainingData(model: PredictionModel): Array<{
    features: number[];
    target: number;
  }> {
    const data: Array<{ features: number[]; target: number }> = [];

    this.memoryData.forEach(d => {
      let target: number;
      const features: number[] = [];

      switch (model.type) {
        case 'memory_usage':
          target = d.memoryCount;
          features.push(
            d.timestamp.getHours(), // hour of day
            d.timestamp.getDay(), // day of week
            d.duration, // operation duration
            d.success ? 1 : 0 // success flag
          );
          break;
        case 'performance':
          target = d.duration;
          features.push(
            d.memoryCount, // number of memories
            d.timestamp.getHours(), // hour of day
            d.operation === 'remember' ? 1 : 0, // operation type encoding
            d.operation === 'recall' ? 1 : 0,
            d.operation === 'search' ? 1 : 0
          );
          break;
        default:
          return; // Skip unknown model types
      }

      data.push({ features, target });
    });

    return data;
  }

  /**
   * Perform simple linear regression
   */
  private performLinearRegression(data: Array<{ features: number[]; target: number }>): {
    slope: number;
    intercept: number;
    r2: number;
  } {
    if (data.length === 0) {
      return { slope: 0, intercept: 0, r2: 0 };
    }

    // Use first feature for simple linear regression
    const x = data.map(d => d.features[0]);
    const y = data.map(d => d.target);
    
    const n = data.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R²
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);

    return { slope, intercept, r2 };
  }

  /**
   * Calculate insight score for sorting
   */
  private getInsightScore(insight: MemoryInsight): number {
    const impactWeight = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };

    return insight.confidence * impactWeight[insight.impact];
  }

  /**
   * Calculate hourly volume distribution
   */
  private calculateHourlyVolume(data: typeof this.memoryData): number[] {
    const hourlyVolume = new Array(24).fill(0);
    const hoursWithData = new Set<number>();

    data.forEach(d => {
      const hour = d.timestamp.getHours();
      hourlyVolume[hour]++;
      hoursWithData.add(hour);
    });

    // Convert to operations per hour
    const uniqueDays = new Set(data.map(d => d.timestamp.toDateString())).size;
    const daysWithData = Math.max(uniqueDays, 1);

    return hourlyVolume.map(count => count / daysWithData);
  }

  /**
   * Generate forecast insights
   */
  private async generateForecastInsights(
    tenantData: typeof this.memoryData,
    forecast: any[]
  ): Promise<MemoryInsight[]> {
    const insights: MemoryInsight[] = [];

    // Analyze forecast trends
    const totalPredictedOperations = forecast.reduce((sum, f) => sum + f.expectedOperations, 0);
    const avgCurrentOperations = tenantData.length / Math.max(this.config.patternDetection.analysisWindowDays, 1);

    if (totalPredictedOperations > avgCurrentOperations * 1.5) {
      insights.push({
        id: `growth-trend-${Date.now()}`,
        type: 'prediction',
        category: 'business',
        title: 'Significant Growth Predicted',
        description: `Forecasting ${totalPredictedOperations.toFixed(0)} operations in next 24 hours, ${((totalPredictedOperations / avgCurrentOperations - 1) * 100).toFixed(1)}% above current average`,
        confidence: 0.8,
        impact: 'high',
        evidence: [{
          source: 'forecast-analysis',
          data: {
            predictedOperations: totalPredictedOperations,
            currentAverage: avgCurrentOperations,
            growthRate: (totalPredictedOperations / avgCurrentOperations - 1) * 100
          },
          weight: 1.0
        }],
        recommendations: [{
          action: 'Prepare for increased load',
          priority: 1,
          estimatedBenefit: 'Prevent performance degradation during growth period',
          implementation: 'Scale resources proactively and optimize caching strategies'
        }],
        timestamp: new Date()
      });
    }

    return insights;
  }

  /**
   * Generate forecast recommendations
   */
  private generateForecastRecommendations(
    forecast: any[],
    insights: MemoryInsight[]
  ): Array<{
    action: string;
    reasoning: string;
    estimatedImpact: string;
  }> {
    const recommendations: Array<{
      action: string;
      reasoning: string;
      estimatedImpact: string;
    }> = [];

    const peakForecast = forecast.reduce((peak, f) => f.expectedOperations > peak.expectedOperations ? f : peak, forecast[0]);
    const avgForecast = forecast.reduce((sum, f) => sum + f.expectedOperations, 0) / forecast.length;

    if (peakForecast.expectedOperations > avgForecast * 2) {
      recommendations.push({
        action: 'Implement auto-scaling for peak periods',
        reasoning: `Peak load of ${peakForecast.expectedOperations} operations predicted at ${peakForecast.timestamp.toLocaleTimeString()}`,
        estimatedImpact: 'Maintain consistent performance during peak usage'
      });
    }

    if (insights.some(i => i.type === 'prediction' && i.impact === 'high')) {
      recommendations.push({
        action: 'Enable predictive caching',
        reasoning: 'High-impact growth predicted requiring proactive optimization',
        estimatedImpact: '25-40% improvement in response times during growth period'
      });
    }

    return recommendations;
  }
}
