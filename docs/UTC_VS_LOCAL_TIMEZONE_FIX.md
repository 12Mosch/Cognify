# UTC vs Local Timezone Fix

## Problem Statement

The original `getStartOfToday()` and `getEndOfToday()` functions returned UTC midnight timestamps but had misleading names that suggested local timezone boundaries. This created a critical timezone handling issue where:

1. **Data Bucketing Issues**: Users in non-UTC timezones would have their data bucketed incorrectly
2. **Misleading Function Names**: Functions named "today" actually returned UTC boundaries
3. **Inconsistent Behavior**: Some functions used UTC, others used local timezone

## Example of the Problem

```typescript
// ❌ PROBLEMATIC: For a user in PST (UTC-8)
const startOfDay = getStartOfToday(); // Returns 2024-01-15 00:00:00 UTC
// User in PST sees this as 2024-01-14 16:00:00 PST - wrong day!

// User's sessions from 2024-01-15 would be bucketed as 2024-01-14
```

## Solution Implemented

### 1. Renamed Functions with Clear Intent

**UTC Functions** (for server-side operations):
- `getStartOfToday()` → `getStartOfTodayUTC()` (deprecated original)
- `getEndOfToday()` → `getEndOfTodayUTC()` (deprecated original)

**Local Timezone Functions** (for user-facing operations):
- Added `getStartOfTodayLocal(timeZone?: string)`
- Added `getEndOfTodayLocal(timeZone?: string)`

### 2. Fixed isToday/isTomorrow Functions

**Before** (UTC-based):
```typescript
return date.getUTCDate() === today.getUTCDate() &&
       date.getUTCMonth() === today.getUTCMonth() &&
       date.getUTCFullYear() === today.getUTCFullYear();
```

**After** (Local timezone-based):
```typescript
return date.getDate() === today.getDate() &&
       date.getMonth() === today.getMonth() &&
       date.getFullYear() === today.getFullYear();
```

### 3. Backward Compatibility

- Original functions are deprecated but still work
- Clear deprecation warnings guide developers to correct functions
- Tests updated to reflect new behavior

## Impact Analysis

### Functions Actually Used in Codebase

✅ **No Breaking Changes**: The `isToday()` and `isTomorrow()` functions from `dateUtils.ts` are **NOT** used in the actual application code. The `UpcomingReviewsWidget.tsx` component has its own local implementation that already correctly uses local timezone.

### Functions Only Used in Tests

The deprecated `getStartOfToday()` and `getEndOfToday()` functions are only used in test files, so the impact is minimal.

## Migration Guide

### For New Code

```typescript
// ✅ CORRECT: Use explicit UTC or Local functions
const utcStart = getStartOfTodayUTC();     // For server operations
const localStart = getStartOfTodayLocal(); // For user data bucketing

// ✅ CORRECT: isToday/isTomorrow now use local timezone
if (isToday(timestamp)) {
  // This correctly checks user's local "today"
}
```

### For Existing Code

```typescript
// ❌ DEPRECATED
const start = getStartOfToday();
const end = getEndOfToday();

// ✅ REPLACE WITH
const start = getStartOfTodayUTC();    // If you need UTC
const start = getStartOfTodayLocal();  // If you need user's local timezone
```

## Testing

- All existing tests pass
- New tests added for local timezone functions
- Tests use local Date constructor to avoid timezone dependencies
- Comprehensive coverage of edge cases

## Documentation Updates

1. **TIMEZONE_HANDLING.md**: Added section on UTC vs Local distinction
2. **DATE_UTILITIES.md**: New comprehensive documentation file
3. **Function comments**: Updated with clear timezone intent

## Benefits

1. **Clear Intent**: Function names now clearly indicate UTC vs Local
2. **Correct Behavior**: Date comparisons now work correctly for all timezones
3. **Future-Proof**: Developers can choose appropriate function for their use case
4. **Backward Compatible**: Existing code continues to work with deprecation warnings
5. **Well Documented**: Comprehensive documentation prevents future confusion

## Best Practices Established

1. Always specify timezone intent in function names
2. Use UTC functions for server-side operations
3. Use Local functions for user-facing date operations
4. Test date logic across multiple timezones
5. Document timezone behavior clearly

## Files Modified

- `src/lib/dateUtils.ts`: Core function implementations
- `src/lib/__tests__/dateUtils.test.ts`: Updated tests
- `docs/TIMEZONE_HANDLING.md`: Updated documentation
- `docs/DATE_UTILITIES.md`: New comprehensive documentation
- `docs/UTC_VS_LOCAL_TIMEZONE_FIX.md`: This summary document
