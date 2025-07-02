/**
 * System Optimization Engine Test Suite
 * Comprehensive coverage for zero-coverage analytics module (604 lines, 0% coverage)
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemOptimizationEngine } from '../../src/analytics/SystemOptimizationEngine';

describe('SystemOptimizationEngine - Zero Coverage Target', () => {
  let engine: SystemOptimizationEngine;
  let autoScalingConfig: any;
  let cacheConfig: any;
  let queryConfig: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup configurations based on actual API
    autoScalingConfig = {
      enabled: true,
      triggers: {
        cpuThreshold: 0.8,
        memoryThreshold: 0.85,
        responseTimeThreshold: 1000,
        throughputThreshold: 500
      },
      scaling: {
        minInstances: 1,
        maxInstances: 10,
        scaleUpFactor: 1.5,
        scaleDownFactor: 0.7,
        cooldownPeriodMs: 300000
      }
    };

    cacheConfig = {
      enabled: true,
      strategies: {
        preemptiveLoading: true,
        intelligentEviction: true,
        hotDataIdentification: true,
        crossTenantOptimization: false
      },
      thresholds: {
        hitRatioTarget: 0.85,
        memoryUsageLimit: 0.8,
        accessFrequencyMin: 10
      }
    };

    queryConfig = {
      enabled: true,
      techniques: {
        queryPlanOptimization: true,
        indexSuggestions: true,
        batchingOptimization: true,
        vectorSearchTuning: true
      },
      analysis: {
        slowQueryThreshold: 500,
        frequentQueryThreshold: 100,
        optimizationWindowMs: 3600000
      }
    };
    
    // Initialize with 3-parameter constructor
    engine = new SystemOptimizationEngine(autoScalingConfig, cacheConfig, queryConfig);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with provided configurations', () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(SystemOptimizationEngine);
    });

    it('should handle disabled configurations', () => {
      const disabledConfig = { ...autoScalingConfig, enabled: false };
      const disabledEngine = new SystemOptimizationEngine(disabledConfig, cacheConfig, queryConfig);
      expect(disabledEngine).toBeDefined();
    });
  });

  describe('Engine Lifecycle', () => {
    it('should start the optimization engine', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      engine.start();
      expect(consoleSpy).toHaveBeenCalledWith('[OptimizationEngine] Started with intelligent optimization');
      engine.stop();
      consoleSpy.mockRestore();
    });

    it('should stop the optimization engine', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      engine.start();
      engine.stop();
      expect(consoleSpy).toHaveBeenCalledWith('[OptimizationEngine] Stopped');
      consoleSpy.mockRestore();
    });

    it('should emit started event', () => {
      return new Promise<void>((resolve) => {
        engine.on('started', () => {
          engine.stop();
          resolve();
        });
        engine.start();
      });
    });

    it('should emit stopped event', () => {
      return new Promise<void>((resolve) => {
        engine.on('stopped', () => {
          resolve();
        });
        engine.start();
        engine.stop();
      });
    });
  });

  describe('Optimization Rules', () => {
    it('should add optimization rules', () => {
      const mockRule = {
        id: 'test-rule',
        name: 'Test Rule',
        category: 'performance' as const,
        condition: () => true,
        action: async () => ({
          success: true,
          action: 'test_action',
          description: 'Test action',
          impact: {
            expectedImprovement: 10,
            affectedMetrics: ['test'],
            riskLevel: 'low' as const
          },
          changes: {}
        }),
        priority: 5,
        cooldownMs: 60000
      };

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      engine.addOptimizationRule(mockRule);
      expect(consoleSpy).toHaveBeenCalledWith('[OptimizationEngine] Added optimization rule: Test Rule');
      consoleSpy.mockRestore();
    });
  });

  describe('Optimization Cycle', () => {
    it('should run optimization cycle', async () => {
      await engine.runOptimizationCycle();
    });

    it('should handle concurrent optimization cycles', async () => {
      const promises = [
        engine.runOptimizationCycle(),
        engine.runOptimizationCycle(),
        engine.runOptimizationCycle()
      ];
      
      await Promise.all(promises);
    });
  });

  describe('Optimization History', () => {
    it('should get optimization history with default timeframe', () => {
      const history = engine.getOptimizationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get optimization history with custom timeframes', () => {
      const history1h = engine.getOptimizationHistory(1);
      const history24h = engine.getOptimizationHistory(24);
      const history168h = engine.getOptimizationHistory(168);
      
      expect(Array.isArray(history1h)).toBe(true);
      expect(Array.isArray(history24h)).toBe(true);
      expect(Array.isArray(history168h)).toBe(true);
    });

    it('should handle edge case timeframe values', () => {
      const historyZero = engine.getOptimizationHistory(0);
      const historyNegative = engine.getOptimizationHistory(-5);
      const historyLarge = engine.getOptimizationHistory(8760);
      
      expect(Array.isArray(historyZero)).toBe(true);
      expect(Array.isArray(historyNegative)).toBe(true);
      expect(Array.isArray(historyLarge)).toBe(true);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate recommendations for good metrics', async () => {
      const goodMetrics = {
        averageResponseTime: 50,
        throughput: 5000,
        errorRate: 0.1,
        memoryUsage: 0.3,
        cpuUsage: 0.2,
        cacheHitRatio: 0.95,
        vectorSearchLatency: 10,
        activeConnections: 10,
        systemHealth: null,
        trendData: {
          responseTimeGrowth: -0.1,
          throughputChange: 0.2,
          errorRateChange: -0.05
        }
      };

      const recommendations = await engine.getOptimizationRecommendations(goodMetrics);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should generate recommendations for poor cache performance', async () => {
      const poorCacheMetrics = {
        averageResponseTime: 500,
        throughput: 100,
        errorRate: 5,
        memoryUsage: 2.0,
        cpuUsage: 0.7,
        cacheHitRatio: 0.3,
        vectorSearchLatency: 200,
        activeConnections: 50,
        systemHealth: null,
        trendData: {
          responseTimeGrowth: 0.2,
          throughputChange: -0.1,
          errorRateChange: 0.05
        }
      };

      const recommendations = await engine.getOptimizationRecommendations(poorCacheMetrics);
      expect(Array.isArray(recommendations)).toBe(true);
      
      const cacheRecs = recommendations.filter(r => r.category === 'performance');
      expect(cacheRecs.length).toBeGreaterThan(0);
      
      if (cacheRecs.length > 0) {
        expect(cacheRecs[0].title).toBe('Improve Cache Hit Ratio');
        expect(cacheRecs[0].priority).toBe('high');
        expect(cacheRecs[0].automated).toBe(true);
      }
    });

    it('should generate recommendations for high memory usage', async () => {
      const highMemoryMetrics = {
        averageResponseTime: 300,
        throughput: 500,
        errorRate: 2,
        memoryUsage: 3.8,
        cpuUsage: 0.5,
        cacheHitRatio: 0.8,
        vectorSearchLatency: 100,
        activeConnections: 30,
        systemHealth: null,
        trendData: {
          responseTimeGrowth: 0.1,
          throughputChange: 0.0,
          errorRateChange: 0.0
        }
      };

      const recommendations = await engine.getOptimizationRecommendations(highMemoryMetrics);
      expect(Array.isArray(recommendations)).toBe(true);
      
      const resourceRecs = recommendations.filter(r => r.category === 'resource');
      expect(resourceRecs.length).toBeGreaterThan(0);
      
      if (resourceRecs.length > 0) {
        expect(resourceRecs[0].title).toBe('High Memory Usage');
        expect(resourceRecs[0].priority).toBe('critical');
      }
    });
  });

  describe('Individual Optimization Execution', () => {
    it('should execute specific optimization by rule ID', async () => {
      const testRule = {
        id: 'direct-execution-test',
        name: 'Direct Execution Test',
        category: 'performance' as const,
        condition: () => true,
        action: async () => ({
          success: true,
          action: 'direct_test',
          description: 'Direct execution test',
          impact: {
            expectedImprovement: 10,
            affectedMetrics: ['test'],
            riskLevel: 'low' as const
          },
          changes: { test: true }
        }),
        priority: 5,
        cooldownMs: 0
      };

      engine.addOptimizationRule(testRule);
      
      const mockContext = {
        currentMetrics: {
          averageResponseTime: 150,
          throughput: 1000,
          errorRate: 2,
          memoryUsage: 1.5,
          cpuUsage: 0.6,
          cacheHitRatio: 0.85,
          vectorSearchLatency: 50,
          activeConnections: 25,
          systemHealth: null,
          trendData: {
            responseTimeGrowth: 0.05,
            throughputChange: 0.1,
            errorRateChange: -0.02
          }
        },
        historicalData: [],
        systemConfig: {
          cacheSize: 1000,
          poolSize: 10,
          timeoutMs: 5000
        },
        resourceLimits: {
          maxMemory: 4.0,
          maxCpu: 0.8,
          maxConnections: 100
        }
      };
      
      const result = await engine.executeOptimization('direct-execution-test', mockContext);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.action).toBe('direct_test');
    });

    it('should handle execution of non-existent rule', async () => {
      const mockContext = {
        currentMetrics: {
          averageResponseTime: 150,
          throughput: 1000,
          errorRate: 2,
          memoryUsage: 1.5,
          cpuUsage: 0.6,
          cacheHitRatio: 0.85,
          vectorSearchLatency: 50,
          activeConnections: 25,
          systemHealth: null,
          trendData: {
            responseTimeGrowth: 0.05,
            throughputChange: 0.1,
            errorRateChange: -0.02
          }
        },
        historicalData: [],
        systemConfig: {
          cacheSize: 1000,
          poolSize: 10,
          timeoutMs: 5000
        },
        resourceLimits: {
          maxMemory: 4.0,
          maxCpu: 0.8,
          maxConnections: 100
        }
      };
      
      await expect(engine.executeOptimization('non-existent-rule', mockContext))
        .rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle null/undefined metrics in recommendations', async () => {
      await expect(engine.getOptimizationRecommendations(null as any))
        .rejects.toThrow();
      
      await expect(engine.getOptimizationRecommendations(undefined as any))
        .rejects.toThrow();
    });

    it('should handle incomplete metrics objects', async () => {
      const incompleteMetrics = {
        averageResponseTime: 150
      } as any;
      
      await expect(engine.getOptimizationRecommendations(incompleteMetrics))
        .rejects.toThrow();
    });
  });
});
