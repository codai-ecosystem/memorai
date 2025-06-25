import { z } from 'zod';
import { logger } from '../utils/logger.js';

import type { MemoryConfig as IMemoryConfig } from '../types/index.js';

/**
 * Create default configuration with current environment variables
 * This is called at instantiation time, not module load time
 */
function createDefaultConfig(): IMemoryConfig {
  return {
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
    openai: {
      provider:
        (process.env.MEMORAI_OPENAI_PROVIDER as 'openai' | 'azure') || 'openai',
      api_key:
        process.env.MEMORAI_OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY ||
        process.env.AZURE_OPENAI_API_KEY,
      model: process.env.MEMORAI_MODEL || 'gpt-4',
      ...(process.env.OPENAI_BASE_URL && {
        base_url: process.env.OPENAI_BASE_URL,
      }),
      ...(process.env.AZURE_OPENAI_ENDPOINT && {
        azure_endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      }),
      ...(process.env.AZURE_OPENAI_DEPLOYMENT_NAME && {
        azure_deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      }),
      ...(process.env.AZURE_OPENAI_API_VERSION && {
        azure_api_version: process.env.AZURE_OPENAI_API_VERSION,
      }),
    },
    embedding: {
      provider:
        (process.env.MEMORAI_EMBEDDING_PROVIDER as
          | 'openai'
          | 'azure'
          | 'local') || 'openai',
      model: process.env.MEMORAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      api_key: process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY,
      ...(process.env.OPENAI_ENDPOINT && {
        endpoint: process.env.OPENAI_ENDPOINT,
      }),
      ...(process.env.AZURE_OPENAI_ENDPOINT && {
        azure_endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      }),
      ...(process.env.AZURE_OPENAI_DEPLOYMENT_NAME && {
        azure_deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      }),
      ...(process.env.AZURE_OPENAI_API_VERSION && {
        azure_api_version: process.env.AZURE_OPENAI_API_VERSION,
      }),
      ...(process.env.MEMORAI_EMBEDDING_DIMENSIONS && {
        dimensions: parseInt(process.env.MEMORAI_EMBEDDING_DIMENSIONS),
      }),
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
}

export class MemoryConfigManager {
  private config: IMemoryConfig;
  constructor(overrides: Partial<IMemoryConfig> = {}) {
    // Get fresh default config with current environment variables
    const defaultConfig = createDefaultConfig();
    // Handle null overrides gracefully
    const safeOverrides = overrides || {};
    this.config = this.mergeConfig(defaultConfig, safeOverrides);
    this.validate();
  }
  public get(): IMemoryConfig {
    // Deep clone to ensure immutability
    return {
      vector_db: { ...this.config.vector_db },
      redis: { ...this.config.redis },
      embedding: { ...this.config.embedding },
      performance: { ...this.config.performance },
      security: { ...this.config.security },
    };
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
    // Handle undefined or null overrides gracefully
    const safeOverrides = overrides || {};
    return {
      vector_db: {
        ...defaultConfig.vector_db,
        ...(safeOverrides.vector_db || {}),
      },
      redis: { ...defaultConfig.redis, ...(safeOverrides.redis || {}) },
      embedding: {
        ...defaultConfig.embedding,
        ...(safeOverrides.embedding || {}),
      },
      performance: {
        ...defaultConfig.performance,
        ...(safeOverrides.performance || {}),
      },
      security: {
        ...defaultConfig.security,
        ...(safeOverrides.security || {}),
      },
    };
  }
  private validate(): void {
    // Validate encryption key
    if (
      !this.config.security.encryption_key ||
      this.config.security.encryption_key.length < 32
    ) {
      throw new Error(
        'Invalid memory configuration: Encryption key must be at least 32 characters long'
      );
    }

    // Validate URLs
    if (this.config.vector_db.url) {
      try {
        const url = new URL(this.config.vector_db.url);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error(
            'Invalid memory configuration: Vector database URL must use http or https protocol'
          );
        }
        if (!url.hostname) {
          throw new Error(
            'Invalid memory configuration: Vector database URL must have a valid hostname'
          );
        }
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error(
            'Invalid memory configuration: Vector database URL format is invalid'
          );
        }
        throw error;
      }
    }

    if (this.config.redis.url) {
      try {
        const url = new URL(this.config.redis.url);
        if (!['redis:', 'rediss:', 'http:', 'https:'].includes(url.protocol)) {
          throw new Error(
            'Invalid memory configuration: Redis URL must use redis, rediss, http, or https protocol'
          );
        }
        if (!url.hostname) {
          throw new Error(
            'Invalid memory configuration: Redis URL must have a valid hostname'
          );
        }
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error(
            'Invalid memory configuration: Redis URL format is invalid'
          );
        }
        throw error;
      }
    }

    // Validate performance constraints
    if (this.config.performance.max_query_time_ms <= 0) {
      throw new Error(
        'Invalid memory configuration: max_query_time_ms must be greater than 0'
      );
    }
    if (this.config.performance.cache_ttl_seconds < 0) {
      throw new Error(
        'Invalid memory configuration: cache_ttl_seconds must be non-negative'
      );
    }
    if (this.config.performance.batch_size <= 0) {
      throw new Error(
        'Invalid memory configuration: batch_size must be greater than 0'
      );
    }

    // Validate embedding configuration
    const validProviders = ['openai', 'azure', 'local'];
    if (!validProviders.includes(this.config.embedding.provider)) {
      throw new Error(
        `Invalid memory configuration: Embedding provider must be one of: ${validProviders.join(', ')}`
      );
    }
    if (
      !this.config.embedding.model ||
      this.config.embedding.model.trim().length === 0
    ) {
      throw new Error(
        'Invalid memory configuration: Embedding model cannot be empty'
      );
    }
    if (
      this.config.embedding.api_key &&
      this.config.embedding.api_key.length < 10
    ) {
      throw new Error('Invalid memory configuration: API key is too short');
    }

    // Additional Zod validation for any other edge cases
    try {
      // Import the schema from types and validate asynchronously for warnings only
      import('../types/index.js')
        .then(({ MemoryConfigSchema }) => {
          MemoryConfigSchema.parse(this.config);
        })
        .catch((error: unknown) => {
          if (error instanceof z.ZodError) {
            // Don't throw here as this is async - just log warnings for additional validation
            logger.warn(
              `Memory configuration validation warning: ${JSON.stringify(error.errors, null, 2)}`
            );
          }
        });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        logger.warn(
          `Memory configuration validation warning: ${JSON.stringify(error.errors, null, 2)}`
        );
      }
    }
  }

  /**
   * Get feature capabilities based on current configuration
   */
  public getFeatures(): {
    embedding: boolean;
    similarity: boolean;
    persistence: boolean;
    scalability: boolean;
  } {
    return {
      embedding: !!this.config.embedding.api_key,
      similarity: true, // Always supported
      persistence: !!this.config.vector_db.url,
      scalability: !!this.config.redis.url,
    };
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
  public static create(
    overrides: Partial<IMemoryConfig> = {}
  ): MemoryConfigManager {
    return new MemoryConfigManager(overrides);
  }
}

// Alias for backward compatibility with tests
export const MemoryConfig = MemoryConfigFactory;
