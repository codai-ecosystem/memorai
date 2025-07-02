/**
 * Enterprise Monitoring Module for Memorai
 * 
 * Comprehensive monitoring and observability solution providing:
 * - Distributed tracing with OpenTelemetry
 * - Custom metrics with Prometheus integration
 * - Multi-tier health checking
 * - Log aggregation with pattern detection
 * - Performance alerting with ML-based anomaly detection
 * - Unified monitoring orchestration
 * 
 * @version 3.0.0
 * @author Memorai Enterprise Team
 */

import { LogLevel } from './LogAggregationEngine';
import { AlertSeverity } from './PerformanceAlertingEngine';

// Core monitoring engines
export { 
  default as DistributedTracingEngine,
  createDistributedTracingEngine,
  type MemoryTraceContext,
  type TracingConfig
} from './DistributedTracingEngine';

export { 
  default as CustomMetricsEngine,
  createCustomMetricsEngine,
  type MemoryOperationMetrics,
  type SystemPerformanceMetrics,
  type BusinessMetrics
} from './CustomMetricsEngine';

export { 
  default as HealthCheckEngine,
  createHealthCheckEngine,
  type SystemHealthReport,
  type HealthCheckConfig
} from './HealthCheckEngine';

export { 
  default as LogAggregationEngine,
  createLogAggregationEngine,
  type LogEntry,
  LogLevel,
  type LogAnalysisResult
} from './LogAggregationEngine';

export { 
  default as PerformanceAlertingEngine,
  createPerformanceAlertingEngine,
  type Alert,
  type AlertRule,
  type MetricDataPoint,
  AlertSeverity
} from './PerformanceAlertingEngine';

// Enterprise orchestrator
import { 
  default as EnterpriseMonitoringOrchestrator,
  createEnterpriseMonitoringOrchestrator,
  type MonitoringConfig,
  type MonitoringReport,
  type MonitoringContext,
  type OptimizationRecommendation
} from './EnterpriseMonitoringOrchestrator';

export { 
  EnterpriseMonitoringOrchestrator,
  createEnterpriseMonitoringOrchestrator,
  type MonitoringConfig,
  type MonitoringReport,
  type MonitoringContext,
  type OptimizationRecommendation
};

/**
 * Quick-start monitoring configurations
 */
export const MonitoringPresets = {
  /**
   * Development configuration with verbose logging and frequent checks
   */
  development: {
    tracing: {
      samplingRate: 1.0,
      enableJaegerExporter: false
    },
    metrics: {
      collectionInterval: 10000,
      retentionDays: 1,
      enableBusinessMetrics: true
    },
    healthChecks: {
      interval: 30000,
      timeout: 5000,
      retryCount: 1
    },
    logging: {
      level: LogLevel.DEBUG,
      maxEntries: 10000,
      analysisInterval: 1
    },
    alerting: {
      enabled: true,
      defaultCooldown: 5,
      escalationEnabled: false
    },
    general: {
      environment: 'development',
      serviceName: 'memorai-dev',
      version: '3.0.0-dev',
      enableAutoOptimization: true
    }
  },

  /**
   * Production configuration optimized for performance and reliability
   */
  production: {
    tracing: {
      samplingRate: 0.1,
      enableJaegerExporter: true
    },
    metrics: {
      collectionInterval: 60000,
      retentionDays: 30,
      enableBusinessMetrics: true
    },
    healthChecks: {
      interval: 120000,
      timeout: 10000,
      retryCount: 3
    },
    logging: {
      level: LogLevel.INFO,
      maxEntries: 100000,
      analysisInterval: 10
    },
    alerting: {
      enabled: true,
      defaultCooldown: 15,
      escalationEnabled: true
    },
    general: {
      environment: 'production',
      serviceName: 'memorai-enterprise',
      version: '3.0.0',
      enableAutoOptimization: true
    }
  },

  /**
   * High-performance configuration for low-latency requirements
   */
  highPerformance: {
    tracing: {
      samplingRate: 0.01,
      enableJaegerExporter: true
    },
    metrics: {
      collectionInterval: 30000,
      retentionDays: 7,
      enableBusinessMetrics: false
    },
    healthChecks: {
      interval: 180000,
      timeout: 5000,
      retryCount: 2
    },
    logging: {
      level: LogLevel.WARN,
      maxEntries: 50000,
      analysisInterval: 5
    },
    alerting: {
      enabled: true,
      defaultCooldown: 10,
      escalationEnabled: true
    },
    general: {
      environment: 'production',
      serviceName: 'memorai-hp',
      version: '3.0.0',
      enableAutoOptimization: false
    }
  },

  /**
   * Testing configuration with comprehensive monitoring for CI/CD
   */
  testing: {
    tracing: {
      samplingRate: 1.0,
      enableJaegerExporter: false
    },
    metrics: {
      collectionInterval: 5000,
      retentionDays: 1,
      enableBusinessMetrics: false
    },
    healthChecks: {
      interval: 15000,
      timeout: 3000,
      retryCount: 1
    },
    logging: {
      level: LogLevel.DEBUG,
      maxEntries: 5000,
      analysisInterval: 1
    },
    alerting: {
      enabled: false,
      defaultCooldown: 1,
      escalationEnabled: false
    },
    general: {
      environment: 'test',
      serviceName: 'memorai-test',
      version: '3.0.0-test',
      enableAutoOptimization: false
    }
  }
};

/**
 * Default alert rules for common monitoring scenarios
 */
export const DefaultAlertRules = {
  highResponseTime: {
    id: 'high_response_time',
    name: 'High Response Time',
    description: 'Alert when response time exceeds threshold',
    metric: 'response_time',
    conditions: [
      {
        metric: 'response_time' as const,
        operator: '>' as const,
        threshold: 1000,
        duration: 300
      }
    ],
    severity: AlertSeverity.WARNING,
    cooldown: 10,
    enabled: true,
    tags: ['performance', 'response_time'],
    targets: [
      {
        type: 'email' as const,
        config: { emails: ['admin@memorai.ro'] },
        enabled: true
      }
    ]
  },

  highErrorRate: {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds 5%',
    metric: 'error_rate',
    conditions: [
      {
        metric: 'error_rate' as const,
        operator: '>' as const,
        threshold: 5,
        duration: 300
      }
    ],
    severity: AlertSeverity.CRITICAL,
    cooldown: 5,
    enabled: true,
    tags: ['reliability', 'error_rate'],
    targets: [
      {
        type: 'email' as const,
        config: { emails: ['admin@memorai.ro'] },
        enabled: true
      },
      {
        type: 'slack' as const,
        config: { channel: '#alerts' },
        enabled: true
      }
    ]
  },

  highCpuUsage: {
    id: 'high_cpu_usage',
    name: 'High CPU Usage',
    description: 'Alert when CPU usage exceeds 80%',
    metric: 'cpu_usage',
    conditions: [
      {
        metric: 'cpu_usage' as const,
        operator: '>' as const,
        threshold: 80,
        duration: 600
      }
    ],
    severity: AlertSeverity.WARNING,
    cooldown: 15,
    enabled: true,
    tags: ['performance', 'cpu'],
    targets: [
      {
        type: 'email' as const,
        config: { emails: ['admin@memorai.ro'] },
        enabled: true
      }
    ]
  },

  highMemoryUsage: {
    id: 'high_memory_usage',
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds 85%',
    metric: 'memory_usage',
    conditions: [
      {
        metric: 'memory_usage' as const,
        operator: '>' as const,
        threshold: 85,
        duration: 600
      }
    ],
    severity: AlertSeverity.CRITICAL,
    cooldown: 10,
    enabled: true,
    tags: ['performance', 'memory'],
    targets: [
      {
        type: 'email' as const,
        config: { emails: ['admin@memorai.ro'] },
        enabled: true
      },
      {
        type: 'slack' as const,
        config: { channel: '#alerts' },
        enabled: true
      }
    ]
  },

  systemUnhealthy: {
    id: 'system_unhealthy',
    name: 'System Unhealthy',
    description: 'Alert when error rate indicates system problems',
    metric: 'error_rate',
    conditions: [
      {
        metric: 'error_rate' as const,
        operator: '>' as const,
        threshold: 50,
        duration: 60
      }
    ],
    severity: AlertSeverity.EMERGENCY,
    cooldown: 1,
    enabled: true,
    tags: ['health', 'system'],
    targets: [
      {
        type: 'email' as const,
        config: { emails: ['admin@memorai.ro'] },
        enabled: true
      },
      {
        type: 'slack' as const,
        config: { channel: '#emergency' },
        enabled: true
      },
      {
        type: 'webhook' as const,
        config: { webhook_url: 'https://hooks.memorai.ro/alerts' },
        enabled: true
      }
    ]
  }
};

/**
 * Utility functions for monitoring setup
 */
export const MonitoringUtils = {
  /**
   * Create a monitoring orchestrator with preset configuration
   */
  createWithPreset(preset: keyof typeof MonitoringPresets) {
    return createEnterpriseMonitoringOrchestrator(MonitoringPresets[preset]);
  },

  /**
   * Setup basic monitoring for a memorai service
   */
  setupBasicMonitoring(serviceName: string, environment: string = 'development') {
    const config = {
      ...MonitoringPresets[environment as keyof typeof MonitoringPresets],
      general: {
        ...MonitoringPresets[environment as keyof typeof MonitoringPresets].general,
        serviceName
      }
    };

    const orchestrator = createEnterpriseMonitoringOrchestrator(config);

    // Add default alert rules
    Object.values(DefaultAlertRules).forEach(rule => {
      orchestrator.addAlertRule(rule);
    });

    return orchestrator;
  },

  /**
   * Setup monitoring for high-throughput services
   */
  setupHighThroughputMonitoring(serviceName: string) {
    const orchestrator = this.createWithPreset('highPerformance');
    
    // Override service name
    const config = {
      ...MonitoringPresets.highPerformance,
      general: {
        ...MonitoringPresets.highPerformance.general,
        serviceName
      }
    };

    return createEnterpriseMonitoringOrchestrator(config);
  },

  /**
   * Create monitoring for testing environment
   */
  setupTestingMonitoring(serviceName: string) {
    return this.createWithPreset('testing');
  }
};

/**
 * Enterprise monitoring facade for simplified integration
 */
export class MemoraiMonitoring {
  private orchestrator: EnterpriseMonitoringOrchestrator;

  constructor(config?: Partial<typeof MonitoringPresets.production>) {
    this.orchestrator = createEnterpriseMonitoringOrchestrator(
      config || MonitoringPresets.production
    );
  }

  /**
   * Initialize monitoring with standard configuration
   */
  async initialize(dependencies?: {
    database?: any;
    cache?: any;
    vectorDatabase?: any;
    memoryEngine?: any;
  }): Promise<void> {
    if (dependencies) {
      this.orchestrator.registerDependencies(dependencies);
    }

    // Add default alert rules
    Object.values(DefaultAlertRules).forEach(rule => {
      this.orchestrator.addAlertRule(rule);
    });

    // Start continuous monitoring
    this.orchestrator.startMonitoring();
  }

  /**
   * Monitor a memory operation
   */
  async monitorOperation<T>(
    operation: string,
    component: string,
    tenantId: string,
    userId: string | undefined,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const context = {
      operationId: `${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      component,
      tenantId,
      userId,
      metadata
    };

    return await this.orchestrator.startMemoryOperationMonitoring(context, fn);
  }

  /**
   * Get system health
   */
  async getHealth() {
    return await this.orchestrator.performHealthCheck();
  }

  /**
   * Get monitoring report
   */
  async getReport() {
    return await this.orchestrator.generateMonitoringReport();
  }

  /**
   * Get active alerts
   */
  getAlerts() {
    return this.orchestrator.getActiveAlerts();
  }

  /**
   * Shutdown monitoring
   */
  async shutdown() {
    await this.orchestrator.shutdown();
  }
}

/**
 * Create a simplified monitoring instance
 */
export function createMemoraiMonitoring(
  environment: keyof typeof MonitoringPresets = 'production'
): MemoraiMonitoring {
  return new MemoraiMonitoring(MonitoringPresets[environment]);
}

// Version information
export const VERSION = '3.0.0';
export const BUILD_INFO = {
  version: VERSION,
  buildDate: new Date().toISOString(),
  features: [
    'Distributed Tracing',
    'Custom Metrics',
    'Health Monitoring',
    'Log Aggregation',
    'Performance Alerting',
    'Enterprise Orchestration'
  ]
};

export default {
  EnterpriseMonitoringOrchestrator,
  MemoraiMonitoring,
  MonitoringPresets,
  DefaultAlertRules,
  MonitoringUtils,
  createEnterpriseMonitoringOrchestrator,
  createMemoraiMonitoring,
  VERSION,
  BUILD_INFO
};
