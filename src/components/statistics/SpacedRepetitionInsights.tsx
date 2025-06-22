import { memo } from "react";
import { useTranslation } from "react-i18next";

// Define type that matches the actual Convex query return structure
// Manually defined to ensure proper optional property handling
interface SpacedRepetitionInsights {
	totalDueCards: number;
	totalNewCards: number;
	cardsToReviewToday: number;
	upcomingReviews: Array<{
		date: string;
		count: number;
	}>;
	retentionRate?: number;
	averageInterval?: number;
}

interface SpacedRepetitionInsightsProps {
	insights: SpacedRepetitionInsights;
}

/**
 * Spaced Repetition Insights Widget Component
 *
 * Displays key spaced repetition algorithm insights with:
 * - Algorithm performance metrics
 * - Learning efficiency indicators
 * - Visual progress indicators
 * - Dark theme support with accent colors
 * - Responsive design
 */
const SpacedRepetitionInsights = memo(function SpacedRepetitionInsights({
	insights,
}: SpacedRepetitionInsightsProps) {
	const { t } = useTranslation();

	const getRetentionColor = (rate?: number) => {
		if (!rate) return "text-slate-400";
		if (rate >= 90) return "text-blue-500";
		if (rate >= 80) return "text-cyan-500";
		if (rate >= 70) return "text-amber-500";
		return "text-red-500";
	};

	const getRetentionMessage = (rate?: number) => {
		if (!rate)
			return t("statistics.widgets.spacedRepetition.retentionMessages.noData");
		if (rate >= 90)
			return t(
				"statistics.widgets.spacedRepetition.retentionMessages.excellent",
			);
		if (rate >= 80)
			return t("statistics.widgets.spacedRepetition.retentionMessages.good");
		if (rate >= 70)
			return t("statistics.widgets.spacedRepetition.retentionMessages.fair");
		return t(
			"statistics.widgets.spacedRepetition.retentionMessages.needsImprovement",
		);
	};

	const getIntervalEfficiency = (interval?: number) => {
		if (!interval)
			return {
				color: "text-slate-400",
				level: t(
					"statistics.widgets.spacedRepetition.intervalEfficiency.unknown",
				),
			};
		if (interval >= 30)
			return {
				color: "text-green-500",
				level: t(
					"statistics.widgets.spacedRepetition.intervalEfficiency.excellent",
				),
			};
		if (interval >= 14)
			return {
				color: "text-blue-500",
				level: t("statistics.widgets.spacedRepetition.intervalEfficiency.good"),
			};
		if (interval >= 7)
			return {
				color: "text-yellow-500",
				level: t("statistics.widgets.spacedRepetition.intervalEfficiency.fair"),
			};
		return {
			color: "text-orange-500",
			level: t(
				"statistics.widgets.spacedRepetition.intervalEfficiency.learning",
			),
		};
	};

	const intervalEfficiency = getIntervalEfficiency(insights.averageInterval);

	const totalCards = insights.totalDueCards + insights.totalNewCards;
	const workloadBalance =
		totalCards > 0 ? (insights.totalNewCards / totalCards) * 100 : 0;

	return (
		<div className="group rounded-lg border-2 border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20">
			{/* Widget Header */}
			<div className="mb-6 flex items-center justify-between">
				<h3 className="font-semibold text-slate-800 text-xl transition-colors group-hover:text-slate-700 dark:text-slate-200 dark:group-hover:text-slate-100">
					{t("statistics.widgets.spacedRepetition.title")}
				</h3>
				<span
					aria-label="Brain"
					className="text-2xl transition-transform duration-200 hover:scale-110"
					role="img"
				>
					🧠
				</span>
			</div>

			{/* Key Metrics */}
			<div className="space-y-4">
				{/* Retention Rate */}
				<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500">
					<div className="mb-2 flex items-center justify-between">
						<span className="font-medium text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							{t("statistics.widgets.spacedRepetition.retentionRate")}
						</span>
						<span className="text-lg transition-transform duration-200 hover:scale-110">
							🎯
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div
							className={`font-bold text-2xl ${getRetentionColor(insights.retentionRate)} transition-transform duration-200 hover:scale-105`}
						>
							{insights.retentionRate !== undefined
								? `${insights.retentionRate.toFixed(1)}%`
								: "N/A"}
						</div>
						<div className="flex-1">
							<div className="text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
								{getRetentionMessage(insights.retentionRate)}
							</div>
							{insights.retentionRate !== undefined && (
								<div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 transition-all duration-200 hover:h-2 dark:bg-slate-600">
									<div
										className={`h-full rounded-full transition-all duration-500 ${
											insights.retentionRate >= 90
												? "bg-green-500"
												: insights.retentionRate >= 80
													? "bg-blue-500"
													: insights.retentionRate >= 70
														? "bg-yellow-500"
														: "bg-red-500"
										}`}
										style={{
											width: `${Math.min(insights.retentionRate, 100)}%`,
										}}
									></div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Average Interval */}
				<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500">
					<div className="mb-2 flex items-center justify-between">
						<span className="font-medium text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							{t("statistics.widgets.spacedRepetition.averageInterval")}
						</span>
						<span className="text-lg transition-transform duration-200 hover:scale-110">
							⏱️
						</span>
					</div>
					<div className="flex items-center gap-3">
						<div
							className={`font-bold text-2xl ${intervalEfficiency.color} transition-transform duration-200 hover:scale-105`}
						>
							{insights.averageInterval
								? `${insights.averageInterval.toFixed(1)}d`
								: "N/A"}
						</div>
						<div className="flex-1">
							<div
								className={`font-medium text-xs ${intervalEfficiency.color} transition-opacity hover:opacity-80`}
							>
								{intervalEfficiency.level}
							</div>
							<div className="text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
								{t("statistics.widgets.spacedRepetition.timeBetweenReviews")}
							</div>
						</div>
					</div>
				</div>

				{/* Workload Balance */}
				<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:scale-[1.02] hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500">
					<div className="mb-2 flex items-center justify-between">
						<span className="font-medium text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
							{t("statistics.widgets.spacedRepetition.newVsReviewBalance")}
						</span>
						<span className="text-lg transition-transform duration-200 hover:scale-110">
							⚖️
						</span>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between rounded p-1 text-sm transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-600">
							<span className="text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
								{t("statistics.widgets.spacedRepetition.newCards")}
							</span>
							<span className="font-semibold transition-transform duration-200 hover:scale-105">
								{insights.totalNewCards}
							</span>
						</div>
						<div className="flex justify-between rounded p-1 text-sm transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-600">
							<span className="text-red-600 transition-colors hover:text-red-500 dark:text-red-400 dark:hover:text-red-300">
								{t("statistics.widgets.spacedRepetition.dueCards")}
							</span>
							<span className="font-semibold transition-transform duration-200 hover:scale-105">
								{insights.totalDueCards}
							</span>
						</div>
						<div className="mt-2 h-2 w-full rounded-full bg-slate-200 transition-all duration-200 hover:h-2.5 dark:bg-slate-600">
							<div className="relative h-full rounded-full bg-gradient-to-r from-blue-500 to-red-500">
								<div
									className="absolute top-0 left-0 h-full rounded-l-full bg-blue-500 transition-all duration-500"
									style={{ width: `${workloadBalance}%` }}
								></div>
							</div>
						</div>
						<div className="text-center text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
							{t("statistics.widgets.spacedRepetition.balancePercentage", {
								newPercentage: workloadBalance.toFixed(0),
								reviewPercentage: (100 - workloadBalance).toFixed(0),
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Algorithm Tips */}
			<div className="mt-6 cursor-pointer rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-blue-300 hover:from-blue-100 hover:to-cyan-100 dark:border-blue-800 dark:from-blue-900/20 dark:to-cyan-900/20 dark:hover:border-blue-700 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30">
				<div className="flex items-start gap-3">
					<span className="mt-0.5 text-lg transition-transform duration-200 hover:scale-110">
						💡
					</span>
					<div>
						<div className="mb-1 font-semibold text-blue-700 text-sm transition-colors hover:text-blue-600 dark:text-blue-300 dark:hover:text-blue-200">
							{t("statistics.widgets.spacedRepetition.algorithmTip")}
						</div>
						<div className="text-blue-600 text-xs transition-colors hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
							{insights.retentionRate !== undefined &&
							insights.retentionRate < 80
								? t("statistics.widgets.spacedRepetition.tips.improveRetention")
								: insights.averageInterval && insights.averageInterval < 7
									? t(
											"statistics.widgets.spacedRepetition.tips.frequentReviews",
										)
									: insights.totalDueCards > insights.totalNewCards * 2
										? t(
												"statistics.widgets.spacedRepetition.tips.balanceDueCards",
											)
										: t("statistics.widgets.spacedRepetition.tips.workingWell")}
						</div>
					</div>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="mt-6 grid grid-cols-2 gap-4">
				<div className="cursor-pointer rounded p-2 text-center transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
					<div className="font-bold text-cyan-500 text-lg transition-transform duration-200 hover:scale-105 dark:text-cyan-400">
						{insights.upcomingReviews.length}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.widgets.spacedRepetition.reviewDays")}
					</div>
				</div>
				<div className="cursor-pointer rounded p-2 text-center transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700">
					<div className="font-bold text-lg text-purple-500 transition-transform duration-200 hover:scale-105 dark:text-purple-400">
						{insights.cardsToReviewToday}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.widgets.spacedRepetition.dueToday")}
					</div>
				</div>
			</div>
		</div>
	);
});

export default SpacedRepetitionInsights;
