import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * Props interface for the StudyMode component
 */
interface StudyModeProps {
  /** The ID of the deck to study */
  deckId: Id<"decks">;
  /** Callback function to exit the study mode */
  onExit: () => void;
}



/**
 * StudyMode Component - A basic study interface for flashcards
 * 
 * This component provides a simple study experience where users can:
 * - View flashcards one at a time
 * - Flip cards to see the answer
 * - Navigate through cards sequentially
 * - Track their progress through the deck
 * 
 * Features:
 * - Responsive design that works on different screen sizes
 * - Loading states while fetching data
 * - Error handling for missing decks or empty card sets
 * - Accessible UI with proper ARIA labels
 * - Progress tracking with visual indicators
 */
export function StudyMode({ deckId, onExit }: StudyModeProps) {
  // State management for the study session
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Fetch deck and cards data using Convex queries
  // These queries automatically handle loading states and reactivity
  const deck = useQuery(api.decks.getDeckById, { deckId });
  const cards = useQuery(api.cards.getCardsForDeck, { deckId });

  /**
   * Handle flipping the current card between front and back
   */
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  /**
   * Handle advancing to the next card
   * Resets the flip state and advances the index
   * Loops back to first card if at the end
   */
  const handleNextCard = () => {
    setIsFlipped(false); // Always show front of next card
    setCurrentCardIndex((prevIndex) => {
      // Loop back to first card if at the end
      return prevIndex >= (cards?.length ?? 0) - 1 ? 0 : prevIndex + 1;
    });
  };

  // Loading state - show while data is being fetched
  if (deck === undefined || cards === undefined) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            {/* Animated loading skeleton */}
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-4">Loading study mode...</p>
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

  // Empty deck state - no cards to study
  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        {/* Header with deck name and exit button */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
            aria-label="Exit study mode"
          >
            Exit Study Mode
          </button>
        </div>
        
        {/* Empty state message */}
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
              {/* Card icon */}
              <svg 
                className="w-12 h-12 text-slate-400 dark:text-slate-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">No cards in this deck</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Add some flashcards to this deck before starting a study session.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get the current card to display
  const currentCard = cards[currentCardIndex];

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header with deck name, progress, and exit button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Card {currentCardIndex + 1} of {cards.length}
          </p>
        </div>
        <button
          onClick={onExit}
          className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          aria-label="Exit study mode"
        >
          Exit Study Mode
        </button>
      </div>

      {/* Progress bar showing current position in deck */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div 
          className="bg-dark dark:bg-light h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
          role="progressbar"
          aria-valuenow={currentCardIndex + 1}
          aria-valuemin={1}
          aria-valuemax={cards.length}
          aria-label={`Progress: ${currentCardIndex + 1} of ${cards.length} cards`}
        ></div>
      </div>

      {/* Flashcard display area */}
      <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 min-h-[300px] flex flex-col justify-center items-center text-center">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {isFlipped ? "Answer" : "Question"}
          </h2>
          <p className="text-xl">
            {isFlipped ? currentCard.back : currentCard.front}
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex gap-4">
          <button
            onClick={handleFlipCard}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
            aria-label={isFlipped ? "Show question" : "Show answer"}
          >
            {isFlipped ? "Show Question" : "Show Answer"}
          </button>
          <button
            onClick={handleNextCard}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-6 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium"
            aria-label="Next card"
          >
            Next Card
          </button>
        </div>
      </div>
    </div>
  );
}
