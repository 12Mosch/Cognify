import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  useAnalytics,
  useAnalyticsEnhanced,
  trackSessionStarted,
  trackCardsReviewed,
  trackSessionCompleted,
  trackStreakStarted,
  trackStreakContinued,
  trackStreakBroken,
  trackStreakMilestone
} from "../lib/analytics";
import { useErrorMonitoring } from "../lib/errorMonitoring";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import HelpIcon from "./HelpIcon";
import PostSessionSummary from "./PostSessionSummary";
import { getKeyboardShortcuts, isShortcutKey } from "../types/keyboard";
import { formatNextReviewTime } from "../lib/dateUtils";
import { FlashcardSkeleton } from "./skeletons/SkeletonComponents";
import { StudyProgressBar } from "./StudyProgressBar";
import { DifficultyIndicator } from "./DifficultyIndicator";
import { useFlashcardGestures, initializeGestureStyles, isTouchDevice } from "../lib/gestureUtils";
import GestureTutorial from "./GestureTutorial";
import { useGestureTutorial } from "../lib/gestureTutorialUtils";

interface SpacedRepetitionModeProps {
  deckId: Id<"decks">;
  onExit: () => void;
}

interface Card {
  _id: Id<"cards">;
  _creationTime: number;
  deckId: Id<"decks">;
  front: string;
  back: string;
  repetition?: number;
  easeFactor?: number;
  interval?: number;
  dueDate?: number;
}

/**
 * SpacedRepetitionMode Component - Intelligent study interface using SM-2 algorithm
 * 
 * This component provides a spaced repetition study experience where users can:
 * - Review cards that are due based on the SM-2 algorithm
 * - Study new cards with a daily limit
 * - Rate their performance to optimize future scheduling
 * - Focus on long-term retention rather than short-term completion
 * 
 * Features:
 * - SM-2 algorithm for optimal scheduling
 * - Quality-based response buttons (Again, Hard, Good, Easy)
 * - Intelligent queue management (due cards first, then new cards)
 * - No visible progress counters to prevent "grinding" behavior
 * - Clean, distraction-free interface
 */
function SpacedRepetitionMode({ deckId, onExit }: SpacedRepetitionModeProps) {
  // State management for the study session
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [cardsReviewed, setCardsReviewed] = useState<number>(0);
  const [flipStartTime, setFlipStartTime] = useState<number | null>(null);
  const [sessionId] = useState<string>(() => {
    // Generate cryptographically secure random session ID
    const timestamp = Date.now();
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(36)).join('').substring(0, 11);
    return `session_${timestamp}_${randomString}`;
  });
  const [_lastCardReviewTime, setLastCardReviewTime] = useState<number>(0);
  const [errorTracked, setErrorTracked] = useState<{deck?: boolean, studyQueue?: boolean}>({});

  const { t } = useTranslation();

  // Fetch deck and study queue using Convex queries
  const deck = useQuery(api.decks.getDeckById, { deckId });
  const studyQueueData = useQuery(api.spacedRepetition.getStudyQueue, {
    deckId,
    shuffle: true // Enable shuffling for varied study experience
  });
  const nextReviewInfo = useQuery(api.spacedRepetition.getNextReviewInfo, { deckId });

  // Mutations for card operations
  const reviewCard = useMutation(api.spacedRepetition.reviewCard);
  const initializeCard = useMutation(api.spacedRepetition.initializeCardForSpacedRepetition);
  const updateStreak = useMutation(api.streaks.updateStreak);
  const recordStudySession = useMutation(api.studySessions.recordStudySession);

  const { trackStudySessionStarted, posthog } = useAnalytics();
  const { trackEventBatched, hasConsent } = useAnalyticsEnhanced();
  const { trackConvexMutation, trackStudySession, captureError, trackConvexQuery } = useErrorMonitoring();

  // Gesture tutorial management
  const gestureTutorial = useGestureTutorial('spaced-repetition');

  // Initialize gesture styles on component mount
  useEffect(() => {
    initializeGestureStyles();
  }, []);

  // Show gesture tutorial when session starts (only on first study session)
  useEffect(() => {
    if (sessionStarted && gestureTutorial.shouldShow && studyQueue.length > 0) {
      // Small delay to let the study interface load first
      const timer = setTimeout(() => {
        gestureTutorial.showTutorial();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [sessionStarted, gestureTutorial, studyQueue.length]);

  // Initialize study queue when data is loaded
  useEffect(() => {
    if (studyQueueData && !sessionStarted) {
      setStudyQueue(studyQueueData);

      if (studyQueueData.length > 0 && deck) {
        // Track legacy study session started event
        trackStudySessionStarted(deckId, deck.name, studyQueueData.length);

        // Track funnel analysis session started event
        if (hasConsent) {
          trackSessionStarted(
            posthog,
            deckId,
            'spaced-repetition',
            sessionId,
            deck.name,
            studyQueueData.length
          );
        }

        setSessionStarted(true);
        setSessionStartTime(Date.now());
        setFlipStartTime(Date.now()); // Initialize flip timer for first card
        setLastCardReviewTime(Date.now());
      }
    }
  }, [studyQueueData, sessionStarted, deckId, deck, trackStudySessionStarted, hasConsent, posthog, sessionId]);

  // Track deck loading errors (side effect)
  useEffect(() => {
    if (deck === null && !errorTracked.deck) {
      const deckError = new Error('Deck not found or access denied');
      trackConvexQuery('getDeckById', deckError, {
        deckId,
      });
      setErrorTracked(prev => ({ ...prev, deck: true }));
    }
  }, [deck, errorTracked.deck, trackConvexQuery, deckId]);

  // Track study queue loading errors (side effect)
  useEffect(() => {
    if (studyQueueData === null && !errorTracked.studyQueue) {
      const queueError = new Error('Failed to load study queue');
      trackConvexQuery('getStudyQueue', queueError, {
        deckId,
      });
      setErrorTracked(prev => ({ ...prev, studyQueue: true }));
    }
  }, [studyQueueData, errorTracked.studyQueue, trackConvexQuery, deckId]);

  /**
   * Handle session completion with analytics and streak tracking
   */
  const handleSessionCompletion = useCallback(async (finalCardsReviewed: number) => {
    if (!deck || sessionStartTime === 0) return;

    const sessionDuration = Date.now() - sessionStartTime;
    const completionRate = studyQueue.length > 0 ? (finalCardsReviewed / studyQueue.length) * 100 : 0;

    // Track session completion for funnel analysis
    if (hasConsent) {
      trackSessionCompleted(
        posthog,
        deckId,
        sessionId,
        finalCardsReviewed,
        'spaced-repetition',
        sessionDuration,
        completionRate
      );
    }

    // Record study session in database
    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localDate = new Date().toISOString().split('T')[0];

      await recordStudySession({
        deckId,
        cardsStudied: finalCardsReviewed,
        sessionDuration,
        studyMode: 'spaced-repetition',
        userTimeZone,
        localDate,
      });

      // Update streak and track streak events
      const streakResult = await updateStreak({
        studyDate: localDate,
        timezone: userTimeZone,
      });

      // Track streak events based on result
      if (hasConsent && streakResult) {
        if (streakResult.streakEvent === 'started') {
          trackStreakStarted(posthog, streakResult.currentStreak, localDate, userTimeZone);
        } else if (streakResult.streakEvent === 'continued') {
          trackStreakContinued(
            posthog,
            streakResult.currentStreak,
            localDate,
            userTimeZone,
            streakResult.currentStreak - 1
          );
        } else if (streakResult.streakEvent === 'broken') {
          trackStreakBroken(
            posthog,
            streakResult.longestStreak,
            1, // daysMissed - simplified for now
            localDate,
            userTimeZone
          );
        }

        // Track milestone if achieved
        if (streakResult.isNewMilestone && streakResult.milestone) {
          trackStreakMilestone(
            posthog,
            streakResult.currentStreak,
            streakResult.milestone,
            localDate,
            userTimeZone
          );
        }
      }
    } catch (error) {
      console.error('Error completing session:', error);
      // Track study session error
      trackStudySession(
        deckId,
        'session_end',
        error as Error,
        {
          sessionId,
          cardsReviewed: finalCardsReviewed,
          studyMode: 'spaced-repetition',
        }
      );
    }
  }, [deck, sessionStartTime, studyQueue.length, hasConsent, posthog, deckId, sessionId, recordStudySession, updateStreak, trackStudySession]);

  /**
   * Handle flipping the current card between front and back
   */
  const handleFlipCard = useCallback(() => {
    try {
      if (studyQueue.length === 0) return;

      const currentCard = studyQueue[currentCardIndex];
      if (!currentCard) return;

      const flipDirection: 'front_to_back' | 'back_to_front' = isFlipped ? 'back_to_front' : 'front_to_back';
      const timeToFlip = flipStartTime ? Date.now() - flipStartTime : undefined;

      // Track the card flip event with batching and feature flags
      if (hasConsent) {
        trackEventBatched('card_flipped', {
          cardId: currentCard._id,
          deckId,
          flipDirection,
          timeToFlip,
        }, ['new-study-algorithm', 'advanced-statistics']);
      }

      setIsFlipped(prev => !prev);
      setFlipStartTime(Date.now());
    } catch (error) {
      // Track card flip error
      captureError(error as Error, {
        deckId,
        cardId: studyQueue[currentCardIndex]?._id,
        component: 'SpacedRepetitionMode',
        action: 'flip_card',
        severity: 'low',
        category: 'ui_error',
        additionalData: {
          currentCardIndex,
          isFlipped,
          studyQueueLength: studyQueue.length,
        },
      });
    }
  }, [studyQueue, currentCardIndex, isFlipped, flipStartTime, deckId, hasConsent, trackEventBatched, captureError]);

  /**
   * Handle card review with quality rating
   */
  const handleReview = useCallback(async (quality: number) => {
    if (studyQueue.length === 0) return;

    const currentCard = studyQueue[currentCardIndex];

    // Map quality numbers to difficulty labels for analytics
    const getDifficultyFromQuality = (q: number): 'easy' | 'medium' | 'hard' => {
      if (q === 0) return 'hard'; // Again
      if (q === 3) return 'hard'; // Hard
      if (q === 4) return 'medium'; // Good
      if (q === 5) return 'easy'; // Easy
      return 'medium'; // Default fallback
    };

    const difficulty = getDifficultyFromQuality(quality);

    // Track difficulty rating with batching and feature flags
    if (hasConsent) {
      trackEventBatched('difficulty_rated', {
        cardId: currentCard._id,
        deckId,
        difficulty,
      }, ['new-study-algorithm', 'advanced-statistics']);
    }

    try {
      // Initialize card for spaced repetition if needed
      if (currentCard.repetition === undefined) {
        await initializeCard({ cardId: currentCard._id });
      }

      // Review the card with the given quality
      await reviewCard({ cardId: currentCard._id, quality });
    } catch (error) {
      console.error("Error reviewing card:", error);

      // Track the specific error based on the operation
      if (currentCard.repetition === undefined) {
        trackConvexMutation('initializeCardForSpacedRepetition', error as Error, {
          deckId,
          cardId: currentCard._id,
          mutationArgs: { cardId: currentCard._id },
        });
      } else {
        trackConvexMutation('reviewCard', error as Error, {
          deckId,
          cardId: currentCard._id,
          mutationArgs: { cardId: currentCard._id, quality },
        });
      }

      // Continue to next card even if there's an error
    }

    // Increment cards reviewed count (once per review attempt)
    const newCardsReviewed = cardsReviewed + 1;
    setCardsReviewed(newCardsReviewed);
    setLastCardReviewTime(Date.now());

    // Track cards reviewed for funnel analysis
    if (hasConsent && sessionStartTime > 0) {
      trackCardsReviewed(
        posthog,
        deckId,
        sessionId,
        newCardsReviewed,
        'spaced-repetition',
        Date.now() - sessionStartTime
      );
    }

    // Move to next card or finish session
    const nextIndex = currentCardIndex + 1;
    if (nextIndex >= studyQueue.length) {
      // Session complete - handle completion tracking and streak updates
      await handleSessionCompletion(newCardsReviewed);
      setShowSummary(true);
    } else {
      setCurrentCardIndex(nextIndex);
      setIsFlipped(false);
      setFlipStartTime(Date.now()); // Reset flip timer for new card
    }
  }, [studyQueue, currentCardIndex, initializeCard, reviewCard, deckId, hasConsent, trackEventBatched, cardsReviewed, posthog, sessionId, sessionStartTime, handleSessionCompletion, trackConvexMutation]);

  // Configure gesture handlers for mobile touch interactions
  const gestureHandlers = useFlashcardGestures({
    onFlipCard: handleFlipCard,
    onRateEasy: () => isFlipped && void handleReview(5), // Easy rating on right swipe when flipped
    onRateHard: () => isFlipped && void handleReview(0), // Again rating on down swipe when flipped
    disabled: showKeyboardHelp || studyQueue.length === 0,
    studyMode: 'spaced-repetition',
  });

  /**
   * Reset session state to start a new study session
   */
  const resetSessionState = useCallback(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyQueue([]);
    setSessionStarted(false);
    setShowSummary(false);
    setSessionStartTime(0);
    setCardsReviewed(0);
    setFlipStartTime(null);
  }, []);

  /**
   * Handle continuing study session - restart with fresh queue
   */
  const handleContinueStudying = useCallback(() => {
    resetSessionState();
    // The useEffect will automatically reinitialize the session when sessionStarted becomes false
  }, [resetSessionState]);

  // Reset state when deck changes
  useEffect(() => {
    resetSessionState();
    setErrorTracked({}); // Reset error tracking state
  }, [deckId, resetSessionState]);

  // Global keyboard event listener for shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if modal is open or if user is typing in an input
      if (showKeyboardHelp || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle help shortcut
      if (isShortcutKey(event, '?')) {
        event.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Handle flip shortcuts
      if (isShortcutKey(event, 'Space') || isShortcutKey(event, 'Enter')) {
        event.preventDefault();
        handleFlipCard();
        return;
      }

      // Handle rating shortcuts (only when card is flipped)
      if (isFlipped && studyQueue.length > 0) {
        if (isShortcutKey(event, '1')) {
          event.preventDefault();
          void handleReview(0); // Again
        } else if (isShortcutKey(event, '2')) {
          event.preventDefault();
          void handleReview(3); // Hard
        } else if (isShortcutKey(event, '3')) {
          event.preventDefault();
          void handleReview(4); // Good
        } else if (isShortcutKey(event, '4')) {
          event.preventDefault();
          void handleReview(5); // Easy
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
    // handleFlipCard is intentionally omitted - it's stabilized with useCallback([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, studyQueue.length, showKeyboardHelp, handleReview]);

  /**
   * Handle keyboard shortcuts for flipping cards
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      handleFlipCard();
    }
  };



  // Loading state
  if (deck === undefined || studyQueueData === undefined) {
    return <FlashcardSkeleton />;
  }

  // Error state - deck not found
  if (deck === null) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{t('study.deckNotFound.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('study.deckNotFound.message')}
            </p>
            <button
              onClick={onExit}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
              aria-label={t('study.deckNotFound.backToDashboard')}
            >
              {t('study.deckNotFound.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state - study queue failed to load
  if (studyQueueData === null) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{t('errors.generic')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('errors.network')}
            </p>
            <button
              onClick={onExit}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
              aria-label={t('study.deckNotFound.backToDashboard')}
            >
              {t('study.deckNotFound.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No cards to study state
  if (studyQueueData && studyQueueData.length === 0) {
    // Generate enhanced messaging based on session and next review data
    const sessionCardsReviewed = cardsReviewed;
    const hasNextReview = nextReviewInfo?.nextDueDate;
    const nextReviewTime = hasNextReview ? formatNextReviewTime(hasNextReview) : null;
    const totalCards = nextReviewInfo?.totalCardsInDeck || 0;

    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        {/* Header with deck name and exit button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
            aria-label={t('study.exitStudy')}
          >
            {t('study.exitStudy')}
          </button>
        </div>

        {/* Enhanced "All Caught Up" message */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">{t('study.allCaughtUp.title')}</h2>

            {/* Session statistics */}
            {sessionCardsReviewed > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  {t('study.allCaughtUp.sessionStats', { count: sessionCardsReviewed })}
                </p>
              </div>
            )}

            {/* Main encouragement message */}
            <p className="text-slate-600 dark:text-slate-400 mb-4 text-lg">
              {t('study.allCaughtUp.noCardsMessage')}
            </p>

            {/* Next review information */}
            {hasNextReview && nextReviewTime ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">{t('study.session.nextReview', { time: nextReviewTime })}</span>
                </p>
                <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                  {t('study.allCaughtUp.nextReviewMessage', { time: nextReviewTime })}
                </p>
              </div>
            ) : totalCards > 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
                <p className="text-slate-600 dark:text-slate-400">
                  All {totalCards} card{totalCards === 1 ? '' : 's'} in this deck {totalCards === 1 ? 'is' : 'are'} up to date.
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">
                  Add new cards to continue expanding your knowledge!
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
                <p className="text-slate-600 dark:text-slate-400">
                  {t('study.allCaughtUp.emptyDeckMessage')}
                </p>
              </div>
            )}

            <button
              onClick={onExit}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
              aria-label={t('study.deckNotFound.backToDashboard')}
            >
              {t('study.deckNotFound.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = studyQueue[currentCardIndex];

  // Additional safety check - if currentCard is undefined, show loading
  if (!currentCard) {
    return <FlashcardSkeleton />;
  }

  // Show summary if session is complete
  if (showSummary && deck) {
    return (
      <PostSessionSummary
        deckId={deckId}
        deckName={deck.name}
        cardsReviewed={cardsReviewed}
        studyMode="spaced-repetition"
        sessionDuration={sessionStartTime > 0 ? Date.now() - sessionStartTime : undefined}
        onReturnToDashboard={onExit}
        onContinueStudying={handleContinueStudying}
      />
    );
  }

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-4" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header with deck name, help icon, and exit button */}
      <div className="flex items-center justify-between flex-shrink-0 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {t('study.spacedRepetitionMode')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpIcon onClick={() => setShowKeyboardHelp(true)} />
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
            aria-label={t('study.exitStudy')}
          >
            {t('study.exitStudy')}
          </button>
        </div>
      </div>

      {/* Study Progress Bar */}
      <StudyProgressBar
        currentPosition={currentCardIndex + 1}
        totalCards={studyQueue.length}
        isCompleted={false}
        className="flex-shrink-0 mb-6"
      />

      {/* Flashcard with 3D Flip Animation - Takes remaining height */}
      <div
        className="flashcard-container flex-1 cursor-pointer"
        onClick={handleFlipCard}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Click to show question" : "Click to show answer"}
        {...gestureHandlers}
      >
        <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front side (Question) */}
          <div className="flashcard-side flashcard-front bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col text-center">
            {/* Content area with proper spacing */}
            <div className="flex-1 flex flex-col min-h-0 w-full pointer-events-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-400">{t('forms.quickAddCard.front')}</h2>
                <DifficultyIndicator
                  repetition={currentCard.repetition}
                  easeFactor={currentCard.easeFactor}
                  interval={currentCard.interval}
                  variant="compact"
                  showLabel={true}
                />
              </div>
              {/* Scrollable text content area */}
              <div className="flex-1 overflow-y-auto px-2 py-4" style={{ minHeight: 0 }}>
                <p className="text-2xl leading-relaxed text-slate-900 dark:text-slate-100 break-words text-center">{currentCard.front}</p>
              </div>
            </div>
            {/* Fixed bottom section for controls */}
            <div className="flex-shrink-0 mt-6">
              {/* Show Answer button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFlipCard();
                }}
                className="bg-dark dark:bg-light text-light dark:text-dark text-lg px-8 py-4 rounded-md border-2 hover:opacity-80 transition-opacity font-medium pointer-events-auto"
                aria-label={t('study.showAnswer')}
              >
                {t('study.showAnswer')}
              </button>
              {/* Flip hint with gesture support */}
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-4 pointer-events-none">
                {isTouchDevice()
                  ? 'Tap or swipe left to show answer'
                  : 'Click anywhere or press Space/Enter to flip'
                }
              </div>
            </div>
          </div>

          {/* Back side (Answer) */}
          <div className="flashcard-side flashcard-back bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col text-center">
            {/* Content area with proper spacing */}
            <div className="flex-1 flex flex-col min-h-0 w-full pointer-events-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-400">{t('forms.quickAddCard.back')}</h2>
                <DifficultyIndicator
                  repetition={currentCard.repetition}
                  easeFactor={currentCard.easeFactor}
                  interval={currentCard.interval}
                  variant="compact"
                  showLabel={true}
                />
              </div>
              {/* Scrollable text content area */}
              <div className="flex-1 overflow-y-auto px-2 py-2" style={{ minHeight: 0 }}>
                <p className="text-2xl leading-relaxed text-slate-900 dark:text-slate-100 break-words text-center">{currentCard.back}</p>
              </div>
            </div>
            {/* Fixed bottom section for controls */}
            <div className="flex-shrink-0 mt-6">
              {/* Quality rating buttons */}
              <div className="flex flex-col gap-4 w-full max-w-md mx-auto pointer-events-auto">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                How well did you know this?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(0);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Again - I didn't know this at all (Press 1)"
                >
                  <span className="flex items-center justify-between">
                    {t('study.difficulty.again')}
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-red-600 bg-opacity-50 rounded border border-red-400">1</kbd>
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(3);
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Hard - I knew this with difficulty (Press 2)"
                >
                  <span className="flex items-center justify-between">
                    {t('study.difficulty.hard')}
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-orange-600 bg-opacity-50 rounded border border-orange-400">2</kbd>
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(4);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Good - I knew this well (Press 3)"
                >
                  <span className="flex items-center justify-between">
                    {t('study.difficulty.good')}
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-green-600 bg-opacity-50 rounded border border-green-400">3</kbd>
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleReview(5);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Easy - I knew this perfectly (Press 4)"
                >
                  <span className="flex items-center justify-between">
                    {t('study.difficulty.easy')}
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 bg-opacity-50 rounded border border-blue-400">4</kbd>
                  </span>
                </button>
              </div>
              {/* Flip hint with gesture support */}
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-4 pointer-events-none">
                {isTouchDevice()
                  ? 'Swipe left to flip • Swipe right for Easy • Swipe down for Again'
                  : 'Click anywhere or press Space/Enter to flip back'
                }
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={getKeyboardShortcuts('spaced-repetition')}
        studyMode="spaced-repetition"
      />

      {/* Gesture Tutorial */}
      <GestureTutorial
        isOpen={gestureTutorial.isOpen}
        onClose={gestureTutorial.closeTutorial}
        studyMode="spaced-repetition"
      />
    </div>
  );
}

export default SpacedRepetitionMode;
