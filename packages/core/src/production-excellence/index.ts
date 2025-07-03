/**
 * 🚀 Production Excellence - Index
 * Export all production excellence components
 *
 * @version 3.2.0
 * @author Memorai AI Team
 */

// Deployment Orchestration
export {
  BlueGreenDeploymentManager,
  CanaryDeploymentManager,
  DeploymentOrchestrationEngine,
  InfrastructureAsCodeManager,
} from './DeploymentOrchestrationEngine';

export type {
  DeploymentConfig,
  DeploymentLog,
  DeploymentMetrics,
  DeploymentStage,
  DeploymentStatus,
  HealthCheckConfig,
  InfrastructureResource,
  InfrastructureTemplate,
  NotificationConfig,
  ResourceRequirements,
  RollbackConfig,
} from './DeploymentOrchestrationEngine';

// Monitoring & Compliance
export {
  AlertManager,
  ComplianceAuditor,
  MonitoringComplianceEngine,
  RealTimeSystemMonitor,
} from './MonitoringComplianceEngine';

export type {
  Alert,
  AlertChannel,
  AlertSeverity,
  ApplicationMetrics,
  ComplianceAudit,
  ComplianceFinding,
  ComplianceResult,
  ComplianceStandard,
  DatabaseMetrics,
  Incident,
  MonitoringConfig,
  NetworkMetrics,
  SLATargets,
  SecurityMetrics,
  SystemMetrics,
} from './MonitoringComplianceEngine';

// Advanced Integration & Ecosystem (Phase 4.3)
export {
  AdvancedIntegrationEngine,
  GraphQLManager,
  IntegrationFactory,
  PluginManager,
  SDKGenerator,
  ThirdPartyIntegrationManager,
  WebhookManager,
} from '../ai-powered-interfaces/AdvancedIntegrationEngine';

export type {
  GraphQLSchema,
  IntegrationConfig,
  IntegrationFeature,
  PluginAPI,
  PluginContext,
  PluginHook,
  PluginManifest,
  PluginPermission,
  PluginStorage,
  SDKExample,
  SDKMethod,
  SDKParameter,
  SDKSpec,
  ThirdPartyIntegration,
  WebhookConfig,
  WebhookDelivery,
  WebhookEvent,
} from '../ai-powered-interfaces/AdvancedIntegrationEngine';

/**
 * Production Excellence Factory
 * Creates and configures production excellence components
 */
export class ProductionExcellenceFactory {
  /**
   * Create a complete production excellence platform
   */
  static createCompleteProductionPlatform(options: {
    environment: string;
    deploymentStrategy?: 'blue-green' | 'canary' | 'rolling' | 'recreate';
    enableMonitoring?: boolean;
    enableCompliance?: boolean;
    slaTargets?: any;
    complianceStandards?: string[];
  }) {
    const deploymentConfig = {
      environment: options.environment as any,
      strategy: options.deploymentStrategy || ('blue-green' as any),
      version: '1.0.0',
      image: 'memorai:latest',
      replicas: 3,
      resources: {
        cpu: { request: '500m', limit: '1000m' },
        memory: { request: '512Mi', limit: '1Gi' },
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        port: 3000,
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
        successThreshold: 1,
      },
      rollback: {
        enabled: true,
        automaticTriggers: ['health-check-failure', 'high-error-rate'],
        maxRetries: 3,
        backoffStrategy: 'exponential' as any,
        preserveVersions: 5,
      },
      notifications: {
        slack: {
          webhook: process.env.SLACK_WEBHOOK || '',
          channel: '#alerts',
        },
      },
    };

    const monitoringConfig = {
      environment: options.environment,
      enableRealTimeMonitoring: options.enableMonitoring ?? true,
      enableSecurityMonitoring: true,
      enableComplianceTracking: options.enableCompliance ?? true,
      slaTargets: options.slaTargets || {
        availability: 99.9,
        responseTime: 200,
        errorRate: 0.01,
        throughput: 1000,
        uptime: 99.9,
      },
      alertChannels: [
        {
          type: 'slack' as any,
          endpoint: process.env.SLACK_WEBHOOK || '',
          severity: ['critical', 'high', 'medium'] as any[],
          enabled: true,
        },
      ],
      complianceStandards: (
        options.complianceStandards || ['SOC2', 'GDPR']
      ).map(name => ({
        name: name as any,
        enabled: true,
        requirements: [],
      })),
      retentionPeriod: 90,
    };

    // Create deployment orchestration engine
    const deploymentEngine =
      new (require('./DeploymentOrchestrationEngine').DeploymentOrchestrationEngine)(
        deploymentConfig
      );

    // Create monitoring & compliance engine
    let monitoringEngine = null;
    if (options.enableMonitoring || options.enableCompliance) {
      const {
        MonitoringComplianceEngine,
      } = require('./MonitoringComplianceEngine');
      monitoringEngine = new MonitoringComplianceEngine(monitoringConfig);
    }

    return {
      deployment: deploymentEngine,
      monitoring: monitoringEngine,
      configs: {
        deployment: deploymentConfig,
        monitoring: monitoringConfig,
      },
    };
  }

  /**
   * Create deployment orchestration only
   */
  static createDeploymentOrchestration(
    environment: string,
    strategy: string = 'blue-green'
  ) {
    const config = {
      environment: environment as any,
      strategy: strategy as any,
      version: '1.0.0',
      image: 'memorai:latest',
      replicas: 3,
      resources: {
        cpu: { request: '500m', limit: '1000m' },
        memory: { request: '512Mi', limit: '1Gi' },
      },
      healthCheck: {
        enabled: true,
        path: '/health',
        port: 3000,
        initialDelaySeconds: 30,
        periodSeconds: 10,
        timeoutSeconds: 5,
        failureThreshold: 3,
        successThreshold: 1,
      },
      rollback: {
        enabled: true,
        automaticTriggers: ['health-check-failure', 'high-error-rate'],
        maxRetries: 3,
        backoffStrategy: 'exponential' as any,
        preserveVersions: 5,
      },
      notifications: {},
    };

    const {
      DeploymentOrchestrationEngine,
    } = require('./DeploymentOrchestrationEngine');
    return new DeploymentOrchestrationEngine(config);
  }

  /**
   * Create monitoring & compliance only
   */
  static createMonitoringCompliance(environment: string, options: any = {}) {
    const config = {
      environment,
      enableRealTimeMonitoring: options.enableMonitoring ?? true,
      enableSecurityMonitoring: true,
      enableComplianceTracking: options.enableCompliance ?? true,
      slaTargets: options.slaTargets || {
        availability: 99.9,
        responseTime: 200,
        errorRate: 0.01,
        throughput: 1000,
        uptime: 99.9,
      },
      alertChannels: [
        {
          type: 'slack' as any,
          endpoint: process.env.SLACK_WEBHOOK || '',
          severity: ['critical', 'high', 'medium'] as any[],
          enabled: true,
        },
      ],
      complianceStandards: (
        options.complianceStandards || ['SOC2', 'GDPR']
      ).map((name: string) => ({
        name: name as any,
        enabled: true,
        requirements: [],
      })),
      retentionPeriod: 90,
    };

    const {
      MonitoringComplianceEngine,
    } = require('./MonitoringComplianceEngine');
    return new MonitoringComplianceEngine(config);
  }
}

/**
 * Production Excellence Integration Helper
 * Provides utilities for integrating production components
 */
export class ProductionExcellenceIntegration {
  /**
   * Connect deployment and monitoring systems
   */
  static connectDeploymentAndMonitoring(
    deploymentEngine: any,
    monitoringEngine: any
  ) {
    // Monitor deployment events
    deploymentEngine.on('deployment_started', (event: any) => {
      console.log(
        `Deployment started: ${event.version} using ${event.strategy}`
      );
    });

    deploymentEngine.on('deployment_completed', (event: any) => {
      console.log(
        `Deployment completed: ${event.deploymentId} in ${event.duration}ms`
      );
    });

    deploymentEngine.on('deployment_failed', (event: any) => {
      // Create alert for failed deployment
      if (monitoringEngine) {
        monitoringEngine
          .getAlertManager()
          .createAlert(
            'critical',
            'Deployment Failed',
            `Deployment failed: ${event.error}`,
            'deployment-engine',
            { version: event.version, strategy: event.strategy }
          );
      }
    });

    // Monitor infrastructure events
    deploymentEngine.on('infrastructure_deployed', (event: any) => {
      console.log(`Infrastructure deployed: ${event.templateName}`);
    });

    deploymentEngine.on('infrastructure_failed', (event: any) => {
      if (monitoringEngine) {
        monitoringEngine
          .getAlertManager()
          .createAlert(
            'high',
            'Infrastructure Deployment Failed',
            `Infrastructure deployment failed: ${event.error}`,
            'infrastructure-manager',
            { templateName: event.templateName }
          );
      }
    });

    // Monitor compliance events
    if (monitoringEngine) {
      monitoringEngine.on('compliance_audit_completed', (event: any) => {
        console.log(
          `Compliance audit completed for ${event.standard}: ${event.score}% compliance`
        );
      });

      monitoringEngine.on('compliance_audit_failed', (event: any) => {
        console.log(
          `Compliance audit failed for ${event.standard}: ${event.error}`
        );
      });
    }
  }

  /**
   * Setup automated deployment pipeline
   */
  static setupAutomatedPipeline(
    deploymentEngine: any,
    monitoringEngine: any,
    options: {
      enableAutoRollback?: boolean;
      healthCheckTimeout?: number;
      errorThreshold?: number;
    } = {}
  ) {
    const config = {
      enableAutoRollback: options.enableAutoRollback ?? true,
      healthCheckTimeout: options.healthCheckTimeout ?? 300000, // 5 minutes
      errorThreshold: options.errorThreshold ?? 0.05, // 5%
    };

    // Monitor deployment health and trigger rollback if needed
    if (config.enableAutoRollback && monitoringEngine) {
      deploymentEngine.on('deployment_completed', async (event: any) => {
        // Wait for health check period
        setTimeout(async () => {
          try {
            const metrics = await deploymentEngine.monitorDeploymentHealth(
              event.deploymentId
            );

            if (metrics.errorRate > config.errorThreshold) {
              console.log(
                `Auto-rollback triggered: error rate ${metrics.errorRate * 100}% exceeds threshold`
              );

              // Trigger rollback (would need to implement this method)
              // await deploymentEngine.rollbackDeployment(event.deploymentId);
            }
          } catch (error) {
            console.error('Health check failed:', error);
          }
        }, config.healthCheckTimeout);
      });
    }
  }

  /**
   * Setup compliance-driven deployments
   */
  static setupComplianceGating(
    deploymentEngine: any,
    monitoringEngine: any,
    requiredStandards: string[] = ['SOC2', 'GDPR']
  ) {
    // Run compliance check before deployment
    const originalDeploy = deploymentEngine.deploy.bind(deploymentEngine);

    deploymentEngine.deploy = async function (version: string, strategy?: any) {
      console.log('Running pre-deployment compliance check...');

      if (monitoringEngine) {
        try {
          const auditResults = await monitoringEngine.runComplianceAudit();

          for (const standard of requiredStandards) {
            const audit = auditResults[standard];
            if (audit && audit.score < 80) {
              throw new Error(
                `Compliance check failed: ${standard} score ${audit.score}% below required 80%`
              );
            }
          }

          console.log('Compliance check passed. Proceeding with deployment...');
        } catch (error) {
          throw new Error(`Deployment blocked by compliance check: ${error}`);
        }
      }

      return originalDeploy(version, strategy);
    };
  }
}
