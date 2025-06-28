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
		<div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			{/* Header */}
			<div className="mb-6">
				<h2 className="mb-2 font-semibold text-slate-900 text-xl dark:text-slate-100">
					{t("statistics.heatmap.title")}
				</h2>
				<p className="text-slate-600 text-sm dark:text-slate-400">
					{t("statistics.heatmap.subtitle", { count: stats.activeDays })}
				</p>
			</div>

			{/* Heatmap Grid */}
			<div className="overflow-x-auto">
				<div className="min-w-[800px]">
					{/* Month Labels */}
					<div className="mb-2 ml-8 flex">
						{heatmapData.months.map((month) => (
							<div
								className="text-slate-500 text-xs dark:text-slate-400"
								key={`${month.name}-${month.weekStart}`}
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
						<div className="mr-2 flex flex-col">
							{dayLabels.map((label, dayIndex) => {
								// Create unique keys for day labels to avoid React warnings
								// Since we have duplicate letters (T for Tue/Thu, S for Sun/Sat)
								const dayNames = [
									"Sun",
									"Mon",
									"Tue",
									"Wed",
									"Thu",
									"Fri",
									"Sat",
								];
								const uniqueKey = `day-${dayNames[dayIndex]}`;

								return (
									<div
										className="mb-1 flex h-3 items-center text-slate-500 text-xs dark:text-slate-400"
										key={uniqueKey}
									>
										{dayIndex % 2 === 1 && (
											<span className="w-3 text-center">{label}</span>
										)}
									</div>
								);
							})}
						</div>

						{/* Heatmap Squares */}
						<div className="flex gap-1">
							{heatmapData.weeks.map((week) => (
								<div className="flex flex-col gap-1" key={week.weekIndex}>
									{week.days.map((day) => (
										<div
											aria-label={formatTooltipContent(day)}
											className={`h-3 w-3 cursor-pointer rounded-sm border transition-all duration-200 hover:scale-110 ${getActivityLevelClasses(day.level)} `}
											key={`${week.weekIndex}-${day.dayIndex}`}
											onBlur={handleDayBlur}
											onFocus={(e) => handleDayFocus(day, e)}
											onKeyDown={(e) => handleDayKeyDown(day, e)}
											onMouseEnter={(e) => handleDayMouseEnter(day, e)}
											onMouseLeave={handleDayMouseLeave}
											role="gridcell"
											tabIndex={0}
										/>
									))}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="mt-4 flex items-center justify-between">
						<div className="text-slate-500 text-xs dark:text-slate-400">
							{t("statistics.heatmap.legend.less")}
						</div>
						<div className="flex items-center gap-1">
							{[0, 1, 2, 3, 4].map((level) => (
								<div
									className={`h-3 w-3 rounded-sm border ${getActivityLevelClasses(level as 0 | 1 | 2 | 3 | 4)}`}
									key={level}
									title={`Activity level ${level}`}
								/>
							))}
						</div>
						<div className="text-slate-500 text-xs dark:text-slate-400">
							{t("statistics.heatmap.legend.more")}
						</div>
					</div>
				</div>
			</div>

			{/* Summary Statistics */}
			<div className="mt-6 grid grid-cols-2 gap-4 border-slate-200 border-t pt-6 md:grid-cols-4 dark:border-slate-700">
				<div className="text-center">
					<div className="font-bold text-2xl text-slate-900 dark:text-slate-100">
						{stats.totalCards}
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.heatmap.stats.cardsStudied")}
					</div>
				</div>

				<div className="text-center">
					<div className="font-bold text-2xl text-slate-900 dark:text-slate-100">
						{stats.activeDays}
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.heatmap.stats.activeDays")}
					</div>
				</div>

				<div className="text-center">
					<div className="font-bold text-2xl text-slate-900 dark:text-slate-100">
						{stats.maxCardsInDay}
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.heatmap.stats.bestDay")}
					</div>
				</div>

				<div className="text-center">
					<div className="font-bold text-2xl text-slate-900 dark:text-slate-100">
						{stats.studyRate}%
					</div>
					<div className="text-slate-600 text-sm dark:text-slate-400">
						{t("statistics.heatmap.stats.studyRate")}
					</div>
				</div>
			</div>

			{/* Tooltip */}
			{hoveredDay && (
				<div
					className="pointer-events-none fixed z-50 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-slate-700"
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
					<div className="-translate-x-1/2 absolute top-full left-1/2 h-0 w-0 transform border-transparent border-t-4 border-t-slate-900 border-r-4 border-l-4 dark:border-t-slate-700" />
				</div>
			)}
		</div>
	);
});

export default StudyHistoryHeatmap;
