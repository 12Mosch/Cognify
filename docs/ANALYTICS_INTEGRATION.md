# PostHog Analytics Integration

This document describes the comprehensive PostHog analytics integration implemented in the flashcard application.

## Overview

PostHog analytics has been integrated with advanced features including event batching, feature flags, privacy compliance, and cohort analysis. The integration follows privacy best practices and includes proper error handling to ensure analytics failures don't break app functionality.

## Phase 2 Features

### Event Batching
- Automatic batching of analytics events for improved performance
- Configurable batch size (default: 10 events) and flush interval (default: 5 seconds)
- Reduces network requests and improves app responsiveness

### Feature Flag Integration
- PostHog feature flags with automatic tracking of flag interactions
- Feature flag context included in analytics events
- Support for A/B testing and gradual feature rollouts

### Privacy Compliance
- **GDPR Compliance**: Full European data protection regulation compliance
- **CCPA Compliance**: California Consumer Privacy Act compliance with opt-out mechanisms
- **Regional Detection**: Automatic detection of user region for appropriate privacy messaging
- **Enhanced Consent Management**: Granular consent controls for different data processing purposes
- **Privacy Banner**: Contextual privacy banners based on user region (EU/CA/US/Other)
- **Data Anonymization**: Automatic anonymization of sensitive user data
- **Cookie Management**: Secure cookie handling with user consent
- **Privacy-First Defaults**: PostHog configured with opt-out by default

### Streak Tracking
- **Daily Study Streaks**: Track consecutive days of study activity
- **Milestone Tracking**: Celebrate streak milestones (7, 30, 100+ days)
- **Timezone-Aware**: Proper handling of user timezones for accurate daily tracking
- **Streak Analytics**: Track streak events (started, continued, broken, milestones)
- **Gamification**: Visual streak displays and motivational messaging

### Funnel Analysis
- **Study Session Flow**: Track complete user journey from session start to completion
- **Conversion Tracking**: Monitor session completion rates and drop-off points
- **Engagement Metrics**: Track intermediate engagement points (card flips, ratings)
- **Performance Analytics**: Session duration, cards reviewed, completion rates

### Cohort Analysis
- Automatic user segmentation based on signup date, study goals, and behavior
- Rich user properties for advanced analytics and targeting
- Study persona classification for personalized experiences

### Error Tracking & Monitoring
- **Automatic Error Capture**: Enhanced React Error Boundary with PostHog integration
- **Manual Error Reporting**: Type-safe error capture functions with rich context
- **Convex Integration**: Specialized error tracking for Convex queries and mutations
- **Authentication Errors**: Comprehensive Clerk and Convex auth error monitoring
- **Study Session Errors**: Flashcard-specific error scenarios and recovery
- **Error Recovery**: User-friendly error recovery mechanisms and fallback UI
- **Context Enrichment**: Automatic error context with user, route, and app state
- **Privacy Compliant**: All error tracking respects user consent preferences

## Tracked Events

### 1. User Registration (`user_signed_up`)
- **When**: Triggered when a user successfully registers for the first time
- **Location**: `src/App.tsx`
- **Implementation**: Uses Clerk's `useUser` hook to detect new users and localStorage to prevent duplicate tracking
- **Properties**: None

### 2. Deck Creation (`deck_created`)
- **When**: Triggered when a user successfully creates a new flashcard deck
- **Location**: `src/components/CreateDeckForm.tsx`
- **Implementation**: Integrated with the existing `useMutation` pattern after successful deck creation
- **Properties**:
  - `deckId`: The ID of the newly created deck
  - `deckName`: The name of the deck

### 3. Study Session Start (`study_session_started`)
- **When**: Triggered when a user starts a study session for a deck
- **Location**: `src/components/BasicStudyMode.tsx`, `src/components/SpacedRepetitionMode.tsx`
- **Implementation**: Tracked when the study components mount and deck data is loaded
- **Properties**:
  - `deckId`: The ID of the deck being studied
  - `deckName`: The name of the deck (optional)
  - `cardCount`: The number of cards in the deck (optional)

### 4. Study Session Completion (`study_session_completed`)
- **When**: Triggered when a user completes a study session
- **Location**: `src/components/PostSessionSummary.tsx`
- **Implementation**: Tracked when the PostSessionSummary component mounts
- **Properties**:
  - `deckId`: The ID of the deck that was studied
  - `deckName`: The name of the deck (optional)
  - `cardsReviewed`: Number of cards reviewed in the session
  - `studyMode`: The study mode used ('basic' or 'spaced-repetition')
  - `sessionDuration`: Duration of the session in milliseconds (optional)
  - `averageTimePerCard`: Average time spent per card in milliseconds (optional)
  - `correctAnswers`: Number of correct answers (optional)
  - `incorrectAnswers`: Number of incorrect answers (optional)
  - `cardsSkipped`: Number of cards skipped (optional)
  - `completionRate`: Completion rate as a percentage (optional)
  - `focusTime`: Time actually spent studying vs idle in milliseconds (optional)

### 5. Card Flip (`card_flipped`)
- **When**: Triggered when a user flips a flashcard to see the answer or question
- **Location**: `src/components/BasicStudyMode.tsx`, `src/components/SpacedRepetitionMode.tsx`
- **Implementation**: Tracked in the `handleFlipCard` function with timing data
- **Properties**:
  - `cardId`: The ID of the card that was flipped
  - `deckId`: The ID of the deck containing the card
  - `flipDirection`: Direction of the flip ('front_to_back' or 'back_to_front')
  - `timeToFlip`: Time taken to flip the card in milliseconds (optional)

### 6. Difficulty Rating (`difficulty_rated`)
- **When**: Triggered when a user rates the difficulty of a card in spaced repetition mode
- **Location**: `src/components/SpacedRepetitionMode.tsx`
- **Implementation**: Tracked in the `handleReview` function when quality ratings are given
- **Properties**:
  - `cardId`: The ID of the card that was rated
  - `deckId`: The ID of the deck containing the card
  - `difficulty`: The difficulty rating ('easy', 'medium', or 'hard')
  - `previousDifficulty`: The previous difficulty rating for this card (optional)

## Streak Tracking Events

### 7. Streak Started (`streak_started`)
- **When**: Triggered when a user starts their first study streak
- **Location**: `src/components/SpacedRepetitionMode.tsx`, `src/components/BasicStudyMode.tsx`
- **Implementation**: Tracked when streak tracking detects the beginning of a new streak
- **Properties**:
  - `streakLength`: Current streak length (1 for new streaks)
  - `studyDate`: Date of study in YYYY-MM-DD format
  - `timezone`: User's IANA timezone identifier

### 8. Streak Continued (`streak_continued`)
- **When**: Triggered when a user continues an existing study streak
- **Location**: `src/components/SpacedRepetitionMode.tsx`, `src/components/BasicStudyMode.tsx`
- **Implementation**: Tracked when user studies on consecutive days
- **Properties**:
  - `streakLength`: Current streak length
  - `studyDate`: Date of study in YYYY-MM-DD format
  - `timezone`: User's IANA timezone identifier
  - `previousStreakLength`: Previous streak length

### 9. Streak Broken (`streak_broken`)
- **When**: Triggered when a user's study streak is broken due to missed days
- **Location**: `convex/streaks.ts`
- **Implementation**: Tracked when streak tracking detects a gap in study activity
- **Properties**:
  - `previousStreakLength`: Length of the broken streak
  - `daysMissed`: Number of days missed
  - `lastStudyDate`: Last date of study in YYYY-MM-DD format
  - `timezone`: User's IANA timezone identifier

### 10. Streak Milestone (`streak_milestone`)
- **When**: Triggered when a user reaches a streak milestone (7, 30, 50, 100, 200, 365 days)
- **Location**: `convex/streaks.ts`
- **Implementation**: Tracked when streak length reaches predefined milestones
- **Properties**:
  - `streakLength`: Current streak length
  - `milestone`: Milestone number reached
  - `studyDate`: Date milestone was reached in YYYY-MM-DD format
  - `timezone`: User's IANA timezone identifier

## Funnel Analysis Events

### 11. Session Started (`session_started`)
- **When**: Triggered when a user starts a study session (funnel entry point)
- **Location**: `src/components/SpacedRepetitionMode.tsx`, `src/components/BasicStudyMode.tsx`
- **Implementation**: Tracked when study session initializes with cards
- **Properties**:
  - `deckId`: The ID of the deck being studied
  - `deckName`: The name of the deck (optional)
  - `studyMode`: The study mode ('basic' or 'spaced-repetition')
  - `cardCount`: Number of cards available for study (optional)
  - `sessionId`: Unique session identifier for funnel tracking

### 12. Cards Reviewed (`cards_reviewed`)
- **When**: Triggered periodically during study session to track progress
- **Location**: `src/components/SpacedRepetitionMode.tsx`, `src/components/BasicStudyMode.tsx`
- **Implementation**: Tracked when user reviews cards (intermediate funnel step)
- **Properties**:
  - `deckId`: The ID of the deck being studied
  - `sessionId`: Unique session identifier
  - `cardsReviewed`: Number of cards reviewed so far
  - `studyMode`: The study mode ('basic' or 'spaced-repetition')
  - `timeElapsed`: Time elapsed since session start in milliseconds

### 13. Session Completed (`session_completed`)
- **When**: Triggered when a user completes a study session (funnel exit point)
- **Location**: `src/components/SpacedRepetitionMode.tsx`, `src/components/BasicStudyMode.tsx`
- **Implementation**: Tracked when session ends with completion metrics
- **Properties**:
  - `deckId`: The ID of the deck that was studied
  - `sessionId`: Unique session identifier
  - `cardsReviewed`: Total number of cards reviewed
  - `studyMode`: The study mode ('basic' or 'spaced-repetition')
  - `sessionDuration`: Total session duration in milliseconds
  - `completionRate`: Completion rate as a percentage
  - `averageTimePerCard`: Average time spent per card (optional)
  - `correctAnswers`: Number of correct answers (optional)
  - `incorrectAnswers`: Number of incorrect answers (optional)

## Error Tracking Events

### 14. Error Boundary Triggered (`error_boundary_triggered`)
- **When**: Triggered when a React Error Boundary catches an unhandled error
- **Location**: `src/ErrorBoundary.tsx`
- **Implementation**: Enhanced ErrorBoundary with PostHog integration and user-friendly recovery UI
- **Properties**:
  - `errorMessage`: The error message
  - `errorStack`: Full error stack trace (optional)
  - `componentStack`: React component stack trace (optional)
  - `userId`: Current user ID (optional)
  - `currentRoute`: Current page route
  - `userAgent`: Browser user agent
  - `timestamp`: Error occurrence timestamp
  - `errorBoundary`: Name of the error boundary that caught the error
  - `recoverable`: Whether the error is recoverable

### 15. Convex Query Failed (`convex_query_failed`)
- **When**: Triggered when a Convex query fails
- **Location**: Throughout the app where Convex queries are used
- **Implementation**: Specialized error tracking for Convex database operations
- **Properties**:
  - `queryName`: Name of the failed query
  - `errorMessage`: Error message from Convex
  - `errorCode`: Convex error code (optional)
  - `userId`: Current user ID (optional)
  - `deckId`: Related deck ID (optional)
  - `cardId`: Related card ID (optional)
  - `retryAttempt`: Retry attempt number (optional)
  - `queryArgs`: Query arguments (optional)

### 16. Convex Mutation Failed (`convex_mutation_failed`)
- **When**: Triggered when a Convex mutation fails
- **Location**: Throughout the app where Convex mutations are used
- **Implementation**: Critical error tracking for data modification operations
- **Properties**:
  - `mutationName`: Name of the failed mutation
  - `errorMessage`: Error message from Convex
  - `errorCode`: Convex error code (optional)
  - `userId`: Current user ID (optional)
  - `deckId`: Related deck ID (optional)
  - `cardId`: Related card ID (optional)
  - `retryAttempt`: Retry attempt number (optional)
  - `mutationArgs`: Mutation arguments (optional)

### 17. Authentication Error (`authentication_error`)
- **When**: Triggered when authentication-related errors occur
- **Location**: Throughout the app where authentication is required
- **Implementation**: Comprehensive auth error tracking for Clerk and Convex
- **Properties**:
  - `errorType`: Type of auth error ('clerk_error', 'convex_auth_error', 'token_expired', 'permission_denied')
  - `errorMessage`: Error message
  - `userId`: Current user ID (optional)
  - `attemptedAction`: Action that triggered the error (optional)
  - `currentRoute`: Current page route

### 18. Card Loading Error (`card_loading_error`)
- **When**: Triggered when flashcard loading fails
- **Location**: Study mode components
- **Implementation**: Specialized error tracking for card rendering and loading
- **Properties**:
  - `deckId`: ID of the deck containing the card
  - `cardId`: ID of the failed card (optional)
  - `errorMessage`: Error message
  - `studyMode`: Current study mode (optional)
  - `loadingStage`: Stage where loading failed ('initial_load', 'flip_animation', 'content_render')

### 19. Study Session Error (`study_session_error`)
- **When**: Triggered when study session operations fail
- **Location**: Study mode components
- **Implementation**: Critical error tracking for study session integrity
- **Properties**:
  - `deckId`: ID of the deck being studied
  - `sessionId`: Unique session identifier (optional)
  - `errorType`: Type of session error ('session_start', 'card_transition', 'progress_save', 'session_end')
  - `errorMessage`: Error message
  - `cardsReviewed`: Number of cards reviewed before error (optional)
  - `studyMode`: Current study mode (optional)

### 20. User Reported Error (`user_reported_error`)
- **When**: Triggered when users manually report errors or issues
- **Location**: Error reporting components or feedback forms
- **Implementation**: Manual error reporting with user context
- **Properties**:
  - `errorDescription`: User's description of the error
  - `userEmail`: User's email for follow-up (optional)
  - `currentRoute`: Current page route
  - `reproductionSteps`: Steps to reproduce the error (optional)
  - `severity`: User-reported severity ('low', 'medium', 'high', 'critical')
  - `category`: Error category ('ui_bug', 'data_loss', 'performance', 'feature_request', 'other')

### 21. Async Operation Failed (`async_operation_failed`)
- **When**: Triggered when async operations fail
- **Location**: Throughout the app for async operations
- **Implementation**: General async error tracking with retry context
- **Properties**:
  - `operationType`: Type of async operation
  - `errorMessage`: Error message
  - `operationContext`: Context data for the operation (optional)
  - `retryAttempt`: Retry attempt number (optional)
  - `timeoutDuration`: Timeout duration if applicable (optional)

## File Structure

```
src/
├── lib/
│   ├── analytics.ts              # Main analytics utility functions
│   ├── errorMonitoring.ts        # Error monitoring utilities and hooks
│   └── __tests__/
│       └── analytics.test.ts     # Unit tests for analytics functions
├── App.tsx                       # User registration tracking
├── components/
│   ├── CreateDeckForm.tsx        # Deck creation tracking
│   ├── StudySession.tsx          # Study session tracking
│   └── Dashboard.tsx             # Navigation to study sessions
├── ErrorBoundary.tsx             # Enhanced error boundary with PostHog integration
└── main.tsx                      # PostHog provider setup
```

## Key Features

### Type Safety
- All events are strongly typed using TypeScript
- Event properties are defined with proper interfaces
- Conditional tuple types enforce required properties at compile time
- Prevents typos and ensures consistent event tracking
- Events requiring properties (like `study_session_started`) cannot be called without them

### Error Handling
- All PostHog calls are wrapped in try-catch blocks
- Analytics failures don't break app functionality
- Graceful degradation when PostHog is unavailable

### Environment Detection
- Safe environment mode detection without using `eval()` or `import.meta`
- Avoids CSP (Content Security Policy) violations and minifier issues
- Uses environment variables that work consistently across Vite and Node.js
- Supports test, development, staging, and production environments

### Enhanced Privacy Compliance

#### GDPR Compliance Features
- **Consent Management**: Granular consent for analytics, functional, marketing, and performance data
- **Data Processing Purposes**: Clear categorization of data usage
- **Right to Withdraw**: Users can withdraw consent at any time
- **Data Retention**: Configurable data retention periods
- **Data Anonymization**: Automatic anonymization when consent is denied
- **Cookie Consent**: Explicit consent for cookie usage

#### CCPA Compliance Features
- **Do Not Sell**: Opt-out mechanism for data selling
- **Data Categories**: Clear categorization of personal information, behavioral data, and device info
- **Opt-Out Rights**: Easy opt-out process for California residents
- **Transparency**: Clear disclosure of data collection practices

#### Regional Privacy Handling
- **Automatic Detection**: Detects user region based on timezone
- **Contextual Messaging**: Shows appropriate privacy notices based on jurisdiction
- **EU Users**: GDPR-compliant consent banners with accept/reject/customize options
- **California Users**: CCPA-compliant notices with opt-out mechanisms
- **Other Regions**: Standard cookie notices with consent options

#### Privacy-First Configuration
PostHog is configured with privacy-first defaults:
```typescript
{
  opt_out_capturing_by_default: true,
  respect_dnt: true,
  disable_session_recording: true,
  disable_surveys: true,
  secure_cookie: true,
  cross_subdomain_cookie: false,
  persistence: 'localStorage',
}
```

#### Enhanced Privacy Settings
```typescript
interface EnhancedPrivacySettings {
  analyticsConsent: 'granted' | 'denied' | 'pending';
  functionalConsent: 'granted' | 'denied' | 'pending';
  marketingConsent: 'granted' | 'denied' | 'pending';
  gdpr?: {
    consentGiven: boolean;
    consentDate?: string;
    dataProcessingPurposes: {
      analytics: boolean;
      functional: boolean;
      marketing: boolean;
      performance: boolean;
    };
    dataRetentionPeriod: number;
    anonymizeData: boolean;
    allowCookies: boolean;
  };
  ccpa?: {
    doNotSell: boolean;
    optOutDate?: string;
    dataCategories: {
      personalInfo: boolean;
      behavioralData: boolean;
      deviceInfo: boolean;
    };
  };
  region?: 'EU' | 'CA' | 'US' | 'OTHER';
  lastUpdated?: string;
}
```

### Testing
- Comprehensive unit tests for all analytics functions
- Mocked PostHog and localStorage for reliable testing
- Error scenarios are tested to ensure graceful handling

## Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# PostHog Configuration
VITE_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key_here
VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Optional: Environment mode override (Vite sets this automatically)
VITE_MODE=development
```

For EU users, use `https://eu.posthog.com` as the host.

**Environment Detection Priority:**
1. `NODE_ENV=test` → Always returns 'test' (for Jest testing)
2. `VITE_MODE` → Used when available (set by Vite automatically)
3. `NODE_ENV` → Fallback for Node.js environments
4. `'production'` → Final fallback

### PostHog Setup
1. Create a PostHog account at https://posthog.com
2. Create a new project
3. Copy the project API key
4. Add the API key to your environment variables

## Usage

### Using the Analytics Hooks

#### Basic Analytics Hook
```typescript
import { useAnalytics } from '../lib/analytics';

function MyComponent() {
  const {
    trackDeckCreated,
    trackStudySessionStarted,
    trackCardFlipped,
    trackDifficultyRated
  } = useAnalytics();

  const handleDeckCreated = (deckId: string, deckName: string) => {
    trackDeckCreated(deckId, deckName);
  };

  const handleCardFlip = (cardId: string, deckId: string) => {
    trackCardFlipped(cardId, deckId, 'front_to_back', 1500);
  };

  const handleDifficultyRating = (cardId: string, deckId: string) => {
    trackDifficultyRated(cardId, deckId, 'easy');
  };
}
```

#### Enhanced Analytics Hook with Batching and Feature Flags
```typescript
import { useAnalyticsEnhanced } from '../lib/analytics';

function MyComponent() {
  const {
    trackEventBatched,
    trackFeatureFlag,
    identifyUser,
    hasConsent
  } = useAnalyticsEnhanced();

  const handleCardFlip = (cardId: string, deckId: string) => {
    if (hasConsent) {
      trackEventBatched('card_flipped', {
        cardId,
        deckId,
        flipDirection: 'front_to_back',
        timeToFlip: 1500,
      }, ['new-study-algorithm', 'advanced-statistics']); // Include feature flags
    }
  };

  const handleFeatureUsage = (flagKey: string) => {
    trackFeatureFlag(flagKey, 'enabled');
  };

  const handleUserSignup = (userId: string, userProps: any) => {
    identifyUser(userId, userProps);
  };
}
```

#### Privacy-Compliant Analytics Hook
```typescript
import { usePrivacyCompliantAnalytics } from '../lib/analytics';

function MyComponent() {
  const {
    trackWithConsent,
    privacySettings,
    grantConsent,
    revokeConsent,
    hasAnalyticsConsent
  } = usePrivacyCompliantAnalytics();

  const handleEvent = () => {
    trackWithConsent('deck_created', { deckId: 'deck-123' });
  };

  const handleConsentChange = () => {
    if (hasAnalyticsConsent) {
      revokeConsent('analyticsConsent');
    } else {
      grantConsent('analyticsConsent');
    }
  };
}
```

#### Streak Tracking Usage
```typescript
import {
  trackStreakStarted,
  trackStreakContinued,
  trackStreakMilestone
} from '../lib/analytics';
import { usePostHog } from 'posthog-js/react';

function StreakComponent() {
  const posthog = usePostHog();

  const handleStreakUpdate = (streakResult: any) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = new Date().toISOString().split('T')[0];

    if (streakResult.streakEvent === 'started') {
      trackStreakStarted(posthog, streakResult.currentStreak, today, timezone);
    } else if (streakResult.streakEvent === 'continued') {
      trackStreakContinued(
        posthog,
        streakResult.currentStreak,
        today,
        timezone,
        streakResult.currentStreak - 1
      );
    }

    if (streakResult.isNewMilestone && streakResult.milestone) {
      trackStreakMilestone(
        posthog,
        streakResult.currentStreak,
        streakResult.milestone,
        today,
        timezone
      );
    }
  };
}
```

#### Funnel Analysis Usage
```typescript
import {
  trackSessionStarted,
  trackCardsReviewed,
  trackSessionCompleted
} from '../lib/analytics';
import { usePostHog } from 'posthog-js/react';

function StudySessionComponent() {
  const posthog = usePostHog();
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const handleSessionStart = (deckId: string, deckName: string, cardCount: number) => {
    trackSessionStarted(posthog, deckId, 'spaced-repetition', sessionId, deckName, cardCount);
  };

  const handleProgress = (deckId: string, cardsReviewed: number, timeElapsed: number) => {
    trackCardsReviewed(posthog, deckId, sessionId, cardsReviewed, 'spaced-repetition', timeElapsed);
  };

  const handleSessionComplete = (deckId: string, metrics: any) => {
    trackSessionCompleted(
      posthog,
      deckId,
      sessionId,
      metrics.cardsReviewed,
      'spaced-repetition',
      metrics.sessionDuration,
      metrics.completionRate,
      {
        averageTimePerCard: metrics.averageTimePerCard,
        correctAnswers: metrics.correctAnswers,
        incorrectAnswers: metrics.incorrectAnswers,
      }
    );
  };
}
```

#### Privacy Banner Usage
```typescript
import PrivacyBanner from '../components/PrivacyBanner';
import PrivacySettings from '../components/PrivacySettings';

function App() {
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);

  return (
    <div>
      {/* Your app content */}

      {/* Privacy Banner - shows automatically based on user region and consent status */}
      <PrivacyBanner onSettingsClick={() => setShowPrivacySettings(true)} />

      {/* Privacy Settings Modal */}
      {showPrivacySettings && (
        <PrivacySettings onClose={() => setShowPrivacySettings(false)} />
      )}
    </div>
  );
}
```

### Direct Function Usage
```typescript
import { trackEvent } from '../lib/analytics';
import { usePostHog } from 'posthog-js/react';

function MyComponent() {
  const posthog = usePostHog();

  const handleCustomEvent = () => {
    // ✅ Valid: events with optional properties
    trackEvent(posthog, 'deck_created', { deckId: 'test', deckName: 'Test' });
    trackEvent(posthog, 'user_signed_up'); // No properties required

    // ✅ Valid: events with required properties
    trackEvent(posthog, 'study_session_started', { deckId: 'deck123' });

    // ❌ TypeScript error: missing required deckId property
    // trackEvent(posthog, 'study_session_started');
  };
}
```

## Development

### Running Tests
```bash
npm test src/lib/__tests__/analytics.test.ts
```

### Debug Mode
In development mode, all analytics events are logged to the console for debugging purposes.

### Adding New Events
1. Add the event type to `AnalyticsEvent` in `src/lib/analytics.ts`
2. Define the event properties in `AnalyticsEventData`
3. Create a helper function if needed
4. Add tests for the new event

## Best Practices

1. **Always use the provided utility functions** instead of calling PostHog directly
2. **Test analytics integration** in development mode using console logs
3. **Don't track sensitive information** like passwords or personal data
4. **Use meaningful event names** that clearly describe the user action
5. **Include relevant context** in event properties for better insights

## Troubleshooting

### Events Not Appearing in PostHog
1. Check that environment variables are set correctly
2. Verify PostHog project API key is valid
3. Check browser console for any errors
4. Ensure PostHog host URL is correct for your region

### TypeScript Errors
1. Ensure all event types are properly defined in `AnalyticsEvent`
2. Check that event properties match the `AnalyticsEventData` interface
3. Verify imports are correct

### Testing Issues
1. Make sure Jest is configured properly
2. Check that mocks are set up correctly in test files
3. Verify test environment has access to all required modules

## Error Monitoring Usage

### Using Error Monitoring Hooks

#### Basic Error Monitoring
```typescript
import { useErrorMonitoring } from '../lib/errorMonitoring';

function MyComponent() {
  const { captureError, trackConvexQuery, trackConvexMutation } = useErrorMonitoring();

  const handleAsyncOperation = async () => {
    try {
      const result = await someAsyncOperation();
      return result;
    } catch (error) {
      captureError(error as Error, {
        component: 'MyComponent',
        action: 'async_operation',
        severity: 'medium',
        additionalData: { operationType: 'data_fetch' }
      });
      throw error;
    }
  };

  const handleConvexQuery = async () => {
    try {
      const data = await convexQuery(api.decks.getDecksForUser);
      return data;
    } catch (error) {
      trackConvexQuery('getDecksForUser', error as Error, {
        userId: user?.id,
        retryAttempt: 0,
      });
      throw error;
    }
  };
}
```

#### Enhanced Error Boundary Usage
```typescript
import { ErrorBoundary } from '../ErrorBoundary';

function App() {
  return (
    <ErrorBoundary
      name="AppErrorBoundary"
      fallback={(error, retry) => (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{error.message}</p>
          <button onClick={retry}>Try Again</button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('App error:', error, errorInfo);
      }}
    >
      <MyApp />
    </ErrorBoundary>
  );
}
```

## Enhanced Error Tracking System

The flashcard application now includes a comprehensive error tracking system that integrates with PostHog's `captureException` API for superior error monitoring and debugging capabilities.

### Key Features

#### 1. **PostHog captureException Integration**
- Direct integration with PostHog's built-in exception capture
- Enhanced error grouping and categorization
- Automatic error fingerprinting for better organization
- Rich context capture including user state, app state, and browser information

#### 2. **Error Rate Limiting**
- Prevents error spam with configurable rate limits (10 errors per minute per error type)
- Protects against infinite error loops
- Maintains system performance during error conditions

#### 3. **Automatic Error Categorization**
```typescript
export type ErrorCategory =
  | 'network_error'
  | 'validation_error'
  | 'authentication_error'
  | 'permission_error'
  | 'data_corruption'
  | 'performance_error'
  | 'ui_error'
  | 'integration_error'
  | 'unknown_error';
```

#### 4. **Enhanced Context Capture**
- Memory usage metrics (when available)
- Network connection type
- Browser state (online status, cookies enabled)
- Viewport and screen dimensions
- Performance metrics
- User session data

#### 5. **Form Error Tracking**
- Validation error tracking with field-level details
- Form submission error monitoring
- Time-to-submit metrics
- Retry attempt tracking

#### 6. **Performance Error Monitoring**
- Automatic detection of slow operations
- Configurable performance thresholds
- Duration tracking and analysis
- Operation-specific context capture

### Usage Examples

#### Enhanced Error Boundary with PostHog Integration
```typescript
// ErrorBoundary now automatically uses PostHog's captureException
// with comprehensive context including:
// - Error categorization
// - Severity assessment
// - Browser and app state
// - Memory usage metrics
// - User context

<ErrorBoundary name="StudySessionBoundary">
  <SpacedRepetitionMode deckId={deckId} onExit={onExit} />
</ErrorBoundary>
```

#### Manual Error Capture with Enhanced Context
```typescript
import { useErrorMonitoring } from '../lib/errorMonitoring';

function MyComponent() {
  const { captureError } = useErrorMonitoring();

  const handleError = (error: Error) => {
    captureError(error, {
      component: 'MyComponent',
      action: 'user_action',
      severity: 'medium',
      category: 'ui_error',
      tags: {
        feature: 'flashcard_study',
        userType: 'premium',
      },
      additionalData: {
        cardId: 'card-123',
        studyMode: 'spaced-repetition',
      },
    });
  };
}
```

#### Form Error Monitoring
```typescript
import { withFormErrorMonitoring } from '../lib/errorMonitoring';
import { usePostHog } from 'posthog-js/react';

function CreateDeckForm() {
  const posthog = usePostHog();
  const formErrorMonitor = withFormErrorMonitoring('create_deck', posthog);

  const handleSubmit = async (formData: DeckFormData) => {
    try {
      await formErrorMonitor.wrapSubmission(
        async (data) => {
          return await createDeck(data);
        },
        formData,
        { userId: user?.id, submissionAttempt: 1 }
      );
    } catch (error) {
      // Error is automatically tracked
      console.error('Form submission failed:', error);
    }
  };

  const handleValidationErrors = (errors: Record<string, string[]>) => {
    formErrorMonitor.trackValidationErrors(errors, {
      userId: user?.id,
      formData,
      attemptNumber: 1,
    });
  };
}
```

#### Performance Monitoring
```typescript
import { withAsyncErrorMonitoring } from '../lib/errorMonitoring';
import { usePostHog } from 'posthog-js/react';

function DataLoader() {
  const posthog = usePostHog();

  const loadData = async () => {
    return await withAsyncErrorMonitoring(
      async () => {
        // Your async operation
        return await fetchLargeDataset();
      },
      {
        operationType: 'load_large_dataset',
        posthog,
        timeoutMs: 10000, // 10 second timeout
        performanceThreshold: 3000, // Track if > 3 seconds
        errorContext: {
          userId: user?.id,
          component: 'DataLoader',
        },
      }
    );
  };
}
```

#### Convex Error Monitoring
```typescript
import { useErrorMonitoring } from '../lib/errorMonitoring';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

function StudyComponent() {
  const { trackConvexMutation } = useErrorMonitoring();
  const reviewCard = useMutation(api.spacedRepetition.reviewCard);

  const handleReview = async (cardId: string, quality: number) => {
    try {
      await reviewCard({ cardId, quality });
    } catch (error) {
      trackConvexMutation('reviewCard', error as Error, {
        userId: user?.id,
        deckId: currentDeck?.id,
        cardId,
        mutationArgs: { cardId, quality },
      });
      throw error; // Re-throw for component handling
    }
  };
}
```

### Privacy Compliance

All error tracking respects the existing privacy consent system:

```typescript
// Error tracking only occurs when user has granted analytics consent
if (hasAnalyticsConsent()) {
  posthog.captureException(error, context);
}

// Graceful degradation when consent is not given
if (!hasAnalyticsConsent()) {
  console.error('Error captured (analytics disabled):', error, context);
  return;
}
```

#### GDPR/CCPA Compliance Features
- Automatic consent checking before any error tracking
- Graceful degradation when consent is denied
- Error data anonymization options
- User control over error data collection
- Automatic data retention compliance

### Error Recovery Mechanisms

The system includes automatic error recovery utilities:

```typescript
import { ErrorRecovery } from '../lib/errorMonitoring';

// Recover from Convex connection errors
await ErrorRecovery.recoverConvexConnection();

// Recover from authentication errors
await ErrorRecovery.recoverAuthentication();

// Recover from study session errors
await ErrorRecovery.recoverStudySession(deckId);

// Recover from form submission errors
await ErrorRecovery.recoverFormSubmission(formName);
```

### Error Severity Classification

Errors are automatically classified by severity:

- **Critical**: Chunk load errors, out of memory, core mutations
- **High**: Authentication, permissions, network, render errors
- **Medium**: Validation, timeouts, fetch errors
- **Low**: Unknown or minor errors

### Error Fingerprinting

Errors are automatically grouped using fingerprints:
```typescript
const fingerprint = `${category}_${error.name}_${component || 'unknown'}`;
```

This enables:
- Better error grouping in PostHog
- Duplicate error detection
- Rate limiting by error type
- Trend analysis

#### Convex Error Handling
```typescript
import { useConvexQueryErrorHandler, useConvexMutationErrorHandler } from '../lib/errorMonitoring';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

function DeckComponent() {
  const trackQueryError = useConvexQueryErrorHandler();
  const trackMutationError = useConvexMutationErrorHandler();

  // Enhanced query with error tracking
  const decks = useQuery(api.decks.getDecksForUser, undefined, {
    onError: (error) => {
      trackQueryError('getDecksForUser', error, {
        userId: user?.id,
        retryAttempt: 0,
      });
    }
  });

  const createDeck = useMutation(api.decks.createDeck);

  const handleCreateDeck = async (deckData: any) => {
    try {
      const result = await createDeck(deckData);
      return result;
    } catch (error) {
      trackMutationError('createDeck', error as Error, {
        userId: user?.id,
        mutationArgs: deckData,
        retryAttempt: 0,
      });
      throw error;
    }
  };
}
```

### Error Recovery Utilities

```typescript
import { ErrorRecovery } from '../lib/errorMonitoring';

function ErrorRecoveryComponent() {
  const handleConvexError = async () => {
    const recovered = await ErrorRecovery.recoverConvexConnection();
    if (!recovered) {
      // Show user-friendly error message
    }
  };

  const handleAuthError = async () => {
    const recovered = await ErrorRecovery.recoverAuthentication();
    if (!recovered) {
      // Redirect to error page
    }
  };

  const handleStudySessionError = async (deckId: string) => {
    const recovered = await ErrorRecovery.recoverStudySession(deckId);
    if (recovered) {
      // Restart study session
    }
  };
}
```

## Error Monitoring Best Practices

### 1. Error Context
Always provide rich context when capturing errors:
- User ID for user-specific debugging
- Component name for error location tracking
- Action being performed when error occurred
- Relevant IDs (deckId, cardId, sessionId)
- Additional data that might help debugging

### 2. Error Severity
Use appropriate severity levels:
- **Critical**: Data loss, security issues, app crashes
- **High**: Feature completely broken, auth failures
- **Medium**: Feature partially broken, recoverable errors
- **Low**: Minor UI issues, non-critical failures

### 3. Privacy Compliance
All error tracking respects user consent:
- Errors are only sent to PostHog if analytics consent is granted
- Sensitive data is automatically anonymized
- Users can opt out of error tracking at any time

### 4. Error Recovery
Implement graceful error recovery:
- Provide retry mechanisms for recoverable errors
- Show user-friendly error messages
- Offer alternative actions when possible
- Clear error states and allow users to continue
