import { describe, it, expect } from 'vitest';
import MemoraiServer, { MemoryEngine } from '../index.js';

describe('Memorai MCP', () => {
  it('should export MemoraiServer as default', () => {
    expect(MemoraiServer).toBeDefined();
    expect(typeof MemoraiServer).toBe('function');
  });

  it('should export MemoryEngine', () => {
    expect(MemoryEngine).toBeDefined();
    expect(typeof MemoryEngine).toBe('function');
  });

  it('should have correct package structure', () => {
    // Test that we can import the main components
    expect(MemoraiServer).toBeTruthy();
    expect(MemoryEngine).toBeTruthy();
  });
});
