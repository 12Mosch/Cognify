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
			className={`animate-shimmer rounded bg-slate-200 dark:bg-slate-700 ${className}`}
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
			className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm dark:border-slate-700/60 dark:from-slate-800 dark:to-slate-900"
			role="status"
			aria-busy="true"
			aria-label="Loading deck"
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
		</div>
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
		<div
			className="mx-auto flex max-w-6xl flex-col gap-8"
			role="status"
			aria-busy="true"
			aria-label="Loading decks"
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
			className="mx-auto flex max-w-4xl flex-col gap-8"
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
		</div>
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
		<div
			className="mx-auto flex max-w-6xl flex-col gap-8"
			role="status"
			aria-busy="true"
			aria-label="Loading deck view"
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
			className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800"
			role="status"
			aria-busy="true"
			aria-label="Loading card"
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
 * Skeleton for Study History Heatmap
 */
export const HeatmapSkeleton = memo(function HeatmapSkeleton() {
	// Generate skeleton grid structure (similar to actual heatmap)
	const weeks = Array.from({ length: 53 }, (_, weekIndex) => weekIndex);
	const days = Array.from({ length: 7 }, (_, dayIndex) => dayIndex);

	// Generate realistic month positioning to match actual heatmap
	// This approximates how months would be distributed across 53 weeks
	const skeletonMonths = [
		{ name: "Jan", weekStart: 0, weekSpan: 4 },
		{ name: "Feb", weekStart: 4, weekSpan: 4 },
		{ name: "Mar", weekStart: 8, weekSpan: 5 },
		{ name: "Apr", weekStart: 13, weekSpan: 4 },
		{ name: "May", weekStart: 17, weekSpan: 5 },
		{ name: "Jun", weekStart: 22, weekSpan: 4 },
		{ name: "Jul", weekStart: 26, weekSpan: 5 },
		{ name: "Aug", weekStart: 31, weekSpan: 4 },
		{ name: "Sep", weekStart: 35, weekSpan: 4 },
		{ name: "Oct", weekStart: 39, weekSpan: 5 },
		{ name: "Nov", weekStart: 44, weekSpan: 4 },
		{ name: "Dec", weekStart: 48, weekSpan: 5 },
	];

	return (
		<div
			className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800"
			role="status"
			aria-busy="true"
			aria-label="Loading study history heatmap"
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
								key={month.name}
								className="absolute text-xs"
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
							{days.map((_, dayIndex) => (
								<div key={dayIndex} className="mb-1 flex h-3 items-center">
									{dayIndex % 2 === 1 && (
										<SkeletonElement className="h-3 w-3" />
									)}
								</div>
							))}
						</div>

						{/* Heatmap Squares */}
						<div className="flex gap-1">
							{weeks.map((weekIndex) => (
								<div key={weekIndex} className="flex flex-col gap-1">
									{days.map((dayIndex) => (
										<SkeletonElement
											key={`${weekIndex}-${dayIndex}`}
											className="h-3 w-3 rounded-sm"
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
							{Array.from({ length: 5 }).map((_, index) => (
								<SkeletonElement key={index} className="h-3 w-3 rounded-sm" />
							))}
							<SkeletonElement className="h-3 w-8" />
						</div>
					</div>
				</div>
			</div>

			{/* Stats Summary */}
			<div className="mt-6 grid grid-cols-2 gap-4 border-slate-200 border-t pt-6 md:grid-cols-4 dark:border-slate-700">
				{Array.from({ length: 4 }).map((_, index) => (
					<div key={index} className="text-center">
						<SkeletonElement className="mx-auto mb-1 h-6 w-12" />
						<SkeletonElement className="mx-auto h-4 w-16" />
					</div>
				))}
			</div>
		</div>
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
				<div
					className="mx-auto flex max-w-4xl flex-col gap-8"
					role="status"
					aria-busy="true"
					aria-label="Loading"
				>
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<SkeletonElement className="mx-auto mb-4 h-8 w-48" />
							<SkeletonElement className="mx-auto h-4 w-32" />
						</div>
					</div>
				</div>
			);
	}
});
