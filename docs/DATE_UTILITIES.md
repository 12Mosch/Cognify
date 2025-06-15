# Date Utilities Documentation

This document provides comprehensive documentation for the date utility functions in `src/lib/dateUtils.ts`, with special attention to timezone handling and the UTC vs Local timezone distinction.

## Overview

The date utilities provide functions for:
- Timezone detection and local date formatting
- UTC vs local timezone date boundaries
- Time formatting and calculations
- Date comparisons and validations

## Core Functions

### Timezone Detection

#### `getUserTimeZone(): string`
Returns the user's IANA timezone identifier from the browser.

```typescript
const userTz = getUserTimeZone(); // e.g., "America/New_York"
```

#### `getLocalDateString(timeZone?: string): string`
Returns the current date in YYYY-MM-DD format for the specified timezone.

```typescript
const localDate = getLocalDateString('Europe/London'); // "2024-01-15"
const userLocalDate = getLocalDateString(); // Uses user's timezone
```

## Date Boundary Functions

### ⚠️ Critical Distinction: UTC vs Local

The app provides separate functions for UTC and local timezone boundaries to prevent data bucketing issues.

### UTC Functions

Use these for server-side operations or when you specifically need UTC boundaries:

#### `getStartOfTodayUTC(): number`
Returns UTC midnight timestamp for the current day.

```typescript
const utcMidnight = getStartOfTodayUTC();
// Returns: 2024-01-15T00:00:00.000Z timestamp
```

#### `getEndOfTodayUTC(): number`
Returns UTC end-of-day timestamp (23:59:59.999) for the current day.

```typescript
const utcEndOfDay = getEndOfTodayUTC();
// Returns: 2024-01-15T23:59:59.999Z timestamp
```

### Local Timezone Functions

Use these for user-facing operations and data bucketing by user's local day:

#### `getStartOfTodayLocal(timeZone?: string): number`
Returns local timezone midnight timestamp for the current day.

```typescript
// For a user in PST (UTC-8)
const localMidnight = getStartOfTodayLocal('America/Los_Angeles');
// Returns: 2024-01-15T08:00:00.000Z timestamp (which is midnight PST)

// Using user's detected timezone
const userMidnight = getStartOfTodayLocal();
```

#### `getEndOfTodayLocal(timeZone?: string): number`
Returns local timezone end-of-day timestamp for the current day.

```typescript
const localEndOfDay = getEndOfTodayLocal('America/Los_Angeles');
// Returns: start of day + 24 hours - 1 millisecond
```

## Deprecated Functions

### `getStartOfToday()` and `getEndOfToday()` ⚠️ DEPRECATED

These functions are deprecated because they return UTC boundaries but have misleading names that suggest local boundaries.

```typescript
// ❌ DEPRECATED - Don't use these
const start = getStartOfToday(); // Actually returns UTC midnight
const end = getEndOfToday();     // Actually returns UTC end-of-day
```

**Migration Guide:**
- Replace with `getStartOfTodayUTC()` if you need UTC boundaries
- Replace with `getStartOfTodayLocal()` if you need user's local boundaries

## Common Use Cases

### Data Bucketing by User's Local Day

```typescript
// ✅ CORRECT: Group study sessions by user's local day
const startOfUserDay = getStartOfTodayLocal(userTimeZone);
const endOfUserDay = getEndOfTodayLocal(userTimeZone);

const todaysSessions = sessions.filter(session => 
  session.timestamp >= startOfUserDay && 
  session.timestamp <= endOfUserDay
);
```

### Server-Side Date Range Queries

```typescript
// ✅ CORRECT: Server operations using UTC boundaries
const utcStart = getStartOfTodayUTC();
const utcEnd = getEndOfTodayUTC();

const query = db.query("events")
  .filter(q => q.gte("timestamp", utcStart))
  .filter(q => q.lte("timestamp", utcEnd));
```

## Other Utility Functions

### Time Formatting

#### `formatNextReviewTime(timestamp: number): string`
Formats a future timestamp into user-friendly text.

```typescript
const nextReview = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now
formatNextReviewTime(nextReview); // "in 2 hours"
```

#### `formatSessionDuration(durationMs: number): string`
Formats duration in milliseconds to human-readable format.

```typescript
formatSessionDuration(125000); // "2m 5s"
formatSessionDuration(45000);  // "45s"
```

### Date Comparisons

#### `isToday(timestamp: number): boolean`
Checks if a timestamp falls on today in the user's local timezone.

#### `isTomorrow(timestamp: number): boolean`
Checks if a timestamp falls on tomorrow in the user's local timezone.

#### `daysBetween(timestamp1: number, timestamp2: number): number`
Calculates the number of days between two timestamps.

## Best Practices

1. **Always specify intent**: Use UTC functions for server operations, Local functions for user data
2. **Pass timezone explicitly**: Don't rely on implicit timezone detection in critical operations
3. **Test across timezones**: Verify your date logic works for users in different timezones
4. **Consider DST**: Be aware of daylight saving time transitions
5. **Use consistent formats**: Stick to ISO 8601 for timestamps, YYYY-MM-DD for date strings

## Testing

The date utilities include comprehensive tests covering:
- Timezone detection
- Local date formatting
- UTC vs local boundary calculations
- Edge cases and error handling

```typescript
// Example test structure
describe('getStartOfTodayLocal', () => {
  it('returns correct local midnight for specified timezone', () => {
    const localMidnight = getStartOfTodayLocal('America/New_York');
    // Verify the timestamp represents midnight in EST/EDT
  });
});
```

## Common Pitfalls

1. **Using deprecated functions**: Always use the explicit UTC or Local variants
2. **Mixing UTC and local**: Don't compare UTC boundaries with local timestamps
3. **Ignoring DST**: Remember that timezone offsets change during DST transitions
4. **Assuming server timezone**: Never assume the server and user are in the same timezone

## Migration Checklist

When updating code that uses the deprecated functions:

- [ ] Identify whether the operation needs UTC or local boundaries
- [ ] Replace `getStartOfToday()` with `getStartOfTodayUTC()` or `getStartOfTodayLocal()`
- [ ] Replace `getEndOfToday()` with `getEndOfTodayUTC()` or `getEndOfTodayLocal()`
- [ ] Add timezone parameter where appropriate
- [ ] Test with users in different timezones
- [ ] Update related documentation
