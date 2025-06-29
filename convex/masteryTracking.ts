import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { normalizeLanguage, t } from "./utils/translations";

/**
 * Granular Mastery Tracking System
 *
 * This module provides detailed tracking of concept and domain mastery levels,
 * enabling fine-grained adaptive learning adjustments based on specific
 * knowledge areas and their relationships.
 *
 * Key Features:
 * - Individual concept mastery tracking
 * - Domain-specific performance trends
 * - Cross-concept relationship mapping
 * - Real-time difficulty adjustments
 * - Prerequisite and dependency analysis
 */

// Mastery level thresholds
const MASTERY_THRESHOLDS = {
	ADVANCED: 0.8,
	BEGINNER: 0.3,
	EXPERT: 0.95,
	INTERMEDIATE: 0.6,
} as const;

// Minimum data requirements for reliable mastery assessment
const MIN_REVIEWS_FOR_MASTERY = 5;
// Note: Additional constants available for future enhancements

/**
 * Enhanced concept mastery data structure
 */
export interface ConceptMastery {
	conceptId: string;
	conceptKeywords: string[];
	masteryLevel: number; // 0-1 scale
	confidenceLevel: number; // 0-1 scale
	lastReviewed: number;
	reviewCount: number;
	successRate: number;
	averageResponseTime: number;
	difficultyTrend: "improving" | "stable" | "declining";
	masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
	relatedConcepts: Array<{
		conceptId: string;
		relationshipStrength: number; // 0-1 scale
		relationshipType: "prerequisite" | "related" | "advanced";
		mutualReinforcementScore: number; // How much learning one helps the other
	}>;
	strugglingAreas: Array<{
		issueType: "inconsistent" | "plateau" | "declining" | "slow_response";
		severity: number; // 0-1 scale
		firstDetected: number;
		lastOccurrence: number;
		recommendedAction: string;
	}>;
	learningVelocity: number; // Rate of mastery improvement per review
	retentionStrength: number; // How well knowledge is retained over time
}

/**
 * Domain performance tracking with hierarchical concept organization
 */
export interface DomainMastery {
	domainId: string;
	domainName: string;
	overallMastery: number; // 0-1 scale
	conceptMasteries: ConceptMastery[];
	performanceTrend: {
		last7Days: number;
		last14Days: number;
		last30Days: number;
		trendDirection: "improving" | "stable" | "declining";
		changeRate: number; // Percentage change per day
		projectedMastery30Days: number; // Predicted mastery in 30 days
	};
	optimalStudyTime: {
		timeSlot: string;
		successRate: number;
		averageResponseTime: number;
		masteryGainRate: number; // Mastery improvement per minute of study
	};
	conceptRelationships: Array<{
		fromConceptId: string;
		toConceptId: string;
		relationshipType: "prerequisite" | "builds_on" | "reinforces" | "conflicts";
		strength: number; // 0-1 scale
		discoveredAt: number;
		validatedCount: number; // How many times this relationship was confirmed
	}>;
	recommendedStudyPath: Array<{
		conceptId: string;
		priority: number; // 0-1 scale
		estimatedTimeToMastery: number; // Minutes
		prerequisitesMet: boolean;
		reasoning: string;
	}>;
}

/**
 * Extract concepts from card content using keyword analysis
 */
function extractConcepts(
	cardContent: string,
	domainHints?: string[],
): string[] {
	// Simple keyword extraction - can be enhanced with NLP
	const text = cardContent.toLowerCase();
	const words = text
		.replace(/[^\w\s]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 3);

	// Remove common stop words
	const stopWords = new Set([
		"this",
		"that",
		"with",
		"have",
		"will",
		"from",
		"they",
		"been",
		"were",
		"said",
		"each",
		"which",
		"their",
		"time",
		"would",
		"there",
		"could",
		"other",
		"more",
		"very",
		"what",
		"know",
		"just",
		"first",
		"into",
		"over",
		"think",
		"also",
		"your",
		"work",
		"life",
		"only",
		"can",
		"still",
		"should",
		"after",
		"being",
		"now",
		"made",
		"before",
		"here",
		"through",
		"when",
		"where",
		"much",
		"some",
		"these",
		"many",
		"then",
		"them",
		"well",
		"were",
	]);

	const concepts = words.filter((word) => !stopWords.has(word));

	// If domain hints are provided, prioritize related concepts
	if (domainHints) {
		const domainWords = domainHints.map((hint) => hint.toLowerCase());
		concepts.sort((a, b) => {
			const aRelevant = domainWords.some(
				(domain) => a.includes(domain) || domain.includes(a),
			);
			const bRelevant = domainWords.some(
				(domain) => b.includes(domain) || domain.includes(b),
			);
			if (aRelevant && !bRelevant) return -1;
			if (!aRelevant && bRelevant) return 1;
			return 0;
		});
	}

	// Return top concepts (limit to prevent noise)
	return concepts.slice(0, 5);
}

/**
 * Calculate mastery level based on performance metrics
 */
function calculateMasteryLevel(
	successRate: number,
	reviewCount: number,
	averageResponseTime: number,
	recentTrend: "improving" | "stable" | "declining",
): number {
	if (reviewCount < MIN_REVIEWS_FOR_MASTERY) {
		return 0; // Insufficient data
	}

	// Base mastery from success rate
	let mastery = successRate;

	// Adjust for response time (faster = higher mastery)
	const responseTimeFactor = Math.max(
		0.5,
		Math.min(1.2, 5000 / Math.max(averageResponseTime, 1000)),
	);
	mastery *= responseTimeFactor;

	// Adjust for trend
	if (recentTrend === "improving") {
		mastery *= 1.1; // 10% boost for improving trend
	} else if (recentTrend === "declining") {
		mastery *= 0.9; // 10% penalty for declining trend
	}

	// Adjust for review count (more reviews = more reliable)
	const reliabilityFactor = Math.min(1.0, reviewCount / 20);
	mastery *= 0.7 + 0.3 * reliabilityFactor;

	return Math.max(0, Math.min(1, mastery));
}

/**
 * Determine mastery category from level
 */
function getMasteryCategory(
	masteryLevel: number,
): "beginner" | "intermediate" | "advanced" | "expert" {
	if (masteryLevel >= MASTERY_THRESHOLDS.EXPERT) return "expert";
	if (masteryLevel >= MASTERY_THRESHOLDS.ADVANCED) return "advanced";
	if (masteryLevel >= MASTERY_THRESHOLDS.INTERMEDIATE) return "intermediate";
	return "beginner";
}

/**
 * Calculate concept mastery for a user's cards
 */
export const calculateConceptMastery = mutation({
	args: {
		deckId: v.optional(v.id("decks")),
		forceRecalculation: v.optional(v.boolean()),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		// Get user's cards (optionally filtered by deck)
		let cards: Doc<"cards">[];
		if (args.deckId) {
			// Verify deck ownership
			const deck = await ctx.db.get(args.deckId);
			if (!deck || deck.userId !== identity.subject) {
				const language = normalizeLanguage(args.language);
				throw new Error(t("adaptiveLearning.errors.onlyOwnCards", language));
			}

			const deckId = args.deckId; // Type narrowing
			cards = await ctx.db
				.query("cards")
				.withIndex("by_deckId", (q) => q.eq("deckId", deckId))
				.collect();
		} else {
			cards = await ctx.db
				.query("cards")
				.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
				.collect();
		}

		// Get recent reviews for mastery calculation
		const cutoffDate = Date.now() - 30 * 24 * 60 * 60 * 1000; // Last 30 days
		const reviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) =>
				q.eq("userId", identity.subject).gte("reviewDate", cutoffDate),
			)
			.order("desc")
			.take(1000);

		// Group cards by concepts
		const conceptGroups = new Map<
			string,
			{
				cards: typeof cards;
				reviews: typeof reviews;
			}
		>();

		for (const card of cards) {
			const concepts = extractConcepts(`${card.front} ${card.back}`);
			const cardReviews = reviews.filter((r) => r.cardId === card._id);

			for (const concept of concepts) {
				if (!conceptGroups.has(concept)) {
					conceptGroups.set(concept, { cards: [], reviews: [] });
				}
				const group = conceptGroups.get(concept);
				if (group) {
					group.cards.push(card);
					group.reviews.push(...cardReviews);
				}
			}
		}

		// Calculate mastery for each concept
		const conceptMasteries: ConceptMastery[] = [];

		for (const [conceptId, group] of conceptGroups.entries()) {
			if (group.reviews.length < MIN_REVIEWS_FOR_MASTERY) {
				continue; // Skip concepts with insufficient data
			}

			// Calculate performance metrics
			const successRate =
				group.reviews.filter((r) => r.wasSuccessful).length /
				group.reviews.length;
			const averageResponseTime =
				group.reviews
					.filter((r) => r.responseTime)
					.reduce((sum, r) => sum + (r.responseTime || 0), 0) /
				group.reviews.filter((r) => r.responseTime).length;

			// Calculate trend
			const recentReviews = group.reviews.slice(
				0,
				Math.min(10, group.reviews.length),
			);
			const olderReviews = group.reviews.slice(10);
			const recentSuccessRate =
				recentReviews.length > 0
					? recentReviews.filter((r) => r.wasSuccessful).length /
						recentReviews.length
					: 0;
			const olderSuccessRate =
				olderReviews.length > 0
					? olderReviews.filter((r) => r.wasSuccessful).length /
						olderReviews.length
					: 0;

			let difficultyTrend: "improving" | "stable" | "declining" = "stable";
			if (recentSuccessRate > olderSuccessRate + 0.1) {
				difficultyTrend = "improving";
			} else if (recentSuccessRate < olderSuccessRate - 0.1) {
				difficultyTrend = "declining";
			}

			// Calculate mastery level
			const masteryLevel = calculateMasteryLevel(
				successRate,
				group.reviews.length,
				averageResponseTime,
				difficultyTrend,
			);

			// Calculate confidence level (based on consistency)
			const variance =
				group.reviews.length > 1
					? group.reviews.reduce((sum, r, _i, _arr) => {
							const mean = successRate;
							const value = r.wasSuccessful ? 1 : 0;
							return sum + (value - mean) ** 2;
						}, 0) / group.reviews.length
					: 0;
			const confidenceLevel = Math.max(0, 1 - variance);

			// Calculate learning velocity
			const timeSpan = Math.max(
				1,
				(Date.now() - group.reviews[group.reviews.length - 1].reviewDate) /
					(24 * 60 * 60 * 1000),
			);
			const learningVelocity = masteryLevel / timeSpan;

			conceptMasteries.push({
				averageResponseTime: averageResponseTime || 0,
				conceptId,
				conceptKeywords: [conceptId],
				confidenceLevel,
				difficultyTrend,
				lastReviewed: group.reviews[0].reviewDate,
				learningVelocity,
				masteryCategory: getMasteryCategory(masteryLevel),
				masteryLevel,
				relatedConcepts: [],
				retentionStrength: successRate, // Will be calculated separately
				reviewCount: group.reviews.length, // Will be calculated separately
				strugglingAreas: [],
				successRate, // Simplified for now
			});
		}

		// Store concept masteries
		const existingMastery = await ctx.db
			.query("conceptMasteries")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		const masteryData = {
			averageMastery:
				conceptMasteries.reduce((sum, c) => sum + c.masteryLevel, 0) /
				conceptMasteries.length,
			concepts: conceptMasteries,
			deckId: args.deckId,
			lastCalculated: Date.now(),
			totalConcepts: conceptMasteries.length,
			userId: identity.subject,
		};

		if (existingMastery) {
			await ctx.db.patch(existingMastery._id, masteryData);
		} else {
			await ctx.db.insert("conceptMasteries", masteryData);
		}

		return {
			averageMastery: masteryData.averageMastery,
			conceptsAnalyzed: conceptMasteries.length,
			masteryDistribution: {
				advanced: conceptMasteries.filter(
					(c) => c.masteryCategory === "advanced",
				).length,
				beginner: conceptMasteries.filter(
					(c) => c.masteryCategory === "beginner",
				).length,
				expert: conceptMasteries.filter((c) => c.masteryCategory === "expert")
					.length,
				intermediate: conceptMasteries.filter(
					(c) => c.masteryCategory === "intermediate",
				).length,
			},
		};
	},
	returns: v.object({
		averageMastery: v.number(),
		conceptsAnalyzed: v.number(),
		masteryDistribution: v.object({
			advanced: v.number(),
			beginner: v.number(),
			expert: v.number(),
			intermediate: v.number(),
		}),
	}),
});

/**
 * Get concept mastery data for a user
 */
export const getConceptMastery = query({
	args: {
		deckId: v.optional(v.id("decks")),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const mastery = await ctx.db
			.query("conceptMasteries")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!mastery) {
			return null;
		}

		// Filter by deck if specified
		if (args.deckId && mastery.deckId !== args.deckId) {
			return null;
		}

		return mastery;
	},
	returns: v.union(
		v.object({
			_creationTime: v.number(),
			_id: v.id("conceptMasteries"),
			averageMastery: v.number(),
			concepts: v.array(
				v.object({
					averageResponseTime: v.number(),
					conceptId: v.string(),
					conceptKeywords: v.array(v.string()),
					confidenceLevel: v.number(),
					difficultyTrend: v.union(
						v.literal("improving"),
						v.literal("stable"),
						v.literal("declining"),
					),
					lastReviewed: v.number(),
					learningVelocity: v.number(),
					masteryCategory: v.union(
						v.literal("beginner"),
						v.literal("intermediate"),
						v.literal("advanced"),
						v.literal("expert"),
					),
					masteryLevel: v.number(),
					relatedConcepts: v.array(
						v.object({
							conceptId: v.string(),
							mutualReinforcementScore: v.number(),
							relationshipStrength: v.number(),
							relationshipType: v.union(
								v.literal("prerequisite"),
								v.literal("related"),
								v.literal("advanced"),
							),
						}),
					),
					retentionStrength: v.number(),
					reviewCount: v.number(),
					strugglingAreas: v.array(
						v.object({
							firstDetected: v.number(),
							issueType: v.union(
								v.literal("inconsistent"),
								v.literal("plateau"),
								v.literal("declining"),
								v.literal("slow_response"),
							),
							lastOccurrence: v.number(),
							recommendedAction: v.string(),
							severity: v.number(),
						}),
					),
					successRate: v.number(),
				}),
			),
			deckId: v.optional(v.id("decks")),
			lastCalculated: v.number(),
			totalConcepts: v.number(),
			userId: v.string(),
		}),
		v.null(),
	),
});
