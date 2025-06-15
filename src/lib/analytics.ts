import { usePostHog } from 'posthog-js/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Analytics utility functions for PostHog integration
 * Provides type-safe event tracking with error handling, batching, and privacy compliance
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

// Privacy and consent types
export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface PrivacySettings {
  analyticsConsent: ConsentStatus;
  functionalConsent: ConsentStatus;
  marketingConsent: ConsentStatus;
}

// Analytics queue types
interface QueuedEvent {
  event: AnalyticsEvent;
  properties: any;
  timestamp: number;
  featureFlags?: Record<string, any>;
}

// User cohort types
export interface UserCohortProperties {
  signupDate?: string;
  signupWeek?: number;
  signupMonth?: number;
  studyGoal?: 'casual' | 'intensive' | 'exam_prep';
  preferredStudyTime?: 'morning' | 'afternoon' | 'evening';
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  studyPersona?: string;
  engagementTier?: 'new_user' | 'casual' | 'regular' | 'power_user';
}

// Define event types for better type safety
export type AnalyticsEvent =
  | 'user_signed_up'
  | 'deck_created'
  | 'card_created'
  | 'study_session_started'
  | 'study_session_completed'
  | 'card_flipped'
  | 'difficulty_rated'
  | 'streak_started'
  | 'streak_continued'
  | 'streak_broken'
  | 'streak_milestone'
  | 'session_started'
  | 'cards_reviewed'
  | 'session_completed';

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
  // Streak tracking events
  streak_started: {
    streakLength: number;
    studyDate: string; // YYYY-MM-DD format
    timezone: string;
  };
  streak_continued: {
    streakLength: number;
    studyDate: string; // YYYY-MM-DD format
    timezone: string;
    previousStreakLength: number;
  };
  streak_broken: {
    previousStreakLength: number;
    daysMissed: number;
    lastStudyDate: string; // YYYY-MM-DD format
    timezone: string;
  };
  streak_milestone: {
    streakLength: number;
    milestone: number; // 7, 30, 100, etc.
    studyDate: string;
    timezone: string;
  };
  // Funnel analysis events
  session_started: {
    deckId: string;
    deckName?: string;
    studyMode: 'basic' | 'spaced-repetition';
    cardCount?: number;
    sessionId: string;
  };
  cards_reviewed: {
    deckId: string;
    sessionId: string;
    cardsReviewed: number;
    studyMode: 'basic' | 'spaced-repetition';
    timeElapsed: number; // milliseconds
  };
  session_completed: {
    deckId: string;
    sessionId: string;
    cardsReviewed: number;
    studyMode: 'basic' | 'spaced-repetition';
    sessionDuration: number; // milliseconds
    completionRate: number; // percentage
    averageTimePerCard?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
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
 * Track streak started event
 */
export function trackStreakStarted(
  posthog: ReturnType<typeof usePostHog> | null,
  streakLength: number,
  studyDate: string,
  timezone: string
): void {
  trackEvent(posthog, 'streak_started', {
    streakLength,
    studyDate,
    timezone,
  });
}

/**
 * Track streak continued event
 */
export function trackStreakContinued(
  posthog: ReturnType<typeof usePostHog> | null,
  streakLength: number,
  studyDate: string,
  timezone: string,
  previousStreakLength: number
): void {
  trackEvent(posthog, 'streak_continued', {
    streakLength,
    studyDate,
    timezone,
    previousStreakLength,
  });
}

/**
 * Track streak broken event
 */
export function trackStreakBroken(
  posthog: ReturnType<typeof usePostHog> | null,
  previousStreakLength: number,
  daysMissed: number,
  lastStudyDate: string,
  timezone: string
): void {
  trackEvent(posthog, 'streak_broken', {
    previousStreakLength,
    daysMissed,
    lastStudyDate,
    timezone,
  });
}

/**
 * Track streak milestone event
 */
export function trackStreakMilestone(
  posthog: ReturnType<typeof usePostHog> | null,
  streakLength: number,
  milestone: number,
  studyDate: string,
  timezone: string
): void {
  trackEvent(posthog, 'streak_milestone', {
    streakLength,
    milestone,
    studyDate,
    timezone,
  });
}

/**
 * Track funnel analysis events
 */
export function trackSessionStarted(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId: string,
  studyMode: 'basic' | 'spaced-repetition',
  sessionId: string,
  deckName?: string,
  cardCount?: number
): void {
  trackEvent(posthog, 'session_started', {
    deckId,
    deckName,
    studyMode,
    cardCount,
    sessionId,
  });
}

export function trackCardsReviewed(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId: string,
  sessionId: string,
  cardsReviewed: number,
  studyMode: 'basic' | 'spaced-repetition',
  timeElapsed: number
): void {
  trackEvent(posthog, 'cards_reviewed', {
    deckId,
    sessionId,
    cardsReviewed,
    studyMode,
    timeElapsed,
  });
}

export function trackSessionCompleted(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId: string,
  sessionId: string,
  cardsReviewed: number,
  studyMode: 'basic' | 'spaced-repetition',
  sessionDuration: number,
  completionRate: number,
  enhancedMetrics?: {
    averageTimePerCard?: number;
    correctAnswers?: number;
    incorrectAnswers?: number;
  }
): void {
  trackEvent(posthog, 'session_completed', {
    deckId,
    sessionId,
    cardsReviewed,
    studyMode,
    sessionDuration,
    completionRate,
    ...enhancedMetrics,
  });
}

/**
 * Analytics Queue for batching events to improve performance
 * Automatically flushes events based on batch size or time interval
 */
class AnalyticsQueue {
  private queue: QueuedEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor(private posthog: ReturnType<typeof usePostHog> | null) {
    this.startFlushTimer();
  }

  enqueue<E extends AnalyticsEvent>(
    event: E,
    properties: AnalyticsEventData[E],
    featureFlags?: Record<string, any>
  ): void {
    this.queue.push({
      event,
      properties,
      timestamp: Date.now(),
      featureFlags,
    });

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.queue.length === 0 || !this.posthog) return;

    const events = this.queue.splice(0);

    // Send events in batch
    events.forEach(({ event, properties, featureFlags }) => {
      try {
        const eventProperties = {
          ...properties,
          ...featureFlags,
        };
        this.posthog!.capture(event, eventProperties);
      } catch (error) {
        console.error('Failed to send batched event:', event, error);
      }
    });

    // Log in development for debugging
    if (getEnvironmentMode() === 'development') {
      console.log('Analytics batch flushed:', events.length, 'events');
    }
  }

  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(); // Send remaining events
  }
}

/**
 * Privacy compliance utilities with GDPR/CCPA support
 */
export const PRIVACY_STORAGE_KEY = 'flashcard_privacy_settings';
export const PRIVACY_BANNER_KEY = 'flashcard_privacy_banner_shown';

export interface GDPRSettings {
  consentGiven: boolean;
  consentDate?: string;
  dataProcessingPurposes: {
    analytics: boolean;
    functional: boolean;
    marketing: boolean;
    performance: boolean;
  };
  dataRetentionPeriod: number; // days
  anonymizeData: boolean;
  allowCookies: boolean;
}

export interface CCPASettings {
  doNotSell: boolean;
  optOutDate?: string;
  dataCategories: {
    personalInfo: boolean;
    behavioralData: boolean;
    deviceInfo: boolean;
  };
}

export interface EnhancedPrivacySettings extends PrivacySettings {
  gdpr?: GDPRSettings;
  ccpa?: CCPASettings;
  region?: 'EU' | 'CA' | 'US' | 'OTHER';
  lastUpdated?: string;
}

export function getPrivacySettings(): PrivacySettings {
  try {
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load privacy settings:', error);
  }

  // Default to pending consent
  return {
    analyticsConsent: 'pending',
    functionalConsent: 'pending',
    marketingConsent: 'pending',
  };
}

export function getEnhancedPrivacySettings(): EnhancedPrivacySettings {
  try {
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (stored) {
      const settings = JSON.parse(stored);
      // Migrate old settings to new format if needed
      if (!settings.gdpr && !settings.ccpa) {
        return migrateToEnhancedSettings(settings);
      }
      return settings;
    }
  } catch (error) {
    console.warn('Failed to load enhanced privacy settings:', error);
  }

  // Default enhanced settings
  return {
    analyticsConsent: 'pending',
    functionalConsent: 'pending',
    marketingConsent: 'pending',
    region: detectUserRegion(),
    lastUpdated: new Date().toISOString(),
    gdpr: {
      consentGiven: false,
      dataProcessingPurposes: {
        analytics: false,
        functional: false,
        marketing: false,
        performance: false,
      },
      dataRetentionPeriod: 365,
      anonymizeData: true,
      allowCookies: false,
    },
    ccpa: {
      doNotSell: false,
      dataCategories: {
        personalInfo: false,
        behavioralData: false,
        deviceInfo: false,
      },
    },
  };
}

function migrateToEnhancedSettings(oldSettings: PrivacySettings): EnhancedPrivacySettings {
  return {
    ...oldSettings,
    region: detectUserRegion(),
    lastUpdated: new Date().toISOString(),
    gdpr: {
      consentGiven: oldSettings.analyticsConsent === 'granted',
      consentDate: oldSettings.analyticsConsent === 'granted' ? new Date().toISOString() : undefined,
      dataProcessingPurposes: {
        analytics: oldSettings.analyticsConsent === 'granted',
        functional: oldSettings.functionalConsent === 'granted',
        marketing: oldSettings.marketingConsent === 'granted',
        performance: oldSettings.analyticsConsent === 'granted',
      },
      dataRetentionPeriod: 365,
      anonymizeData: true,
      allowCookies: oldSettings.analyticsConsent === 'granted',
    },
    ccpa: {
      doNotSell: oldSettings.analyticsConsent === 'denied',
      dataCategories: {
        personalInfo: oldSettings.analyticsConsent === 'granted',
        behavioralData: oldSettings.analyticsConsent === 'granted',
        deviceInfo: oldSettings.functionalConsent === 'granted',
      },
    },
  };
}

function detectUserRegion(): 'EU' | 'CA' | 'US' | 'OTHER' {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone.includes('Europe/')) return 'EU';
    if (timezone.includes('America/') && (timezone.includes('Toronto') || timezone.includes('Vancouver'))) return 'CA';
    if (timezone.includes('America/')) return 'US';
    return 'OTHER';
  } catch {
    return 'OTHER';
  }
}

export function setPrivacySettings(settings: PrivacySettings): void {
  try {
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Failed to save privacy settings:', error);
  }
}

export function setEnhancedPrivacySettings(settings: EnhancedPrivacySettings): void {
  try {
    const updatedSettings = {
      ...settings,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.warn('Failed to save enhanced privacy settings:', error);
  }
}

export function hasAnalyticsConsent(): boolean {
  const settings = getPrivacySettings();
  return settings.analyticsConsent === 'granted';
}

export function shouldShowPrivacyBanner(): boolean {
  try {
    const bannerShown = localStorage.getItem(PRIVACY_BANNER_KEY);
    const settings = getPrivacySettings();
    return !bannerShown && settings.analyticsConsent === 'pending';
  } catch {
    return true;
  }
}

export function markPrivacyBannerShown(): void {
  try {
    localStorage.setItem(PRIVACY_BANNER_KEY, 'true');
  } catch (error) {
    console.warn('Failed to mark privacy banner as shown:', error);
  }
}

export function anonymizeUserData(data: Record<string, any>): Record<string, any> {
  const settings = getEnhancedPrivacySettings();
  if (!settings.gdpr?.anonymizeData) {
    return data;
  }

  const anonymized = { ...data };

  // Remove or hash sensitive fields
  const sensitiveFields = ['email', 'name', 'ip', 'userId', 'distinctId'];
  sensitiveFields.forEach(field => {
    if (anonymized[field]) {
      // Simple hash for anonymization (in production, use proper hashing)
      anonymized[field] = `anon_${btoa(anonymized[field]).slice(0, 8)}`;
    }
  });

  return anonymized;
}

/**
 * Feature flag utilities
 */
export function trackFeatureInteraction(
  posthog: ReturnType<typeof usePostHog> | null,
  flagKey: string,
  variant?: string
): void {
  if (!posthog || !hasAnalyticsConsent()) return;

  try {
    posthog.capture('$feature_interaction', {
      feature_flag: flagKey,
      $set: { [`$feature_interaction/${flagKey}`]: true }
    });

    if (variant) {
      posthog.capture('$feature_flag_called', {
        $feature_flag_response: variant,
        $feature_flag: flagKey
      });
    }
  } catch (error) {
    console.error('Failed to track feature interaction:', flagKey, error);
  }
}

/**
 * User cohort analysis utilities
 */
export function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

export function getUserStudyPersona(props: Partial<UserCohortProperties>): string {
  if (props.studyGoal === 'exam_prep') return 'exam_focused';
  if (props.experienceLevel === 'beginner') return 'learning_basics';
  if (props.preferredStudyTime === 'morning') return 'morning_studier';
  return 'general_learner';
}

export function identifyUserWithCohorts(
  posthog: ReturnType<typeof usePostHog> | null,
  userId: string,
  userProperties: {
    email?: string;
    name?: string;
    signupDate?: string;
    studyGoal?: 'casual' | 'intensive' | 'exam_prep';
    preferredStudyTime?: 'morning' | 'afternoon' | 'evening';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  }
): void {
  if (!posthog || !hasAnalyticsConsent()) return;

  try {
    const signupDate = new Date(userProperties.signupDate || Date.now());
    const cohortProperties: UserCohortProperties = {
      // Signup cohort
      signupWeek: getWeekOfYear(signupDate),
      signupMonth: signupDate.getMonth() + 1,
      signupDate: signupDate.toISOString().split('T')[0],

      // Behavioral cohorts
      studyPersona: getUserStudyPersona(userProperties),
      engagementTier: 'new_user', // Will be updated based on usage

      // User preferences
      studyGoal: userProperties.studyGoal,
      preferredStudyTime: userProperties.preferredStudyTime,
      experienceLevel: userProperties.experienceLevel,
    };

    posthog.identify(userId, {
      ...userProperties,
      ...cohortProperties,
    });
  } catch (error) {
    console.error('Failed to identify user with cohorts:', error);
  }
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
 * Enhanced analytics hook with batching, feature flags, and privacy compliance
 */
export function useAnalyticsEnhanced() {
  const posthog = usePostHog();
  const queueRef = useRef<AnalyticsQueue | null>(null);

  useEffect(() => {
    queueRef.current = new AnalyticsQueue(posthog);

    return () => {
      queueRef.current?.destroy();
    };
  }, [posthog]);

  const trackEventBatched = useCallback(<E extends AnalyticsEvent>(
    event: E,
    properties: AnalyticsEventData[E],
    includeFlags: string[] = []
  ) => {
    if (!hasAnalyticsConsent()) {
      console.log('Analytics tracking skipped - no consent');
      return;
    }

    const flagContext: Record<string, any> = {};
    includeFlags.forEach(flagKey => {
      if (posthog) {
        const flagValue = posthog.getFeatureFlag(flagKey);
        if (flagValue !== undefined) {
          flagContext[`$feature/${flagKey}`] = flagValue;
        }
      }
    });

    queueRef.current?.enqueue(event, properties, flagContext);
  }, [posthog]);

  const trackFeatureFlag = useCallback((flagKey: string, variant?: string) => {
    trackFeatureInteraction(posthog, flagKey, variant);
  }, [posthog]);

  const identifyUser = useCallback((
    userId: string,
    userProperties: Parameters<typeof identifyUserWithCohorts>[2]
  ) => {
    identifyUserWithCohorts(posthog, userId, userProperties);
  }, [posthog]);

  return {
    posthog,
    trackEventBatched,
    trackFeatureFlag,
    identifyUser,
    hasConsent: hasAnalyticsConsent(),
  };
}

/**
 * Privacy-compliant analytics hook
 */
export function usePrivacyCompliantAnalytics() {
  const posthog = usePostHog();
  const [privacySettings, setPrivacySettingsState] = useState<PrivacySettings>(getPrivacySettings);

  useEffect(() => {
    // Load privacy settings on mount
    setPrivacySettingsState(getPrivacySettings());
  }, []);

  const trackWithConsent = useCallback(<E extends AnalyticsEvent>(
    event: E,
    ...props: PropsArg<E>
  ) => {
    if (privacySettings.analyticsConsent === 'denied') {
      console.log('Analytics tracking skipped - consent denied');
      return;
    }

    if (privacySettings.analyticsConsent === 'granted') {
      trackEvent(posthog, event, ...props);
    }
    // If consent is pending, we don't track
  }, [posthog, privacySettings.analyticsConsent]);

  const grantConsent = useCallback((type: keyof PrivacySettings = 'analyticsConsent') => {
    const newSettings = { ...privacySettings, [type]: 'granted' as ConsentStatus };
    setPrivacySettings(newSettings);
    setPrivacySettingsState(newSettings);

    if (type === 'analyticsConsent') {
      posthog?.opt_in_capturing();
    }
  }, [posthog, privacySettings]);

  const revokeConsent = useCallback((type: keyof PrivacySettings = 'analyticsConsent') => {
    const newSettings = { ...privacySettings, [type]: 'denied' as ConsentStatus };
    setPrivacySettings(newSettings);
    setPrivacySettingsState(newSettings);

    if (type === 'analyticsConsent') {
      posthog?.opt_out_capturing();
    }
  }, [posthog, privacySettings]);

  return {
    trackWithConsent,
    privacySettings,
    grantConsent,
    revokeConsent,
    hasAnalyticsConsent: privacySettings.analyticsConsent === 'granted',
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
