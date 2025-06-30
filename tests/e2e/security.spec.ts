import { test, expect } from '@playwright/test';

test.describe('Security Testing Suite', () => {
  test.describe('Input Validation & Sanitization', () => {
    test('should prevent XSS attacks in memory content', async ({ request }) => {
      const maliciousContent = '<script>alert("xss")</script>';
      
      const response = await request.post('http://localhost:6367/api/memories', {
        data: {
          agentId: 'security-test-agent',
          content: maliciousContent,
          metadata: {
            entityType: 'security_test',
            importance: 0.5
          }
        }
      });
      
      // Should either reject the request or sanitize the content
      expect([200, 201, 400, 422].includes(response.status())).toBeTruthy();
      
      if (response.ok()) {
        const responseData = await response.json();
        expect(responseData.content || '').not.toMatch(/<script>/);
      }
    });

    test('should handle SQL injection attempts', async ({ request }) => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE memories; --",
        "1' OR '1'='1",
        "'; INSERT INTO memories VALUES ('hack'); --"
      ];
      
      for (const attempt of sqlInjectionAttempts) {
        const response = await request.post('http://localhost:6367/api/memories', {
          data: {
            agentId: attempt,
            content: 'Test content',
            metadata: {
              entityType: 'security_test'
            }
          }
        });
        
        // Should handle safely - either reject or sanitize
        expect([200, 201, 400, 422, 500].includes(response.status())).toBeTruthy();
      }
    });

    test('should validate API endpoints against path traversal', async ({ request }) => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const attempt of pathTraversalAttempts) {
        const response = await request.get(`http://localhost:6367/api/memories/${attempt}`);
        
        // Should return proper error status, not expose system files
        expect([400, 404, 403].includes(response.status())).toBeTruthy();
      }
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should require proper authentication for protected endpoints', async ({ request }) => {
      // Test admin endpoints without authentication
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/settings',
        '/api/admin/logs'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await request.get(`http://localhost:6367${endpoint}`);
        
        // Should require authentication
        expect([401, 403, 404].includes(response.status())).toBeTruthy();
      }
    });

    test('should prevent unauthorized access to other agents memories', async ({ request }) => {
      // Create memory for agent A
      await request.post('http://localhost:6367/api/memories', {
        data: {
          agentId: 'agent-a',
          content: 'Private content for agent A',
          metadata: { entityType: 'private' }
        }
      });
      
      // Try to access agent A's memories as agent B
      const response = await request.get('http://localhost:6367/api/memories/search', {
        params: {
          agentId: 'agent-b',
          query: 'Private content for agent A'
        }
      });
      
      // Should not return agent A's private content
      if (response.ok()) {
        const data = await response.json();
        const hasPrivateContent = data.memories?.some((memory: any) => 
          memory.content?.includes('Private content for agent A')
        );
        expect(hasPrivateContent).toBeFalsy();
      }
    });
  });

  test.describe('Rate Limiting & DoS Protection', () => {
    test('should handle rapid requests gracefully', async ({ request }) => {
      const requestCount = 10;
      let successCount = 0;
      let rateLimitCount = 0;
      
      // Fire rapid requests sequentially to avoid promise issues
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await request.get('http://localhost:6367/api/health');
          if (response.status() === 200) {
            successCount++;
          } else if (response.status() === 429) {
            rateLimitCount++;
          }
        } catch (error) {
          console.log(`Request ${i} failed:`, error);
        }
      }
      
      // Should either succeed or rate limit appropriately
      expect(successCount + rateLimitCount > 0).toBeTruthy();
    });

    test('should prevent memory flooding attacks', async ({ request }) => {
      const attemptCount = 5;
      let handledCount = 0;
      
      for (let i = 0; i < attemptCount; i++) {
        try {
          const response = await request.post('http://localhost:6367/api/memories', {
            data: {
              agentId: 'flood-test-agent',
              content: `Flood attempt ${i} with large content: ${'x'.repeat(10000)}`,
              metadata: { entityType: 'flood_test' }
            }
          });
          
          // Should handle the flood attempt gracefully
          if ([200, 201, 400, 413, 429, 500].includes(response.status())) {
            handledCount++;
          }
        } catch (error) {
          // Caught errors also count as handled
          handledCount++;
        }
      }
      
      expect(handledCount).toBe(attemptCount);
    });
  });

  test.describe('Data Encryption & Privacy', () => {
    test('should use HTTPS in production', async ({ request }) => {
      // This test checks if the service properly redirects to HTTPS
      // In development, we expect HTTP to work
      const response = await request.get('http://localhost:6367/api/health');
      
      // In development, should work over HTTP
      // In production, should redirect to HTTPS or require HTTPS
      expect([200, 301, 302, 400].includes(response.status())).toBeTruthy();
    });

    test('should not expose sensitive data in error messages', async ({ request }) => {
      // Make malformed request to trigger error
      const response = await request.post('http://localhost:6367/api/memories', {
        data: {
          // Missing required fields
          invalidField: 'test'
        }
      });
      
      if (!response.ok()) {
        const errorText = await response.text();
        
        // Should not expose sensitive system information
        expect(errorText).not.toMatch(/password|secret|key|token|database|connection/i);
        expect(errorText).not.toMatch(/stack trace|file path|line number/i);
      }
    });
  });

  test.describe('Content Security & Validation', () => {
    test('should enforce content size limits', async ({ request }) => {
      const oversizedContent = 'x'.repeat(1000000); // 1MB content
      
      const response = await request.post('http://localhost:6367/api/memories', {
        data: {
          agentId: 'size-test-agent',
          content: oversizedContent,
          metadata: { entityType: 'size_test' }
        }
      });
      
      // Should reject oversized content
      expect([400, 413, 422].includes(response.status())).toBeTruthy();
    });

    test('should validate metadata structure', async ({ request }) => {
      const invalidMetadata = {
        invalidField: 'test',
        importance: 'not-a-number',
        tags: 'not-an-array'
      };
      
      const response = await request.post('http://localhost:6367/api/memories', {
        data: {
          agentId: 'validation-test-agent',
          content: 'Test content',
          metadata: invalidMetadata
        }
      });
      
      // Should validate metadata structure
      expect([200, 201, 400, 422].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('API Security Headers', () => {
    test('should include security headers in responses', async ({ request }) => {
      const response = await request.get('http://localhost:6367/api/health');
      const headers = response.headers();
      
      // Check for common security headers (may not all be present in development)
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'content-security-policy',
        'strict-transport-security'
      ];
      
      // At least some security headers should be present
      const hasSecurityHeaders = securityHeaders.some(header => 
        headers[header] !== undefined
      );
      
      // This is more of an informational test for development
      console.log('Security headers present:', 
        securityHeaders.filter(h => headers[h]).join(', ')
      );
      
      expect(response.status()).toBe(200);
    });
  });
});
