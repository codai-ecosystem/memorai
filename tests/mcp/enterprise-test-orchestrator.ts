/**
 * MCP-Powered Enterprise Test Orchestrator
 * 
 * This orchestrator uses VS Code MCP tools to run comprehensive tests
 * without the dependency issues of local Playwright installations.
 */

export interface TestResult {
  test: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details?: string;
  screenshot?: string;
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestResult[];
  totalDuration: number;
  passRate: number;
}

export class EnterpriseMCPTestOrchestrator {
  private baseUrl = 'http://localhost:6367';
  private dashboardUrl = 'http://localhost:6366';
  private testResults: TestResult[] = [];

  constructor() {
    console.log('🎯 Initializing MCP-Powered Enterprise Test Suite');
  }

  /**
   * Run comprehensive enterprise test suite
   */
  async runFullTestSuite(): Promise<TestSuite> {
    console.log('🚀 Starting Enterprise Test Suite...');
    const startTime = Date.now();

    const tests = [
      () => this.testServiceHealth(),
      () => this.testAPIEndpoints(),
      () => this.testMemoryOperations(),
      () => this.testDashboardFunctionality(),
      () => this.testPerformanceMetrics(),
      () => this.testSecurityValidation(),
      () => this.testErrorHandling(),
      () => this.testDataIntegrity()
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        console.error(`Test failed: ${error}`);
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.status === 'passed').length;
    const passRate = (passedTests / this.testResults.length) * 100;

    return {
      name: 'Enterprise MCP Test Suite',
      description: 'Comprehensive testing using MCP tools and direct API calls',
      tests: this.testResults,
      totalDuration,
      passRate
    };
  }

  /**
   * Test all service health endpoints
   */
  private async testServiceHealth(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test API Health
      const apiResponse = await fetch(`${this.baseUrl}/health`);
      const apiHealth = await apiResponse.json();
      
      if (apiHealth.status === 'healthy') {
        this.recordTest('API Health Check', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('API Health Check', 'failed', Date.now() - startTime, 'API not healthy');
      }

      // Test Dashboard Accessibility
      const dashboardResponse = await fetch(this.dashboardUrl);
      if (dashboardResponse.ok) {
        this.recordTest('Dashboard Accessibility', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Dashboard Accessibility', 'failed', Date.now() - startTime, 'Dashboard not accessible');
      }

    } catch (error) {
      this.recordTest('Service Health Tests', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test all API endpoints
   */
  private async testAPIEndpoints(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test Stats Endpoint
      const statsResponse = await fetch(`${this.baseUrl}/api/stats`);
      const statsData = await statsResponse.json();
      
      if (statsData.success) {
        this.recordTest('Stats Endpoint', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Stats Endpoint', 'failed', Date.now() - startTime, 'Stats endpoint returned error');
      }

      // Test Invalid Endpoint Handling
      const invalidResponse = await fetch(`${this.baseUrl}/api/invalid-endpoint`);
      if (invalidResponse.status === 404) {
        this.recordTest('Invalid Endpoint Handling', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Invalid Endpoint Handling', 'failed', Date.now() - startTime, 'Did not return 404 for invalid endpoint');
      }

    } catch (error) {
      this.recordTest('API Endpoint Tests', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test memory operations (CRUD)
   */
  private async testMemoryOperations(): Promise<void> {
    const startTime = Date.now();
    const testAgentId = `mcp-test-${Date.now()}`;

    try {
      // Test Memory Creation
      const createResponse = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentId,
          content: 'MCP Enterprise Test Memory',
          metadata: { type: 'mcp_test', importance: 0.9 }
        })
      });
      
      const createData = await createResponse.json();
      if (createData.success) {
        this.recordTest('Memory Creation', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Memory Creation', 'failed', Date.now() - startTime, 'Failed to create memory');
        return;
      }

      // Test Memory Recall
      const recallResponse = await fetch(`${this.baseUrl}/api/memory/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentId,
          query: 'MCP Enterprise Test'
        })
      });

      const recallData = await recallResponse.json();
      if (recallData.success && recallData.count > 0) {
        this.recordTest('Memory Recall', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Memory Recall', 'failed', Date.now() - startTime, 'Failed to recall memory');
      }

      // Test Context Retrieval
      const contextResponse = await fetch(`${this.baseUrl}/api/memory/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentId,
          contextSize: 5
        })
      });

      const contextData = await contextResponse.json();
      if (contextData.success) {
        this.recordTest('Context Retrieval', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Context Retrieval', 'failed', Date.now() - startTime, 'Failed to get context');
      }

    } catch (error) {
      this.recordTest('Memory Operations', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test dashboard functionality using MCP Playwright
   */
  private async testDashboardFunctionality(): Promise<void> {
    const startTime = Date.now();

    try {
      // Note: This will use MCP PlaywrightMCPServer when called from VS Code
      console.log('📱 Dashboard tests require MCP Playwright integration');
      console.log('🔧 These tests should be run through VS Code MCP tools');
      
      // For now, test basic accessibility
      const response = await fetch(this.dashboardUrl);
      const html = await response.text();
      
      if (html.includes('Memorai Dashboard')) {
        this.recordTest('Dashboard Loads', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Dashboard Loads', 'failed', Date.now() - startTime, 'Dashboard title not found');
      }

      // Test if dashboard has required elements
      if (html.includes('data-testid="dashboard-header"')) {
        this.recordTest('Dashboard Header Present', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Dashboard Header Present', 'failed', Date.now() - startTime, 'Header not found');
      }

    } catch (error) {
      this.recordTest('Dashboard Functionality', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test performance metrics
   */
  private async testPerformanceMetrics(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test API Response Time
      const apiStartTime = Date.now();
      const response = await fetch(`${this.baseUrl}/health`);
      const apiResponseTime = Date.now() - apiStartTime;

      if (apiResponseTime < 5000) { // 5 second threshold
        this.recordTest('API Response Time', 'passed', Date.now() - startTime, `${apiResponseTime}ms`);
      } else {
        this.recordTest('API Response Time', 'failed', Date.now() - startTime, `Too slow: ${apiResponseTime}ms`);
      }

      // Test Multiple Concurrent Requests
      const concurrentStartTime = Date.now();
      const promises = Array(5).fill(0).map(() => fetch(`${this.baseUrl}/health`));
      await Promise.all(promises);
      const concurrentTime = Date.now() - concurrentStartTime;

      if (concurrentTime < 10000) { // 10 second threshold for 5 requests
        this.recordTest('Concurrent Request Handling', 'passed', Date.now() - startTime, `${concurrentTime}ms for 5 requests`);
      } else {
        this.recordTest('Concurrent Request Handling', 'failed', Date.now() - startTime, `Too slow: ${concurrentTime}ms`);
      }

    } catch (error) {
      this.recordTest('Performance Metrics', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test security validation
   */
  private async testSecurityValidation(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test SQL Injection Prevention
      const sqlInjectionResponse = await fetch(`${this.baseUrl}/api/memory/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: "'; DROP TABLE memories; --",
          query: "test"
        })
      });

      // Should handle gracefully, not crash
      if (sqlInjectionResponse.status === 400 || sqlInjectionResponse.status === 422) {
        this.recordTest('SQL Injection Prevention', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('SQL Injection Prevention', 'failed', Date.now() - startTime, 'Did not handle SQL injection attempt properly');
      }

      // Test XSS Prevention
      const xssResponse = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: "test-agent",
          content: "<script>alert('xss')</script>",
          metadata: {}
        })
      });

      // Should accept but sanitize
      const xssData = await xssResponse.json();
      if (xssData.success) {
        this.recordTest('XSS Input Handling', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('XSS Input Handling', 'failed', Date.now() - startTime, 'Failed to handle XSS input');
      }

    } catch (error) {
      this.recordTest('Security Validation', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = Date.now();

    try {
      // Test Invalid JSON
      const invalidJsonResponse = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      if (invalidJsonResponse.status === 400) {
        this.recordTest('Invalid JSON Handling', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Invalid JSON Handling', 'failed', Date.now() - startTime, 'Did not return 400 for invalid JSON');
      }

      // Test Missing Required Fields
      const missingFieldsResponse = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: 'test' }) // missing content
      });

      if (missingFieldsResponse.status === 400) {
        this.recordTest('Missing Fields Validation', 'passed', Date.now() - startTime);
      } else {
        this.recordTest('Missing Fields Validation', 'failed', Date.now() - startTime, 'Did not validate required fields');
      }

    } catch (error) {
      this.recordTest('Error Handling', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Test data integrity
   */
  private async testDataIntegrity(): Promise<void> {
    const startTime = Date.now();
    const testAgentId = `integrity-test-${Date.now()}`;

    try {
      // Create memory with specific content
      const testContent = 'Data integrity test content with special chars: åöü@#$%';
      const createResponse = await fetch(`${this.baseUrl}/api/memory/remember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentId,
          content: testContent,
          metadata: { test: 'integrity', number: 12345 }
        })
      });

      const createData = await createResponse.json();
      if (!createData.success) {
        this.recordTest('Data Integrity', 'failed', Date.now() - startTime, 'Failed to create test memory');
        return;
      }

      // Recall and verify content integrity
      const recallResponse = await fetch(`${this.baseUrl}/api/memory/recall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: testAgentId,
          query: 'integrity test'
        })
      });

      const recallData = await recallResponse.json();
      if (recallData.success && recallData.memories.length > 0) {
        const memory = recallData.memories[0].memory;
        if (memory.content.includes('åöü@#$%')) {
          this.recordTest('Data Integrity', 'passed', Date.now() - startTime, 'Special characters preserved');
        } else {
          this.recordTest('Data Integrity', 'failed', Date.now() - startTime, 'Special characters corrupted');
        }
      } else {
        this.recordTest('Data Integrity', 'failed', Date.now() - startTime, 'Could not recall test memory');
      }

    } catch (error) {
      this.recordTest('Data Integrity', 'failed', Date.now() - startTime, error.toString());
    }
  }

  /**
   * Record test result
   */
  private recordTest(test: string, status: 'passed' | 'failed' | 'skipped', duration: number, details?: string): void {
    this.testResults.push({ test, status, duration, details });
    const emoji = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⏭️';
    console.log(`${emoji} ${test} (${duration}ms)${details ? ` - ${details}` : ''}`);
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(suite: TestSuite): string {
    const passed = suite.tests.filter(t => t.status === 'passed').length;
    const failed = suite.tests.filter(t => t.status === 'failed').length;
    const skipped = suite.tests.filter(t => t.status === 'skipped').length;

    return `
# Enterprise MCP Test Suite Report

## Summary
- **Total Tests**: ${suite.tests.length}
- **Passed**: ${passed} ✅
- **Failed**: ${failed} ❌
- **Skipped**: ${skipped} ⏭️
- **Pass Rate**: ${suite.passRate.toFixed(2)}%
- **Total Duration**: ${suite.totalDuration}ms

## Test Results

${suite.tests.map(test => `
### ${test.test}
- **Status**: ${test.status === 'passed' ? '✅ PASSED' : test.status === 'failed' ? '❌ FAILED' : '⏭️ SKIPPED'}
- **Duration**: ${test.duration}ms
${test.details ? `- **Details**: ${test.details}` : ''}
`).join('\n')}

## Recommendations

${failed > 0 ? `
### Critical Issues Found
${suite.tests.filter(t => t.status === 'failed').map(t => `- **${t.test}**: ${t.details || 'See logs for details'}`).join('\n')}
` : '### All Tests Passed! 🎉\nThe Memorai system is functioning correctly.'}

---
*Report generated: ${new Date().toISOString()}*
`;
  }
}

// Export for use in test scripts
export default EnterpriseMCPTestOrchestrator;
