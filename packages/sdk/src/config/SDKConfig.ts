/**
 * @fileoverview SDK Configuration management
 */

import type {
  ClientOptions,
  CacheOptions,
  ConnectionOptions,
} from "../types/index.js";

/**
 * SDK configuration manager
 */
export class SDKConfig {
  public readonly serverUrl: string;
  public readonly apiKey?: string;
  public readonly timeout: number;
  public readonly retryAttempts: number;
  public readonly retryDelay: number;
  public readonly cacheEnabled: boolean;
  public readonly cacheOptions: CacheOptions;
  public readonly loggingEnabled: boolean;
  constructor(options: ClientOptions) {
    this.serverUrl = options.serverUrl;
    if (options.apiKey !== undefined) {
      this.apiKey = options.apiKey;
    }
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second default
    this.loggingEnabled = options.logging || false;
    // Cache configuration
    this.cacheOptions = {
      enabled: options.cache?.enabled || false,
      ttl: options.cache?.ttl !== undefined ? options.cache.ttl : 300, // 5 minutes default
      maxSize:
        options.cache?.maxSize !== undefined ? options.cache.maxSize : 1000,
      strategy: options.cache?.strategy || "lru",
    };
    this.cacheEnabled = this.cacheOptions.enabled;
  } /**
   * Get connection options for MCP client
   */
  public getConnectionOptions(): ConnectionOptions {
    const options: ConnectionOptions = {
      serverUrl: this.serverUrl,
      timeout: this.timeout,
      headers:
        this.apiKey && this.apiKey.length > 0
          ? {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            }
          : {
              "Content-Type": "application/json",
            },
    };

    if (this.apiKey !== undefined) {
      options.apiKey = this.apiKey;
    }

    return options;
  }

  /**
   * Validate configuration
   */
  public validate(): void {
    if (!this.serverUrl) {
      throw new Error("Server URL is required");
    }

    if (!/^https?:\/\/.+/.test(this.serverUrl)) {
      throw new Error("Server URL must be a valid HTTP/HTTPS URL");
    }

    if (this.timeout < 1000 || this.timeout > 300000) {
      throw new Error("Timeout must be between 1 and 300 seconds");
    }

    if (this.retryAttempts < 0 || this.retryAttempts > 10) {
      throw new Error("Retry attempts must be between 0 and 10");
    }

    if (this.retryDelay < 100 || this.retryDelay > 10000) {
      throw new Error("Retry delay must be between 100ms and 10 seconds");
    }
    if (
      this.cacheOptions.enabled &&
      this.cacheOptions.maxSize !== undefined &&
      (this.cacheOptions.maxSize < 1 || this.cacheOptions.maxSize > 100000)
    ) {
      throw new Error("Cache max size must be between 1 and 100,000");
    }

    if (
      this.cacheOptions.enabled &&
      this.cacheOptions.ttl !== undefined &&
      (this.cacheOptions.ttl < 1 || this.cacheOptions.ttl > 86400)
    ) {
      throw new Error("Cache TTL must be between 1 second and 1 day");
    }
  }
  /**
   * Get configuration as plain object
   */
  public toObject(): Record<string, unknown> {
    return {
      serverUrl: this.serverUrl,
      apiKey:
        this.apiKey !== undefined && this.apiKey.length > 0
          ? "***REDACTED***"
          : undefined,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      retryDelay: this.retryDelay,
      cacheEnabled: this.cacheEnabled,
      cacheOptions: this.cacheOptions,
      loggingEnabled: this.loggingEnabled,
    };
  }
}
