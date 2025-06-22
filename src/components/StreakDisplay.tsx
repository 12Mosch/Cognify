import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { useAnalytics } from "../lib/analytics";

interface StreakDisplayProps {
	className?: string;
}

/**
 * Streak Display Component
 *
 * Shows the user's current study streak with visual indicators and milestones.
 * Includes motivational messaging and streak statistics.
 */
export default function StreakDisplay({ className = "" }: StreakDisplayProps) {
	const streakData = useQuery(api.streaks.getCurrentStreak);
	const { posthog } = useAnalytics();
	const { t } = useTranslation();

	if (streakData === undefined) {
		return (
			<div
				className={`rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
			>
				<div className="animate-pulse" data-testid="streak-loading">
					<div className="mb-4 h-6 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="mb-2 h-12 w-20 rounded bg-slate-200 dark:bg-slate-700"></div>
					<div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700"></div>
				</div>
			</div>
		);
	}

	// Handle null response to avoid crash - user has no streak yet
	// Treat as zero-streak baseline if streakData is null
	const safeStreakData = streakData ?? {
		currentStreak: 0,
		lastMilestone: null,
		longestStreak: 0,
		milestonesReached: [],
		totalStudyDays: 0,
	};

	const {
		currentStreak,
		longestStreak,
		totalStudyDays,
		milestonesReached,
		lastMilestone,
	} = safeStreakData;

	// Determine streak status and styling
	const getStreakStatus = () => {
		if (currentStreak === 0) {
			return {
				bgColor:
					"from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700",
				borderColor: "border-slate-200 dark:border-slate-600",
				message: t("streak.display.status.startStreak.message"),
				streakColor: "text-slate-800 dark:text-slate-200",
				textColor: "text-slate-600 dark:text-slate-400",
				title: t("streak.display.status.startStreak.title"),
			};
		} else if (currentStreak < 7) {
			return {
				bgColor:
					"from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
				borderColor: "border-blue-200 dark:border-blue-800",
				message: t("streak.display.status.buildingMomentum.message"),
				streakColor: "text-blue-800 dark:text-blue-200",
				textColor: "text-blue-600 dark:text-blue-400",
				title: t("streak.display.status.buildingMomentum.title"),
			};
		} else if (currentStreak < 30) {
			return {
				bgColor:
					"from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
				borderColor: "border-orange-200 dark:border-orange-800",
				message: t("streak.display.status.greatProgress.message"),
				streakColor: "text-orange-800 dark:text-orange-200",
				textColor: "text-orange-600 dark:text-orange-400",
				title: t("streak.display.status.greatProgress.title"),
			};
		} else {
			return {
				bgColor:
					"from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
				borderColor: "border-purple-200 dark:border-purple-800",
				message: t("streak.display.status.streakMaster.message"),
				streakColor: "text-purple-800 dark:text-purple-200",
				textColor: "text-purple-600 dark:text-purple-400",
				title: t("streak.display.status.streakMaster.title"),
			};
		}
	};

	const status = getStreakStatus();

	// Get next milestone
	const milestones = [7, 30, 50, 100, 200, 365];
	const nextMilestone = milestones.find((m) => m > currentStreak);

	const handleStreakClick = () => {
		// Track interaction with streak display
		if (posthog) {
			posthog.capture("streak_display_clicked", {
				currentStreak,
				longestStreak,
				milestonesReached: milestonesReached.length,
				totalStudyDays,
			});
		}
	};

	return (
		<button
			aria-label="View streak details"
			className={`bg-gradient-to-r ${status.bgColor} border ${status.borderColor} group cursor-pointer rounded-lg p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:hover:border-slate-500 dark:hover:shadow-slate-900/20 ${className} w-full text-left`}
			data-testid="streak-display"
			onClick={handleStreakClick}
			type="button"
		>
			{/* Header */}
			<div className="mb-4 flex items-center justify-between">
				<h3 className="font-semibold text-lg text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-200">
					{t("streak.display.title")}
				</h3>
				{lastMilestone && (
					<div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-800 text-xs transition-transform duration-200 hover:scale-105 dark:bg-amber-900/30 dark:text-amber-200">
						🏅 {t("streak.display.milestoneAchieved", { count: lastMilestone })}
					</div>
				)}
			</div>

			{/* Current streak display */}
			<div className="mb-4 text-center">
				<div
					className={`font-bold text-4xl ${status.streakColor} mb-1 transition-transform duration-200 group-hover:scale-110`}
					data-testid="current-streak"
				>
					{currentStreak}
				</div>
				<div
					className={`font-medium text-sm ${status.textColor} transition-colors group-hover:text-slate-500 dark:group-hover:text-slate-300`}
				>
					{currentStreak === 1
						? t("streak.display.day")
						: t("streak.display.days")}
				</div>
			</div>

			{/* Status message */}
			<div className="mb-4 text-center">
				<div className="mb-1 font-semibold text-lg text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-200">
					{status.title}
				</div>
				<div
					className={`text-sm ${status.textColor} transition-colors group-hover:text-slate-500 dark:group-hover:text-slate-300`}
				>
					{status.message}
				</div>
			</div>

			{/* Progress to next milestone */}
			{nextMilestone && currentStreak > 0 && (
				<div className="mb-4">
					<div className="mb-1 flex justify-between text-slate-600 text-xs transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
						<span>{t("streak.display.nextMilestone")}</span>
						<span>
							{t("streak.display.milestoneAchieved", { count: nextMilestone })}
						</span>
					</div>
					<div className="h-2 w-full rounded-full bg-slate-200 transition-all duration-200 group-hover:h-2.5 dark:bg-slate-700">
						<div
							className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
							style={{
								width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%`,
							}}
						></div>
					</div>
					<div className="mt-1 text-center text-slate-500 text-xs transition-colors group-hover:text-slate-400 dark:text-slate-400 dark:group-hover:text-slate-300">
						{t("streak.display.daysToGo", {
							count: nextMilestone - currentStreak,
						})}
					</div>
				</div>
			)}

			{/* Statistics */}
			<div className="grid grid-cols-2 gap-4 border-slate-200 border-t pt-4 dark:border-slate-600">
				<div className="rounded-lg p-2 text-center transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50">
					<div className="font-bold text-lg text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{longestStreak}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("streak.display.longestStreak")}
					</div>
				</div>
				<div className="rounded-lg p-2 text-center transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-700/50">
					<div className="font-bold text-lg text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{totalStudyDays}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("streak.display.totalDays")}
					</div>
				</div>
			</div>

			{/* Milestones achieved */}
			{milestonesReached.length > 0 && (
				<div className="mt-4 border-slate-200 border-t pt-4 dark:border-slate-600">
					<div className="mb-2 text-slate-600 text-xs transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
						{t("streak.display.milestonesAchieved")}
					</div>
					<div className="flex flex-wrap gap-1">
						{milestonesReached.map((milestone: number) => (
							<span
								className="inline-flex cursor-pointer items-center rounded-full bg-yellow-100 px-2 py-1 font-medium text-xs text-yellow-800 transition-all duration-200 hover:scale-105 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/40"
								key={milestone}
							>
								🏅 {milestone}
							</span>
						))}
					</div>
				</div>
			)}
		</button>
	);
}
