# Error Tracking Fixes

## Problem Description

The flashcard app was experiencing "event storms" where error tracking events were being fired repeatedly on every render cycle. This was happening because error tracking code was being executed directly in the render function instead of being properly isolated in side effects.

## Root Cause

The issue was in three components where `trackConvexQuery` was being called directly in the render function when error states were detected:

1. **SpacedRepetitionMode.tsx** (lines 434-437 and 462-466)
2. **DeckView.tsx** (lines 35-42 and 44-51) 
3. **Dashboard.tsx** (lines 72-78)

### Example of the Problem

```typescript
// ❌ WRONG: Error tracking in render function
if (deck === null) {
  const deckError = new Error('Deck not found or access denied');
  trackConvexQuery('getDeckById', deckError, { deckId });
}
```

This code would execute on every render when `deck === null`, causing the same error to be tracked multiple times.

## Solution

Moved all error tracking logic into `useEffect` hooks with proper dependency management and state tracking to prevent duplicate events.

### Key Changes

1. **Added error tracking state** to prevent duplicate events:
   ```typescript
   const [errorTracked, setErrorTracked] = useState<{deck?: boolean, studyQueue?: boolean}>({});
   ```

2. **Moved error tracking to useEffect hooks**:
   ```typescript
   // ✅ CORRECT: Error tracking in side effect
   useEffect(() => {
     if (deck === null && !errorTracked.deck) {
       const deckError = new Error('Deck not found or access denied');
       trackConvexQuery('getDeckById', deckError, { deckId });
       setErrorTracked(prev => ({ ...prev, deck: true }));
     }
   }, [deck, errorTracked.deck, trackConvexQuery, deckId]);
   ```

3. **Added error state reset** when dependencies change:
   ```typescript
   useEffect(() => {
     setErrorTracked({});
   }, [deckId]); // Reset when deck changes
   ```

## Files Modified

### SpacedRepetitionMode.tsx
- Added `errorTracked` state for deck and study queue errors
- Moved inline error tracking to two separate useEffect hooks
- Added error state reset when deckId changes

### DeckView.tsx
- Added `errorTracked` state for deck and cards errors
- Moved inline error tracking to two separate useEffect hooks
- Added error state reset when deckId changes
- Added missing `useEffect` import

### Dashboard.tsx
- Added `errorTracked` state for decks errors
- Moved inline error tracking to useEffect hook
- Added missing `useEffect` import

## Benefits

1. **Prevents event storms**: Error tracking now only happens once per error condition
2. **Better performance**: Eliminates unnecessary repeated function calls
3. **Cleaner analytics data**: No duplicate error events cluttering the analytics
4. **Follows React best practices**: Side effects are properly isolated from render logic

## Testing

- All existing tests continue to pass (225/225)
- No breaking changes to component functionality
- Error tracking still works correctly but without duplication

## Pattern for Future Development

When adding error tracking to components:

1. ✅ **DO**: Use useEffect hooks for error tracking
2. ✅ **DO**: Track error state to prevent duplicates
3. ✅ **DO**: Reset error state when relevant dependencies change
4. ❌ **DON'T**: Call tracking functions directly in render logic
5. ❌ **DON'T**: Track the same error multiple times

This fix ensures that error tracking provides valuable insights without overwhelming the analytics system with duplicate events.

---

## Error Categorization Fix

### Problem Description

The `withAsyncErrorMonitoring` function in `src/lib/errorMonitoring.ts` was incorrectly categorizing ALL async operation failures as `performance_error`, regardless of the actual error type. This led to misleading analytics data where network errors, authentication errors, validation errors, and other error types were all being tagged as performance issues.

### Root Cause

In the `withAsyncErrorMonitoring` function, the error categorization was hardcoded:

```typescript
// ❌ WRONG: All errors categorized as performance_error
captureError(context.posthog, error as Error, {
  // ...other context
  category: 'performance_error', // This was always performance_error!
  // ...
});
```

This meant that:
- Network failures were tagged as performance errors
- Authentication failures were tagged as performance errors
- Validation errors were tagged as performance errors
- Integration errors (Convex, Clerk) were tagged as performance errors

### Solution

Updated the error categorization logic to:

1. **Use explicit category override** when provided
2. **Auto-categorize using `categorizeError` helper** for proper error classification
3. **Only use performance_error for actual timeout scenarios**

```typescript
// ✅ CORRECT: Proper error categorization
let category: ErrorCategory;
if (context.errorCategory) {
  // Use explicit override if provided
  category = context.errorCategory;
} else if (context.timeoutMs && errorObj.message.includes('timed out')) {
  // Only categorize as performance_error if it's actually a timeout
  category = 'performance_error';
} else {
  // Use the categorizeError helper to properly categorize the error
  category = categorizeError(errorObj);
}
```

### Changes Made

#### 1. Updated `withAsyncErrorMonitoring` function
- Added optional `errorCategory` parameter to context for explicit overrides
- Implemented proper error categorization logic using `categorizeError` helper
- Only categorizes as `performance_error` for actual timeout scenarios

#### 2. Updated `withRetryAndErrorMonitoring` function
- Added `errorCategory` parameter to pass through category configuration

#### 3. Added comprehensive tests
- Created `src/lib/__tests__/errorMonitoring.test.ts` with 8 test cases
- Tests verify proper categorization for different error types
- Tests ensure explicit category overrides work correctly
- Tests confirm that not all errors are categorized as performance errors

### Error Categories

The system now properly categorizes errors into:

- **`network_error`**: Network timeouts, fetch failures, connection issues
- **`authentication_error`**: Auth failures, token expiration, unauthorized access
- **`permission_error`**: Access denied, forbidden operations
- **`validation_error`**: Invalid input, required field errors
- **`performance_error`**: Actual slow operations and timeouts
- **`ui_error`**: React component errors, render failures
- **`integration_error`**: Convex, Clerk, and other service failures
- **`unknown_error`**: Unclassified errors

### Benefits

1. **Accurate analytics**: Error categories now reflect actual error types
2. **Better debugging**: Developers can filter and analyze errors by actual cause
3. **Improved monitoring**: Performance issues are distinguished from other error types
4. **Configurable categorization**: Explicit category overrides when needed
5. **Backward compatibility**: Existing code continues to work without changes

### Usage Examples

```typescript
// Automatic categorization (recommended)
await withAsyncErrorMonitoring(operation, {
  operationType: 'fetchUserData',
  posthog: posthog,
});

// Explicit category override when needed
await withAsyncErrorMonitoring(operation, {
  operationType: 'customOperation',
  posthog: posthog,
  errorCategory: 'validation_error', // Override automatic categorization
});
```

This fix ensures that error analytics provide accurate insights into the actual types of failures occurring in the application.
