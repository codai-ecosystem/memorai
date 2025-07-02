/**
 * Custom Metrics and Dashboard Engine for Memorai Enterprise
 * 
 * Implements Prometheus-compatible metrics collection and Grafana dashboard
 * integration for comprehensive monitoring and observability.
 * 
 * Features:
 * - Custom application metrics
 * - Performance counters and gauges
 * - Business intelligence metrics
 * - Real-time dashboard updates
 * - Alerting and notification integration
 */

/**
 * Metric types supported by the system
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Time series data point
 */
export interface MetricDataPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

/**
 * Metric definition
 */
export interface MetricDefinition {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  labels?: string[];
  buckets?: number[]; // For histograms
  quantiles?: number[]; // For summaries
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  title: string;
  description: string;
  tags: string[];
  panels: DashboardPanel[];
  refreshInterval: number;
  timeRange: {
    from: string;
    to: string;
  };
}

/**
 * Dashboard panel configuration
 */
export interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap' | 'gauge';
  queries: MetricQuery[];
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  options: Record<string, any>;
}

/**
 * Metric query for dashboards
 */
export interface MetricQuery {
  metric: string;
  labels?: Record<string, string>;
  aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count';
  timeRange?: string;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: {
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    threshold: number;
    duration: string;
  };
  actions: AlertAction[];
  enabled: boolean;
}

/**
 * Alert action configuration
 */
export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty';
  config: Record<string, any>;
}

/**
 * Memory operation metrics
 */
export interface MemoryOperationMetrics {
  operationType: string;
  duration: number;
  success: boolean;
  errorType?: string;
  cacheHit?: boolean;
  resultCount?: number;
  dataSize?: number;
  tenantId: string;
  userId?: string;
}

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIO: {
    bytesIn: number;
    bytesOut: number;
  };
  activeConnections: number;
  queueSize: number;
}

/**
 * Business intelligence metrics
 */
export interface BusinessMetrics {
  activeUsers: number;
  operationsPerSecond: number;
  dataGrowthRate: number;
  customerSatisfactionScore?: number;
  errorRate: number;
  responseTimeP95: number;
}

/**
 * Counter metric implementation
 */
class Counter {
  private value: number = 0;
  private labels: Record<string, string> = {};

  constructor(public definition: MetricDefinition) {}

  increment(labels?: Record<string, string>, value: number = 1): void {
    this.value += value;
    if (labels) {
      this.labels = { ...this.labels, ...labels };
    }
  }

  getValue(): MetricDataPoint {
    return {
      timestamp: Date.now(),
      value: this.value,
      labels: this.labels
    };
  }

  reset(): void {
    this.value = 0;
  }
}

/**
 * Gauge metric implementation
 */
class Gauge {
  private value: number = 0;
  private labels: Record<string, string> = {};

  constructor(public definition: MetricDefinition) {}

  set(value: number, labels?: Record<string, string>): void {
    this.value = value;
    if (labels) {
      this.labels = { ...this.labels, ...labels };
    }
  }

  increment(value: number = 1, labels?: Record<string, string>): void {
    this.value += value;
    if (labels) {
      this.labels = { ...this.labels, ...labels };
    }
  }

  decrement(value: number = 1, labels?: Record<string, string>): void {
    this.value -= value;
    if (labels) {
      this.labels = { ...this.labels, ...labels };
    }
  }

  getValue(): MetricDataPoint {
    return {
      timestamp: Date.now(),
      value: this.value,
      labels: this.labels
    };
  }
}

/**
 * Histogram metric implementation
 */
class Histogram {
  private buckets: Map<number, number> = new Map();
  private sum: number = 0;
  private count: number = 0;
  private labels: Record<string, string> = {};

  constructor(public definition: MetricDefinition) {
    const buckets = definition.buckets || [0.1, 0.5, 1, 2.5, 5, 10];
    buckets.forEach(bucket => this.buckets.set(bucket, 0));
    this.buckets.set(Infinity, 0); // +Inf bucket
  }

  observe(value: number, labels?: Record<string, string>): void {
    this.sum += value;
    this.count++;
    
    if (labels) {
      this.labels = { ...this.labels, ...labels };
    }

    // Update buckets
    for (const [bucket, currentCount] of this.buckets) {
      if (value <= bucket) {
        this.buckets.set(bucket, currentCount + 1);
      }
    }
  }

  getValue(): MetricDataPoint[] {
    const dataPoints: MetricDataPoint[] = [];
    const timestamp = Date.now();

    // Bucket values
    for (const [bucket, count] of this.buckets) {
      dataPoints.push({
        timestamp,
        value: count,
        labels: { ...this.labels, le: bucket === Infinity ? '+Inf' : bucket.toString() }
      });
    }

    // Sum and count
    dataPoints.push({
      timestamp,
      value: this.sum,
      labels: { ...this.labels, __type: 'sum' }
    });

    dataPoints.push({
      timestamp,
      value: this.count,
      labels: { ...this.labels, __type: 'count' }
    });

    return dataPoints;
  }
}

/**
 * Custom Metrics and Dashboard Engine
 * 
 * Provides comprehensive metrics collection, storage, and dashboard
 * management for enterprise monitoring and observability.
 */
export class CustomMetricsEngine {
  private metrics: Map<string, Counter | Gauge | Histogram> = new Map();
  private metricDefinitions: Map<string, MetricDefinition> = new Map();
  private dashboards: Map<string, DashboardConfig> = new Map();
  private alerts: Map<string, AlertConfig> = new Map();
  private isCollecting: boolean = false;
  private collectionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultMetrics();
  }

  /**
   * Initialize default memorai metrics
   */
  private initializeDefaultMetrics(): void {
    // Operation metrics
    this.registerMetric({
      name: 'memorai_operations_total',
      type: 'counter',
      description: 'Total number of memory operations',
      labels: ['operation_type', 'tenant_id', 'success']
    });

    this.registerMetric({
      name: 'memorai_operation_duration_seconds',
      type: 'histogram',
      description: 'Duration of memory operations in seconds',
      labels: ['operation_type', 'tenant_id'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    });

    this.registerMetric({
      name: 'memorai_cache_hits_total',
      type: 'counter',
      description: 'Total number of cache hits',
      labels: ['cache_type', 'tenant_id']
    });

    this.registerMetric({
      name: 'memorai_active_memories',
      type: 'gauge',
      description: 'Current number of active memories',
      labels: ['tenant_id']
    });

    // System metrics
    this.registerMetric({
      name: 'memorai_system_cpu_usage',
      type: 'gauge',
      description: 'System CPU usage percentage',
      unit: 'percent'
    });

    this.registerMetric({
      name: 'memorai_system_memory_usage',
      type: 'gauge',
      description: 'System memory usage in bytes',
      unit: 'bytes'
    });

    this.registerMetric({
      name: 'memorai_active_connections',
      type: 'gauge',
      description: 'Number of active database connections'
    });

    // Business metrics
    this.registerMetric({
      name: 'memorai_active_users',
      type: 'gauge',
      description: 'Number of active users',
      labels: ['tenant_id']
    });

    this.registerMetric({
      name: 'memorai_error_rate',
      type: 'gauge',
      description: 'Error rate percentage',
      labels: ['error_type'],
      unit: 'percent'
    });
  }

  /**
   * Register a new metric
   */
  registerMetric(definition: MetricDefinition): void {
    this.metricDefinitions.set(definition.name, definition);

    let metric: Counter | Gauge | Histogram;
    
    switch (definition.type) {
      case 'counter':
        metric = new Counter(definition);
        break;
      case 'gauge':
        metric = new Gauge(definition);
        break;
      case 'histogram':
        metric = new Histogram(definition);
        break;
      default:
        throw new Error(`Unsupported metric type: ${definition.type}`);
    }

    this.metrics.set(definition.name, metric);
  }

  /**
   * Record memory operation metrics
   */
  recordMemoryOperation(metrics: MemoryOperationMetrics): void {
    const labels = {
      operation_type: metrics.operationType,
      tenant_id: metrics.tenantId,
      success: metrics.success.toString()
    };

    // Increment operation counter
    const operationCounter = this.metrics.get('memorai_operations_total') as Counter;
    operationCounter?.increment(labels);

    // Record duration
    const durationHistogram = this.metrics.get('memorai_operation_duration_seconds') as Histogram;
    durationHistogram?.observe(metrics.duration / 1000, {
      operation_type: metrics.operationType,
      tenant_id: metrics.tenantId
    });

    // Record cache hit if applicable
    if (metrics.cacheHit !== undefined) {
      const cacheCounter = this.metrics.get('memorai_cache_hits_total') as Counter;
      if (metrics.cacheHit) {
        cacheCounter?.increment({
          cache_type: 'memory',
          tenant_id: metrics.tenantId
        });
      }
    }

    // Update error rate if operation failed
    if (!metrics.success && metrics.errorType) {
      this.updateErrorRate(metrics.errorType);
    }
  }

  /**
   * Record system performance metrics
   */
  recordSystemMetrics(metrics: SystemPerformanceMetrics): void {
    (this.metrics.get('memorai_system_cpu_usage') as Gauge)?.set(metrics.cpuUsage);
    (this.metrics.get('memorai_system_memory_usage') as Gauge)?.set(metrics.memoryUsage);
    (this.metrics.get('memorai_active_connections') as Gauge)?.set(metrics.activeConnections);
  }

  /**
   * Record business metrics
   */
  recordBusinessMetrics(metrics: BusinessMetrics): void {
    (this.metrics.get('memorai_active_users') as Gauge)?.set(metrics.activeUsers);
    (this.metrics.get('memorai_error_rate') as Gauge)?.set(metrics.errorRate);
  }

  /**
   * Update error rate
   */
  private updateErrorRate(errorType: string): void {
    const errorGauge = this.metrics.get('memorai_error_rate') as Gauge;
    errorGauge?.increment(1, { error_type: errorType });
  }

  /**
   * Get metric value
   */
  getMetric(name: string): MetricDataPoint | MetricDataPoint[] | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      return null;
    }

    if (metric instanceof Histogram) {
      return metric.getValue();
    } else {
      return metric.getValue();
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    let output = '';
    
    for (const [name, definition] of this.metricDefinitions) {
      const metric = this.metrics.get(name);
      if (!metric) continue;

      // Add metric header
      output += `# HELP ${name} ${definition.description}\n`;
      output += `# TYPE ${name} ${definition.type}\n`;

      // Add metric data
      const data = metric.getValue();
      if (Array.isArray(data)) {
        // Histogram data
        for (const point of data) {
          const labelStr = this.formatLabels(point.labels || {});
          output += `${name}${labelStr} ${point.value} ${point.timestamp}\n`;
        }
      } else {
        // Single data point
        const labelStr = this.formatLabels(data.labels || {});
        output += `${name}${labelStr} ${data.value} ${data.timestamp}\n`;
      }
      
      output += '\n';
    }

    return output;
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels: Record<string, string>): string {
    const labelPairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return labelPairs ? `{${labelPairs}}` : '';
  }

  /**
   * Create dashboard
   */
  createDashboard(config: DashboardConfig): void {
    this.dashboards.set(config.id, config);
  }

  /**
   * Get dashboard configuration
   */
  getDashboard(id: string): DashboardConfig | undefined {
    return this.dashboards.get(id);
  }

  /**
   * List all dashboards
   */
  listDashboards(): DashboardConfig[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Create alert
   */
  createAlert(config: AlertConfig): void {
    this.alerts.set(config.id, config);
  }

  /**
   * Check alerts and trigger actions
   */
  async checkAlerts(): Promise<void> {
    for (const [id, alert] of this.alerts) {
      if (!alert.enabled) continue;

      const metric = this.getMetric(alert.metric);
      if (!metric || Array.isArray(metric)) continue;

      const shouldTrigger = this.evaluateCondition(metric.value, alert.condition);
      
      if (shouldTrigger) {
        await this.triggerAlert(id, alert, metric.value);
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(value: number, condition: AlertConfig['condition']): boolean {
    switch (condition.operator) {
      case '>': return value > condition.threshold;
      case '<': return value < condition.threshold;
      case '>=': return value >= condition.threshold;
      case '<=': return value <= condition.threshold;
      case '=': return value === condition.threshold;
      case '!=': return value !== condition.threshold;
      default: return false;
    }
  }

  /**
   * Trigger alert actions
   */
  private async triggerAlert(id: string, alert: AlertConfig, value: number): Promise<void> {
    console.log(`[ALERT] ${alert.name}: ${alert.metric} = ${value} ${alert.condition.operator} ${alert.condition.threshold}`);
    
    // In a real implementation, this would trigger actual alert actions
    for (const action of alert.actions) {
      console.log(`[ALERT ACTION] ${action.type}:`, action.config);
    }
  }

  /**
   * Start metrics collection
   */
  startCollection(intervalMs: number = 30000): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;
    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
      await this.checkAlerts();
    }, intervalMs);
  }

  /**
   * Stop metrics collection
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    this.isCollecting = false;
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect basic system metrics
      const metrics: SystemPerformanceMetrics = {
        cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage
        memoryUsage: process.memoryUsage().heapUsed,
        diskUsage: 0, // Would be implemented with actual disk monitoring
        networkIO: { bytesIn: 0, bytesOut: 0 }, // Would be implemented with network monitoring
        activeConnections: 0, // Would be implemented with connection monitoring
        queueSize: 0 // Would be implemented with queue monitoring
      };

      this.recordSystemMetrics(metrics);
    } catch (error) {
      console.error('[MetricsEngine] Failed to collect system metrics:', error);
    }
  }

  /**
   * Get metrics statistics
   */
  getStats(): {
    totalMetrics: number;
    totalDashboards: number;
    totalAlerts: number;
    isCollecting: boolean;
  } {
    return {
      totalMetrics: this.metrics.size,
      totalDashboards: this.dashboards.size,
      totalAlerts: this.alerts.size,
      isCollecting: this.isCollecting
    };
  }
}

/**
 * Default memorai dashboard configuration
 */
export const DEFAULT_MEMORAI_DASHBOARD: DashboardConfig = {
  id: 'memorai-overview',
  title: 'Memorai Enterprise Overview',
  description: 'Comprehensive overview of memorai system performance and health',
  tags: ['memorai', 'enterprise', 'overview'],
  refreshInterval: 30,
  timeRange: {
    from: 'now-1h',
    to: 'now'
  },
  panels: [
    {
      id: 'operations-rate',
      title: 'Operations per Second',
      type: 'graph',
      queries: [
        {
          metric: 'memorai_operations_total',
          aggregation: 'sum'
        }
      ],
      position: { x: 0, y: 0, width: 12, height: 8 },
      options: {}
    },
    {
      id: 'response-time',
      title: 'Response Time P95',
      type: 'graph',
      queries: [
        {
          metric: 'memorai_operation_duration_seconds',
          aggregation: 'avg'
        }
      ],
      position: { x: 12, y: 0, width: 12, height: 8 },
      options: {}
    },
    {
      id: 'active-memories',
      title: 'Active Memories',
      type: 'stat',
      queries: [
        {
          metric: 'memorai_active_memories',
          aggregation: 'sum'
        }
      ],
      position: { x: 0, y: 8, width: 6, height: 4 },
      options: {}
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      type: 'stat',
      queries: [
        {
          metric: 'memorai_error_rate',
          aggregation: 'avg'
        }
      ],
      position: { x: 6, y: 8, width: 6, height: 4 },
      options: {}
    }
  ]
};

/**
 * Create default metrics engine
 */
export function createCustomMetricsEngine(): CustomMetricsEngine {
  const engine = new CustomMetricsEngine();
  engine.createDashboard(DEFAULT_MEMORAI_DASHBOARD);
  return engine;
}

export default CustomMetricsEngine;
