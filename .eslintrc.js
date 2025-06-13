module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './packages/*/tsconfig.json', './apps/*/tsconfig.json']
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'warn', // Downgrade to warning for now
    '@typescript-eslint/no-non-null-assertion': 'warn', // Downgrade to warning for now
    '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Downgrade to warning for now
    '@typescript-eslint/prefer-optional-chain': 'error',
    'import/order': ['error', { 'newlines-between': 'always' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-undef': 'off', // Handled by TypeScript
  },
  overrides: [
    {
      files: ['apps/web-dashboard/**/*.{ts,tsx}'],
      env: {
        browser: true,
        node: false,
      },
      extends: ['next/core-web-vitals'],
      parserOptions: {
        project: './apps/web-dashboard/tsconfig.json'
      }
    }
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '*.mjs']
};