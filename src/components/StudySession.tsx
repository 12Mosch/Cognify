import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";

interface StudySessionProps {
  deckId: Id<"decks">;
  onExit: () => void;
}

interface Card {
  _id: Id<"cards">;
  _creationTime: number;
  deckId: Id<"decks">;
  front: string;
  back: string;
}

export function StudySession({ deckId, onExit }: StudySessionProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  const deck = useQuery(api.decks.getDeckById, { deckId });
  // Note: We'll need to create a query for cards in the future
  // For now, we'll use mock data to demonstrate the analytics integration
  const cards: Card[] = []; // This would be replaced with actual card query

  const { trackStudySessionStarted } = useAnalytics();

  // Reset analytics gate whenever we switch decks
  useEffect(() => {
    setSessionStarted(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
  }, [deckId]);

  // Track study session start when component mounts and deck is loaded
  useEffect(() => {
    if (deck && !sessionStarted) {
      trackStudySessionStarted(deckId, deck.name, cards.length);
      setSessionStarted(true);
    }
  }, [deck, deckId, cards.length, trackStudySessionStarted, sessionStarted]);

  // Loading state
  if (deck === undefined) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mx-auto mb-4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-4">Loading study session...</p>
          </div>
        </div>
      </div>
    );
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

  const handleNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      {/* Header */}
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
        >
          Exit Study Session
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div 
          className="bg-dark dark:bg-light h-2 rounded-full transition-all duration-300"
          style={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
        ></div>
      </div>

      {/* Flashcard */}
      <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 min-h-[300px] flex flex-col justify-center items-center text-center">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {showAnswer ? "Answer" : "Question"}
          </h2>
          <p className="text-xl">
            {showAnswer ? currentCard.back : currentCard.front}
          </p>
        </div>

        {!showAnswer ? (
          <button
            onClick={handleShowAnswer}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
          >
            Show Answer
          </button>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={handlePreviousCard}
              disabled={currentCardIndex === 0}
              className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={
                currentCardIndex === cards.length - 1
                  ? onExit
                  : handleNextCard
              }
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
            >
              {currentCardIndex === cards.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
