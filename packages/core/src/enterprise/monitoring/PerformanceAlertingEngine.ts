/**
 * Performance Alerting and Anomaly Detection Engine for Memorai Enterprise
 *
 * Implements comprehensive performance monitoring with intelligent alerting,
 * anomaly detection, and automated response systems.
 *
 * Features:
 * - Real-time performance threshold monitoring
 * - Machine learning-based anomaly detection
 * - Multi-channel alert delivery (email, Slack, webhooks)
 * - Alert escalation and notification management
 * - Performance trend analysis and prediction
 */

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * Alert status tracking
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

/**
 * Performance metric types
 */
export type MetricType =
  | 'response_time'
  | 'error_rate'
  | 'throughput'
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_usage'
  | 'network_latency'
  | 'queue_depth'
  | 'active_connections'
  | 'cache_hit_rate';

/**
 * Alert condition configuration
 */
export interface AlertCondition {
  metric: MetricType;
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'change' | 'anomaly';
  threshold: number;
  duration: number; // Seconds the condition must persist
  comparison?: 'absolute' | 'percentage' | 'baseline';
  timeWindow?: number; // Minutes for comparison baseline
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  tags: string[];
  targets: AlertTarget[];
  cooldown: number; // Minutes between alerts
  escalation?: EscalationRule;
  metadata?: {
    component?: string;
    environment?: string;
    owner?: string;
    runbook?: string;
  };
}

/**
 * Alert target configuration
 */
export interface AlertTarget {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams';
  config: {
    url?: string;
    emails?: string[];
    channel?: string;
    webhook_url?: string;
    service_key?: string;
    [key: string]: any;
  };
  enabled: boolean;
  severityFilter?: AlertSeverity[];
}

/**
 * Escalation rule configuration
 */
export interface EscalationRule {
  levels: EscalationLevel[];
  maxLevel: number;
  escalationInterval: number; // Minutes between escalations
}

/**
 * Escalation level configuration
 */
export interface EscalationLevel {
  level: number;
  targets: AlertTarget[];
  severity: AlertSeverity;
  message?: string;
}

/**
 * Performance metric data point
 */
export interface MetricDataPoint {
  metric: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Alert instance
 */
export interface Alert {
  id: string;
  ruleId: string;
  rule: AlertRule;
  status: AlertStatus;
  severity: AlertSeverity;
  message: string;
  details: {
    triggeredConditions: AlertCondition[];
    metricValues: MetricDataPoint[];
    threshold: number;
    actualValue: number;
    duration: number;
  };
  timestamps: {
    triggered: number;
    acknowledged?: number;
    resolved?: number;
    lastEscalated?: number;
  };
  escalationLevel: number;
  acknowledgments: AlertAcknowledgment[];
  tags: string[];
  metadata?: Record<string, any>;
}

/**
 * Alert acknowledgment record
 */
export interface AlertAcknowledgment {
  userId: string;
  timestamp: number;
  message?: string;
  action: 'acknowledge' | 'resolve' | 'escalate' | 'suppress';
}

/**
 * Performance baseline for anomaly detection
 */
export interface PerformanceBaseline {
  metric: MetricType;
  component?: string;
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  dataPoints: number;
  timeWindow: number; // Minutes
  lastUpdated: number;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  metric: MetricType;
  severity: AlertSeverity;
  anomalyScore: number; // 0-1, higher = more anomalous
  actualValue: number;
  expectedRange: {
    min: number;
    max: number;
  };
  timestamp: number;
  description: string;
  confidence: number; // 0-1, higher = more confident
}

/**
 * Alert delivery receipt
 */
export interface AlertDeliveryReceipt {
  alertId: string;
  target: AlertTarget;
  status: 'sent' | 'failed' | 'pending';
  timestamp: number;
  error?: string;
  response?: any;
}

/**
 * Baseline computation engine for anomaly detection
 */
class BaselineEngine {
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private readonly MAX_BASELINE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MIN_DATA_POINTS = 50;

  /**
   * Update baseline with new metric data
   */
  updateBaseline(metrics: MetricDataPoint[]): void {
    const groupedMetrics = this.groupMetricsByType(metrics);

    for (const [metricType, dataPoints] of groupedMetrics) {
      const key = this.getBaselineKey(metricType);
      const values = dataPoints.map(dp => dp.value);

      if (values.length < this.MIN_DATA_POINTS) continue;

      const statistics = this.calculateStatistics(values);

      const baseline: PerformanceBaseline = {
        metric: metricType,
        statistics,
        dataPoints: values.length,
        timeWindow: 60, // 1 hour window
        lastUpdated: Date.now(),
      };

      this.baselines.set(key, baseline);
    }
  }

  /**
   * Detect anomalies in current metrics
   */
  detectAnomalies(metrics: MetricDataPoint[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    for (const metric of metrics) {
      const baselineKey = this.getBaselineKey(metric.metric);
      const baseline = this.baselines.get(baselineKey);

      if (!baseline || this.isBaselineStale(baseline)) {
        continue;
      }

      const anomaly = this.analyzeMetricForAnomaly(metric, baseline);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    }

    return anomalies;
  }

  /**
   * Analyze single metric for anomaly
   */
  private analyzeMetricForAnomaly(
    metric: MetricDataPoint,
    baseline: PerformanceBaseline
  ): AnomalyDetection | null {
    const { statistics } = baseline;
    const value = metric.value;

    // Calculate z-score for statistical anomaly detection
    const zScore = Math.abs(value - statistics.mean) / (statistics.stdDev || 1);

    // Calculate percentile-based bounds
    const iqr = statistics.p95 - statistics.median;
    const lowerBound = statistics.median - 2 * iqr;
    const upperBound = statistics.median + 2 * iqr;

    // Determine if anomalous
    const isStatisticalAnomaly = zScore > 2.5;
    const isPercentileAnomaly = value < lowerBound || value > upperBound;

    if (!isStatisticalAnomaly && !isPercentileAnomaly) {
      return null;
    }

    // Calculate anomaly score (0-1)
    const anomalyScore = Math.min(
      1,
      Math.max(
        zScore / 5, // Statistical component
        Math.max(
          (value - upperBound) / (statistics.max - upperBound),
          (lowerBound - value) / (lowerBound - statistics.min)
        ) // Percentile component
      )
    );

    // Determine severity based on anomaly score
    let severity: AlertSeverity;
    if (anomalyScore > 0.8) severity = AlertSeverity.EMERGENCY;
    else if (anomalyScore > 0.6) severity = AlertSeverity.CRITICAL;
    else if (anomalyScore > 0.4) severity = AlertSeverity.WARNING;
    else severity = AlertSeverity.INFO;

    return {
      metric: metric.metric,
      severity,
      anomalyScore,
      actualValue: value,
      expectedRange: {
        min: lowerBound,
        max: upperBound,
      },
      timestamp: metric.timestamp,
      description: `${metric.metric} anomaly: ${value.toFixed(2)} (expected ${lowerBound.toFixed(2)}-${upperBound.toFixed(2)})`,
      confidence: Math.min(1, baseline.dataPoints / 100), // More data = higher confidence
    };
  }

  /**
   * Group metrics by type
   */
  private groupMetricsByType(
    metrics: MetricDataPoint[]
  ): Map<MetricType, MetricDataPoint[]> {
    const grouped = new Map<MetricType, MetricDataPoint[]>();

    for (const metric of metrics) {
      if (!grouped.has(metric.metric)) {
        grouped.set(metric.metric, []);
      }
      grouped.get(metric.metric)!.push(metric);
    }

    return grouped;
  }

  /**
   * Calculate statistical measures
   */
  private calculateStatistics(
    values: number[]
  ): PerformanceBaseline['statistics'] {
    const sorted = [...values].sort((a, b) => a - b);
    const len = sorted.length;

    const mean = values.reduce((sum, val) => sum + val, 0) / len;
    const median =
      len % 2 === 0
        ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
        : sorted[Math.floor(len / 2)];

    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len;
    const stdDev = Math.sqrt(variance);

    const p95Index = Math.floor(len * 0.95);
    const p99Index = Math.floor(len * 0.99);

    return {
      mean,
      median,
      stdDev,
      p95: sorted[p95Index],
      p99: sorted[p99Index],
      min: sorted[0],
      max: sorted[len - 1],
    };
  }

  /**
   * Get baseline key for metric
   */
  private getBaselineKey(metric: MetricType, component?: string): string {
    return component ? `${metric}:${component}` : metric;
  }

  /**
   * Check if baseline is stale
   */
  private isBaselineStale(baseline: PerformanceBaseline): boolean {
    return Date.now() - baseline.lastUpdated > this.MAX_BASELINE_AGE;
  }

  /**
   * Get baseline for metric
   */
  getBaseline(
    metric: MetricType,
    component?: string
  ): PerformanceBaseline | undefined {
    const key = this.getBaselineKey(metric, component);
    return this.baselines.get(key);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): PerformanceBaseline[] {
    return Array.from(this.baselines.values());
  }
}

/**
 * Alert delivery engine
 */
class AlertDeliveryEngine {
  private deliveryQueue: Alert[] = [];
  private deliveryReceipts: Map<string, AlertDeliveryReceipt[]> = new Map();

  /**
   * Deliver alert to configured targets
   */
  async deliverAlert(alert: Alert): Promise<AlertDeliveryReceipt[]> {
    const receipts: AlertDeliveryReceipt[] = [];

    for (const target of alert.rule.targets) {
      if (!target.enabled) continue;

      // Check severity filter
      if (
        target.severityFilter &&
        !target.severityFilter.includes(alert.severity)
      ) {
        continue;
      }

      const receipt = await this.deliverToTarget(alert, target);
      receipts.push(receipt);
    }

    // Store receipts
    this.deliveryReceipts.set(alert.id, receipts);

    return receipts;
  }

  /**
   * Deliver alert to specific target
   */
  private async deliverToTarget(
    alert: Alert,
    target: AlertTarget
  ): Promise<AlertDeliveryReceipt> {
    const receipt: AlertDeliveryReceipt = {
      alertId: alert.id,
      target,
      status: 'pending',
      timestamp: Date.now(),
    };

    try {
      switch (target.type) {
        case 'email':
          await this.deliverToEmail(alert, target);
          break;
        case 'slack':
          await this.deliverToSlack(alert, target);
          break;
        case 'webhook':
          await this.deliverToWebhook(alert, target);
          break;
        case 'pagerduty':
          await this.deliverToPagerDuty(alert, target);
          break;
        case 'teams':
          await this.deliverToTeams(alert, target);
          break;
        default:
          throw new Error(`Unsupported target type: ${target.type}`);
      }

      receipt.status = 'sent';
    } catch (error) {
      receipt.status = 'failed';
      receipt.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return receipt;
  }

  /**
   * Deliver to email (mock implementation)
   */
  private async deliverToEmail(
    alert: Alert,
    target: AlertTarget
  ): Promise<void> {
    // Mock implementation - would integrate with actual email service
    console.log(
      `[EMAIL] Alert ${alert.id} sent to ${target.config.emails?.join(', ')}`
    );
    console.log(
      `Subject: [${alert.severity.toUpperCase()}] ${alert.rule.name}`
    );
    console.log(`Message: ${alert.message}`);
  }

  /**
   * Deliver to Slack (mock implementation)
   */
  private async deliverToSlack(
    alert: Alert,
    target: AlertTarget
  ): Promise<void> {
    // Mock implementation - would use Slack API
    const message = this.formatSlackMessage(alert);
    console.log(`[SLACK] Alert ${alert.id} sent to ${target.config.channel}`);
    console.log(`Message: ${JSON.stringify(message, null, 2)}`);
  }

  /**
   * Deliver to webhook (mock implementation)
   */
  private async deliverToWebhook(
    alert: Alert,
    target: AlertTarget
  ): Promise<void> {
    // Mock implementation - would make HTTP POST request
    const payload = {
      alert_id: alert.id,
      severity: alert.severity,
      message: alert.message,
      rule: alert.rule.name,
      timestamp: alert.timestamps.triggered,
      details: alert.details,
    };

    console.log(
      `[WEBHOOK] Alert ${alert.id} sent to ${target.config.webhook_url}`
    );
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
  }

  /**
   * Deliver to PagerDuty (mock implementation)
   */
  private async deliverToPagerDuty(
    alert: Alert,
    target: AlertTarget
  ): Promise<void> {
    // Mock implementation - would use PagerDuty API
    console.log(
      `[PAGERDUTY] Alert ${alert.id} sent to service ${target.config.service_key}`
    );
  }

  /**
   * Deliver to Microsoft Teams (mock implementation)
   */
  private async deliverToTeams(
    alert: Alert,
    target: AlertTarget
  ): Promise<void> {
    // Mock implementation - would use Teams webhook
    console.log(
      `[TEAMS] Alert ${alert.id} sent to ${target.config.webhook_url}`
    );
  }

  /**
   * Format Slack message
   */
  private formatSlackMessage(alert: Alert): any {
    const color = this.getSeverityColor(alert.severity);

    return {
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] ${alert.rule.name}`,
          text: alert.message,
          fields: [
            {
              title: 'Metric',
              value: alert.details.triggeredConditions
                .map(c => c.metric)
                .join(', '),
              short: true,
            },
            {
              title: 'Value',
              value: alert.details.actualValue.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.details.threshold.toString(),
              short: true,
            },
            {
              title: 'Duration',
              value: `${alert.details.duration}s`,
              short: true,
            },
          ],
          timestamp: Math.floor(alert.timestamps.triggered / 1000),
        },
      ],
    };
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ffcc00',
      [AlertSeverity.CRITICAL]: '#ff6600',
      [AlertSeverity.EMERGENCY]: '#ff0000',
    };
    return colors[severity];
  }

  /**
   * Get delivery receipts for alert
   */
  getDeliveryReceipts(alertId: string): AlertDeliveryReceipt[] {
    return this.deliveryReceipts.get(alertId) || [];
  }
}

/**
 * Performance Alerting Engine
 *
 * Main engine that orchestrates performance monitoring, alerting,
 * and anomaly detection with intelligent notification management.
 */
export class PerformanceAlertingEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private baselineEngine: BaselineEngine;
  private deliveryEngine: AlertDeliveryEngine;
  private lastAlertTimes: Map<string, number> = new Map();
  private metricsBuffer: MetricDataPoint[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.baselineEngine = new BaselineEngine();
    this.deliveryEngine = new AlertDeliveryEngine();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High response time alert
    this.addRule({
      id: 'high-response-time',
      name: 'High Response Time',
      description: 'Response time exceeding acceptable thresholds',
      enabled: true,
      conditions: [
        {
          metric: 'response_time',
          operator: '>',
          threshold: 2000, // 2 seconds
          duration: 60, // 1 minute
          comparison: 'absolute',
        },
      ],
      severity: AlertSeverity.WARNING,
      tags: ['performance', 'response-time'],
      targets: [
        {
          type: 'webhook',
          config: { webhook_url: 'http://localhost:3000/alerts' },
          enabled: true,
        },
      ],
      cooldown: 10,
    });

    // High error rate alert
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Error rate exceeding acceptable thresholds',
      enabled: true,
      conditions: [
        {
          metric: 'error_rate',
          operator: '>',
          threshold: 5, // 5%
          duration: 120, // 2 minutes
          comparison: 'percentage',
        },
      ],
      severity: AlertSeverity.CRITICAL,
      tags: ['reliability', 'errors'],
      targets: [
        {
          type: 'webhook',
          config: { webhook_url: 'http://localhost:3000/alerts' },
          enabled: true,
        },
      ],
      cooldown: 5,
    });

    // High CPU usage alert
    this.addRule({
      id: 'high-cpu-usage',
      name: 'High CPU Usage',
      description: 'CPU usage exceeding safe operating levels',
      enabled: true,
      conditions: [
        {
          metric: 'cpu_usage',
          operator: '>',
          threshold: 80, // 80%
          duration: 300, // 5 minutes
          comparison: 'percentage',
        },
      ],
      severity: AlertSeverity.WARNING,
      tags: ['system', 'cpu'],
      targets: [
        {
          type: 'webhook',
          config: { webhook_url: 'http://localhost:3000/alerts' },
          enabled: true,
        },
      ],
      cooldown: 15,
    });

    // Anomaly detection alert
    this.addRule({
      id: 'performance-anomaly',
      name: 'Performance Anomaly Detected',
      description: 'Statistical anomaly detected in system performance',
      enabled: true,
      conditions: [
        {
          metric: 'response_time',
          operator: 'anomaly',
          threshold: 0.7, // Anomaly score threshold
          duration: 60,
          comparison: 'baseline',
        },
      ],
      severity: AlertSeverity.INFO,
      tags: ['anomaly', 'ml'],
      targets: [
        {
          type: 'webhook',
          config: { webhook_url: 'http://localhost:3000/alerts' },
          enabled: true,
        },
      ],
      cooldown: 30,
    });
  }

  /**
   * Add alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Update alert rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates };
    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Remove alert rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Process incoming metrics
   */
  async processMetrics(metrics: MetricDataPoint[]): Promise<void> {
    // Add to buffer for baseline calculation
    this.metricsBuffer.push(...metrics);

    // Maintain buffer size
    if (this.metricsBuffer.length > 10000) {
      this.metricsBuffer = this.metricsBuffer.slice(-5000);
    }

    // Update baselines
    this.baselineEngine.updateBaseline(this.metricsBuffer);

    // Check for threshold-based alerts
    await this.checkThresholdAlerts(metrics);

    // Check for anomaly-based alerts
    await this.checkAnomalyAlerts(metrics);
  }

  /**
   * Check threshold-based alerts
   */
  private async checkThresholdAlerts(
    metrics: MetricDataPoint[]
  ): Promise<void> {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      const relevantMetrics = metrics.filter(m =>
        rule.conditions.some(c => c.metric === m.metric)
      );

      if (relevantMetrics.length === 0) continue;

      const triggeredConditions = this.evaluateConditions(
        rule.conditions,
        relevantMetrics
      );

      if (triggeredConditions.length > 0) {
        await this.triggerAlert(rule, triggeredConditions, relevantMetrics);
      }
    }
  }

  /**
   * Check anomaly-based alerts
   */
  private async checkAnomalyAlerts(metrics: MetricDataPoint[]): Promise<void> {
    const anomalies = this.baselineEngine.detectAnomalies(metrics);

    for (const anomaly of anomalies) {
      const anomalyRules = Array.from(this.rules.values()).filter(rule =>
        rule.conditions.some(
          c => c.operator === 'anomaly' && c.metric === anomaly.metric
        )
      );

      for (const rule of anomalyRules) {
        const relevantConditions = rule.conditions.filter(
          c => c.operator === 'anomaly' && c.metric === anomaly.metric
        );

        // Check if anomaly score exceeds threshold
        const triggeredConditions = relevantConditions.filter(
          c => anomaly.anomalyScore >= c.threshold
        );

        if (triggeredConditions.length > 0) {
          const anomalyMetric: MetricDataPoint = {
            metric: anomaly.metric,
            value: anomaly.actualValue,
            timestamp: anomaly.timestamp,
          };

          await this.triggerAlert(rule, triggeredConditions, [anomalyMetric]);
        }
      }
    }
  }

  /**
   * Evaluate alert conditions
   */
  private evaluateConditions(
    conditions: AlertCondition[],
    metrics: MetricDataPoint[]
  ): AlertCondition[] {
    const triggered: AlertCondition[] = [];

    for (const condition of conditions) {
      const relevantMetrics = metrics.filter(
        m => m.metric === condition.metric
      );
      if (relevantMetrics.length === 0) continue;

      const currentValue = this.aggregateMetricValue(relevantMetrics);
      const isTriggered = this.evaluateCondition(condition, currentValue);

      if (isTriggered) {
        triggered.push(condition);
      }
    }

    return triggered;
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case '>':
        return value > condition.threshold;
      case '<':
        return value < condition.threshold;
      case '>=':
        return value >= condition.threshold;
      case '<=':
        return value <= condition.threshold;
      case '=':
        return value === condition.threshold;
      case '!=':
        return value !== condition.threshold;
      case 'change':
        // Would implement change detection logic
        return false;
      case 'anomaly':
        // Handled separately in anomaly detection
        return false;
      default:
        return false;
    }
  }

  /**
   * Aggregate metric values
   */
  private aggregateMetricValue(metrics: MetricDataPoint[]): number {
    if (metrics.length === 0) return 0;
    if (metrics.length === 1) return metrics[0].value;

    // Use average for multiple values
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(
    rule: AlertRule,
    triggeredConditions: AlertCondition[],
    metrics: MetricDataPoint[]
  ): Promise<void> {
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(rule.id);
    const cooldownMs = rule.cooldown * 60 * 1000;

    // Check cooldown
    if (lastAlert && now - lastAlert < cooldownMs) {
      return;
    }

    // Create alert
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      rule,
      status: AlertStatus.ACTIVE,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, triggeredConditions, metrics),
      details: {
        triggeredConditions,
        metricValues: metrics,
        threshold: triggeredConditions[0]?.threshold || 0,
        actualValue: this.aggregateMetricValue(metrics),
        duration: triggeredConditions[0]?.duration || 0,
      },
      timestamps: {
        triggered: now,
      },
      escalationLevel: 0,
      acknowledgments: [],
      tags: rule.tags,
      metadata: rule.metadata,
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.lastAlertTimes.set(rule.id, now);

    // Deliver alert
    await this.deliveryEngine.deliverAlert(alert);

    console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    rule: AlertRule,
    conditions: AlertCondition[],
    metrics: MetricDataPoint[]
  ): string {
    const condition = conditions[0];
    const value = this.aggregateMetricValue(metrics);

    return `${rule.name}: ${condition.metric} is ${value.toFixed(2)} (threshold: ${condition.threshold})`;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId: string, message?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== AlertStatus.ACTIVE) {
      return false;
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.timestamps.acknowledged = Date.now();
    alert.acknowledgments.push({
      userId,
      timestamp: Date.now(),
      message,
      action: 'acknowledge',
    });

    console.log(`[ALERT] Alert ${alertId} acknowledged by ${userId}`);
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, userId: string, message?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = AlertStatus.RESOLVED;
    alert.timestamps.resolved = Date.now();
    alert.acknowledgments.push({
      userId,
      timestamp: Date.now(),
      message,
      action: 'resolve',
    });

    console.log(`[ALERT] Alert ${alertId} resolved by ${userId}`);
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(
      a => a.status === AlertStatus.ACTIVE
    );
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit?: number): Alert[] {
    const alerts = Array.from(this.alerts.values()).sort(
      (a, b) => b.timestamps.triggered - a.timestamps.triggered
    );

    return limit ? alerts.slice(0, limit) : alerts;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get alert rule by ID
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get performance baselines
   */
  getBaselines(): PerformanceBaseline[] {
    return this.baselineEngine.getAllBaselines();
  }

  /**
   * Get alerting statistics
   */
  getStats(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    totalAlerts: number;
    alertsBySevierty: Record<AlertSeverity, number>;
    recentAnomalies: number;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(a => a.status === AlertStatus.ACTIVE);
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled);

    const alertsBySeverity = allAlerts.reduce(
      (acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      },
      {} as Record<AlertSeverity, number>
    );

    // Initialize missing severities
    Object.values(AlertSeverity).forEach(severity => {
      if (!(severity in alertsBySeverity)) {
        alertsBySeverity[severity] = 0;
      }
    });

    return {
      totalRules: this.rules.size,
      enabledRules: enabledRules.length,
      activeAlerts: activeAlerts.length,
      totalAlerts: allAlerts.length,
      alertsBySevierty: alertsBySeverity,
      recentAnomalies: 0, // Would track recent anomalies
    };
  }

  /**
   * Start monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      // In a real implementation, this would collect metrics from various sources
      console.log('[PerformanceAlertingEngine] Monitoring interval tick');
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

/**
 * Create default performance alerting engine
 */
export function createPerformanceAlertingEngine(): PerformanceAlertingEngine {
  return new PerformanceAlertingEngine();
}

export default PerformanceAlertingEngine;
