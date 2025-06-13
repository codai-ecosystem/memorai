import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        exclude: [
            'tests/e2e/**',
            '**/node_modules/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'src/test/**',
                'tests/e2e/**',
                '**/*.d.ts',
                '**/*.config.*',
                'dist/**'
            ], thresholds: {
                global: {
                    branches: 90,
                    functions: 90,
                    lines: 90,
                    statements: 90
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@/components': resolve(__dirname, './src/components'),
            '@/lib': resolve(__dirname, './src/lib'),
            '@/hooks': resolve(__dirname, './src/hooks'),
            '@/types': resolve(__dirname, './src/types'),
            '@/utils': resolve(__dirname, './src/utils'),
            '@/stores': resolve(__dirname, './src/stores'),
            '@/app': resolve(__dirname, './src/app')
        }
    }
})
