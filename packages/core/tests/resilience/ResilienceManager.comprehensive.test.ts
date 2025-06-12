import { describe, it, expect, beforeEach } from 'vitest';
import { ResilienceManager } from '../../src/resilience/ResilienceManager';

describe('ResilienceManager - Comprehensive Coverage', () => {
  let manager: ResilienceManager;

  beforeEach(() => {
    manager = new ResilienceManager();
  });

  describe('Circuit Breaker Management', () => {
    it('should get status of all circuit breakers', () => {
      // Create multiple circuit breakers by using different operations
      const operation1 = async () => 'success1';
      const operation2 = async () => 'success2';
      
      // Execute operations to create circuit breakers
      manager.executeResilient('test-cb-1', operation1);
      manager.executeResilient('test-cb-2', operation2);
      
      const allStatus = manager.getAllCircuitBreakerStatus();
      
      expect(allStatus).toHaveProperty('test-cb-1');
      expect(allStatus).toHaveProperty('test-cb-2');
        // Each status should have circuit breaker properties
      expect(allStatus['test-cb-1']).toHaveProperty('state');
      expect(allStatus['test-cb-1']).toHaveProperty('failures');
      expect(allStatus['test-cb-1']).toHaveProperty('successRate');
      
      expect(allStatus['test-cb-2']).toHaveProperty('state');
      expect(allStatus['test-cb-2']).toHaveProperty('failures');
      expect(allStatus['test-cb-2']).toHaveProperty('successRate');
    });

    it('should return empty object when no circuit breakers exist', () => {
      const allStatus = manager.getAllCircuitBreakerStatus();
      expect(allStatus).toEqual({});
    });

    it('should reset a specific circuit breaker successfully', () => {
      // Create a circuit breaker by executing an operation
      const operation = async () => 'success';
      manager.executeResilient('test-reset-cb', operation);
      
      // Verify circuit breaker exists
      let allStatus = manager.getAllCircuitBreakerStatus();
      expect(allStatus).toHaveProperty('test-reset-cb');
      
      // Reset the circuit breaker
      const resetResult = manager.resetCircuitBreaker('test-reset-cb');
      expect(resetResult).toBe(true);
      
      // Verify circuit breaker is removed
      allStatus = manager.getAllCircuitBreakerStatus();
      expect(allStatus).not.toHaveProperty('test-reset-cb');
    });

    it('should return false when trying to reset non-existent circuit breaker', () => {
      const resetResult = manager.resetCircuitBreaker('non-existent-cb');
      expect(resetResult).toBe(false);
    });    it('should reset circuit breaker that was previously failing', async () => {
      let callCount = 0;
      const failingOperation = async () => {
        callCount++;
        if (callCount <= 6) { // Fail more times than max retries to ensure circuit breaker sees failures
          throw new Error('Simulated failure');
        }
        return 'success';
      };
      
      // Execute operation multiple times to trigger failures with reduced retry attempts
      const customOptions = { retry: { maxAttempts: 2, baseDelay: 100 } };
      
      await manager.executeResilient('failing-cb', failingOperation, customOptions).catch(() => {});
      await manager.executeResilient('failing-cb', failingOperation, customOptions).catch(() => {});
      await manager.executeResilient('failing-cb', failingOperation, customOptions).catch(() => {});
      
      // Verify circuit breaker exists and has failures
      let status = manager.getAllCircuitBreakerStatus();
      expect(status).toHaveProperty('failing-cb');
      expect(status['failing-cb'].failures).toBeGreaterThan(0);
      
      // Reset the circuit breaker
      const resetResult = manager.resetCircuitBreaker('failing-cb');
      expect(resetResult).toBe(true);
      
      // Verify circuit breaker is removed
      status = manager.getAllCircuitBreakerStatus();
      expect(status).not.toHaveProperty('failing-cb');
    });
  });

  describe('Circuit Breaker Creation and Management', () => {
    it('should create new circuit breaker with default options', () => {
      const operation = async () => 'test-result';
      
      // Execute operation to trigger circuit breaker creation
      manager.executeResilient('new-cb-default', operation);
      
      const status = manager.getAllCircuitBreakerStatus();
      expect(status).toHaveProperty('new-cb-default');
      expect(status['new-cb-default'].state).toBe('CLOSED');
      expect(status['new-cb-default'].failures).toBe(0);
    });

    it('should create new circuit breaker with custom options', () => {
      const operation = async () => 'test-result';      const customOptions = {
        failureThreshold: 3,
        resetTimeoutMs: 30000,
        monitoringWindowMs: 60000,
        minimumCalls: 5
      };
      
      // Execute operation with custom circuit breaker options
      manager.executeResilient('new-cb-custom', operation, {
        circuitBreaker: customOptions
      });
      
      const status = manager.getAllCircuitBreakerStatus();
      expect(status).toHaveProperty('new-cb-custom');
      expect(status['new-cb-custom'].state).toBe('CLOSED');
    });

    it('should reuse existing circuit breaker', () => {
      const operation1 = async () => 'result1';
      const operation2 = async () => 'result2';
      
      // Execute first operation
      manager.executeResilient('reuse-cb', operation1);
      
      const statusAfterFirst = manager.getAllCircuitBreakerStatus();
      expect(statusAfterFirst).toHaveProperty('reuse-cb');
      
      // Execute second operation with same name
      manager.executeResilient('reuse-cb', operation2);
      
      const statusAfterSecond = manager.getAllCircuitBreakerStatus();
      expect(statusAfterSecond).toHaveProperty('reuse-cb');
      
      // Should still be the same circuit breaker (only one entry)
      expect(Object.keys(statusAfterSecond)).toHaveLength(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle circuit breaker status access for multiple breakers', () => {
      // Create multiple circuit breakers with different states
      const operations = [
        { name: 'cb-1', fn: async () => 'success-1' },
        { name: 'cb-2', fn: async () => 'success-2' },
        { name: 'cb-3', fn: async () => 'success-3' },
        { name: 'cb-4', fn: async () => 'success-4' },
        { name: 'cb-5', fn: async () => 'success-5' }
      ];
      
      // Execute all operations
      operations.forEach(op => {
        manager.executeResilient(op.name, op.fn);
      });
      
      const allStatus = manager.getAllCircuitBreakerStatus();
      
      // Should have all 5 circuit breakers
      expect(Object.keys(allStatus)).toHaveLength(5);
      
      operations.forEach(op => {
        expect(allStatus).toHaveProperty(op.name);
        expect(allStatus[op.name]).toHaveProperty('state', 'CLOSED');
        expect(allStatus[op.name]).toHaveProperty('failures', 0);
      });
    });

    it('should handle reset of circuit breakers with special characters in names', () => {
      const specialNames = [
        'cb-with-dashes',
        'cb_with_underscores',
        'cb.with.dots',
        'cb with spaces',
        'cb/with/slashes'
      ];
      
      // Create circuit breakers with special names
      specialNames.forEach(name => {
        const operation = async () => `result-${name}`;
        manager.executeResilient(name, operation);
      });
      
      // Verify all were created
      let status = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(status)).toHaveLength(5);
      
      // Reset each one
      specialNames.forEach(name => {
        const resetResult = manager.resetCircuitBreaker(name);
        expect(resetResult).toBe(true);
      });
      
      // Verify all were reset
      status = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(status)).toHaveLength(0);
    });

    it('should handle concurrent circuit breaker operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => ({
        name: `concurrent-cb-${i}`,
        operation: async () => `result-${i}`
      }));
      
      // Execute all operations concurrently
      const promises = concurrentOperations.map(({ name, operation }) =>
        manager.executeResilient(name, operation)
      );
      
      await Promise.all(promises);
      
      const status = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(status)).toHaveLength(10);
      
      // Reset all concurrently
      const resetPromises = concurrentOperations.map(({ name }) =>
        Promise.resolve(manager.resetCircuitBreaker(name))
      );
      
      const resetResults = await Promise.all(resetPromises);
      
      // All resets should succeed
      resetResults.forEach(result => {
        expect(result).toBe(true);
      });
      
      // All circuit breakers should be removed
      const finalStatus = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(finalStatus)).toHaveLength(0);
    });
  });

  describe('Internal Circuit Breaker Management', () => {
    it('should properly track circuit breaker lifecycle', () => {
      const operation = async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'completed';
      };
      
      // Execute operation to create circuit breaker
      const promise = manager.executeResilient('lifecycle-cb', operation);
        // Check initial state
      let status = manager.getAllCircuitBreakerStatus();
      expect(status).toHaveProperty('lifecycle-cb');
      expect(status['lifecycle-cb'].state).toBe('CLOSED');
      expect(status['lifecycle-cb'].failures).toBe(0);
      
      return promise.then(result => {
        expect(result).toBe('completed');
          // Check state after successful execution
        status = manager.getAllCircuitBreakerStatus();
        expect(status['lifecycle-cb'].state).toBe('CLOSED');
        expect(status['lifecycle-cb'].failures).toBe(0);
      });
    });    it('should handle circuit breaker state transitions', async () => {
      // Create an operation that always fails to ensure circuit breaker records failures
      const alwaysFailingOperation = async () => {
        throw new Error('Always fails');
      };
      
      // Execute operation with reduced retry attempts to speed up test
      const customOptions = { retry: { maxAttempts: 2, baseDelay: 100 } };
      
      try {
        await manager.executeResilient('state-transition-cb', alwaysFailingOperation, customOptions);
      } catch (error) {
        // Failure expected after all retries
        expect(error.message).toBe('Always fails');
      }
      
      // Check state after first failure
      let status = manager.getAllCircuitBreakerStatus();
      expect(status['state-transition-cb'].failures).toBeGreaterThan(0);
      expect(status['state-transition-cb'].state).toBe('CLOSED');
      
      try {
        await manager.executeResilient('state-transition-cb', alwaysFailingOperation, customOptions);
      } catch (error) {
        // Second failure expected
        expect(error.message).toBe('Always fails');
      }
      
      // Check state after second failure
      status = manager.getAllCircuitBreakerStatus();
      expect(status['state-transition-cb'].failures).toBeGreaterThan(1);      // Check final state
      status = manager.getAllCircuitBreakerStatus();
      expect(status['state-transition-cb'].state).toBe('CLOSED'); // May still be closed depending on threshold
    }, 10000); // Increase timeout to 10 seconds
  });

  describe('Memory and Performance', () => {
    it('should handle large numbers of circuit breakers', () => {
      const numCircuitBreakers = 100;
      
      // Create many circuit breakers
      for (let i = 0; i < numCircuitBreakers; i++) {
        const operation = async () => `result-${i}`;
        manager.executeResilient(`mass-cb-${i}`, operation);
      }
      
      const status = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(status)).toHaveLength(numCircuitBreakers);
      
      // Reset all circuit breakers
      for (let i = 0; i < numCircuitBreakers; i++) {
        const resetResult = manager.resetCircuitBreaker(`mass-cb-${i}`);
        expect(resetResult).toBe(true);
      }
      
      const finalStatus = manager.getAllCircuitBreakerStatus();
      expect(Object.keys(finalStatus)).toHaveLength(0);
    });

    it('should handle rapid circuit breaker creation and deletion', () => {
      // Rapidly create and delete circuit breakers
      for (let cycle = 0; cycle < 10; cycle++) {
        // Create multiple circuit breakers
        for (let i = 0; i < 5; i++) {
          const operation = async () => `cycle-${cycle}-result-${i}`;
          manager.executeResilient(`rapid-cb-${cycle}-${i}`, operation);
        }
        
        // Verify they were created
        let status = manager.getAllCircuitBreakerStatus();
        expect(Object.keys(status)).toHaveLength(5);
        
        // Reset all
        for (let i = 0; i < 5; i++) {
          manager.resetCircuitBreaker(`rapid-cb-${cycle}-${i}`);
        }
        
        // Verify they were removed
        status = manager.getAllCircuitBreakerStatus();
        expect(Object.keys(status)).toHaveLength(0);
      }
    });
  });
});
