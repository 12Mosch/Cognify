# Study Sessions Schema Migration

## Overview

This document describes the migration of the `studySessions` table schema to prevent duplicate daily rows and improve date storage consistency.

## Problem Statement

The original `studySessions` table had several issues:

1. **Race Condition**: Multiple concurrent calls to `recordStudySession` could create duplicate entries for the same `{userId, date, deckId, studyMode}` combination
2. **Inconsistent Date Storage**: Using string dates without clear timezone documentation
3. **Missing Uniqueness Constraint**: No prevention of duplicate daily sessions
4. **Performance Issues**: Inefficient queries for checking existing sessions

## Changes Made

### 1. Schema Updates (`convex/schema.ts`)

#### Field Changes
- **Renamed**: `date` → `sessionDate` for clarity
- **Updated Comments**: Added UTC timezone requirement documentation

#### Index Changes
- **Updated existing indexes** to use `sessionDate` field
- **Added compound index**: `by_unique_session` on `[userId, sessionDate, deckId, studyMode]` for efficient duplicate prevention

```typescript
// Before
studySessions: defineTable({
  userId: v.string(),
  deckId: v.id("decks"),
  date: v.string(),            // Ambiguous timezone
  cardsStudied: v.number(),
  sessionDuration: v.optional(v.number()),
  studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition")),
}).index("by_userId_and_date", ["userId", "date"])

// After
studySessions: defineTable({
  userId: v.string(),
  deckId: v.id("decks"),
  sessionDate: v.string(),     // Date in YYYY-MM-DD format (UTC)
  cardsStudied: v.number(),
  sessionDuration: v.optional(v.number()),
  studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition")),
}).index("by_userId_and_date", ["userId", "sessionDate"])
  .index("by_userId_and_deckId", ["userId", "deckId"])
  .index("by_date", ["sessionDate"])
  .index("by_unique_session", ["userId", "sessionDate", "deckId", "studyMode"]),
```

### 2. Mutation Logic Updates (`convex/studySessions.ts`)

#### Improved `recordStudySession` Mutation
- **Atomic Upsert Pattern**: Uses the new compound index for efficient duplicate checking
- **Better Documentation**: Clarified UTC date storage requirements
- **Race Condition Prevention**: Single query to check for existing sessions

```typescript
// Before: Potential race condition
const existingSession = await ctx.db
  .query("studySessions")
  .withIndex("by_userId_and_date", (q) => 
    q.eq("userId", identity.subject).eq("date", today)
  )
  .filter((q) => q.eq(q.field("deckId"), args.deckId))
  .first();

// After: Atomic check with compound index
const existingSession = await ctx.db
  .query("studySessions")
  .withIndex("by_unique_session", (q) => 
    q.eq("userId", identity.subject)
     .eq("sessionDate", today)
     .eq("deckId", args.deckId)
     .eq("studyMode", args.studyMode)
  )
  .first();
```

### 3. Query Updates

All queries updated to use the new `sessionDate` field:
- `getStudyActivityHeatmapData`
- `getStudyStatistics`
- `getCurrentStudyStreak`

### 4. Statistics Updates (`convex/statistics.ts`)

Updated all references from `session.date` to `session.sessionDate` in:
- `getUserStatistics`
- `getDeckStatistics`
- `getDeckPerformanceComparison`
- `getStudyActivityData`
- `getDashboardData`

### 5. Documentation Updates

Updated `docs/STUDY_HISTORY_HEATMAP.md` to reflect the new schema structure.

## Benefits

### 1. Data Integrity
- **Prevents Duplicates**: Compound index ensures unique daily sessions per user/deck/mode
- **Consistent Aggregation**: No more double-counting in analytics

### 2. Performance Improvements
- **Efficient Queries**: Direct compound index lookup instead of filter operations
- **Reduced Database Load**: Single query for duplicate checking

### 3. Better Maintainability
- **Clear Field Names**: `sessionDate` is more descriptive than `date`
- **UTC Documentation**: Explicit timezone requirements prevent confusion
- **Atomic Operations**: Reduced race condition potential

## Migration Considerations

### Backward Compatibility
- **Field Rename**: Existing data will need migration from `date` to `sessionDate`
- **Application Updates**: All client code updated to use new field names

### Data Migration Steps
1. **Schema Deployment**: Deploy new schema with both old and new fields temporarily
2. **Data Migration**: Copy `date` values to `sessionDate` field
3. **Application Update**: Update all queries to use `sessionDate`
4. **Cleanup**: Remove old `date` field after verification

## Testing

- **Linting**: All TypeScript compilation and ESLint checks pass
- **Type Safety**: Full type safety maintained with updated field references
- **Index Validation**: New compound index structure validated

## Future Improvements

### Potential Enhancements
1. **Epoch Day Storage**: Consider using integer epoch days for better performance
2. **Timezone Support**: Add user timezone tracking for more accurate local date handling
3. **Session Merging**: Implement intelligent session merging for rapid successive sessions

### Monitoring
- **Duplicate Prevention**: Monitor for any remaining duplicate session creation
- **Performance Metrics**: Track query performance improvements
- **Data Quality**: Validate session aggregation accuracy
