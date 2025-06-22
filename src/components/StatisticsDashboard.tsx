import { useQuery } from "convex/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { type ExportFormat, exportStatisticsData } from "../lib/exportUtils";
import { toastHelpers } from "../lib/toast";
import StudyHistoryHeatmap from "./StudyHistoryHeatmap";
import { StatisticsDashboardSkeleton } from "./skeletons/StatisticsSkeleton";
import CardDistributionChart from "./statistics/CardDistributionChart";
import DeckPerformanceChart from "./statistics/DeckPerformanceChart";
import LearningStreakWidget from "./statistics/LearningStreakWidget";
import SpacedRepetitionInsights from "./statistics/SpacedRepetitionInsights";
import { StatisticsOverviewCards } from "./statistics/StatisticsOverviewCards";
import StudyActivityChart from "./statistics/StudyActivityChart";
import UpcomingReviewsWidget from "./statistics/UpcomingReviewsWidget";

/**
 * Comprehensive Statistics Dashboard Component
 *
 * Provides detailed analytics and insights for the flashcard learning app including:
 * - Overall learning statistics and progress tracking
 * - Study session patterns and performance metrics
 * - Deck-specific analytics and comparisons
 * - Spaced repetition algorithm insights
 * - Learning streaks and achievements
 * - Interactive charts and visualizations
 *
 * Features:
 * - Dark theme with glowing blue/green accent colors
 * - Responsive grid-based layout
 * - Real-time data from Convex queries
 * - Export capabilities for study data
 * - Filter options for date ranges and decks
 * - Accessibility with proper ARIA labels
 * - Smooth loading states with skeleton components
 */

interface StatisticsDashboardProps {
	onBack: () => void;
}

type DateRange = "7d" | "30d" | "90d" | "all";

export default function StatisticsDashboard({
	onBack,
}: StatisticsDashboardProps) {
	const { t } = useTranslation();
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	// Note: Learning analytics state removed as it's not currently used

	// Fetch unified dashboard data
	const dashboardData = useQuery(api.statistics.getDashboardData);

	// Loading state
	if (dashboardData === undefined) {
		return <StatisticsDashboardSkeleton />;
	}

	// Defensive data extraction with fallbacks for malformed responses
	// This protects against API changes, network issues, or unexpected data structures
	const userStats = dashboardData?.userStatistics || {
		averageSessionDuration: undefined,
		cardsStudiedToday: 0,
		currentStreak: 0,
		longestStreak: 0,
		totalCards: 0,
		totalDecks: 0,
		totalStudySessions: 0,
		totalStudyTime: undefined,
	};

	const spacedRepetitionInsights = dashboardData?.spacedRepetitionInsights || {
		averageInterval: undefined,
		cardsToReviewToday: 0,
		retentionRate: undefined,
		totalDueCards: 0,
		totalNewCards: 0,
		upcomingReviews: [],
	};

	const deckPerformance = Array.isArray(dashboardData?.deckPerformance)
		? dashboardData.deckPerformance
		: [];

	const rawCardDistribution = dashboardData?.cardDistribution || {
		dueCards: 0,
		learningCards: 0,
		masteredCards: 0,
		newCards: 0,
		reviewCards: 0,
		totalCards: 0,
	};

	const cardDistribution = {
		dueCards:
			typeof rawCardDistribution.dueCards === "number"
				? rawCardDistribution.dueCards
				: 0,
		learningCards:
			typeof rawCardDistribution.learningCards === "number"
				? rawCardDistribution.learningCards
				: 0,
		masteredCards:
			typeof rawCardDistribution.masteredCards === "number"
				? rawCardDistribution.masteredCards
				: 0,
		newCards:
			typeof rawCardDistribution.newCards === "number"
				? rawCardDistribution.newCards
				: 0,
		reviewCards:
			typeof rawCardDistribution.reviewCards === "number"
				? rawCardDistribution.reviewCards
				: 0,
		totalCards:
			typeof rawCardDistribution.totalCards === "number"
				? rawCardDistribution.totalCards
				: 0,
	};

	// Validate critical data properties to ensure they're numbers
	const safeUserStats = {
		...userStats,
		cardsStudiedToday:
			typeof userStats.cardsStudiedToday === "number"
				? userStats.cardsStudiedToday
				: 0,
		currentStreak:
			typeof userStats.currentStreak === "number" ? userStats.currentStreak : 0,
		longestStreak:
			typeof userStats.longestStreak === "number" ? userStats.longestStreak : 0,
		totalCards:
			typeof userStats.totalCards === "number" ? userStats.totalCards : 0,
		totalDecks:
			typeof userStats.totalDecks === "number" ? userStats.totalDecks : 0,
		totalStudySessions:
			typeof userStats.totalStudySessions === "number"
				? userStats.totalStudySessions
				: 0,
	};

	const safeSpacedRepetitionInsights = {
		...spacedRepetitionInsights,
		cardsToReviewToday:
			typeof spacedRepetitionInsights.cardsToReviewToday === "number"
				? spacedRepetitionInsights.cardsToReviewToday
				: 0,
		totalDueCards:
			typeof spacedRepetitionInsights.totalDueCards === "number"
				? spacedRepetitionInsights.totalDueCards
				: 0,
		totalNewCards:
			typeof spacedRepetitionInsights.totalNewCards === "number"
				? spacedRepetitionInsights.totalNewCards
				: 0,
		upcomingReviews: Array.isArray(spacedRepetitionInsights.upcomingReviews)
			? spacedRepetitionInsights.upcomingReviews
			: [],
	};

	const handleExportData = async (format: ExportFormat) => {
		setIsExporting(true);
		try {
			// Prepare export data with defensive checks already applied
			const exportData = {
				dateRange,
				deckPerformance: deckPerformance.map((deck) => ({
					averageEaseFactor:
						typeof deck?.averageEaseFactor === "number"
							? deck.averageEaseFactor
							: undefined,
					deckId: deck?.deckId || "unknown",
					deckName:
						typeof deck?.deckName === "string" ? deck.deckName : "Unknown Deck",
					lastStudied:
						typeof deck?.lastStudied === "number"
							? deck.lastStudied
							: undefined,
					masteredCards:
						typeof deck?.masteredCards === "number" ? deck.masteredCards : 0,
					masteryPercentage:
						typeof deck?.masteryPercentage === "number"
							? deck.masteryPercentage
							: 0,
					totalCards:
						typeof deck?.totalCards === "number" ? deck.totalCards : 0,
				})),
				exportDate: new Date().toISOString(),
				spacedRepetitionInsights: safeSpacedRepetitionInsights,
				userStatistics: safeUserStats,
			};

			// Use the utility function to handle the export
			exportStatisticsData(exportData, format);

			toastHelpers.success(
				t("statistics.dashboard.export.exportSuccess", {
					format: format.toUpperCase(),
				}),
			);
		} catch (error) {
			console.error("Export failed:", error);
			toastHelpers.error(t("statistics.dashboard.export.exportError"));
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="mx-auto flex max-w-7xl flex-col gap-8">
			{/* Header */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<div className="mb-2 flex items-center gap-3">
						<button
							aria-label={t("statistics.dashboard.backToDashboard")}
							className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
							onClick={onBack}
							type="button"
						>
							<svg
								aria-hidden="true"
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M15 19l-7-7 7-7"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</button>
						<h1 className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text font-bold text-3xl text-transparent">
							{t("statistics.dashboard.title")}
						</h1>
					</div>
					<p className="text-slate-600 dark:text-slate-400">
						{t("statistics.dashboard.subtitle")}
					</p>
				</div>

				{/* Controls */}
				<div className="flex flex-col gap-3 sm:flex-row">
					{/* Date Range Filter */}
					<select
						className="rounded-lg border-2 border-slate-200 bg-slate-50 px-4 py-2 transition-colors focus:border-blue-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:focus:border-blue-400"
						onChange={(e) => setDateRange(e.target.value as DateRange)}
						value={dateRange}
					>
						<option value="7d">
							{t("statistics.dashboard.dateRange.last7Days")}
						</option>
						<option value="30d">
							{t("statistics.dashboard.dateRange.last30Days")}
						</option>
						<option value="90d">
							{t("statistics.dashboard.dateRange.last90Days")}
						</option>
						<option value="all">
							{t("statistics.dashboard.dateRange.allTime")}
						</option>
					</select>

					{/* Export Dropdown */}
					<div className="relative">
						<select
							className="cursor-pointer rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-blue-300"
							disabled={isExporting}
							onChange={(e) => {
								if (e.target.value) {
									void handleExportData(e.target.value as ExportFormat);
									e.target.value = ""; // Reset selection
								}
							}}
						>
							<option value="">
								{isExporting
									? t("statistics.dashboard.export.exporting")
									: t("statistics.dashboard.export.exportData")}
							</option>
							<option value="csv">
								{t("statistics.dashboard.export.exportAsCSV")}
							</option>
							<option value="json">
								{t("statistics.dashboard.export.exportAsJSON")}
							</option>
						</select>
					</div>
				</div>
			</div>

			{/* Overview Cards */}
			<StatisticsOverviewCards
				spacedRepetitionInsights={safeSpacedRepetitionInsights}
				userStats={safeUserStats}
			/>

			{/* Study History Heatmap - Full Width */}
			<div className="mb-8">
				<StudyHistoryHeatmap />
			</div>

			{/* Main Charts Section */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				{/* Study Activity Chart - Full Width */}
				<div className="lg:col-span-2">
					<StudyActivityChart dateRange={dateRange} />
				</div>

				{/* Deck Performance Chart */}
				<DeckPerformanceChart
					deckPerformance={deckPerformance}
					onDeckSelect={setSelectedDeckId}
					selectedDeckId={selectedDeckId}
				/>

				{/* Card Distribution Chart */}
				<CardDistributionChart
					cardDistribution={cardDistribution}
					spacedRepetitionInsights={safeSpacedRepetitionInsights}
				/>
			</div>

			{/* Secondary Widgets */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<UpcomingReviewsWidget
					upcomingReviews={safeSpacedRepetitionInsights.upcomingReviews}
				/>

				<LearningStreakWidget
					currentStreak={safeUserStats.currentStreak}
					longestStreak={safeUserStats.longestStreak}
				/>

				<SpacedRepetitionInsights insights={safeSpacedRepetitionInsights} />
			</div>

			{/* Deck Performance Table */}
			{deckPerformance.length > 0 && (
				<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
					<h3 className="mb-6 font-semibold text-slate-800 text-xl dark:text-slate-200">
						{t("statistics.table.deckPerformance.title")}
					</h3>
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-slate-200 border-b dark:border-slate-700">
									<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
										{t("statistics.table.deckPerformance.headers.deck")}
									</th>
									<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
										{t("statistics.table.deckPerformance.headers.cards")}
									</th>
									<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
										{t("statistics.table.deckPerformance.headers.mastered")}
									</th>
									<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
										{t("statistics.table.deckPerformance.headers.progress")}
									</th>
									<th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
										{t("statistics.table.deckPerformance.headers.avgEase")}
									</th>
								</tr>
							</thead>
							<tbody>
								{deckPerformance.map((deck) => {
									// Defensive checks for deck data
									const safeDeck = {
										averageEaseFactor:
											typeof deck?.averageEaseFactor === "number"
												? deck.averageEaseFactor
												: undefined,
										deckId: deck?.deckId || "unknown",
										deckName:
											typeof deck?.deckName === "string"
												? deck.deckName
												: "Unknown Deck",
										masteredCards:
											typeof deck?.masteredCards === "number"
												? deck.masteredCards
												: 0,
										masteryPercentage:
											typeof deck?.masteryPercentage === "number"
												? deck.masteryPercentage
												: 0,
										totalCards:
											typeof deck?.totalCards === "number"
												? deck.totalCards
												: 0,
									};

									return (
										<tr
											className="border-slate-100 border-b transition-colors hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-700"
											key={safeDeck.deckId}
										>
											<td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
												{safeDeck.deckName}
											</td>
											<td className="px-4 py-3 text-slate-600 dark:text-slate-400">
												{safeDeck.totalCards}
											</td>
											<td className="px-4 py-3 text-slate-600 dark:text-slate-400">
												{safeDeck.masteredCards}
											</td>
											<td className="px-4 py-3">
												<div className="flex items-center gap-2">
													<div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
														<div
															className="h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
															style={{
																width: `${Math.min(Math.max(safeDeck.masteryPercentage, 0), 100)}%`,
															}}
														></div>
													</div>
													<span className="min-w-[3rem] font-medium text-slate-600 text-sm dark:text-slate-400">
														{safeDeck.masteryPercentage.toFixed(1)}%
													</span>
												</div>
											</td>
											<td className="px-4 py-3 text-slate-600 dark:text-slate-400">
												{safeDeck.averageEaseFactor
													? safeDeck.averageEaseFactor.toFixed(2)
													: "N/A"}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
