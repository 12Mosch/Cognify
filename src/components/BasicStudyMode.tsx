import { useEffect, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import HelpIcon from "./HelpIcon";
import PostSessionSummary from "./PostSessionSummary";
import { getKeyboardShortcuts, isShortcutKey } from "../types/keyboard";
import { FlashcardSkeleton } from "./skeletons/SkeletonComponents";

interface BasicStudyModeProps {
  deckId: Id<"decks">;
  onExit: () => void;
}

function BasicStudyMode({ deckId, onExit }: BasicStudyModeProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(0);

  const deck = useQuery(api.decks.getDeckById, { deckId });
  const cards = useQuery(api.cards.getCardsForDeck, { deckId });

  const { trackStudySessionStarted } = useAnalytics();

  // Calculate cards reviewed based on current position (always accurate regardless of navigation)
  const cardsReviewed = currentCardIndex + 1;

  // Define callback functions first (before any early returns)
  const handleNextCard = useCallback(() => {
    setCurrentCardIndex(prev => {
      if (cards && prev < cards.length - 1) {
        setIsFlipped(false);
        return prev + 1;
      }
      return prev;
    });
  }, [cards]);

  // Handle finishing the study session
  const handleFinishSession = useCallback(() => {
    setShowSummary(true);
  }, []);

  const handlePreviousCard = useCallback(() => {
    setCurrentCardIndex(prev => {
      if (prev > 0) {
        setIsFlipped(false);
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleFlipCard = useCallback(() => {
    // Don't flip if modal is open
    if (showKeyboardHelp) return;
    setIsFlipped(prev => !prev);
  }, [showKeyboardHelp]);

  // Reset analytics gate whenever we switch decks
  useEffect(() => {
    setSessionStarted(false);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowSummary(false);
    setSessionStartTime(0);
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

      // Handle navigation shortcuts
      if (isShortcutKey(event, '←')) {
        event.preventDefault();
        handlePreviousCard();
      } else if (isShortcutKey(event, '→')) {
        event.preventDefault();
        handleNextCard();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
    // handleFlipCard, handlePreviousCard, handleNextCard are intentionally omitted - they're stabilized with useCallback([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showKeyboardHelp]);

  // Track study session start when component mounts and deck is loaded
  useEffect(() => {
    if (deck && cards && !sessionStarted) {
      trackStudySessionStarted(deckId, deck.name, cards.length);
      setSessionStarted(true);
      setSessionStartTime(Date.now());
    }
  }, [deck, deckId, cards, trackStudySessionStarted, sessionStarted]);

  // Loading state
  if (deck === undefined || cards === undefined) {
    return <FlashcardSkeleton />;
  }

  // Deck not found
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
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No cards in deck
  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
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

  const currentCard = cards[currentCardIndex];

  // Handle keyboard shortcuts for flipping cards (kept for card-specific events)
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      handleFlipCard();
    }
  };

  // Show summary if session is complete
  if (showSummary && deck) {
    return (
      <PostSessionSummary
        deckId={deckId}
        deckName={deck.name}
        cardsReviewed={cardsReviewed}
        studyMode="basic"
        sessionDuration={sessionStartTime > 0 ? Date.now() - sessionStartTime : undefined}
        onReturnToDashboard={onExit}
        onContinueStudying={undefined} // Basic mode doesn't support continue studying
      />
    );
  }

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-4" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mb-4">
        <div>
          <h1 className="text-3xl font-bold">{deck.name}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Card {currentCardIndex + 1} of {cards.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpIcon onClick={() => setShowKeyboardHelp(true)} />
          <button
            onClick={onExit}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            Exit Study Session
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 flex-shrink-0 mb-6">
        <div
          className="bg-dark dark:bg-light h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
        ></div>
      </div>

      {/* Flashcard with 3D Flip Animation - Takes remaining height */}
      <div
        className="flashcard-container flex-1 cursor-pointer mb-6"
        onClick={handleFlipCard}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={isFlipped ? "Click to show question" : "Click to show answer"}
      >
        <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front side (Question) */}
          <div className="flashcard-side flashcard-front bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col text-center">
            {/* Content area with proper spacing */}
            <div className="flex-1 flex flex-col min-h-0 w-full pointer-events-none">
              <h2 className="text-lg font-semibold mb-4 text-slate-600 dark:text-slate-400">Question</h2>
              {/* Scrollable text content area */}
              <div className="flex-1 overflow-y-auto px-2 py-4" style={{ minHeight: 0 }}>
                <p className="text-xl text-slate-900 dark:text-slate-100 break-words text-center">{currentCard.front}</p>
              </div>
            </div>
            {/* Fixed bottom section for controls */}
            <div className="flex-shrink-0 mt-4">
              {/* Flip hint */}
              <div className="text-sm text-slate-500 dark:text-slate-400 pointer-events-none">
                Click anywhere or press Space/Enter to flip
              </div>
            </div>
          </div>

          {/* Back side (Answer) */}
          <div className="flashcard-side flashcard-back bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col text-center">
            {/* Content area with proper spacing */}
            <div className="flex-1 flex flex-col min-h-0 w-full pointer-events-none">
              <h2 className="text-lg font-semibold mb-4 text-slate-600 dark:text-slate-400">Answer</h2>
              {/* Scrollable text content area */}
              <div className="flex-1 overflow-y-auto px-2 py-4" style={{ minHeight: 0 }}>
                <p className="text-xl text-slate-900 dark:text-slate-100 break-words text-center">{currentCard.back}</p>
              </div>
            </div>
            {/* Fixed bottom section for controls */}
            <div className="flex-shrink-0 mt-4">
              {/* Flip hint */}
              <div className="text-sm text-slate-500 dark:text-slate-400 pointer-events-none">
                Click anywhere or press Space/Enter to flip
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex gap-4 justify-center flex-shrink-0">
        <button
          onClick={handlePreviousCard}
          disabled={currentCardIndex === 0}
          className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous card (Press Left Arrow)"
        >
          <span className="flex items-center gap-2">
            Previous
            <kbd className="px-1.5 py-0.5 text-xs bg-slate-300 dark:bg-slate-600 rounded border border-slate-400 dark:border-slate-500">←</kbd>
          </span>
        </button>
        <button
          onClick={
            currentCardIndex === cards.length - 1
              ? handleFinishSession
              : handleNextCard
          }
          className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
          aria-label={currentCardIndex === cards.length - 1 ? "Finish study session" : "Next card (Press Right Arrow)"}
        >
          <span className="flex items-center gap-2">
            {currentCardIndex === cards.length - 1 ? "Finish" : "Next"}
            {currentCardIndex !== cards.length - 1 && (
              <kbd className="px-1.5 py-0.5 text-xs bg-slate-600 dark:bg-slate-300 bg-opacity-50 rounded border border-slate-400 dark:border-slate-500">→</kbd>
            )}
          </span>
        </button>
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={getKeyboardShortcuts('basic')}
        studyMode="basic"
      />
    </div>
  );
}

export default BasicStudyMode;
