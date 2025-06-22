import { memo } from "react";
import { useTranslation } from "react-i18next";

interface LearningStreakWidgetProps {
	currentStreak: number;
	longestStreak: number;
}

/**
 * Learning Streak Widget Component
 *
 * Displays learning streak information with:
 * - Circular progress indicator
 * - Motivational messaging
 * - Streak milestones and achievements
 * - Dark theme support with glowing effects
 * - Responsive design
 */
const LearningStreakWidget = memo(function LearningStreakWidget({
	currentStreak,
	longestStreak,
}: LearningStreakWidgetProps) {
	const { t } = useTranslation();

	const getStreakMessage = (streak: number) => {
		if (streak === 0)
			return t("statistics.widgets.learningStreak.messages.start");
		if (streak === 1)
			return t("statistics.widgets.learningStreak.messages.greatStart");
		if (streak < 7)
			return t("statistics.widgets.learningStreak.messages.buildingMomentum");
		if (streak < 30)
			return t("statistics.widgets.learningStreak.messages.onFire");
		if (streak < 100)
			return t(
				"statistics.widgets.learningStreak.messages.incredibleDedication",
			);
		return t("statistics.widgets.learningStreak.messages.legendaryLearner");
	};

	const getStreakColor = (streak: number) => {
		if (streak === 0) return "text-slate-400";
		if (streak < 7) return "text-blue-500";
		if (streak < 30) return "text-cyan-500";
		if (streak < 100) return "text-teal-500";
		return "text-amber-500";
	};

	const getStreakIcon = (streak: number) => {
		if (streak === 0) return "💤";
		if (streak < 7) return "🌱";
		if (streak < 30) return "🔥";
		if (streak < 100) return "⚡";
		return "👑";
	};

	// Calculate progress towards next milestone
	const getNextMilestone = (streak: number) => {
		if (streak < 7) return 7;
		if (streak < 30) return 30;
		if (streak < 100) return 100;
		if (streak < 365) return 365;
		return Math.ceil(streak / 100) * 100;
	};

	const nextMilestone = getNextMilestone(currentStreak);
	const progressPercentage =
		currentStreak > 0 ? (currentStreak / nextMilestone) * 100 : 0;

	return (
		<div className="group rounded-lg border-2 border-slate-200 bg-slate-50 p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20">
			{/* Widget Header */}
			<div className="mb-6 flex items-center justify-between">
				<h3 className="font-semibold text-slate-800 text-xl transition-colors group-hover:text-slate-700 dark:text-slate-200 dark:group-hover:text-slate-100">
					{t("statistics.widgets.learningStreak.title")}
				</h3>
				<span
					aria-label="Streak"
					className="text-2xl transition-transform duration-200 hover:scale-110"
					role="img"
				>
					{getStreakIcon(currentStreak)}
				</span>
			</div>

			{/* Circular Progress */}
			<div className="mb-6 flex justify-center">
				<div className="relative cursor-pointer transition-transform duration-200 hover:scale-105">
					{/* Background Circle */}
					<svg
						aria-hidden="true"
						className="-rotate-90 h-24 w-24 transform"
						viewBox="0 0 100 100"
					>
						<circle
							className="text-slate-200 dark:text-slate-700"
							cx="50"
							cy="50"
							fill="transparent"
							r="40"
							stroke="currentColor"
							strokeWidth="8"
						/>
						{/* Progress Circle */}
						<circle
							className={`transition-all duration-1000 ease-out ${getStreakColor(currentStreak)}`}
							cx="50"
							cy="50"
							fill="transparent"
							r="40"
							stroke="currentColor"
							strokeDasharray={`${2 * Math.PI * 40}`}
							strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
							strokeLinecap="round"
							strokeWidth="8"
						/>
					</svg>

					{/* Center Content */}
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="text-center">
							<div
								className={`font-bold text-2xl ${getStreakColor(currentStreak)} transition-transform duration-200 hover:scale-110`}
							>
								{currentStreak}
							</div>
							<div className="text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
								{currentStreak === 1
									? t("statistics.cards.day")
									: t("statistics.cards.days")}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Streak Message */}
			<div className="mb-6 text-center">
				<p className="mb-1 font-medium text-slate-700 text-sm dark:text-slate-300">
					{getStreakMessage(currentStreak)}
				</p>
				{currentStreak > 0 && currentStreak < nextMilestone && (
					<p className="text-slate-500 text-xs dark:text-slate-400">
						{t("statistics.widgets.learningStreak.milestones.daysToReach", {
							count: nextMilestone - currentStreak,
							milestone: nextMilestone,
						})}
					</p>
				)}
			</div>

			{/* Streak Stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-center transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500">
					<div
						className={`font-bold text-xl ${getStreakColor(currentStreak)} transition-transform duration-200 hover:scale-110`}
					>
						{currentStreak}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.widgets.learningStreak.current")}
					</div>
				</div>
				<div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-3 text-center transition-all duration-200 hover:scale-105 hover:border-slate-300 hover:shadow-md dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500">
					<div className="font-bold text-purple-500 text-xl transition-transform duration-200 hover:scale-110 dark:text-purple-400">
						{longestStreak}
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{t("statistics.widgets.learningStreak.best")}
					</div>
				</div>
			</div>

			{/* Milestone Progress */}
			{currentStreak > 0 && currentStreak < nextMilestone && (
				<div className="mt-6">
					<div className="mb-2 flex items-center justify-between text-slate-600 text-xs dark:text-slate-400">
						<span>
							{t("statistics.widgets.learningStreak.milestones.progressTo", {
								milestone: nextMilestone,
							})}
						</span>
						<span>{progressPercentage.toFixed(0)}%</span>
					</div>
					<div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
						<div
							className={`h-2 rounded-full bg-gradient-to-r transition-all duration-1000 ease-out ${
								currentStreak < 7
									? "from-orange-400 to-orange-500"
									: currentStreak < 30
										? "from-red-400 to-red-500"
										: currentStreak < 100
											? "from-purple-400 to-purple-500"
											: "from-yellow-400 to-yellow-500"
							}`}
							style={{ width: `${Math.min(progressPercentage, 100)}%` }}
						></div>
					</div>
				</div>
			)}

			{/* Achievement Badge */}
			{currentStreak >= 7 && (
				<div className="mt-6 cursor-pointer rounded-lg border border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100 p-3 transition-all duration-200 hover:scale-105 hover:border-purple-300 hover:from-purple-200 hover:to-pink-200 dark:border-purple-800 dark:from-purple-900/20 dark:to-pink-900/20 dark:hover:border-purple-700 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30">
					<div className="flex items-center gap-2">
						<span className="text-lg transition-transform duration-200 hover:scale-110">
							🏆
						</span>
						<div>
							<div className="font-semibold text-purple-700 text-sm transition-colors hover:text-purple-600 dark:text-purple-300 dark:hover:text-purple-200">
								{currentStreak >= 365
									? t(
											"statistics.widgets.learningStreak.achievements.yearLongLearner",
										)
									: currentStreak >= 100
										? t(
												"statistics.widgets.learningStreak.achievements.centuryClub",
											)
										: currentStreak >= 30
											? t(
													"statistics.widgets.learningStreak.achievements.monthlyMaster",
												)
											: t(
													"statistics.widgets.learningStreak.achievements.weeklyWarrior",
												)}
							</div>
							<div className="text-purple-600 text-xs transition-colors hover:text-purple-500 dark:text-purple-400 dark:hover:text-purple-300">
								{t(
									"statistics.widgets.learningStreak.achievements.keepUpConsistency",
								)}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

export default LearningStreakWidget;
