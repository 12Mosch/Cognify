import { usePostHog } from 'posthog-js/react';

/**
 * Analytics utility functions for PostHog integration
 * Provides type-safe event tracking with error handling
 */

/**
 * Safely get the current environment mode
 * Uses environment variables that work consistently across Vite and Node.js
 * Avoids eval and import.meta access issues entirely
 */
export function getEnvironmentMode(): string {
  // Check for test environment first
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    return 'test';
  }

  // Use VITE_MODE if available (set by Vite automatically)
  if (typeof process !== 'undefined' && process.env.VITE_MODE) {
    return process.env.VITE_MODE;
  }

  // Use NODE_ENV as fallback (works in both browser and Node.js after bundling)
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }

  // Final fallback for browser environments where process might not be available
  // In production builds, bundlers typically replace process.env references
  return 'production';
}

// Define event types for better type safety
export type AnalyticsEvent =
  | 'user_signed_up'
  | 'deck_created'
  | 'card_created'
  | 'study_session_started'
  | 'study_session_completed'
  | 'card_flipped'
  | 'difficulty_rated';

export interface AnalyticsEventData {
  user_signed_up: Record<string, never>; // No additional data needed
  deck_created: {
    deckId?: string;
    deckName?: string;
  };
  card_created: {
    cardId?: string;
    deckName?: string;
  };
  study_session_started: {
    deckId: string;
    deckName?: string;
    cardCount?: number;
  };
  study_session_completed: {
    deckId: string;
    deckName?: string;
    cardsReviewed: number;
    studyMode: 'basic' | 'spaced-repetition';
    sessionDuration?: number;
    // Enhanced session completion properties
    averageTimePerCard?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
    cardsSkipped?: number;
    completionRate?: number; // percentage
    focusTime?: number; // time actually spent studying vs idle
  };
  card_flipped: {
    cardId: string;
    deckId: string;
    flipDirection: 'front_to_back' | 'back_to_front';
    timeToFlip?: number; // milliseconds
  };
  difficulty_rated: {
    cardId: string;
    deckId: string;
    difficulty: 'easy' | 'medium' | 'hard';
    previousDifficulty?: string;
  };
}

/**
 * Safe wrapper for PostHog event tracking
 * Ensures analytics failures don't break app functionality
 */
type PropsArg<E extends AnalyticsEvent> =
  AnalyticsEventData[E] extends Record<string, never> ? [] : [properties: AnalyticsEventData[E]]

export function trackEvent<E extends AnalyticsEvent>(
  posthog: ReturnType<typeof usePostHog> | null,
  event: E,
  ...props: PropsArg<E>
): void {
  const properties = props[0] as PropsArg<E>[0] | undefined;
  try {
    if (!posthog) {
      console.warn('PostHog not available for event tracking:', event);
      return;
    }

    // Track the event with optional properties
    posthog.capture(event, properties);

    // Log in development for debugging
    if (getEnvironmentMode() === 'development') {
      console.log('Analytics event tracked:', event, properties);
    }
  } catch (error) {
    // Log error but don't throw to avoid breaking app functionality
    console.error('Failed to track analytics event:', event, error);
  }
}

/**
 * Track user registration event
 * Should only be called once per user registration
 */
export function trackUserSignUp(posthog: ReturnType<typeof usePostHog> | null): void {
  trackEvent(posthog, 'user_signed_up');
}

/**
 * Track deck creation event
 */
export function trackDeckCreated(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId?: string,
  deckName?: string
): void {
  trackEvent(posthog, 'deck_created', {
    deckId,
    deckName,
  });
}

/**
 * Track card creation event
 */
export function trackCardCreated(
  posthog: ReturnType<typeof usePostHog> | null,
  cardId?: string,
  deckName?: string
): void {
  trackEvent(posthog, 'card_created', { cardId, deckName });
}

/**
 * Track study session start event
 */
export function trackStudySessionStarted(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId: string,
  deckName?: string,
  cardCount?: number
): void {
  trackEvent(posthog, 'study_session_started', {
    deckId,
    deckName,
    cardCount,
  });
}

/**
 * Track study session completion event with enhanced metrics
 */
export function trackStudySessionCompleted(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId: string,
  deckName: string | undefined,
  cardsReviewed: number,
  studyMode: 'basic' | 'spaced-repetition',
  sessionDuration?: number,
  enhancedMetrics?: {
    averageTimePerCard?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
    cardsSkipped?: number;
    completionRate?: number;
    focusTime?: number;
  }
): void {
  trackEvent(posthog, 'study_session_completed', {
    deckId,
    deckName,
    cardsReviewed,
    studyMode,
    sessionDuration,
    ...enhancedMetrics,
  });
}

/**
 * Track card flip interaction
 */
export function trackCardFlipped(
  posthog: ReturnType<typeof usePostHog> | null,
  cardId: string,
  deckId: string,
  flipDirection: 'front_to_back' | 'back_to_front',
  timeToFlip?: number
): void {
  trackEvent(posthog, 'card_flipped', {
    cardId,
    deckId,
    flipDirection,
    timeToFlip,
  });
}

/**
 * Track difficulty rating
 */
export function trackDifficultyRated(
  posthog: ReturnType<typeof usePostHog> | null,
  cardId: string,
  deckId: string,
  difficulty: 'easy' | 'medium' | 'hard',
  previousDifficulty?: string
): void {
  trackEvent(posthog, 'difficulty_rated', {
    cardId,
    deckId,
    difficulty,
    previousDifficulty,
  });
}

/**
 * Hook to get PostHog instance with error handling
 */
export function useAnalytics() {
  const posthog = usePostHog();

  return {
    posthog,
    trackUserSignUp: () => trackUserSignUp(posthog),
    trackDeckCreated: (deckId?: string, deckName?: string) =>
      trackDeckCreated(posthog, deckId, deckName),
    trackCardCreated: (cardId?: string, deckName?: string) =>
      trackCardCreated(posthog, cardId, deckName),
    trackStudySessionStarted: (deckId: string, deckName?: string, cardCount?: number) =>
      trackStudySessionStarted(posthog, deckId, deckName, cardCount),
    trackStudySessionCompleted: (
      deckId: string,
      deckName: string | undefined,
      cardsReviewed: number,
      studyMode: 'basic' | 'spaced-repetition',
      sessionDuration?: number,
      enhancedMetrics?: {
        averageTimePerCard?: number;
        correctAnswers?: number;
        incorrectAnswers?: number;
        cardsSkipped?: number;
        completionRate?: number;
        focusTime?: number;
      }
    ) => trackStudySessionCompleted(posthog, deckId, deckName, cardsReviewed, studyMode, sessionDuration, enhancedMetrics),
    trackCardFlipped: (
      cardId: string,
      deckId: string,
      flipDirection: 'front_to_back' | 'back_to_front',
      timeToFlip?: number
    ) => trackCardFlipped(posthog, cardId, deckId, flipDirection, timeToFlip),
    trackDifficultyRated: (
      cardId: string,
      deckId: string,
      difficulty: 'easy' | 'medium' | 'hard',
      previousDifficulty?: string
    ) => trackDifficultyRated(posthog, cardId, deckId, difficulty, previousDifficulty),
  };
}

/**
 * Utility to check if user has already been tracked for registration
 * Uses localStorage to prevent duplicate registration events
 */
export function hasUserBeenTrackedForRegistration(): boolean {
  try {
    return localStorage.getItem('posthog_user_registered') === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark user as tracked for registration
 */
export function markUserAsTrackedForRegistration(): void {
  try {
    localStorage.setItem('posthog_user_registered', 'true');
  } catch (error) {
    console.warn('Failed to mark user as tracked for registration:', error);
  }
}
