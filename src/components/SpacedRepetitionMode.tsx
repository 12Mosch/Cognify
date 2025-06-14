import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";

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
export function SpacedRepetitionMode({ deckId, onExit }: SpacedRepetitionModeProps) {
  // State management for the study session
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [studyQueue, setStudyQueue] = useState<Card[]>([]);
  const [sessionStarted, setSessionStarted] = useState<boolean>(false);

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
      }
    }
  }, [studyQueueData, sessionStarted, deckId, deck, trackStudySessionStarted]);

  // Reset state when deck changes
  useEffect(() => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setStudyQueue([]);
    setSessionStarted(false);
  }, [deckId]);

  /**
   * Handle flipping the current card between front and back
   */
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  /**
   * Handle keyboard shortcuts for flipping cards
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      handleFlipCard();
    }
  };

  /**
   * Handle card review with quality rating
   */
  const handleReview = async (quality: number) => {
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
      if (nextIndex >= studyQueue.length) {
        // Session complete
        onExit();
      } else {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error("Error reviewing card:", error);
      // Continue to next card even if there's an error
      const nextIndex = currentCardIndex + 1;
      if (nextIndex >= studyQueue.length) {
        onExit();
      } else {
        setCurrentCardIndex(nextIndex);
        setIsFlipped(false);
      }
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

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header with deck name and exit button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Spaced Repetition Mode
          </p>
        </div>
        <button
          onClick={onExit}
          className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          aria-label="Exit spaced repetition mode"
        >
          Exit Study
        </button>
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
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  aria-label="Again - I didn't know this at all"
                >
                  Again
                </button>
                <button
                  onClick={() => { void handleReview(3); }}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  aria-label="Hard - I knew this with difficulty"
                >
                  Hard
                </button>
                <button
                  onClick={() => { void handleReview(4); }}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  aria-label="Good - I knew this well"
                >
                  Good
                </button>
                <button
                  onClick={() => { void handleReview(5); }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  aria-label="Easy - I knew this perfectly"
                >
                  Easy
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
    </div>
  );
}
