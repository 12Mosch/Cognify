import { useQuery } from "convex/react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { formatTimeSlot } from "../utils/scheduling";

interface LearningAnalyticsDashboardProps {
	onBack: () => void;
}

// Learning velocity thresholds
const SLOW_LEARNING_THRESHOLD = 0.5;
const FAST_LEARNING_THRESHOLD = 2.0;
const LEARNING_VELOCITY_TREND_THRESHOLD = 1.0;

/**
 * Learning Analytics Dashboard Component
 *
 * Provides comprehensive learning insights and analytics including:
 * - Personal learning patterns and performance metrics
 * - Retention curves and difficulty analysis
 * - Time-of-day performance optimization
 * - Predictive analytics for card mastery
 * - Personalized study recommendations
 * - Learning velocity tracking
 */
const LearningAnalyticsDashboard = memo(function LearningAnalyticsDashboard({
	onBack,
}: LearningAnalyticsDashboardProps) {
	const { t } = useTranslation();
	const [selectedTimeRange, setSelectedTimeRange] = useState<
		"7d" | "30d" | "90d" | "1y"
	>("30d");

	// Fetch learning analytics data
	const learningPattern = useQuery(
		api.adaptiveLearning.getUserLearningPattern,
		{},
	);
	const spacedRepetitionInsights = useQuery(
		api.statistics.getSpacedRepetitionInsights,
	);
	const studyActivityData = useQuery(
		api.studySessions.getStudyActivityHeatmapData,
	);

	// Loading state
	if (
		learningPattern === undefined ||
		spacedRepetitionInsights === undefined ||
		studyActivityData === undefined
	) {
		return <AnalyticsSkeleton />;
	}

	// No data state
	if (!learningPattern) {
		return <NoDataState onBack={onBack} />;
	}

	// Get time-of-day insights
	const getOptimalStudyTimes = () => {
		const timeSlots = Object.entries(learningPattern.timeOfDayPerformance)
			.filter(([_, data]) => data.reviewCount >= 5)
			.sort(([_, a], [__, b]) => b.successRate - a.successRate)
			.slice(0, 3);

		return timeSlots.map(([slot, data]) => ({
			averageResponseTime: data.averageResponseTime,
			reviewCount: data.reviewCount,
			successRate: data.successRate,
			timeSlot: slot,
		}));
	};

	const optimalTimes = getOptimalStudyTimes();

	// Get difficulty insights
	const getDifficultyInsights = () => {
		const { easyCards, mediumCards, hardCards } =
			learningPattern.difficultyPatterns;
		return [
			{
				averageInterval: easyCards.averageInterval,
				difficulty: "Easy",
				successRate: easyCards.successRate,
			},
			{
				averageInterval: mediumCards.averageInterval,
				difficulty: "Medium",
				successRate: mediumCards.successRate,
			},
			{
				averageInterval: hardCards.averageInterval,
				difficulty: "Hard",
				successRate: hardCards.successRate,
			},
		];
	};

	const difficultyInsights = getDifficultyInsights();

	// Get learning recommendations
	const getRecommendations = () => {
		const recommendations = [];

		// Time-based recommendations
		if (optimalTimes.length > 0) {
			const bestTime = optimalTimes[0];
			recommendations.push({
				description: t(
					"statistics.analytics.recommendations.optimalTime.description",
					{
						successRate: Math.round(bestTime.successRate * 100),
						time: formatTimeSlot(bestTime.timeSlot, t, "analytics"),
					},
				),
				priority: "high" as const,
				title: t("statistics.analytics.recommendations.optimalTime.title"),
				type: "time",
			});
		}

		// Difficulty-based recommendations
		const hardCards = difficultyInsights.find((d) => d.difficulty === "Hard");
		if (hardCards && hardCards.successRate < 0.6) {
			recommendations.push({
				description: t(
					"statistics.analytics.recommendations.difficultCards.description",
				),
				priority: "medium" as const,
				title: t("statistics.analytics.recommendations.difficultCards.title"),
				type: "difficulty",
			});
		}

		// Learning velocity recommendations
		if (learningPattern.learningVelocity < SLOW_LEARNING_THRESHOLD) {
			recommendations.push({
				description: t(
					"statistics.analytics.recommendations.slowLearning.description",
				),
				priority: "low" as const,
				title: t("statistics.analytics.recommendations.slowLearning.title"),
				type: "velocity",
			});
		} else if (learningPattern.learningVelocity > FAST_LEARNING_THRESHOLD) {
			recommendations.push({
				description: t(
					"statistics.analytics.recommendations.fastLearning.description",
				),
				priority: "low" as const,
				title: t("statistics.analytics.recommendations.fastLearning.title"),
				type: "velocity",
			});
		}

		return recommendations;
	};

	const recommendations = getRecommendations();

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
			{/* Header */}
			<div className="border-slate-200 border-b bg-white/80 p-6 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
				<div className="mx-auto flex max-w-7xl items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
							onClick={onBack}
							type="button"
						>
							← {t("statistics.analytics.back")}
						</button>
						<div>
							<h1 className="font-bold text-2xl text-slate-900 dark:text-slate-100">
								{t("analytics.title", "Learning Analytics")}
							</h1>
							<p className="text-slate-600 dark:text-slate-400">
								{t(
									"analytics.subtitle",
									"Insights into your learning patterns and performance",
								)}
							</p>
						</div>
					</div>

					{/* Time Range Selector */}
					<div className="flex items-center gap-2">
						{(["7d", "30d", "90d", "1y"] as const).map((range) => (
							<button
								className={`rounded-lg px-3 py-2 text-sm transition-colors ${
									selectedTimeRange === range
										? "bg-blue-600 text-white"
										: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
								}`}
								key={range}
								onClick={() => setSelectedTimeRange(range)}
								type="button"
							>
								{t(`analytics.timeRange.${range}`, range.toUpperCase())}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-7xl space-y-8 p-6">
				{/* Key Metrics */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					<MetricCard
						change={
							spacedRepetitionInsights.retentionRate
								? `${Math.round(spacedRepetitionInsights.retentionRate)}% retention`
								: undefined
						}
						icon="📈"
						title={t("analytics.metrics.successRate.title", "Success Rate")}
						trend="up"
						value={`${Math.round(learningPattern.averageSuccessRate * 100)}%`}
					/>
					<MetricCard
						icon="⚡"
						subtitle={t(
							"analytics.metrics.learningVelocity.subtitle",
							"cards/day",
						)}
						title={t(
							"analytics.metrics.learningVelocity.title",
							"Learning Velocity",
						)}
						trend={
							learningPattern.learningVelocity >
							LEARNING_VELOCITY_TREND_THRESHOLD
								? "up"
								: "down"
						}
						value={`${learningPattern.learningVelocity.toFixed(1)}`}
					/>
					<MetricCard
						icon="📚"
						subtitle={t(
							"analytics.metrics.dueCards.subtitle",
							"ready to review",
						)}
						title={t("analytics.metrics.dueCards.title", "Due Cards")}
						trend="neutral"
						value={spacedRepetitionInsights.totalDueCards.toString()}
					/>
					<MetricCard
						icon="⏰"
						subtitle={t(
							"analytics.metrics.averageInterval.subtitle",
							"between reviews",
						)}
						title={t("analytics.metrics.averageInterval.title", "Avg Interval")}
						trend="neutral"
						value={
							spacedRepetitionInsights.averageInterval
								? `${Math.round(spacedRepetitionInsights.averageInterval)}d`
								: "N/A"
						}
					/>
				</div>

				{/* Recommendations */}
				{recommendations.length > 0 && (
					<div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
						<h2 className="mb-4 font-bold text-slate-900 text-xl dark:text-slate-100">
							{t(
								"analytics.recommendations.title",
								"Personalized Recommendations",
							)}
						</h2>
						<div className="space-y-4">
							{recommendations.map((rec, index) => (
								<RecommendationCard
									key={`${rec.type}-${index}`}
									recommendation={rec}
								/>
							))}
						</div>
					</div>
				)}

				{/* Time-of-Day Performance */}
				<div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<h2 className="mb-4 font-bold text-slate-900 text-xl dark:text-slate-100">
						{t("analytics.timePerformance.title", "Time-of-Day Performance")}
					</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{optimalTimes.map((time, index) => (
							<div
								className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700"
								key={time.timeSlot}
							>
								<div className="mb-2 flex items-center justify-between">
									<span className="font-medium text-slate-900 dark:text-slate-100">
										{formatTimeSlot(time.timeSlot, t, "analytics")}
									</span>
									<span
										className={`rounded px-2 py-1 text-sm ${
											index === 0
												? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
												: index === 1
													? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
													: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
										}`}
									>
										#{index + 1}
									</span>
								</div>
								<div className="mb-1 font-bold text-2xl text-slate-900 dark:text-slate-100">
									{Math.round(time.successRate * 100)}%
								</div>
								<div className="text-slate-600 text-sm dark:text-slate-400">
									{time.reviewCount} reviews •{" "}
									{Math.round(time.averageResponseTime / 1000)}s avg
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Difficulty Analysis */}
				<div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<h2 className="mb-4 font-bold text-slate-900 text-xl dark:text-slate-100">
						{t("analytics.difficultyAnalysis.title", "Difficulty Analysis")}
					</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						{difficultyInsights.map((insight) => (
							<div
								className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700"
								key={insight.difficulty}
							>
								<div className="mb-2 flex items-center justify-between">
									<span className="font-medium text-slate-900 dark:text-slate-100">
										{insight.difficulty} Cards
									</span>
									<span
										className={`rounded px-2 py-1 text-sm ${
											insight.successRate > 0.8
												? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
												: insight.successRate > 0.6
													? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
													: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
										}`}
									>
										{Math.round(insight.successRate * 100)}%
									</span>
								</div>
								<div className="text-slate-600 text-sm dark:text-slate-400">
									Avg interval: {Math.round(insight.averageInterval)} days
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Retention Curve */}
				<div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
					<h2 className="mb-4 font-bold text-slate-900 text-xl dark:text-slate-100">
						{t("analytics.retentionCurve.title", "Personal Retention Curve")}
					</h2>
					<div className="space-y-4">
						{learningPattern.retentionCurve.map((point, index) => (
							<div
								className="flex items-center gap-4"
								key={`${point.interval}-${index}`}
							>
								<div className="w-16 text-slate-600 text-sm dark:text-slate-400">
									{point.interval}d
								</div>
								<div className="h-3 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
									<div
										className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
										style={{
											width: `${Math.max(0, Math.min(100, point.retentionRate * 100))}%`,
										}}
									/>
								</div>
								<div className="w-16 font-medium text-slate-900 text-sm dark:text-slate-100">
									{Math.round(point.retentionRate * 100)}%
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
});

// Helper Components
const MetricCard = memo(function MetricCard({
	title,
	value,
	subtitle,
	change,
	trend,
	icon,
}: {
	title: string;
	value: string;
	subtitle?: string;
	change?: string;
	trend: "up" | "down" | "neutral";
	icon: string;
}) {
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
			<div className="mb-2 flex items-center justify-between">
				<span className="font-medium text-slate-600 text-sm dark:text-slate-400">
					{title}
				</span>
				<span className="text-2xl">{icon}</span>
			</div>
			<div className="mb-1 font-bold text-2xl text-slate-900 dark:text-slate-100">
				{value}
			</div>
			{subtitle && (
				<div className="text-slate-600 text-sm dark:text-slate-400">
					{subtitle}
				</div>
			)}
			{change && (
				<div
					className={`mt-2 text-sm ${
						trend === "up"
							? "text-green-600 dark:text-green-400"
							: trend === "down"
								? "text-red-600 dark:text-red-400"
								: "text-slate-600 dark:text-slate-400"
					}`}
				>
					{change}
				</div>
			)}
		</div>
	);
});

const RecommendationCard = memo(function RecommendationCard({
	recommendation,
}: {
	recommendation: {
		type: string;
		title: string;
		description: string;
		priority: "high" | "medium" | "low";
	};
}) {
	const priorityColors = {
		high: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20",
		low: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20",
		medium:
			"border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20",
	};

	return (
		<div
			className={`rounded-lg border p-4 ${priorityColors[recommendation.priority]}`}
		>
			<div className="flex items-start gap-3">
				<div className="text-2xl">
					{recommendation.type === "time"
						? "⏰"
						: recommendation.type === "difficulty"
							? "🎯"
							: recommendation.type === "velocity"
								? "⚡"
								: "💡"}
				</div>
				<div>
					<h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">
						{recommendation.title}
					</h3>
					<p className="text-slate-600 text-sm dark:text-slate-400">
						{recommendation.description}
					</p>
				</div>
			</div>
		</div>
	);
});

const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 dark:from-slate-900 dark:to-slate-800">
			<div className="mx-auto max-w-7xl space-y-8">
				<div className="h-8 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{["total-reviews", "accuracy", "streak", "velocity"].map(
						(skeletonType) => (
							<div
								className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700"
								key={`analytics-skeleton-${skeletonType}`}
							/>
						),
					)}
				</div>
				<div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
			</div>
		</div>
	);
});

const NoDataState = memo(function NoDataState({
	onBack,
}: {
	onBack: () => void;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6 dark:from-slate-900 dark:to-slate-800">
			<div className="max-w-md text-center">
				<div className="mb-4 text-6xl">📊</div>
				<h2 className="mb-2 font-bold text-2xl text-slate-900 dark:text-slate-100">
					{t("analytics.noData.title", "Not Enough Data Yet")}
				</h2>
				<p className="mb-6 text-slate-600 dark:text-slate-400">
					{t(
						"analytics.noData.description",
						"Complete at least 20 reviews to see your learning analytics.",
					)}
				</p>
				<button
					className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
					onClick={onBack}
					type="button"
				>
					{t("analytics.noData.backButton", "Back to Dashboard")}
				</button>
			</div>
		</div>
	);
});

export default LearningAnalyticsDashboard;
