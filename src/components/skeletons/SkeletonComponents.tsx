import { memo } from "react";

/**
 * Skeleton Components for Loading States
 * 
 * These components provide skeleton loaders to replace text-based loading states
 * throughout the flashcard application, reducing perceived loading time and
 * improving user experience.
 */

// Base skeleton element with shimmer animation
const SkeletonElement = memo(function SkeletonElement({
  className = "",
  "aria-label": ariaLabel
}: {
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700 animate-shimmer rounded ${className}`}
      aria-label={ariaLabel}
      aria-hidden="true"
    />
  );
});

/**
 * Skeleton for individual deck cards in the dashboard grid
 */
export const DeckCardSkeleton = memo(function DeckCardSkeleton() {
  return (
    <div
      className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700"
      role="status"
      aria-busy="true"
      aria-label="Loading deck"
    >
      <div className="flex flex-col h-full">
        {/* Deck Header */}
        <div className="flex-1">
          {/* Deck title */}
          <SkeletonElement className="h-6 w-3/4 mb-2" />

          {/* Deck description */}
          <SkeletonElement className="h-4 w-full mb-2" />
          <SkeletonElement className="h-4 w-2/3 mb-4" />
        </div>

        {/* Deck Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          {/* Creation date */}
          <SkeletonElement className="h-3 w-24" />

          {/* Card count and buttons */}
          <div className="flex items-center gap-2">
            <SkeletonElement className="h-6 w-16" />
            <SkeletonElement className="h-6 w-16" />
            <SkeletonElement className="h-6 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for the dashboard deck list
 */
export const DeckListSkeleton = memo(function DeckListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="flex flex-col gap-8 max-w-6xl mx-auto"
      role="status"
      aria-busy="true"
      aria-label="Loading decks"
    >
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <SkeletonElement className="h-9 w-64 mb-2" />
          <SkeletonElement className="h-5 w-32" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <SkeletonElement className="h-12 w-36" />
          <SkeletonElement className="h-12 w-32" />
        </div>
      </div>

      {/* Deck grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }, (_, i) => (
          <DeckCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

/**
 * Skeleton for flashcard content in study modes
 */
export const FlashcardSkeleton = memo(function FlashcardSkeleton() {
  return (
    <div
      className="flex flex-col gap-8 max-w-4xl mx-auto"
      role="status"
      aria-busy="true"
      aria-label="Loading flashcard"
    >
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <SkeletonElement className="h-8 w-24" />
        <div className="flex items-center gap-4">
          <SkeletonElement className="h-6 w-20" />
          <SkeletonElement className="h-8 w-16" />
        </div>
      </div>

      {/* Progress bar skeleton */}
      <div className="w-full">
        <SkeletonElement className="h-2 w-full rounded-full" />
      </div>

      {/* Flashcard skeleton */}
      <div className="min-h-[400px] bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
        <div className="flex flex-col justify-center items-center text-center h-full">
          <SkeletonElement className="h-6 w-20 mb-6" />
          <SkeletonElement className="h-8 w-3/4 mb-4" />
          <SkeletonElement className="h-6 w-1/2 mb-2" />
          <SkeletonElement className="h-6 w-2/3" />
        </div>
      </div>

      {/* Controls skeleton */}
      <div className="flex justify-center gap-4">
        <SkeletonElement className="h-12 w-24" />
        <SkeletonElement className="h-12 w-20" />
      </div>
    </div>
  );
});

/**
 * Skeleton for deck view (deck management page)
 */
export const DeckViewSkeleton = memo(function DeckViewSkeleton({ cardCount = 6 }: { cardCount?: number }) {
  return (
    <div
      className="flex flex-col gap-8 max-w-6xl mx-auto"
      role="status"
      aria-busy="true"
      aria-label="Loading deck view"
    >
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <SkeletonElement className="h-6 w-16" />
          <div>
            <SkeletonElement className="h-9 w-48 mb-2" />
            <SkeletonElement className="h-5 w-32 mb-1" />
            <SkeletonElement className="h-4 w-20" />
          </div>
        </div>
        <SkeletonElement className="h-12 w-24" />
      </div>

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: cardCount }, (_, i) => (
          <CardItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
});

/**
 * Skeleton for individual card items in deck view
 */
const CardItemSkeleton = memo(function CardItemSkeleton() {
  return (
    <div
      className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700"
      role="status"
      aria-busy="true"
      aria-label="Loading card"
    >
      <div className="flex flex-col h-full min-h-[200px]">
        {/* Card content skeleton */}
        <div className="flex-1 mb-4">
          <SkeletonElement className="h-4 w-12 mb-2" />
          <SkeletonElement className="h-6 w-full mb-2" />
          <SkeletonElement className="h-6 w-3/4 mb-2" />
          <SkeletonElement className="h-6 w-1/2" />
        </div>

        {/* Card actions skeleton */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <SkeletonElement className="h-4 w-20" />
          <div className="flex gap-2">
            <SkeletonElement className="h-4 w-8" />
            <SkeletonElement className="h-4 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Skeleton for small statistics or counts
 */
export const StatsSkeleton = memo(function StatsSkeleton() {
  return (
    <div
      className="flex items-center gap-2"
      role="status"
      aria-busy="true"
      aria-label="Loading statistics"
    >
      <SkeletonElement className="h-4 w-8" />
      <SkeletonElement className="h-4 w-12" />
    </div>
  );
});

/**
 * Generic loading fallback skeleton that adapts to different contexts
 */
export const GenericSkeleton = memo(function GenericSkeleton({
  type = "default"
}: {
  type?: "default" | "deck-list" | "flashcard" | "deck-view"
}) {
  switch (type) {
    case "deck-list":
      return <DeckListSkeleton />;
    case "flashcard":
      return <FlashcardSkeleton />;
    case "deck-view":
      return <DeckViewSkeleton />;
    default:
      return (
        <div
          className="flex flex-col gap-8 max-w-4xl mx-auto"
          role="status"
          aria-busy="true"
          aria-label="Loading"
        >
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <SkeletonElement className="h-8 w-48 mx-auto mb-4" />
              <SkeletonElement className="h-4 w-32 mx-auto" />
            </div>
          </div>
        </div>
      );
  }
});
