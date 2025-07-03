/**
 * @fileoverview Developer Experience Package - Enterprise-grade developer tools
 * and workflow management system providing comprehensive development support.
 *
 * @author Memorai Development Team
 * @version 2.1.0
 * @since 2025-07-02
 */

// Core Components
import AdvancedDebuggingTools from './AdvancedDebuggingTools';
import APIDocumentationEngine from './APIDocumentationEngine';
import CodeQualityScanner from './CodeQualityScanner';
import DeveloperExperienceOrchestrator from './DeveloperExperienceOrchestrator';
import DevelopmentEnvironmentManager from './DevelopmentEnvironmentManager';
import InteractiveDevelopmentEnvironment from './InteractiveDevelopmentEnvironment';

// Type exports
export type {
  APIEndpoint,
  CodeGenConfig,
  CodeGenerationResult,
  DocumentationConfig,
  DocumentationResult,
  OpenAPISpec,
} from './APIDocumentationEngine';

export type {
  CodeExecutionRequest,
  CodeExecutionResult,
  CollaborationEvent,
  CollaborationSession,
  DebugEvent,
  DebugSession,
  DevSessionConfig,
  PerformanceMetrics,
} from './InteractiveDevelopmentEnvironment';

export type {
  DebugEvent as AdvancedDebugEvent,
  Breakpoint,
  DebugConfig,
  DebugSessionState,
  DistributedTrace,
  MemorySnapshot,
  PerformanceSnapshot,
  StackFrame,
  Variable,
} from './AdvancedDebuggingTools';

export type {
  DeploymentResult,
  EnvironmentConfig,
  EnvironmentMetrics,
  EnvironmentStatus,
  EnvironmentTemplate,
} from './DevelopmentEnvironmentManager';

export type {
  CodeIssue,
  CodeMetrics,
  DependencyAnalysis,
  Recommendation,
  ScanConfig,
  ScanResults,
  SecurityVulnerability,
} from './CodeQualityScanner';

export type {
  DeveloperAnalytics,
  DeveloperWorkflowConfig,
  QualityGateResult,
  WorkflowEvent,
  WorkflowStatus,
} from './DeveloperExperienceOrchestrator';

/**
 * Developer Experience Factory
 *
 * Factory class for creating and configuring developer experience components
 * with sensible defaults and enterprise-grade configurations.
 */
export class DeveloperExperienceFactory {
  /**
   * Create a complete developer experience suite
   */
  public static createCompleteSuite(config: {
    projectName: string;
    baseUrl: string;
    developerId: string;
    preferences?: {
      autoFixEnabled?: boolean;
      realTimeAnalysis?: boolean;
      collaborationEnabled?: boolean;
    };
  }) {
    const { projectName, baseUrl, developerId, preferences = {} } = config;

    // Create orchestrator
    const orchestrator = new DeveloperExperienceOrchestrator();

    // Configure API documentation
    const apiDocumentation = new APIDocumentationEngine({
      title: `${projectName} API Documentation`,
      version: '2.1.0',
      description: `Comprehensive API documentation for ${projectName}`,
      baseUrl,
      outputDirectory: './docs/api',
      includeInteractiveExplorer: true,
      includeCodeSamples: true,
      includePostmanCollection: true,
      customStyling: {
        theme: 'auto',
      },
    });

    // Create interactive development environment
    const interactiveDev = new InteractiveDevelopmentEnvironment();

    // Create debugging tools
    const debuggingTools = new AdvancedDebuggingTools();

    // Create environment manager
    const environmentManager = new DevelopmentEnvironmentManager();

    // Create quality scanner
    const qualityScanner = new CodeQualityScanner();

    return {
      orchestrator,
      apiDocumentation,
      interactiveDev,
      debuggingTools,
      environmentManager,
      qualityScanner,
    };
  }

  /**
   * Create API documentation engine with enterprise defaults
   */
  public static createAPIDocumentation(config: {
    projectName: string;
    baseUrl: string;
    outputDirectory?: string;
    includeEnterprise?: boolean;
  }) {
    const {
      projectName,
      baseUrl,
      outputDirectory = './docs/api',
      includeEnterprise = true,
    } = config;

    const engineConfig = {
      title: `${projectName} API`,
      version: '2.1.0',
      description: `Enterprise API documentation for ${projectName}`,
      baseUrl,
      outputDirectory,
      includeInteractiveExplorer: true,
      includeCodeSamples: true,
      includePostmanCollection: true,
      customStyling: {
        theme: 'auto' as const,
      },
    };

    if (includeEnterprise) {
      engineConfig.customStyling = {
        ...engineConfig.customStyling,
        primaryColor: '#2563eb',
      };
    }

    return new APIDocumentationEngine(engineConfig);
  }

  /**
   * Create development environment with templates
   */
  public static createDevelopmentEnvironment(config: {
    projectName: string;
    type: 'web-app' | 'microservices' | 'data-pipeline';
    region?: string;
  }) {
    const { projectName, type, region = 'us-east-1' } = config;

    const manager = new DevelopmentEnvironmentManager();

    // Create environment based on type
    const environmentConfig = {
      name: projectName,
      type: 'development' as const,
      description: `Development environment for ${projectName}`,
      region,
      resources: {
        cpu: type === 'microservices' ? 4 : 2,
        memory: type === 'microservices' ? 8192 : 4096,
        storage: type === 'data-pipeline' ? 100 : 20,
        network: {
          bandwidth: 100,
          endpoints: [],
        },
      },
      services: [],
      databases: [],
      secrets: {},
      features: {
        ssl: true,
        monitoring: true,
        logging: true,
        debugging: true,
        profiling: false,
      },
      lifecycle: {
        autoStart: true,
        autoStop: false,
        maxIdleTime: 3600,
        timeout: 300,
      },
    };

    return { manager, environmentConfig };
  }

  /**
   * Create quality scanner with comprehensive rules
   */
  public static createQualityScanner(config: {
    projectPath: string;
    languages: string[];
    compliance?: string[];
    autoFix?: boolean;
  }) {
    const {
      projectPath,
      languages,
      compliance = ['gdpr'],
      autoFix = true,
    } = config;

    const scanner = new CodeQualityScanner();

    const scanConfig = {
      scanId: `scan_${Date.now()}`,
      projectPath,
      languages: languages as any[],
      scanTypes: [
        'quality',
        'security',
        'performance',
        'compliance',
        'dependencies',
      ] as any[],
      severity: 'medium' as const,
      excludePatterns: ['node_modules/**', 'dist/**', 'build/**'],
      includePatterns: ['src/**', 'lib/**'],
      frameworks: [],
      compliance: compliance as any[],
      options: {
        autoFix,
        generateReport: true,
        failOnHigh: true,
        maxIssues: 1000,
        timeout: 300000,
      },
    };

    return { scanner, scanConfig };
  }
}

/**
 * Utility functions
 */
export const DeveloperExperienceUtils = {
  /**
   * Generate workflow configuration
   */
  generateWorkflowConfig: (options: {
    workflowId: string;
    projectId: string;
    developerId: string;
    type: 'feature-development' | 'bug-fix' | 'refactoring';
  }) => {
    const { workflowId, projectId, developerId, type } = options;

    const baseStages = [
      'planning',
      'development',
      'testing',
      'review',
      'deployment',
    ];
    const stages =
      type === 'bug-fix'
        ? ['development', 'testing', 'review', 'deployment']
        : baseStages;

    return {
      workflowId,
      projectId,
      developerId,
      workflow: {
        type,
        stages,
        automatedGates: ['quality-check', 'security-scan'],
        notifications: {
          slack: true,
          email: false,
          dashboard: true,
        },
        collaboration: {
          pairProgramming: type === 'feature-development',
          codeReview: true,
          realTimeSharing: false,
        },
      },
      tools: {
        documentation: true,
        debugging: true,
        environmentManagement: true,
        qualityScanning: true,
        performanceMonitoring: true,
      },
      preferences: {
        autoFixEnabled: true,
        realTimeAnalysis: true,
        detailedLogging: false,
        proactiveAlerts: true,
      },
      constraints: {
        maxBuildTime: 300000,
        maxMemoryUsage: 2048,
        qualityGateThreshold: 80,
        securityScanRequired: true,
      },
    };
  },

  /**
   * Validate environment configuration
   */
  validateEnvironmentConfig: (
    config: any
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!config.name || config.name.length < 3) {
      errors.push('Environment name must be at least 3 characters');
    }

    if (!config.resources || config.resources.cpu < 1) {
      errors.push('CPU allocation must be at least 1');
    }

    if (!config.resources || config.resources.memory < 1024) {
      errors.push('Memory allocation must be at least 1024 MB');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Calculate quality score
   */
  calculateQualityScore: (scanResults: any): number => {
    if (!scanResults || !scanResults.summary) {
      return 0;
    }

    const { issues, security } = scanResults.summary;

    let score = 100;

    // Deduct for issues
    score -= issues.critical * 10;
    score -= issues.high * 5;
    score -= issues.medium * 2;
    score -= issues.low * 0.5;

    // Deduct for security vulnerabilities
    score -= security.critical * 15;
    score -= security.high * 8;
    score -= security.medium * 3;
    score -= security.low * 1;

    return Math.max(0, Math.round(score));
  },
};

// Re-export individual components for direct access
export {
  APIDocumentationEngine,
  AdvancedDebuggingTools,
  CodeQualityScanner,
  DeveloperExperienceOrchestrator,
  DevelopmentEnvironmentManager,
  InteractiveDevelopmentEnvironment,
};
