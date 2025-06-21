import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Cache utility for storing and retrieving frequently accessed statistics
 * Provides TTL-based caching with automatic invalidation
 */

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  USER_STATS: 5 * 60 * 1000,        // 5 minutes - user statistics
  RETENTION_RATE: 15 * 60 * 1000,   // 15 minutes - retention rate calculations
  DECK_PERFORMANCE: 10 * 60 * 1000, // 10 minutes - deck performance data
  CARD_DISTRIBUTION: 5 * 60 * 1000, // 5 minutes - card distribution data
  SPACED_REP_INSIGHTS: 10 * 60 * 1000, // 10 minutes - spaced repetition insights
} as const;

// Cache version for invalidation
const CACHE_VERSION = 1;

/**
 * Get cached data if available and not expired
 * Note: Expired cache cleanup is handled separately to avoid mixing read/write operations
 */
export async function getCachedData<T>(
  ctx: QueryCtx,
  userId: string,
  cacheKey: string
): Promise<T | null> {
  const now = Date.now();

  const cached = await ctx.db
    .query("statisticsCache")
    .withIndex("by_userId_and_key", (q) =>
      q.eq("userId", userId).eq("cacheKey", cacheKey)
    )
    .first();

  if (!cached) {
    return null;
  }

  // Check if cache is expired or version mismatch
  if (cached.expiresAt <= now || cached.version !== CACHE_VERSION) {
    // Return null for expired cache - cleanup will be handled by periodic cleanup
    return null;
  }

  return cached.data as T;
}

/**
 * Store data in cache with TTL
 */
export async function setCachedData<T>(
  ctx: MutationCtx,
  userId: string,
  cacheKey: string,
  data: T,
  ttlMs: number
): Promise<void> {
  const now = Date.now();
  const expiresAt = now + ttlMs;

  // Check if cache entry already exists
  const existing = await ctx.db
    .query("statisticsCache")
    .withIndex("by_userId_and_key", (q) => 
      q.eq("userId", userId).eq("cacheKey", cacheKey)
    )
    .first();

  if (existing) {
    // Update existing cache entry
    await ctx.db.patch(existing._id, {
      data,
      computedAt: now,
      expiresAt,
      version: CACHE_VERSION,
    });
  } else {
    // Create new cache entry
    await ctx.db.insert("statisticsCache", {
      userId,
      cacheKey,
      data,
      computedAt: now,
      expiresAt,
      version: CACHE_VERSION,
    });
  }
}

/**
 * Invalidate cache for a specific user and key
 */
export async function invalidateCache(
  ctx: MutationCtx,
  userId: string,
  cacheKey?: string
): Promise<void> {
  if (cacheKey) {
    // Invalidate specific cache entry
    const cached = await ctx.db
      .query("statisticsCache")
      .withIndex("by_userId_and_key", (q) => 
        q.eq("userId", userId).eq("cacheKey", cacheKey)
      )
      .first();
    
    if (cached) {
      await ctx.db.delete(cached._id);
    }
  } else {
    // Invalidate all cache entries for user
    const userCache = await ctx.db
      .query("statisticsCache")
      .withIndex("by_userId_and_key", (q) => q.eq("userId", userId))
      .collect();
    
    for (const entry of userCache) {
      await ctx.db.delete(entry._id);
    }
  }
}

/**
 * Clean up expired cache entries (should be called periodically)
 */
export async function cleanupExpiredCache(ctx: MutationCtx): Promise<number> {
  const now = Date.now();
  
  const expiredEntries = await ctx.db
    .query("statisticsCache")
    .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
    .take(100); // Limit to avoid timeout

  for (const entry of expiredEntries) {
    await ctx.db.delete(entry._id);
  }

  return expiredEntries.length;
}

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  userStats: (userId: string) => `user_stats_${userId}`,
  retentionRate: (userId: string, days: number) => `retention_rate_${userId}_${days}d`,
  deckPerformance: (userId: string) => `deck_performance_${userId}`,
  cardDistribution: (userId: string) => `card_distribution_${userId}`,
  spacedRepInsights: (userId: string) => `spaced_rep_insights_${userId}`,
  dashboardData: (userId: string) => `dashboard_data_${userId}`,
} as const;

/**
 * Cache invalidation triggers - call these when data changes
 */
export const CacheInvalidation = {
  // Invalidate when user completes a study session
  onStudySessionComplete: async (ctx: MutationCtx, userId: string) => {
    await Promise.all([
      invalidateCache(ctx, userId, CacheKeys.userStats(userId)),
      invalidateCache(ctx, userId, CacheKeys.cardDistribution(userId)),
      invalidateCache(ctx, userId, CacheKeys.spacedRepInsights(userId)),
      invalidateCache(ctx, userId, CacheKeys.dashboardData(userId)),
    ]);
  },

  // Invalidate when user reviews a card
  onCardReview: async (ctx: MutationCtx, userId: string) => {
    await Promise.all([
      invalidateCache(ctx, userId, CacheKeys.retentionRate(userId, 30)),
      invalidateCache(ctx, userId, CacheKeys.retentionRate(userId, 7)),
      invalidateCache(ctx, userId, CacheKeys.deckPerformance(userId)),
      invalidateCache(ctx, userId, CacheKeys.cardDistribution(userId)),
      invalidateCache(ctx, userId, CacheKeys.spacedRepInsights(userId)),
      invalidateCache(ctx, userId, CacheKeys.dashboardData(userId)),
    ]);
  },

  // Invalidate when user creates/deletes a deck
  onDeckChange: async (ctx: MutationCtx, userId: string) => {
    await Promise.all([
      invalidateCache(ctx, userId, CacheKeys.userStats(userId)),
      invalidateCache(ctx, userId, CacheKeys.deckPerformance(userId)),
      invalidateCache(ctx, userId, CacheKeys.dashboardData(userId)),
    ]);
  },

  // Invalidate when user creates/deletes cards
  onCardChange: async (ctx: MutationCtx, userId: string) => {
    await Promise.all([
      invalidateCache(ctx, userId, CacheKeys.userStats(userId)),
      invalidateCache(ctx, userId, CacheKeys.cardDistribution(userId)),
      invalidateCache(ctx, userId, CacheKeys.spacedRepInsights(userId)),
      invalidateCache(ctx, userId, CacheKeys.dashboardData(userId)),
    ]);
  },
} as const;
