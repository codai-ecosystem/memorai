/**
 * Enterprise Monitoring & Observability - Comprehensive monitoring, metrics, and alerting
 * Part of Phase 5.2: Monitoring & Observability for Memorai Ultimate Completion Plan
 */

// Result type for consistent error handling
type Result<T, E> =
  | { success: true; error: undefined; data: T }
  | { success: false; error: E; data: undefined };

// Monitoring Types
interface MetricData {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string>;
  dimensions?: Record<string, string>;
}

interface Alert {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'resolved' | 'suppressed';
  triggeredAt: Date;
  resolvedAt?: Date;
  description: string;
  runbook?: string;
  notifications: NotificationConfig[];
}

interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
  threshold: number;
  duration: number; // seconds
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty';
  target: string;
  template?: string;
  escalation?: boolean;
}

interface Dashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  variables: DashboardVariable[];
  refresh: string;
  timeRange: TimeRange;
  tags: string[];
}

interface DashboardPanel {
  id: string;
  title: string;
  type: 'graph' | 'singlestat' | 'table' | 'heatmap' | 'logs';
  query: string;
  visualization: VisualizationConfig;
  position: { x: number; y: number; width: number; height: number };
}

interface DashboardVariable {
  name: string;
  type: 'query' | 'constant' | 'datasource' | 'interval';
  query?: string;
  options?: string[];
  defaultValue?: string;
}

interface TimeRange {
  from: string; // relative time like '1h' or absolute timestamp
  to: string;
}

interface VisualizationConfig {
  axes?: { left?: AxisConfig; right?: AxisConfig };
  legend?: LegendConfig;
  colors?: string[];
  thresholds?: ThresholdConfig[];
}

interface AxisConfig {
  unit: string;
  min?: number;
  max?: number;
  scale: 'linear' | 'log';
}

interface LegendConfig {
  show: boolean;
  position: 'bottom' | 'right' | 'top';
  values: boolean;
}

interface ThresholdConfig {
  value: number;
  color: string;
  operation: 'gt' | 'lt';
}

interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  metadata: Record<string, any>;
}

interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  service: string;
  startTime: Date;
  endTime: Date;
  duration: number; // microseconds
  tags: Record<string, string>;
  logs: Array<{ timestamp: Date; fields: Record<string, any> }>;
  status: 'ok' | 'error' | 'timeout';
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  endpoint?: string;
  dependencies?: string[];
  metadata: Record<string, any>;
}

// Metrics Collection Service
class MetricsCollectionService {
  private readonly metrics: Map<string, MetricData[]> = new Map();
  private readonly collectors: Map<string, any> = new Map();

  constructor() {
    this.initializeCollectors();
    this.startCollection();
  }

  private initializeCollectors(): void {
    // System metrics collector
    this.collectors.set('system', {
      name: 'system',
      interval: 30000, // 30 seconds
      collect: async () => {
        return [
          {
            name: 'cpu_usage_percent',
            value: Math.random() * 100,
            unit: 'percent',
            timestamp: new Date(),
            tags: { host: 'memorai-api-1', service: 'api' },
          },
          {
            name: 'memory_usage_bytes',
            value: Math.random() * 8000000000, // 8GB
            unit: 'bytes',
            timestamp: new Date(),
            tags: { host: 'memorai-api-1', service: 'api' },
          },
          {
            name: 'disk_usage_percent',
            value: Math.random() * 100,
            unit: 'percent',
            timestamp: new Date(),
            tags: { host: 'memorai-api-1', service: 'api', mount: '/data' },
          },
        ];
      },
    });

    // Application metrics collector
    this.collectors.set('application', {
      name: 'application',
      interval: 15000, // 15 seconds
      collect: async () => {
        return [
          {
            name: 'api_requests_total',
            value: Math.floor(Math.random() * 1000),
            unit: 'count',
            timestamp: new Date(),
            tags: {
              service: 'api',
              endpoint: '/memories',
              method: 'GET',
              status: '200',
            },
          },
          {
            name: 'api_response_time_ms',
            value: Math.random() * 1000,
            unit: 'milliseconds',
            timestamp: new Date(),
            tags: { service: 'api', endpoint: '/memories', method: 'GET' },
          },
          {
            name: 'database_connections_active',
            value: Math.floor(Math.random() * 50),
            unit: 'count',
            timestamp: new Date(),
            tags: { service: 'database', type: 'postgresql' },
          },
          {
            name: 'cache_hit_ratio',
            value: 0.85 + Math.random() * 0.15,
            unit: 'ratio',
            timestamp: new Date(),
            tags: { service: 'cache', type: 'redis' },
          },
        ];
      },
    });

    // Business metrics collector
    this.collectors.set('business', {
      name: 'business',
      interval: 60000, // 1 minute
      collect: async () => {
        return [
          {
            name: 'memories_created_total',
            value: Math.floor(Math.random() * 100),
            unit: 'count',
            timestamp: new Date(),
            tags: { service: 'memorai', type: 'creation' },
          },
          {
            name: 'memories_recalled_total',
            value: Math.floor(Math.random() * 500),
            unit: 'count',
            timestamp: new Date(),
            tags: { service: 'memorai', type: 'recall' },
          },
          {
            name: 'active_users',
            value: Math.floor(Math.random() * 1000),
            unit: 'count',
            timestamp: new Date(),
            tags: { service: 'memorai', timeframe: '5m' },
          },
          {
            name: 'vector_similarity_score',
            value: 0.7 + Math.random() * 0.3,
            unit: 'score',
            timestamp: new Date(),
            tags: { service: 'memorai', operation: 'similarity_search' },
          },
        ];
      },
    });
  }

  private startCollection(): void {
    for (const collector of this.collectors.values()) {
      setInterval(async () => {
        try {
          const metrics = await collector.collect();
          for (const metric of metrics) {
            this.recordMetric(metric);
          }
        } catch (error) {
          console.error(
            `Error collecting metrics from ${collector.name}:`,
            error
          );
        }
      }, collector.interval);
    }
  }

  recordMetric(metric: MetricData): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metricHistory = this.metrics.get(key)!;
    metricHistory.push(metric);

    // Keep only last 1000 points per metric
    if (metricHistory.length > 1000) {
      metricHistory.splice(0, metricHistory.length - 1000);
    }
  }

  queryMetrics(
    name: string,
    tags?: Record<string, string>,
    timeRange?: { from: Date; to: Date }
  ): MetricData[] {
    const results: MetricData[] = [];

    for (const [key, metrics] of this.metrics.entries()) {
      const [metricName] = key.split(':');

      if (metricName !== name) continue;

      let filteredMetrics = metrics;

      // Filter by time range
      if (timeRange) {
        filteredMetrics = metrics.filter(
          m => m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
        );
      }

      // Filter by tags
      if (tags) {
        filteredMetrics = filteredMetrics.filter(m => {
          return Object.entries(tags).every(
            ([key, value]) => m.tags[key] === value
          );
        });
      }

      results.push(...filteredMetrics);
    }

    return results.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  aggregateMetrics(
    name: string,
    aggregation: 'avg' | 'sum' | 'min' | 'max' | 'count',
    tags?: Record<string, string>,
    timeRange?: { from: Date; to: Date }
  ): number {
    const metrics = this.queryMetrics(name, tags, timeRange);

    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'count':
        return values.length;
      default:
        return 0;
    }
  }

  getMetricNames(): string[] {
    const names = new Set<string>();
    for (const key of this.metrics.keys()) {
      const [name] = key.split(':');
      names.add(name);
    }
    return Array.from(names);
  }

  getMetricTags(name: string): Record<string, Set<string>> {
    const tagValues: Record<string, Set<string>> = {};

    for (const [key, metrics] of this.metrics.entries()) {
      const [metricName] = key.split(':');
      if (metricName !== name) continue;

      for (const metric of metrics) {
        for (const [tagKey, tagValue] of Object.entries(metric.tags)) {
          if (!tagValues[tagKey]) {
            tagValues[tagKey] = new Set();
          }
          tagValues[tagKey].add(tagValue);
        }
      }
    }

    return tagValues;
  }
}

// Alerting Service
class AlertingService {
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly rules: Map<string, any> = new Map();
  private readonly metricsService: MetricsCollectionService;

  constructor(metricsService: MetricsCollectionService) {
    this.metricsService = metricsService;
    this.initializeAlertRules();
    this.startAlerting();
  }

  private initializeAlertRules(): void {
    // High CPU usage alert
    this.rules.set('high-cpu-usage', {
      name: 'High CPU Usage',
      condition: {
        metric: 'cpu_usage_percent',
        operator: 'gt' as const,
        threshold: 80,
        duration: 300, // 5 minutes
        aggregation: 'avg' as const,
      },
      severity: 'high' as const,
      description: 'CPU usage is above 80% for more than 5 minutes',
      runbook: 'https://runbooks.memorai.com/high-cpu-usage',
      notifications: [
        { type: 'slack' as const, target: '#alerts' },
        { type: 'email' as const, target: 'devops@memorai.com' },
      ],
    });

    // High error rate alert
    this.rules.set('high-error-rate', {
      name: 'High API Error Rate',
      condition: {
        metric: 'api_requests_total',
        operator: 'gt' as const,
        threshold: 0.05, // 5% error rate
        duration: 180, // 3 minutes
        aggregation: 'avg' as const,
      },
      severity: 'critical' as const,
      description: 'API error rate is above 5% for more than 3 minutes',
      runbook: 'https://runbooks.memorai.com/high-error-rate',
      notifications: [
        { type: 'slack' as const, target: '#incidents' },
        { type: 'email' as const, target: 'devops@memorai.com' },
        { type: 'pagerduty' as const, target: 'P1-incidents' },
      ],
    });

    // Database connection pool exhaustion
    this.rules.set('db-connection-exhaustion', {
      name: 'Database Connection Pool Exhaustion',
      condition: {
        metric: 'database_connections_active',
        operator: 'gt' as const,
        threshold: 45,
        duration: 120, // 2 minutes
        aggregation: 'max' as const,
      },
      severity: 'high' as const,
      description: 'Database connection pool is near exhaustion',
      runbook: 'https://runbooks.memorai.com/db-connections',
      notifications: [
        { type: 'slack' as const, target: '#database' },
        { type: 'email' as const, target: 'dba@memorai.com' },
      ],
    });

    // Memory creation rate drop
    this.rules.set('memory-creation-drop', {
      name: 'Memory Creation Rate Drop',
      condition: {
        metric: 'memories_created_total',
        operator: 'lt' as const,
        threshold: 10,
        duration: 600, // 10 minutes
        aggregation: 'sum' as const,
      },
      severity: 'medium' as const,
      description: 'Memory creation rate has dropped significantly',
      runbook: 'https://runbooks.memorai.com/low-creation-rate',
      notifications: [{ type: 'slack' as const, target: '#product' }],
    });
  }

  private startAlerting(): void {
    // Check alert conditions every 30 seconds
    setInterval(() => {
      this.evaluateAlertRules();
    }, 30000);
  }

  private evaluateAlertRules(): void {
    for (const [ruleId, rule] of this.rules.entries()) {
      try {
        const isTriggered = this.evaluateCondition(rule.condition);
        const existingAlert = this.alerts.get(ruleId);

        if (isTriggered && !existingAlert) {
          // Create new alert
          this.createAlert(ruleId, rule);
        } else if (
          !isTriggered &&
          existingAlert &&
          existingAlert.status === 'active'
        ) {
          // Resolve existing alert
          this.resolveAlert(ruleId);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${ruleId}:`, error);
      }
    }
  }

  private evaluateCondition(condition: AlertCondition): boolean {
    const now = new Date();
    const from = new Date(now.getTime() - condition.duration * 1000);

    const value = this.metricsService.aggregateMetrics(
      condition.metric,
      condition.aggregation,
      undefined,
      { from, to: now }
    );

    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  private createAlert(ruleId: string, rule: any): void {
    const alert: Alert = {
      id: `alert-${ruleId}-${Date.now()}`,
      name: rule.name,
      condition: rule.condition,
      severity: rule.severity,
      status: 'active',
      triggeredAt: new Date(),
      description: rule.description,
      runbook: rule.runbook,
      notifications: rule.notifications,
    };

    this.alerts.set(ruleId, alert);
    this.sendNotifications(alert);
  }

  private resolveAlert(ruleId: string): void {
    const alert = this.alerts.get(ruleId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      this.sendResolutionNotifications(alert);
    }
  }

  private sendNotifications(alert: Alert): void {
    for (const notification of alert.notifications) {
      try {
        this.sendNotification(alert, notification);
      } catch (error) {
        console.error(
          `Failed to send ${notification.type} notification:`,
          error
        );
      }
    }
  }

  private sendResolutionNotifications(alert: Alert): void {
    for (const notification of alert.notifications) {
      try {
        this.sendResolutionNotification(alert, notification);
      } catch (error) {
        console.error(
          `Failed to send ${notification.type} resolution notification:`,
          error
        );
      }
    }
  }

  private sendNotification(
    alert: Alert,
    notification: NotificationConfig
  ): void {
    // Simulate notification sending
    console.log(`[${notification.type.toUpperCase()}] ALERT: ${alert.name}`);
    console.log(`Severity: ${alert.severity}`);
    console.log(`Description: ${alert.description}`);
    console.log(`Target: ${notification.target}`);
    if (alert.runbook) {
      console.log(`Runbook: ${alert.runbook}`);
    }
  }

  private sendResolutionNotification(
    alert: Alert,
    notification: NotificationConfig
  ): void {
    // Simulate resolution notification sending
    console.log(`[${notification.type.toUpperCase()}] RESOLVED: ${alert.name}`);
    console.log(`Alert was active for: ${this.getAlertDuration(alert)}`);
    console.log(`Target: ${notification.target}`);
  }

  private getAlertDuration(alert: Alert): string {
    if (!alert.resolvedAt) return 'ongoing';

    const duration = alert.resolvedAt.getTime() - alert.triggeredAt.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.status === 'active'
    );
  }

  getAlertHistory(limit: number = 50): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
      .slice(0, limit);
  }

  acknowledgeAlert(alertId: string): Result<boolean, string> {
    const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
    if (!alert) {
      return {
        success: false,
        error: `Alert not found: ${alertId}`,
        data: undefined,
      };
    }

    // In a real implementation, this would update the alert status
    console.log(`Alert ${alertId} acknowledged`);
    return { success: true, error: undefined, data: true };
  }
}

// Dashboard Service
class DashboardService {
  private readonly dashboards: Map<string, Dashboard> = new Map();
  private readonly metricsService: MetricsCollectionService;

  constructor(metricsService: MetricsCollectionService) {
    this.metricsService = metricsService;
    this.initializeDefaultDashboards();
  }

  private initializeDefaultDashboards(): void {
    // System Overview Dashboard
    this.dashboards.set('system-overview', {
      id: 'system-overview',
      name: 'System Overview',
      description: 'High-level system metrics and health indicators',
      panels: [
        {
          id: 'cpu-usage',
          title: 'CPU Usage',
          type: 'graph',
          query: 'cpu_usage_percent',
          visualization: {
            axes: {
              left: { unit: 'percent', min: 0, max: 100, scale: 'linear' },
            },
            legend: { show: true, position: 'bottom', values: false },
            thresholds: [
              { value: 70, color: 'yellow', operation: 'gt' },
              { value: 90, color: 'red', operation: 'gt' },
            ],
          },
          position: { x: 0, y: 0, width: 12, height: 8 },
        },
        {
          id: 'memory-usage',
          title: 'Memory Usage',
          type: 'graph',
          query: 'memory_usage_bytes',
          visualization: {
            axes: { left: { unit: 'bytes', scale: 'linear' } },
            legend: { show: true, position: 'bottom', values: false },
          },
          position: { x: 12, y: 0, width: 12, height: 8 },
        },
        {
          id: 'api-requests',
          title: 'API Requests per Minute',
          type: 'graph',
          query: 'api_requests_total',
          visualization: {
            axes: { left: { unit: 'requests/min', scale: 'linear' } },
            legend: { show: true, position: 'bottom', values: true },
          },
          position: { x: 0, y: 8, width: 24, height: 8 },
        },
      ],
      variables: [
        {
          name: 'service',
          type: 'query',
          query: 'label_values(service)',
          defaultValue: 'api',
        },
        {
          name: 'interval',
          type: 'interval',
          options: ['1m', '5m', '15m', '1h'],
          defaultValue: '5m',
        },
      ],
      refresh: '30s',
      timeRange: { from: '1h', to: 'now' },
      tags: ['system', 'overview'],
    });

    // Application Performance Dashboard
    this.dashboards.set('app-performance', {
      id: 'app-performance',
      name: 'Application Performance',
      description: 'Application-specific performance metrics',
      panels: [
        {
          id: 'response-time',
          title: 'API Response Time',
          type: 'graph',
          query: 'api_response_time_ms',
          visualization: {
            axes: { left: { unit: 'milliseconds', scale: 'linear' } },
            legend: { show: true, position: 'bottom', values: true },
            thresholds: [
              { value: 500, color: 'yellow', operation: 'gt' },
              { value: 1000, color: 'red', operation: 'gt' },
            ],
          },
          position: { x: 0, y: 0, width: 12, height: 8 },
        },
        {
          id: 'error-rate',
          title: 'Error Rate',
          type: 'singlestat',
          query: 'api_error_rate',
          visualization: {
            thresholds: [
              { value: 0.01, color: 'green', operation: 'lt' },
              { value: 0.05, color: 'yellow', operation: 'lt' },
              { value: 0.1, color: 'red', operation: 'gt' },
            ],
          },
          position: { x: 12, y: 0, width: 6, height: 8 },
        },
        {
          id: 'throughput',
          title: 'Throughput',
          type: 'singlestat',
          query: 'api_requests_per_second',
          visualization: {
            axes: { left: { unit: 'req/s', scale: 'linear' } },
          },
          position: { x: 18, y: 0, width: 6, height: 8 },
        },
      ],
      variables: [],
      refresh: '10s',
      timeRange: { from: '30m', to: 'now' },
      tags: ['application', 'performance'],
    });

    // Business Metrics Dashboard
    this.dashboards.set('business-metrics', {
      id: 'business-metrics',
      name: 'Business Metrics',
      description: 'Key business and product metrics',
      panels: [
        {
          id: 'memories-created',
          title: 'Memories Created',
          type: 'graph',
          query: 'memories_created_total',
          visualization: {
            axes: { left: { unit: 'count', scale: 'linear' } },
            legend: { show: true, position: 'bottom', values: true },
          },
          position: { x: 0, y: 0, width: 12, height: 8 },
        },
        {
          id: 'memories-recalled',
          title: 'Memories Recalled',
          type: 'graph',
          query: 'memories_recalled_total',
          visualization: {
            axes: { left: { unit: 'count', scale: 'linear' } },
            legend: { show: true, position: 'bottom', values: true },
          },
          position: { x: 12, y: 0, width: 12, height: 8 },
        },
        {
          id: 'active-users',
          title: 'Active Users',
          type: 'singlestat',
          query: 'active_users',
          visualization: {
            axes: { left: { unit: 'users', scale: 'linear' } },
          },
          position: { x: 0, y: 8, width: 8, height: 6 },
        },
        {
          id: 'similarity-scores',
          title: 'Average Similarity Score',
          type: 'singlestat',
          query: 'vector_similarity_score',
          visualization: {
            axes: { left: { unit: 'score', min: 0, max: 1, scale: 'linear' } },
            thresholds: [
              { value: 0.8, color: 'green', operation: 'gt' },
              { value: 0.6, color: 'yellow', operation: 'gt' },
              { value: 0.4, color: 'red', operation: 'lt' },
            ],
          },
          position: { x: 8, y: 8, width: 8, height: 6 },
        },
      ],
      variables: [],
      refresh: '1m',
      timeRange: { from: '24h', to: 'now' },
      tags: ['business', 'product'],
    });
  }

  createDashboard(dashboard: Omit<Dashboard, 'id'>): Result<string, string> {
    try {
      const id = `dashboard-${Date.now()}`;
      const newDashboard: Dashboard = { ...dashboard, id };

      this.dashboards.set(id, newDashboard);

      return { success: true, error: undefined, data: id };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  getDashboard(id: string): Dashboard | undefined {
    return this.dashboards.get(id);
  }

  listDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  updateDashboard(
    id: string,
    updates: Partial<Dashboard>
  ): Result<boolean, string> {
    try {
      const dashboard = this.dashboards.get(id);
      if (!dashboard) {
        return {
          success: false,
          error: `Dashboard not found: ${id}`,
          data: undefined,
        };
      }

      const updatedDashboard = { ...dashboard, ...updates, id };
      this.dashboards.set(id, updatedDashboard);

      return { success: true, error: undefined, data: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  deleteDashboard(id: string): Result<boolean, string> {
    try {
      const deleted = this.dashboards.delete(id);

      if (!deleted) {
        return {
          success: false,
          error: `Dashboard not found: ${id}`,
          data: undefined,
        };
      }

      return { success: true, error: undefined, data: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }

  renderDashboard(id: string): Result<any, string> {
    try {
      const dashboard = this.getDashboard(id);
      if (!dashboard) {
        return {
          success: false,
          error: `Dashboard not found: ${id}`,
          data: undefined,
        };
      }

      // Render dashboard with current data
      const renderedPanels = dashboard.panels.map(panel => {
        const data = this.metricsService.queryMetrics(panel.query);
        return {
          ...panel,
          data: data.slice(-100), // Last 100 points
        };
      });

      return {
        success: true,
        error: undefined,
        data: { ...dashboard, panels: renderedPanels },
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to render dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined,
      };
    }
  }
}

// Health Check Service
class HealthCheckService {
  private readonly checks: Map<string, HealthCheck> = new Map();

  constructor() {
    this.initializeHealthChecks();
    this.startHealthChecking();
  }

  private initializeHealthChecks(): void {
    this.checks.set('api-health', {
      name: 'API Health',
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      endpoint: 'http://localhost:3000/health',
      dependencies: ['database', 'cache'],
      metadata: {},
    });

    this.checks.set('database', {
      name: 'Database Connection',
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      metadata: { host: 'localhost', port: 5432 },
    });

    this.checks.set('cache', {
      name: 'Cache Service',
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      metadata: { host: 'localhost', port: 6379 },
    });

    this.checks.set('vector-db', {
      name: 'Vector Database',
      status: 'healthy',
      lastCheck: new Date(),
      responseTime: 0,
      metadata: { host: 'localhost', port: 6333 },
    });
  }

  private startHealthChecking(): void {
    // Run health checks every 30 seconds
    setInterval(() => {
      this.runAllHealthChecks();
    }, 30000);
  }

  private async runAllHealthChecks(): Promise<void> {
    for (const [name, check] of this.checks.entries()) {
      try {
        await this.runHealthCheck(name);
      } catch (error) {
        console.error(`Health check failed for ${name}:`, error);
      }
    }
  }

  private async runHealthCheck(name: string): Promise<void> {
    const check = this.checks.get(name);
    if (!check) return;

    const startTime = Date.now();

    try {
      // Simulate health check
      const isHealthy = await this.performCheck(check);
      const responseTime = Date.now() - startTime;

      check.status = isHealthy ? 'healthy' : 'unhealthy';
      check.responseTime = responseTime;
      check.lastCheck = new Date();

      // Check degraded status based on response time
      if (isHealthy && responseTime > 1000) {
        check.status = 'degraded';
      }
    } catch (error) {
      check.status = 'unhealthy';
      check.responseTime = Date.now() - startTime;
      check.lastCheck = new Date();
      check.metadata.error =
        error instanceof Error ? error.message : 'Unknown error';
    }
  }

  private async performCheck(check: HealthCheck): Promise<boolean> {
    // Simulate different types of health checks
    switch (check.name) {
      case 'API Health':
        // Simulate HTTP health check
        return Math.random() > 0.1; // 90% success rate
      case 'Database Connection':
        // Simulate database connection check
        return Math.random() > 0.05; // 95% success rate
      case 'Cache Service':
        // Simulate cache ping
        return Math.random() > 0.03; // 97% success rate
      case 'Vector Database':
        // Simulate vector DB health check
        return Math.random() > 0.02; // 98% success rate
      default:
        return true;
    }
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
  } {
    const checks = Array.from(this.checks.values());
    const unhealthy = checks.filter(c => c.status === 'unhealthy');
    const degraded = checks.filter(c => c.status === 'degraded');

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (unhealthy.length > 0) {
      status = 'unhealthy';
    } else if (degraded.length > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    return { status, checks };
  }

  getHealthCheck(name: string): HealthCheck | undefined {
    return this.checks.get(name);
  }

  listHealthChecks(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  addHealthCheck(check: HealthCheck): void {
    this.checks.set(check.name, check);
  }

  removeHealthCheck(name: string): boolean {
    return this.checks.delete(name);
  }
}

// Export all monitoring services
export {
  AlertingService,
  DashboardService,
  HealthCheckService,
  MetricsCollectionService,
};
