import { beforeEach, describe, expect, it } from "@jest/globals";
import {
	daysBetween,
	formatNextReviewTime,
	formatSessionDuration,
	getEndOfToday,
	getEndOfTodayLocal,
	getEndOfTodayUTC,
	getLocalDateString,
	getStartOfToday,
	getStartOfTodayLocal,
	getStartOfTodayUTC,
	getUserTimeZone,
	isToday,
	isTomorrow,
} from "../dateUtils";

describe("dateUtils", () => {
	beforeEach(() => {
		// Mock Date.now() to return a consistent timestamp for testing
		// January 15, 2024, 12:00:00 PM UTC
		jest.useFakeTimers({
			// Explicitly request modern timers – protects against config drift
			legacyFakeTimers: false,
			now: new Date("2024-01-15T12:00:00.000Z"),
		});
	});

	afterEach(() => {
		// Restore real timers so other test files are unaffected
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	describe("formatNextReviewTime", () => {
		const baseTime = new Date("2024-01-15T12:00:00.000Z").getTime();

		it('returns "now" for past timestamps', () => {
			const pastTime = baseTime - 1000; // 1 second ago
			expect(formatNextReviewTime(pastTime)).toBe("now");
		});

		it("formats minutes correctly", () => {
			const in30Minutes = baseTime + 30 * 60 * 1000;
			expect(formatNextReviewTime(in30Minutes)).toBe("in 30 minutes");

			const in1Minute = baseTime + 1 * 60 * 1000;
			expect(formatNextReviewTime(in1Minute)).toBe("in 1 minute");
		});

		it("formats hours correctly", () => {
			const in3Hours = baseTime + 3 * 60 * 60 * 1000;
			expect(formatNextReviewTime(in3Hours)).toBe("in 3 hours");

			const in1Hour = baseTime + 1 * 60 * 60 * 1000;
			expect(formatNextReviewTime(in1Hour)).toBe("in 1 hour");
		});

		it('returns "tomorrow" for next day', () => {
			const tomorrow = baseTime + 24 * 60 * 60 * 1000;
			expect(formatNextReviewTime(tomorrow)).toBe("tomorrow");
		});

		it("formats days correctly", () => {
			const in3Days = baseTime + 3 * 24 * 60 * 60 * 1000;
			expect(formatNextReviewTime(in3Days)).toBe("in 3 days");
		});

		it("formats dates within same year", () => {
			const in2Weeks = baseTime + 14 * 24 * 60 * 60 * 1000;
			expect(formatNextReviewTime(in2Weeks)).toBe("on Jan 29");
		});

		it("formats dates in different year", () => {
			const nextYear = new Date("2025-03-15T12:00:00.000Z").getTime();
			expect(formatNextReviewTime(nextYear)).toBe("on Mar 15, 2025");
		});
	});

	describe("isToday", () => {
		it("returns true for timestamps on the same local day", () => {
			// Create a timestamp for the same local date but different time
			const sameDay = new Date(2024, 0, 15, 8, 30, 0).getTime(); // January 15, 2024, 8:30 AM local
			expect(isToday(sameDay)).toBe(true);
		});

		it("returns false for timestamps on different local days", () => {
			// Create timestamps for different local dates
			const yesterday = new Date(2024, 0, 14, 23, 59, 59).getTime(); // January 14, 2024, 11:59 PM local
			const tomorrow = new Date(2024, 0, 16, 0, 0, 0).getTime(); // January 16, 2024, 12:00 AM local
			expect(isToday(yesterday)).toBe(false);
			expect(isToday(tomorrow)).toBe(false);
		});
	});

	describe("isTomorrow", () => {
		it("returns true for timestamps on the next local day", () => {
			// Create a timestamp for tomorrow in local timezone
			const tomorrow = new Date(2024, 0, 16, 8, 30, 0).getTime(); // January 16, 2024, 8:30 AM local
			expect(isTomorrow(tomorrow)).toBe(true);
		});

		it("returns false for timestamps not on the next local day", () => {
			// Create timestamps for today and day after tomorrow in local timezone
			const today = new Date(2024, 0, 15, 12, 0, 0).getTime(); // January 15, 2024, 12:00 PM local
			const dayAfterTomorrow = new Date(2024, 0, 17, 12, 0, 0).getTime(); // January 17, 2024, 12:00 PM local
			expect(isTomorrow(today)).toBe(false);
			expect(isTomorrow(dayAfterTomorrow)).toBe(false);
		});
	});

	describe("getStartOfToday (deprecated)", () => {
		it("returns midnight of current day in UTC", () => {
			const startOfDay = getStartOfToday();
			const expected = new Date("2024-01-15T00:00:00.000Z").getTime();
			expect(startOfDay).toBe(expected);
		});
	});

	describe("getEndOfToday (deprecated)", () => {
		it("returns end of current day in UTC", () => {
			const endOfDay = getEndOfToday();
			const expected = new Date("2024-01-15T23:59:59.999Z").getTime();
			expect(endOfDay).toBe(expected);
		});
	});

	describe("getStartOfTodayUTC", () => {
		it("returns midnight of current day in UTC", () => {
			const startOfDay = getStartOfTodayUTC();
			const expected = new Date("2024-01-15T00:00:00.000Z").getTime();
			expect(startOfDay).toBe(expected);
		});
	});

	describe("getEndOfTodayUTC", () => {
		it("returns end of current day in UTC", () => {
			const endOfDay = getEndOfTodayUTC();
			const expected = new Date("2024-01-15T23:59:59.999Z").getTime();
			expect(endOfDay).toBe(expected);
		});
	});

	describe("getStartOfTodayLocal", () => {
		it("returns midnight of current day in user timezone", () => {
			// Mock getUserTimeZone to return a specific timezone
			const mockGetUserTimeZone = jest.fn().mockReturnValue("America/New_York");
			jest.doMock("../dateUtils", () => ({
				...jest.requireActual("../dateUtils"),
				getUserTimeZone: mockGetUserTimeZone,
			}));

			const startOfDay = getStartOfTodayLocal("America/New_York");

			// For January 15, 2024 in EST (UTC-5), midnight would be 05:00 UTC
			const expected = new Date("2024-01-15T05:00:00.000Z").getTime();
			expect(startOfDay).toBe(expected);
		});

		it("uses user timezone when no timezone provided", () => {
			// This test verifies the function works without throwing
			const startOfDay = getStartOfTodayLocal();
			expect(typeof startOfDay).toBe("number");
			expect(startOfDay).toBeGreaterThan(0);
		});
	});

	describe("getEndOfTodayLocal", () => {
		it("returns end of current day in specified timezone", () => {
			const endOfDay = getEndOfTodayLocal("America/New_York");
			const startOfDay = getStartOfTodayLocal("America/New_York");

			// End of day should be start of day + 24 hours - 1 millisecond
			const expected = startOfDay + 24 * 60 * 60 * 1000 - 1;
			expect(endOfDay).toBe(expected);
		});

		it("uses user timezone when no timezone provided", () => {
			const endOfDay = getEndOfTodayLocal();
			expect(typeof endOfDay).toBe("number");
			expect(endOfDay).toBeGreaterThan(0);
		});
	});

	describe("formatSessionDuration", () => {
		it("formats seconds only", () => {
			expect(formatSessionDuration(45000)).toBe("45s");
			expect(formatSessionDuration(1000)).toBe("1s");
		});

		it("formats minutes and seconds", () => {
			expect(formatSessionDuration(125000)).toBe("2m 5s");
			expect(formatSessionDuration(60000)).toBe("1m 0s");
		});

		it("handles zero duration", () => {
			expect(formatSessionDuration(0)).toBe("0s");
		});
	});

	describe("daysBetween", () => {
		it("calculates positive days difference", () => {
			const day1 = new Date("2024-01-15T12:00:00.000Z").getTime();
			const day2 = new Date("2024-01-18T12:00:00.000Z").getTime();
			expect(daysBetween(day1, day2)).toBe(3);
		});

		it("calculates negative days difference", () => {
			const day1 = new Date("2024-01-18T12:00:00.000Z").getTime();
			const day2 = new Date("2024-01-15T12:00:00.000Z").getTime();
			expect(daysBetween(day1, day2)).toBe(-3);
		});

		it("returns 0 for same day", () => {
			const day1 = new Date("2024-01-15T08:00:00.000Z").getTime();
			const day2 = new Date("2024-01-15T20:00:00.000Z").getTime();
			expect(daysBetween(day1, day2)).toBe(0);
		});
	});

	describe("getUserTimeZone", () => {
		it("returns a valid IANA timezone identifier", () => {
			const timeZone = getUserTimeZone();
			expect(typeof timeZone).toBe("string");
			expect(timeZone.length).toBeGreaterThan(0);
			// Should contain at least one slash for IANA format (e.g., "America/New_York")
			expect(timeZone).toMatch(/\//);
		});
	});

	describe("getLocalDateString", () => {
		it("returns date in YYYY-MM-DD format", () => {
			const dateString = getLocalDateString();
			expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		});

		it("accepts custom timezone parameter", () => {
			const utcDate = getLocalDateString("UTC");
			const nyDate = getLocalDateString("America/New_York");

			expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(nyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			// Dates might be different depending on time of day and timezone offset
		});

		it("handles timezone edge cases", () => {
			// Test with various timezones
			const timezones = [
				"UTC",
				"America/New_York",
				"Europe/London",
				"Asia/Tokyo",
			];

			timezones.forEach((tz) => {
				const dateString = getLocalDateString(tz);
				expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			});
		});
	});
});
