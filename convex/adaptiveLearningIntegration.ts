import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { normalizeLanguage, t } from "./utils/translations";

/**
 * Adaptive Learning Integration System
 *
 * This module serves as the central integration point for all adaptive learning
 * components, connecting real-time pattern updates, granular mastery tracking,
 * dynamic path regeneration, and performance optimization with existing systems.
 *
 * Key Integration Points:
 * - SM-2 spaced repetition algorithm enhancement
 * - TF-IDF content analysis integration
 * - Personalized learning path generation
 * - Study session completion tracking
 * - Real-time UI updates and feedback
 */

/**
 * Enhanced card review with full adaptive learning integration
 */
export const reviewCardWithAdaptiveLearning = mutation({
	args: {
		cardId: v.id("cards"),
		confidenceLevel: v.optional(v.number()),
		language: v.optional(v.string()),
		quality: v.number(),
		responseTime: v.optional(v.number()),
		sessionId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const startTime = Date.now();

		// Get card and verify ownership
		const card = await ctx.db.get(args.cardId);
		if (!card) {
			const language = normalizeLanguage(args.language);
			throw new Error(t("adaptiveLearning.errors.cardNotFound", language));
		}

		// deepcode ignore Sqli: <please specify a reason of ignoring this>
		const deck = await ctx.db.get(card.deckId);
		if (!deck || deck.userId !== identity.subject) {
			const language = normalizeLanguage(args.language);
			throw new Error(t("adaptiveLearning.errors.onlyOwnCards", language));
		}

		// 1. Record card interaction for real-time adaptive learning
		await ctx.scheduler.runAfter(
			0,
			api.realTimeAdaptiveLearning.recordCardInteraction,
			{
				cardId: args.cardId,
				confidenceLevel: args.confidenceLevel,
				interactionType: "answer",
				quality: args.quality,
				responseTime: args.responseTime,
				sessionContext: args.sessionId
					? {
							cardIndex: 0, // Will be updated by the calling component
							sessionId: args.sessionId,
							studyMode: "adaptive-spaced-repetition",
							totalCards: 0, // Will be updated by the calling component
						}
					: undefined,
			},
		);

		// 2. Perform traditional SM-2 review with adaptive enhancements
		const reviewResult: {
			confidence: number;
			nextReviewDate: number;
			personalizedMessage: string;
			success: boolean;
		} = await ctx.runMutation(api.adaptiveLearning.reviewCardAdaptive, {
			cardId: args.cardId,
			confidenceRating: args.confidenceLevel,
			quality: args.quality,
			responseTime: args.responseTime,
		});

		// 3. Update concept mastery tracking
		await ctx.scheduler.runAfter(
			1000,
			api.masteryTracking.calculateConceptMastery,
			{
				deckId: card.deckId,
				forceRecalculation: false,
			},
		);

		// 4. Trigger performance optimization batch processing
		await ctx.scheduler.runAfter(
			2000,
			api.performanceOptimization.batchProcessInteractions,
			{
				userId: identity.subject,
			},
		);

		// 5. Check if path regeneration is needed based on performance changes
		const learningPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (learningPatterns) {
			// Calculate if this review represents a significant change
			const recentReviews = await ctx.db
				.query("cardReviews")
				.withIndex(
					"by_userId_and_date",
					(q) =>
						q
							.eq("userId", identity.subject)
							.gte("reviewDate", Date.now() - 10 * 60 * 1000), // Last 10 minutes
				)
				.order("desc")
				.take(5);

			if (recentReviews.length >= 3) {
				const recentSuccessRate =
					recentReviews.filter((r) => r.wasSuccessful).length /
					recentReviews.length;
				const patternSuccessRate =
					learningPatterns.recentPerformanceTrends.last7Days.successRate;

				if (Math.abs(recentSuccessRate - patternSuccessRate) > 0.15) {
					// Significant change detected - trigger path regeneration
					await ctx.scheduler.runAfter(
						500,
						api.realTimeAdaptiveLearning.regenerateStudyPath,
						{
							deckId: card.deckId,
							sessionId: args.sessionId,
							triggerReason: "significant_performance_change",
							userId: identity.subject,
						},
					);
				}
			}
		}

		// 6. Record performance metrics
		const duration = Date.now() - startTime;
		await ctx.db.insert("performanceMetrics", {
			batchSize: 1,
			duration,
			errorOccurred: false,
			operationType: "integrated_review",
			timestamp: Date.now(),
			userId: identity.subject,
		});

		return {
			...reviewResult,
			adaptiveEnhancements: {
				conceptMasteryUpdated: true,
				pathRegenerationTriggered: learningPatterns !== null,
				performanceOptimizationScheduled: true,
				realTimePatternUpdateScheduled: true,
			},
			processingTime: duration,
		};
	},
	returns: v.object({
		adaptiveEnhancements: v.object({
			conceptMasteryUpdated: v.boolean(),
			pathRegenerationTriggered: v.boolean(),
			performanceOptimizationScheduled: v.boolean(),
			realTimePatternUpdateScheduled: v.boolean(),
		}),
		personalizedMessage: v.string(),
		processingTime: v.number(),
	}),
});

/**
 * Get comprehensive adaptive study recommendations
 */
export const getAdaptiveStudyRecommendations = query({
	args: {
		deckId: v.optional(v.id("decks")),
		language: v.optional(v.string()),
		maxRecommendations: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const maxRecs = args.maxRecommendations || 10;

		// Get learning patterns
		const learningPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Get concept mastery data
		const conceptMastery = await ctx.db
			.query("conceptMasteries")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Get cached patterns for performance (using query instead of mutation)
		const cachedPatterns = await ctx.db
			.query("learningPatternCache")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		const recommendations: Array<{
			type: string;
			priority: number;
			title: string;
			description: string;
			actionable: boolean;
			estimatedImpact: number;
			reasoning: string;
		}> = [];

		if (!learningPatterns) {
			recommendations.push({
				actionable: true,
				description:
					"Complete a few card reviews to begin personalizing your study experience.",
				estimatedImpact: 0.8,
				priority: 1.0,
				reasoning:
					"No learning patterns detected - initial data collection needed",
				title: "Start Building Your Learning Profile",
				type: "initialization",
			});
			return {
				dataQuality: {
					cacheHitRate: 0.0,
					hasConceptMastery: false,
					hasLearningPatterns: false,
					totalDataPoints: 0,
				},
				recommendations: recommendations.slice(0, maxRecs),
			};
		}

		// Analyze inconsistency patterns
		if (learningPatterns.inconsistencyPatterns.cardIds.length > 0) {
			recommendations.push({
				actionable: true,
				description: `You have ${learningPatterns.inconsistencyPatterns.cardIds.length} cards with inconsistent performance. Reviewing these can improve overall retention.`,
				estimatedImpact: 0.7,
				priority: 0.9,
				reasoning: "High variance detected in card performance",
				title: "Focus on Inconsistent Cards",
				type: "inconsistency",
			});
		}

		// Analyze plateau detection
		if (learningPatterns.plateauDetection.stagnantTopics.length > 0) {
			recommendations.push({
				actionable: true,
				description: `${learningPatterns.plateauDetection.stagnantTopics.length} topics show stagnant progress. Try different study approaches or take a short break.`,
				estimatedImpact: 0.6,
				priority: 0.8,
				reasoning: "Plateau detected in learning progress",
				title: "Break Through Learning Plateaus",
				type: "plateau",
			});
		}

		// Analyze time-of-day performance
		const bestTimeSlot = Object.entries(learningPatterns.timeOfDayPerformance)
			.filter(([_, perf]) => perf.reviewCount > 5)
			.sort(([_, a], [__, b]) => b.successRate - a.successRate)[0];

		if (bestTimeSlot && bestTimeSlot[1].successRate > 0.8) {
			recommendations.push({
				actionable: true,
				description: `Your success rate is ${Math.round(bestTimeSlot[1].successRate * 100)}% during ${bestTimeSlot[0].replace("_", " ")}. Consider scheduling study sessions then.`,
				estimatedImpact: 0.4,
				priority: 0.6,
				reasoning: "Optimal time slot identified from performance data",
				title: `Study During Your Peak Time: ${bestTimeSlot[0].replace("_", " ")}`,
				type: "timing",
			});
		}

		// Analyze concept mastery
		if (conceptMastery) {
			const strugglingConcepts = conceptMastery.concepts
				.filter((c) => c.masteryLevel < 0.5 && c.reviewCount > 3)
				.sort((a, b) => a.masteryLevel - b.masteryLevel)
				.slice(0, 3);

			if (strugglingConcepts.length > 0) {
				recommendations.push({
					actionable: true,
					description: `Focus on concepts like "${strugglingConcepts[0].conceptId}" where your mastery is below 50%.`,
					estimatedImpact: 0.8,
					priority: 0.7,
					reasoning:
						"Low mastery concepts identified through granular tracking",
					title: "Target Weak Concepts",
					type: "concept_focus",
				});
			}

			const masteryConcepts = conceptMastery.concepts.filter(
				(c) => c.masteryLevel > 0.9,
			).length;

			if (masteryConcepts > 0) {
				recommendations.push({
					actionable: true,
					description: `You've mastered ${masteryConcepts} concepts! Schedule periodic reviews to maintain retention.`,
					estimatedImpact: 0.3,
					priority: 0.3,
					reasoning: "High mastery concepts need maintenance reviews",
					title: "Maintain Mastered Concepts",
					type: "mastery_maintenance",
				});
			}
		}

		// Performance-based recommendations
		const recentTrend = learningPatterns.recentPerformanceTrends.trend;
		if (recentTrend.successRateChange < -10) {
			recommendations.push({
				actionable: true,
				description:
					"Your success rate has dropped recently. Consider reviewing fundamentals or adjusting study intensity.",
				estimatedImpact: 0.7,
				priority: 0.85,
				reasoning: "Significant decline in recent performance detected",
				title: "Address Performance Decline",
				type: "performance_decline",
			});
		} else if (recentTrend.successRateChange > 15) {
			recommendations.push({
				actionable: true,
				description:
					"Your performance is improving. Consider gradually increasing difficulty or adding new material.",
				estimatedImpact: 0.5,
				priority: 0.4,
				reasoning: "Significant improvement in recent performance detected",
				title: "Great Progress!",
				type: "performance_improvement",
			});
		}

		// Sort by priority and return top recommendations
		recommendations.sort((a, b) => b.priority - a.priority);

		return {
			dataQuality: {
				cacheHitRate: cachedPatterns ? 1.0 : 0.0,
				hasConceptMastery: !!conceptMastery,
				hasLearningPatterns: !!learningPatterns,
				totalDataPoints: learningPatterns
					? learningPatterns.recentPerformanceTrends.last7Days.reviewCount
					: 0,
			},
			recommendations: recommendations.slice(0, maxRecs),
		};
	},
	returns: v.object({
		dataQuality: v.object({
			cacheHitRate: v.number(),
			hasConceptMastery: v.boolean(),
			hasLearningPatterns: v.boolean(),
			totalDataPoints: v.number(),
		}),
		recommendations: v.array(
			v.object({
				actionable: v.boolean(),
				description: v.string(),
				estimatedImpact: v.number(),
				priority: v.number(),
				reasoning: v.string(),
				title: v.string(),
				type: v.string(),
			}),
		),
	}),
});

/**
 * Initialize adaptive learning for a new user
 */
export const initializeAdaptiveLearning = mutation({
	args: {
		language: v.optional(v.string()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if user already has learning patterns
		const existingPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (existingPatterns) {
			return { initialized: false, reason: "already_exists" };
		}

		// Initialize with default learning patterns
		await ctx.runMutation(api.adaptiveLearning.updateLearningPattern, {
			userId: args.userId,
		});

		// Initialize concept mastery tracking
		await ctx.runMutation(api.masteryTracking.calculateConceptMastery, {
			forceRecalculation: true,
		});

		// Cache initial patterns
		await ctx.runMutation(api.performanceOptimization.cacheLearningPatterns, {
			userId: args.userId,
		});

		return { initialized: true, reason: "success" };
	},
	returns: v.object({
		initialized: v.boolean(),
		reason: v.string(),
	}),
});
