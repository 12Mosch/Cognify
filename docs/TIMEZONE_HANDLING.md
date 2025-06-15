# Timezone Handling in Flashcard App

## Overview

The flashcard app implements proper timezone handling to ensure that study sessions are recorded and grouped by the user's local date, not the server's timezone. This is critical for accurate statistics, heatmaps, and streak calculations.

## Problem Statement

Previously, the app used server-side date calculation:

```typescript
// PROBLEMATIC: Uses server timezone
const today = new Date().toISOString().split('T')[0];
```

This caused several issues:
- Sessions recorded on wrong dates for users in different timezones
- Inconsistent heatmap data across timezones
- Broken streak calculations for international users
- Confusing statistics that don't match user's calendar

## Solution Architecture

### 1. Timezone-Aware Data Storage

The `studySessions` table now stores three key pieces of information:

```typescript
studySessions: defineTable({
  // ... other fields
  sessionDate: v.string(),     // User's local date (YYYY-MM-DD)
  utcTimestamp: v.string(),    // Canonical UTC timestamp (ISO 8601)
  userTimeZone: v.string(),    // IANA timezone identifier
})
```

### 2. Client-Side Date Calculation

The frontend captures the user's timezone and calculates their local date:

```typescript
import { getUserTimeZone, getLocalDateString } from '../lib/dateUtils';

// Get user's timezone and local date
const userTimeZone = getUserTimeZone(); // e.g., "America/New_York"
const localDate = getLocalDateString(userTimeZone); // e.g., "2024-01-15"
```

### 3. Backend Storage

The backend stores all three pieces of information:

```typescript
await ctx.db.insert("studySessions", {
  // ... other fields
  sessionDate: localDate,        // For grouping and queries
  utcTimestamp: new Date().toISOString(), // For canonical reference
  userTimeZone: args.userTimeZone,        // For future timezone conversions
});
```

## Implementation Details

### Date Utility Functions

New utility functions in `src/lib/dateUtils.ts`:

```typescript
/**
 * Get the user's current timezone identifier
 */
export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the current date in the user's local timezone as YYYY-MM-DD
 */
export function getLocalDateString(timeZone?: string): string {
  const tz = timeZone || getUserTimeZone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}
```

### UTC vs Local Date Boundaries

**Important**: The app now provides separate functions for UTC and local timezone date boundaries to prevent data bucketing issues:

#### UTC Functions (for server-side operations)
```typescript
// Returns UTC midnight timestamps
export function getStartOfTodayUTC(): number;
export function getEndOfTodayUTC(): number;
```

#### Local Timezone Functions (for user-facing operations)
```typescript
// Returns local timezone midnight timestamps
export function getStartOfTodayLocal(timeZone?: string): number;
export function getEndOfTodayLocal(timeZone?: string): number;
```

#### Migration from Deprecated Functions
The old `getStartOfToday()` and `getEndOfToday()` functions are deprecated because they returned UTC midnight but had misleading names. When migrating:

- **For server operations**: Use `getStartOfTodayUTC()` / `getEndOfTodayUTC()`
- **For user data bucketing**: Use `getStartOfTodayLocal()` / `getEndOfTodayLocal()`

```typescript
// ❌ PROBLEMATIC: UTC midnight for user in PST timezone
const startOfDay = getStartOfToday(); // Returns 2024-01-15 00:00:00 UTC
// User in PST sees this as 2024-01-14 16:00:00 PST - wrong day!

// ✅ CORRECT: Local midnight for user in PST timezone
const startOfDay = getStartOfTodayLocal('America/Los_Angeles');
// Returns 2024-01-15 08:00:00 UTC (which is 2024-01-15 00:00:00 PST)
```

### Frontend Integration

Updated `PostSessionSummary.tsx` to pass timezone information:

```typescript
const userTimeZone = getUserTimeZone();
const localDate = getLocalDateString(userTimeZone);

recordStudySession({
  deckId,
  cardsStudied: cardsReviewed,
  sessionDuration,
  studyMode,
  userTimeZone,
  localDate,
});
```

### Backend Mutation

Updated `recordStudySession` mutation to accept and store timezone data:

```typescript
export const recordStudySession = mutation({
  args: {
    // ... existing args
    userTimeZone: v.string(),
    localDate: v.string(),
  },
  handler: async (ctx, args) => {
    const utcTimestamp = new Date().toISOString();
    const sessionDate = args.localDate;
    
    // Use sessionDate for grouping and duplicate detection
    // Store utcTimestamp and userTimeZone for future use
  }
});
```

## Benefits

1. **Accurate Date Grouping**: Sessions are grouped by user's calendar day
2. **Consistent Heatmaps**: Activity appears on correct dates regardless of timezone
3. **Proper Streak Calculations**: Streaks calculated based on user's local dates
4. **Future-Proof**: UTC timestamps allow for timezone conversions if needed
5. **International Support**: Works correctly for users worldwide

## Testing

Comprehensive tests cover:
- Timezone detection functionality
- Local date string formatting
- Edge cases with different timezones
- Date format validation

```typescript
describe('timezone handling', () => {
  it('returns valid IANA timezone identifier', () => {
    const timeZone = getUserTimeZone();
    expect(timeZone).toMatch(/\//); // Contains slash for IANA format
  });

  it('formats local date correctly', () => {
    const dateString = getLocalDateString('America/New_York');
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

## Migration Strategy

The implementation is backward compatible:
- New fields are optional in the schema
- Existing data continues to work
- New sessions get timezone information
- Queries work with both old and new data

## Future Enhancements

1. **Timezone Conversion**: Use stored timezone data for historical conversions
2. **User Preferences**: Allow users to set preferred timezone
3. **Multi-Timezone Support**: Handle users who travel frequently
4. **Advanced Analytics**: Timezone-aware reporting and insights

## Best Practices

1. Always capture timezone at the moment of activity
2. Store both local date and UTC timestamp
3. Use IANA timezone identifiers
4. Test across multiple timezones
5. Consider daylight saving time transitions
