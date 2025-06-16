# Error Tracking Event Storm Fix

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
