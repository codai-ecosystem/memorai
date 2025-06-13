import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.d.ts',
                'vitest.config.ts',
            ],
            thresholds: {
                global: {
                    branches: 90,
                    functions: 95,
                    lines: 95,
                    statements: 95,
                },
            },
        },
        testTimeout: 10000,
        hookTimeout: 10000,
    },
    esbuild: {
        target: 'node18',
    },
});
