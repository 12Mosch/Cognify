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
	"aria-label": ariaLabel,
}: {
	className?: string;
	"aria-label"?: string;
}) {
	return (
		<div
			aria-hidden="true"
			className={`animate-shimmer rounded bg-slate-200 dark:bg-slate-700 ${className}`}
			title={ariaLabel}
		/>
	);
});

/**
 * Skeleton for individual deck cards in the dashboard grid
 */
export const DeckCardSkeleton = memo(function DeckCardSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading deck"
			className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-700/60 dark:from-slate-800 dark:to-slate-900"
		>
			<div className="flex h-full flex-col">
				{/* Deck Header */}
				<div className="mb-6 flex-1">
					{/* Deck title */}
					<SkeletonElement className="mb-4 h-7 w-3/4" />

					{/* Deck description */}
					<SkeletonElement className="mb-2 h-4 w-full" />
					<SkeletonElement className="h-4 w-2/3" />
				</div>

				{/* Deck Metadata */}
				<div className="mb-4 flex items-center justify-between border-slate-200/60 border-t pt-4 dark:border-slate-700/60">
					<div className="flex items-center gap-3">
						<SkeletonElement className="h-7 w-16 rounded-md" />
						<SkeletonElement className="h-4 w-24" />
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-3">
					<SkeletonElement className="h-10 flex-1 rounded-lg" />
					<SkeletonElement className="h-10 flex-1 rounded-lg" />
				</div>
			</div>
		</output>
	);
});

/**
 * Skeleton for the dashboard deck list
 */
export const DeckListSkeleton = memo(function DeckListSkeleton({
	count = 6,
}: {
	count?: number;
}) {
	return (
		<output
			aria-busy="true"
			aria-label="Loading decks"
			className="mx-auto flex max-w-6xl flex-col gap-8"
		>
			{/* Header skeleton */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<SkeletonElement className="mb-2 h-9 w-64" />
					<SkeletonElement className="h-5 w-32" />
				</div>
				<div className="flex flex-col gap-3 sm:flex-row">
					<SkeletonElement className="h-12 w-36" />
					<SkeletonElement className="h-12 w-32" />
				</div>
			</div>

			{/* Deck grid skeleton */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: count }, (_, i) => (
					<DeckCardSkeleton key={`deck-skeleton-${Date.now()}-${i}`} />
				))}
			</div>
		</output>
	);
});

/**
 * Skeleton for flashcard content in study modes
 */
export const FlashcardSkeleton = memo(function FlashcardSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading flashcard"
			className="mx-auto flex max-w-4xl flex-col gap-8"
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
			<div className="min-h-[400px] rounded-lg border-2 border-slate-200 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800">
				<div className="flex h-full flex-col items-center justify-center text-center">
					<SkeletonElement className="mb-6 h-6 w-20" />
					<SkeletonElement className="mb-4 h-8 w-3/4" />
					<SkeletonElement className="mb-2 h-6 w-1/2" />
					<SkeletonElement className="h-6 w-2/3" />
				</div>
			</div>

			{/* Controls skeleton */}
			<div className="flex justify-center gap-4">
				<SkeletonElement className="h-12 w-24" />
				<SkeletonElement className="h-12 w-20" />
			</div>
		</output>
	);
});

/**
 * Skeleton for deck view (deck management page)
 */
export const DeckViewSkeleton = memo(function DeckViewSkeleton({
	cardCount = 6,
}: {
	cardCount?: number;
}) {
	return (
		<output
			aria-busy="true"
			aria-label="Loading deck view"
			className="mx-auto flex max-w-6xl flex-col gap-8"
		>
			{/* Header skeleton */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="flex items-center gap-4">
					<SkeletonElement className="h-6 w-16" />
					<div>
						<SkeletonElement className="mb-2 h-9 w-48" />
						<SkeletonElement className="mb-1 h-5 w-32" />
						<SkeletonElement className="h-4 w-20" />
					</div>
				</div>
				<SkeletonElement className="h-12 w-24" />
			</div>

			{/* Cards grid skeleton */}
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: cardCount }, (_, i) => (
					<CardItemSkeleton key={`card-skeleton-${Date.now()}-${i}`} />
				))}
			</div>
		</output>
	);
});

/**
 * Skeleton for individual card items in deck view
 */
const CardItemSkeleton = memo(function CardItemSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading card"
			className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800"
		>
			<div className="flex h-full min-h-[200px] flex-col">
				{/* Card content skeleton */}
				<div className="mb-4 flex-1">
					<SkeletonElement className="mb-2 h-4 w-12" />
					<SkeletonElement className="mb-2 h-6 w-full" />
					<SkeletonElement className="mb-2 h-6 w-3/4" />
					<SkeletonElement className="h-6 w-1/2" />
				</div>

				{/* Card actions skeleton */}
				<div className="flex items-center justify-between border-slate-200 border-t pt-4 dark:border-slate-700">
					<SkeletonElement className="h-4 w-20" />
					<div className="flex gap-2">
						<SkeletonElement className="h-4 w-8" />
						<SkeletonElement className="h-4 w-12" />
					</div>
				</div>
			</div>
		</output>
	);
});

/**
 * Skeleton for small statistics or counts
 */
export const StatsSkeleton = memo(function StatsSkeleton() {
	return (
		<output
			aria-busy="true"
			aria-label="Loading statistics"
			className="flex items-center gap-2"
		>
			<SkeletonElement className="h-4 w-8" />
			<SkeletonElement className="h-4 w-12" />
		</output>
	);
});

/**
 * Skeleton for Study History Heatmap
 */
export const HeatmapSkeleton = memo(function HeatmapSkeleton() {
	// Generate skeleton grid structure (similar to actual heatmap)
	const weeks = Array.from({ length: 53 }, (_, weekIndex) => weekIndex);
	const days = Array.from({ length: 7 }, (_, dayIndex) => dayIndex);

	// Generate realistic month positioning to match actual heatmap
	// This approximates how months would be distributed across 53 weeks
	const skeletonMonths = [
		{ name: "Jan", weekSpan: 4, weekStart: 0 },
		{ name: "Feb", weekSpan: 4, weekStart: 4 },
		{ name: "Mar", weekSpan: 5, weekStart: 8 },
		{ name: "Apr", weekSpan: 4, weekStart: 13 },
		{ name: "May", weekSpan: 5, weekStart: 17 },
		{ name: "Jun", weekSpan: 4, weekStart: 22 },
		{ name: "Jul", weekSpan: 5, weekStart: 26 },
		{ name: "Aug", weekSpan: 4, weekStart: 31 },
		{ name: "Sep", weekSpan: 4, weekStart: 35 },
		{ name: "Oct", weekSpan: 5, weekStart: 39 },
		{ name: "Nov", weekSpan: 4, weekStart: 44 },
		{ name: "Dec", weekSpan: 5, weekStart: 48 },
	];

	return (
		<output
			aria-busy="true"
			aria-label="Loading study history heatmap"
			className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800"
		>
			{/* Header */}
			<div className="mb-6">
				<SkeletonElement className="mb-2 h-6 w-48" />
				<SkeletonElement className="h-4 w-64" />
			</div>

			{/* Heatmap Grid */}
			<div className="overflow-x-auto">
				<div className="min-w-[800px]">
					{/* Month Labels */}
					<div className="relative mb-2 ml-8 flex">
						{skeletonMonths.map((month) => (
							<div
								className="absolute text-xs"
								key={month.name}
								style={{
									marginLeft: `${month.weekStart * 14}px`,
									width: `${month.weekSpan * 14}px`,
								}}
							>
								<SkeletonElement className="h-3 w-8" />
							</div>
						))}
					</div>

					{/* Grid Container */}
					<div className="flex">
						{/* Day Labels */}
						<div className="mr-2 flex flex-col">
							{days.map((dayValue, dayIndex) => (
								<div
									className="mb-1 flex h-3 items-center"
									key={`day-skeleton-${dayValue}`}
								>
									{dayIndex % 2 === 1 && (
										<SkeletonElement className="h-3 w-3" />
									)}
								</div>
							))}
						</div>

						{/* Heatmap Squares */}
						<div className="flex gap-1">
							{weeks.map((weekIndex) => (
								<div className="flex flex-col gap-1" key={weekIndex}>
									{days.map((dayIndex) => (
										<SkeletonElement
											className="h-3 w-3 rounded-sm"
											key={`${weekIndex}-${dayIndex}`}
										/>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="mt-4 flex items-center justify-between">
						<SkeletonElement className="h-4 w-32" />
						<div className="flex items-center gap-1">
							<SkeletonElement className="h-3 w-8" />
							{["level-0", "level-1", "level-2", "level-3", "level-4"].map(
								(level) => (
									<SkeletonElement
										className="h-3 w-3 rounded-sm"
										key={`activity-${level}`}
									/>
								),
							)}
							<SkeletonElement className="h-3 w-8" />
						</div>
					</div>
				</div>
			</div>

			{/* Stats Summary */}
			<div className="mt-6 grid grid-cols-2 gap-4 border-slate-200 border-t pt-6 md:grid-cols-4 dark:border-slate-700">
				{["total-cards", "mastered", "learning", "new"].map((statType) => (
					<div className="text-center" key={`stats-summary-${statType}`}>
						<SkeletonElement className="mx-auto mb-1 h-6 w-12" />
						<SkeletonElement className="mx-auto h-4 w-16" />
					</div>
				))}
			</div>
		</output>
	);
});

/**
 * Generic loading fallback skeleton that adapts to different contexts
 */
export const GenericSkeleton = memo(function GenericSkeleton({
	type = "default",
}: {
	type?: "default" | "deck-list" | "flashcard" | "deck-view";
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
				<output
					aria-busy="true"
					aria-label="Loading"
					className="mx-auto flex max-w-4xl flex-col gap-8"
				>
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<SkeletonElement className="mx-auto mb-4 h-8 w-48" />
							<SkeletonElement className="mx-auto h-4 w-32" />
						</div>
					</div>
				</output>
			);
	}
});
