import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import HelpIcon from "./HelpIcon";
import PostSessionSummary from "./PostSessionSummary";
import { getKeyboardShortcuts, isShortcutKey } from "../types/keyboard";

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

  // Fetch deck and study queue using Convex queries
  const deck = useQuery(api.decks.getDeckById, { deckId });
  const studyQueueData = useQuery(api.spacedRepetition.getStudyQueue, {
    deckId,
    shuffle: true // Enable shuffling for varied study experience
  });

  // Mutations for card operations
  const reviewCard = useMutation(api.spacedRepetition.reviewCard);
  const initializeCard = useMutation(api.spacedRepetition.initializeCardForSpacedRepetition);

  const { trackStudySessionStarted } = useAnalytics();

  // Initialize study queue when data is loaded
  useEffect(() => {
    if (studyQueueData && !sessionStarted) {
      setStudyQueue(studyQueueData);

      if (studyQueueData.length > 0 && deck) {
        trackStudySessionStarted(deckId, deck.name, studyQueueData.length);
        setSessionStarted(true);
        setSessionStartTime(Date.now());
      }
    }
  }, [studyQueueData, sessionStarted, deckId, deck, trackStudySessionStarted]);

  /**
   * Handle flipping the current card between front and back
   */
  const handleFlipCard = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  /**
   * Handle card review with quality rating
   */
  const handleReview = useCallback(async (quality: number) => {
    if (studyQueue.length === 0) return;

    const currentCard = studyQueue[currentCardIndex];

    try {
      // Initialize card for spaced repetition if needed
      if (currentCard.repetition === undefined) {
        await initializeCard({ cardId: currentCard._id });
      }

      // Review the card with the given quality
      await reviewCard({ cardId: currentCard._id, quality });

      // Move to next card or finish session
      const nextIndex = currentCardIndex + 1;
      setCardsReviewed(prev => prev + 1);

      if (nextIndex >= studyQueue.length) {
        // Session complete - show summary
        setShowSummary(true);
      } else {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error("Error reviewing card:", error);
      // Continue to next card even if there's an error
      const nextIndex = currentCardIndex + 1;
      setCardsReviewed(prev => prev + 1);

      if (nextIndex >= studyQueue.length) {
        setShowSummary(true);
      } else {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
      }
    }
  }, [studyQueue, currentCardIndex, initializeCard, reviewCard]);

  // Reset state when deck changes
  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyQueue([]);
    setSessionStarted(false);
    setShowSummary(false);
    setSessionStartTime(0);
    setCardsReviewed(0);
  }, [deckId]);

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
  }, [isFlipped, studyQueue.length, showKeyboardHelp, handleFlipCard, handleReview]);

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
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-4">Loading spaced repetition session...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state - deck not found
  if (deck === null) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Deck Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The deck you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={onExit}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
              aria-label="Return to dashboard"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No cards to study state
  if (studyQueueData && studyQueueData.length === 0) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        {/* Header with deck name and exit button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
            aria-label="Exit spaced repetition mode"
          >
            Exit Study
          </button>
        </div>

        {/* No cards message */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">All Caught Up! 🎉</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You have no cards due for review right now. Great job staying on top of your studies!
            </p>
            <p className="text-slate-500 dark:text-slate-500 text-sm mb-6">
              Come back later when more cards are due for review, or add new cards to this deck.
            </p>
            <button
              onClick={onExit}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
              aria-label="Return to dashboard"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = studyQueue[currentCardIndex];

  // Additional safety check - if currentCard is undefined, show loading
  if (!currentCard) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-4">Preparing your study session...</p>
          </div>
        </div>
      </div>
    );
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
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header with deck name, help icon, and exit button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Spaced Repetition Mode
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpIcon onClick={() => setShowKeyboardHelp(true)} />
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
            aria-label="Exit spaced repetition mode"
          >
            Exit Study
          </button>
        </div>
      </div>

      {/* Flashcard with 3D Flip Animation */}
      <div
        className="flashcard-container min-h-[400px] cursor-pointer"
        onClick={handleFlipCard}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Click to show question" : "Click to show answer"}
      >
        <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front side (Question) */}
          <div className="flashcard-side flashcard-front bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col justify-center items-center text-center">
            <div className="mb-8 w-full pointer-events-none">
              <h2 className="text-lg font-semibold mb-6 text-slate-600 dark:text-slate-400">Question</h2>
              <p className="text-2xl leading-relaxed">{currentCard.front}</p>
            </div>
            {/* Show Answer button */}
            <button
              onClick={handleFlipCard}
              className="bg-dark dark:bg-light text-light dark:text-dark text-lg px-8 py-4 rounded-md border-2 hover:opacity-80 transition-opacity font-medium pointer-events-auto"
              aria-label="Show answer"
            >
              Show Answer
            </button>
            {/* Flip hint */}
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-4 pointer-events-none">
              Click anywhere or press Space/Enter to flip
            </div>
          </div>

          {/* Back side (Answer) */}
          <div className="flashcard-side flashcard-back bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col justify-center items-center text-center">
            <div className="mb-8 w-full pointer-events-none">
              <h2 className="text-lg font-semibold mb-6 text-slate-600 dark:text-slate-400">Answer</h2>
              <p className="text-2xl leading-relaxed">{currentCard.back}</p>
            </div>
            {/* Quality rating buttons */}
            <div className="flex flex-col gap-4 w-full max-w-md pointer-events-auto">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                How well did you know this?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { void handleReview(0); }}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Again - I didn't know this at all (Press 1)"
                >
                  <span className="flex items-center justify-between">
                    Again
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-red-600 bg-opacity-50 rounded border border-red-400">1</kbd>
                  </span>
                </button>
                <button
                  onClick={() => { void handleReview(3); }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Hard - I knew this with difficulty (Press 2)"
                >
                  <span className="flex items-center justify-between">
                    Hard
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-orange-600 bg-opacity-50 rounded border border-orange-400">2</kbd>
                  </span>
                </button>
                <button
                  onClick={() => { void handleReview(4); }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Good - I knew this well (Press 3)"
                >
                  <span className="flex items-center justify-between">
                    Good
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-green-600 bg-opacity-50 rounded border border-green-400">3</kbd>
                  </span>
                </button>
                <button
                  onClick={() => { void handleReview(5); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md font-medium transition-colors relative"
                  aria-label="Easy - I knew this perfectly (Press 4)"
                >
                  <span className="flex items-center justify-between">
                    Easy
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-600 bg-opacity-50 rounded border border-blue-400">4</kbd>
                  </span>
                </button>
              </div>
            </div>
            {/* Flip hint */}
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-4 pointer-events-none">
              Click anywhere or press Space/Enter to flip back
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
    </div>
  );
}

export default SpacedRepetitionMode;
