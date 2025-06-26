// Test setup file for Vitest
import { vi } from 'vitest';

// Mock environment variables
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    QDRANT_URL: 'http://localhost:6333',
    OPENAI_API_KEY: 'test-key',
  },
}));

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
});
