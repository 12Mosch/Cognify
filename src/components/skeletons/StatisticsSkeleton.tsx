import { memo } from "react";
import { useTranslation } from "react-i18next";

/**
 * Skeleton loader for the main statistics dashboard
 */
export const StatisticsDashboardSkeleton = memo(
	function StatisticsDashboardSkeleton() {
		const { t } = useTranslation();

		return (
			<div
				className="flex flex-col gap-8 max-w-7xl mx-auto"
				role="status"
				aria-busy="true"
				aria-label={t("statistics.loading.dashboard")}
			>
				{/* Header Skeleton */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-2"></div>
						<div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
					</div>
					<div className="flex gap-3">
						<div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
						<div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
					</div>
				</div>

				{/* Overview Cards Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{Array.from({ length: 4 }).map((_, index) => (
						<StatisticsCardSkeleton key={index} />
					))}
				</div>

				{/* Charts Section */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Large Chart Skeleton */}
					<div className="lg:col-span-2">
						<ChartSkeleton height="h-80" title="Study Activity Over Time" />
					</div>

					{/* Medium Charts */}
					<ChartSkeleton height="h-64" title="Performance by Deck" />
					<ChartSkeleton height="h-64" title="Card Distribution" />
				</div>

				{/* Additional Metrics */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
					<StatisticsCardSkeleton />
				</div>
			</div>
		);
	},
);

/**
 * Skeleton loader for individual statistics cards
 */
export const StatisticsCardSkeleton = memo(function StatisticsCardSkeleton() {
	return (
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
			{/* Card Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
				<div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
			</div>

			{/* Main Value */}
			<div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-2"></div>

			{/* Subtitle/Change */}
			<div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
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
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
			{/* Chart Title */}
			<div className="flex items-center justify-between mb-6">
				<div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
				<div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
			</div>

			{/* Chart Area */}
			<div
				className={`${height} bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse flex items-center justify-center`}
			>
				<div className="text-slate-400 dark:text-slate-500 text-sm">
					{t("statistics.loading.chartTitle", { title })}
				</div>
			</div>

			{/* Chart Legend/Footer */}
			<div className="flex justify-center gap-4 mt-4">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index} className="flex items-center gap-2">
						<div className="h-3 w-3 bg-slate-200 dark:bg-slate-700 rounded-full animate-skeleton-pulse"></div>
						<div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
					</div>
				))}
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
			<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
				{/* Table Header */}
				<div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-6"></div>

				{/* Table Headers */}
				<div className="grid grid-cols-5 gap-4 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
					{Array.from({ length: 5 }).map((_, index) => (
						<div
							key={index}
							className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"
						></div>
					))}
				</div>

				{/* Table Rows */}
				{Array.from({ length: 4 }).map((_, rowIndex) => (
					<div
						key={rowIndex}
						className="grid grid-cols-5 gap-4 py-3 border-b border-slate-100 dark:border-slate-800"
					>
						{Array.from({ length: 5 }).map((_, colIndex) => (
							<div
								key={colIndex}
								className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"
							></div>
						))}
					</div>
				))}
			</div>
		);
	},
);

/**
 * Skeleton loader for upcoming reviews widget
 */
export const UpcomingReviewsSkeleton = memo(function UpcomingReviewsSkeleton() {
	return (
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
			{/* Widget Title */}
			<div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-6"></div>

			{/* Review Items */}
			{Array.from({ length: 5 }).map((_, index) => (
				<div
					key={index}
					className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0"
				>
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-skeleton-pulse"></div>
						<div>
							<div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-1"></div>
							<div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
						</div>
					</div>
					<div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse"></div>
				</div>
			))}
		</div>
	);
});

/**
 * Skeleton loader for learning streak widget
 */
export const LearningStreakSkeleton = memo(function LearningStreakSkeleton() {
	return (
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
			{/* Widget Title */}
			<div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mb-6"></div>

			{/* Streak Visualization */}
			<div className="flex justify-center mb-6">
				<div className="h-20 w-20 bg-slate-200 dark:bg-slate-700 rounded-full animate-skeleton-pulse flex items-center justify-center">
					<div className="h-8 w-8 bg-slate-300 dark:bg-slate-600 rounded animate-skeleton-pulse"></div>
				</div>
			</div>

			{/* Streak Stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="text-center">
					<div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mx-auto mb-2"></div>
					<div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mx-auto"></div>
				</div>
				<div className="text-center">
					<div className="h-6 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mx-auto mb-2"></div>
					<div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-skeleton-pulse mx-auto"></div>
				</div>
			</div>
		</div>
	);
});
