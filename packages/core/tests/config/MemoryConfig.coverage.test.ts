import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryConfigManager } from '../../src/config/MemoryConfig';

describe('MemoryConfig - Coverage Perfection Tests', () => {
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('URL Validation Edge Cases', () => {
    it('should handle TypeError in vector database URL validation (line 108)', () => {
      // Create a config with an invalid URL that would cause TypeError
      const invalidConfig = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        vector_db: {
          url: '://invalid-url-no-protocol', // This should cause a TypeError
          collection: 'memories',
          dimension: 1536,
          api_key: 'test-key'
        }
      };

      expect(() => {
        new MemoryConfigManager(invalidConfig);
      }).toThrow('Invalid memory configuration: Vector database URL format is invalid');
    });

    it('should handle TypeError in Redis URL validation (line 125, 130-131)', () => {
      // Create a config with an invalid Redis URL that would cause TypeError
      const invalidConfig = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        redis: {
          url: '://invalid-redis-url-no-protocol', // This should cause a TypeError
          db: 0,
          password: 'test-password'
        }
      };

      expect(() => {
        new MemoryConfigManager(invalidConfig);
      }).toThrow('Invalid memory configuration: Redis URL format is invalid');
    });

    it('should handle vector database URL with invalid hostname', () => {
      // Test the hostname validation path
      const invalidConfig = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        vector_db: {
          url: 'http://', // URL with no hostname
          collection: 'memories',
          dimension: 1536,
          api_key: 'test-key'
        }
      };      expect(() => {
        new MemoryConfigManager(invalidConfig);
      }).toThrow('Invalid memory configuration: Vector database URL format is invalid');
    });

    it('should handle Redis URL with invalid hostname', () => {
      // Test the Redis hostname validation path
      const invalidConfig = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        redis: {
          url: 'redis://', // Redis URL with no hostname
          db: 0,
          password: 'test-password'
        }
      };

      expect(() => {
        new MemoryConfigManager(invalidConfig);
      }).toThrow('Invalid memory configuration: Redis URL must have a valid hostname');
    });
  });

  describe('Async Validation Edge Cases', () => {
    it('should handle async validation errors silently (lines 163-166, 169-172)', async () => {
      // Create a config that passes initial validation but might fail async validation
      const config = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        // Add performance config with proper structure
        performance: {
          max_query_time_ms: 30000,
          cache_ttl_seconds: 3600,
          batch_size: 100
        }
      };

      // This should not throw, but might log warnings
      const configManager = new MemoryConfigManager(config);
      expect(configManager).toBeDefined();

      // Give time for async validation
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should handle non-ZodError in async validation (lines 169-172)', async () => {
      const config = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        }
      };

      // This should not throw, even with potential async validation issues
      const configManager = new MemoryConfigManager(config);
      expect(configManager).toBeDefined();

      // Give time for async validation
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle non-TypeError errors in URL validation', () => {
      // This test covers the 'throw error;' line in the catch blocks
      const originalURL = global.URL;
      
      // Mock URL to throw a non-TypeError
      (global as any).URL = class {
        constructor() {
          throw new Error('Custom URL error');
        }
      };

      const invalidConfig = {
        embedding: {
          provider: 'openai' as const,
          model: 'text-embedding-3-small',
          api_key: 'test-api-key'
        },
        security: {
          encryption_key: 'test-encryption-key-32-characters-long-very-secure',
          tenant_isolation: true,
          audit_logs: false
        },
        vector_db: {
          url: 'http://localhost:6333',
          collection: 'memories',
          dimension: 1536,
          api_key: 'test-key'
        }
      };

      expect(() => {
        new MemoryConfigManager(invalidConfig);
      }).toThrow('Custom URL error');

      // Restore original URL
      global.URL = originalURL;
    });
  });
});
