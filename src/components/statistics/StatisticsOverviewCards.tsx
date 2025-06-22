import { memo } from "react";
import { useTranslation } from "react-i18next";

// Define types that match the actual Convex query return structure
// These are manually defined to ensure proper optional property handling
interface UserStats {
	totalDecks: number;
	totalCards: number;
	totalStudySessions: number;
	cardsStudiedToday: number;
	currentStreak: number;
	longestStreak: number;
	averageSessionDuration?: number;
	totalStudyTime?: number;
}

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

interface StatisticsOverviewCardsProps {
	userStats: UserStats;
	spacedRepetitionInsights: SpacedRepetitionInsights;
}

/**
 * Overview Cards Component for Statistics Dashboard
 *
 * Displays key metrics in an attractive card grid layout with:
 * - Glowing blue/cyan accent colors for primary metrics
 * - Green accents for positive performance indicators
 * - Icons and visual hierarchy for easy scanning
 * - Responsive grid layout
 * - Dark theme support
 */
export const StatisticsOverviewCards = memo(function StatisticsOverviewCards({
	userStats,
	spacedRepetitionInsights,
}: StatisticsOverviewCardsProps) {
	const { t } = useTranslation();

	const cards = [
		{
			color: "blue",
			icon: "📚",
			subtitle: t("statistics.cards.learningCollections"),
			title: t("statistics.cards.totalDecks"),
			trend: null,
			value: userStats.totalDecks,
		},
		{
			color: "cyan",
			icon: "🃏",
			subtitle: t("statistics.cards.flashcardsCreated"),
			title: t("statistics.cards.totalCards"),
			trend: null,
			value: userStats.totalCards,
		},
		{
			color:
				spacedRepetitionInsights.cardsToReviewToday > 0 ? "orange" : "teal",
			icon: "⏰",
			subtitle: t("statistics.cards.cardsToReview"),
			title: t("statistics.cards.dueToday"),
			trend: null,
			value: spacedRepetitionInsights.cardsToReviewToday,
		},
		{
			color: userStats.currentStreak > 0 ? "blue" : "gray",
			icon: "🔥",
			subtitle: t("statistics.cards.bestDays", {
				count: userStats.longestStreak,
			}),
			title: t("statistics.cards.currentStreak"),
			trend: null,
			value: userStats.currentStreak,
		},
		{
			color: "purple",
			icon: "✨",
			subtitle: t("statistics.cards.readyToLearn"),
			title: t("statistics.cards.newCards"),
			trend: null,
			value: spacedRepetitionInsights.totalNewCards,
		},
		{
			color: "indigo",
			icon: "📖",
			subtitle: t("statistics.cards.totalCompleted"),
			title: t("statistics.cards.studySessions"),
			trend: null,
			value: userStats.totalStudySessions,
		},
		{
			color: "teal",
			icon: "📅",
			subtitle: t("statistics.cards.betweenReviews"),
			title: t("statistics.cards.averageInterval"),
			trend: null,
			value: spacedRepetitionInsights.averageInterval
				? `${spacedRepetitionInsights.averageInterval.toFixed(1)}d`
				: "N/A",
		},
		{
			color: "green",
			icon: "🎯",
			subtitle: t("statistics.cards.successRate"),
			title: t("statistics.cards.retentionRate"),
			trend: null,
			value:
				spacedRepetitionInsights.retentionRate !== undefined
					? `${spacedRepetitionInsights.retentionRate.toFixed(1)}%`
					: "N/A",
		},
	];

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map((card, index) => (
				<StatisticsCard key={`${card.title}-${index}`} {...card} />
			))}
		</div>
	);
});

interface StatisticsCardProps {
	title: string;
	value: string | number;
	subtitle: string;
	icon: string;
	color: string;
	trend?: {
		value: number;
		isPositive: boolean;
	} | null;
}

const StatisticsCard = memo(function StatisticsCard({
	title,
	value,
	subtitle,
	icon,
	color,
	trend,
}: StatisticsCardProps) {
	const getColorClasses = (color: string) => {
		switch (color) {
			case "blue":
				return {
					bg: "bg-blue-500/10 dark:bg-blue-400/10",
					border: "border-blue-200 dark:border-blue-800",
					glow: "shadow-blue-500/20 dark:shadow-blue-400/20",
					text: "text-blue-600 dark:text-blue-400",
				};
			case "cyan":
				return {
					bg: "bg-cyan-500/10 dark:bg-cyan-400/10",
					border: "border-cyan-200 dark:border-cyan-800",
					glow: "shadow-cyan-500/20 dark:shadow-cyan-400/20",
					text: "text-cyan-600 dark:text-cyan-400",
				};
			case "green":
				return {
					bg: "bg-green-500/10 dark:bg-green-400/10",
					border: "border-green-200 dark:border-green-800",
					glow: "shadow-green-500/20 dark:shadow-green-400/20",
					text: "text-green-600 dark:text-green-400",
				};
			case "orange":
				return {
					bg: "bg-orange-500/10 dark:bg-orange-400/10",
					border: "border-orange-200 dark:border-orange-800",
					glow: "shadow-orange-500/20 dark:shadow-orange-400/20",
					text: "text-orange-600 dark:text-orange-400",
				};
			case "purple":
				return {
					bg: "bg-purple-500/10 dark:bg-purple-400/10",
					border: "border-purple-200 dark:border-purple-800",
					glow: "shadow-purple-500/20 dark:shadow-purple-400/20",
					text: "text-purple-600 dark:text-purple-400",
				};
			case "indigo":
				return {
					bg: "bg-indigo-500/10 dark:bg-indigo-400/10",
					border: "border-indigo-200 dark:border-indigo-800",
					glow: "shadow-indigo-500/20 dark:shadow-indigo-400/20",
					text: "text-indigo-600 dark:text-indigo-400",
				};
			case "teal":
				return {
					bg: "bg-teal-500/10 dark:bg-teal-400/10",
					border: "border-teal-200 dark:border-teal-800",
					glow: "shadow-teal-500/20 dark:shadow-teal-400/20",
					text: "text-teal-600 dark:text-teal-400",
				};
			default:
				return {
					bg: "bg-slate-500/10 dark:bg-slate-400/10",
					border: "border-slate-200 dark:border-slate-700",
					glow: "shadow-slate-500/20 dark:shadow-slate-400/20",
					text: "text-slate-600 dark:text-slate-400",
				};
		}
	};

	const colorClasses = getColorClasses(color);

	return (
		<div
			className={`
      ${colorClasses.bg} ${colorClasses.border} ${colorClasses.glow} group cursor-pointer rounded-lg border-2 bg-slate-50 p-6 transition-all duration-300 hover:scale-105 hover:border-slate-300 hover:bg-white hover:shadow-lg dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-750 `}
		>
			{/* Header */}
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold text-slate-600 text-sm uppercase tracking-wide transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
					{title}
				</h3>
				<span
					aria-label={title}
					className="text-2xl transition-transform duration-200 hover:scale-110"
					role="img"
				>
					{icon}
				</span>
			</div>

			{/* Main Value */}
			<div className="mb-2">
				<span
					className={`font-bold text-3xl ${colorClasses.text} inline-block transition-transform duration-200 group-hover:scale-105`}
				>
					{typeof value === "number" ? value.toLocaleString() : value}
				</span>
			</div>

			{/* Subtitle and Trend */}
			<div className="flex items-center justify-between">
				<span className="text-slate-500 text-sm transition-colors group-hover:text-slate-400 dark:text-slate-400 dark:group-hover:text-slate-300">
					{subtitle}
				</span>
				{trend && (
					<div
						className={`flex items-center gap-1 font-medium text-xs transition-transform duration-200 hover:scale-105 ${
							trend.isPositive
								? "text-green-600 dark:text-green-400"
								: "text-red-600 dark:text-red-400"
						}`}
					>
						<span>{trend.isPositive ? "↗" : "↘"}</span>
						<span>{Math.abs(trend.value)}%</span>
					</div>
				)}
			</div>
		</div>
	);
});
