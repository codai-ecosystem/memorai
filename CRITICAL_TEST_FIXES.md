# Critical Test Fixes Required

## Current Status

- Tests passing: 1015/1200 (84.6%)
- Tests failing: 185/1200 (15.4%)

## Main Issue Categories

### 1. React Component Tests (Dashboard) - ~150 failing tests

- **Root cause**: React 19 compatibility issues
- **Solution**: All React component tests failing due to React version conflicts
- **Files affected**: `apps/dashboard/tests/unit/components/*.test.tsx`

### 2. Vector Store Tests - ~4 failing tests

- **Root cause**: Mock expectations don't match actual implementation
- **Solution**: Update test expectations for UUID conversion and simplified payload
- **Files affected**: `packages/core/tests/vector/VectorStore.test.ts`

### 3. Package Version Tests - ~1 failing test

- **Root cause**: Version mismatch expectation
- **Solution**: ✅ FIXED - Updated expected version from 2.0.0 to 2.0.4

### 4. MemoryQuery Type Issues - Multiple files

- **Root cause**: Missing required fields `include_context` and `time_decay`
- **Solution**: Add missing fields to all MemoryQuery objects

## Priority Fix Order

1. **DONE**: Package version test
2. **NEXT**: React component test environment setup
3. **NEXT**: Vector store test expectations
4. **NEXT**: MemoryQuery type completions

## React Component Testing Strategy

The React component tests are all failing due to React 19 compatibility. Since we have 150+ failing tests all in the same category, the most efficient approach is to:

1. Fix the testing environment for React 19 compatibility
2. Update testing library setup for newer React versions
3. Ensure proper JSX rendering in test environment

This will likely fix ~150 tests at once, bringing our pass rate from 84.6% to ~97.5%.
