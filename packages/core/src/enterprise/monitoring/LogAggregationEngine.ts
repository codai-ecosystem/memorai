/**
 * Log Aggregation and Analysis Engine for Memorai Enterprise
 * 
 * Implements comprehensive log collection, analysis, and alerting
 * with structured logging, pattern detection, and real-time monitoring.
 * 
 * Features:
 * - Structured logging with JSON format
 * - Log level filtering and routing
 * - Pattern recognition and anomaly detection
 * - Real-time log streaming and analysis
 * - Integration with external log management systems
 */

/**
 * Log levels with priority ordering
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  component: string;
  operation?: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  stack?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Log pattern definition for analysis
 */
export interface LogPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  level?: LogLevel;
  component?: string;
  tags?: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  action?: 'alert' | 'escalate' | 'ignore';
  cooldown?: number; // Minutes before same pattern triggers again
}

/**
 * Log analysis result
 */
export interface LogAnalysisResult {
  totalLogs: number;
  timeRange: {
    start: number;
    end: number;
  };
  levelCounts: Record<LogLevel, number>;
  componentCounts: Record<string, number>;
  patternMatches: PatternMatch[];
  anomalies: LogAnomaly[];
  trends: LogTrend[];
  recommendations: string[];
}

/**
 * Pattern match result
 */
export interface PatternMatch {
  pattern: LogPattern;
  matches: LogEntry[];
  frequency: number;
  lastSeen: number;
  severity: string;
  shouldAlert: boolean;
}

/**
 * Log anomaly detection result
 */
export interface LogAnomaly {
  type: 'volume' | 'pattern' | 'error_rate' | 'response_time';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  affectedComponent?: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

/**
 * Log trend analysis
 */
export interface LogTrend {
  metric: string;
  component?: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  change: number; // Percentage change
  timeWindow: number; // Minutes
  significance: 'low' | 'medium' | 'high';
}

/**
 * Log aggregation configuration
 */
export interface LogAggregationConfig {
  maxEntries: number;
  retentionDays: number;
  logLevel: LogLevel;
  enablePatternDetection: boolean;
  enableAnomalyDetection: boolean;
  analysisInterval: number; // Minutes
  alertThresholds: {
    errorRate: number; // Percentage
    volumeIncrease: number; // Percentage
    responseTimeIncrease: number; // Percentage
  };
  outputs: LogOutput[];
}

/**
 * Log output configuration
 */
export interface LogOutput {
  type: 'console' | 'file' | 'elasticsearch' | 'splunk' | 'datadog';
  config: Record<string, any>;
  enabled: boolean;
  logLevel: LogLevel;
}

/**
 * Log buffer for efficient storage and retrieval
 */
class LogBuffer {
  private entries: LogEntry[] = [];
  private maxSize: number;
  private indexes: Map<string, Set<number>> = new Map();

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * Add log entry to buffer
   */
  add(entry: LogEntry): void {
    // Add to entries array
    this.entries.push(entry);

    // Maintain size limit
    if (this.entries.length > this.maxSize) {
      const removed = this.entries.shift();
      if (removed) {
        this.removeFromIndexes(0, removed);
      }
      // Adjust all indexes by -1
      this.adjustIndexes(-1);
    }

    // Update indexes
    const index = this.entries.length - 1;
    this.addToIndexes(index, entry);
  }

  /**
   * Get logs by criteria
   */
  getLogs(criteria: {
    level?: LogLevel;
    component?: string;
    correlationId?: string;
    tenantId?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): LogEntry[] {
    let results = this.entries;

    // Filter by level
    if (criteria.level !== undefined) {
      results = results.filter(entry => entry.level >= criteria.level!);
    }

    // Filter by component
    if (criteria.component) {
      results = results.filter(entry => entry.component === criteria.component);
    }

    // Filter by correlation ID
    if (criteria.correlationId) {
      results = results.filter(entry => entry.correlationId === criteria.correlationId);
    }

    // Filter by tenant ID
    if (criteria.tenantId) {
      results = results.filter(entry => entry.tenantId === criteria.tenantId);
    }

    // Filter by time range
    if (criteria.timeRange) {
      results = results.filter(entry => 
        entry.timestamp >= criteria.timeRange!.start && 
        entry.timestamp <= criteria.timeRange!.end
      );
    }

    // Apply limit
    if (criteria.limit) {
      results = results.slice(-criteria.limit);
    }

    return results;
  }

  /**
   * Get recent logs
   */
  getRecent(count: number = 100): LogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalEntries: number;
    levelCounts: Record<LogLevel, number>;
    componentCounts: Record<string, number>;
    oldestTimestamp?: number;
    newestTimestamp?: number;
  } {
    const levelCounts: Record<LogLevel, number> = {
      [LogLevel.TRACE]: 0,
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    };

    const componentCounts: Record<string, number> = {};
    let oldestTimestamp: number | undefined;
    let newestTimestamp: number | undefined;

    for (const entry of this.entries) {
      levelCounts[entry.level]++;
      componentCounts[entry.component] = (componentCounts[entry.component] || 0) + 1;
      
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
      if (!newestTimestamp || entry.timestamp > newestTimestamp) {
        newestTimestamp = entry.timestamp;
      }
    }

    return {
      totalEntries: this.entries.length,
      levelCounts,
      componentCounts,
      oldestTimestamp,
      newestTimestamp
    };
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.entries = [];
    this.indexes.clear();
  }

  /**
   * Add entry to indexes
   */
  private addToIndexes(index: number, entry: LogEntry): void {
    // Component index
    const componentKey = `component:${entry.component}`;
    if (!this.indexes.has(componentKey)) {
      this.indexes.set(componentKey, new Set());
    }
    this.indexes.get(componentKey)!.add(index);

    // Level index
    const levelKey = `level:${entry.level}`;
    if (!this.indexes.has(levelKey)) {
      this.indexes.set(levelKey, new Set());
    }
    this.indexes.get(levelKey)!.add(index);

    // Correlation ID index
    if (entry.correlationId) {
      const correlationKey = `correlation:${entry.correlationId}`;
      if (!this.indexes.has(correlationKey)) {
        this.indexes.set(correlationKey, new Set());
      }
      this.indexes.get(correlationKey)!.add(index);
    }
  }

  /**
   * Remove entry from indexes
   */
  private removeFromIndexes(index: number, entry: LogEntry): void {
    // Remove from all relevant indexes
    this.indexes.get(`component:${entry.component}`)?.delete(index);
    this.indexes.get(`level:${entry.level}`)?.delete(index);
    if (entry.correlationId) {
      this.indexes.get(`correlation:${entry.correlationId}`)?.delete(index);
    }
  }

  /**
   * Adjust all indexes after array shift
   */
  private adjustIndexes(offset: number): void {
    for (const [key, indexSet] of this.indexes) {
      const newSet = new Set<number>();
      for (const index of indexSet) {
        const newIndex = index + offset;
        if (newIndex >= 0) {
          newSet.add(newIndex);
        }
      }
      this.indexes.set(key, newSet);
    }
  }
}

/**
 * Pattern detection engine
 */
class PatternDetectionEngine {
  private patterns: Map<string, LogPattern> = new Map();
  private patternMatches: Map<string, PatternMatch> = new Map();
  private lastAlerts: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultPatterns();
  }

  /**
   * Initialize default log patterns
   */
  private initializeDefaultPatterns(): void {
    // Error patterns
    this.addPattern({
      id: 'high-error-rate',
      name: 'High Error Rate',
      description: 'Unusually high number of errors in short time',
      pattern: /ERROR|FATAL/,
      severity: 'high',
      action: 'alert',
      cooldown: 5
    });

    // Performance patterns
    this.addPattern({
      id: 'slow-response',
      name: 'Slow Response Time',
      description: 'Response time exceeding thresholds',
      pattern: /duration.*([5-9]\d{3,}|[1-9]\d{4,})/,
      severity: 'medium',
      action: 'alert',
      cooldown: 10
    });

    // Security patterns
    this.addPattern({
      id: 'auth-failure',
      name: 'Authentication Failure',
      description: 'Failed authentication attempts',
      pattern: /authentication.*failed|invalid.*credentials|unauthorized/i,
      severity: 'high',
      action: 'alert',
      cooldown: 2
    });

    // Memory patterns
    this.addPattern({
      id: 'memory-warning',
      name: 'Memory Usage Warning',
      description: 'High memory usage detected',
      pattern: /memory.*usage.*high|out of memory|memory.*exhausted/i,
      severity: 'high',
      action: 'escalate',
      cooldown: 5
    });
  }

  /**
   * Add custom pattern
   */
  addPattern(pattern: LogPattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Analyze logs for patterns
   */
  analyzePatterns(logs: LogEntry[]): PatternMatch[] {
    const matches: PatternMatch[] = [];

    for (const [patternId, pattern] of this.patterns) {
      const patternMatches = this.findPatternMatches(logs, pattern);
      
      if (patternMatches.length > 0) {
        const match: PatternMatch = {
          pattern,
          matches: patternMatches,
          frequency: patternMatches.length,
          lastSeen: Math.max(...patternMatches.map(m => m.timestamp)),
          severity: pattern.severity,
          shouldAlert: this.shouldAlert(patternId, pattern, patternMatches.length)
        };

        matches.push(match);
        this.patternMatches.set(patternId, match);
      }
    }

    return matches;
  }

  /**
   * Find matches for a specific pattern
   */
  private findPatternMatches(logs: LogEntry[], pattern: LogPattern): LogEntry[] {
    return logs.filter(log => {
      // Check level filter
      if (pattern.level !== undefined && log.level < pattern.level) {
        return false;
      }

      // Check component filter
      if (pattern.component && log.component !== pattern.component) {
        return false;
      }

      // Check pattern match
      if (pattern.pattern instanceof RegExp) {
        return pattern.pattern.test(log.message) || 
               (log.stack && pattern.pattern.test(log.stack));
      } else {
        return log.message.includes(pattern.pattern) ||
               (log.stack && log.stack.includes(pattern.pattern));
      }
    });
  }

  /**
   * Determine if pattern should trigger alert
   */
  private shouldAlert(patternId: string, pattern: LogPattern, frequency: number): boolean {
    if (pattern.action !== 'alert' && pattern.action !== 'escalate') {
      return false;
    }

    const now = Date.now();
    const lastAlert = this.lastAlerts.get(patternId);
    const cooldownMs = (pattern.cooldown || 5) * 60 * 1000;

    if (lastAlert && (now - lastAlert) < cooldownMs) {
      return false;
    }

    // Frequency thresholds based on severity
    const thresholds = {
      'low': 10,
      'medium': 5,
      'high': 3,
      'critical': 1
    };

    if (frequency >= thresholds[pattern.severity]) {
      this.lastAlerts.set(patternId, now);
      return true;
    }

    return false;
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(): {
    totalPatterns: number;
    activeMatches: number;
    alertsTriggered: number;
  } {
    return {
      totalPatterns: this.patterns.size,
      activeMatches: this.patternMatches.size,
      alertsTriggered: this.lastAlerts.size
    };
  }
}

/**
 * Anomaly detection engine
 */
class AnomalyDetectionEngine {
  private baselines: Map<string, number[]> = new Map();
  private readonly BASELINE_WINDOW = 60; // Minutes
  private readonly ANOMALY_THRESHOLD = 2.0; // Standard deviations

  /**
   * Detect anomalies in log data
   */
  detectAnomalies(logs: LogEntry[], timeWindow: number = 10): LogAnomaly[] {
    const anomalies: LogAnomaly[] = [];
    const now = Date.now();
    const windowStart = now - (timeWindow * 60 * 1000);

    // Volume anomaly detection
    const volumeAnomaly = this.detectVolumeAnomaly(logs, windowStart, now);
    if (volumeAnomaly) anomalies.push(volumeAnomaly);

    // Error rate anomaly detection
    const errorAnomaly = this.detectErrorRateAnomaly(logs, windowStart, now);
    if (errorAnomaly) anomalies.push(errorAnomaly);

    // Response time anomaly detection
    const responseAnomaly = this.detectResponseTimeAnomaly(logs, windowStart, now);
    if (responseAnomaly) anomalies.push(responseAnomaly);

    return anomalies;
  }

  /**
   * Detect volume anomalies
   */
  private detectVolumeAnomaly(logs: LogEntry[], start: number, end: number): LogAnomaly | null {
    const currentVolume = logs.filter(log => log.timestamp >= start && log.timestamp <= end).length;
    const baselineKey = 'volume';
    
    if (!this.baselines.has(baselineKey)) {
      this.baselines.set(baselineKey, []);
    }

    const baseline = this.baselines.get(baselineKey)!;
    baseline.push(currentVolume);

    // Keep only recent baseline data
    if (baseline.length > this.BASELINE_WINDOW) {
      baseline.shift();
    }

    if (baseline.length < 10) return null; // Need minimum data

    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs(currentVolume - mean) / (stdDev || 1);

    if (zScore > this.ANOMALY_THRESHOLD) {
      const severity = zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium';
      return {
        type: 'volume',
        description: `Log volume anomaly detected: ${currentVolume} logs (${zScore.toFixed(2)} standard deviations from normal)`,
        severity,
        timestamp: Date.now(),
        metrics: {
          currentVolume,
          baselineMean: mean,
          standardDeviation: stdDev,
          zScore
        },
        recommendations: [
          'Investigate potential system issues or traffic spikes',
          'Check for error cascades or retry loops',
          'Review recent deployments or configuration changes'
        ]
      };
    }

    return null;
  }

  /**
   * Detect error rate anomalies
   */
  private detectErrorRateAnomaly(logs: LogEntry[], start: number, end: number): LogAnomaly | null {
    const recentLogs = logs.filter(log => log.timestamp >= start && log.timestamp <= end);
    const totalLogs = recentLogs.length;
    const errorLogs = recentLogs.filter(log => log.level >= LogLevel.ERROR).length;
    const currentErrorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    const baselineKey = 'error_rate';
    if (!this.baselines.has(baselineKey)) {
      this.baselines.set(baselineKey, []);
    }

    const baseline = this.baselines.get(baselineKey)!;
    baseline.push(currentErrorRate);

    if (baseline.length > this.BASELINE_WINDOW) {
      baseline.shift();
    }

    if (baseline.length < 10) return null;

    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs(currentErrorRate - mean) / (stdDev || 1);

    if (zScore > this.ANOMALY_THRESHOLD && currentErrorRate > 5) { // At least 5% error rate
      const severity = currentErrorRate > 20 ? 'critical' : currentErrorRate > 10 ? 'high' : 'medium';
      return {
        type: 'error_rate',
        description: `Error rate anomaly detected: ${currentErrorRate.toFixed(1)}% (${zScore.toFixed(2)} standard deviations from normal)`,
        severity,
        timestamp: Date.now(),
        metrics: {
          currentErrorRate,
          baselineMean: mean,
          standardDeviation: stdDev,
          zScore,
          totalLogs,
          errorLogs
        },
        recommendations: [
          'Investigate recent error patterns and root causes',
          'Check system dependencies and external services',
          'Review error logs for common failure patterns'
        ]
      };
    }

    return null;
  }

  /**
   * Detect response time anomalies
   */
  private detectResponseTimeAnomaly(logs: LogEntry[], start: number, end: number): LogAnomaly | null {
    const recentLogs = logs.filter(log => 
      log.timestamp >= start && 
      log.timestamp <= end && 
      log.duration !== undefined
    );

    if (recentLogs.length === 0) return null;

    const currentAvgTime = recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / recentLogs.length;

    const baselineKey = 'response_time';
    if (!this.baselines.has(baselineKey)) {
      this.baselines.set(baselineKey, []);
    }

    const baseline = this.baselines.get(baselineKey)!;
    baseline.push(currentAvgTime);

    if (baseline.length > this.BASELINE_WINDOW) {
      baseline.shift();
    }

    if (baseline.length < 10) return null;

    const mean = baseline.reduce((sum, val) => sum + val, 0) / baseline.length;
    const variance = baseline.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / baseline.length;
    const stdDev = Math.sqrt(variance);

    const zScore = Math.abs(currentAvgTime - mean) / (stdDev || 1);

    if (zScore > this.ANOMALY_THRESHOLD && currentAvgTime > 1000) { // At least 1 second
      const severity = currentAvgTime > 10000 ? 'critical' : currentAvgTime > 5000 ? 'high' : 'medium';
      return {
        type: 'response_time',
        description: `Response time anomaly detected: ${currentAvgTime.toFixed(0)}ms average (${zScore.toFixed(2)} standard deviations from normal)`,
        severity,
        timestamp: Date.now(),
        metrics: {
          currentAvgTime,
          baselineMean: mean,
          standardDeviation: stdDev,
          zScore,
          sampleSize: recentLogs.length
        },
        recommendations: [
          'Check system performance and resource usage',
          'Investigate slow database queries or external API calls',
          'Review recent code changes that might affect performance'
        ]
      };
    }

    return null;
  }
}

/**
 * Log Aggregation and Analysis Engine
 * 
 * Main engine that orchestrates log collection, storage, analysis,
 * and alerting with comprehensive monitoring capabilities.
 */
export class LogAggregationEngine {
  private buffer: LogBuffer;
  private patternEngine: PatternDetectionEngine;
  private anomalyEngine: AnomalyDetectionEngine;
  private config: LogAggregationConfig;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<LogAggregationConfig> = {}) {
    this.config = {
      maxEntries: 50000,
      retentionDays: 7,
      logLevel: LogLevel.INFO,
      enablePatternDetection: true,
      enableAnomalyDetection: true,
      analysisInterval: 5,
      alertThresholds: {
        errorRate: 10,
        volumeIncrease: 50,
        responseTimeIncrease: 100
      },
      outputs: [
        {
          type: 'console',
          config: {},
          enabled: true,
          logLevel: LogLevel.INFO
        }
      ],
      ...config
    };

    this.buffer = new LogBuffer(this.config.maxEntries);
    this.patternEngine = new PatternDetectionEngine();
    this.anomalyEngine = new AnomalyDetectionEngine();

    this.startAnalysis();
  }

  /**
   * Log a message
   */
  log(
    level: LogLevel,
    message: string,
    component: string,
    metadata: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'component'>> = {}
  ): void {
    if (level < this.config.logLevel) {
      return; // Skip logs below configured level
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      component,
      ...metadata
    };

    // Add to buffer
    this.buffer.add(entry);

    // Output to configured outputs
    this.outputLog(entry);
  }

  /**
   * Convenience logging methods
   */
  trace(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.TRACE, message, component, metadata);
  }

  debug(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.DEBUG, message, component, metadata);
  }

  info(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.INFO, message, component, metadata);
  }

  warn(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.WARN, message, component, metadata);
  }

  error(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.ERROR, message, component, metadata);
  }

  fatal(message: string, component: string, metadata: any = {}): void {
    this.log(LogLevel.FATAL, message, component, metadata);
  }

  /**
   * Get logs by criteria
   */
  getLogs(criteria: {
    level?: LogLevel;
    component?: string;
    correlationId?: string;
    tenantId?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
  }): LogEntry[] {
    return this.buffer.getLogs(criteria);
  }

  /**
   * Analyze logs and generate report
   */
  async analyzeRecent(timeWindowMinutes: number = 10): Promise<LogAnalysisResult> {
    const now = Date.now();
    const start = now - (timeWindowMinutes * 60 * 1000);
    
    const logs = this.buffer.getLogs({
      timeRange: { start, end: now }
    });

    // Pattern analysis
    const patternMatches = this.config.enablePatternDetection 
      ? this.patternEngine.analyzePatterns(logs)
      : [];

    // Anomaly detection
    const anomalies = this.config.enableAnomalyDetection
      ? this.anomalyEngine.detectAnomalies(logs, timeWindowMinutes)
      : [];

    // Calculate statistics
    const stats = this.buffer.getStats();

    // Generate trends
    const trends = this.generateTrends(logs);

    // Generate recommendations
    const recommendations = this.generateRecommendations(patternMatches, anomalies, stats);

    return {
      totalLogs: logs.length,
      timeRange: { start, end: now },
      levelCounts: stats.levelCounts,
      componentCounts: stats.componentCounts,
      patternMatches,
      anomalies,
      trends,
      recommendations
    };
  }

  /**
   * Output log to configured outputs
   */
  private outputLog(entry: LogEntry): void {
    for (const output of this.config.outputs) {
      if (!output.enabled || entry.level < output.logLevel) {
        continue;
      }

      switch (output.type) {
        case 'console':
          this.outputToConsole(entry);
          break;
        case 'file':
          this.outputToFile(entry, output.config);
          break;
        // Additional outputs would be implemented here
      }
    }
  }

  /**
   * Output to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const component = entry.component.padEnd(15);
    
    let output = `${timestamp} [${level}] ${component} ${entry.message}`;
    
    if (entry.correlationId) {
      output += ` [${entry.correlationId}]`;
    }
    
    if (entry.duration) {
      output += ` (${entry.duration}ms)`;
    }

    console.log(output);

    if (entry.stack && entry.level >= LogLevel.ERROR) {
      console.log(entry.stack);
    }
  }

  /**
   * Output to file (mock implementation)
   */
  private outputToFile(entry: LogEntry, config: any): void {
    // In a real implementation, this would write to files
    // For now, just a placeholder
    console.log(`[FILE] ${JSON.stringify(entry)}`);
  }

  /**
   * Generate trend analysis
   */
  private generateTrends(logs: LogEntry[]): LogTrend[] {
    const trends: LogTrend[] = [];
    
    // Error rate trend
    const errorCount = logs.filter(log => log.level >= LogLevel.ERROR).length;
    const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;
    
    trends.push({
      metric: 'error_rate',
      direction: errorRate > 5 ? 'increasing' : 'stable',
      change: errorRate,
      timeWindow: 10,
      significance: errorRate > 10 ? 'high' : errorRate > 5 ? 'medium' : 'low'
    });

    return trends;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    patterns: PatternMatch[],
    anomalies: LogAnomaly[],
    stats: any
  ): string[] {
    const recommendations: string[] = [];

    // Pattern-based recommendations
    const criticalPatterns = patterns.filter(p => p.severity === 'critical' || p.severity === 'high');
    if (criticalPatterns.length > 0) {
      recommendations.push(`Address ${criticalPatterns.length} critical log patterns requiring immediate attention`);
    }

    // Anomaly-based recommendations
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical' || a.severity === 'high');
    if (criticalAnomalies.length > 0) {
      recommendations.push(`Investigate ${criticalAnomalies.length} detected anomalies in system behavior`);
    }

    // Volume-based recommendations
    if (stats.totalEntries > this.config.maxEntries * 0.8) {
      recommendations.push('Consider increasing log buffer size or reducing log retention period');
    }

    // Error rate recommendations
    const errorRate = (stats.levelCounts[LogLevel.ERROR] + stats.levelCounts[LogLevel.FATAL]) / stats.totalEntries * 100;
    if (errorRate > 10) {
      recommendations.push('High error rate detected - review error patterns and implement fixes');
    }

    if (recommendations.length === 0) {
      recommendations.push('Log patterns appear normal - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Start periodic analysis
   */
  private startAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(async () => {
      try {
        const analysis = await this.analyzeRecent();
        
        // Log analysis summary
        this.info(
          `Log analysis complete: ${analysis.totalLogs} logs, ${analysis.patternMatches.length} patterns, ${analysis.anomalies.length} anomalies`,
          'LogAggregationEngine',
          { analysis: analysis }
        );

        // Trigger alerts for critical issues
        const criticalIssues = [
          ...analysis.patternMatches.filter(p => p.shouldAlert && (p.severity === 'critical' || p.severity === 'high')),
          ...analysis.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high')
        ];

        if (criticalIssues.length > 0) {
          this.error(
            `Critical issues detected: ${criticalIssues.length} items require immediate attention`,
            'LogAggregationEngine',
            { criticalIssues }
          );
        }

      } catch (error) {
        this.error(
          `Log analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LogAggregationEngine',
          { error }
        );
      }
    }, this.config.analysisInterval * 60 * 1000);
  }

  /**
   * Stop analysis
   */
  stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  /**
   * Add custom log pattern
   */
  addPattern(pattern: LogPattern): void {
    this.patternEngine.addPattern(pattern);
  }

  /**
   * Get log statistics
   */
  getStats(): {
    buffer: {
      totalEntries: number;
      levelCounts: Record<LogLevel, number>;
      componentCounts: Record<string, number>;
      oldestTimestamp?: number;
      newestTimestamp?: number;
    };
    patterns: {
      totalPatterns: number;
      activeMatches: number;
      alertsTriggered: number;
    };
    config: LogAggregationConfig;
  } {
    return {
      buffer: this.buffer.getStats(),
      patterns: this.patternEngine.getPatternStats(),
      config: this.config
    };
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.buffer.clear();
  }
}

/**
 * Create default log aggregation engine
 */
export function createLogAggregationEngine(
  config: Partial<LogAggregationConfig> = {}
): LogAggregationEngine {
  return new LogAggregationEngine(config);
}

export default LogAggregationEngine;
