/**
 * @fileoverview Comprehensive tests for SDKConfig to achieve 95%+ coverage
 */

import { describe, it, expect } from 'vitest';
import { SDKConfig } from '../../src/config/SDKConfig.js';
import type { ClientOptions } from '../../src/types/index.js';

describe('SDKConfig - Comprehensive Coverage', () => {
  describe('Constructor and Basic Properties', () => {
    it('should initialize with minimal required options', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com'
      };

      const config = new SDKConfig(options);

      expect(config.serverUrl).toBe('https://api.example.com');
      expect(config.apiKey).toBeUndefined();
      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.loggingEnabled).toBe(false);
      expect(config.cacheEnabled).toBe(false);
      expect(config.cacheOptions).toEqual({
        enabled: false,
        ttl: 300,
        maxSize: 1000,
        strategy: 'lru'
      });
    });

    it('should initialize with all options provided', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        apiKey: 'test-api-key',
        timeout: 15000,
        retryAttempts: 5,
        retryDelay: 2000,
        logging: true,
        cache: {
          enabled: true,
          ttl: 600,
          maxSize: 2000,
          strategy: 'fifo'
        }
      };

      const config = new SDKConfig(options);

      expect(config.serverUrl).toBe('https://api.example.com');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.timeout).toBe(15000);
      expect(config.retryAttempts).toBe(5);
      expect(config.retryDelay).toBe(2000);
      expect(config.loggingEnabled).toBe(true);
      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheOptions).toEqual({
        enabled: true,
        ttl: 600,
        maxSize: 2000,
        strategy: 'fifo'
      });
    });

    it('should handle partial cache options', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          ttl: 120
        }
      };

      const config = new SDKConfig(options);

      expect(config.cacheEnabled).toBe(true);
      expect(config.cacheOptions).toEqual({
        enabled: true,
        ttl: 120,
        maxSize: 1000, // default
        strategy: 'lru' // default
      });
    });

    it('should handle cache enabled false explicitly', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: false,
          ttl: 600,
          maxSize: 500
        }
      };

      const config = new SDKConfig(options);

      expect(config.cacheEnabled).toBe(false);
      expect(config.cacheOptions.enabled).toBe(false);
    });

    it('should handle empty cache object', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        cache: {}
      };

      const config = new SDKConfig(options);

      expect(config.cacheEnabled).toBe(false);
      expect(config.cacheOptions).toEqual({
        enabled: false,
        ttl: 300,
        maxSize: 1000,
        strategy: 'lru'
      });
    });

    it('should handle apiKey as empty string', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        apiKey: ''
      };

      const config = new SDKConfig(options);

      expect(config.apiKey).toBe('');
    });

    it('should handle logging set to false explicitly', () => {
      const options: ClientOptions = {
        serverUrl: 'https://api.example.com',
        logging: false
      };

      const config = new SDKConfig(options);

      expect(config.loggingEnabled).toBe(false);
    });
  });

  describe('Connection Options', () => {
    it('should generate connection options with API key', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        apiKey: 'test-api-key',
        timeout: 20000
      });

      const connectionOptions = config.getConnectionOptions();

      expect(connectionOptions).toEqual({
        serverUrl: 'https://api.example.com',
        timeout: 20000,
        apiKey: 'test-api-key',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should generate connection options without API key', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 20000
      });

      const connectionOptions = config.getConnectionOptions();

      expect(connectionOptions).toEqual({
        serverUrl: 'https://api.example.com',
        timeout: 20000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }); it('should handle empty string API key in connection options', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        apiKey: ''
      });

      const connectionOptions = config.getConnectionOptions();

      expect(connectionOptions).toEqual({
        serverUrl: 'https://api.example.com',
        timeout: 30000,
        apiKey: '',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('Validation', () => {
    it('should validate valid configuration', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 15000,
        retryAttempts: 3,
        retryDelay: 1500,
        cache: {
          enabled: true,
          maxSize: 500,
          ttl: 120
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw error for missing server URL', () => {
      const config = new SDKConfig({
        serverUrl: ''
      });

      expect(() => config.validate()).toThrow('Server URL is required');
    });

    it('should throw error for invalid server URL format', () => {
      const config = new SDKConfig({
        serverUrl: 'invalid-url'
      });

      expect(() => config.validate()).toThrow('Server URL must be a valid HTTP/HTTPS URL');
    });

    it('should accept HTTP URLs', () => {
      const config = new SDKConfig({
        serverUrl: 'http://localhost:6367'
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should accept HTTPS URLs', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com'
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw error for too low timeout', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 500
      });

      expect(() => config.validate()).toThrow('Timeout must be between 1 and 300 seconds');
    });

    it('should throw error for too high timeout', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 400000
      });

      expect(() => config.validate()).toThrow('Timeout must be between 1 and 300 seconds');
    });

    it('should throw error for negative retry attempts', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryAttempts: -1
      });

      expect(() => config.validate()).toThrow('Retry attempts must be between 0 and 10');
    });

    it('should throw error for too high retry attempts', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryAttempts: 15
      });

      expect(() => config.validate()).toThrow('Retry attempts must be between 0 and 10');
    });

    it('should accept zero retry attempts', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryAttempts: 0
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should accept maximum retry attempts', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryAttempts: 10
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw error for too low retry delay', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryDelay: 50
      });

      expect(() => config.validate()).toThrow('Retry delay must be between 100ms and 10 seconds');
    });

    it('should throw error for too high retry delay', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryDelay: 15000
      });

      expect(() => config.validate()).toThrow('Retry delay must be between 100ms and 10 seconds');
    });

    it('should accept minimum retry delay', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryDelay: 100
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should accept maximum retry delay', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        retryDelay: 10000
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw error for too low cache max size', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          maxSize: 0
        }
      });

      expect(() => config.validate()).toThrow('Cache max size must be between 1 and 100,000');
    });

    it('should throw error for too high cache max size', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          maxSize: 200000
        }
      });

      expect(() => config.validate()).toThrow('Cache max size must be between 1 and 100,000');
    });

    it('should accept minimum cache max size', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          maxSize: 1
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should accept maximum cache max size', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          maxSize: 100000
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should skip cache max size validation when undefined', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true
          // maxSize is undefined
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should throw error for too low cache TTL', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          ttl: 0
        }
      });

      expect(() => config.validate()).toThrow('Cache TTL must be between 1 second and 1 day');
    });

    it('should throw error for too high cache TTL', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          ttl: 100000
        }
      });

      expect(() => config.validate()).toThrow('Cache TTL must be between 1 second and 1 day');
    });

    it('should accept minimum cache TTL', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          ttl: 1
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should accept maximum cache TTL', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true,
          ttl: 86400
        }
      });

      expect(() => config.validate()).not.toThrow();
    });

    it('should skip cache TTL validation when undefined', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        cache: {
          enabled: true
          // ttl is undefined
        }
      });

      expect(() => config.validate()).not.toThrow();
    });
  });

  describe('Object Serialization', () => {
    it('should serialize configuration with API key redacted', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        apiKey: 'secret-key',
        timeout: 15000,
        retryAttempts: 5,
        retryDelay: 2000,
        logging: true,
        cache: {
          enabled: true,
          ttl: 300,
          maxSize: 1000,
          strategy: 'lru'
        }
      });

      const obj = config.toObject();

      expect(obj).toEqual({
        serverUrl: 'https://api.example.com',
        apiKey: '***REDACTED***',
        timeout: 15000,
        retryAttempts: 5,
        retryDelay: 2000,
        cacheEnabled: true,
        cacheOptions: {
          enabled: true,
          ttl: 300,
          maxSize: 1000,
          strategy: 'lru'
        },
        loggingEnabled: true
      });
    });

    it('should serialize configuration without API key', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 20000,
        logging: false
      });

      const obj = config.toObject();

      expect(obj).toEqual({
        serverUrl: 'https://api.example.com',
        apiKey: undefined,
        timeout: 20000,
        retryAttempts: 3,
        retryDelay: 1000,
        cacheEnabled: false,
        cacheOptions: {
          enabled: false,
          ttl: 300,
          maxSize: 1000,
          strategy: 'lru'
        },
        loggingEnabled: false
      });
    }); it('should serialize configuration with empty string API key', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com',
        apiKey: ''
      });

      const obj = config.toObject();

      expect(obj.apiKey).toBe(undefined);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all default values correctly', () => {
      const config = new SDKConfig({
        serverUrl: 'https://api.example.com'
      });

      expect(config.timeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.loggingEnabled).toBe(false);
      expect(config.cacheEnabled).toBe(false);
      expect(config.cacheOptions.ttl).toBe(300);
      expect(config.cacheOptions.maxSize).toBe(1000);
      expect(config.cacheOptions.strategy).toBe('lru');
    });

    it('should handle boundary values for timeout', () => {
      const minConfig = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 1000
      });

      const maxConfig = new SDKConfig({
        serverUrl: 'https://api.example.com',
        timeout: 300000
      });

      expect(() => minConfig.validate()).not.toThrow();
      expect(() => maxConfig.validate()).not.toThrow();
    });

    it('should handle complex URL patterns', () => {
      const urls = [
        'http://localhost:6367',
        'https://api.example.com:8080',
        'https://sub.domain.com/path',
        'http://192.168.1.1:8080'
      ];

      urls.forEach(url => {
        const config = new SDKConfig({ serverUrl: url });
        expect(() => config.validate()).not.toThrow();
      });
    });

    it('should reject invalid URL patterns', () => {
      const invalidUrls = [
        'ftp://example.com',
        'ws://example.com',
        'example.com',
        'http://',
        'https://'
      ];

      invalidUrls.forEach(url => {
        const config = new SDKConfig({ serverUrl: url });
        expect(() => config.validate()).toThrow();
      });
    });
  });
});
