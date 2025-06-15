# PostHog Analytics Integration

This document describes the PostHog analytics integration implemented in the flashcard application.

## Overview

PostHog analytics has been integrated to track key user events and provide insights into user behavior. The integration follows privacy best practices and includes proper error handling to ensure analytics failures don't break app functionality.

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
- **Location**: `src/components/StudySession.tsx`
- **Implementation**: Tracked when the StudySession component mounts and deck data is loaded
- **Properties**:
  - `deckId`: The ID of the deck being studied
  - `deckName`: The name of the deck (optional)
  - `cardCount`: The number of cards in the deck (optional)

## File Structure

```
src/
├── lib/
│   ├── analytics.ts              # Main analytics utility functions
│   └── __tests__/
│       └── analytics.test.ts     # Unit tests for analytics functions
├── App.tsx                       # User registration tracking
├── components/
│   ├── CreateDeckForm.tsx        # Deck creation tracking
│   ├── StudySession.tsx          # Study session tracking
│   └── Dashboard.tsx             # Navigation to study sessions
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

### Privacy Considerations
- User registration tracking uses localStorage to prevent duplicates
- No sensitive user data is tracked
- Debug logging only in development mode

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

### Using the Analytics Hook
```typescript
import { useAnalytics } from '../lib/analytics';

function MyComponent() {
  const { trackDeckCreated, trackStudySessionStarted } = useAnalytics();
  
  const handleDeckCreated = (deckId: string, deckName: string) => {
    trackDeckCreated(deckId, deckName);
  };
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
