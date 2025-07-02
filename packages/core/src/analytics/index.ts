/**
 * Analytics Module
 * 
 * Comprehensive analytics and monitoring system for Memorai enterprise memory operations.
 * Provides performance monitoring, system optimization, and business intelligence.
 */

// Performance Monitoring
export { 
  AdvancedPerformanceMonitor,
  type PerformanceMetric,
  type MemoryUsageStats,
  type SystemHealthMetrics,
  type PerformanceAlert,
  type AnalyticsConfig 
} from './AdvancedPerformanceMonitor';

// System Optimization
export { 
  SystemOptimizationEngine,
  type OptimizationRule,
  type OptimizationMetrics,
  type OptimizationContext,
  type OptimizationResult,
  type AutoScalingConfig,
  type CacheOptimizationConfig,
  type QueryOptimizationConfig 
} from './SystemOptimizationEngine';

// Analytics Dashboard
export { 
  AnalyticsDashboardService,
  type DashboardWidget,
  type DashboardLayout,
  type ReportConfig,
  type AnalyticsQuery,
  type DashboardData,
  type BusinessMetrics 
} from './AnalyticsDashboardService';

// Import types for internal use
import type { 
  AnalyticsConfig,
  PerformanceMetric,
  SystemHealthMetrics,
  PerformanceAlert,
  MemoryUsageStats 
} from './AdvancedPerformanceMonitor';
import type { 
  AutoScalingConfig,
  CacheOptimizationConfig,
  QueryOptimizationConfig,
  OptimizationMetrics,
  OptimizationRule,
  OptimizationResult 
} from './SystemOptimizationEngine';
import type { 
  DashboardData,
  DashboardLayout,
  BusinessMetrics 
} from './AnalyticsDashboardService';
import { AdvancedPerformanceMonitor } from './AdvancedPerformanceMonitor';
import { SystemOptimizationEngine } from './SystemOptimizationEngine';
import { AnalyticsDashboardService } from './AnalyticsDashboardService';

// Default Configurations
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  metricsRetentionDays: 30,
  alertThresholds: {
    responseTime: 100, // 100ms
    errorRate: 0.05, // 5%
    memoryUsage: 0.8, // 80%
    cpuUsage: 80, // 80%
    diskUsage: 85 // 85%
  },
  sampling: {
    enabled: false,
    rate: 1.0 // 100% sampling by default
  },
  realTimeUpdates: true,
  aggregationIntervals: [60, 300, 3600] // 1min, 5min, 1hour
};

export const DEFAULT_AUTO_SCALING_CONFIG: AutoScalingConfig = {
  enabled: true,
  triggers: {
    cpuThreshold: 70, // 70%
    memoryThreshold: 80, // 80%
    responseTimeThreshold: 200, // 200ms
    throughputThreshold: 1000 // ops/min
  },
  scaling: {
    minInstances: 1,
    maxInstances: 10,
    scaleUpFactor: 1.5,
    scaleDownFactor: 0.7,
    cooldownPeriodMs: 300000 // 5 minutes
  }
};

export const DEFAULT_CACHE_OPTIMIZATION_CONFIG: CacheOptimizationConfig = {
  enabled: true,
  strategies: {
    preemptiveLoading: true,
    intelligentEviction: true,
    hotDataIdentification: true,
    crossTenantOptimization: false // Disabled for security
  },
  thresholds: {
    hitRatioTarget: 0.85, // 85%
    memoryUsageLimit: 0.9, // 90%
    accessFrequencyMin: 5 // minimum 5 accesses
  }
};

export const DEFAULT_QUERY_OPTIMIZATION_CONFIG: QueryOptimizationConfig = {
  enabled: true,
  techniques: {
    queryPlanOptimization: true,
    indexSuggestions: true,
    batchingOptimization: true,
    vectorSearchTuning: true
  },
  analysis: {
    slowQueryThreshold: 100, // 100ms
    frequentQueryThreshold: 10, // 10 times per hour
    optimizationWindowMs: 3600000 // 1 hour
  }
};

/**
 * Enterprise Analytics Manager
 * 
 * Unified interface for all analytics capabilities including performance monitoring,
 * system optimization, and business intelligence dashboards.
 */
export class EnterpriseAnalyticsManager {
  private performanceMonitor: AdvancedPerformanceMonitor;
  private optimizationEngine: SystemOptimizationEngine;
  private dashboardService: AnalyticsDashboardService;
  private isRunning = false;

  constructor(
    analyticsConfig: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG,
    autoScalingConfig: AutoScalingConfig = DEFAULT_AUTO_SCALING_CONFIG,
    cacheConfig: CacheOptimizationConfig = DEFAULT_CACHE_OPTIMIZATION_CONFIG,
    queryConfig: QueryOptimizationConfig = DEFAULT_QUERY_OPTIMIZATION_CONFIG
  ) {
    this.performanceMonitor = new AdvancedPerformanceMonitor(analyticsConfig);
    this.optimizationEngine = new SystemOptimizationEngine(autoScalingConfig, cacheConfig, queryConfig);
    this.dashboardService = new AnalyticsDashboardService();

    // Wire up event connections
    this.setupEventConnections();
  }

  /**
   * Start all analytics services
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      // Start services in order
      this.performanceMonitor.start();
      this.optimizationEngine.start();
      this.dashboardService.start();

      this.isRunning = true;
      console.log('[EnterpriseAnalytics] All analytics services started successfully');
      
    } catch (error) {
      console.error('[EnterpriseAnalytics] Failed to start analytics services:', error);
      await this.stop(); // Cleanup on failure
      throw error;
    }
  }

  /**
   * Stop all analytics services
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Stop services in reverse order
      this.dashboardService.stop();
      this.optimizationEngine.stop();
      this.performanceMonitor.stop();

      this.isRunning = false;
      console.log('[EnterpriseAnalytics] All analytics services stopped successfully');
      
    } catch (error) {
      console.error('[EnterpriseAnalytics] Error stopping analytics services:', error);
      throw error;
    }
  }

  /**
   * Record a performance metric
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    this.performanceMonitor.recordMetric(metric);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(startTime: Date, endTime: Date, operationType?: string) {
    return this.performanceMonitor.getPerformanceStats(startTime, endTime, operationType);
  }

  /**
   * Get system health metrics
   */
  public getSystemHealth(): SystemHealthMetrics | null {
    return this.performanceMonitor.getSystemHealth();
  }

  /**
   * Get memory usage analytics
   */
  public getMemoryAnalytics(): MemoryUsageStats {
    return this.performanceMonitor.getMemoryAnalytics();
  }

  /**
   * Get active alerts
   */
  public getAlerts(acknowledged = false): PerformanceAlert[] {
    return this.performanceMonitor.getAlerts(acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    return this.performanceMonitor.acknowledgeAlert(alertId);
  }

  /**
   * Get optimization recommendations
   */
  public async getOptimizationRecommendations(): Promise<Array<{
    category: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    estimatedImpact: string;
    implementation: string;
    automated: boolean;
  }>> {
    const metrics = await this.gatherCurrentMetrics();
    return this.optimizationEngine.getOptimizationRecommendations(metrics);
  }

  /**
   * Execute specific optimization
   */
  public async executeOptimization(ruleId: string): Promise<OptimizationResult> {
    return this.optimizationEngine.executeOptimization(ruleId);
  }

  /**
   * Get dashboard data
   */
  public getDashboardData(dashboardId?: string): DashboardData | null {
    return this.dashboardService.getDashboardData(dashboardId);
  }

  /**
   * Get business metrics
   */
  public getBusinessMetrics(): BusinessMetrics {
    return this.dashboardService.getBusinessMetrics();
  }

  /**
   * Generate comprehensive report
   */
  public async generateReport(reportId: string) {
    return this.dashboardService.generateReport(reportId);
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(hours = 24) {
    return this.performanceMonitor.getPerformanceTrends(hours);
  }

  /**
   * Get optimization history
   */
  public getOptimizationHistory(hours = 24) {
    return this.optimizationEngine.getOptimizationHistory(hours);
  }

  /**
   * Add custom optimization rule
   */
  public addOptimizationRule(rule: OptimizationRule): void {
    this.optimizationEngine.addOptimizationRule(rule);
  }

  /**
   * Get all available dashboards
   */
  public getAllDashboards(): DashboardLayout[] {
    return this.dashboardService.getAllDashboards();
  }

  /**
   * Save dashboard layout
   */
  public saveDashboard(dashboard: DashboardLayout): void {
    this.dashboardService.saveDashboard(dashboard);
  }

  /**
   * Get comprehensive system status
   */
  public getSystemStatus(): {
    overall: 'healthy' | 'warning' | 'critical';
    performance: {
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
    };
    resources: {
      memoryUsage: number;
      cpuUsage: number;
      connections: number;
    };
    alerts: {
      critical: number;
      warning: number;
      total: number;
    };
    optimizations: {
      recent: number;
      successful: number;
      pending: number;
    };
  } {
    const dashboardData = this.dashboardService.getDashboardData();
    const systemHealth = this.performanceMonitor.getSystemHealth();
    const alerts = this.performanceMonitor.getAlerts();
    const recentOptimizations = this.optimizationEngine.getOptimizationHistory(1); // Last hour

    const overall = dashboardData?.systemOverview.status || 'warning';
    
    return {
      overall,
      performance: {
        averageResponseTime: dashboardData?.systemOverview.errorRate || 0,
        throughput: 0, // Would be calculated from recent metrics
        errorRate: dashboardData?.systemOverview.errorRate || 0
      },
      resources: {
        memoryUsage: systemHealth ? systemHealth.memory.heapUsed / systemHealth.memory.heapTotal : 0,
        cpuUsage: systemHealth?.cpu.usage || 0,
        connections: systemHealth?.database.connections || 0
      },
      alerts: {
        critical: alerts.filter(a => a.type === 'critical').length,
        warning: alerts.filter(a => a.type === 'warning').length,
        total: alerts.length
      },
      optimizations: {
        recent: recentOptimizations.length,
        successful: recentOptimizations.filter(o => o.result.success).length,
        pending: 0 // Would be calculated from pending optimizations
      }
    };
  }

  /**
   * Setup event connections between services
   */
  private setupEventConnections(): void {
    // Performance monitor -> Dashboard service
    this.performanceMonitor.on('metric', (metric: PerformanceMetric) => {
      this.dashboardService.updateMetrics([metric]);
    });

    this.performanceMonitor.on('alert', (alert: PerformanceAlert) => {
      this.dashboardService.updateAlerts([alert]);
    });

    // Optimization engine -> Dashboard service
    this.optimizationEngine.on('optimizationApplied', (data) => {
      this.dashboardService.updateOptimizationHistory([{
        timestamp: new Date(),
        rule: data.rule,
        result: data.result
      }]);
    });

    // Error handling
    this.performanceMonitor.on('error', (error) => {
      console.error('[EnterpriseAnalytics] Performance monitor error:', error);
    });

    this.optimizationEngine.on('error', (error) => {
      console.error('[EnterpriseAnalytics] Optimization engine error:', error);
    });

    this.dashboardService.on('error', (error) => {
      console.error('[EnterpriseAnalytics] Dashboard service error:', error);
    });
  }

  /**
   * Gather current metrics for optimization
   */
  private async gatherCurrentMetrics(): Promise<OptimizationMetrics> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const stats = this.performanceMonitor.getPerformanceStats(oneHourAgo, now);
    const memoryAnalytics = this.performanceMonitor.getMemoryAnalytics();
    const systemHealth = this.performanceMonitor.getSystemHealth();
    const trends = this.performanceMonitor.getPerformanceTrends(24);

    // Calculate trend data
    const responseTimeTrend = trends.responseTimeTrend;
    const throughputTrend = trends.throughputTrend;
    const errorRateTrend = trends.errorRateTrend;

    const responseTimeGrowth = responseTimeTrend.length >= 2 ? 
      (responseTimeTrend[responseTimeTrend.length - 1].value - responseTimeTrend[0].value) / responseTimeTrend[0].value : 0;
    
    const throughputChange = throughputTrend.length >= 2 ? 
      (throughputTrend[throughputTrend.length - 1].value - throughputTrend[0].value) / throughputTrend[0].value : 0;
    
    const errorRateChange = errorRateTrend.length >= 2 ? 
      (errorRateTrend[errorRateTrend.length - 1].value - errorRateTrend[0].value) / Math.max(errorRateTrend[0].value, 0.001) : 0;

    return {
      averageResponseTime: stats.averageResponseTime,
      throughput: stats.operationsPerSecond,
      errorRate: 1 - stats.successRate,
      memoryUsage: systemHealth ? systemHealth.memory.heapUsed / systemHealth.memory.heapTotal : 0,
      cpuUsage: systemHealth?.cpu.usage || 0,
      cacheHitRatio: memoryAnalytics.cacheHitRatio,
      vectorSearchLatency: memoryAnalytics.vectorSearchLatency,
      activeConnections: systemHealth?.database.connections || 0,
      systemHealth,
      trendData: {
        responseTimeGrowth,
        throughputChange,
        errorRateChange
      }
    };
  }
}
