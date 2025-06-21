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
    // Record cache miss - but only in mutation context to avoid read/write mixing
    // This will be handled by the calling function that has mutation context
    return null;
  }

  // Check if cache is expired or version mismatch
  if (cached.expiresAt <= now || cached.version !== CACHE_VERSION) {
    // Record expired cache access - but only in mutation context
    // This will be handled by the calling function that has mutation context
    return null;
  }

  // Record cache hit - but only in mutation context
  // This will be handled by the calling function that has mutation context
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
  ttlMs: number,
  computationTimeMs?: number
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

  // Record cache miss metric (since we're storing new/updated data)
  await recordCacheMetric(ctx, cacheKey, userId, "miss", computationTimeMs, ttlMs);
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

/**
 * Record cache access metrics for performance monitoring
 */
export async function recordCacheMetric(
  ctx: MutationCtx,
  cacheKey: string,
  userId: string | undefined,
  hitType: "hit" | "miss" | "expired",
  computationTimeMs?: number,
  ttlMs?: number
): Promise<void> {
  await ctx.db.insert("cacheMetrics", {
    timestamp: Date.now(),
    cacheKey,
    userId,
    hitType,
    computationTimeMs,
    ttlMs,
  });
}

/**
 * Enhanced cache data retrieval with metrics tracking
 * Use this in mutation contexts where you can record metrics
 */
export async function getCachedDataWithMetrics<T>(
  ctx: MutationCtx,
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
    // Don't record miss here - it will be recorded when setCachedData is called
    return null;
  }

  // Check if cache is expired or version mismatch
  if (cached.expiresAt <= now || cached.version !== CACHE_VERSION) {
    // Record expired cache access
    await recordCacheMetric(ctx, cacheKey, userId, "expired");
    return null;
  }

  // Record cache hit
  await recordCacheMetric(ctx, cacheKey, userId, "hit");
  return cached.data as T;
}

/**
 * Calculate cache hit rate for a specific time period
 */
export async function calculateCacheHitRate(
  ctx: QueryCtx | MutationCtx,
  timeWindowMs: number = 24 * 60 * 60 * 1000, // Default: 24 hours
  cacheKey?: string,
  userId?: string
): Promise<number> {
  const now = Date.now();
  const startTime = now - timeWindowMs;

  const query = ctx.db
    .query("cacheMetrics")
    .withIndex("by_timestamp", (q) => q.gte("timestamp", startTime));

  // Apply filters if provided
  if (cacheKey) {
    const metrics = await query.collect();
    const filteredMetrics = metrics.filter(m => m.cacheKey === cacheKey);
    return calculateHitRateFromMetrics(filteredMetrics);
  }

  if (userId) {
    const metrics = await query.collect();
    const filteredMetrics = metrics.filter(m => m.userId === userId);
    return calculateHitRateFromMetrics(filteredMetrics);
  }

  const metrics = await query.collect();
  return calculateHitRateFromMetrics(metrics);
}

/**
 * Helper function to calculate hit rate from metrics array
 */
function calculateHitRateFromMetrics(metrics: Array<{ hitType: "hit" | "miss" | "expired" }>): number {
  if (metrics.length === 0) return 0;

  const hits = metrics.filter(m => m.hitType === "hit").length;
  const total = metrics.length;

  return hits / total;
}

/**
 * Wrapper function for cache-aware data computation
 * Handles cache lookup, computation, and storage with metrics tracking
 */
export async function withCache<T>(
  ctx: MutationCtx,
  userId: string,
  cacheKey: string,
  ttlMs: number,
  computeFn: () => Promise<T>
): Promise<T> {
  // Try to get cached data with metrics
  const cached = await getCachedDataWithMetrics<T>(ctx, userId, cacheKey);

  if (cached !== null) {
    return cached;
  }

  // Compute data and track time
  const startTime = Date.now();
  const data = await computeFn();
  const computationTimeMs = Date.now() - startTime;

  // Store in cache with metrics
  await setCachedData(ctx, userId, cacheKey, data, ttlMs, computationTimeMs);

  return data;
}
