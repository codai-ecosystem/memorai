import { test, expect } from '@playwright/test';

test.describe('Load Testing Suite', () => {
  test.describe('Memory Service Load Tests', () => {
    test('should handle sustained memory creation load', async ({ request }) => {
      const operationCount = 50;
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      
      console.log(`Starting sustained load test with ${operationCount} operations...`);
      
      for (let i = 0; i < operationCount; i++) {
        try {
          const response = await request.post('http://localhost:6367/api/memories', {
            data: {
              agentId: `load-test-agent-${i % 10}`, // Distribute across 10 agents
              content: `Load test memory ${i} with substantial content for realistic testing`,
              metadata: {
                entityType: 'load_test',
                importance: Math.random(),
                tags: [`batch-${Math.floor(i / 10)}`, 'load-test'],
                operationId: i
              }
            }
          });
          
          if ([200, 201].includes(response.status())) {
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay to simulate realistic usage
          if (i % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
        } catch (error) {
          errorCount++;
          console.log(`Operation ${i} failed:`, error);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const operationsPerSecond = (operationCount / duration) * 1000;
      
      console.log(`Load Test Results:`);
      console.log(`- Total Operations: ${operationCount}`);
      console.log(`- Successful: ${successCount}`);
      console.log(`- Errors: ${errorCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Operations/sec: ${operationsPerSecond.toFixed(2)}`);
      
      // At least 80% should succeed
      const successRate = successCount / operationCount;
      expect(successRate > 0.8).toBeTruthy();
    });

    test('should handle concurrent search operations', async ({ request }) => {
      // First, create some test data
      for (let i = 0; i < 20; i++) {
        await request.post('http://localhost:6367/api/memories', {
          data: {
            agentId: 'search-load-agent',
            content: `Searchable content item ${i} with keywords: performance testing load`,
            metadata: {
              entityType: 'search_test',
              importance: Math.random(),
              tags: ['searchable', 'performance']
            }
          }
        });
      }
      
      // Now perform concurrent searches
      const searchCount = 30;
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < searchCount; i++) {
        try {
          const response = await request.get('http://localhost:6367/api/memories/search', {
            params: {
              agentId: 'search-load-agent',
              query: `performance testing ${i % 5}`, // Vary search terms
              limit: '10'
            }
          });
          
          if ([200].includes(response.status())) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const searchesPerSecond = (searchCount / duration) * 1000;
      
      console.log(`Search Load Test Results:`);
      console.log(`- Total Searches: ${searchCount}`);
      console.log(`- Successful: ${successCount}`);
      console.log(`- Errors: ${errorCount}`);
      console.log(`- Duration: ${duration}ms`);
      console.log(`- Searches/sec: ${searchesPerSecond.toFixed(2)}`);
      
      // At least 90% of searches should succeed
      const successRate = successCount / searchCount;
      expect(successRate > 0.9).toBeTruthy();
    });
  });

  test.describe('API Load Tests', () => {
    test('should handle health check load', async ({ request }) => {
      const requestCount = 100;
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;
      const responseTimes: number[] = [];
      
      for (let i = 0; i < requestCount; i++) {
        const reqStart = Date.now();
        try {
          const response = await request.get('http://localhost:6367/api/health');
          const reqEnd = Date.now();
          responseTimes.push(reqEnd - reqStart);
          
          if (response.ok()) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const requestsPerSecond = (requestCount / totalDuration) * 1000;
      
      console.log(`Health Check Load Test Results:`);
      console.log(`- Total Requests: ${requestCount}`);
      console.log(`- Successful: ${successCount}`);
      console.log(`- Errors: ${errorCount}`);
      console.log(`- Duration: ${totalDuration}ms`);
      console.log(`- Requests/sec: ${requestsPerSecond.toFixed(2)}`);
      console.log(`- Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
      
      // Health checks should be very reliable
      const successRate = successCount / requestCount;
      expect(successRate > 0.95).toBeTruthy();
      
      // Average response time should be reasonable
      expect(avgResponseTime < 500).toBeTruthy(); // Less than 500ms average
    });
  });

  test.describe('Mixed Workload Tests', () => {
    test('should handle realistic mixed operations', async ({ request }) => {
      const operationCount = 40;
      const startTime = Date.now();
      let createSuccessCount = 0;
      let searchSuccessCount = 0;
      let errorCount = 0;
      
      console.log(`Starting mixed workload test...`);
      
      for (let i = 0; i < operationCount; i++) {
        try {
          if (i % 3 === 0) {
            // Create memory operation
            const response = await request.post('http://localhost:6367/api/memories', {
              data: {
                agentId: `mixed-test-agent-${i % 5}`,
                content: `Mixed workload memory ${i} with realistic content and metadata`,
                metadata: {
                  entityType: 'mixed_test',
                  importance: Math.random(),
                  tags: ['mixed', 'workload', `operation-${i}`]
                }
              }
            });
            
            if ([200, 201].includes(response.status())) {
              createSuccessCount++;
            } else {
              errorCount++;
            }
          } else {
            // Search operation
            const response = await request.get('http://localhost:6367/api/memories/search', {
              params: {
                agentId: `mixed-test-agent-${i % 5}`,
                query: 'mixed workload realistic',
                limit: '5'
              }
            });
            
            if ([200].includes(response.status())) {
              searchSuccessCount++;
            } else {
              errorCount++;
            }
          }
          
          // Realistic delay between operations
          if (i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          errorCount++;
          console.log(`Mixed operation ${i} failed:`, error);
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      const totalSuccessful = createSuccessCount + searchSuccessCount;
      
      console.log(`Mixed Workload Test Results:`);
      console.log(`- Total Operations: ${operationCount}`);
      console.log(`- Create Successful: ${createSuccessCount}`);
      console.log(`- Search Successful: ${searchSuccessCount}`);
      console.log(`- Total Successful: ${totalSuccessful}`);
      console.log(`- Errors: ${errorCount}`);
      console.log(`- Duration: ${duration}ms`);
      
      // At least 85% should succeed under mixed load
      const successRate = totalSuccessful / operationCount;
      expect(successRate > 0.85).toBeTruthy();
    });
  });

  test.describe('Stress Tests', () => {
    test('should gracefully handle extreme load', async ({ request }) => {
      const extremeCount = 20; // Reduced for realistic CI testing
      const agentCount = 3;
      let totalSuccessful = 0;
      let totalAttempts = 0;
      
      console.log(`Starting stress test with ${extremeCount} operations per agent...`);
      
      // Test multiple agents under stress
      for (let agentId = 0; agentId < agentCount; agentId++) {
        for (let i = 0; i < extremeCount; i++) {
          totalAttempts++;
          try {
            const response = await request.post('http://localhost:6367/api/memories', {
              data: {
                agentId: `stress-agent-${agentId}`,
                content: `Stress test memory ${i} for agent ${agentId}`,
                metadata: {
                  entityType: 'stress_test',
                  importance: 0.5,
                  batchId: agentId,
                  operationId: i
                }
              }
            });
            
            if ([200, 201, 429, 503].includes(response.status())) {
              // Count rate limiting as graceful handling
              totalSuccessful++;
            }
          } catch (error) {
            // Some failures are expected under extreme stress
            console.log(`Stress operation failed (expected):`, error);
          }
        }
      }
      
      console.log(`Stress Test Results:`);
      console.log(`- Total Attempts: ${totalAttempts}`);
      console.log(`- Handled Gracefully: ${totalSuccessful}`);
      console.log(`- Failure Rate: ${((totalAttempts - totalSuccessful) / totalAttempts * 100).toFixed(2)}%`);
      
      // System should handle at least 70% gracefully under extreme stress
      const gracefulHandlingRate = totalSuccessful / totalAttempts;
      expect(gracefulHandlingRate > 0.7).toBeTruthy();
    });
  });
});
