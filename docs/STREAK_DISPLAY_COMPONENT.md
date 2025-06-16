# StreakDisplay Component

## Overview

The `StreakDisplay` component shows the user's current study streak with visual indicators, milestones, and motivational messaging. It handles various streak states and provides analytics tracking for user interactions.

## Key Features

- **Current Streak Display**: Shows the user's current consecutive study days
- **Milestone Tracking**: Displays achieved milestones and progress to next milestone
- **Visual Status Indicators**: Different color schemes based on streak length
- **Analytics Integration**: Tracks user interactions with PostHog
- **Responsive Design**: Adapts to different screen sizes
- **Loading States**: Skeleton loader while data is fetching

## Null Response Handling

### Problem
The `useQuery` hook can return `null` when a user has no streak data yet (e.g., new users). Previously, destructuring the null response would cause a runtime crash.

### Solution
Added null safety using the nullish coalescing operator (`??`) to provide default values:

```typescript
// Handle null response to avoid crash - user has no streak yet
// Treat as zero-streak baseline if streakData is null
const safeStreakData = streakData ?? {
  currentStreak: 0,
  longestStreak: 0,
  totalStudyDays: 0,
  milestonesReached: [],
  lastMilestone: null
};

const { currentStreak, longestStreak, totalStudyDays, milestonesReached, lastMilestone } = safeStreakData;
```

### Benefits
- **Crash Prevention**: No more runtime errors when destructuring null responses
- **Graceful Degradation**: New users see a proper "Start Your Streak" state
- **Consistent UX**: Zero-streak state is handled the same whether data is null or explicitly zero
- **Type Safety**: Maintains TypeScript type safety throughout the component

## Streak Status Levels

The component displays different visual states based on streak length:

1. **Start Your Streak (0 days)**: Neutral gray theme, encourages first study session
2. **Building Momentum (1-6 days)**: Green theme, motivates continued engagement
3. **Great Progress (7-29 days)**: Orange theme, celebrates habit formation
4. **Streak Master (30+ days)**: Purple theme, recognizes dedication

## Milestones

Predefined milestones at: 7, 30, 50, 100, 200, 365 days

- Shows progress bar to next milestone
- Displays achieved milestones as badges
- Highlights most recent milestone achievement

## Analytics Tracking

Tracks `streak_display_clicked` events with:
- `currentStreak`: Current consecutive days
- `longestStreak`: All-time longest streak
- `totalStudyDays`: Total days studied
- `milestonesReached`: Count of achieved milestones

## Testing

Comprehensive test suite covers:
- Loading state rendering
- Null response handling (key fix)
- Zero streak data display
- Active streak visualization
- Milestone progress display
- Analytics event tracking
- Different streak status levels
- Custom className application

### Test Data IDs
- `streak-loading`: Loading skeleton container
- `streak-display`: Main component container
- `current-streak`: Current streak number display

## Usage

```tsx
import StreakDisplay from './components/StreakDisplay';

// Basic usage
<StreakDisplay />

// With custom styling
<StreakDisplay className="mb-6" />
```

## Dependencies

- `convex/react`: For data fetching
- `useAnalytics`: For event tracking
- Convex API: `api.streaks.getCurrentStreak`

## Related Components

- Statistics Dashboard (displays streak as part of overall stats)
- Study History Heatmap (shows daily study activity)
- Post Session Summary (may reference streak achievements)
