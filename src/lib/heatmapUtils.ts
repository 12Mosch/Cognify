/**
 * Utility functions for Study History Heatmap
 * Handles date calculations, grid generation, and activity level determination
 */

import i18n from "../i18n";

export interface HeatmapDay {
	date: string; // YYYY-MM-DD format
	cardsStudied: number;
	sessionCount: number;
	totalDuration?: number;
	level: 0 | 1 | 2 | 3 | 4; // Activity level for color intensity
	dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
	weekIndex: number; // Week position in the grid
	dayIndex: number; // Day position within the week
}

export interface HeatmapWeek {
	weekIndex: number;
	days: HeatmapDay[];
}

export interface HeatmapData {
	weeks: HeatmapWeek[];
	months: Array<{
		name: string;
		weekStart: number;
		weekSpan: number;
	}>;
	totalDays: number;
	startDate: Date;
	endDate: Date;
}

/**
 * Generate a complete 365-day heatmap grid structure
 * Creates a GitHub-style contribution graph layout
 * @param locale - Optional locale for month formatting (defaults to 'en-US')
 */
export function generateHeatmapGrid(
	studyData: Array<{
		date: string;
		cardsStudied: number;
		sessionCount: number;
		totalDuration?: number;
	}>,
	locale: string = "en-US",
): HeatmapData {
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - 364); // 365 days total including today

	// Create a map for quick lookup of study data
	const studyDataMap = new Map(studyData.map((item) => [item.date, item]));

	// Generate all days in the range
	const allDays: HeatmapDay[] = [];
	const currentDate = new Date(startDate);

	while (currentDate <= endDate) {
		const dateStr = currentDate.toISOString().split("T")[0];
		const studyInfo = studyDataMap.get(dateStr);

		const cardsStudied = studyInfo?.cardsStudied || 0;
		const sessionCount = studyInfo?.sessionCount || 0;
		const totalDuration = studyInfo?.totalDuration;

		allDays.push({
			cardsStudied,
			date: dateStr,
			dayIndex: 0,
			dayOfWeek: currentDate.getDay(),
			level: getActivityLevel(cardsStudied),
			sessionCount,
			totalDuration, // Will be calculated below
			weekIndex: 0, // Will be calculated below
		});

		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Organize days into weeks (GitHub-style: Sunday = start of week)
	const weeks: HeatmapWeek[] = [];
	let currentWeek: HeatmapDay[] = [];
	let weekIndex = 0;

	// Add empty days at the beginning if the start date is not Sunday
	const startDayOfWeek = allDays[0].dayOfWeek;
	for (let i = 0; i < startDayOfWeek; i++) {
		// Add placeholder days for proper grid alignment
		const placeholderDate = new Date(startDate);
		placeholderDate.setDate(placeholderDate.getDate() - (startDayOfWeek - i));

		currentWeek.push({
			cardsStudied: 0,
			date: placeholderDate.toISOString().split("T")[0],
			dayIndex: i,
			dayOfWeek: i,
			level: 0,
			sessionCount: 0,
			weekIndex,
		});
	}

	// Add all actual days
	allDays.forEach((day, index) => {
		day.weekIndex = weekIndex;
		day.dayIndex = currentWeek.length;
		currentWeek.push(day);

		// If we've completed a week (7 days) or reached the end
		if (currentWeek.length === 7 || index === allDays.length - 1) {
			// Fill remaining days of the week if needed
			while (currentWeek.length < 7) {
				const lastDayInWeek = currentWeek[currentWeek.length - 1];
				const nextDate = new Date(lastDayInWeek.date);
				nextDate.setDate(nextDate.getDate() + 1);

				currentWeek.push({
					cardsStudied: 0,
					date: nextDate.toISOString().split("T")[0],
					dayIndex: currentWeek.length,
					dayOfWeek: currentWeek.length,
					level: 0,
					sessionCount: 0,
					weekIndex,
				});
			}

			weeks.push({
				days: [...currentWeek],
				weekIndex,
			});

			currentWeek = [];
			weekIndex++;
		}
	});

	// Generate month labels
	const months = generateMonthLabels(weeks, locale);

	return {
		endDate,
		months,
		startDate,
		totalDays: allDays.length,
		weeks,
	};
}

/**
 * Determine activity level based on cards studied
 * Returns a level from 0-4 for color intensity
 */
export function getActivityLevel(cardsStudied: number): 0 | 1 | 2 | 3 | 4 {
	if (cardsStudied === 0) return 0;
	if (cardsStudied <= 2) return 1;
	if (cardsStudied <= 10) return 2;
	if (cardsStudied <= 20) return 3;
	return 4;
}

/**
 * Generate month labels for the heatmap header
 * @param locale - Optional locale for month formatting (defaults to 'en-US')
 */
function generateMonthLabels(
	weeks: HeatmapWeek[],
	locale: string = "en-US",
): Array<{
	name: string;
	weekStart: number;
	weekSpan: number;
}> {
	const months: Array<{
		name: string;
		weekStart: number;
		weekSpan: number;
	}> = [];

	let currentMonth = -1;
	let monthStart = 0;

	weeks.forEach((week, weekIndex) => {
		// Check the first day of the week to determine month
		const firstDay = week.days.find((day) => day.cardsStudied >= 0 || day.date);
		if (!firstDay) return;

		const date = new Date(firstDay.date);
		const month = date.getMonth();

		if (month !== currentMonth) {
			// Finish previous month
			if (currentMonth !== -1) {
				months[months.length - 1].weekSpan = weekIndex - monthStart;
			}

			// Start new month
			currentMonth = month;
			monthStart = weekIndex;

			months.push({
				name: date.toLocaleDateString(locale, { month: "short" }),
				weekSpan: 1,
				weekStart: weekIndex, // Will be updated when month ends
			});
		}
	});

	// Finish the last month
	if (months.length > 0) {
		months[months.length - 1].weekSpan = weeks.length - monthStart;
	}

	// Filter out months that are too narrow to display
	return months.filter((month) => month.weekSpan >= 2);
}

/**
 * Get CSS classes for activity level colors
 */
export function getActivityLevelClasses(level: 0 | 1 | 2 | 3 | 4): string {
	switch (level) {
		case 0:
			return "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
		case 1:
			return "bg-blue-200 dark:bg-blue-900/40 border-blue-300 dark:border-blue-800";
		case 2:
			return "bg-blue-300 dark:bg-blue-800/60 border-blue-400 dark:border-blue-700";
		case 3:
			return "bg-blue-400 dark:bg-blue-700/80 border-blue-500 dark:border-blue-600";
		case 4:
			return "bg-blue-500 dark:bg-blue-600 border-blue-600 dark:border-blue-500";
	}
}

/**
 * Format tooltip content for a heatmap day
 * @param locale - Optional locale for date formatting (defaults to 'en-US')
 */
export function formatTooltipContent(
	day: HeatmapDay,
	locale: string = "en-US",
): string {
	const date = new Date(day.date);
	const formattedDate = date.toLocaleDateString(locale, {
		day: "numeric",
		month: "short",
		weekday: "short",
		year: "numeric",
	});

	if (day.cardsStudied === 0) {
		return `${i18n.t("statistics.heatmap.tooltip.noActivity")} ${formattedDate}`;
	}

	const cardText =
		day.cardsStudied === 1
			? i18n.t("statistics.heatmap.tooltip.card")
			: i18n.t("statistics.heatmap.tooltip.cards");
	const sessionText =
		day.sessionCount === 1
			? i18n.t("statistics.heatmap.tooltip.session")
			: i18n.t("statistics.heatmap.tooltip.sessions");

	let tooltip = `${day.cardsStudied} ${cardText} ${i18n.t("statistics.heatmap.tooltip.studiedOn")} ${formattedDate}`;

	if (day.sessionCount > 1) {
		tooltip += ` (${day.sessionCount} ${sessionText})`;
	}

	if (day.totalDuration && day.totalDuration > 0) {
		const minutes = Math.round(day.totalDuration / 60000);
		tooltip += ` • ${minutes}m total`;
	}

	return tooltip;
}

/**
 * Get day of week labels for the heatmap
 */
export function getDayLabels(): string[] {
	return ["S", "M", "T", "W", "T", "F", "S"];
}

/**
 * Calculate study statistics from heatmap data
 */
export function calculateHeatmapStats(data: HeatmapData) {
	const activeDays = data.weeks
		.flatMap((week) => week.days)
		.filter((day) => day.cardsStudied > 0);

	const totalCards = activeDays.reduce((sum, day) => sum + day.cardsStudied, 0);
	const totalSessions = activeDays.reduce(
		(sum, day) => sum + day.sessionCount,
		0,
	);
	const totalTime = activeDays.reduce(
		(sum, day) => sum + (day.totalDuration || 0),
		0,
	);

	const maxCardsInDay = Math.max(
		...activeDays.map((day) => day.cardsStudied),
		0,
	);
	const averageCardsPerActiveDay =
		activeDays.length > 0 ? Math.round(totalCards / activeDays.length) : 0;

	return {
		activeDays: activeDays.length,
		averageCardsPerActiveDay,
		maxCardsInDay,
		studyRate: Math.round((activeDays.length / data.totalDays) * 100),
		totalCards,
		totalSessions,
		totalTime: totalTime > 0 ? totalTime : undefined,
	};
}
