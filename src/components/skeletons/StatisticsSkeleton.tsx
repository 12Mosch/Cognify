import { memo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Skeleton loader for the main statistics dashboard
 */
export const StatisticsDashboardSkeleton = memo(
	function StatisticsDashboardSkeleton() {
		const { t } = useTranslation();

		return (
			<output
				aria-busy="true"
				aria-label={t("statistics.loading.dashboard")}
				className="mx-auto flex max-w-7xl flex-col gap-8"
			>
				{/* Header Skeleton */}
				<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
					<div>
						<div className="mb-2 h-8 w-64 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-4 w-48 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
					<div className="flex gap-3">
						<div className="h-10 w-32 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-10 w-24 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>

				{/* Overview Cards Grid */}
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* Large Chart Skeleton */}
					<div className="lg:col-span-2">
						<ChartSkeleton height="h-80" title="Study Activity Over Time" />
					</div>

					{/* Medium Charts */}
					<ChartSkeleton height="h-64" title="Performance by Deck" />
					<ChartSkeleton height="h-64" title="Card Distribution" />
				</div>

				{/* Additional Metrics */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
				</div>
			</output>
		);
	},
);

/**
 * Skeleton loader for individual statistics cards
 */
export const StatisticsCardSkeleton = memo(function StatisticsCardSkeleton() {
	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			{/* Card Header */}
			<div className="mb-4 flex items-center justify-between">
				<div className="h-5 w-24 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				<div className="h-6 w-6 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>

			{/* Main Value */}
			<div className="mb-2 h-8 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>

			{/* Subtitle/Change */}
			<div className="h-4 w-32 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
		</div>
	);
});

/**
 * Skeleton loader for chart components
 */
interface ChartSkeletonProps {
	height: string;
	title: string;
}

export const ChartSkeleton = memo(function ChartSkeleton({
	height,
	title,
}: ChartSkeletonProps) {
	const { t } = useTranslation();

	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			{/* Chart Title */}
			<div className="mb-6 flex items-center justify-between">
				<div className="h-6 w-48 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				<div className="h-8 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>

			{/* Chart Area */}
			<div
				className={`${height} flex animate-skeleton-pulse items-center justify-center rounded bg-slate-200 dark:bg-slate-700`}
			>
				<div className="text-slate-400 text-sm dark:text-slate-500">
					{t("statistics.loading.chartTitle", { title })}
				</div>
			</div>

			{/* Chart Legend/Footer */}
			<div className="mt-4 flex justify-center gap-4">
				<div className="flex items-center gap-2">
					<div className="h-3 w-3 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="flex items-center gap-2">
					<div className="h-3 w-3 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="flex items-center gap-2">
					<div className="h-3 w-3 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
			</div>
		</div>
	);
});

/**
 * Skeleton loader for deck performance table
 */
export const DeckPerformanceTableSkeleton = memo(
	function DeckPerformanceTableSkeleton() {
		return (
			<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
				{/* Table Header */}
				<div className="mb-6 h-6 w-48 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>

				{/* Table Headers */}
				<div className="mb-4 grid grid-cols-5 gap-4 border-slate-200 border-b pb-2 dark:border-slate-700">
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>

				{/* Table Rows */}
				<div className="grid grid-cols-5 gap-4 border-slate-100 border-b py-3 dark:border-slate-800">
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="grid grid-cols-5 gap-4 border-slate-100 border-b py-3 dark:border-slate-800">
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="grid grid-cols-5 gap-4 border-slate-100 border-b py-3 dark:border-slate-800">
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="grid grid-cols-5 gap-4 border-slate-100 border-b py-3 dark:border-slate-800">
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
			</div>
		);
	},
);

/**
 * Skeleton loader for upcoming reviews widget
 */
export const UpcomingReviewsSkeleton = memo(function UpcomingReviewsSkeleton() {
	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			{/* Widget Title */}
			<div className="mb-6 h-6 w-40 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>

			{/* Review Items */}
			<div className="flex items-center justify-between border-slate-100 border-b py-3 last:border-b-0 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div>
						<div className="mb-1 h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-3 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>
				<div className="h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>
			<div className="flex items-center justify-between border-slate-100 border-b py-3 last:border-b-0 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div>
						<div className="mb-1 h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-3 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>
				<div className="h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>
			<div className="flex items-center justify-between border-slate-100 border-b py-3 last:border-b-0 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div>
						<div className="mb-1 h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-3 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>
				<div className="h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>
			<div className="flex items-center justify-between border-slate-100 border-b py-3 last:border-b-0 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div>
						<div className="mb-1 h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-3 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>
				<div className="h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>
			<div className="flex items-center justify-between border-slate-100 border-b py-3 last:border-b-0 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 animate-skeleton-pulse rounded-full bg-slate-200 dark:bg-slate-700"></div>
					<div>
						<div className="mb-1 h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
						<div className="h-3 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					</div>
				</div>
				<div className="h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
			</div>
		</div>
	);
});

/**
 * Skeleton loader for learning streak widget
 */
export const LearningStreakSkeleton = memo(function LearningStreakSkeleton() {
	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			{/* Widget Title */}
			<div className="mb-6 h-6 w-32 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>

			{/* Streak Visualization */}
			<div className="mb-6 flex justify-center">
				<div className="flex h-20 w-20 animate-skeleton-pulse items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
					<div className="h-8 w-8 animate-skeleton-pulse rounded bg-slate-300 dark:bg-slate-600"></div>
				</div>
			</div>

			{/* Streak Stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="text-center">
					<div className="mx-auto mb-2 h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="mx-auto h-4 w-16 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
				<div className="text-center">
					<div className="mx-auto mb-2 h-6 w-8 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="mx-auto h-4 w-20 animate-skeleton-pulse rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
			</div>
		</div>
	);
});
