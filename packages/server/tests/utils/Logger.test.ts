/**
 * @fileoverview Basic tests for Logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/Logger.js';

describe('Logger', () => {
  beforeEach(() => {
    // Reset any existing logger instance
    (Logger as any).instance = null;
  });

  afterEach(() => {
    // Clean up after tests
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create a singleton logger instance', () => {
      const logger1 = Logger.getInstance();
      const logger2 = Logger.getInstance();

      expect(logger1).toBe(logger2);
    });

    it('should return existing instance on subsequent calls', () => {
      const firstCall = Logger.getInstance();
      const secondCall = Logger.getInstance();

      expect(firstCall).toBe(secondCall);
    });

    it('should configure logger with basic options', () => {
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
    });
  });

  describe('Static Logging Methods', () => {
    it('should have info method', () => {
      expect(typeof Logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof Logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof Logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof Logger.debug).toBe('function');
    });

    it('should call info without throwing', () => {
      expect(() => Logger.info('test message')).not.toThrow();
    });

    it('should call error without throwing', () => {
      expect(() => Logger.error('test error')).not.toThrow();
    });

    it('should call warn without throwing', () => {
      expect(() => Logger.warn('test warning')).not.toThrow();
    });

    it('should call debug without throwing', () => {
      expect(() => Logger.debug('test debug')).not.toThrow();
    });

    it('should handle info with metadata', () => {
      expect(() => Logger.info('test message', { key: 'value' })).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle logger creation errors gracefully', () => {
      // This test just ensures the logger can be created without errors
      expect(() => Logger.getInstance()).not.toThrow();
    });
  });

  describe('Basic Configuration', () => {
    it('should create logger with default configuration', () => {
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();
    });

    it('should support console transport', () => {
      const logger = Logger.getInstance();
      expect(logger).toBeDefined();

      // Test that logging works without errors
      expect(() => Logger.info('Console transport test')).not.toThrow();
    });
  });
});
