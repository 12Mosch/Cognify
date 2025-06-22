import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { calculateCacheHitRate, cleanupExpiredCache } from "./utils/cache";

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
	handler: async (ctx, _args) => {
		const deletedCount = await cleanupExpiredCache(ctx);

		console.log(
			`Cache cleanup completed: ${deletedCount} expired entries removed`,
		);

		return { deletedCount };
	},
	returns: v.object({ deletedCount: v.number() }),
});

/**
 * Force invalidate all cache entries for a specific user
 * Useful for debugging or when data integrity issues are detected
 */
export const invalidateUserCache = mutation({
	args: {
		userId: v.string(),
	},
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

		console.log(
			`Invalidated ${userCache.length} cache entries for user ${args.userId}`,
		);

		return { success: true };
	},
	returns: v.object({ success: v.boolean() }),
});

/**
 * Clean up old cache metrics to prevent unbounded growth
 * Keeps metrics for the last 7 days by default
 */
export const cleanupCacheMetrics = mutation({
	args: {
		retentionDays: v.optional(v.number()), // Number of days to retain metrics (default: 7)
	},
	handler: async (ctx, args) => {
		const retentionDays = args.retentionDays || 7;
		const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

		// Get old metrics in batches to avoid timeout
		const oldMetrics = await ctx.db
			.query("cacheMetrics")
			.withIndex("by_timestamp", (q) => q.lt("timestamp", cutoffTime))
			.take(100); // Limit to avoid timeout

		// Delete old metrics
		for (const metric of oldMetrics) {
			await ctx.db.delete(metric._id);
		}

		console.log(
			`Cache metrics cleanup completed: ${oldMetrics.length} old metrics removed`,
		);

		return { deletedCount: oldMetrics.length };
	},
	returns: v.object({ deletedCount: v.number() }),
});

/**
 * Get detailed cache performance analytics
 */
export const getCacheAnalytics = mutation({
	args: {
		timeWindowHours: v.optional(v.number()), // Time window in hours (default: 24)
	},
	handler: async (ctx, args) => {
		const timeWindowHours = args.timeWindowHours || 24;
		const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
		const now = Date.now();
		const startTime = now - timeWindowMs;

		// Get metrics for the time window
		const metrics = await ctx.db
			.query("cacheMetrics")
			.withIndex("by_timestamp", (q) => q.gte("timestamp", startTime))
			.collect();

		// Calculate overall statistics
		const totalRequests = metrics.length;
		const hits = metrics.filter((m) => m.hitType === "hit").length;
		const misses = metrics.filter((m) => m.hitType === "miss").length;
		const expired = metrics.filter((m) => m.hitType === "expired").length;
		const hitRate = totalRequests > 0 ? hits / totalRequests : 0;

		// Calculate average computation time for misses
		const missesWithTime = metrics.filter(
			(m) => m.hitType === "miss" && m.computationTimeMs,
		);
		const avgComputationTimeMs =
			missesWithTime.length > 0
				? missesWithTime.reduce(
						(sum, m) => sum + (m.computationTimeMs || 0),
						0,
					) / missesWithTime.length
				: undefined;

		// Group by cache key
		const byKeyMap = new Map<
			string,
			{
				hits: number;
				misses: number;
				expired: number;
				computationTimes: number[];
			}
		>();

		for (const metric of metrics) {
			const existing = byKeyMap.get(metric.cacheKey) || {
				computationTimes: [],
				expired: 0,
				hits: 0,
				misses: 0,
			};

			if (metric.hitType === "hit") existing.hits++;
			else if (metric.hitType === "miss") {
				existing.misses++;
				if (metric.computationTimeMs) {
					existing.computationTimes.push(metric.computationTimeMs);
				}
			} else if (metric.hitType === "expired") existing.expired++;

			byKeyMap.set(metric.cacheKey, existing);
		}

		// Convert to array format
		const byKey = Array.from(byKeyMap.entries())
			.map(([cacheKey, stats]) => {
				const requests = stats.hits + stats.misses + stats.expired;
				const keyHitRate = requests > 0 ? stats.hits / requests : 0;
				const avgComputationTimeMs =
					stats.computationTimes.length > 0
						? stats.computationTimes.reduce((sum, time) => sum + time, 0) /
							stats.computationTimes.length
						: undefined;

				return {
					avgComputationTimeMs,
					cacheKey,
					expired: stats.expired,
					hitRate: keyHitRate,
					hits: stats.hits,
					misses: stats.misses,
					requests,
				};
			})
			.sort((a, b) => b.requests - a.requests); // Sort by request count

		// Get cache entry statistics
		const allEntries = await ctx.db.query("statisticsCache").collect();
		const expiredEntries = allEntries.filter(
			(entry) => entry.expiresAt <= now,
		).length;

		return {
			byKey,
			cacheEntries: {
				active: allEntries.length - expiredEntries,
				expired: expiredEntries,
				total: allEntries.length,
			},
			overall: {
				avgComputationTimeMs,
				expired,
				hitRate,
				hits,
				misses,
				totalRequests,
			},
			timeWindowHours,
		};
	},
	returns: v.object({
		byKey: v.array(
			v.object({
				avgComputationTimeMs: v.optional(v.number()),
				cacheKey: v.string(),
				expired: v.number(),
				hitRate: v.number(),
				hits: v.number(),
				misses: v.number(),
				requests: v.number(),
			}),
		),
		cacheEntries: v.object({
			active: v.number(),
			expired: v.number(),
			total: v.number(),
		}),
		overall: v.object({
			avgComputationTimeMs: v.optional(v.number()),
			expired: v.number(),
			hitRate: v.number(),
			hits: v.number(),
			misses: v.number(),
			totalRequests: v.number(),
		}),
		timeWindowHours: v.number(),
	}),
});

/**
 * Get cache statistics for monitoring
 */
export const getCacheStats = mutation({
	args: {
		timeWindowHours: v.optional(v.number()), // Time window in hours for hit rate calculation (default: 24)
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const timeWindowHours = args.timeWindowHours || 24;
		const timeWindowMs = timeWindowHours * 60 * 60 * 1000;

		// Get all cache entries
		const allEntries = await ctx.db.query("statisticsCache").collect();
		const totalEntries = allEntries.length;

		// Count expired entries
		const expiredEntries = allEntries.filter(
			(entry) => entry.expiresAt <= now,
		).length;

		// Calculate actual cache hit rate from metrics
		const cacheHitRate = await calculateCacheHitRate(ctx, timeWindowMs);

		// Get metrics count for the time window
		const startTime = now - timeWindowMs;
		const metrics = await ctx.db
			.query("cacheMetrics")
			.withIndex("by_timestamp", (q) => q.gte("timestamp", startTime))
			.collect();
		const metricsCount = metrics.length;

		return {
			cacheHitRate,
			expiredEntries,
			metricsCount,
			timeWindowHours,
			totalEntries,
		};
	},
	returns: v.object({
		cacheHitRate: v.number(),
		expiredEntries: v.number(),
		metricsCount: v.number(),
		timeWindowHours: v.number(), // Number of cache access metrics in the time window
		totalEntries: v.number(), // Actual time window used
	}),
});
