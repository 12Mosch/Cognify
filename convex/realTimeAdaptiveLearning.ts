import { v } from "convex/values";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import {
	calculateCardPriorityScore,
	type UserLearningPatterns,
} from "./adaptiveLearning";
import { normalizeLanguage, t } from "./utils/translations";

/**
 * Real-Time Adaptive Learning System
 *
 * This module provides immediate pattern updates and dynamic path regeneration
 * for responsive learning experiences. Each card interaction instantly influences
 * the user's personalized study experience.
 *
 * Key Features:
 * - Immediate pattern updates after each card interaction
 * - Debounced database writes to prevent excessive operations
 * - Granular mastery tracking at concept and domain levels
 * - Dynamic study queue reordering within sessions
 * - Performance-optimized incremental updates
 */

// Real-time update configuration
const DEBOUNCE_DELAY_MS = 2000; // 2 seconds debounce for pattern updates
const SIGNIFICANT_CHANGE_THRESHOLD = 0.15; // 15% change triggers path regeneration
const MAX_PATTERN_UPDATE_FREQUENCY_MS = 30000; // Max one update per 30 seconds
const ROLLING_WINDOW_SIZE = 10; // Number of recent interactions to consider

/**
 * Enhanced interaction data structure for real-time processing
 */
interface CardInteraction {
	cardId: string;
	deckId: string;
	interactionType:
		| "flip"
		| "answer"
		| "difficulty_rating"
		| "confidence_rating";
	timestamp: number;
	responseTime?: number;
	quality?: number; // 0-5 for answer quality
	difficultyRating?: number; // 1-5 for perceived difficulty
	confidenceLevel?: number; // 1-5 for confidence rating
	wasSuccessful?: boolean;
	previousEaseFactor?: number;
	newEaseFactor?: number;
	sessionContext?: {
		sessionId: string;
		cardIndex: number;
		totalCards: number;
		studyMode: string;
	};
}

// Note: ConceptMastery interface moved to masteryTracking.ts to avoid duplication

// Note: Interface definitions moved inline where needed to avoid unused variable warnings

/**
 * Record a card interaction for real-time processing
 */
export const recordCardInteraction = mutation({
	args: {
		cardId: v.id("cards"),
		confidenceLevel: v.optional(v.number()),
		difficultyRating: v.optional(v.number()),
		interactionType: v.union(
			v.literal("flip"),
			v.literal("answer"),
			v.literal("difficulty_rating"),
			v.literal("confidence_rating"),
		),
		language: v.optional(v.string()),
		quality: v.optional(v.number()),
		responseTime: v.optional(v.number()),
		sessionContext: v.optional(
			v.object({
				cardIndex: v.number(),
				sessionId: v.string(),
				studyMode: v.string(),
				totalCards: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		// Get card and verify ownership
		const card = await ctx.db.get(args.cardId);
		if (!card) {
			const language = normalizeLanguage(args.language);
			throw new Error(t("adaptiveLearning.errors.cardNotFound", language));
		}

		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(card.deckId);
		if (!deck || deck.userId !== identity.subject) {
			const language = normalizeLanguage(args.language);
			throw new Error(t("adaptiveLearning.errors.onlyOwnCards", language));
		}

		// Create interaction record
		const interaction: CardInteraction = {
			cardId: args.cardId,
			confidenceLevel: args.confidenceLevel,
			deckId: card.deckId,
			difficultyRating: args.difficultyRating,
			interactionType: args.interactionType,
			previousEaseFactor: card.easeFactor,
			quality: args.quality,
			responseTime: args.responseTime,
			sessionContext: args.sessionContext,
			timestamp: Date.now(),
			wasSuccessful: args.quality !== undefined ? args.quality >= 3 : undefined,
		};

		// Store interaction for immediate processing
		await ctx.db.insert("cardInteractions", {
			cardId: args.cardId,
			confidenceLevel: args.confidenceLevel,
			deckId: card.deckId,
			difficultyRating: args.difficultyRating,
			interactionType: args.interactionType,
			processed: false,
			quality: args.quality,
			responseTime: args.responseTime,
			sessionId: args.sessionContext?.sessionId,
			timestamp: interaction.timestamp,
			userId: identity.subject,
			wasSuccessful: interaction.wasSuccessful, // Flag for batch processing
		});

		// Trigger immediate pattern update (debounced)
		await ctx.scheduler.runAfter(
			DEBOUNCE_DELAY_MS,
			api.realTimeAdaptiveLearning.updateLearningPatternsRealTime,
			{
				forceUpdate: false,
				interactionId: args.cardId, // Use cardId as interaction identifier
				userId: identity.subject,
			},
		);

		// Check if significant change warrants path regeneration
		const shouldRegeneratePath = await checkForSignificantChange(
			ctx,
			identity.subject,
			interaction,
		);

		if (shouldRegeneratePath) {
			// Trigger dynamic path regeneration
			await ctx.scheduler.runAfter(
				0, // Immediate
				api.realTimeAdaptiveLearning.regenerateStudyPath,
				{
					deckId: card.deckId,
					sessionId: args.sessionContext?.sessionId,
					triggerReason: `${args.interactionType}_significant_change`,
					userId: identity.subject,
				},
			);
		}

		return {
			interactionRecorded: true,
			pathRegenerationTriggered: shouldRegeneratePath,
			success: true,
		};
	},
	returns: v.object({
		interactionRecorded: v.boolean(),
		pathRegenerationTriggered: v.boolean(),
		success: v.boolean(),
	}),
});

/**
 * Check if the interaction represents a significant change that warrants path regeneration
 */
async function checkForSignificantChange(
	ctx: MutationCtx,
	userId: string,
	_interaction: CardInteraction,
): Promise<boolean> {
	// Get recent interactions for comparison
	const recentInteractions = await ctx.db
		.query("cardInteractions")
		.withIndex(
			"by_userId_and_timestamp",
			(q) =>
				q.eq("userId", userId).gte("timestamp", Date.now() - 5 * 60 * 1000), // Last 5 minutes
		)
		.order("desc")
		.take(ROLLING_WINDOW_SIZE);

	if (recentInteractions.length < 3) {
		return false; // Not enough data for comparison
	}

	// Calculate recent performance metrics
	const recentSuccessRate =
		recentInteractions
			.filter((i) => i.wasSuccessful !== undefined)
			.reduce((sum, i) => sum + (i.wasSuccessful ? 1 : 0), 0) /
		recentInteractions.filter((i) => i.wasSuccessful !== undefined).length;

	const recentResponseTime =
		recentInteractions
			.filter((i) => i.responseTime !== undefined)
			.reduce((sum, i) => sum + (i.responseTime || 0), 0) /
		recentInteractions.filter((i) => i.responseTime !== undefined).length;

	// Get user's current learning patterns for comparison
	const currentPatterns = await ctx.db
		.query("learningPatterns")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.first();

	if (!currentPatterns) {
		return true; // First time - always regenerate
	}

	// Check for significant changes
	const successRateChange = Math.abs(
		recentSuccessRate -
			currentPatterns.recentPerformanceTrends.last7Days.successRate,
	);

	const responseTimeChange =
		Math.abs(
			recentResponseTime -
				currentPatterns.recentPerformanceTrends.last7Days.averageResponseTime,
		) /
		Math.max(
			currentPatterns.recentPerformanceTrends.last7Days.averageResponseTime,
			1,
		);

	return (
		successRateChange > SIGNIFICANT_CHANGE_THRESHOLD ||
		responseTimeChange > SIGNIFICANT_CHANGE_THRESHOLD
	);
}

/**
 * Update learning patterns in real-time based on recent interactions
 */
export const updateLearningPatternsRealTime = mutation({
	args: {
		forceUpdate: v.optional(v.boolean()),
		interactionId: v.string(), // Used for debouncing
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if we should skip this update due to frequency limits
		if (!args.forceUpdate) {
			const lastUpdate = await ctx.db
				.query("learningPatterns")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.first();

			if (
				lastUpdate &&
				Date.now() - lastUpdate.lastUpdated < MAX_PATTERN_UPDATE_FREQUENCY_MS
			) {
				return { reason: "frequency_limit", updated: false };
			}
		}

		// Get unprocessed interactions for this user
		const unprocessedInteractions = await ctx.db
			.query("cardInteractions")
			.withIndex("by_userId_and_processed", (q) =>
				q.eq("userId", args.userId).eq("processed", false),
			)
			.order("desc")
			.take(50); // Process up to 50 recent interactions

		if (unprocessedInteractions.length === 0) {
			return { reason: "no_new_interactions", updated: false };
		}

		// Get current learning patterns
		const currentPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		// Calculate incremental updates to learning patterns
		const updatedPatterns = await calculateIncrementalPatternUpdates(
			ctx,
			args.userId,
			unprocessedInteractions,
			currentPatterns,
		);

		if (updatedPatterns && Object.keys(updatedPatterns).length > 0) {
			// Update or create learning patterns
			if (currentPatterns) {
				await ctx.db.patch(currentPatterns._id, updatedPatterns);
			} else {
				// For new patterns, we need to provide all required fields
				const defaultPatterns: Omit<UserLearningPatterns, "userId"> = {
					averageSuccessRate: updatedPatterns.averageSuccessRate || 0.5,
					difficultyPatterns: {
						easyCards: {
							averageInterval: 7,
							averageResponseTime: 0,
							confidenceLevel: 0,
							successRate: 0.8,
						},
						hardCards: {
							averageInterval: 3,
							averageResponseTime: 0,
							confidenceLevel: 0,
							successRate: 0.6,
						},
						mediumCards: {
							averageInterval: 5,
							averageResponseTime: 0,
							confidenceLevel: 0,
							successRate: 0.7,
						},
					},
					inconsistencyPatterns: updatedPatterns.inconsistencyPatterns || {
						averageVariance: 0,
						cardIds: [],
						detectionThreshold: 0.3,
						lastCalculated: Date.now(),
					},
					lastUpdated: Date.now(),
					learningVelocity: 0,
					personalEaseFactorBias: 0,
					personalizationConfig: {
						adaptDifficultyProgression: true,
						focusOnPlateauTopics: true,
						learningPatternInfluence: 0.3,
						optimizeForTimeOfDay: true,
						prioritizeInconsistentCards: true,
					},
					plateauDetection: {
						lastAnalyzed: Date.now(),
						plateauThreshold: 14,
						stagnantTopics: [],
					},
					recentPerformanceTrends: updatedPatterns.recentPerformanceTrends || {
						last7Days: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							reviewCount: 0,
							successRate: 0.5,
						},
						last14Days: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							reviewCount: 0,
							successRate: 0.5,
						},
						lastUpdated: Date.now(),
						trend: {
							confidenceChange: 0,
							responseTimeChange: 0,
							successRateChange: 0,
						},
					},
					retentionCurve: [
						{ interval: 1, retentionRate: 0.9 },
						{ interval: 7, retentionRate: 0.7 },
						{ interval: 30, retentionRate: 0.5 },
					],
					timeOfDayPerformance: {
						afternoon: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
						early_morning: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
						evening: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
						late_night: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
						morning: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
						night: {
							averageResponseTime: 0,
							confidenceLevel: 0,
							optimalForLearning: false,
							reviewCount: 0,
							successRate: 0.5,
						},
					},
				};

				await ctx.db.insert("learningPatterns", {
					userId: args.userId,
					...defaultPatterns,
					...updatedPatterns, // Override with actual updates
				});
			}

			// Mark interactions as processed
			for (const interaction of unprocessedInteractions) {
				await ctx.db.patch(interaction._id, { processed: true });
			}

			return {
				interactionsProcessed: unprocessedInteractions.length,
				significantChanges: identifySignificantChanges(
					currentPatterns,
					updatedPatterns,
				),
				updated: true,
			};
		}

		return { reason: "no_pattern_changes", updated: false };
	},
	returns: v.object({
		interactionsProcessed: v.optional(v.number()),
		reason: v.optional(v.string()),
		significantChanges: v.optional(v.array(v.string())),
		updated: v.boolean(),
	}),
});

/**
 * Calculate incremental updates to learning patterns based on new interactions
 */
async function calculateIncrementalPatternUpdates(
	_ctx: MutationCtx,
	_userId: string,
	newInteractions: Array<{
		interactionType: string;
		wasSuccessful?: boolean;
		responseTime?: number;
		confidenceLevel?: number;
		timestamp: number;
	}>,
	currentPatterns: UserLearningPatterns | null,
): Promise<Partial<UserLearningPatterns> | null> {
	if (newInteractions.length === 0) return null;

	const now = Date.now();
	const updates: Partial<UserLearningPatterns> = {};

	// Calculate new performance metrics from interactions
	const answerInteractions = newInteractions.filter(
		(i) => i.interactionType === "answer" && i.wasSuccessful !== undefined,
	);

	if (answerInteractions.length > 0) {
		// Update recent performance trends
		const newSuccessRate =
			answerInteractions.reduce(
				(sum, i) => sum + (i.wasSuccessful ? 1 : 0),
				0,
			) / answerInteractions.length;

		const newResponseTime =
			answerInteractions
				.filter((i) => i.responseTime !== undefined)
				.reduce((sum, i) => sum + (i.responseTime || 0), 0) /
			answerInteractions.filter((i) => i.responseTime !== undefined).length;

		const confidenceInteractions = newInteractions.filter(
			(i) =>
				i.interactionType === "confidence_rating" &&
				i.confidenceLevel !== undefined,
		);
		const newConfidenceLevel =
			confidenceInteractions.length > 0
				? confidenceInteractions.reduce(
						(sum, i) => sum + (i.confidenceLevel || 0),
						0,
					) / confidenceInteractions.length
				: 0;

		// Update rolling averages (weighted combination of old and new data)
		if (currentPatterns) {
			const weight = Math.min(0.3, newInteractions.length / 20); // Max 30% weight for new data

			updates.recentPerformanceTrends = {
				...currentPatterns.recentPerformanceTrends,
				last7Days: {
					averageResponseTime:
						(1 - weight) *
							currentPatterns.recentPerformanceTrends.last7Days
								.averageResponseTime +
						weight *
							(newResponseTime ||
								currentPatterns.recentPerformanceTrends.last7Days
									.averageResponseTime),
					confidenceLevel:
						(1 - weight) *
							currentPatterns.recentPerformanceTrends.last7Days
								.confidenceLevel +
						weight *
							(newConfidenceLevel ||
								currentPatterns.recentPerformanceTrends.last7Days
									.confidenceLevel),
					reviewCount:
						currentPatterns.recentPerformanceTrends.last7Days.reviewCount +
						answerInteractions.length,
					successRate:
						(1 - weight) *
							currentPatterns.recentPerformanceTrends.last7Days.successRate +
						weight * newSuccessRate,
				},
				lastUpdated: now,
				trend: {
					confidenceChange: calculateTrendChange(
						currentPatterns.recentPerformanceTrends.last14Days.confidenceLevel,
						(1 - weight) *
							currentPatterns.recentPerformanceTrends.last7Days
								.confidenceLevel +
							weight * (newConfidenceLevel || 0),
					),
					responseTimeChange:
						newResponseTime -
						currentPatterns.recentPerformanceTrends.last7Days
							.averageResponseTime,
					successRateChange: calculateTrendChange(
						currentPatterns.recentPerformanceTrends.last14Days.successRate,
						(1 - weight) *
							currentPatterns.recentPerformanceTrends.last7Days.successRate +
							weight * newSuccessRate,
					),
				},
			};

			// Update overall success rate
			const totalReviews =
				currentPatterns.recentPerformanceTrends.last7Days.reviewCount +
				answerInteractions.length;
			updates.averageSuccessRate =
				(currentPatterns.averageSuccessRate *
					currentPatterns.recentPerformanceTrends.last7Days.reviewCount +
					newSuccessRate * answerInteractions.length) /
				totalReviews;
		} else {
			// First time - create initial patterns
			updates.recentPerformanceTrends = {
				last7Days: {
					averageResponseTime: newResponseTime || 0,
					confidenceLevel: newConfidenceLevel || 0,
					reviewCount: answerInteractions.length,
					successRate: newSuccessRate,
				},
				last14Days: {
					averageResponseTime: newResponseTime || 0,
					confidenceLevel: newConfidenceLevel || 0,
					reviewCount: answerInteractions.length,
					successRate: newSuccessRate,
				},
				lastUpdated: now,
				trend: {
					confidenceChange: 0,
					responseTimeChange: 0,
					successRateChange: 0,
				},
			};
			updates.averageSuccessRate = newSuccessRate;
		}
	}

	// Update inconsistency patterns if we have enough new data
	if (answerInteractions.length >= 3) {
		updates.inconsistencyPatterns = await updateInconsistencyPatterns(
			_ctx,
			_userId,
			newInteractions,
			currentPatterns?.inconsistencyPatterns,
		);
	}

	updates.lastUpdated = now;
	return Object.keys(updates).length > 0 ? updates : null;
}

/**
 * Calculate trend change percentage
 */
function calculateTrendChange(oldValue: number, newValue: number): number {
	if (oldValue === 0) return 0;
	return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Update inconsistency patterns based on new interactions
 */
async function updateInconsistencyPatterns(
	_ctx: MutationCtx,
	_userId: string,
	newInteractions: Array<{
		interactionType: string;
		wasSuccessful?: boolean;
		responseTime?: number;
		confidenceLevel?: number;
		timestamp: number;
		cardId?: string;
	}>,
	currentPatterns?: UserLearningPatterns["inconsistencyPatterns"],
): Promise<UserLearningPatterns["inconsistencyPatterns"]> {
	// Group interactions by card
	const cardInteractions = new Map<string, boolean[]>();

	for (const interaction of newInteractions) {
		if (
			interaction.interactionType === "answer" &&
			interaction.wasSuccessful !== undefined &&
			interaction.cardId
		) {
			if (!cardInteractions.has(interaction.cardId)) {
				cardInteractions.set(interaction.cardId, []);
			}
			cardInteractions.get(interaction.cardId)?.push(interaction.wasSuccessful);
		}
	}

	const inconsistentCards: string[] = [];
	let totalVariance = 0;
	let cardCount = 0;

	// Calculate variance for cards with sufficient new data
	for (const [cardId, results] of cardInteractions.entries()) {
		if (results.length >= 3) {
			// Calculate variance in recent results
			const variance = calculateVariance(results.map((r) => (r ? 1 : 0)));

			if (variance > 0.2) {
				// Threshold for inconsistency
				inconsistentCards.push(cardId);
			}

			totalVariance += variance;
			cardCount++;
		}
	}

	// Merge with existing patterns if available
	const existingInconsistentCards = currentPatterns?.cardIds || [];
	const mergedInconsistentCards = Array.from(
		new Set([...existingInconsistentCards, ...inconsistentCards]),
	);

	return {
		averageVariance:
			cardCount > 0
				? totalVariance / cardCount
				: currentPatterns?.averageVariance || 0,
		cardIds: mergedInconsistentCards,
		detectionThreshold: 0.3,
		lastCalculated: Date.now(),
	};
}

/**
 * Calculate variance for a set of binary values (0 or 1)
 */
function calculateVariance(values: number[]): number {
	if (values.length < 2) return 0;

	const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
	const squaredDiffs = values.map((val) => (val - mean) ** 2);
	return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

/**
 * Identify significant changes between old and new patterns
 */
function identifySignificantChanges(
	oldPatterns: UserLearningPatterns | null,
	newPatterns: Partial<UserLearningPatterns>,
): string[] {
	const changes: string[] = [];

	if (!oldPatterns) {
		changes.push("initial_patterns_created");
		return changes;
	}

	// Check for significant success rate changes
	if (newPatterns.averageSuccessRate !== undefined) {
		const change = Math.abs(
			newPatterns.averageSuccessRate - oldPatterns.averageSuccessRate,
		);
		if (change > 0.1) {
			changes.push(
				`success_rate_${change > 0 ? "improved" : "declined"}_by_${Math.round(change * 100)}%`,
			);
		}
	}

	// Check for new inconsistent cards
	if (newPatterns.inconsistencyPatterns) {
		const newInconsistentCards =
			newPatterns.inconsistencyPatterns.cardIds.filter(
				(cardId) =>
					!oldPatterns.inconsistencyPatterns?.cardIds.includes(cardId),
			);
		if (newInconsistentCards.length > 0) {
			changes.push(
				`new_inconsistent_cards_detected_${newInconsistentCards.length}`,
			);
		}
	}

	// Check for performance trend changes
	if (newPatterns.recentPerformanceTrends?.trend) {
		const trend = newPatterns.recentPerformanceTrends.trend;
		if (Math.abs(trend.successRateChange) > 15) {
			changes.push(
				`performance_trend_${trend.successRateChange > 0 ? "improving" : "declining"}`,
			);
		}
	}

	return changes;
}

/**
 * Regenerate study path dynamically based on updated learning patterns
 */
export const regenerateStudyPath = mutation({
	args: {
		deckId: v.id("decks"),
		sessionId: v.optional(v.string()),
		triggerReason: v.string(),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);
		if (!deck || deck.userId !== args.userId) {
			throw new Error("Access denied to deck");
		}

		// Get updated learning patterns
		const learningPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		if (!learningPatterns) {
			return { reason: "no_learning_patterns", regenerated: false };
		}

		// Get current study queue for this deck
		const studyQueue = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_dueDate", (q) =>
				q.eq("deckId", args.deckId).lte("dueDate", Date.now()),
			)
			.order("asc")
			.take(50); // Limit to reasonable queue size

		if (studyQueue.length === 0) {
			return { reason: "no_cards_due", regenerated: false };
		}

		// Get recent card reviews for priority calculation
		const recentReviews = await ctx.db
			.query("cardReviews")
			.withIndex(
				"by_userId_and_date",
				(q) =>
					q
						.eq("userId", args.userId)
						.gte("reviewDate", Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
			)
			.order("desc")
			.take(200);

		// Calculate new priority scores for each card
		const cardPriorities = studyQueue.map((card) => {
			const cardReviews = recentReviews.filter((r) => r.cardId === card._id);

			// Use existing priority calculation with updated patterns
			const priorityResult = calculateCardPriorityScore(
				card,
				cardReviews.map((r) => ({
					reviewDate: r.reviewDate,
					wasSuccessful: r.wasSuccessful,
				})),
				learningPatterns,
				{
					difficultyAdaptation: learningPatterns.personalizationConfig
						.adaptDifficultyProgression
						? 0.2
						: 0.0,
					inconsistencyBoost: learningPatterns.personalizationConfig
						.prioritizeInconsistentCards
						? 1.5
						: 1.0,
					learningPatternWeight:
						learningPatterns.personalizationConfig.learningPatternInfluence,
					plateauBoost: learningPatterns.personalizationConfig
						.focusOnPlateauTopics
						? 1.3
						: 1.0,
					srsWeight:
						1 - learningPatterns.personalizationConfig.learningPatternInfluence,
					timeOfDayBoost: learningPatterns.personalizationConfig
						.optimizeForTimeOfDay
						? 1.2
						: 1.0,
				},
			);

			return {
				appliedBoosts: priorityResult.appliedBoosts,
				cardId: card._id,
				priorityScore: priorityResult.priorityScore,
				reasoning: priorityResult.reasoning,
			};
		});

		// Sort by priority score (highest first)
		cardPriorities.sort((a, b) => b.priorityScore - a.priorityScore);

		// Store the regenerated path for this session
		if (args.sessionId) {
			await ctx.db.insert("studyPathRegeneration", {
				deckId: args.deckId,
				newOrder: cardPriorities.map((cp) => cp.cardId),
				originalOrder: studyQueue.map((card) => card._id),
				priorityScores: cardPriorities.map((cp) => ({
					boosts: cp.appliedBoosts,
					cardId: cp.cardId,
					reasoning: cp.reasoning,
					score: cp.priorityScore,
				})),
				sessionId: args.sessionId,
				timestamp: Date.now(),
				triggerReason: args.triggerReason,
				userId: args.userId,
			});
		}

		return {
			cardsReordered: cardPriorities.length,
			regenerated: true,
			topPriorityCards: cardPriorities.slice(0, 5).map((cp) => ({
				cardId: cp.cardId,
				priorityScore: cp.priorityScore,
				reasoning: cp.reasoning,
			})),
			triggerReason: args.triggerReason,
		};
	},
	returns: v.object({
		cardsReordered: v.optional(v.number()),
		reason: v.optional(v.string()),
		regenerated: v.boolean(),
		topPriorityCards: v.optional(
			v.array(
				v.object({
					cardId: v.string(),
					priorityScore: v.number(),
					reasoning: v.string(),
				}),
			),
		),
		triggerReason: v.optional(v.string()),
	}),
});

/**
 * Get real-time adaptive study queue with dynamic prioritization
 */
export const getAdaptiveStudyQueue = query({
	args: {
		deckId: v.id("decks"),
		maxCards: v.optional(v.number()),
		sessionId: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);
		if (!deck || deck.userId !== identity.subject) {
			throw new Error("Access denied to deck");
		}

		// Check if there's a recent path regeneration for this session
		let regeneratedPath = null;
		if (args.sessionId) {
			const sessionId = args.sessionId; // Type narrowing
			regeneratedPath = await ctx.db
				.query("studyPathRegeneration")
				.withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
				.order("desc")
				.first();
		}

		// Get learning patterns for adaptive prioritization
		const learningPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Get study queue
		const maxCardsLimit = args.maxCards || 20;
		let studyQueue: Array<{
			_id: Id<"cards">;
			front: string;
			back: string;
			deckId: Id<"decks">;
			userId: string;
			dueDate?: number;
			easeFactor?: number;
			interval?: number;
			repetition?: number;
			frontImageId?: Id<"_storage">;
			backImageId?: Id<"_storage">;
			priorityScore?: number;
			adaptiveReasoning?: string;
		}>;

		if (
			regeneratedPath &&
			Date.now() - regeneratedPath.timestamp < 30 * 60 * 1000
		) {
			// Use regenerated path if it's less than 30 minutes old
			const cardIds = regeneratedPath.newOrder.slice(0, maxCardsLimit);
			studyQueue = [];

			for (const cardId of cardIds) {
				try {
					// deepcode ignore Sqli: <No SQL injection risk in Convex>
					const card = await ctx.db.get(cardId as Id<"cards">);
					if (card) {
						studyQueue.push(card);
					}
				} catch (_error) {
					// Skip invalid card IDs
					console.warn(`Invalid card ID in regenerated path: ${cardId}`);
				}
			}
		} else {
			// Get standard study queue and apply adaptive prioritization
			const dueCards = await ctx.db
				.query("cards")
				.withIndex("by_deckId_and_dueDate", (q) =>
					q.eq("deckId", args.deckId).lte("dueDate", Date.now()),
				)
				.order("asc")
				.take(maxCardsLimit * 2); // Get more cards for better prioritization

			const newCards = await ctx.db
				.query("cards")
				.withIndex("by_deckId_and_repetition", (q) =>
					q.eq("deckId", args.deckId).eq("repetition", undefined),
				)
				.take(Math.max(5, maxCardsLimit - dueCards.length));

			const allCards = [...dueCards, ...newCards];

			if (learningPatterns && allCards.length > 0) {
				// Apply adaptive prioritization
				const recentReviews = await ctx.db
					.query("cardReviews")
					.withIndex("by_userId_and_date", (q) =>
						q
							.eq("userId", identity.subject)
							.gte("reviewDate", Date.now() - 7 * 24 * 60 * 60 * 1000),
					)
					.order("desc")
					.take(200);

				const prioritizedCards = allCards.map((card) => {
					const cardReviews = recentReviews.filter(
						(r) => r.cardId === card._id,
					);

					const priorityResult = calculateCardPriorityScore(
						card,
						cardReviews.map((r) => ({
							reviewDate: r.reviewDate,
							wasSuccessful: r.wasSuccessful,
						})),
						learningPatterns,
						{
							difficultyAdaptation: learningPatterns.personalizationConfig
								.adaptDifficultyProgression
								? 0.2
								: 0.0,
							inconsistencyBoost: learningPatterns.personalizationConfig
								.prioritizeInconsistentCards
								? 1.5
								: 1.0,
							learningPatternWeight:
								learningPatterns.personalizationConfig.learningPatternInfluence,
							plateauBoost: learningPatterns.personalizationConfig
								.focusOnPlateauTopics
								? 1.3
								: 1.0,
							srsWeight:
								1 -
								learningPatterns.personalizationConfig.learningPatternInfluence,
							timeOfDayBoost: learningPatterns.personalizationConfig
								.optimizeForTimeOfDay
								? 1.2
								: 1.0,
						},
					);

					return {
						...card,
						adaptiveReasoning: priorityResult.reasoning,
						priorityScore: priorityResult.priorityScore,
					};
				});

				studyQueue = prioritizedCards
					.sort((a, b) => b.priorityScore - a.priorityScore)
					.slice(0, maxCardsLimit);
			} else {
				studyQueue = allCards.slice(0, maxCardsLimit);
			}
		}

		// Add image URLs to cards
		const studyQueueWithImages = await Promise.all(
			studyQueue.map(async (card) => ({
				...card,
				backImageUrl: card.backImageId
					? await ctx.storage.getUrl(card.backImageId)
					: null,
				frontImageUrl: card.frontImageId
					? await ctx.storage.getUrl(card.frontImageId)
					: null,
			})),
		);

		return studyQueueWithImages;
	},
});

/**
 * Get recent path regenerations for a session
 */
export const getRecentPathRegeneration = query({
	args: {
		limit: v.optional(v.number()),
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const limit = args.limit || 5;

		// Get recent path regenerations for this session
		const regenerations = await ctx.db
			.query("studyPathRegeneration")
			.withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
			.order("desc")
			.take(limit);

		// Filter to only return regenerations for the authenticated user
		const userRegenerations = regenerations.filter(
			(regen) => regen.userId === identity.subject,
		);

		return userRegenerations;
	},
	returns: v.array(
		v.object({
			_creationTime: v.number(),
			_id: v.id("studyPathRegeneration"),
			deckId: v.id("decks"),
			newOrder: v.array(v.string()),
			originalOrder: v.array(v.string()),
			priorityScores: v.array(
				v.object({
					boosts: v.array(v.string()),
					cardId: v.string(),
					reasoning: v.string(),
					score: v.number(),
				}),
			),
			sessionId: v.string(),
			timestamp: v.number(),
			triggerReason: v.string(),
			userId: v.string(),
		}),
	),
});
