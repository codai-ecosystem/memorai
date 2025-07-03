/**
 * Analytics Dashboard Service
 *
 * Comprehensive analytics dashboard for Memorai enterprise memory system.
 * Provides real-time dashboards, historical reports, and business intelligence.
 */

import { EventEmitter } from 'events';
import type {
  PerformanceAlert,
  PerformanceMetric,
} from './AdvancedPerformanceMonitor';
import type { OptimizationResult } from './SystemOptimizationEngine';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'alert' | 'map' | 'gauge';
  title: string;
  description: string;
  config: {
    dataSource: string;
    refreshInterval: number;
    chartType?: 'line' | 'bar' | 'pie' | 'heatmap' | 'scatter';
    timeRange?: string;
    filters?: Record<string, any>;
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  permissions: {
    view: string[];
    edit: string[];
  };
  isDefault: boolean;
}

export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string;
    timezone: string;
    enabled: boolean;
  };
  recipients: string[];
  sections: Array<{
    type: 'summary' | 'performance' | 'usage' | 'security' | 'optimization';
    title: string;
    config: Record<string, any>;
  }>;
}

export interface AnalyticsQuery {
  id: string;
  name: string;
  query: string;
  parameters: Record<string, any>;
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

export interface DashboardData {
  timestamp: Date;
  widgets: Record<
    string,
    {
      data: any;
      lastUpdated: Date;
      error?: string;
    }
  >;
  systemOverview: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    totalOperations: number;
    activeUsers: number;
    errorRate: number;
  };
}

export interface BusinessMetrics {
  tenantAnalytics: Array<{
    tenantId: string;
    totalMemories: number;
    dailyOperations: number;
    averageResponseTime: number;
    errorRate: number;
    cacheHitRatio: number;
    storageUsed: number;
    lastActivity: Date;
  }>;
  agentAnalytics: Array<{
    agentId: string;
    tenantId: string;
    memoryCount: number;
    operationsPerDay: number;
    averageSessionLength: number;
    preferredMemoryTypes: string[];
    lastSeen: Date;
  }>;
  usagePatterns: {
    peakHours: number[];
    popularOperations: Array<{ operation: string; count: number }>;
    memoryTypeDistribution: Record<string, number>;
    geographicDistribution: Record<string, number>;
  };
}

/**
 * Analytics Dashboard Service
 *
 * Provides comprehensive analytics dashboards and reporting capabilities
 * for enterprise memory system monitoring and business intelligence.
 */
export class AnalyticsDashboardService extends EventEmitter {
  private dashboards: Map<string, DashboardLayout> = new Map();
  private reports: Map<string, ReportConfig> = new Map();
  private queries: Map<string, AnalyticsQuery> = new Map();
  private realtimeData: DashboardData | null = null;
  private metricsHistory: PerformanceMetric[] = [];
  private alertsHistory: PerformanceAlert[] = [];
  private optimizationHistory: Array<{
    timestamp: Date;
    rule: string;
    result: OptimizationResult;
  }> = [];
  private updateIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    super();
    this.initializeDefaultDashboards();
    this.initializeDefaultQueries();
  }

  /**
   * Start the analytics dashboard service
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    // Update dashboard data every 30 seconds
    this.updateIntervalId = setInterval(() => {
      this.updateDashboardData().catch(error => {
        this.emit('error', error);
      });
    }, 30000);

    console.log('[AnalyticsDashboard] Started with real-time updates');
    this.emit('started');
  }

  /**
   * Stop the analytics dashboard service
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.updateIntervalId) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }

    console.log('[AnalyticsDashboard] Stopped');
    this.emit('stopped');
  }

  /**
   * Get dashboard layout by ID
   */
  public getDashboard(dashboardId: string): DashboardLayout | null {
    return this.dashboards.get(dashboardId) || null;
  }

  /**
   * Get all available dashboards
   */
  public getAllDashboards(): DashboardLayout[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Create or update dashboard
   */
  public saveDashboard(dashboard: DashboardLayout): void {
    this.dashboards.set(dashboard.id, dashboard);
    this.emit('dashboardUpdated', dashboard);
    console.log(`[AnalyticsDashboard] Dashboard saved: ${dashboard.name}`);
  }

  /**
   * Get current dashboard data
   */
  public getDashboardData(dashboardId?: string): DashboardData | null {
    return this.realtimeData;
  }

  /**
   * Get performance analytics for time range
   */
  public getPerformanceAnalytics(
    startTime: Date,
    endTime: Date,
    granularity: 'minute' | 'hour' | 'day' = 'hour'
  ): {
    timeSeriesData: Array<{
      timestamp: Date;
      averageResponseTime: number;
      throughput: number;
      errorRate: number;
      memoryUsage: number;
    }>;
    summary: {
      totalOperations: number;
      averageResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      successRate: number;
      uptimePercentage: number;
    };
  } {
    const relevantMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    if (relevantMetrics.length === 0) {
      return {
        timeSeriesData: [],
        summary: {
          totalOperations: 0,
          averageResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          successRate: 0,
          uptimePercentage: 0,
        },
      };
    }

    // Group metrics by time granularity
    const groupedMetrics = this.groupMetricsByTime(
      relevantMetrics,
      granularity
    );

    const timeSeriesData = Object.entries(groupedMetrics).map(
      ([timestamp, metrics]) => {
        const avgResponseTime =
          metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        const throughput = metrics.length;
        const errorRate =
          1 - metrics.filter(m => m.success).length / metrics.length;

        return {
          timestamp: new Date(timestamp),
          averageResponseTime: avgResponseTime,
          throughput,
          errorRate,
          memoryUsage: 0, // Would be calculated from system metrics
        };
      }
    );

    // Calculate summary statistics
    const durations = relevantMetrics
      .map(m => m.duration)
      .sort((a, b) => a - b);
    const successCount = relevantMetrics.filter(m => m.success).length;

    const summary = {
      totalOperations: relevantMetrics.length,
      averageResponseTime:
        durations.reduce((a, b) => a + b, 0) / durations.length,
      p95ResponseTime: durations[Math.floor(durations.length * 0.95)] || 0,
      p99ResponseTime: durations[Math.floor(durations.length * 0.99)] || 0,
      successRate: successCount / relevantMetrics.length,
      uptimePercentage: 99.9, // Would be calculated from actual uptime data
    };

    return { timeSeriesData, summary };
  }

  /**
   * Get business metrics and insights
   */
  public getBusinessMetrics(): BusinessMetrics {
    // Analyze metrics by tenant and agent
    const tenantMetrics = new Map<string, PerformanceMetric[]>();
    const agentMetrics = new Map<string, PerformanceMetric[]>();

    this.metricsHistory.forEach(metric => {
      // Group by tenant
      if (!tenantMetrics.has(metric.tenantId)) {
        tenantMetrics.set(metric.tenantId, []);
      }
      tenantMetrics.get(metric.tenantId)!.push(metric);

      // Group by agent
      if (metric.agentId) {
        const key = `${metric.tenantId}:${metric.agentId}`;
        if (!agentMetrics.has(key)) {
          agentMetrics.set(key, []);
        }
        agentMetrics.get(key)!.push(metric);
      }
    });

    // Calculate tenant analytics
    const tenantAnalytics = Array.from(tenantMetrics.entries()).map(
      ([tenantId, metrics]) => {
        const totalMemories = metrics.reduce(
          (sum, m) => sum + m.memoryCount,
          0
        );
        const dailyOperations = metrics.filter(
          m => Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
        ).length;
        const avgResponseTime =
          metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
        const errorRate =
          1 - metrics.filter(m => m.success).length / metrics.length;
        const lastActivity = new Date(
          Math.max(...metrics.map(m => m.timestamp.getTime()))
        );

        return {
          tenantId,
          totalMemories,
          dailyOperations,
          averageResponseTime: avgResponseTime,
          errorRate,
          cacheHitRatio: 0.85, // Would be calculated from cache metrics
          storageUsed: totalMemories * 1024, // Estimated
          lastActivity,
        };
      }
    );

    // Calculate agent analytics
    const agentAnalytics = Array.from(agentMetrics.entries()).map(
      ([key, metrics]) => {
        const [tenantId, agentId] = key.split(':');
        const memoryCount = metrics.reduce((sum, m) => sum + m.memoryCount, 0);
        const operationsPerDay = metrics.filter(
          m => Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
        ).length;
        const lastSeen = new Date(
          Math.max(...metrics.map(m => m.timestamp.getTime()))
        );

        // Analyze memory type preferences
        const memoryTypes = new Map<string, number>();
        metrics.forEach(m => {
          const type = m.operationType;
          memoryTypes.set(type, (memoryTypes.get(type) || 0) + 1);
        });
        const preferredMemoryTypes = Array.from(memoryTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type]) => type);

        return {
          agentId,
          tenantId,
          memoryCount,
          operationsPerDay,
          averageSessionLength: 0, // Would be calculated from session data
          preferredMemoryTypes,
          lastSeen,
        };
      }
    );

    // Calculate usage patterns
    const hourlyDistribution = new Array(24).fill(0);
    const operationCounts = new Map<string, number>();
    const memoryTypeDistribution = new Map<string, number>();

    this.metricsHistory.forEach(metric => {
      const hour = metric.timestamp.getHours();
      hourlyDistribution[hour]++;

      operationCounts.set(
        metric.operationType,
        (operationCounts.get(metric.operationType) || 0) + 1
      );

      memoryTypeDistribution.set(
        metric.operationType,
        (memoryTypeDistribution.get(metric.operationType) || 0) +
          metric.memoryCount
      );
    });

    const peakHours = hourlyDistribution
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ hour }) => hour);

    const popularOperations = Array.from(operationCounts.entries())
      .map(([operation, count]) => ({ operation, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      tenantAnalytics,
      agentAnalytics,
      usagePatterns: {
        peakHours,
        popularOperations,
        memoryTypeDistribution: Object.fromEntries(memoryTypeDistribution),
        geographicDistribution: {}, // Would be populated from IP geolocation
      },
    };
  }

  /**
   * Generate comprehensive report
   */
  public async generateReport(reportId: string): Promise<{
    report: {
      id: string;
      name: string;
      generatedAt: Date;
      timeRange: { start: Date; end: Date };
      sections: Array<{
        title: string;
        type: string;
        data: any;
      }>;
    };
    metadata: {
      dataPoints: number;
      generationTime: number;
      exportFormats: string[];
    };
  }> {
    const startTime = performance.now();
    const reportConfig = this.reports.get(reportId);

    if (!reportConfig) {
      throw new Error(`Report configuration not found: ${reportId}`);
    }

    const endTime = new Date();
    const startDate = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const sections: Array<{
      title: string;
      type: string;
      data: any;
    }> = [];

    // Generate sections based on report configuration
    for (const sectionConfig of reportConfig.sections) {
      let sectionData: any;

      switch (sectionConfig.type) {
        case 'summary':
          sectionData = this.generateSummarySection(startDate, endTime);
          break;
        case 'performance':
          sectionData = this.getPerformanceAnalytics(startDate, endTime);
          break;
        case 'usage':
          sectionData = this.getBusinessMetrics();
          break;
        case 'security':
          sectionData = this.generateSecuritySection(startDate, endTime);
          break;
        case 'optimization':
          sectionData = this.generateOptimizationSection(startDate, endTime);
          break;
        default:
          sectionData = {
            error: `Unknown section type: ${sectionConfig.type}`,
          };
      }

      sections.push({
        title: sectionConfig.title,
        type: sectionConfig.type,
        data: sectionData,
      });
    }

    const generationTime = performance.now() - startTime;

    return {
      report: {
        id: reportId,
        name: reportConfig.name,
        generatedAt: new Date(),
        timeRange: { start: startDate, end: endTime },
        sections,
      },
      metadata: {
        dataPoints: this.metricsHistory.length,
        generationTime,
        exportFormats: ['pdf', 'excel', 'json'],
      },
    };
  }

  /**
   * Update metrics data (called by performance monitor)
   */
  public updateMetrics(metrics: PerformanceMetric[]): void {
    this.metricsHistory.push(...metrics);

    // Keep only recent metrics to prevent memory issues
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    this.metricsHistory = this.metricsHistory.filter(
      m => m.timestamp >= cutoff
    );

    this.emit('metricsUpdated', metrics);
  }

  /**
   * Update alerts data
   */
  public updateAlerts(alerts: PerformanceAlert[]): void {
    this.alertsHistory.push(...alerts);
    this.emit('alertsUpdated', alerts);
  }

  /**
   * Update optimization history
   */
  public updateOptimizationHistory(
    history: Array<{
      timestamp: Date;
      rule: string;
      result: OptimizationResult;
    }>
  ): void {
    this.optimizationHistory.push(...history);
    this.emit('optimizationUpdated', history);
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    // System Overview Dashboard
    const systemOverview: DashboardLayout = {
      id: 'system-overview',
      name: 'System Overview',
      description: 'High-level system health and performance metrics',
      widgets: [
        {
          id: 'response-time-chart',
          type: 'chart',
          title: 'Response Time Trend',
          description: 'Average response time over time',
          config: {
            dataSource: 'performance-metrics',
            refreshInterval: 30000,
            chartType: 'line',
            timeRange: '24h',
          },
          layout: { x: 0, y: 0, width: 6, height: 4 },
        },
        {
          id: 'throughput-gauge',
          type: 'gauge',
          title: 'Current Throughput',
          description: 'Operations per second',
          config: {
            dataSource: 'real-time-metrics',
            refreshInterval: 5000,
          },
          layout: { x: 6, y: 0, width: 3, height: 4 },
        },
        {
          id: 'error-rate-metric',
          type: 'metric',
          title: 'Error Rate',
          description: 'Current system error rate',
          config: {
            dataSource: 'error-metrics',
            refreshInterval: 15000,
          },
          layout: { x: 9, y: 0, width: 3, height: 4 },
        },
        {
          id: 'active-alerts',
          type: 'alert',
          title: 'Active Alerts',
          description: 'Current system alerts',
          config: {
            dataSource: 'alerts',
            refreshInterval: 10000,
          },
          layout: { x: 0, y: 4, width: 12, height: 4 },
        },
      ],
      permissions: {
        view: ['admin', 'operator', 'viewer'],
        edit: ['admin'],
      },
      isDefault: true,
    };

    // Business Analytics Dashboard
    const businessAnalytics: DashboardLayout = {
      id: 'business-analytics',
      name: 'Business Analytics',
      description: 'Tenant and usage analytics for business insights',
      widgets: [
        {
          id: 'tenant-usage-chart',
          type: 'chart',
          title: 'Tenant Usage Distribution',
          description: 'Memory operations by tenant',
          config: {
            dataSource: 'tenant-metrics',
            refreshInterval: 60000,
            chartType: 'bar',
            timeRange: '7d',
          },
          layout: { x: 0, y: 0, width: 6, height: 4 },
        },
        {
          id: 'memory-types-pie',
          type: 'chart',
          title: 'Memory Type Distribution',
          description: 'Distribution of memory types used',
          config: {
            dataSource: 'memory-type-metrics',
            refreshInterval: 60000,
            chartType: 'pie',
          },
          layout: { x: 6, y: 0, width: 6, height: 4 },
        },
        {
          id: 'usage-patterns-heatmap',
          type: 'chart',
          title: 'Usage Patterns',
          description: 'Hourly usage patterns',
          config: {
            dataSource: 'usage-patterns',
            refreshInterval: 300000,
            chartType: 'heatmap',
          },
          layout: { x: 0, y: 4, width: 12, height: 4 },
        },
      ],
      permissions: {
        view: ['admin', 'business-analyst'],
        edit: ['admin'],
      },
      isDefault: false,
    };

    this.dashboards.set(systemOverview.id, systemOverview);
    this.dashboards.set(businessAnalytics.id, businessAnalytics);

    console.log('[AnalyticsDashboard] Initialized default dashboards');
  }

  /**
   * Initialize default queries
   */
  private initializeDefaultQueries(): void {
    const performanceQuery: AnalyticsQuery = {
      id: 'performance-summary',
      name: 'Performance Summary',
      query:
        'SELECT AVG(duration), COUNT(*), operation_type FROM metrics WHERE timestamp >= ? GROUP BY operation_type',
      parameters: { timeRange: '24h' },
      cache: { enabled: true, ttl: 300 },
    };

    this.queries.set(performanceQuery.id, performanceQuery);
  }

  /**
   * Update dashboard data
   */
  private async updateDashboardData(): Promise<void> {
    try {
      const now = new Date();
      const recentMetrics = this.metricsHistory.filter(
        m => now.getTime() - m.timestamp.getTime() < 300000 // Last 5 minutes
      );

      const systemStatus = this.calculateSystemStatus(recentMetrics);
      const uptime = this.calculateUptime();

      this.realtimeData = {
        timestamp: now,
        widgets: {}, // Would be populated with actual widget data
        systemOverview: {
          status: systemStatus,
          uptime,
          totalOperations: this.metricsHistory.length,
          activeUsers: new Set(this.metricsHistory.map(m => m.tenantId)).size,
          errorRate: this.calculateCurrentErrorRate(recentMetrics),
        },
      };

      this.emit('dashboardDataUpdated', this.realtimeData);
    } catch (error) {
      console.error(
        '[AnalyticsDashboard] Error updating dashboard data:',
        error
      );
      this.emit('error', error);
    }
  }

  /**
   * Group metrics by time granularity
   */
  private groupMetricsByTime(
    metrics: PerformanceMetric[],
    granularity: 'minute' | 'hour' | 'day'
  ): Record<string, PerformanceMetric[]> {
    const groups: Record<string, PerformanceMetric[]> = {};

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      let key: string;

      switch (granularity) {
        case 'minute':
          date.setSeconds(0, 0);
          key = date.toISOString();
          break;
        case 'hour':
          date.setMinutes(0, 0, 0);
          key = date.toISOString();
          break;
        case 'day':
          date.setHours(0, 0, 0, 0);
          key = date.toISOString();
          break;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
    });

    return groups;
  }

  /**
   * Calculate current system status
   */
  private calculateSystemStatus(
    recentMetrics: PerformanceMetric[]
  ): 'healthy' | 'warning' | 'critical' {
    if (recentMetrics.length === 0) return 'warning';

    const errorRate =
      1 - recentMetrics.filter(m => m.success).length / recentMetrics.length;
    const avgResponseTime =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
      recentMetrics.length;

    if (errorRate > 0.1 || avgResponseTime > 1000) return 'critical';
    if (errorRate > 0.05 || avgResponseTime > 500) return 'warning';

    return 'healthy';
  }

  /**
   * Calculate system uptime
   */
  private calculateUptime(): number {
    // Simplified uptime calculation
    return 99.9; // Would be calculated from actual uptime data
  }

  /**
   * Calculate current error rate
   */
  private calculateCurrentErrorRate(
    recentMetrics: PerformanceMetric[]
  ): number {
    if (recentMetrics.length === 0) return 0;

    const errors = recentMetrics.filter(m => !m.success).length;
    return errors / recentMetrics.length;
  }

  /**
   * Generate summary section for reports
   */
  private generateSummarySection(startTime: Date, endTime: Date): any {
    const analytics = this.getPerformanceAnalytics(startTime, endTime);
    return {
      period: `${startTime.toISOString()} to ${endTime.toISOString()}`,
      summary: analytics.summary,
      highlights: [
        `${analytics.summary.totalOperations} total operations processed`,
        `${(analytics.summary.successRate * 100).toFixed(1)}% success rate`,
        `${analytics.summary.averageResponseTime.toFixed(2)}ms average response time`,
      ],
    };
  }

  /**
   * Generate security section for reports
   */
  private generateSecuritySection(startTime: Date, endTime: Date): any {
    const relevantAlerts = this.alertsHistory.filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    );

    return {
      totalAlerts: relevantAlerts.length,
      criticalAlerts: relevantAlerts.filter(a => a.type === 'critical').length,
      securityIncidents: 0, // Would be calculated from security events
      threatsBlocked: 0, // Would be calculated from security metrics
    };
  }

  /**
   * Generate optimization section for reports
   */
  private generateOptimizationSection(startTime: Date, endTime: Date): any {
    const relevantOptimizations = this.optimizationHistory.filter(
      o => o.timestamp >= startTime && o.timestamp <= endTime
    );

    return {
      totalOptimizations: relevantOptimizations.length,
      successfulOptimizations: relevantOptimizations.filter(
        o => o.result.success
      ).length,
      averageImprovement:
        relevantOptimizations.reduce(
          (sum, o) => sum + (o.result.impact.expectedImprovement || 0),
          0
        ) / Math.max(relevantOptimizations.length, 1),
      topOptimizations: relevantOptimizations
        .sort(
          (a, b) =>
            (b.result.impact.expectedImprovement || 0) -
            (a.result.impact.expectedImprovement || 0)
        )
        .slice(0, 5)
        .map(o => ({
          rule: o.rule,
          improvement: o.result.impact.expectedImprovement,
          description: o.result.description,
        })),
    };
  }
}
