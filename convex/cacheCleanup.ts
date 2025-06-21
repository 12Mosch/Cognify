import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { cleanupExpiredCache } from "./utils/cache";

/**
 * Cache cleanup functions for maintaining optimal performance
 * These should be called periodically to remove expired cache entries
 */

/**
 * Clean up expired cache entries
 * This should be called periodically (e.g., via a cron job or scheduled task)
 */
export const cleanupCache = mutation({
  args: {},
  returns: v.object({ deletedCount: v.number() }),
  handler: async (ctx, _args) => {
    const deletedCount = await cleanupExpiredCache(ctx);

    console.log(`Cache cleanup completed: ${deletedCount} expired entries removed`);

    return { deletedCount };
  },
});

/**
 * Force invalidate all cache entries for a specific user
 * Useful for debugging or when data integrity issues are detected
 */
export const invalidateUserCache = mutation({
  args: {
    userId: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    // Get all cache entries for the user
    const userCache = await ctx.db
      .query("statisticsCache")
      .withIndex("by_userId_and_key", (q) => q.eq("userId", args.userId))
      .collect();

    // Delete all entries
    for (const entry of userCache) {
      await ctx.db.delete(entry._id);
    }

    console.log(`Invalidated ${userCache.length} cache entries for user ${args.userId}`);

    return { success: true };
  },
});

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = mutation({
  args: {},
  returns: v.object({
    totalEntries: v.number(),
    expiredEntries: v.number(),
    cacheHitRate: v.number(), // This would need to be tracked separately in a real implementation
  }),
  handler: async (ctx, _args) => {
    const now = Date.now();

    // Get all cache entries
    const allEntries = await ctx.db.query("statisticsCache").collect();
    const totalEntries = allEntries.length;

    // Count expired entries
    const expiredEntries = allEntries.filter(entry => entry.expiresAt <= now).length;

    // In a real implementation, you'd track cache hits/misses to calculate hit rate
    const cacheHitRate = 0.85; // Placeholder value

    return {
      totalEntries,
      expiredEntries,
      cacheHitRate,
    };
  },
});
