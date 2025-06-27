import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
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
        'src/test/',
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
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
