import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get current study streak for the authenticated user
 */
export const getCurrentStreak = query({
  args: {},
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastStudyDate: v.optional(v.string()),
    streakStartDate: v.optional(v.string()),
    totalStudyDays: v.number(),
    milestonesReached: v.array(v.number()),
    lastMilestone: v.optional(v.number()),
  }),
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
        longestStreak: 0,
        totalStudyDays: 0,
        milestonesReached: [],
        lastMilestone: undefined,
        lastStudyDate: undefined,
        streakStartDate: undefined,
      };
    }

    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastStudyDate: streak.lastStudyDate,
      streakStartDate: streak.streakStartDate,
      totalStudyDays: streak.totalStudyDays,
      milestonesReached: streak.milestonesReached || [],
      lastMilestone: streak.lastMilestone,
    };
  },
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
    studyDate: v.string(),    // YYYY-MM-DD format (user's local date)
    timezone: v.string(),     // IANA timezone identifier (for metadata/storage)
  },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    isNewMilestone: v.boolean(),
    milestone: v.optional(v.number()),
    streakEvent: v.union(v.literal("started"), v.literal("continued"), v.literal("broken")),
  }),
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
        userId: identity.subject,
        currentStreak: 1,
        longestStreak: 1,
        lastStudyDate: today,
        streakStartDate: today,
        timezone: args.timezone,
        milestonesReached: [],
        lastMilestone: undefined,
        lastUpdated: new Date().toISOString(),
        totalStudyDays: 1,
      };

      await ctx.db.insert("studyStreaks", newStreak);

      return {
        currentStreak: 1,
        longestStreak: 1,
        isNewMilestone: false,
        streakEvent: "started" as const,
      };
    }

    // Check if user already studied today
    if (existingStreak.lastStudyDate === today) {
      return {
        currentStreak: existingStreak.currentStreak,
        longestStreak: existingStreak.longestStreak,
        isNewMilestone: false,
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
      newLongestStreak = Math.max(existingStreak.longestStreak, newCurrentStreak);
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
      longestStreak: newLongestStreak,
      lastStudyDate: today,
      streakStartDate: newStreakStartDate,
      timezone: args.timezone,
      milestonesReached: newMilestones,
      lastMilestone: milestone || existingStreak.lastMilestone,
      lastUpdated: new Date().toISOString(),
      totalStudyDays: existingStreak.totalStudyDays + 1,
    });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewMilestone,
      milestone,
      streakEvent,
    };
  },
});

/**
 * Get streak leaderboard (top streaks)
 */
export const getStreakLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    type: v.union(v.literal("current"), v.literal("longest")),
  },
  returns: v.array(v.object({
    userId: v.string(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    totalStudyDays: v.number(),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    const indexName = args.type === "current" ? "by_currentStreak" : "by_longestStreak";
    
    const streaks = await ctx.db
      .query("studyStreaks")
      .withIndex(indexName)
      .order("desc")
      .take(limit);

    return streaks.map(streak => ({
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      totalStudyDays: streak.totalStudyDays,
    }));
  },
});

/**
 * Helper function to get yesterday's date in YYYY-MM-DD format
 * Timezone-safe implementation that avoids UTC conversion issues
 */
function getYesterday(dateStr: string): string {
  // Parse YYYY-MM-DD directly without timezone assumptions
  const [year, month, day] = dateStr.split('-').map(Number);

  // Create date object in local timezone, then subtract one day
  const date = new Date(year, month - 1, day); // month is 0-indexed
  date.setDate(date.getDate() - 1);

  // Format back to YYYY-MM-DD without UTC conversion
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-indexed
  const dd = String(date.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get streak statistics for analytics
 */
export const getStreakStats = query({
  args: {},
  returns: v.object({
    totalActiveStreaks: v.number(),
    averageStreakLength: v.number(),
    longestActiveStreak: v.number(),
    totalMilestonesReached: v.number(),
  }),
  handler: async (ctx, _args) => {
    const allStreaks = await ctx.db.query("studyStreaks").collect();
    
    if (allStreaks.length === 0) {
      return {
        totalActiveStreaks: 0,
        averageStreakLength: 0,
        longestActiveStreak: 0,
        totalMilestonesReached: 0,
      };
    }

    const activeStreaks = allStreaks.filter(s => s.currentStreak > 0);
    const totalCurrentStreak = activeStreaks.reduce((sum, s) => sum + s.currentStreak, 0);
    const longestActiveStreak = Math.max(...activeStreaks.map(s => s.currentStreak), 0);
    const totalMilestonesReached = allStreaks.reduce((sum, s) => sum + (s.milestonesReached || []).length, 0);

    return {
      totalActiveStreaks: activeStreaks.length,
      averageStreakLength: activeStreaks.length > 0 ? Math.round(totalCurrentStreak / activeStreaks.length) : 0,
      longestActiveStreak,
      totalMilestonesReached,
    };
  },
});
