import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/utils/Logger';
import { ServerConfig } from '../../src/config/ServerConfig';

describe('Logger Advanced Coverage', () => {
  beforeEach(() => {
    // Clear singleton instances
    (Logger as any).instance = undefined;
    (ServerConfig as any).instance = undefined;
  });

  describe('Logger Format Configuration', () => {
    it('should create logger with simple format when not json', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FORMAT = 'simple';
      
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
    });

    it('should create logger with json format when specified', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FORMAT = 'json';
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
    });

    it('should add file transport when LOG_FILE is set', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FILE = 'test.log';
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
      
      // Check that file transport was added
      const transports = (logger as any).transports;
      expect(transports.length).toBeGreaterThan(1); // Console + File
    });

    it('should not add file transport when LOG_FILE is not set', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_FILE;
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
      
      // Check that only console transport exists
      const transports = (logger as any).transports;
      expect(transports.length).toBe(1); // Only Console
    });
  });

  describe('Logger Transport Coverage', () => {
    it('should always include console transport', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_FILE;
      
      const logger = Logger.getInstance();
      const transports = (logger as any).transports;
      
      const hasConsoleTransport = transports.some(
        (transport: any) => transport.constructor.name === 'Console'
      );
      
      expect(hasConsoleTransport).toBe(true);
    });

    it('should include file transport when configured', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FILE = 'output.log';
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      const transports = (logger as any).transports;
      
      const hasFileTransport = transports.some(
        (transport: any) => transport.constructor.name === 'File'
      );
      
      expect(hasFileTransport).toBe(true);
    });
  });

  describe('Format Configuration Branches', () => {
    it('should handle colorize and simple format for non-json', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FORMAT = 'simple';
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      
      // Test logging works with simple format
      expect(() => Logger.info('simple format test')).not.toThrow();
    });

    it('should handle json format configuration', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_FORMAT = 'json';
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      
      // Test logging works with json format
      expect(() => Logger.info('json format test')).not.toThrow();
    });

    it('should handle format defaults', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_FORMAT;
      (ServerConfig as any).instance = undefined;
      
      const logger = Logger.getInstance();
      
      // Test logging works with default format
      expect(() => Logger.info('default format test')).not.toThrow();
    });
  });

  describe('Singleton Behavior', () => {
    it('should return same instance on multiple calls', () => {
      process.env.NODE_ENV = 'development';
      
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();
      
      expect(logger1).toBe(logger2);
    });

    it('should create new instance when cleared', () => {
      process.env.NODE_ENV = 'development';
      
      const logger1 = Logger.getInstance();
      
      // Clear instance
      (Logger as any).instance = undefined;
      
      const logger2 = Logger.getInstance();
      
      expect(logger1).not.toBe(logger2);
    });
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.LOG_FORMAT;
    delete process.env.LOG_FILE;
  });
});
