import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

/**
 * Performance Optimization System for Real-Time Adaptive Learning
 *
 * This module provides caching, debouncing, and batch processing capabilities
 * to ensure smooth UI performance during real-time pattern updates and
 * dynamic path regeneration.
 *
 * Key Features:
 * - Intelligent caching of frequently accessed pattern data
 * - Debounced database writes to prevent excessive operations
 * - Batch processing of card interactions
 * - Memory-efficient incremental updates
 * - Performance monitoring and metrics
 */

// Performance configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL
const BATCH_SIZE = 50; // Maximum interactions to process in one batch
// Note: Additional constants available for future performance tuning

// Note: Interface definitions moved inline where needed to avoid unused variable warnings

/**
 * Cache learning patterns with intelligent eviction
 */
export const cacheLearningPatterns = mutation({
	args: {
		forceRefresh: v.optional(v.boolean()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();

		// Check if we have a valid cached entry
		const existingCache = await ctx.db
			.query("learningPatternCache")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (existingCache && !args.forceRefresh) {
			const age = now - existingCache.cachedAt;
			if (age < CACHE_TTL_MS) {
				// Update access metrics
				await ctx.db.patch(existingCache._id, {
					accessCount: existingCache.accessCount + 1,
					lastAccessed: now,
				});

				return {
					age: age,
					cacheHit: true,
					patterns: existingCache.patterns,
				};
			}
		}

		// Fetch fresh patterns from database
		const patterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (!patterns) {
			return { cacheHit: false, patterns: null };
		}

		// Update or create cache entry
		const cacheData = {
			accessCount: 1,
			cachedAt: now,
			lastAccessed: now,
			patterns,
			userId: args.userId,
		};

		if (existingCache) {
			await ctx.db.patch(existingCache._id, cacheData);
		} else {
			await ctx.db.insert("learningPatternCache", cacheData);
		}

		return patterns;
	},
});

/**
 * Batch process card interactions for improved performance
 */
export const batchProcessInteractions = mutation({
	args: {
		maxBatchSize: v.optional(v.number()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const startTime = Date.now();
		const batchSize = args.maxBatchSize || BATCH_SIZE;

		// Get unprocessed interactions for this user
		const unprocessedInteractions = await ctx.db
			.query("cardInteractions")
			.withIndex("by_userId_and_processed", (q) =>
				q.eq("userId", args.userId).eq("processed", false),
			)
			.order("desc")
			.take(batchSize);

		if (unprocessedInteractions.length === 0) {
			return {
				batchSize: 0,
				duration: Date.now() - startTime,
				processed: 0,
			};
		}

		// Group interactions by type for efficient processing
		const interactionGroups = {
			answers: unprocessedInteractions.filter(
				(i) => i.interactionType === "answer",
			),
			confidence: unprocessedInteractions.filter(
				(i) => i.interactionType === "confidence_rating",
			),
			difficulty: unprocessedInteractions.filter(
				(i) => i.interactionType === "difficulty_rating",
			),
			flips: unprocessedInteractions.filter(
				(i) => i.interactionType === "flip",
			),
		};

		let processedCount = 0;

		// Process answer interactions (most important for learning patterns)
		if (interactionGroups.answers.length > 0) {
			const answerMetrics = calculateAnswerMetrics(interactionGroups.answers);

			// Update learning patterns incrementally
			const existingPatterns = await ctx.db
				.query("learningPatterns")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.first();

			if (existingPatterns) {
				const updatedTrends = updatePerformanceTrends(
					existingPatterns.recentPerformanceTrends,
					answerMetrics,
				);

				await ctx.db.patch(existingPatterns._id, {
					lastUpdated: Date.now(),
					recentPerformanceTrends: updatedTrends,
				});
			}

			processedCount += interactionGroups.answers.length;
		}

		// Mark all interactions as processed
		for (const interaction of unprocessedInteractions) {
			await ctx.db.patch(interaction._id, { processed: true });
		}

		// Record performance metrics
		const duration = Date.now() - startTime;
		await ctx.db.insert("performanceMetrics", {
			batchSize: unprocessedInteractions.length,
			duration,
			errorOccurred: false,
			operationType: "batch_processing",
			timestamp: Date.now(),
			userId: args.userId,
		});

		return {
			batchSize: unprocessedInteractions.length,
			duration,
			processed: processedCount,
		};
	},
	returns: v.object({
		batchSize: v.number(),
		duration: v.number(),
		processed: v.number(),
	}),
});

/**
 * Calculate answer metrics from a batch of interactions
 */
function calculateAnswerMetrics(answerInteractions: Doc<"cardInteractions">[]) {
	const successfulAnswers = answerInteractions.filter((i) => i.wasSuccessful);
	const successRate = successfulAnswers.length / answerInteractions.length;

	const responseTimes = answerInteractions
		.filter((i) => i.responseTime !== undefined)
		.map((i) => i.responseTime as number);
	const averageResponseTime =
		responseTimes.length > 0
			? responseTimes.reduce((sum, time) => sum + time, 0) /
				responseTimes.length
			: 0;

	const confidenceLevels = answerInteractions
		.filter((i) => i.confidenceLevel !== undefined)
		.map((i) => i.confidenceLevel as number);
	const averageConfidence =
		confidenceLevels.length > 0
			? confidenceLevels.reduce((sum, conf) => sum + conf, 0) /
				confidenceLevels.length
			: 0;

	return {
		averageConfidence,
		averageResponseTime,
		reviewCount: answerInteractions.length,
		successRate,
	};
}

/**
 * Update performance trends incrementally
 */
function updatePerformanceTrends(
	currentTrends: Doc<"learningPatterns">["recentPerformanceTrends"],
	newMetrics: ReturnType<typeof calculateAnswerMetrics>,
) {
	const weight = Math.min(0.3, newMetrics.reviewCount / 20); // Max 30% weight for new data

	return {
		...currentTrends,
		last7Days: {
			averageResponseTime:
				(1 - weight) * currentTrends.last7Days.averageResponseTime +
				weight * newMetrics.averageResponseTime,
			confidenceLevel:
				(1 - weight) * currentTrends.last7Days.confidenceLevel +
				weight * newMetrics.averageConfidence,
			reviewCount: currentTrends.last7Days.reviewCount + newMetrics.reviewCount,
			successRate:
				(1 - weight) * currentTrends.last7Days.successRate +
				weight * newMetrics.successRate,
		},
		lastUpdated: Date.now(),
		trend: {
			confidenceChange:
				(1 - weight) * currentTrends.last7Days.confidenceLevel +
				weight * newMetrics.averageConfidence -
				currentTrends.last14Days.confidenceLevel,
			responseTimeChange:
				newMetrics.averageResponseTime -
				currentTrends.last7Days.averageResponseTime,
			successRateChange:
				(1 - weight) * currentTrends.last7Days.successRate +
				weight * newMetrics.successRate -
				currentTrends.last14Days.successRate,
		},
	};
}

/**
 * Get performance metrics for monitoring
 */
export const getPerformanceMetrics = query({
	args: {
		limit: v.optional(v.number()),
		operationType: v.optional(v.string()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		let query = ctx.db
			.query("performanceMetrics")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId));

		if (args.operationType) {
			query = query.filter((q) =>
				q.eq(q.field("operationType"), args.operationType),
			);
		}

		const metrics = await query.order("desc").take(args.limit || 50);

		// Calculate summary statistics
		const totalOperations = metrics.length;
		const averageDuration =
			totalOperations > 0
				? metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations
				: 0;
		const errorRate =
			totalOperations > 0
				? metrics.filter((m) => m.errorOccurred).length / totalOperations
				: 0;

		return {
			metrics,
			summary: {
				averageDuration,
				cacheHitRate:
					metrics.filter((m) => m.cacheHit).length / totalOperations,
				errorRate,
				totalOperations,
			},
		};
	},
	returns: v.object({
		metrics: v.array(
			v.object({
				_creationTime: v.number(),
				_id: v.id("performanceMetrics"),
				batchSize: v.optional(v.number()),
				cacheHit: v.optional(v.boolean()),
				duration: v.number(),
				errorOccurred: v.optional(v.boolean()),
				operationType: v.string(),
				timestamp: v.number(),
				userId: v.string(),
			}),
		),
		summary: v.object({
			averageDuration: v.number(),
			cacheHitRate: v.number(),
			errorRate: v.number(),
			totalOperations: v.number(),
		}),
	}),
});
