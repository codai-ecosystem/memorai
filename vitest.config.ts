import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.{js,ts,tsx}', '**/__tests__/**/*.{js,ts,tsx}'],
    exclude: [
      '**/e2e/**',
      '**/*.spec.{js,ts}',
      '**/node_modules/**',
      '**/apps/dashboard/tests/unit/components/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/.next/',
        '**/*.spec.ts', // Exclude Playwright test files
        '**/*.spec.js',
        '**/e2e/**', // Exclude E2E test directories
      ],
    },
  },
  resolve: {
    alias: {
      '@codai/memorai-core': path.resolve(__dirname, './packages/core/src'),
      '@codai/memorai-sdk': path.resolve(__dirname, './packages/sdk/src'),
      '@codai/memorai-server': path.resolve(__dirname, './packages/server/src'),
    },
  },
});
