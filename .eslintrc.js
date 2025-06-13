import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
    {
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                ...js.configs.recommended.languageOptions.globals,
                node: true,
            },
        },
        plugins: {
            '@typescript-eslint': typescript,
        },
        rules: {
            ...js.configs.recommended.rules,

            // TypeScript specific rules
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/ban-ts-comment': 'warn',

            // General rules
            'no-console': 'warn',
            'no-debugger': 'error',
            'prefer-const': 'error',
            'no-var': 'error',

            // Import/export rules
            'no-duplicate-imports': 'error',
        },
    },
    {
        ignores: [
            'dist/',
            'build/',
            'node_modules/',
            '*.js',
            '.next/',
            'coverage/',
        ],
    },
];
