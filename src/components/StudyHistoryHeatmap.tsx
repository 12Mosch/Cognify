import { useQuery } from "convex/react";
import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import {
	calculateHeatmapStats,
	formatTooltipContent,
	generateHeatmapGrid,
	getActivityLevelClasses,
	getDayLabels,
	type HeatmapDay,
} from "../lib/heatmapUtils";
import { HeatmapSkeleton } from "./skeletons/SkeletonComponents";

/**
 * Study History Heatmap Component
 *
 * Displays user study activity in a GitHub-style contribution graph format
 * showing the last 365 days of study activity with:
 * - Dark theme with cohesive blue activity indicators
 * - Month and day labels
 * - Hover tooltips with detailed information
 * - Activity level color coding
 * - Summary statistics
 * - Responsive design with horizontal scrolling on mobile
 */
const StudyHistoryHeatmap = memo(function StudyHistoryHeatmap() {
	const { t } = useTranslation();
	const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

	// Fetch study activity data from Convex
	const studyActivityData = useQuery(
		api.studySessions.getStudyActivityHeatmapData,
	);

	// Show loading skeleton while data is being fetched
	if (studyActivityData === undefined) {
		return <HeatmapSkeleton />;
	}

	// Generate heatmap grid structure
	const heatmapData = generateHeatmapGrid(studyActivityData);
	const stats = calculateHeatmapStats(heatmapData);
	const dayLabels = getDayLabels();

	/**
	 * Calculate tooltip position from element bounds
	 */
	const calculateTooltipPosition = (element: Element) => {
		const rect = element.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2,
			y: rect.top - 10,
		};
	};

	/**
	 * Handle mouse enter on heatmap day square
	 */
	const handleDayMouseEnter = (day: HeatmapDay, event: React.MouseEvent) => {
		setHoveredDay(day);
		setTooltipPosition(calculateTooltipPosition(event.currentTarget));
	};

	/**
	 * Handle focus on heatmap day square (keyboard navigation)
	 */
	const handleDayFocus = (day: HeatmapDay, event: React.FocusEvent) => {
		setHoveredDay(day);
		setTooltipPosition(calculateTooltipPosition(event.currentTarget));
	};

	/**
	 * Handle mouse leave on heatmap day square
	 */
	const handleDayMouseLeave = () => {
		setHoveredDay(null);
	};

	/**
	 * Handle blur on heatmap day square (keyboard navigation)
	 */
	const handleDayBlur = () => {
		setHoveredDay(null);
	};

	/**
	 * Handle keyboard interactions on heatmap day square
	 */
	const handleDayKeyDown = (day: HeatmapDay, event: React.KeyboardEvent) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			setHoveredDay(day);
			setTooltipPosition(calculateTooltipPosition(event.currentTarget));
		}
	};

	return (
		<div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
			{/* Header */}
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
					{t("statistics.heatmap.title")}
				</h2>
				<p className="text-sm text-slate-600 dark:text-slate-400">
					{t("statistics.heatmap.subtitle", { count: stats.activeDays })}
				</p>
			</div>

			{/* Heatmap Grid */}
			<div className="overflow-x-auto">
				<div className="min-w-[800px]">
					{/* Month Labels */}
					<div className="flex mb-2 ml-8">
						{heatmapData.months.map((month) => (
							<div
								key={`${month.name}-${month.weekStart}`}
								className="text-xs text-slate-500 dark:text-slate-400"
								style={{
									marginLeft: `${month.weekStart * 14}px`,
									width: `${month.weekSpan * 14}px`,
								}}
							>
								{month.name}
							</div>
						))}
					</div>

					{/* Grid Container */}
					<div className="flex">
						{/* Day Labels */}
						<div className="flex flex-col mr-2">
							{dayLabels.map((label, dayIndex) => (
								<div
									key={dayIndex}
									className="h-3 mb-1 flex items-center text-xs text-slate-500 dark:text-slate-400"
								>
									{dayIndex % 2 === 1 && (
										<span className="w-3 text-center">{label}</span>
									)}
								</div>
							))}
						</div>

						{/* Heatmap Squares */}
						<div className="flex gap-1">
							{heatmapData.weeks.map((week) => (
								<div key={week.weekIndex} className="flex flex-col gap-1">
									{week.days.map((day) => (
										<div
											key={`${week.weekIndex}-${day.dayIndex}`}
											className={`
                        h-3 w-3 rounded-sm border cursor-pointer transition-all duration-200 hover:scale-110
                        ${getActivityLevelClasses(day.level)}
                      `}
											onMouseEnter={(e) => handleDayMouseEnter(day, e)}
											onMouseLeave={handleDayMouseLeave}
											onFocus={(e) => handleDayFocus(day, e)}
											onBlur={handleDayBlur}
											onKeyDown={(e) => handleDayKeyDown(day, e)}
											role="gridcell"
											aria-label={formatTooltipContent(day)}
											tabIndex={0}
										/>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="flex items-center justify-between mt-4">
						<div className="text-xs text-slate-500 dark:text-slate-400">
							{t("statistics.heatmap.legend.less")}
						</div>
						<div className="flex items-center gap-1">
							{[0, 1, 2, 3, 4].map((level) => (
								<div
									key={level}
									className={`h-3 w-3 rounded-sm border ${getActivityLevelClasses(level as 0 | 1 | 2 | 3 | 4)}`}
									aria-label={`Activity level ${level}`}
								/>
							))}
						</div>
						<div className="text-xs text-slate-500 dark:text-slate-400">
							{t("statistics.heatmap.legend.more")}
						</div>
					</div>
				</div>
			</div>

			{/* Summary Statistics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
				<div className="text-center">
					<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
						{stats.totalCards}
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-400">
						{t("statistics.heatmap.stats.cardsStudied")}
					</div>
				</div>

				<div className="text-center">
					<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
						{stats.activeDays}
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-400">
						{t("statistics.heatmap.stats.activeDays")}
					</div>
				</div>

				<div className="text-center">
					<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
						{stats.maxCardsInDay}
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-400">
						{t("statistics.heatmap.stats.bestDay")}
					</div>
				</div>

				<div className="text-center">
					<div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
						{stats.studyRate}%
					</div>
					<div className="text-sm text-slate-600 dark:text-slate-400">
						{t("statistics.heatmap.stats.studyRate")}
					</div>
				</div>
			</div>

			{/* Tooltip */}
			{hoveredDay && (
				<div
					className="fixed z-50 px-3 py-2 text-sm bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg pointer-events-none"
					style={{
						left: `${tooltipPosition.x}px`,
						top: `${tooltipPosition.y}px`,
						transform: "translateX(-50%) translateY(-100%)",
					}}
				>
					<div className="whitespace-nowrap">
						{formatTooltipContent(hoveredDay)}
					</div>
					{/* Tooltip arrow */}
					<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
				</div>
			)}
		</div>
	);
});

export default StudyHistoryHeatmap;
