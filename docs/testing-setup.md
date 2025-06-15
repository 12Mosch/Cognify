# Testing Setup Documentation

## Overview

This document describes the modern Jest + React Testing Library setup for the flashcard application. The configuration follows 2024/2025 best practices for testing React applications with TypeScript.

## Testing Stack

- **Jest 30.x** - Test runner and assertion library
- **React Testing Library 16.x** - React component testing utilities
- **Jest DOM** - Custom Jest matchers for DOM testing
- **TypeScript** - Full TypeScript support in tests
- **ESLint Testing Plugins** - Code quality rules for tests

## Configuration Files

### `jest.config.cjs`

The main Jest configuration file with modern ES modules support:

- **TypeScript Support**: Uses `ts-jest` with proper ES module handling
- **React Environment**: Configured with `jsdom` for DOM testing
- **Module Resolution**: Supports path aliases (`@/`) and asset mocking
- **Coverage**: Comprehensive coverage reporting with thresholds
- **Transform Patterns**: Handles both TypeScript and modern JavaScript

### `src/setupTests.ts`

Global test setup file that runs before all tests:

- **Jest DOM Matchers**: Imports `@testing-library/jest-dom`
- **Global Mocks**: IntersectionObserver, ResizeObserver, matchMedia
- **Browser APIs**: localStorage, sessionStorage, URL APIs
- **Console Filtering**: Suppresses known React warnings in tests

### `src/test-utils.tsx`

Custom testing utilities for consistent test setup:

- **Custom Render**: Pre-configured with Convex and Clerk providers
- **Mock Factories**: Helper functions to create mock data
- **Hook Mocking**: Utilities for mocking Convex hooks
- **Test Helpers**: Common patterns for async testing

## Available Scripts

```bash
# Run all tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode (no watch, with coverage)
npm run test:ci
```

## Writing Tests

### Basic Component Test

```typescript
import { render, screen } from '@/test-utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
});
```

### Testing with Convex

```typescript
import { render, screen, mockUseQuery } from '@/test-utils';
import { useQuery } from 'convex/react';
import DeckList from '../DeckList';

// Mock the Convex hook
jest.mock('convex/react');

describe('DeckList', () => {
  it('displays decks from Convex', () => {
    mockUseQuery([
      { _id: 'deck1', name: 'Test Deck', cardCount: 5 }
    ]);

    render(<DeckList />);
    expect(screen.getByText('Test Deck')).toBeInTheDocument();
  });
});
```

### Async Testing

```typescript
import { render, screen, waitFor, fireEvent } from '@/test-utils';

describe('AsyncComponent', () => {
  it('handles async operations', async () => {
    render(<AsyncComponent />);
    
    fireEvent.click(screen.getByRole('button', { name: /load data/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

## ESLint Testing Rules

The setup includes comprehensive ESLint rules for testing:

### Jest Rules
- `jest/expect-expect` - Ensures tests have assertions
- `jest/no-disabled-tests` - Warns about skipped tests
- `jest/no-focused-tests` - Prevents committed focused tests
- `jest/prefer-to-have-length` - Suggests better length assertions

### Testing Library Rules
- `testing-library/await-async-queries` - Enforces awaiting async queries
- `testing-library/no-await-sync-queries` - Prevents awaiting sync queries
- `testing-library/no-debugging-utils` - Warns about debug utilities in commits
- `testing-library/no-dom-import` - Prevents direct DOM imports

## Coverage Configuration

Coverage is configured with reasonable thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

Coverage reports are generated in multiple formats:
- **Text**: Console output
- **LCOV**: For CI/CD integration
- **HTML**: Detailed browser report
- **JSON**: Machine-readable format

## Mock Patterns

### Global Mocks (in setupTests.ts)

```typescript
// Already configured globally
- IntersectionObserver
- ResizeObserver
- matchMedia
- localStorage/sessionStorage
- URL APIs
```

### Component-Specific Mocks

```typescript
// Mock external libraries
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));
```

## Best Practices

### 1. Use Custom Render
Always use the custom render from `test-utils.tsx` to ensure proper provider setup.

### 2. Test User Interactions
Focus on testing what users can see and do, not implementation details.

### 3. Avoid Multiple Assertions in waitFor
Split complex async tests into multiple assertions outside of `waitFor`.

### 4. Use Semantic Queries
Prefer `getByRole`, `getByLabelText` over `getByTestId` when possible.

### 5. Mock External Dependencies
Mock API calls, external libraries, and complex dependencies.

## Troubleshooting

### Common Issues

1. **ES Module Errors**: Ensure `transformIgnorePatterns` includes problematic packages
2. **TypeScript Errors**: Check `tsconfig.app.json` includes test files
3. **Mock Issues**: Verify mocks are properly hoisted with `jest.mock()`
4. **Async Test Failures**: Use `waitFor` for async operations, avoid `act()` directly

### Debug Tips

```typescript
// Debug rendered output
import { screen } from '@/test-utils';
screen.debug(); // Prints current DOM

// Debug specific element
screen.debug(screen.getByRole('button'));
```

## Integration with CI/CD

The test setup is optimized for CI environments:

- Uses `npm run test:ci` for non-interactive testing
- Generates coverage reports in CI-friendly formats
- Configured timeouts prevent hanging tests
- Clear error messages for debugging failures

## Vite Environment Compatibility

### Handling import.meta.env in Tests

The analytics module uses Vite-specific `import.meta.env` for environment detection, which Jest doesn't understand by default. This is handled through a utility function that:

- Detects test environment via `process.env.NODE_ENV`
- Uses `eval()` to safely access `import.meta.env` in Vite environments
- Falls back to `process.env` in Node.js/Jest environments
- Prevents syntax errors during Jest parsing

**Implementation in `src/lib/analytics.ts`:**
```typescript
function getEnvironmentMode(): string {
  // In test environment, return 'test'
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return 'test';
  }

  // Try to access Vite's import.meta.env
  try {
    const importMeta = eval('import.meta');
    return importMeta?.env?.MODE || 'production';
  } catch {
    return process.env.NODE_ENV || 'production';
  }
}
```

This approach ensures compatibility between Vite's development environment and Jest's testing environment without requiring complex build transformations.

## Recent Fixes

### Analytics Test Fix (2025-01-15)

Fixed and enhanced the `src/lib/__tests__/analytics.test.ts` test suite:

**Problems Fixed**:
1. Jest couldn't parse `import.meta.env.MODE` syntax used in the analytics module for development logging
2. Console output noise during tests from expected error handling scenarios
3. Missing test coverage for helper functions and useAnalytics hook

**Solutions Implemented**:
1. Implemented a `getEnvironmentMode()` utility function that safely handles environment detection across different runtime environments
2. Added console mocking in beforeEach/afterEach to suppress expected console output during tests
3. Added comprehensive tests for all helper functions (trackUserSignUp, trackDeckCreated, etc.)
4. Added tests for the useAnalytics hook with proper PostHog mocking
5. Improved test organization and structure with better descriptions

**Result**: All 17 analytics tests now pass successfully with clean output, maintaining full test coverage for PostHog integration, error handling, and all utility functions.

## Future Improvements

- Consider adding visual regression testing
- Implement E2E testing with Playwright
- Add performance testing for critical components
- Integrate with code quality tools like SonarQube
