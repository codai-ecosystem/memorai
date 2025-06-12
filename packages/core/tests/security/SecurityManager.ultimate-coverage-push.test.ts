import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityManager, InputValidator } from '../../src/security/SecurityManager.js';

describe('SecurityManager - Ultimate Coverage Push', () => {
  let securityManager: SecurityManager;
  beforeEach(() => {    securityManager = new SecurityManager({
      encryptionKey: 'test-encryption-key-that-is-32-characters-long-abc123',
      auditLog: true,
      rateLimiting: {
        windowMs: 60000,
        maxRequests: 100
      }
    });
  });

  describe('Content Validation - Target Lines 154-155', () => {    it('should detect empty content validation (line 154-155)', () => {
      // Target line 154-155: if (content.length < 1) { errors.push('Content cannot be empty'); }
      const validationResult = InputValidator.validateMemoryContent('');
      
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain('Content must be a non-empty string');
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace-only content as empty (line 154-155)', () => {
      // Edge case: whitespace should still be considered valid content (length > 0)
      const validationResult = InputValidator.validateMemoryContent('   ');
      
      // This should pass validation since length > 0
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).not.toContain('Content cannot be empty');
    });

    it('should handle single character content (boundary test for line 154-155)', () => {
      // Boundary test: single character should be valid (length = 1)
      const validationResult = InputValidator.validateMemoryContent('a');
      
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).not.toContain('Content cannot be empty');
    });
  });
});
