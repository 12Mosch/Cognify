import { useQuery } from "convex/react";
import { t } from "i18next";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";

interface AchievementsWidgetProps {
	className?: string;
}

/**
 * Achievements Widget Component
 *
 * Displays user's gamification progress including:
 * - Unlocked achievements and badges
 * - Progress toward next achievements
 * - Category-based progress visualization
 * - Points and tier system
 * - Motivational elements
 */
const AchievementsWidget = memo(function AchievementsWidget({
	className = "",
}: AchievementsWidgetProps) {
	const { t } = useTranslation();
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [showAllAchievements, setShowAllAchievements] = useState(false);

	// Fetch user achievements
	const achievementsData = useQuery(api.gamification.getUserAchievements);

	// Loading state
	if (achievementsData === undefined) {
		return <AchievementsWidgetSkeleton className={className} />;
	}

	const {
		unlockedAchievements,
		totalPoints,
		nextAchievements,
		categoryProgress,
	} = achievementsData;

	// Get tier styling
	const getTierStyle = (tier: string) => {
		switch (tier) {
			case "bronze":
				return "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
			case "gold":
				return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
			case "platinum":
				return "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
			case "diamond":
				return "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
			case "silver":
			default:
				return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
		}
	};

	// Get category icon
	const getCategoryIcon = (category: string) => {
		switch (category) {
			case "streak":
				return "🔥";
			case "mastery":
				return "🎯";
			case "velocity":
				return "⚡";
			case "consistency":
				return "📅";
			case "exploration":
				return "🗺️";
			case "social":
				return "👥";
			default:
				return "🏆";
		}
	};

	const categories = Object.entries(categoryProgress);
	const recentAchievements = unlockedAchievements
		.filter((a) => a.unlockedAt !== undefined)
		.sort((a, b) => b.unlockedAt - a.unlockedAt)
		.slice(0, 3);

	return (
		<div
			className={`group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20 ${className}`}
		>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 transition-transform duration-200 group-hover:scale-105">
						<span className="text-lg text-white">🏆</span>
					</div>
					<div>
						<h3 className="font-semibold text-lg text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-200">
							{t("achievements.title", "Achievements")}
						</h3>
						<p className="text-slate-600 text-sm transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
							{totalPoints} {t("achievements.points", "points")} •{" "}
							{unlockedAchievements.length}{" "}
							{t("achievements.unlocked", "unlocked")}
						</p>
					</div>
				</div>

				<button
					onClick={() => setShowAllAchievements(!showAllAchievements)}
					className="rounded-md px-3 py-1 text-blue-600 text-sm transition-all duration-200 hover:scale-105 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
				>
					{showAllAchievements
						? t("achievements.showSummary", "Show Summary")
						: t("achievements.showAll", "Show All")}
				</button>
			</div>

			{!showAllAchievements ? (
				/* Summary View */
				<div className="space-y-6">
					{/* Recent Achievements */}
					{recentAchievements.length > 0 && (
						<div>
							<h4 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
								{t("achievements.recent", "Recent Achievements")}
							</h4>
							<div className="space-y-2">
								{recentAchievements.map((achievement) => (
									<AchievementCard
										key={achievement.achievementId}
										achievement={achievement.achievement}
										unlockedAt={achievement.unlockedAt}
										getTierStyle={getTierStyle}
									/>
								))}
							</div>
						</div>
					)}

					{/* Category Progress */}
					<div>
						<h4 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
							{t("achievements.categoryProgress", "Category Progress")}
						</h4>
						<div className="grid grid-cols-2 gap-3">
							{categories.map(([category, progress]) => (
								<div
									key={category}
									className="cursor-pointer rounded-lg bg-slate-50 p-3 transition-all duration-200 hover:scale-105 hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600"
									onClick={() =>
										setSelectedCategory(
											selectedCategory === category ? null : category,
										)
									}
								>
									<div className="mb-2 flex items-center gap-2">
										<span className="text-lg transition-transform duration-200 hover:scale-110">
											{getCategoryIcon(category)}
										</span>
										<span className="font-medium text-slate-900 text-sm capitalize transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
											{t(`achievements.categories.${category}`, category)}
										</span>
									</div>
									<div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-600">
										<div
											className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
											style={{
												width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
											}}
										/>
									</div>
									<div className="mt-1 text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
										{Math.round(progress * 100)}%{" "}
										{t("achievements.complete", "complete")}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Next Achievements */}
					{nextAchievements.length > 0 && (
						<div>
							<h4 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
								{t("achievements.nextToUnlock", "Next to Unlock")}
							</h4>
							<div className="space-y-3">
								{nextAchievements.slice(0, 3).map((next) => (
									<ProgressAchievementCard
										key={next.achievement.id}
										achievement={next.achievement}
										progress={next.progress}
										currentValue={next.currentValue}
										targetValue={next.targetValue}
										getTierStyle={getTierStyle}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			) : (
				/* All Achievements View */
				<div className="space-y-4">
					{/* Filter by category */}
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setSelectedCategory(null)}
							className={`rounded-full px-3 py-1 text-sm transition-all duration-200 hover:scale-105 ${
								selectedCategory === null
									? "bg-blue-600 text-white hover:bg-blue-700"
									: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
							}`}
						>
							{t("achievements.all", "All")}
						</button>
						{categories.map(([category]) => (
							<button
								key={category}
								onClick={() => setSelectedCategory(category)}
								className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-all duration-200 hover:scale-105 ${
									selectedCategory === category
										? "bg-blue-600 text-white hover:bg-blue-700"
										: "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
								}`}
							>
								<span className="transition-transform duration-200 hover:scale-110">
									{getCategoryIcon(category)}
								</span>
								<span className="capitalize">
									{t(`achievements.categories.${category}`, category)}
								</span>
							</button>
						))}
					</div>

					{/* Unlocked Achievements */}
					<div>
						<h4 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
							{t("achievements.unlocked", "Unlocked")} (
							{unlockedAchievements.length})
						</h4>
						<div className="grid grid-cols-1 gap-2">
							{unlockedAchievements
								.filter(
									(a) =>
										!selectedCategory ||
										a.achievement.category === selectedCategory,
								)
								.map((achievement) => (
									<AchievementCard
										key={achievement.achievementId}
										achievement={achievement.achievement}
										unlockedAt={achievement.unlockedAt}
										getTierStyle={getTierStyle}
									/>
								))}
						</div>
					</div>

					{/* Progress Achievements */}
					{nextAchievements.filter(
						(a) =>
							!selectedCategory || a.achievement.category === selectedCategory,
					).length > 0 && (
						<div>
							<h4 className="mb-3 font-medium text-slate-700 text-sm dark:text-slate-300">
								{t("achievements.inProgress", "In Progress")}
							</h4>
							<div className="grid grid-cols-1 gap-3">
								{nextAchievements
									.filter(
										(a) =>
											!selectedCategory ||
											a.achievement.category === selectedCategory,
									)
									.map((next) => (
										<ProgressAchievementCard
											key={next.achievement.id}
											achievement={next.achievement}
											progress={next.progress}
											currentValue={next.currentValue}
											targetValue={next.targetValue}
											getTierStyle={getTierStyle}
										/>
									))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
});

// Helper Components
const AchievementCard = memo(function AchievementCard({
	achievement,
	unlockedAt,
	getTierStyle,
}: {
	achievement: {
		id: string;
		name: string;
		description: string;
		tier: string;
		icon: string;
		points: number;
	};
	unlockedAt?: number;
	getTierStyle: (tier: string) => string;
}) {
	const { t } = useTranslation();

	return (
		<div className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-3 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600">
			<div className="text-2xl transition-transform duration-200 hover:scale-110">
				{achievement.icon}
			</div>
			<div className="flex-1">
				<div className="mb-1 flex items-center gap-2">
					<h5 className="font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{achievement.name}
					</h5>
					<span
						className={`rounded border px-2 py-1 font-medium text-xs transition-all duration-200 hover:scale-105 ${getTierStyle(achievement.tier)}`}
					>
						{achievement.tier}
					</span>
				</div>
				<p className="text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
					{achievement.description}
				</p>
				{unlockedAt && (
					<p className="mt-1 text-slate-500 text-xs transition-colors hover:text-slate-400 dark:text-slate-400 dark:hover:text-slate-300">
						{t("achievements.unlockedOn", "Unlocked on")}{" "}
						{new Date(unlockedAt).toLocaleDateString()}
					</p>
				)}
			</div>
			<div className="text-right">
				<div className="font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
					+{achievement.points}
				</div>
				<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
					{t("achievements.points", "points")}
				</div>
			</div>
		</div>
	);
});

const ProgressAchievementCard = memo(function ProgressAchievementCard({
	achievement,
	progress,
	currentValue,
	targetValue,
	getTierStyle,
}: {
	achievement: {
		id: string;
		name: string;
		description: string;
		tier: string;
		icon: string;
		points: number;
	};
	progress: number;
	currentValue: number;
	targetValue: number;
	getTierStyle: (tier: string) => string;
}) {
	return (
		<div className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 p-3 transition-all duration-200 hover:scale-[1.02] hover:bg-slate-100 hover:shadow-md dark:bg-slate-700 dark:hover:bg-slate-600">
			<div className="text-2xl opacity-60 transition-all duration-200 hover:scale-110 hover:opacity-80">
				{achievement.icon}
			</div>
			<div className="flex-1">
				<div className="mb-1 flex items-center gap-2">
					<h5 className="font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{achievement.name}
					</h5>
					<span
						className={`rounded border px-2 py-1 font-medium text-xs transition-all duration-200 hover:scale-105 ${getTierStyle(achievement.tier)}`}
					>
						{achievement.tier}
					</span>
				</div>
				<p className="mb-2 text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
					{achievement.description}
				</p>
				<div className="flex items-center gap-2">
					<div className="h-2 flex-1 rounded-full bg-slate-200 transition-all duration-200 hover:h-2.5 dark:bg-slate-600">
						<div
							className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
							style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
						/>
					</div>
					<span className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{currentValue}/{targetValue}
					</span>
				</div>
			</div>
			<div className="text-right">
				<div className="font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
					+{achievement.points}
				</div>
				<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
					{t("achievements.points", "points")}
				</div>
			</div>
		</div>
	);
});

const AchievementsWidgetSkeleton = memo(function AchievementsWidgetSkeleton({
	className,
}: {
	className: string;
}) {
	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<div className="animate-pulse space-y-4">
				<div className="h-6 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
				<div className="space-y-3">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="h-16 rounded bg-slate-200 dark:bg-slate-700"
						/>
					))}
				</div>
				<div className="grid grid-cols-2 gap-3">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="h-20 rounded bg-slate-200 dark:bg-slate-700"
						/>
					))}
				</div>
			</div>
		</div>
	);
});

export default AchievementsWidget;
