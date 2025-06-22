import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { CacheInvalidation } from "./utils/cache";

/**
 * Study Sessions Tracking for Flashcard App
 *
 * This file provides functionality to track and query study sessions
 * for analytics, statistics, and the study history heatmap visualization.
 */

/**
 * Record a completed study session
 * Uses atomic upsert pattern to prevent duplicate sessions for the same user/date/deck/mode combination
 */
export const recordStudySession = mutation({
	args: {
		cardsStudied: v.number(),
		deckId: v.id("decks"),
		localDate: v.string(),
		sessionDuration: v.optional(v.number()),
		studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition")), // IANA timezone identifier (e.g., "America/New_York")
		// New timezone-aware fields
		userTimeZone: v.string(), // User's local date in YYYY-MM-DD format
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to record study sessions");
		}

		// Store UTC timestamp for canonical reference
		const utcTimestamp = new Date().toISOString();

		// Use the user's local date for grouping (passed from client)
		// This ensures sessions are grouped by the user's calendar day, not server day
		const sessionDate = args.localDate;

		// Use the compound index to efficiently check for existing session
		const existingSession = await ctx.db
			.query("studySessions")
			.withIndex("by_unique_session", (q) =>
				q
					.eq("userId", identity.subject)
					.eq("sessionDate", sessionDate)
					.eq("deckId", args.deckId)
					.eq("studyMode", args.studyMode),
			)
			.first();

		if (existingSession) {
			// Update existing session by aggregating the data
			await ctx.db.patch(existingSession._id, {
				cardsStudied: existingSession.cardsStudied + args.cardsStudied,
				sessionDuration:
					existingSession.sessionDuration && args.sessionDuration
						? existingSession.sessionDuration + args.sessionDuration
						: existingSession.sessionDuration || args.sessionDuration,
				// Update the UTC timestamp to reflect the latest activity
				utcTimestamp,
			});
		} else {
			// Create new session record
			await ctx.db.insert("studySessions", {
				cardsStudied: args.cardsStudied,
				deckId: args.deckId,
				sessionDate,
				sessionDuration: args.sessionDuration,
				studyMode: args.studyMode,
				userId: identity.subject,
				userTimeZone: args.userTimeZone,
				// Store timezone-aware fields for accurate date handling
				utcTimestamp,
			});
		}

		// Invalidate relevant caches after recording study session
		await CacheInvalidation.onStudySessionComplete(ctx, identity.subject);

		return null;
	},
	returns: v.null(),
});

/**
 * Get study activity data for the last 365 days for heatmap visualization
 * Returns daily aggregated data across all decks
 */
export const getStudyActivityHeatmapData = query({
	args: {},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error(
				"User must be authenticated to access study activity data",
			);
		}

		// Calculate date range for last 365 days
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 365);

		const startDateStr = startDate.toISOString().split("T")[0];
		const endDateStr = endDate.toISOString().split("T")[0];

		// Get all study sessions for the user in the date range
		const sessions = await ctx.db
			.query("studySessions")
			.withIndex("by_userId_and_date", (q) =>
				q
					.eq("userId", identity.subject)
					.gte("sessionDate", startDateStr)
					.lte("sessionDate", endDateStr),
			)
			.collect();

		// Aggregate sessions by date
		const dailyActivity = new Map<
			string,
			{
				cardsStudied: number;
				sessionCount: number;
				totalDuration: number;
			}
		>();

		for (const session of sessions) {
			const existing = dailyActivity.get(session.sessionDate) || {
				cardsStudied: 0,
				sessionCount: 0,
				totalDuration: 0,
			};

			dailyActivity.set(session.sessionDate, {
				cardsStudied: existing.cardsStudied + session.cardsStudied,
				sessionCount: existing.sessionCount + 1,
				totalDuration: existing.totalDuration + (session.sessionDuration || 0),
			});
		}

		// Convert to array format
		return Array.from(dailyActivity.entries()).map(([date, data]) => ({
			cardsStudied: data.cardsStudied,
			date,
			sessionCount: data.sessionCount,
			totalDuration: data.totalDuration > 0 ? data.totalDuration : undefined,
		}));
	},
	returns: v.array(
		v.object({
			cardsStudied: v.number(),
			date: v.string(),
			sessionCount: v.number(),
			totalDuration: v.optional(v.number()),
		}),
	),
});

/**
 * Get study statistics for a specific date range
 */
export const getStudyStatistics = query({
	args: {
		endDate: v.string(), // YYYY-MM-DD format
		startDate: v.string(), // YYYY-MM-DD format
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access study statistics");
		}

		// Get all study sessions in the date range
		const sessions = await ctx.db
			.query("studySessions")
			.withIndex("by_userId_and_date", (q) =>
				q
					.eq("userId", identity.subject)
					.gte("sessionDate", args.startDate)
					.lte("sessionDate", args.endDate),
			)
			.collect();

		if (sessions.length === 0) {
			return {
				averageCardsPerSession: 0,
				mostActiveDay: undefined,
				studyDays: 0,
				totalCardsStudied: 0,
				totalSessions: 0,
				totalStudyTime: undefined,
			};
		}

		// Calculate statistics
		const totalCardsStudied = sessions.reduce(
			(sum, s) => sum + s.cardsStudied,
			0,
		);
		const totalSessions = sessions.length;
		const totalStudyTime = sessions.reduce(
			(sum, s) => sum + (s.sessionDuration || 0),
			0,
		);
		const studyDays = new Set(sessions.map((s) => s.sessionDate)).size;

		// Find most active day
		const dailyTotals = new Map<string, number>();
		for (const session of sessions) {
			const current = dailyTotals.get(session.sessionDate) || 0;
			dailyTotals.set(session.sessionDate, current + session.cardsStudied);
		}

		let mostActiveDay: { date: string; cardsStudied: number } | undefined;
		let maxCards = 0;
		for (const [date, cards] of Array.from(dailyTotals.entries())) {
			if (cards > maxCards) {
				maxCards = cards;
				mostActiveDay = { cardsStudied: cards, date };
			}
		}

		return {
			averageCardsPerSession: Math.round(totalCardsStudied / totalSessions),
			mostActiveDay,
			studyDays,
			totalCardsStudied,
			totalSessions,
			totalStudyTime: totalStudyTime > 0 ? totalStudyTime : undefined,
		};
	},
	returns: v.object({
		averageCardsPerSession: v.number(),
		mostActiveDay: v.optional(
			v.object({
				cardsStudied: v.number(),
				date: v.string(),
			}),
		),
		studyDays: v.number(),
		totalCardsStudied: v.number(),
		totalSessions: v.number(),
		totalStudyTime: v.optional(v.number()),
	}),
});

/**
 * Get current study streak (consecutive days with study activity)
 */
export const getCurrentStudyStreak = query({
	args: {},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access study streak data");
		}

		// Get all study sessions ordered by date (most recent first)
		const sessions = await ctx.db
			.query("studySessions")
			.withIndex("by_userId_and_date", (q) => q.eq("userId", identity.subject))
			.collect();

		if (sessions.length === 0) {
			return { currentStreak: 0, longestStreak: 0 };
		}

		// Get unique study dates and sort them
		const studyDates = Array.from(
			new Set(sessions.map((s) => s.sessionDate)),
		).sort((a, b) => b.localeCompare(a)); // Most recent first

		// Calculate current streak
		// Note: This function now works with user's local dates stored in sessionDate
		// Use a more lenient approach to account for timezone differences
		let currentStreak = 0;
		const utcToday = new Date().toISOString().split("T")[0];
		const utcYesterday = new Date();
		utcYesterday.setDate(utcYesterday.getDate() - 1);
		const utcYesterdayStr = utcYesterday.toISOString().split("T")[0];

		// Also check day before yesterday to account for timezone differences
		const utcDayBeforeYesterday = new Date();
		utcDayBeforeYesterday.setDate(utcDayBeforeYesterday.getDate() - 2);
		const utcDayBeforeYesterdayStr = utcDayBeforeYesterday
			.toISOString()
			.split("T")[0];

		// Check if user studied within the last 2 days to start streak calculation
		// This accounts for timezone differences between server and user
		if (
			studyDates[0] === utcToday ||
			studyDates[0] === utcYesterdayStr ||
			studyDates[0] === utcDayBeforeYesterdayStr
		) {
			const checkDate = new Date(studyDates[0]);
			let dateIndex = 0;

			while (dateIndex < studyDates.length) {
				const expectedDate = checkDate.toISOString().split("T")[0];

				if (studyDates[dateIndex] === expectedDate) {
					currentStreak++;
					dateIndex++;
					checkDate.setDate(checkDate.getDate() - 1);
				} else {
					break;
				}
			}
		}

		// Calculate longest streak
		let longestStreak = 0;
		let tempStreak = 1;

		for (let i = 1; i < studyDates.length; i++) {
			const currentDate = new Date(studyDates[i]);
			const previousDate = new Date(studyDates[i - 1]);
			const dayDiff = Math.floor(
				(previousDate.getTime() - currentDate.getTime()) /
					(1000 * 60 * 60 * 24),
			);

			if (dayDiff === 1) {
				tempStreak++;
			} else {
				longestStreak = Math.max(longestStreak, tempStreak);
				tempStreak = 1;
			}
		}
		longestStreak = Math.max(longestStreak, tempStreak);

		return {
			currentStreak,
			longestStreak,
		};
	},
	returns: v.object({
		currentStreak: v.number(),
		longestStreak: v.number(),
	}),
});
