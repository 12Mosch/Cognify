import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get current study streak for the authenticated user
 * Automatically resets streak to 0 if user missed yesterday's study session
 */
export const getCurrentStreak = query({
	args: {},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access streak data");
		}

		const streak = await ctx.db
			.query("studyStreaks")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!streak) {
			return {
				currentStreak: 0,
				lastMilestone: undefined,
				lastStudyDate: undefined,
				longestStreak: 0,
				milestonesReached: [],
				streakStartDate: undefined,
				totalStudyDays: 0,
			};
		}

		// Check if streak should be reset due to missing yesterday's study session
		const currentStreak = calculateCurrentStreak(
			streak.lastStudyDate,
			streak.currentStreak,
		);

		return {
			currentStreak,
			lastMilestone: streak.lastMilestone,
			lastStudyDate: streak.lastStudyDate,
			longestStreak: streak.longestStreak,
			milestonesReached: streak.milestonesReached || [],
			streakStartDate: streak.streakStartDate,
			totalStudyDays: streak.totalStudyDays,
		};
	},
	returns: v.object({
		currentStreak: v.number(),
		lastMilestone: v.optional(v.number()),
		lastStudyDate: v.optional(v.string()),
		longestStreak: v.number(),
		milestonesReached: v.array(v.number()),
		streakStartDate: v.optional(v.string()),
		totalStudyDays: v.number(),
	}),
});

/**
 * Update study streak when user completes a study session
 *
 * Note: Streak continuity is calculated using local dates (studyDate parameter).
 * The timezone parameter is stored for metadata purposes but does not affect
 * the actual streak calculation logic, which works purely with YYYY-MM-DD dates.
 */
export const updateStreak = mutation({
	args: {
		studyDate: v.string(), // YYYY-MM-DD format (user's local date)
		timezone: v.string(), // IANA timezone identifier (for metadata/storage)
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to update streak");
		}

		const existingStreak = await ctx.db
			.query("studyStreaks")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		const today = args.studyDate;
		const yesterday = getYesterday(today);

		if (!existingStreak) {
			// First time user - create new streak
			const newStreak = {
				currentStreak: 1,
				lastMilestone: undefined,
				lastStudyDate: today,
				lastUpdated: new Date().toISOString(),
				longestStreak: 1,
				milestonesReached: [],
				streakStartDate: today,
				timezone: args.timezone,
				totalStudyDays: 1,
				userId: identity.subject,
			};

			await ctx.db.insert("studyStreaks", newStreak);

			return {
				currentStreak: 1,
				isNewMilestone: false,
				longestStreak: 1,
				streakEvent: "started" as const,
			};
		}

		// Check if user already studied today
		if (existingStreak.lastStudyDate === today) {
			return {
				currentStreak: existingStreak.currentStreak,
				isNewMilestone: false,
				longestStreak: existingStreak.longestStreak,
				streakEvent: "continued" as const,
			};
		}

		let newCurrentStreak: number;
		let newLongestStreak: number;
		let newStreakStartDate: string;
		let streakEvent: "started" | "continued" | "broken";

		if (existingStreak.lastStudyDate === yesterday) {
			// Continuing streak
			newCurrentStreak = existingStreak.currentStreak + 1;
			newLongestStreak = Math.max(
				existingStreak.longestStreak,
				newCurrentStreak,
			);
			newStreakStartDate = existingStreak.streakStartDate || today; // Fallback to today if undefined
			streakEvent = "continued";
		} else {
			// Streak broken, starting new one
			newCurrentStreak = 1;
			newLongestStreak = existingStreak.longestStreak;
			newStreakStartDate = today;
			streakEvent = "broken";
		}

		// Check for new milestones
		const milestones = [7, 30, 50, 100, 200, 365];
		const newMilestones = [...(existingStreak.milestonesReached || [])];
		let isNewMilestone = false;
		let milestone: number | undefined;

		for (const m of milestones) {
			if (newCurrentStreak >= m && !newMilestones.includes(m)) {
				newMilestones.push(m);
				isNewMilestone = true;
				milestone = m;
			}
		}

		// Update streak record
		await ctx.db.patch(existingStreak._id, {
			currentStreak: newCurrentStreak,
			lastMilestone: milestone || existingStreak.lastMilestone,
			lastStudyDate: today,
			lastUpdated: new Date().toISOString(),
			longestStreak: newLongestStreak,
			milestonesReached: newMilestones,
			streakStartDate: newStreakStartDate,
			timezone: args.timezone,
			totalStudyDays: existingStreak.totalStudyDays + 1,
		});

		return {
			currentStreak: newCurrentStreak,
			isNewMilestone,
			longestStreak: newLongestStreak,
			milestone,
			streakEvent,
		};
	},
	returns: v.object({
		currentStreak: v.number(),
		isNewMilestone: v.boolean(),
		longestStreak: v.number(),
		milestone: v.optional(v.number()),
		streakEvent: v.union(
			v.literal("started"),
			v.literal("continued"),
			v.literal("broken"),
		),
	}),
});

/**
 * Get streak leaderboard (top streaks)
 */
export const getStreakLeaderboard = query({
	args: {
		limit: v.optional(v.number()),
		type: v.union(v.literal("current"), v.literal("longest")),
	},
	handler: async (ctx, args) => {
		const limit = args.limit || 10;
		const indexName =
			args.type === "current" ? "by_currentStreak" : "by_longestStreak";

		const streaks = await ctx.db
			.query("studyStreaks")
			.withIndex(indexName)
			.order("desc")
			.take(limit);

		return streaks.map((streak) => ({
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			totalStudyDays: streak.totalStudyDays,
			userId: streak.userId,
		}));
	},
	returns: v.array(
		v.object({
			currentStreak: v.number(),
			longestStreak: v.number(),
			totalStudyDays: v.number(),
			userId: v.string(),
		}),
	),
});

/**
 * Helper function to calculate current streak based on last study date
 * Returns 0 if the user missed yesterday's study session (streak broken)
 *
 * Note: This function now works with user's local dates consistently.
 * Since we can't determine the user's timezone in this context, we use a more
 * lenient approach that considers a streak valid if the last study date is
 * within the last 2 days, accounting for potential timezone differences.
 */
function calculateCurrentStreak(
	lastStudyDate: string | undefined,
	storedStreak: number,
): number {
	if (!lastStudyDate || storedStreak === 0) {
		return 0;
	}

	// Get current UTC date for server-side comparison
	const today = new Date();
	const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD in UTC

	// Calculate yesterday in UTC
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = yesterday.toISOString().split("T")[0];

	// Calculate day before yesterday to account for timezone differences
	const dayBeforeYesterday = new Date(today);
	dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
	const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split("T")[0];

	// Streak is valid if user studied within the last 2 days (accounting for timezone differences)
	// This is more lenient but prevents false streak breaks due to timezone inconsistencies
	if (
		lastStudyDate === todayStr ||
		lastStudyDate === yesterdayStr ||
		lastStudyDate === dayBeforeYesterdayStr
	) {
		return storedStreak;
	}

	// Streak is broken if last study date is more than 2 days ago
	return 0;
}

/**
 * Helper function to get yesterday's date in YYYY-MM-DD format
 * Works with local date strings to maintain timezone consistency
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Yesterday's date in YYYY-MM-DD format
 */
function getYesterday(dateStr: string): string {
	// Parse YYYY-MM-DD directly without timezone assumptions
	const [year, month, day] = dateStr.split("-").map(Number);

	// Create date object representing the given date at midnight local time
	const date = new Date(year, month - 1, day); // month is 0-indexed

	// Subtract one day
	date.setDate(date.getDate() - 1);

	// Format back to YYYY-MM-DD using local date components
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0"); // month is 0-indexed
	const dd = String(date.getDate()).padStart(2, "0");

	return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get streak statistics for analytics
 */
export const getStreakStats = query({
	args: {},
	handler: async (ctx, _args) => {
		const allStreaks = await ctx.db.query("studyStreaks").collect();

		if (allStreaks.length === 0) {
			return {
				averageStreakLength: 0,
				longestActiveStreak: 0,
				totalActiveStreaks: 0,
				totalMilestonesReached: 0,
			};
		}

		const activeStreaks = allStreaks.filter((s) => s.currentStreak > 0);
		const totalCurrentStreak = activeStreaks.reduce(
			(sum, s) => sum + s.currentStreak,
			0,
		);
		const longestActiveStreak = Math.max(
			...activeStreaks.map((s) => s.currentStreak),
			0,
		);
		const totalMilestonesReached = allStreaks.reduce(
			(sum, s) => sum + (s.milestonesReached || []).length,
			0,
		);

		return {
			averageStreakLength:
				activeStreaks.length > 0
					? Math.round(totalCurrentStreak / activeStreaks.length)
					: 0,
			longestActiveStreak,
			totalActiveStreaks: activeStreaks.length,
			totalMilestonesReached,
		};
	},
	returns: v.object({
		averageStreakLength: v.number(),
		longestActiveStreak: v.number(),
		totalActiveStreaks: v.number(),
		totalMilestonesReached: v.number(),
	}),
});
