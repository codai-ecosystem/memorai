import { z } from 'zod';

import type { MemoryConfig as IMemoryConfig } from '../types/index.js';

const DEFAULT_CONFIG: IMemoryConfig = {
  vector_db: {
    url: process.env.QDRANT_URL ?? 'http://localhost:6333',
    api_key: process.env.QDRANT_API_KEY,
    collection: 'memories',
    dimension: 1536,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    db: 0,
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    api_key: process.env.OPENAI_API_KEY,
    endpoint: process.env.OPENAI_ENDPOINT,
  },
  performance: {
    max_query_time_ms: 100,
    cache_ttl_seconds: 300,
    batch_size: 100,
  },
  security: {
    encryption_key: process.env.MEMORY_ENCRYPTION_KEY ?? '',
    tenant_isolation: true,
    audit_logs: true,
  },
};

export class MemoryConfigManager {
  private config: IMemoryConfig;

  constructor(overrides: Partial<IMemoryConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, overrides);
    this.validate();
  }

  public get(): IMemoryConfig {
    return { ...this.config };
  }

  public getVectorDB(): IMemoryConfig['vector_db'] {
    return { ...this.config.vector_db };
  }

  public getRedis(): IMemoryConfig['redis'] {
    return { ...this.config.redis };
  }

  public getEmbedding(): IMemoryConfig['embedding'] {
    return { ...this.config.embedding };
  }

  public getPerformance(): IMemoryConfig['performance'] {
    return { ...this.config.performance };
  }

  public getSecurity(): IMemoryConfig['security'] {
    return { ...this.config.security };
  }

  private mergeConfig(
    defaultConfig: IMemoryConfig,
    overrides: Partial<IMemoryConfig>
  ): IMemoryConfig {
    return {
      vector_db: { ...defaultConfig.vector_db, ...overrides.vector_db },
      redis: { ...defaultConfig.redis, ...overrides.redis },
      embedding: { ...defaultConfig.embedding, ...overrides.embedding },
      performance: { ...defaultConfig.performance, ...overrides.performance },
      security: { ...defaultConfig.security, ...overrides.security },
    };
  }

  private validate(): void {
    try {
      // Import the schema from types and validate
      import('../types/index.js').then(({ MemoryConfigSchema }) => {        MemoryConfigSchema.parse(this.config);
      }).catch((error: unknown) => {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid memory configuration: ${(error as z.ZodError).message}`);
        }
        throw error;
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid memory configuration: ${(error as z.ZodError).message}`);
      }
      throw error;
    }

    // Additional validation
    if (!this.config.security.encryption_key) {
      throw new Error('MEMORY_ENCRYPTION_KEY environment variable is required');
    }

    if (this.config.security.encryption_key.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
  }
}

/**
 * Static factory class for MemoryConfig - provides convenience methods
 */
export class MemoryConfigFactory {
  /**
   * Create config from environment variables
   */
  public static fromEnv(): MemoryConfigManager {
    return new MemoryConfigManager();
  }

  /**
   * Create config with custom overrides
   */
  public static create(overrides: Partial<IMemoryConfig> = {}): MemoryConfigManager {
    return new MemoryConfigManager(overrides);
  }
}

// Alias for backward compatibility with tests
export const MemoryConfig = MemoryConfigFactory;
