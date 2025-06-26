import { useQuery } from "convex/react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { formatTimeSlot } from "../utils/scheduling";

interface SmartSchedulingWidgetProps {
	className?: string;
}

/**
 * Smart Scheduling Widget Component
 *
 * Provides intelligent study session recommendations including:
 * - Real-time optimal study time detection
 * - Personalized scheduling based on performance patterns
 * - Energy level predictions
 * - Immediate study recommendations
 * - Weekly study schedule overview
 */
const SmartSchedulingWidget = memo(function SmartSchedulingWidget({
	className = "",
}: SmartSchedulingWidgetProps) {
	const { t, i18n } = useTranslation();
	const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);

	// Fetch today's recommendations and weekly schedule
	const todayRecommendations = useQuery(
		api.smartScheduling.getTodayStudyRecommendations,
		{
			language: i18n.language,
			userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		},
	);

	const weeklySchedule = useQuery(api.smartScheduling.getStudyRecommendations, {
		daysAhead: 7,
		language: i18n.language,
		userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});

	// Loading state
	if (todayRecommendations === undefined || weeklySchedule === undefined) {
		return <SchedulingWidgetSkeleton className={className} />;
	}

	// Error state - Convex returns null for query errors
	if (todayRecommendations === null || weeklySchedule === null) {
		return <SchedulingErrorState className={className} />;
	}

	// No data state
	if (!todayRecommendations) {
		return <NoSchedulingDataState className={className} />;
	}

	const {
		currentTimeSlot,
		isOptimalTime,
		nextOptimalTime,
		immediateRecommendation,
		dueCardsCount,
		newCardsAvailable,
		energyLevelPrediction,
	} = todayRecommendations;

	// Get energy level styling
	const getEnergyLevelStyle = (level: string) => {
		switch (level) {
			case "high":
				return "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
			case "medium":
				return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
			case "low":
				return "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
			default:
				return "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
		}
	};

	return (
		<div
			className={`group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20 ${className}`}
		>
			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 transition-transform duration-200 group-hover:scale-105">
						<span className="text-lg text-white">🧠</span>
					</div>
					<div>
						<h3 className="font-semibold text-lg text-slate-900 transition-colors group-hover:text-slate-700 dark:text-slate-100 dark:group-hover:text-slate-200">
							{t("scheduling.title", "Smart Scheduling")}
						</h3>
						<p className="text-slate-600 text-sm transition-colors group-hover:text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-300">
							{t("scheduling.subtitle", "AI-powered study recommendations")}
						</p>
					</div>
				</div>

				<button
					className="rounded-md px-3 py-1 text-blue-600 text-sm transition-all duration-200 hover:scale-105 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:text-blue-300"
					onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
					type="button"
				>
					{showWeeklySchedule
						? t("scheduling.showToday", "Show Today")
						: t("scheduling.showWeekly", "Show Weekly")}
				</button>
			</div>

			{!showWeeklySchedule ? (
				/* Today's Recommendations */
				<div className="space-y-4">
					{/* Current Status */}
					<div className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-4 transition-colors duration-200 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600">
						<div>
							<div className="mb-1 text-slate-600 text-sm dark:text-slate-400">
								{t("scheduling.currentTime", "Current Time Slot")}
							</div>
							<div className="font-medium text-slate-900 dark:text-slate-100">
								{formatTimeSlot(currentTimeSlot, t, "scheduling")}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<div
								className={`rounded-full border px-3 py-1 font-medium text-xs transition-all duration-200 hover:scale-105 ${
									isOptimalTime
										? "border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
										: "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
								}`}
							>
								{isOptimalTime
									? t("scheduling.optimal", "Optimal")
									: t("scheduling.suboptimal", "Sub-optimal")}
							</div>
						</div>
					</div>

					{/* Energy Level */}
					<div className="flex cursor-pointer items-center justify-between rounded-lg bg-slate-50 p-4 transition-colors duration-200 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600">
						<div>
							<div className="mb-1 text-slate-600 text-sm dark:text-slate-400">
								{t("scheduling.energyLevel", "Predicted Energy Level")}
							</div>
							<div
								className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium text-sm transition-all duration-200 hover:scale-105 ${getEnergyLevelStyle(energyLevelPrediction)}`}
							>
								<span>
									{energyLevelPrediction === "high"
										? "🔥"
										: energyLevelPrediction === "medium"
											? "⚡"
											: "😴"}
								</span>
								{t(
									`scheduling.energy.${energyLevelPrediction}`,
									energyLevelPrediction,
								)}
							</div>
						</div>
					</div>

					{/* Cards Available */}
					<div className="grid grid-cols-2 gap-4">
						<div className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 p-4 transition-all duration-200 hover:scale-105 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:border-blue-700 dark:hover:bg-blue-900/30">
							<div className="mb-1 font-bold text-2xl text-blue-700 dark:text-blue-300">
								{dueCardsCount}
							</div>
							<div className="text-blue-600 text-sm dark:text-blue-400">
								{t("scheduling.dueCards", "Due Cards")}
							</div>
						</div>
						<div className="cursor-pointer rounded-lg border border-green-200 bg-green-50 p-4 transition-all duration-200 hover:scale-105 hover:border-green-300 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:hover:border-green-700 dark:hover:bg-green-900/30">
							<div className="mb-1 font-bold text-2xl text-green-700 dark:text-green-300">
								{newCardsAvailable}
							</div>
							<div className="text-green-600 text-sm dark:text-green-400">
								{t("scheduling.newCards", "New Cards")}
							</div>
						</div>
					</div>

					{/* Immediate Recommendation */}
					{immediateRecommendation && (
						<div className="cursor-pointer rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-purple-300 hover:from-purple-100 hover:to-blue-100 dark:border-purple-800 dark:from-purple-900/20 dark:to-blue-900/20 dark:hover:border-purple-700 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30">
							<div className="flex items-start gap-3">
								<div className="text-2xl transition-transform duration-200 hover:scale-110">
									💡
								</div>
								<div className="flex-1">
									<h4 className="mb-1 font-semibold text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
										{immediateRecommendation.action}
									</h4>
									<p className="mb-3 text-slate-600 text-sm transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
										{immediateRecommendation.reasoning}
									</p>
									{immediateRecommendation.estimatedDuration > 0 && (
										<div className="flex items-center gap-4 text-sm">
											<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
												⏱️ {immediateRecommendation.estimatedDuration} min
											</span>
											<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
												📚 {immediateRecommendation.expectedCards} cards
											</span>
											<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
												🎯{" "}
												{Math.round(immediateRecommendation.confidence * 100)}%
												confidence
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Next Optimal Time */}
					{nextOptimalTime && !isOptimalTime && (
						<div className="cursor-pointer rounded-lg border border-yellow-200 bg-yellow-50 p-4 transition-all duration-200 hover:scale-[1.02] hover:border-yellow-300 hover:bg-yellow-100 dark:border-yellow-800 dark:bg-yellow-900/20 dark:hover:border-yellow-700 dark:hover:bg-yellow-900/30">
							<div className="flex items-center gap-2">
								<span className="text-yellow-600 transition-transform duration-200 hover:scale-110 dark:text-yellow-400">
									⏰
								</span>
								<span className="text-sm text-yellow-700 transition-colors hover:text-yellow-600 dark:text-yellow-300 dark:hover:text-yellow-200">
									{t("scheduling.nextOptimal", "Next optimal time")}:{" "}
									<strong>{nextOptimalTime}</strong>
								</span>
							</div>
						</div>
					)}
				</div>
			) : (
				/* Weekly Schedule */
				<div className="space-y-4">
					{weeklySchedule && weeklySchedule.length > 0 ? (
						weeklySchedule
							.slice(0, 7)
							.map((day, index) => (
								<WeeklyScheduleDay
									day={day}
									isToday={index === 0}
									key={day.date}
								/>
							))
					) : weeklySchedule === null ? (
						/* Weekly schedule error state */
						<div className="rounded-lg border border-red-200 bg-red-50 p-4 py-8 text-center dark:border-red-800 dark:bg-red-900/20">
							<div className="mb-2 text-2xl">⚠️</div>
							<div className="mb-1 font-medium text-red-700 dark:text-red-300">
								{t(
									"scheduling.weeklyError.title",
									"Unable to load weekly schedule",
								)}
							</div>
							<div className="text-red-600 text-sm dark:text-red-400">
								{t(
									"scheduling.weeklyError.description",
									"Today's recommendations are still available above",
								)}
							</div>
						</div>
					) : (
						<div className="py-8 text-center text-slate-500 dark:text-slate-400">
							{t(
								"scheduling.noWeeklyData",
								"Weekly schedule will appear after more study sessions",
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
});

// Helper Components
const WeeklyScheduleDay = memo(function WeeklyScheduleDay({
	day,
	isToday,
}: {
	day: {
		date: string;
		recommendations: Array<{
			timeSlot: string;
			startTime: string;
			duration: number;
			expectedCards: number;
			priority: string;
		}>;
		totalEstimatedCards: number;
		estimatedStudyTime: number;
	};
	isToday: boolean;
}) {
	const { i18n } = useTranslation();
	const date = new Date(day.date);
	const dayName = date.toLocaleDateString(i18n.language, { weekday: "short" });
	const dayNumber = date.getDate();

	return (
		<div
			className={`cursor-pointer rounded-lg border p-4 transition-all duration-200 hover:scale-[1.02] ${
				isToday
					? "border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:border-blue-700 dark:hover:bg-blue-900/30"
					: "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-600"
			}`}
		>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm transition-transform duration-200 hover:scale-110 ${
							isToday
								? "bg-blue-600 text-white"
								: "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-300"
						}`}
					>
						{dayNumber}
					</div>
					<div>
						<div className="font-medium text-slate-900 transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
							{dayName}
							{isToday && (
								<span className="ml-2 text-blue-600 text-xs dark:text-blue-400">
									Today
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="text-right">
					<div className="font-medium text-slate-900 text-sm transition-colors hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-200">
						{day.totalEstimatedCards} cards
					</div>
					<div className="text-slate-600 text-xs transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
						{day.estimatedStudyTime} min
					</div>
				</div>
			</div>

			{day.recommendations.length > 0 && (
				<div className="space-y-2">
					{day.recommendations.slice(0, 2).map((rec) => (
						<div
							className="flex items-center justify-between rounded p-2 text-sm transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-600"
							key={rec.cardId}
						>
							<span className="text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300">
								{rec.startTime} • {rec.duration}min
							</span>
							<span
								className={`rounded px-2 py-1 text-xs transition-all duration-200 hover:scale-105 ${
									rec.priority === "high"
										? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
										: rec.priority === "medium"
											? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
											: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
								}`}
							>
								{rec.expectedCards} cards
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
});

const SchedulingWidgetSkeleton = memo(function SchedulingWidgetSkeleton({
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
				<div className="h-16 rounded bg-slate-200 dark:bg-slate-700" />
				<div className="h-12 rounded bg-slate-200 dark:bg-slate-700" />
				<div className="grid grid-cols-2 gap-4">
					<div className="h-16 rounded bg-slate-200 dark:bg-slate-700" />
					<div className="h-16 rounded bg-slate-200 dark:bg-slate-700" />
				</div>
			</div>
		</div>
	);
});

const NoSchedulingDataState = memo(function NoSchedulingDataState({
	className,
}: {
	className: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={`rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800 ${className}`}
		>
			<div className="py-8 text-center">
				<div className="mb-3 text-4xl">🧠</div>
				<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
					{t("scheduling.noData.title", "Building Your Schedule")}
				</h3>
				<p className="text-slate-600 text-sm dark:text-slate-400">
					{t(
						"scheduling.noData.description",
						"Complete a few study sessions to get personalized recommendations",
					)}
				</p>
			</div>
		</div>
	);
});

const SchedulingErrorState = memo(function SchedulingErrorState({
	className,
}: {
	className: string;
}) {
	const { t } = useTranslation();

	return (
		<div
			className={`rounded-xl border border-red-200 bg-white p-6 dark:border-red-700 dark:bg-slate-800 ${className}`}
		>
			<div className="py-8 text-center">
				<div className="mb-3 text-4xl">⚠️</div>
				<h3 className="mb-2 font-semibold text-lg text-red-900 dark:text-red-100">
					{t("scheduling.error.title", "Unable to load recommendations")}
				</h3>
				<p className="mb-4 text-red-600 text-sm dark:text-red-400">
					{t("scheduling.error.description", "Please try again later")}
				</p>
				<button
					className="rounded-lg bg-red-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-red-700"
					onClick={() => window.location.reload()}
					type="button"
				>
					{t("scheduling.error.retry", "Retry")}
				</button>
			</div>
		</div>
	);
});

export default SmartSchedulingWidget;
