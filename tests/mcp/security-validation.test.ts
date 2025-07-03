/**
 * Comprehensive Security Validation Test
 * Tests the Enterprise Security Manager integration
 */

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

// Import security components
import {
  EnterpriseSecurityManager,
  type MemorySecurityContext,
  type SecurityValidationResult,
} from '../../packages/core/src/security/EnterpriseSecurityManager';
import type { SecurityConfig } from '../../packages/core/src/types/Security';

describe('Enterprise Security Manager', () => {
  let securityManager: EnterpriseSecurityManager;
  let validContext: MemorySecurityContext;

  beforeEach(async () => {
    // Create test security configuration
    const testConfig: SecurityConfig = {
      bruteForceThreshold: 5,
      maxRequestsPerWindow: 10,
      maxSecurityEvents: 100,
      eventRetentionMs: 60000,
      cleanupIntervalMs: 30000,
      rateLimiting: {
        enabled: true,
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
      },
      ddosProtection: {
        enabled: true,
        threshold: 20,
        blockDurationMs: 300000,
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 256,
        rotationIntervalMs: 86400000,
      },
    };

    securityManager = new EnterpriseSecurityManager(testConfig);
    await securityManager.start();

    validContext = {
      content: 'This is a normal memory content',
      tenantId: 'test-tenant',
      agentId: 'test-agent',
      clientIP: '127.0.0.1',
      userAgent: 'Test-Agent/1.0',
      endpoint: '/api/memory',
      requestSize: 1024,
      metadata: {
        source: 'test',
      },
    };
  });

  afterEach(async () => {
    await securityManager.stop();
  });

  describe('Basic Security Validation', () => {
    test('should allow valid memory operations', async () => {
      const result =
        await securityManager.validateMemoryOperation(validContext);

      expect(result.allowed).toBe(true);
      expect(result.action).toBe('allow');
      expect(result.reasons).toBeDefined();
      expect(typeof result.securityOverhead).toBe('number');
      expect(result.requestId).toBeDefined();
    });

    test('should detect SQL injection attempts', async () => {
      const maliciousContext = {
        ...validContext,
        content: "'; DROP TABLE users; --",
      };

      const result =
        await securityManager.validateMemoryOperation(maliciousContext);

      expect(result.allowed).toBe(false);
      expect(['throttle', 'block']).toContain(result.action);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    test('should detect XSS attempts', async () => {
      const xssContext = {
        ...validContext,
        content: '<script>alert("xss")</script>',
      };

      const result = await securityManager.validateMemoryOperation(xssContext);

      expect(result.allowed).toBe(false);
      expect(['throttle', 'block']).toContain(result.action);
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limits', async () => {
      const results: SecurityValidationResult[] = [];

      // Make 5 requests (within the 10/minute limit)
      for (let i = 0; i < 5; i++) {
        const result = await securityManager.validateMemoryOperation({
          ...validContext,
          content: `Valid content ${i}`,
        });
        results.push(result);
      }

      expect(results.every(r => r.allowed)).toBe(true);
    });

    test('should throttle or block excessive requests', async () => {
      const results: SecurityValidationResult[] = [];

      // Make 15 requests (exceeding the 10/minute limit)
      for (let i = 0; i < 15; i++) {
        const result = await securityManager.validateMemoryOperation({
          ...validContext,
          content: `Content ${i}`,
        });
        results.push(result);
      }

      // Some requests should be throttled or blocked
      const blockedCount = results.filter(
        r => !r.allowed || r.action !== 'allow'
      ).length;
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('DDoS Protection', () => {
    test('should detect suspicious traffic patterns', async () => {
      const results: SecurityValidationResult[] = [];

      // Simulate rapid requests with large payloads
      for (let i = 0; i < 25; i++) {
        const result = await securityManager.validateMemoryOperation({
          ...validContext,
          content: 'A'.repeat(10000), // Large content
          requestSize: 10000,
        });
        results.push(result);
      }

      // DDoS protection should kick in
      const blockedCount = results.filter(r => !r.allowed).length;
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  describe('Encryption Service', () => {
    test('should encrypt memory content', async () => {
      const content = 'Sensitive memory content';

      const encrypted = await securityManager.encryptMemoryContent(content);

      expect(encrypted.encryptedText).toBeDefined();
      expect(encrypted.encryptedText).not.toBe(content);
      expect(encrypted.encryptionInfo).toBeDefined();
    });
  });

  describe('Security Metrics', () => {
    test('should provide comprehensive security metrics', async () => {
      // Generate some security events
      await securityManager.validateMemoryOperation(validContext);
      await securityManager.validateMemoryOperation({
        ...validContext,
        content: 'Another valid content',
      });

      const metrics = securityManager.getSecurityMetrics();

      expect(metrics).toHaveProperty('threatDetection');
      expect(metrics).toHaveProperty('rateLimiting');
      expect(metrics).toHaveProperty('ddosProtection');
      expect(metrics).toHaveProperty('encryption');
      expect(metrics).toHaveProperty('audit');

      expect(typeof metrics.threatDetection.totalRequests).toBe('number');
      expect(typeof metrics.rateLimiting.totalRequests).toBe('number');
    });
  });

  describe('Performance Validation', () => {
    test('should validate security operations under 100ms', async () => {
      const startTime = performance.now();

      await securityManager.validateMemoryOperation(validContext);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be under 100ms
    });

    test('should handle concurrent security validations efficiently', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        securityManager.validateMemoryOperation({
          ...validContext,
          content: `Concurrent content ${i}`,
        })
      );

      const startTime = performance.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(results.length).toBe(10);
      expect(duration).toBeLessThan(500); // All 10 requests under 500ms
      expect(results.every(r => r.requestId)).toBe(true);
    });
  });

  describe('Integration Validation', () => {
    test('should provide unified security validation response', async () => {
      const result =
        await securityManager.validateMemoryOperation(validContext);

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('securityOverhead');
      expect(result).toHaveProperty('requestId');

      expect(typeof result.allowed).toBe('boolean');
      expect(['allow', 'throttle', 'block', 'emergency']).toContain(
        result.action
      );
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(typeof result.securityOverhead).toBe('number');
      expect(typeof result.requestId).toBe('string');
    });

    test('should maintain security context across operations', async () => {
      // First operation
      const result1 =
        await securityManager.validateMemoryOperation(validContext);

      // Second operation with same tenant
      const result2 = await securityManager.validateMemoryOperation({
        ...validContext,
        content: 'Second operation content',
      });

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);

      // Security metrics should track both operations
      const metrics = securityManager.getSecurityMetrics();
      expect(metrics.rateLimiting.totalRequests).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid security context gracefully', async () => {
      const invalidContext = {
        ...validContext,
        tenantId: '', // Invalid empty tenant ID
        clientIP: 'invalid-ip',
      };

      const result =
        await securityManager.validateMemoryOperation(invalidContext);

      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe('boolean');
      expect(result.reasons).toBeDefined();
    });

    test('should handle edge cases in content validation', async () => {
      const edgeCases = [
        '', // Empty content
        'A'.repeat(100000), // Very large content
        '\x00\x01\x02', // Binary content
        '🚀🌟💫', // Unicode content
      ];

      for (const content of edgeCases) {
        const result = await securityManager.validateMemoryOperation({
          ...validContext,
          content,
        });

        expect(result).toBeDefined();
        expect(typeof result.allowed).toBe('boolean');
      }
    });
  });
});
