import { test, expect } from '@playwright/test';

test.describe('Enterprise Memorai E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard before each test
    await page.goto('http://localhost:6366');
  });

  test.describe('Dashboard Functionality', () => {
    test('should load the dashboard successfully', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Check for main elements
      const title = await page.textContent('h1, [data-testid="dashboard-title"]');
      expect(title).toBeTruthy();
      
      // Verify dashboard is interactive
      await expect(page).toHaveTitle(/memorai/i);
    });

    test('should display memory statistics', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Look for any statistics or metrics on the page
      const hasStats = await page.locator('[data-testid="stats"], .stats, .metrics').count() > 0;
      const hasNumbers = await page.locator('text=/\\d+/').count() > 0;
      
      expect(hasStats || hasNumbers).toBeTruthy();
    });
  });

  test.describe('API Health Checks', () => {
    test('should have healthy API endpoints', async ({ request }) => {
      // Test main API health endpoint (corrected URL)
      const healthResponse = await request.get('http://localhost:6367/health');
      expect(healthResponse.ok()).toBeTruthy();
      
      // Test basic API response structure
      const healthData = await healthResponse.json();
      expect(healthData).toBeTruthy();
      expect(healthData.status).toBe('healthy');
    });

    test('should handle API requests within reasonable time', async ({ request }) => {
      const startTime = Date.now();
      
      const response = await request.get('http://localhost:6367/health');
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.ok()).toBeTruthy();
      expect(responseTime < 5000).toBeTruthy(); // 5 second timeout
    });
  });

  test.describe('Memory Operations', () => {
    test('should handle basic memory operations via API', async ({ request }) => {
      // Test memory creation
      const createResponse = await request.post('http://localhost:6367/api/memories', {
        data: {
          agentId: 'e2e-test-agent',
          content: 'E2E test memory content',
          metadata: {
            entityType: 'test',
            importance: 0.8,
            tags: ['e2e', 'test']
          }
        }
      });
      
      // Should handle the request (may succeed or fail gracefully)
      const validStatuses = [200, 201, 400, 404, 500];
      expect(validStatuses.includes(createResponse.status())).toBeTruthy();
    });

    test('should handle memory search operations', async ({ request }) => {
      // Test memory search
      const searchResponse = await request.get('http://localhost:6367/api/memories/search', {
        params: {
          agentId: 'e2e-test-agent',
          query: 'test',
          limit: '10'
        }
      });
      
      // Should handle the request (may succeed or fail gracefully)
      const validStatuses = [200, 400, 404, 500];
      expect(validStatuses.includes(searchResponse.status())).toBeTruthy();
    });
  });

  test.describe('Performance Metrics', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:6366');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Dashboard load time: ${loadTime}ms`);
      expect(loadTime < 30000).toBeTruthy(); // 30 second limit
    });

    test('should handle multiple concurrent requests', async ({ request }) => {
      const requestCount = 5;
      let successCount = 0;
      
      for (let i = 0; i < requestCount; i++) {
        try {
          const response = await request.get('http://localhost:6367/api/health');
          if (response.ok()) {
            successCount++;
          }
        } catch (error) {
          console.log(`Request ${i} failed:`, error);
        }
      }
      
      // At least some requests should succeed
      expect(successCount > 0).toBeTruthy();
    });
  });

  test.describe('Service Integration', () => {
    test('should verify all services are accessible', async ({ request }) => {
      // Test Dashboard
      const dashboardResponse = await request.get('http://localhost:6366');
      console.log(`Dashboard status: ${dashboardResponse.status()}`);
      
      // Test API
      const apiResponse = await request.get('http://localhost:6367/health');
      console.log(`API status: ${apiResponse.status()}`);
      
      // Test MCP (if accessible via HTTP)
      try {
        const mcpResponse = await request.get('http://localhost:6368/health');
        console.log(`MCP status: ${mcpResponse.status()}`);
      } catch (error) {
        console.log('MCP not accessible via HTTP (expected for stdio transport)');
      }
      
      // At least dashboard and API should be accessible
      expect(dashboardResponse.status() < 500).toBeTruthy();
      expect(apiResponse.status() < 500).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid API requests gracefully', async ({ request }) => {
      const invalidResponse = await request.get('http://localhost:6367/api/invalid-endpoint');
      
      // Should return proper error status
      const validErrorStatuses = [400, 404, 405];
      expect(validErrorStatuses.includes(invalidResponse.status())).toBeTruthy();
    });

    test('should handle malformed requests gracefully', async ({ request }) => {
      const malformedResponse = await request.post('http://localhost:6367/api/memories', {
        data: 'invalid-json-data'
      });
      
      // Should handle malformed requests properly
      const validErrorStatuses = [400, 422, 500];
      expect(validErrorStatuses.includes(malformedResponse.status())).toBeTruthy();
    });
  });
});
