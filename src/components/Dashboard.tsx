import { useState, Suspense, lazy, memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CreateDeckForm } from "./CreateDeckForm";
import { QuickAddCardForm } from "./QuickAddCardForm";
import { Id } from "../../convex/_generated/dataModel";
import { DeckListSkeleton, GenericSkeleton } from "./skeletons/SkeletonComponents";
import { toastHelpers } from "../lib/toast";

// Lazy-loaded components for better performance
const DeckView = lazy(() => import("./DeckView"));
const StudyModeSelector = lazy(() => import("./StudyModeSelector"));
const BasicStudyMode = lazy(() => import("./BasicStudyMode"));
const SpacedRepetitionMode = lazy(() => import("./SpacedRepetitionMode"));
const StatisticsDashboard = lazy(() => import("./StatisticsDashboard"));

// Loading fallback component with skeleton loaders
function LoadingFallback({ type = "default" }: { type?: "default" | "deck-list" | "flashcard" | "deck-view" }) {
  return <GenericSkeleton type={type} />;
}

interface Deck {
  _id: Id<"decks">;
  _creationTime: number;
  userId: string;
  name: string;
  description: string;
  cardCount: number;
}

export function Dashboard() {
  const [studyingDeckId, setStudyingDeckId] = useState<Id<"decks"> | null>(null);
  const [studyMode, setStudyMode] = useState<'basic' | 'spaced-repetition' | null>(null);
  const [selectingStudyMode, setSelectingStudyMode] = useState<Id<"decks"> | null>(null);
  const [viewingDeckId, setViewingDeckId] = useState<Id<"decks"> | null>(null);
  const [showingStatistics, setShowingStatistics] = useState(false);
  const decks = useQuery(api.decks.getDecksForUser);

  // If user is viewing statistics, show the StatisticsDashboard component
  if (showingStatistics) {
    return (
      <Suspense fallback={<LoadingFallback type="default" />}>
        <StatisticsDashboard onBack={() => setShowingStatistics(false)} />
      </Suspense>
    );
  }

  // If user is viewing a deck, show the DeckView component
  if (viewingDeckId) {
    return (
      <Suspense fallback={<LoadingFallback type="deck-view" />}>
        <DeckView
          deckId={viewingDeckId}
          onBack={() => setViewingDeckId(null)}
        />
      </Suspense>
    );
  }

  // If user is selecting a study mode, show the StudyModeSelector
  if (selectingStudyMode) {
    const selectedDeck = decks?.find(deck => deck._id === selectingStudyMode);
    return (
      <Suspense fallback={<LoadingFallback type="default" />}>
        <StudyModeSelector
          deckId={selectingStudyMode}
          deckName={selectedDeck?.name || "Unknown Deck"}
          onSelectMode={(mode: 'basic' | 'spaced-repetition') => {
            setStudyMode(mode);
            setStudyingDeckId(selectingStudyMode);
            setSelectingStudyMode(null);
          }}
          onCancel={() => setSelectingStudyMode(null)}
        />
      </Suspense>
    );
  }

  // If user is in a study session, show the appropriate study component
  if (studyingDeckId && studyMode) {
    const handleExitStudy = () => {
      setStudyingDeckId(null);
      setStudyMode(null);
    };

    if (studyMode === 'spaced-repetition') {
      return (
        <Suspense fallback={<LoadingFallback type="flashcard" />}>
          <SpacedRepetitionMode
            deckId={studyingDeckId}
            onExit={handleExitStudy}
          />
        </Suspense>
      );
    } else {
      return (
        <Suspense fallback={<LoadingFallback type="flashcard" />}>
          <BasicStudyMode
            deckId={studyingDeckId}
            onExit={handleExitStudy}
          />
        </Suspense>
      );
    }
  }

  // Loading state
  if (decks === undefined) {
    return <DeckListSkeleton />;
  }

  // Success handlers with toast notifications
  const handleCreateSuccess = (deckName?: string) => {
    // The query will automatically refetch due to Convex reactivity
    toastHelpers.deckCreated(deckName);
  };

  const handleCardCreateSuccess = () => {
    // The query will automatically refetch due to Convex reactivity
    toastHelpers.cardCreated();
  };

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Flashcard Decks</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {decks.length === 0
              ? "Create your first deck to get started"
              : `${decks.length} deck${decks.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowingStatistics(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            aria-label="View learning statistics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Statistics
          </button>
          <QuickAddCardForm onSuccess={handleCardCreateSuccess} />
          <CreateDeckForm onSuccess={handleCreateSuccess} />
        </div>
      </div>

      {/* Decks Grid */}
      {decks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck) => (
            <DeckCard
              key={deck._id}
              deck={deck}
              onStartStudy={() => setSelectingStudyMode(deck._id)}
              onManageCards={() => setViewingDeckId(deck._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-center max-w-md">
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
        <h3 className="text-xl font-semibold mb-2">No decks yet</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Create your first flashcard deck to start learning. You can add cards, study, and track your progress.
        </p>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Click "Create New Deck" above to get started
        </div>
      </div>
    </div>
  );
});

const DeckCard = memo(function DeckCard({ deck, onStartStudy, onManageCards }: { deck: Deck; onStartStudy: () => void; onManageCards: () => void }) {
  // No longer need to query cards - we have the count directly from the deck

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors group">
      <div className="flex flex-col h-full">
        {/* Deck Header */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors line-clamp-2">
            {deck.name}
          </h3>
          
          {deck.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-3">
              {deck.description}
            </p>
          )}
        </div>

        {/* Deck Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Created {formatDate(deck._creationTime)}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">
              {`${deck.cardCount} card${deck.cardCount === 1 ? '' : 's'}`}
            </span>
            <button
              onClick={onManageCards}
              className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded hover:opacity-80 transition-opacity font-medium"
              aria-label={`Manage cards in ${deck.name} deck`}
            >
              Manage
            </button>
            <button
              onClick={onStartStudy}
              className="text-xs bg-dark dark:bg-light text-light dark:text-dark px-3 py-1 rounded hover:opacity-80 transition-opacity font-medium"
              aria-label={`Study ${deck.name} deck`}
            >
              Study
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
