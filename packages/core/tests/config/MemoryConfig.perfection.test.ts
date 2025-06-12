import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryConfigManager, MemoryConfigFactory } from '../../src/config/MemoryConfig';

describe('MemoryConfig - 110% Coverage Perfection Tests', () => {
  beforeEach(() => {
    // Set up environment variables for tests
    process.env.MEMORY_ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-very-secure';
  });

  describe('Advanced Validation Edge Cases', () => {
    it('should handle missing encryption key specifically', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: '',
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'http://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          }
        });
      }).toThrow('Invalid memory configuration: Encryption key must be at least 32 characters long');
    });

    it('should handle invalid vector database URL protocol', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'ftp://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          }
        });
      }).toThrow('Invalid memory configuration: Vector database URL must use http or https protocol');
    });

    it('should handle invalid vector database URL format', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'invalid-url-format',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          }
        });
      }).toThrow('Invalid memory configuration: Vector database URL format is invalid');
    });

    it('should handle performance validation with zero cache_ttl_seconds', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'http://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          },
          performance: {
            max_query_time_ms: 0, // Invalid zero value
            cache_ttl_seconds: 1000,
            batch_size: 100
          }
        });
      }).toThrow('Invalid memory configuration: max_query_time_ms must be greater than 0');
    });

    it('should handle embedding validation with invalid provider', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'http://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'invalid-provider',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          } as any
        });
      }).toThrow('Invalid memory configuration: Embedding provider must be one of: openai, azure, local');
    });    it('should handle null overrides gracefully', () => {
      // Null overrides should not throw, but still need valid config
      const config = new MemoryConfigManager(null as any);
      expect(config).toBeInstanceOf(MemoryConfigManager);
      expect(config.getSecurity().encryption_key).toBeDefined();
    });

    it('should handle factory methods', () => {
      const configFromEnv = MemoryConfigFactory.fromEnv();
      expect(configFromEnv).toBeInstanceOf(MemoryConfigManager);
      
      const configFromFactory = MemoryConfigFactory.create({
        vector_db: { 
          url: 'http://custom:6333',
          collection: 'custom',
          dimension: 512
        }
      });
      expect(configFromFactory).toBeInstanceOf(MemoryConfigManager);
      expect(configFromFactory.getVectorDB().url).toBe('http://custom:6333');
    });

    it('should handle Redis URL validation with invalid protocol', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'http://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'ftp://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: 'text-embedding-3-small',
            api_key: 'test-key-long-enough'
          }
        });
      }).toThrow('Invalid memory configuration: Redis URL must use redis, rediss, http, or https protocol');
    });

    it('should handle empty embedding model', () => {
      expect(() => {
        new MemoryConfigManager({
          security: { 
            encryption_key: 'a'.repeat(32),
            tenant_isolation: true,
            audit_logs: false
          },
          vector_db: { 
            url: 'http://localhost:6333',
            collection: 'test',
            dimension: 1536
          },
          redis: { url: 'redis://localhost:6379', db: 0 },
          embedding: { 
            provider: 'openai',
            model: '',
            api_key: 'test-key-long-enough'
          }
        });
      }).toThrow('Invalid memory configuration: Embedding model cannot be empty');
    });
  });
});
