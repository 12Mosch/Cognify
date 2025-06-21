import { beforeEach, describe, expect, it } from "@jest/globals";
import {
	calculateHeatmapStats,
	formatTooltipContent,
	generateHeatmapGrid,
	getActivityLevel,
	getActivityLevelClasses,
	getDayLabels,
	type HeatmapDay,
} from "../heatmapUtils";

describe("heatmapUtils", () => {
	beforeEach(() => {
		// Mock Date.now() to return a consistent timestamp for testing
		// January 15, 2024, 12:00:00 PM UTC
		jest.useFakeTimers();
		jest.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("getActivityLevel", () => {
		it("returns correct activity levels for different card counts", () => {
			expect(getActivityLevel(0)).toBe(0);
			expect(getActivityLevel(1)).toBe(1);
			expect(getActivityLevel(2)).toBe(1);
			expect(getActivityLevel(3)).toBe(2);
			expect(getActivityLevel(10)).toBe(2);
			expect(getActivityLevel(11)).toBe(3);
			expect(getActivityLevel(20)).toBe(3);
			expect(getActivityLevel(21)).toBe(4);
			expect(getActivityLevel(100)).toBe(4);
		});
	});

	describe("getActivityLevelClasses", () => {
		it("returns correct CSS classes for each activity level", () => {
			expect(getActivityLevelClasses(0)).toContain(
				"bg-slate-100 dark:bg-slate-800",
			);
			expect(getActivityLevelClasses(1)).toContain(
				"bg-blue-200 dark:bg-blue-900/40",
			);
			expect(getActivityLevelClasses(2)).toContain(
				"bg-blue-300 dark:bg-blue-800/60",
			);
			expect(getActivityLevelClasses(3)).toContain(
				"bg-blue-400 dark:bg-blue-700/80",
			);
			expect(getActivityLevelClasses(4)).toContain(
				"bg-blue-500 dark:bg-blue-600",
			);
		});
	});

	describe("getDayLabels", () => {
		it("returns correct day labels", () => {
			const labels = getDayLabels();
			expect(labels).toEqual(["S", "M", "T", "W", "T", "F", "S"]);
		});
	});

	describe("formatTooltipContent", () => {
		it("formats tooltip for day with no activity", () => {
			const day: HeatmapDay = {
				date: "2024-01-15",
				cardsStudied: 0,
				sessionCount: 0,
				level: 0,
				dayOfWeek: 1,
				weekIndex: 0,
				dayIndex: 1,
			};

			const result = formatTooltipContent(day);
			expect(result).toBe("No study activity on Mon, Jan 15, 2024");
		});

		it("formats tooltip for day with single card and session", () => {
			const day: HeatmapDay = {
				date: "2024-01-15",
				cardsStudied: 1,
				sessionCount: 1,
				level: 1,
				dayOfWeek: 1,
				weekIndex: 0,
				dayIndex: 1,
			};

			const result = formatTooltipContent(day);
			expect(result).toBe("1 card studied on Mon, Jan 15, 2024");
		});

		it("formats tooltip for day with multiple cards and sessions", () => {
			const day: HeatmapDay = {
				date: "2024-01-15",
				cardsStudied: 5,
				sessionCount: 2,
				level: 2,
				dayOfWeek: 1,
				weekIndex: 0,
				dayIndex: 1,
			};

			const result = formatTooltipContent(day);
			expect(result).toBe("5 cards studied on Mon, Jan 15, 2024 (2 sessions)");
		});

		it("formats tooltip with duration information", () => {
			const day: HeatmapDay = {
				date: "2024-01-15",
				cardsStudied: 10,
				sessionCount: 3,
				totalDuration: 900000, // 15 minutes
				level: 2,
				dayOfWeek: 1,
				weekIndex: 0,
				dayIndex: 1,
			};

			const result = formatTooltipContent(day);
			expect(result).toBe(
				"10 cards studied on Mon, Jan 15, 2024 (3 sessions) • 15m total",
			);
		});
	});

	describe("generateHeatmapGrid", () => {
		it("generates correct grid structure for empty data", () => {
			const studyData: Array<{
				date: string;
				cardsStudied: number;
				sessionCount: number;
				totalDuration?: number;
			}> = [];

			const result = generateHeatmapGrid(studyData);

			expect(result.totalDays).toBe(365);
			expect(result.weeks.length).toBeGreaterThan(50); // Should have ~52-53 weeks
			expect(result.months.length).toBeGreaterThan(0);

			// Check that all days have level 0 (no activity)
			const allDays = result.weeks.flatMap((week) => week.days);
			const activeDays = allDays.filter((day) => day.level > 0);
			expect(activeDays).toHaveLength(0);
		});

		it("generates correct grid structure with study data", () => {
			const studyData = [
				{ date: "2024-01-10", cardsStudied: 5, sessionCount: 1 },
				{
					date: "2024-01-11",
					cardsStudied: 8,
					sessionCount: 2,
					totalDuration: 600000,
				},
			];

			const result = generateHeatmapGrid(studyData);

			expect(result.totalDays).toBe(365);

			// Find the days with activity
			const allDays = result.weeks.flatMap((week) => week.days);
			const activeDays = allDays.filter((day) => day.cardsStudied > 0);

			expect(activeDays).toHaveLength(2);
			expect(activeDays[0].cardsStudied).toBe(5);
			expect(activeDays[1].cardsStudied).toBe(8);
			expect(activeDays[1].totalDuration).toBe(600000);
		});

		it("correctly assigns week and day indices", () => {
			const result = generateHeatmapGrid([]);

			result.weeks.forEach((week, weekIndex) => {
				expect(week.weekIndex).toBe(weekIndex);

				week.days.forEach((day, dayIndex) => {
					expect(day.weekIndex).toBe(weekIndex);
					expect(day.dayIndex).toBe(dayIndex);
					expect(day.dayOfWeek).toBeGreaterThanOrEqual(0);
					expect(day.dayOfWeek).toBeLessThanOrEqual(6);
				});

				// Each week should have exactly 7 days
				expect(week.days).toHaveLength(7);
			});
		});

		it("generates month labels correctly", () => {
			const result = generateHeatmapGrid([]);

			expect(result.months.length).toBeGreaterThan(0);

			result.months.forEach((month) => {
				expect(month.name).toMatch(
					/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/,
				);
				expect(month.weekStart).toBeGreaterThanOrEqual(0);
				expect(month.weekSpan).toBeGreaterThan(0);
			});
		});
	});

	describe("calculateHeatmapStats", () => {
		it("calculates stats correctly for empty data", () => {
			const heatmapData = {
				weeks: [
					{
						weekIndex: 0,
						days: [
							{
								date: "2024-01-15",
								cardsStudied: 0,
								sessionCount: 0,
								level: 0 as const,
								dayOfWeek: 1,
								weekIndex: 0,
								dayIndex: 1,
							},
						],
					},
				],
				months: [],
				totalDays: 1,
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-15"),
			};

			const stats = calculateHeatmapStats(heatmapData);

			expect(stats.activeDays).toBe(0);
			expect(stats.totalCards).toBe(0);
			expect(stats.totalSessions).toBe(0);
			expect(stats.maxCardsInDay).toBe(0);
			expect(stats.averageCardsPerActiveDay).toBe(0);
			expect(stats.studyRate).toBe(0);
		});

		it("calculates stats correctly with study data", () => {
			const heatmapData = {
				weeks: [
					{
						weekIndex: 0,
						days: [
							{
								date: "2024-01-15",
								cardsStudied: 5,
								sessionCount: 1,
								totalDuration: 300000,
								level: 2 as const,
								dayOfWeek: 1,
								weekIndex: 0,
								dayIndex: 1,
							},
							{
								date: "2024-01-16",
								cardsStudied: 10,
								sessionCount: 2,
								totalDuration: 600000,
								level: 2 as const,
								dayOfWeek: 2,
								weekIndex: 0,
								dayIndex: 2,
							},
							{
								date: "2024-01-17",
								cardsStudied: 0,
								sessionCount: 0,
								level: 0 as const,
								dayOfWeek: 3,
								weekIndex: 0,
								dayIndex: 3,
							},
						],
					},
				],
				months: [],
				totalDays: 3,
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-17"),
			};

			const stats = calculateHeatmapStats(heatmapData);

			expect(stats.activeDays).toBe(2);
			expect(stats.totalCards).toBe(15);
			expect(stats.totalSessions).toBe(3);
			expect(stats.totalTime).toBe(900000);
			expect(stats.maxCardsInDay).toBe(10);
			expect(stats.averageCardsPerActiveDay).toBe(8); // Math.round(15/2)
			expect(stats.studyRate).toBe(67); // Math.round((2/3) * 100)
		});

		it("handles undefined totalDuration correctly", () => {
			const heatmapData = {
				weeks: [
					{
						weekIndex: 0,
						days: [
							{
								date: "2024-01-15",
								cardsStudied: 5,
								sessionCount: 1,
								level: 2 as const,
								dayOfWeek: 1,
								weekIndex: 0,
								dayIndex: 1,
							},
						],
					},
				],
				months: [],
				totalDays: 1,
				startDate: new Date("2024-01-15"),
				endDate: new Date("2024-01-15"),
			};

			const stats = calculateHeatmapStats(heatmapData);

			expect(stats.totalTime).toBeUndefined();
		});
	});
});
