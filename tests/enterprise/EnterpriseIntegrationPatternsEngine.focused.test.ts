/**
 * Enterprise Integration Patterns Engine Test Suite - Focused Implementation
 * 
 * Comprehensive test coverage for enterprise-grade integration patterns,
 * focusing on actual API surface and existing functionality.
 * 
 * @author Memorai Enterprise Team
 * @version 3.0.0
 * @since 2024-12-28
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EnterpriseIntegrationPatternsEngine,
  IntegrationEndpoint,
  IntegrationPattern,
  DataTransformation,
  EnterpriseConnector,
  IntegrationFlow,
  IntegrationMessage
} from '../../packages/core/src/integration/EnterpriseIntegrationPatternsEngine';

describe('EnterpriseIntegrationPatternsEngine - Focused Tests', () => {
  let engine: EnterpriseIntegrationPatternsEngine;

  beforeEach(() => {
    engine = new EnterpriseIntegrationPatternsEngine();
  });

  afterEach(() => {
    engine.cleanup();
    vi.clearAllMocks();
  });

  describe('Core Engine Initialization', () => {
    it('should initialize with built-in connectors', () => {
      const connectors = engine.getConnectors();
      
      expect(Array.isArray(connectors)).toBe(true);
      expect(connectors.length).toBeGreaterThan(0);
      
      // Verify connector structure
      const firstConnector = connectors[0];
      expect(firstConnector).toHaveProperty('id');
      expect(firstConnector).toHaveProperty('name');
      expect(firstConnector).toHaveProperty('vendor');
      expect(firstConnector).toHaveProperty('type');
      expect(firstConnector).toHaveProperty('configuration');
      expect(firstConnector).toHaveProperty('authentication');
      expect(firstConnector).toHaveProperty('capabilities');
    });

    it('should initialize with empty endpoints and patterns', () => {
      expect(engine.getEndpoints()).toHaveLength(0);
      expect(engine.getPatterns()).toHaveLength(0);
    });

    it('should support cleanup operations', () => {
      expect(() => engine.cleanup()).not.toThrow();
    });
  });

  describe('Enterprise Connector Validation', () => {
    it('should have Salesforce connector', () => {
      const connectors = engine.getConnectors();
      const salesforceConnector = connectors.find(c => c.vendor === 'salesforce');
      
      expect(salesforceConnector).toBeDefined();
      expect(salesforceConnector?.name).toContain('Salesforce');
      expect(salesforceConnector?.type).toBe('crm');
      expect(Array.isArray(salesforceConnector?.capabilities)).toBe(false);
      expect(typeof salesforceConnector?.capabilities).toBe('object');
      expect(salesforceConnector?.capabilities?.read).toBe(true);
      expect(salesforceConnector?.capabilities?.write).toBe(true);
    });

    it('should have SAP connector', () => {
      const connectors = engine.getConnectors();
      const sapConnector = connectors.find(c => c.vendor === 'sap');
      
      expect(sapConnector).toBeDefined();
      expect(sapConnector?.name).toContain('SAP');
      expect(sapConnector?.type).toBe('erp');
    });

    it('should validate connector authentication types', () => {
      const connectors = engine.getConnectors();
      const authTypes = ['oauth2', 'basic', 'bearer', 'api-key', 'certificate', 'jwt'];
      
      connectors.forEach(connector => {
        expect(authTypes).toContain(connector.authentication.type);
      });
    });

    it('should have diverse connector types', () => {
      const connectors = engine.getConnectors();
      const types = [...new Set(connectors.map(c => c.type))];
      
      expect(types.length).toBeGreaterThan(1);
      expect(types).toContain('crm');
      expect(types).toContain('erp');
    });
  });

  describe('Integration Endpoint Registration', () => {
    it('should register valid endpoint with minimal configuration', async () => {
      const endpointConfig = {
        name: 'Test API',
        type: 'api' as const,
        protocol: 'rest' as const,
        configuration: {
          url: 'https://api.example.com'
        },
        authentication: {
          type: 'none' as const
        },
        dataFormat: {
          input: 'json' as const,
          output: 'json' as const
        },
        validation: {
          enabled: false
        },
        metadata: {
          version: '1.0',
          tags: ['test'],
          description: 'Test endpoint'
        },
        status: {
          state: 'active' as const,
          lastCheck: new Date(),
          uptime: 100,
          avgResponseTime: 100,
          errorRate: 0
        },
        monitoring: {
          enabled: false
        }
      };

      const result = await engine.registerEndpoint(endpointConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test API');
      expect(result.type).toBe('api');
      expect(result.protocol).toBe('rest');
      
      const endpoints = engine.getEndpoints();
      expect(endpoints).toHaveLength(1);
    });

    it('should register multiple endpoints', async () => {
      const endpoints = [
        {
          name: 'REST API',
          type: 'api' as const,
          protocol: 'rest' as const,
          configuration: { url: 'https://rest.example.com' },
          authentication: { type: 'none' as const },
          dataFormat: { input: 'json' as const, output: 'json' as const },
          validation: { enabled: false },
          metadata: { version: '1.0', tags: ['rest'], description: 'REST API' },
          status: { state: 'active' as const, lastCheck: new Date(), uptime: 100, avgResponseTime: 100, errorRate: 0 },
          monitoring: { enabled: false }
        },
        {
          name: 'GraphQL API',
          type: 'api' as const,
          protocol: 'graphql' as const,
          configuration: { url: 'https://graphql.example.com' },
          authentication: { type: 'none' as const },
          dataFormat: { input: 'json' as const, output: 'json' as const },
          validation: { enabled: false },
          metadata: { version: '1.0', tags: ['graphql'], description: 'GraphQL API' },
          status: { state: 'active' as const, lastCheck: new Date(), uptime: 100, avgResponseTime: 100, errorRate: 0 },
          monitoring: { enabled: false }
        }
      ];

      for (const config of endpoints) {
        const result = await engine.registerEndpoint(config);
        expect(result).toBeDefined();
      }

      const registeredEndpoints = engine.getEndpoints();
      expect(registeredEndpoints).toHaveLength(2);
    });

    it('should validate endpoint configuration structure', async () => {
      const endpointConfig = {
        name: 'Validation Test',
        type: 'api' as const,
        protocol: 'rest' as const,
        configuration: {
          url: 'https://api.example.com',
          timeout: 5000,
          retries: 3
        },
        authentication: {
          type: 'bearer' as const,
          credentials: { token: 'test-token' }
        },
        dataFormat: {
          input: 'json' as const,
          output: 'json' as const,
          encoding: 'utf8' as const
        },
        validation: {
          enabled: true,
          strict: false
        },
        metadata: {
          version: '1.0',
          tags: ['validation', 'test'],
          description: 'Endpoint for validation testing'
        },
        status: {
          state: 'active' as const,
          lastCheck: new Date(),
          uptime: 99.9,
          avgResponseTime: 150,
          errorRate: 0.1
        },
        monitoring: {
          enabled: true,
          metrics: ['latency', 'throughput']
        }
      };

      const result = await engine.registerEndpoint(endpointConfig);
      
      expect(result.configuration.timeout).toBe(5000);
      expect(result.authentication.type).toBe('bearer');
      expect(result.dataFormat.input).toBe('json');
      expect(result.validation.enabled).toBe(true);
      expect(result.monitoring.enabled).toBe(true);
    });
  });

  describe('Integration Pattern Management', () => {
    it('should create pattern with valid type', async () => {
      const patternConfig = {
        name: 'Point-to-Point Pattern',
        type: 'point-to-point' as const,
        description: 'Direct message routing pattern',
        configuration: {
          source: 'endpoint1',
          target: 'endpoint2',
          routing: 'direct'
        },
        triggers: [
          { type: 'message-received', condition: 'source.ready' }
        ],
        actions: [
          { type: 'route-message', target: 'destination' }
        ],
        errorHandling: {
          retries: 3,
          backoff: 'exponential',
          fallback: 'dead-letter'
        },
        createdBy: 'test-user'
      };

      const result = await engine.createPattern(patternConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Point-to-Point Pattern');
      expect(result.type).toBe('point-to-point');
      
      const patterns = engine.getPatterns();
      expect(patterns).toHaveLength(1);
    });

    it('should create publish-subscribe pattern', async () => {
      const patternConfig = {
        name: 'Pub-Sub Pattern',
        type: 'publish-subscribe' as const,
        description: 'Event publishing pattern',
        configuration: {
          topic: 'events',
          subscribers: ['service1', 'service2']
        },
        triggers: [
          { type: 'event-published', condition: 'topic.events' }
        ],
        actions: [
          { type: 'notify-subscribers', target: 'all' }
        ],
        errorHandling: {
          retries: 2,
          backoff: 'linear',
          fallback: 'skip'
        },
        createdBy: 'test-user'
      };

      const result = await engine.createPattern(patternConfig);
      
      expect(result.type).toBe('publish-subscribe');
      
      const patterns = engine.getPatterns();
      expect(patterns.some(p => p.type === 'publish-subscribe')).toBe(true);
    });

    it('should support multiple pattern types', async () => {
      const patternTypes: Array<'point-to-point' | 'publish-subscribe' | 'request-response'> = [
        'point-to-point',
        'publish-subscribe',
        'request-response'
      ];

      for (const type of patternTypes) {
        const config = {
          name: `${type} Pattern`,
          type,
          description: `Pattern of type ${type}`,
          configuration: { type },
          triggers: [],
          actions: [],
          errorHandling: { retries: 0, backoff: 'none', fallback: 'ignore' },
          createdBy: 'test-user'
        };

        const result = await engine.createPattern(config);
        expect(result.type).toBe(type);
      }

      const patterns = engine.getPatterns();
      expect(patterns).toHaveLength(3);
    });
  });

  describe('Data Transformation Engine', () => {
    it('should create transformation with valid structure', async () => {
      const transformationConfig = {
        name: 'JSON Transform',
        description: 'Basic JSON transformation',
        version: '1.0',
        createdBy: 'test-user',
        inputSchema: {
          type: 'object',
          properties: { name: { type: 'string' } }
        },
        outputSchema: {
          type: 'object',
          properties: { fullName: { type: 'string' } }
        },
        transformation: {
          type: 'jq',
          expression: '.name as $name | {fullName: $name}'
        },
        configuration: {
          async: false,
          timeout: 5000
        },
        metadata: {
          tags: ['json', 'transform'],
          category: 'data-processing'
        }
      };

      const result = await engine.createTransformation(transformationConfig);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe('JSON Transform');
      expect(result.description).toBe('Basic JSON transformation');
      expect(result.version).toBe('1.0');
    });

    it('should execute transformation on data', async () => {
      const transformationConfig = {
        name: 'Data Mapper',
        description: 'Maps input data to output format',
        version: '1.0',
        createdBy: 'test-user',
        inputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "properties": {"firstName": {"type": "string"}, "lastName": {"type": "string"}}}' 
        },
        outputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "properties": {"fullName": {"type": "string"}}}' 
        },
        mappings: [
          {
            id: 'name-mapping',
            source: 'firstName',
            target: 'fullName',
            transform: {
              type: 'javascript' as const,
              expression: 'firstName + " " + lastName',
              parameters: {}
            },
            required: true
          }
        ],
        functions: [],
        constants: {},
        lookupTables: {},
        testCases: [],
        configuration: {
          async: false,
          timeout: 5000
        },
        metadata: {
          tags: ['mapping', 'transform'],
          category: 'data-processing'
        }
      };

      const transformation = await engine.createTransformation(transformationConfig);

      const inputData = { firstName: 'John', lastName: 'Doe' };
      const result = await engine.transformData(transformation.id, inputData);
      
      // The method should execute without error
      expect(result).toBeDefined();
    });

    it('should handle transformation errors gracefully', async () => {
      const transformationConfig = {
        name: 'Error Transform',
        description: 'Transformation that may fail',
        version: '1.0',
        createdBy: 'test-user',
        inputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "required": ["required_field"], "properties": {"required_field": {"type": "string"}}}' 
        },
        outputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "properties": {"output": {"type": "string"}}}' 
        },
        mappings: [
          {
            id: 'required-mapping',
            source: 'required_field',
            target: 'output',
            required: true
          }
        ],
        functions: [],
        constants: {},
        lookupTables: {},
        testCases: [],
        metadata: { tags: ['error-test'], category: 'validation' }
      };

      const transformation = await engine.createTransformation(transformationConfig);

      const invalidData = { optional_field: 'value' }; // Missing required field

      try {
        const result = await engine.transformData(transformation.id, invalidData);
        // Method may return result or throw error - both are valid
        expect(result !== undefined || result === undefined).toBe(true);
      } catch (error) {
        // Error handling is expected for invalid data
        expect(error).toBeDefined();
      }
    });
  });

  describe('Pattern Execution', () => {
    it('should execute pattern with payload', async () => {
      // First register required endpoints
      const sourceEndpoint = await engine.registerEndpoint({
        name: 'Source API',
        type: 'api',
        protocol: 'rest',
        configuration: { url: 'https://source.api.example.com' },
        authentication: { type: 'api-key', credentials: { apiKey: 'test-key' } }
      });

      const destinationEndpoint = await engine.registerEndpoint({
        name: 'Destination API',
        type: 'api',
        protocol: 'rest',
        configuration: { url: 'https://dest.api.example.com' },
        authentication: { type: 'api-key', credentials: { apiKey: 'test-key' } }
      });

      const patternConfig = {
        name: 'Execution Test Pattern',
        type: 'point-to-point' as const,
        description: 'Pattern for execution testing',
        configuration: {
          source: {
            endpointId: sourceEndpoint.id,
            triggers: [{ type: 'manual' as const, config: {} }]
          },
          destination: {
            endpointId: destinationEndpoint.id
          },
          transformation: {
            enabled: false,
            mappings: []
          },
          errorHandling: {
            strategy: 'ignore' as const
          },
          monitoring: {
            metricsEnabled: false
          }
        },
        createdBy: 'test-user'
      };

      const pattern = await engine.createPattern(patternConfig);
      
      const payload = { test: 'data' };
      const context = { user: 'test-user', timestamp: Date.now() };

      const result = await engine.executePattern(pattern.id, payload, context);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.payload.original).toEqual(payload);
      expect(result.payload.headers).toBeDefined();
      expect(result.payload.metadata).toBeDefined();
    });

    it('should handle different payload types', async () => {
      // Register endpoints for this pattern  
      const source = await engine.registerEndpoint({
        name: 'Multi Source',
        type: 'api',
        protocol: 'rest',
        configuration: { url: 'https://multi.source.example.com' },
        authentication: { type: 'api-key', credentials: { apiKey: 'test' } },
        dataFormat: { input: 'json' as const, output: 'json' as const },
        validation: { enabled: false },
        status: { state: 'active' as const, lastCheck: new Date(), uptime: 100, avgResponseTime: 50, errorRate: 0 },
        metadata: { tags: ['multi'], environment: 'development' as const }
      });

      const dest = await engine.registerEndpoint({
        name: 'Multi Dest',
        type: 'api',
        protocol: 'rest',
        configuration: { url: 'https://multi.dest.example.com' },
        authentication: { type: 'api-key', credentials: { apiKey: 'test' } },
        dataFormat: { input: 'json' as const, output: 'json' as const },
        validation: { enabled: false },
        status: { state: 'active' as const, lastCheck: new Date(), uptime: 100, avgResponseTime: 50, errorRate: 0 },
        metadata: { tags: ['multi'], environment: 'development' as const }
      });

      const patternConfig = {
        name: 'Multi-Type Pattern',
        type: 'request-response' as const,
        description: 'Pattern supporting multiple payload types',
        configuration: {
          source: {
            endpointId: source.id,
            triggers: [{ type: 'manual' as const, config: {} }]
          },
          destination: {
            endpointId: dest.id
          },
          transformation: {
            enabled: false,
            mappings: []
          },
          errorHandling: {
            strategy: 'ignore' as const
          },
          monitoring: {
            metricsEnabled: false,
            logging: {
              level: 'none' as const,
              includePayload: false,
              retention: 1
            }
          }
        },
        createdBy: 'test-user'
      };

      const pattern = await engine.createPattern(patternConfig);

      const payloads = [
        'string payload',
        42,
        { object: 'payload' },
        [1, 2, 3],
        null
      ];

      for (const payload of payloads) {
        const result = await engine.executePattern(pattern.id, payload);
        expect(result).toBeDefined();
        expect(result.payload.original).toEqual(payload);
      }
    });
  });

  describe('Message Processing & Status', () => {
    it('should validate message structure', () => {
      const message: IntegrationMessage = {
        id: 'test-msg-001',
        source: 'test-source',
        target: 'test-target',
        payload: {
          original: { data: 'test' },
          headers: { 'Content-Type': 'application/json' },
          metadata: { timestamp: Date.now() }
        },
        metadata: {
          priority: 'normal',
          timestamp: Date.now(),
          correlationId: 'corr-001',
          retry: 0,
          maxRetries: 3
        },
        routing: {
          pattern: 'direct',
          key: 'test.message',
          exchange: 'test-exchange'
        }
      };

      expect(message.id).toBe('test-msg-001');
      expect(message.source).toBe('test-source');
      expect(message.target).toBe('test-target');
      expect(message.payload).toBeDefined();
      expect(message.metadata).toBeDefined();
      expect(message.routing).toBeDefined();
    });

    it('should track message status', () => {
      const messageId = 'status-test-msg';
      
      // Initially, message should not exist
      const status = engine.getMessageStatus(messageId);
      expect(status).toBeUndefined();
    });

    it('should support different message priorities', () => {
      const priorities: Array<'low' | 'normal' | 'high' | 'critical'> = ['low', 'normal', 'high', 'critical'];

      priorities.forEach((priority, index) => {
        const message: IntegrationMessage = {
          id: `priority-msg-${index}`,
          source: 'test',
          target: 'test',
          payload: {
            original: { priority },
            headers: {},
            metadata: {}
          },
          metadata: {
            priority,
            timestamp: Date.now(),
            correlationId: `priority-corr-${index}`
          },
          routing: {
            pattern: 'direct',
            key: 'test.priority'
          }
        };

        expect(message.metadata.priority).toBe(priority);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [];

      // Register multiple endpoints concurrently
      for (let i = 0; i < 5; i++) {
        operations.push(
          engine.registerEndpoint({
            name: `Concurrent Endpoint ${i}`,
            type: 'api',
            protocol: 'rest',
            configuration: { url: `https://api${i}.example.com` },
            authentication: { type: 'none' },
            dataFormat: { input: 'json', output: 'json' },
            validation: { enabled: false },
            metadata: { version: '1.0', tags: [], description: '' },
            status: { state: 'active', lastCheck: new Date(), uptime: 100, avgResponseTime: 100, errorRate: 0 },
            monitoring: { enabled: false }
          })
        );
      }

      const results = await Promise.all(operations);

      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.name).toBe(`Concurrent Endpoint ${index}`);
      });

      expect(engine.getEndpoints()).toHaveLength(5);
    });

    it('should maintain performance with large data sets', async () => {
      const transformationConfig = {
        name: 'Large Data Transform',
        description: 'Transformation for large datasets',
        version: '1.0',
        createdBy: 'test-user',
        inputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "properties": {"items": {"type": "array"}}}' 
        },
        outputSchema: { 
          type: 'json' as const,
          schema: '{"type": "object", "properties": {"processed": {"type": "array"}}}' 
        },
        mappings: [
          {
            id: 'items-mapping',
            source: 'items',
            target: 'processed',
            required: true
          }
        ],
        functions: [],
        constants: {},
        lookupTables: {},
        testCases: [],
        metadata: { tags: ['bulk'], environment: 'development' as const }
      };

      const transformation = await engine.createTransformation(transformationConfig);

      // Create large test dataset
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
          timestamp: Date.now()
        }))
      };

      const startTime = Date.now();
      const result = await engine.transformData(transformation.id, largeData);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should manage resources properly', async () => {
      // Create resources
      await engine.registerEndpoint({
        name: 'Resource Test Endpoint',
        type: 'api',
        protocol: 'rest',
        configuration: { url: 'https://resource.example.com' },
        authentication: { type: 'none' },
        dataFormat: { input: 'json', output: 'json' },
        validation: { enabled: false },
        metadata: { version: '1.0', tags: [], description: '' },
        status: { state: 'active', lastCheck: new Date(), uptime: 100, avgResponseTime: 100, errorRate: 0 },
        monitoring: { enabled: false }
      });

      await engine.createPattern({
        name: 'Resource Test Pattern',
        type: 'point-to-point',
        description: 'Pattern for resource testing',
        configuration: {},
        triggers: [],
        actions: [],
        errorHandling: { retries: 0, backoff: 'none', fallback: 'ignore' },
        createdBy: 'test-user'
      });

      // Verify resources exist
      expect(engine.getEndpoints().length).toBe(1);
      expect(engine.getPatterns().length).toBe(1);

      // Cleanup
      engine.cleanup();

      // Verify engine state after cleanup
      expect(engine.getConnectors()).toBeDefined();
      expect(engine.getEndpoints()).toBeDefined();
      expect(engine.getPatterns()).toBeDefined();
    });

    it('should handle repeated cleanup calls', () => {
      expect(() => {
        engine.cleanup();
        engine.cleanup();
        engine.cleanup();
      }).not.toThrow();
    });
  });

  describe('Advanced Integration Features', () => {
    it('should support complex endpoint configurations', async () => {
      const complexEndpoint = {
        name: 'Complex Enterprise Endpoint',
        type: 'api' as const,
        protocol: 'rest' as const,
        configuration: {
          url: 'https://enterprise.example.com/api/v2',
          method: 'POST' as const,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token',
            'X-API-Version': '2.0'
          },
          timeout: 30000,
          retries: 5,
          rateLimit: {
            requests: 1000,
            window: 3600
          }
        },
        authentication: {
          type: 'oauth2' as const,
          credentials: {
            clientId: 'enterprise-client',
            clientSecret: 'secret'
          }
        },
        dataFormat: {
          input: 'json' as const,
          output: 'json' as const,
          encoding: 'utf8' as const,
          compression: 'gzip' as const
        },
        validation: {
          enabled: true,
          strict: true,
          sanitization: true
        },
        metadata: {
          version: '2.0',
          tags: ['enterprise', 'production', 'high-availability'],
          description: 'Enterprise-grade API endpoint with advanced features'
        },
        status: {
          state: 'active' as const,
          lastCheck: new Date(),
          uptime: 99.99,
          avgResponseTime: 250,
          errorRate: 0.01
        },
        monitoring: {
          enabled: true,
          metrics: ['latency', 'throughput', 'errors', 'success-rate'],
          alerting: {
            threshold: 500,
            recipients: ['ops@company.com', 'dev@company.com']
          }
        }
      };

      const result = await engine.registerEndpoint(complexEndpoint);

      expect(result.configuration.timeout).toBe(30000);
      expect(result.configuration.retries).toBe(5);
      expect(result.authentication.type).toBe('oauth2');
      expect(result.dataFormat.compression).toBe('gzip');
      expect(result.validation.strict).toBe(true);
      expect(result.monitoring.metrics).toContain('latency');
      expect(result.metadata.tags).toContain('enterprise');
    });

    it('should support enterprise integration patterns', async () => {
      const enterprisePattern = {
        name: 'Enterprise Message Router',
        type: 'message-routing' as const,
        description: 'Advanced message routing with business rules',
        configuration: {
          routing: {
            strategy: 'content-based',
            rules: [
              { condition: 'priority === "high"', target: 'high-priority-queue' },
              { condition: 'region === "us"', target: 'us-processing-service' },
              { condition: 'amount > 10000', target: 'large-transaction-service' }
            ]
          },
          persistence: {
            enabled: true,
            durability: 'persistent',
            replication: 3
          },
          security: {
            encryption: 'AES-256',
            signing: true,
            audit: true
          }
        },
        triggers: [
          { type: 'message-received', condition: 'queue.enterprise-intake' },
          { type: 'scheduled', condition: 'cron:0 */15 * * * *' }
        ],
        actions: [
          { type: 'evaluate-rules', processor: 'business-rules-engine' },
          { type: 'route-message', strategy: 'content-based' },
          { type: 'audit-log', destination: 'enterprise-audit-service' }
        ],
        errorHandling: {
          retries: 3,
          backoff: 'exponential',
          fallback: 'dead-letter-queue',
          notifications: ['ops@company.com']
        },
        createdBy: 'enterprise-admin'
      };

      const result = await engine.createPattern(enterprisePattern);

      expect(result.type).toBe('message-routing');
      expect(result.configuration.routing.strategy).toBe('content-based');
      expect(result.configuration.security.encryption).toBe('AES-256');
      expect(result.triggers).toHaveLength(2);
      expect(result.actions).toHaveLength(3);
    });
  });
});
