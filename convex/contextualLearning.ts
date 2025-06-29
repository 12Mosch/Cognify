import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";
import type {
	PathPersonalizationConfig,
	UserLearningPatterns,
} from "./adaptiveLearning";
import {
	calculateAdvancedSimilarity,
	type ProcessedText,
	processText,
	type SimilarityResult,
} from "./utils/textAnalysis";
import { normalizeLanguage, t } from "./utils/translations";

/**
 * Contextual Learning Features
 *
 * This module provides features to enhance learning through context and connections:
 * - Related card suggestions based on content similarity
 * - Concept clustering and knowledge mapping
 * - Cross-deck learning connections
 * - Knowledge graph visualization data
 * - Semantic relationships between topics
 * - Learning path recommendations
 *
 * Performance Optimizations:
 * - Limited card comparisons to prevent O(n²) performance issues
 * - Prioritizes same-deck cards (most likely to be related)
 * - Samples from other decks rather than loading all cards
 * - Implements pagination and limits for large collections
 * - Uses efficient similarity thresholds to reduce computation
 */

// Import shared relationship types and constants
import {
	RELATIONSHIP_REASONS,
	RELATIONSHIP_TYPES,
	type RelationshipReason,
	type RelationshipType,
} from "../src/types/relationships";

interface CardRelationship {
	type: RelationshipType;
	strength: number; // 0-1 scale
	reason: RelationshipReason;
}

interface ConceptCluster {
	id: string;
	name: string;
	description: string;
	cardIds: string[];
	centerCard: string; // Most representative card
	difficulty: number; // Average difficulty
	masteryLevel: number; // User's mastery of this cluster
}

interface KnowledgeGraphNode {
	id: string;
	label: string;
	type: "card" | "concept" | "deck";
	size: number; // Based on importance/connections
	color: string; // Based on mastery level or category
	metadata: {
		deckId?: string;
		masteryLevel?: number;
		difficulty?: number;
		lastReviewed?: number;
	};
}

interface KnowledgeGraphEdge {
	source: string;
	target: string;
	type: RelationshipType | "contains";
	weight: number; // Strength of relationship
	label?: string;
}

/**
 * Find related cards based on content similarity and learning patterns
 */
export const getRelatedCards = query({
	args: {
		cardId: v.id("cards"),
		language: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("contextualLearning.errors.userNotAuthenticated", language),
			);
		}

		const limit = args.limit || 5;
		const language = normalizeLanguage(args.language);

		// Get the source card
		const sourceCard = await ctx.db.get(args.cardId);
		if (!sourceCard) {
			throw new Error(t("contextualLearning.errors.cardNotFound", language));
		}

		// Verify ownership
		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const sourceDeck = await ctx.db.get(sourceCard.deckId);
		if (!sourceDeck || sourceDeck.userId !== identity.subject) {
			throw new Error(t("contextualLearning.errors.onlyOwnCards", language));
		}

		// Optimized card loading: limit scope to same deck and sample from other decks
		const allCards = [];

		// 1. Get all cards from the same deck (most likely to be related)
		const sameDeckCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId", (q) => q.eq("deckId", sourceCard.deckId))
			.filter((q) => q.neq(q.field("_id"), args.cardId))
			.take(50); // Limit to 50 cards from same deck

		for (const card of sameDeckCards) {
			allCards.push({ ...card, deckName: sourceDeck.name });
		}

		// 2. Sample cards from other decks (up to 5 decks, 20 cards each)
		const otherDecks = await ctx.db
			.query("decks")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.filter((q) => q.neq(q.field("_id"), sourceCard.deckId))
			.take(5); // Limit to 5 other decks

		for (const deck of otherDecks) {
			const deckCards = await ctx.db
				.query("cards")
				.withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
				.take(20); // Sample 20 cards per deck

			for (const card of deckCards) {
				if (card._id !== args.cardId) {
					allCards.push({ ...card, deckName: deck.name });
				}
			}
		}

		// Calculate relationships using simple text similarity and heuristics
		const relationships = [];

		for (const card of allCards) {
			const relationship = calculateCardRelationship(
				sourceCard,
				card,
				normalizeLanguage(language) as "en" | "de",
			);
			if (relationship.strength > 0.3) {
				// Threshold for relevance
				relationships.push({
					card: {
						_id: card._id,
						back: card.back,
						deckId: card.deckId,
						front: card.front,
					},
					deckName: card.deckName,
					reason: relationship.reason,
					relationshipType: relationship.type,
					strength: relationship.strength,
				});
			}
		}

		// Sort by strength and return top results
		return relationships
			.sort((a, b) => b.strength - a.strength)
			.slice(0, limit);
	},
	returns: v.array(
		v.object({
			card: v.object({
				_id: v.id("cards"),
				back: v.string(),
				deckId: v.id("decks"),
				front: v.string(),
			}),
			deckName: v.string(),
			reason: v.string(),
			relationshipType: v.string(),
			strength: v.number(),
		}),
	),
});

/**
 * Get concept clusters for a user's knowledge base
 */
export const getConceptClusters = query({
	args: {
		deckId: v.optional(v.id("decks")),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("contextualLearning.errors.userNotAuthenticated", language),
			);
		}

		const language = normalizeLanguage(args.language);

		// Get cards to cluster
		let cards = [];
		if (args.deckId) {
			// Verify deck ownership
			const deck = await ctx.db.get(args.deckId);
			if (!deck || deck.userId !== identity.subject) {
				throw new Error(t("contextualLearning.errors.onlyOwnDecks", language));
			}

			cards = await ctx.db
				.query("cards")
				.withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
				.collect();
		} else {
			// Get cards from user's decks (optimized: limit to prevent performance issues)
			const userDecks = await ctx.db
				.query("decks")
				.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
				.take(10); // Limit to 10 most recent decks

			for (const deck of userDecks) {
				const deckCards = await ctx.db
					.query("cards")
					.withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
					.take(50); // Limit to 50 cards per deck
				cards.push(...deckCards);
			}

			// If we have too many cards, sample them
			if (cards.length > 200) {
				cards = cards.slice(0, 200); // Limit total cards for clustering
			}
		}

		if (cards.length === 0) {
			return [];
		}

		// Simple clustering based on text similarity
		const clusters = performSimpleClustering(cards, language);

		// Get user's review data for mastery calculation
		const reviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) => q.eq("userId", identity.subject))
			.collect();

		const reviewsByCard = new Map();
		for (const review of reviews) {
			if (!reviewsByCard.has(review.cardId)) {
				reviewsByCard.set(review.cardId, []);
			}
			reviewsByCard.get(review.cardId).push(review);
		}

		// Calculate mastery levels for clusters
		return clusters
			.map((cluster) => {
				const cardMasteries = cluster.cardIds.map((cardId) => {
					const cardReviews = reviewsByCard.get(cardId) || [];
					if (cardReviews.length === 0) return 0;

					const successRate =
						cardReviews.filter((r: Doc<"cardReviews">) => r.wasSuccessful)
							.length / cardReviews.length;
					const repetitions = Math.max(
						...cardReviews.map((r: Doc<"cardReviews">) => r.repetitionAfter),
					);
					return Math.min(
						1,
						successRate * 0.7 + (Math.min(repetitions, 5) / 5) * 0.3,
					);
				});

				const averageMastery =
					cardMasteries.reduce((sum, m) => sum + m, 0) / cardMasteries.length;
				const centerCard = cards.find((c) => c._id === cluster.centerCard);
				if (!centerCard) {
					console.error(
						t("contextualLearning.errors.centerCardNotFound", language, {
							cardId: cluster.centerCard,
						}),
					);
					return null; // Return null for invalid clusters
				}

				return {
					averageDifficulty: cluster.difficulty,
					cardCount: cluster.cardIds.length,
					centerCard: {
						_id: centerCard._id,
						back: centerCard.back,
						front: centerCard.front,
					},
					description: cluster.description,
					id: cluster.id,
					masteryLevel: averageMastery,
					name: cluster.name,
					relatedClusters: [], // Simplified for now
				};
			})
			.filter(
				(cluster): cluster is NonNullable<typeof cluster> => cluster !== null,
			);
	},
	returns: v.array(
		v.object({
			averageDifficulty: v.number(),
			cardCount: v.number(),
			centerCard: v.object({
				_id: v.id("cards"),
				back: v.string(),
				front: v.string(),
			}),
			description: v.string(),
			id: v.string(),
			masteryLevel: v.number(),
			name: v.string(),
			relatedClusters: v.array(v.string()),
		}),
	),
});

/**
 * Get knowledge graph data for visualization
 */
export const getKnowledgeGraphData = query({
	args: {
		deckId: v.optional(v.id("decks")),
		includeDecks: v.optional(v.boolean()),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("contextualLearning.errors.userNotAuthenticated", language),
			);
		}

		const language = normalizeLanguage(args.language);

		const nodes: KnowledgeGraphNode[] = [];
		const edges: KnowledgeGraphEdge[] = [];

		// Get user's decks and cards
		let targetDecks = [];
		if (args.deckId) {
			const deck = await ctx.db.get(args.deckId);
			if (!deck || deck.userId !== identity.subject) {
				throw new Error(
					t("contextualLearning.errors.onlyOwnGraphData", language),
				);
			}
			targetDecks = [deck];
		} else {
			targetDecks = await ctx.db
				.query("decks")
				.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
				.collect();
		}

		// Add deck nodes if requested
		if (args.includeDecks) {
			for (const deck of targetDecks) {
				nodes.push({
					color: "#3B82F6",
					id: `deck_${deck._id}`,
					label: deck.name,
					metadata: { deckId: deck._id },
					size: 20,
					type: "deck",
				});
			}
		}

		// Get all cards and create nodes
		const allCards = [];
		for (const deck of targetDecks) {
			const deckCards = await ctx.db
				.query("cards")
				.withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
				.collect();

			for (const card of deckCards) {
				allCards.push(card);

				// Create card node
				nodes.push({
					color: "#10B981",
					id: `card_${card._id}`,
					label:
						card.front.substring(0, 30) + (card.front.length > 30 ? "..." : ""),
					metadata: {
						deckId: card.deckId,
						difficulty: 0.5, // Will be calculated
						lastReviewed: 0,
						masteryLevel: 0.5,
					},
					size: 10, // Will be updated based on mastery
					type: "card",
				});

				// Add deck-card edge if including decks
				if (args.includeDecks) {
					edges.push({
						source: `deck_${deck._id}`,
						target: `card_${card._id}`,
						type: "contains",
						weight: 1,
					});
				}
			}
		}

		// Calculate relationships between cards (optimized for performance)
		// Limit the number of comparisons to prevent O(n²) performance issues
		const maxCards = 100; // Limit total cards for relationship calculation
		const cardsForRelationships = allCards.slice(0, maxCards);

		for (let i = 0; i < cardsForRelationships.length; i++) {
			// Only compare with next 20 cards to limit comparisons
			const maxComparisons = Math.min(i + 20, cardsForRelationships.length);
			for (let j = i + 1; j < maxComparisons; j++) {
				const relationship = calculateCardRelationship(
					cardsForRelationships[i],
					cardsForRelationships[j],
					normalizeLanguage(language) as "en" | "de",
				);
				if (relationship.strength > 0.4) {
					// Higher threshold for graph
					edges.push({
						label: relationship.type,
						source: `card_${cardsForRelationships[i]._id}`,
						target: `card_${cardsForRelationships[j]._id}`,
						type: relationship.type,
						weight: relationship.strength,
					});
				}
			}
		}

		return {
			edges: edges.map((edge) => ({
				label: edge.label,
				source: edge.source,
				target: edge.target,
				type: edge.type,
				weight: edge.weight,
			})),
			nodes: nodes.map((node) => ({
				color: node.color,
				difficulty: node.metadata.difficulty,
				id: node.id,
				label: node.label,
				masteryLevel: node.metadata.masteryLevel,
				size: node.size,
				type: node.type,
			})),
		};
	},
	returns: v.object({
		edges: v.array(
			v.object({
				label: v.optional(v.string()),
				source: v.string(),
				target: v.string(),
				type: v.string(),
				weight: v.number(),
			}),
		),
		nodes: v.array(
			v.object({
				color: v.string(),
				difficulty: v.optional(v.number()),
				id: v.string(),
				label: v.string(),
				masteryLevel: v.optional(v.number()),
				size: v.number(),
				type: v.string(),
			}),
		),
	}),
});

/**
 * Get learning path recommendations
 */
export const getLearningPathRecommendations = query({
	args: {
		deckId: v.optional(v.id("decks")),
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("contextualLearning.errors.userNotAuthenticated", language),
			);
		}

		const language = normalizeLanguage(args.language);

		// If no deckId provided, return empty array
		if (!args.deckId) {
			return [];
		}

		// At this point, we know args.deckId is defined
		const deckId = args.deckId;

		// Verify deck ownership
		const deck = await ctx.db.get(deckId);
		if (!deck || deck.userId !== identity.subject) {
			throw new Error(
				t("contextualLearning.errors.onlyOwnLearningPaths", language),
			);
		}

		// Get deck cards
		const cards = await ctx.db
			.query("cards")
			.withIndex("by_deckId", (q) => q.eq("deckId", deckId))
			.collect();

		if (cards.length === 0) {
			return [];
		}

		// Get user's review history for this deck
		const reviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) => q.eq("userId", identity.subject))
			.collect();

		const deckReviews = reviews.filter((r) => {
			const card = cards.find((c) => c._id === r.cardId);
			return card !== undefined;
		});

		// Get user's learning patterns for personalization
		const learningPatterns = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Create personalization configuration
		const personalizationConfig: PathPersonalizationConfig =
			learningPatterns?.personalizationConfig
				? {
						difficultyAdaptation: learningPatterns.personalizationConfig
							.adaptDifficultyProgression
							? 0.2
							: 0,
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
					}
				: {
						difficultyAdaptation: 0.2,
						inconsistencyBoost: 1.5,
						learningPatternWeight: 0.3,
						plateauBoost: 1.3,
						srsWeight: 0.7,
						timeOfDayBoost: 1.2,
					};

		// Generate different types of learning paths using enhanced semantic analysis and personalization
		const paths = [];

		// 1. Enhanced difficulty-based path (easy to hard with content analysis)
		const difficultyPath = generateDifficultyBasedPath(
			cards,
			deckReviews,
			language,
			learningPatterns || undefined,
			personalizationConfig,
		);
		if (difficultyPath.length > 0) {
			paths.push({
				confidence: 0.85, // Increased confidence due to enhanced analysis
				description: t(
					"contextualLearning.descriptions.difficultyProgression",
					language,
				),
				estimatedTime: difficultyPath.length * 2,
				path: difficultyPath, // 2 minutes per card
				pathType: t(
					"contextualLearning.pathTypes.difficultyProgression",
					language,
				),
			});
		}

		// 2. Enhanced prerequisite-based path with semantic dependencies
		const prerequisitePath = generatePrerequisitePath(
			cards,
			deckReviews,
			language,
			learningPatterns || undefined,
			personalizationConfig,
		);
		if (prerequisitePath.length > 0) {
			paths.push({
				confidence: 0.8, // Increased confidence due to semantic analysis
				description: t(
					"contextualLearning.descriptions.prerequisiteOrder",
					language,
				),
				estimatedTime: prerequisitePath.length * 2.5,
				path: prerequisitePath,
				pathType: t("contextualLearning.pathTypes.prerequisiteOrder", language),
			});
		}

		// 3. Enhanced review-focused path with learning pattern analysis
		const reviewPath = generateReviewFocusedPath(
			cards,
			deckReviews,
			language,
			learningPatterns || undefined,
			personalizationConfig,
		);
		if (reviewPath.length > 0) {
			paths.push({
				confidence: 0.9, // High confidence for review-based recommendations
				description: t(
					"contextualLearning.descriptions.reviewFocused",
					language,
				),
				estimatedTime: reviewPath.length * 3,
				path: reviewPath,
				pathType: t("contextualLearning.pathTypes.reviewFocused", language),
			});
		}

		// 4. Domain-focused path for specialized learning
		const domainPath = generateDomainFocusedPath(
			cards,
			deckReviews,
			language,
			learningPatterns || undefined,
			personalizationConfig,
		);
		if (domainPath.length > 0) {
			paths.push({
				confidence: 0.75,
				description: t(
					"contextualLearning.descriptions.domainFocused",
					language,
				),
				estimatedTime: domainPath.length * 2.5,
				path: domainPath,
				pathType: t("contextualLearning.pathTypes.domainFocused", language),
			});
		}

		return paths.slice(0, 4); // Return top 4 paths (increased from 3)
	},
	returns: v.array(
		v.object({
			confidence: v.number(),
			description: v.string(),
			estimatedTime: v.number(),
			path: v.array(
				v.object({
					cardId: v.id("cards"),
					estimatedDifficulty: v.number(),
					front: v.string(),
					reason: v.string(),
				}),
			), // minutes
			pathType: v.string(),
		}),
	),
});

// Helper functions

/**
 * Enhanced card relationship calculation using advanced text analysis
 */
function calculateCardRelationship(
	card1: Doc<"cards">,
	card2: Doc<"cards">,
	language: "en" | "de" = "en",
): CardRelationship {
	// Combine front and back text for analysis
	const text1 = `${card1.front} ${card1.back}`;
	const text2 = `${card2.front} ${card2.back}`;

	// Early termination for very short texts or identical cards
	if (text1.length < 3 || text2.length < 3 || text1 === text2) {
		return {
			reason: RELATIONSHIP_REASONS.INSUFFICIENT_CONTENT,
			strength: 0,
			type: RELATIONSHIP_TYPES.UNRELATED,
		};
	}

	// Process texts using advanced analysis
	const processed1 = processText(text1, language);
	const processed2 = processText(text2, language);

	// Early termination if no meaningful content after processing
	if (processed1.tokens.length === 0 || processed2.tokens.length === 0) {
		return {
			reason: RELATIONSHIP_REASONS.NO_MEANINGFUL_CONTENT,
			strength: 0,
			type: RELATIONSHIP_TYPES.UNRELATED,
		};
	}

	// Calculate advanced similarity
	const similarity = calculateAdvancedSimilarity(processed1, processed2);

	// Determine relationship type and reason based on enhanced analysis
	return determineRelationshipFromSimilarity(
		similarity,
		processed1,
		processed2,
	);
}

/**
 * Determine relationship type and reason from similarity analysis
 */
function determineRelationshipFromSimilarity(
	similarity: SimilarityResult,
	text1: ProcessedText,
	text2: ProcessedText,
): CardRelationship {
	const {
		score,
		sharedKeywords,
		sharedDomainTerms,
		contextualSimilarity,
		semanticSimilarity,
	} = similarity;

	// Very high similarity - likely similar or duplicate content
	if (score > 0.8) {
		return {
			reason: RELATIONSHIP_REASONS.VERY_SIMILAR_CONTENT,
			strength: score,
			type: RELATIONSHIP_TYPES.SIMILAR,
		};
	}

	// High semantic similarity with domain terminology
	if (semanticSimilarity > 0.7 && sharedDomainTerms.length > 0) {
		return {
			reason: RELATIONSHIP_REASONS.SHARED_DOMAIN_TERMINOLOGY,
			strength: score,
			type: RELATIONSHIP_TYPES.DOMAIN_RELATED,
		};
	}

	// Strong conceptual overlap
	if (contextualSimilarity > 0.6 && sharedKeywords.length >= 2) {
		return {
			reason: RELATIONSHIP_REASONS.CONCEPTUAL_OVERLAP,
			strength: score,
			type: RELATIONSHIP_TYPES.CONCEPTUALLY_RELATED,
		};
	}

	// Moderate similarity with keyword alignment
	if (score > 0.5 && sharedKeywords.length > 0) {
		return {
			reason: RELATIONSHIP_REASONS.KEYWORD_ALIGNMENT,
			strength: score,
			type: RELATIONSHIP_TYPES.RELATED,
		};
	}

	// Detect prerequisite relationships
	const prerequisiteRelation = detectPrerequisiteRelationship(text1, text2);
	if (prerequisiteRelation) {
		return prerequisiteRelation;
	}

	// Contextual relationship
	if (contextualSimilarity > 0.4) {
		return {
			reason: RELATIONSHIP_REASONS.CONTEXTUAL_RELATIONSHIP,
			strength: score,
			type: RELATIONSHIP_TYPES.RELATED,
		};
	}

	// Weak relationship
	if (score > 0.25) {
		return {
			reason: RELATIONSHIP_REASONS.FEW_COMMON_TERMS,
			strength: score,
			type: RELATIONSHIP_TYPES.WEAKLY_RELATED,
		};
	}

	// No meaningful relationship
	return {
		reason: RELATIONSHIP_REASONS.NO_COMMON_TERMS,
		strength: 0,
		type: RELATIONSHIP_TYPES.UNRELATED,
	};
}

/**
 * Detect prerequisite relationships between cards
 */
function detectPrerequisiteRelationship(
	text1: ProcessedText,
	text2: ProcessedText,
): CardRelationship | null {
	// Check for prerequisite indicators
	const prerequisiteIndicators = [
		"basic",
		"fundamental",
		"introduction",
		"overview",
		"definition",
		"concept",
		"principle",
		"foundation",
		"elementary",
		"simple",
		"first",
		"begin",
	];

	const advancedIndicators = [
		"advanced",
		"complex",
		"detailed",
		"application",
		"implementation",
		"analysis",
		"synthesis",
		"evaluation",
		"expert",
		"professional",
		"specialized",
		"in-depth",
	];

	const text1HasPrereq = prerequisiteIndicators.some(
		(indicator) =>
			text1.tokens.includes(indicator) ||
			text1.conceptualTerms.some((term) => term.includes(indicator)),
	);

	const text2HasAdvanced = advancedIndicators.some(
		(indicator) =>
			text2.tokens.includes(indicator) ||
			text2.conceptualTerms.some((term) => term.includes(indicator)),
	);

	const text2HasPrereq = prerequisiteIndicators.some(
		(indicator) =>
			text2.tokens.includes(indicator) ||
			text2.conceptualTerms.some((term) => term.includes(indicator)),
	);

	const text1HasAdvanced = advancedIndicators.some(
		(indicator) =>
			text1.tokens.includes(indicator) ||
			text1.conceptualTerms.some((term) => term.includes(indicator)),
	);

	// Check for shared domain terms to ensure they're related
	const hasSharedDomain = Object.keys(text1.domainTerms).some(
		(domain) =>
			text2.domainTerms[domain] && text2.domainTerms[domain].length > 0,
	);

	if (hasSharedDomain) {
		if (text1HasPrereq && text2HasAdvanced) {
			return {
				reason: RELATIONSHIP_REASONS.PREREQUISITE_DEPENDENCY,
				strength: 0.7,
				type: RELATIONSHIP_TYPES.PREREQUISITE,
			};
		}

		if (text2HasPrereq && text1HasAdvanced) {
			return {
				reason: RELATIONSHIP_REASONS.BUILDS_ON_CONCEPT,
				strength: 0.7,
				type: RELATIONSHIP_TYPES.BUILDS_UPON,
			};
		}
	}

	return null;
}

/**
 * Enhanced concept clustering using semantic analysis and domain grouping
 */
function performSimpleClustering(
	cards: Doc<"cards">[],
	language = "en",
): ConceptCluster[] {
	const normalizedLanguage = normalizeLanguage(language);
	const langCode = normalizedLanguage as "en" | "de";

	// Process all cards for semantic analysis
	const processedCards = cards.map((card) => ({
		card,
		processed: processText(`${card.front} ${card.back}`, langCode),
	}));

	// Limit clustering to prevent performance issues
	const maxCards = Math.min(processedCards.length, 100);
	const cardsToCluster = processedCards.slice(0, maxCards);

	// First, try domain-based clustering
	const domainClusters = performDomainBasedClustering(
		cardsToCluster,
		normalizedLanguage,
	);

	// Then, perform semantic clustering on remaining cards
	const usedCardIds = new Set(
		domainClusters.flatMap((cluster) => cluster.cardIds),
	);
	const remainingCards = cardsToCluster.filter(
		({ card }) => !usedCardIds.has(card._id),
	);
	const semanticClusters = performSemanticClustering(
		remainingCards,
		normalizedLanguage,
	);

	// Combine and optimize clusters
	const allClusters = [...domainClusters, ...semanticClusters];

	// Sort clusters by size and quality, return top clusters
	return allClusters
		.filter((cluster) => cluster.cardIds.length >= 2)
		.sort((a, b) => b.cardIds.length - a.cardIds.length)
		.slice(0, 15); // Limit to 15 high-quality clusters
}

/**
 * Cluster cards based on shared domain terminology
 */
function performDomainBasedClustering(
	processedCards: Array<{ card: Doc<"cards">; processed: ProcessedText }>,
	language: string,
): ConceptCluster[] {
	const normalizedLanguage = normalizeLanguage(language);
	const clusters: ConceptCluster[] = [];
	const domainGroups: {
		[domain: string]: Array<{ card: Doc<"cards">; processed: ProcessedText }>;
	} = {};

	// Group cards by dominant domain
	for (const { card, processed } of processedCards) {
		const dominantDomain = getDominantDomain(processed);
		if (dominantDomain) {
			if (!domainGroups[dominantDomain]) {
				domainGroups[dominantDomain] = [];
			}
			domainGroups[dominantDomain].push({ card, processed });
		}
	}

	// Create clusters from domain groups
	let clusterIndex = 0;
	for (const [domain, cards] of Object.entries(domainGroups)) {
		if (cards.length >= 2) {
			// Find the most representative card (highest domain term density)
			const centerCard = cards.reduce((best, current) => {
				const currentDensity =
					(current.processed.domainTerms[domain]?.length || 0) /
					current.processed.tokens.length;
				const bestDensity =
					(best.processed.domainTerms[domain]?.length || 0) /
					best.processed.tokens.length;
				return currentDensity > bestDensity ? current : best;
			});

			clusters.push({
				cardIds: cards.map(({ card }) => card._id),
				centerCard: centerCard.card._id,
				description: t(
					"contextualLearning.descriptions.relatedConcepts",
					normalizedLanguage,
				),
				difficulty: 0.5,
				id: `domain_cluster_${clusterIndex++}`,
				masteryLevel: 0,
				name: t(
					"contextualLearning.clustering.conceptGroup",
					normalizedLanguage,
					{ number: clusterIndex },
				),
			});
		}
	}

	return clusters;
}

/**
 * Cluster remaining cards using semantic similarity
 */
function performSemanticClustering(
	processedCards: Array<{ card: Doc<"cards">; processed: ProcessedText }>,
	language: string,
): ConceptCluster[] {
	const normalizedLanguage = normalizeLanguage(language);
	const clusters: ConceptCluster[] = [];
	const used = new Set<string>();

	for (let i = 0; i < processedCards.length; i++) {
		if (used.has(processedCards[i].card._id)) continue;

		const seedCard = processedCards[i];
		const cluster: ConceptCluster = {
			cardIds: [seedCard.card._id],
			centerCard: seedCard.card._id,
			description: t(
				"contextualLearning.descriptions.relatedConcepts",
				normalizedLanguage,
			),
			difficulty: 0.5,
			id: `semantic_cluster_${i}`,
			masteryLevel: 0,
			name: generateClusterName(seedCard.processed, normalizedLanguage),
		};

		used.add(seedCard.card._id);

		// Find semantically similar cards
		for (let j = i + 1; j < processedCards.length; j++) {
			if (used.has(processedCards[j].card._id)) continue;

			const similarity = calculateAdvancedSimilarity(
				seedCard.processed,
				processedCards[j].processed,
			);

			// Use more sophisticated clustering criteria
			if (
				shouldClusterTogether(
					similarity,
					seedCard.processed,
					processedCards[j].processed,
				)
			) {
				cluster.cardIds.push(processedCards[j].card._id);
				used.add(processedCards[j].card._id);

				// Update cluster name if we find a better representative
				if (similarity.semanticSimilarity > 0.7) {
					cluster.name = generateClusterName(
						processedCards[j].processed,
						normalizedLanguage,
					);
					cluster.centerCard = processedCards[j].card._id;
				}

				// Limit cluster size
				if (cluster.cardIds.length >= 8) break;
			}
		}

		if (cluster.cardIds.length >= 2) {
			clusters.push(cluster);
		}
	}

	return clusters;
}

/**
 * Get the dominant domain for a processed text
 */
function getDominantDomain(processed: ProcessedText): string | null {
	let maxTerms = 0;
	let dominantDomain: string | null = null;

	for (const [domain, terms] of Object.entries(processed.domainTerms)) {
		if (terms.length > maxTerms) {
			maxTerms = terms.length;
			dominantDomain = domain;
		}
	}

	// Only return domain if it has significant presence
	return maxTerms >= 2 ? dominantDomain : null;
}

/**
 * Determine if two cards should be clustered together
 */
function shouldClusterTogether(
	similarity: SimilarityResult,
	_text1: ProcessedText,
	_text2: ProcessedText,
): boolean {
	// High semantic similarity
	if (similarity.semanticSimilarity > 0.6) return true;

	// Strong keyword overlap with contextual similarity
	if (
		similarity.sharedKeywords.length >= 2 &&
		similarity.contextualSimilarity > 0.5
	)
		return true;

	// Shared domain terminology
	if (similarity.sharedDomainTerms.length >= 1 && similarity.score > 0.4)
		return true;

	// Strong overall similarity
	if (similarity.score > 0.5) return true;

	return false;
}

/**
 * Generate a meaningful cluster name based on content
 */
function generateClusterName(
	processed: ProcessedText,
	language: string,
): string {
	const normalizedLanguage = normalizeLanguage(language);

	// Try to use the most important keyword
	if (processed.keywords.length > 0) {
		return t("contextualLearning.clustering.conceptGroup", normalizedLanguage, {
			number: 1,
		});
	}

	// Try to use domain terminology
	for (const [, terms] of Object.entries(processed.domainTerms)) {
		if (terms.length > 0) {
			return t(
				"contextualLearning.clustering.conceptGroup",
				normalizedLanguage,
				{ number: 1 },
			);
		}
	}

	// Fallback to generic name
	return t("contextualLearning.clustering.conceptGroup", normalizedLanguage, {
		number: Math.floor(Math.random() * 100) + 1,
	});
}

/**
 * Enhanced difficulty-based path generation using semantic analysis and content complexity
 * Includes personalized learning patterns for adaptive card selection
 */
function generateDifficultyBasedPath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
	language: string,
	learningPatterns?: UserLearningPatterns,
	personalizationConfig?: PathPersonalizationConfig,
) {
	const normalizedLanguage = normalizeLanguage(language);
	const langCode = normalizedLanguage as "en" | "de";

	// Process all cards for semantic analysis
	const processedCards = cards.map((card) => ({
		card,
		processed: processText(`${card.front} ${card.back}`, langCode),
		reviews: reviews.filter((r) => r.cardId === card._id),
	}));

	// Calculate enhanced difficulty scores for each card
	const cardDifficulties = processedCards.map(
		({ card, processed, reviews: cardReviews }) => {
			// 1. Historical success rate (40% weight)
			const successRate =
				cardReviews.length > 0
					? cardReviews.filter((r) => r.wasSuccessful).length /
						cardReviews.length
					: 0.5;
			const historicalDifficulty = (1 - successRate) * 0.4;

			// 2. Content complexity analysis (35% weight)
			const contentComplexity = calculateContentComplexity(processed) * 0.35;

			// 3. Domain-specific difficulty (15% weight)
			const domainDifficulty = calculateDomainDifficulty(processed) * 0.15;

			// 4. Conceptual density (10% weight)
			const conceptualDensity = calculateConceptualDensity(processed) * 0.1;

			const totalDifficulty =
				historicalDifficulty +
				contentComplexity +
				domainDifficulty +
				conceptualDensity;

			// Determine reason based on primary difficulty factor
			let reason: string;
			if (historicalDifficulty > 0.3) {
				reason = t(
					"contextualLearning.reasons.estimatedDifficulty",
					normalizedLanguage,
					{ percentage: Math.round((1 - successRate) * 100) },
				);
			} else if (contentComplexity > 0.25) {
				reason = t(
					"contextualLearning.reasons.semanticSimilarity",
					normalizedLanguage,
				);
			} else if (domainDifficulty > 0.1) {
				reason = t(
					"contextualLearning.reasons.sharedDomainTerminology",
					normalizedLanguage,
				);
			} else {
				reason = t(
					"contextualLearning.reasons.conceptualOverlap",
					normalizedLanguage,
				);
			}

			// Apply personalized learning pattern adjustments
			let personalizedDifficulty = totalDifficulty;
			let personalizedReason = reason;

			if (learningPatterns && personalizationConfig) {
				const config = personalizationConfig;

				// Check if this card is in inconsistency patterns
				const isInconsistent =
					learningPatterns.inconsistencyPatterns.cardIds.includes(card._id);
				if (isInconsistent && config.inconsistencyBoost > 1) {
					personalizedDifficulty *= config.inconsistencyBoost;
					personalizedReason = t(
						"contextualLearning.reasons.inconsistentPerformance",
						normalizedLanguage,
					);
				}

				// Check if this card is in plateau topics
				const isInPlateauTopic =
					learningPatterns.plateauDetection.stagnantTopics.some((topic) =>
						topic.cardIds.includes(card._id),
					);
				if (isInPlateauTopic && config.plateauBoost > 1) {
					personalizedDifficulty *= config.plateauBoost;
					personalizedReason = t(
						"contextualLearning.reasons.plateauTopic",
						normalizedLanguage,
					);
				}

				// Apply difficulty pattern adjustments based on user's historical performance
				const cardEaseFactor = card.easeFactor || 2.5;
				const difficultyCategory =
					cardEaseFactor > 2.2
						? "easyCards"
						: cardEaseFactor < 1.8
							? "hardCards"
							: "mediumCards";

				const userDifficultyPattern =
					learningPatterns.difficultyPatterns[difficultyCategory];
				if (
					userDifficultyPattern.successRate < 0.6 &&
					config.difficultyAdaptation > 0
				) {
					// User struggles with this difficulty level - increase priority
					personalizedDifficulty *= 1 + config.difficultyAdaptation;
				}

				// Weight between traditional SRS and learning patterns
				personalizedDifficulty =
					totalDifficulty * config.srsWeight +
					personalizedDifficulty * config.learningPatternWeight;
			}

			return {
				cardId: card._id,
				contentComplexity,
				domainDifficulty,
				estimatedDifficulty: Math.min(1, personalizedDifficulty),
				front: card.front,
				reason: personalizedReason,
			};
		},
	);

	return cardDifficulties
		.sort((a, b) => a.estimatedDifficulty - b.estimatedDifficulty)
		.slice(0, 10);
}

/**
 * Calculate content complexity based on semantic analysis
 */
function calculateContentComplexity(processed: ProcessedText): number {
	let complexity = 0;

	// 1. Advanced vocabulary indicators
	const advancedKeywords = [
		"complex",
		"sophisticated",
		"intricate",
		"comprehensive",
		"elaborate",
		"advanced",
		"detailed",
		"in-depth",
		"specialized",
		"technical",
	];
	const advancedCount = advancedKeywords.filter(
		(keyword) =>
			processed.tokens.includes(keyword) ||
			processed.conceptualTerms.some((term) => term.includes(keyword)),
	).length;
	complexity += Math.min(0.4, advancedCount * 0.1);

	// 2. Domain terminology density
	const totalDomainTerms = Object.values(processed.domainTerms).flat().length;
	const domainDensity = totalDomainTerms / Math.max(processed.tokens.length, 1);
	complexity += Math.min(0.3, domainDensity * 3);

	// 3. Conceptual term density
	const conceptualDensity =
		processed.conceptualTerms.length / Math.max(processed.tokens.length, 1);
	complexity += Math.min(0.2, conceptualDensity * 5);

	// 4. Text length and structure complexity
	const lengthComplexity = Math.min(0.1, processed.originalText.length / 1000);
	complexity += lengthComplexity;

	return Math.min(1, complexity);
}

/**
 * Calculate domain-specific difficulty
 */
function calculateDomainDifficulty(processed: ProcessedText): number {
	const domainDifficultyWeights = {
		history: 0.3, // History is often more memorization-based
		language: 0.4, // Language learning varies
		math: 0.8, // Mathematics is generally considered difficult
		science: 0.7, // Science concepts can be complex
		tech: 0.6, // Technical terms vary in difficulty
	};

	let maxDifficulty = 0;
	for (const [domain, terms] of Object.entries(processed.domainTerms)) {
		if (terms.length > 0) {
			const weight =
				domainDifficultyWeights[
					domain as keyof typeof domainDifficultyWeights
				] || 0.5;
			const termDensity = terms.length / Math.max(processed.tokens.length, 1);
			const domainScore = weight * Math.min(1, termDensity * 10);
			maxDifficulty = Math.max(maxDifficulty, domainScore);
		}
	}

	return maxDifficulty;
}

/**
 * Calculate conceptual density for difficulty assessment
 */
function calculateConceptualDensity(processed: ProcessedText): number {
	if (processed.tokens.length === 0) return 0;

	const conceptualDensity =
		processed.conceptualTerms.length / processed.tokens.length;
	const keywordDensity = processed.keywords.length / processed.tokens.length;

	return Math.min(1, (conceptualDensity * 0.6 + keywordDensity * 0.4) * 5);
}

/**
 * Enhanced prerequisite path generation using semantic analysis
 * Now includes personalized learning patterns for adaptive card selection
 */
function generatePrerequisitePath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
	language: string,
	learningPatterns?: UserLearningPatterns,
	personalizationConfig?: PathPersonalizationConfig,
) {
	const normalizedLanguage = normalizeLanguage(language);
	const langCode = normalizedLanguage as "en" | "de";

	// Process all cards for semantic analysis
	const processedCards = cards.map((card) => ({
		card,
		processed: processText(`${card.front} ${card.back}`, langCode),
		reviews: reviews.filter((r) => r.cardId === card._id),
	}));

	// Calculate prerequisite scores for each card
	const cardScores = processedCards.map(
		({ card, processed, reviews: cardReviews }) => {
			let prerequisiteScore = 0;
			let reason = t(
				"contextualLearning.reasons.foundationalConcept",
				normalizedLanguage,
			);

			// 1. Analyze content for foundational indicators
			const foundationalScore = calculateFoundationalScore(processed);
			prerequisiteScore += foundationalScore * 0.4;

			// 2. Analyze domain complexity
			const complexityScore = calculateComplexityScore(processed);
			prerequisiteScore += (1 - complexityScore) * 0.3; // Lower complexity = higher prerequisite score

			// 3. Consider review performance (if available)
			if (cardReviews.length > 0) {
				const successRate =
					cardReviews.filter((r) => r.wasSuccessful).length /
					cardReviews.length;
				prerequisiteScore += successRate * 0.2; // Cards with higher success rates might be more foundational
			}

			// 4. Text length heuristic (refined)
			const lengthScore = Math.min(
				1,
				Math.max(0, (200 - processed.originalText.length) / 200),
			);
			prerequisiteScore += lengthScore * 0.1;

			// Determine reason based on analysis
			if (foundationalScore > 0.7) {
				reason = t(
					"contextualLearning.reasons.prerequisiteDependency",
					normalizedLanguage,
				);
			} else if (complexityScore < 0.3) {
				reason = t(
					"contextualLearning.reasons.foundationalConcept",
					normalizedLanguage,
				);
			} else if (
				processed.domainTerms &&
				Object.keys(processed.domainTerms).length > 0
			) {
				reason = t(
					"contextualLearning.reasons.conceptualOverlap",
					normalizedLanguage,
				);
			}

			return {
				cardId: card._id,
				estimatedDifficulty: 1 - prerequisiteScore, // Convert to difficulty (lower prerequisite = higher difficulty)
				front: card.front,
				prerequisiteScore,
				reason,
			};
		},
	);

	// Apply personalized learning pattern adjustments
	const personalizedCardScores = cardScores.map((cardScore) => {
		if (!learningPatterns || !personalizationConfig) {
			return cardScore;
		}

		let personalizedScore = cardScore.prerequisiteScore;
		let personalizedReason = cardScore.reason;

		// Boost cards that are in inconsistency patterns
		const isInconsistent =
			learningPatterns.inconsistencyPatterns.cardIds.includes(cardScore.cardId);
		if (isInconsistent && personalizationConfig.inconsistencyBoost > 1) {
			personalizedScore *= personalizationConfig.inconsistencyBoost;
			personalizedReason = t(
				"contextualLearning.reasons.inconsistentPerformance",
				normalizedLanguage,
			);
		}

		// Boost cards in plateau topics
		const isInPlateauTopic =
			learningPatterns.plateauDetection.stagnantTopics.some((topic) =>
				topic.cardIds.includes(cardScore.cardId),
			);
		if (isInPlateauTopic && personalizationConfig.plateauBoost > 1) {
			personalizedScore *= personalizationConfig.plateauBoost;
			personalizedReason = t(
				"contextualLearning.reasons.plateauTopic",
				normalizedLanguage,
			);
		}

		// Weight between traditional prerequisite scoring and learning patterns
		const finalScore =
			cardScore.prerequisiteScore * personalizationConfig.srsWeight +
			personalizedScore * personalizationConfig.learningPatternWeight;

		return {
			...cardScore,
			prerequisiteScore: finalScore,
			reason: personalizedReason,
		};
	});

	// Sort by prerequisite score (highest first) and return top cards
	return personalizedCardScores
		.sort((a, b) => b.prerequisiteScore - a.prerequisiteScore)
		.slice(0, 10);
}

/**
 * Calculate how foundational/basic a card's content is
 */
function calculateFoundationalScore(processed: ProcessedText): number {
	let score = 0;

	// Check for foundational keywords
	const foundationalKeywords = [
		"basic",
		"fundamental",
		"introduction",
		"overview",
		"definition",
		"concept",
		"principle",
		"foundation",
		"elementary",
		"simple",
		"first",
		"begin",
		"what",
		"define",
		"meaning",
		"is",
		"are",
		"basics",
		"start",
	];

	const foundationalCount = foundationalKeywords.filter(
		(keyword) =>
			processed.tokens.includes(keyword) ||
			processed.conceptualTerms.some((term) => term.includes(keyword)),
	).length;

	score += Math.min(1, foundationalCount / 3) * 0.6;

	// Check for question words (often indicate definitions)
	const questionWords = ["what", "who", "where", "when", "why", "how", "which"];
	const questionCount = questionWords.filter((word) =>
		processed.tokens.includes(word),
	).length;
	score += Math.min(1, questionCount / 2) * 0.4;

	return Math.min(1, score);
}

/**
 * Calculate complexity score based on content analysis
 */
function calculateComplexityScore(processed: ProcessedText): number {
	let score = 0;

	// Check for advanced/complex keywords
	const complexKeywords = [
		"advanced",
		"complex",
		"detailed",
		"application",
		"implementation",
		"analysis",
		"synthesis",
		"evaluation",
		"expert",
		"professional",
		"specialized",
		"in-depth",
		"sophisticated",
		"intricate",
		"comprehensive",
		"elaborate",
	];

	const complexCount = complexKeywords.filter(
		(keyword) =>
			processed.tokens.includes(keyword) ||
			processed.conceptualTerms.some((term) => term.includes(keyword)),
	).length;

	score += Math.min(1, complexCount / 2) * 0.4;

	// Domain terminology density
	const totalDomainTerms = Object.values(processed.domainTerms).flat().length;
	const domainDensity = totalDomainTerms / Math.max(processed.tokens.length, 1);
	score += Math.min(1, domainDensity * 5) * 0.3;

	// Conceptual terms density
	const conceptualDensity =
		processed.conceptualTerms.length / Math.max(processed.tokens.length, 1);
	score += Math.min(1, conceptualDensity * 10) * 0.3;

	return Math.min(1, score);
}

/**
 * Enhanced review-focused path generation using semantic analysis and learning patterns
 * Now includes personalized learning patterns for adaptive card selection
 */
function generateReviewFocusedPath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
	language: string,
	learningPatterns?: UserLearningPatterns,
	personalizationConfig?: PathPersonalizationConfig,
) {
	const normalizedLanguage = normalizeLanguage(language);
	const langCode = normalizedLanguage as "en" | "de";

	// Process all cards for semantic analysis
	const processedCards = cards.map((card) => ({
		card,
		processed: processText(`${card.front} ${card.back}`, langCode),
		reviews: reviews.filter((r) => r.cardId === card._id),
	}));

	// Calculate enhanced review priority scores
	const strugglingCards = processedCards
		.map(({ card, processed, reviews: cardReviews }) => {
			if (cardReviews.length === 0) return null; // Skip cards with no review history

			// 1. Historical performance analysis (50% weight)
			const successRate =
				cardReviews.filter((r) => r.wasSuccessful).length / cardReviews.length;
			const performanceScore = (1 - successRate) * 0.5;

			// 2. Learning pattern analysis (25% weight)
			const learningPatternScore =
				calculateLearningPatternDifficulty(cardReviews) * 0.25;

			// 3. Content retention difficulty (15% weight)
			const retentionDifficulty =
				calculateRetentionDifficulty(processed, cardReviews) * 0.15;

			// 4. Semantic complexity for review (10% weight)
			const semanticComplexity = calculateReviewComplexity(processed) * 0.1;

			const totalPriority =
				performanceScore +
				learningPatternScore +
				retentionDifficulty +
				semanticComplexity;

			// Determine reason based on primary struggle factor
			let reason: string;
			if (performanceScore > 0.3) {
				reason = t(
					"contextualLearning.reasons.successRate",
					normalizedLanguage,
					{ percentage: Math.round(successRate * 100) },
				);
			} else if (learningPatternScore > 0.15) {
				reason = t(
					"contextualLearning.reasons.contextualRelationship",
					normalizedLanguage,
				);
			} else if (retentionDifficulty > 0.1) {
				reason = t(
					"contextualLearning.reasons.semanticSimilarity",
					normalizedLanguage,
				);
			} else {
				reason = t(
					"contextualLearning.reasons.conceptualOverlap",
					normalizedLanguage,
				);
			}

			return {
				cardId: card._id,
				estimatedDifficulty: Math.min(1, totalPriority),
				front: card.front,
				learningPatternScore,
				reason,
				retentionDifficulty,
				reviewCount: cardReviews.length,
				successRate,
			};
		})
		.filter(
			(card): card is NonNullable<typeof card> =>
				card !== null && card.reviewCount > 0 && card.estimatedDifficulty > 0.3,
		)
		.sort((a, b) => b.estimatedDifficulty - a.estimatedDifficulty);

	// Apply personalized learning pattern adjustments
	const personalizedCards = strugglingCards.map((card) => {
		if (!learningPatterns || !personalizationConfig) {
			return card;
		}

		let personalizedDifficulty = card.estimatedDifficulty;
		let personalizedReason = card.reason;

		// Prioritize cards with inconsistent performance patterns
		const isInconsistent =
			learningPatterns.inconsistencyPatterns.cardIds.includes(card.cardId);
		if (isInconsistent) {
			personalizedDifficulty *= personalizationConfig.inconsistencyBoost;
			personalizedReason = t(
				"contextualLearning.reasons.inconsistentPerformance",
				normalizedLanguage,
			);
		}

		// Prioritize cards in plateau topics for focused review
		const isInPlateauTopic =
			learningPatterns.plateauDetection.stagnantTopics.some((topic) =>
				topic.cardIds.includes(card.cardId),
			);
		if (isInPlateauTopic) {
			personalizedDifficulty *= personalizationConfig.plateauBoost;
			personalizedReason = t(
				"contextualLearning.reasons.plateauTopic",
				normalizedLanguage,
			);
		}

		// Consider recent performance trends
		const recentTrend =
			learningPatterns.recentPerformanceTrends.trend.successRateChange;
		if (recentTrend < -10) {
			// Performance declining
			personalizedDifficulty *= 1.2; // Increase priority for review
		}

		// Weight between traditional review scoring and learning patterns
		const finalDifficulty =
			card.estimatedDifficulty * personalizationConfig.srsWeight +
			personalizedDifficulty * personalizationConfig.learningPatternWeight;

		return {
			...card,
			estimatedDifficulty: finalDifficulty,
			reason: personalizedReason,
		};
	});

	return personalizedCards
		.sort((a, b) => b.estimatedDifficulty - a.estimatedDifficulty)
		.slice(0, 8); // Increased from 6 to 8 for better coverage
}

/**
 * Analyze learning patterns to identify persistent difficulties
 */
function calculateLearningPatternDifficulty(
	cardReviews: Doc<"cardReviews">[],
): number {
	if (cardReviews.length < 3) return 0; // Need sufficient data

	// Sort reviews by creation time
	const sortedReviews = [...cardReviews].sort(
		(a, b) => a._creationTime - b._creationTime,
	);

	// Calculate recent performance trend
	const recentReviews = sortedReviews.slice(-5); // Last 5 reviews
	const recentSuccessRate =
		recentReviews.filter((r) => r.wasSuccessful).length / recentReviews.length;

	// Calculate consistency issues (frequent failures after successes)
	let inconsistencyScore = 0;
	for (let i = 1; i < sortedReviews.length; i++) {
		if (sortedReviews[i - 1].wasSuccessful && !sortedReviews[i].wasSuccessful) {
			inconsistencyScore += 0.2;
		}
	}

	// Calculate plateau detection (no improvement over time)
	const firstHalf = sortedReviews.slice(
		0,
		Math.floor(sortedReviews.length / 2),
	);
	const secondHalf = sortedReviews.slice(Math.floor(sortedReviews.length / 2));

	const firstHalfSuccess =
		firstHalf.filter((r) => r.wasSuccessful).length / firstHalf.length;
	const secondHalfSuccess =
		secondHalf.filter((r) => r.wasSuccessful).length / secondHalf.length;
	const improvementScore = Math.max(0, firstHalfSuccess - secondHalfSuccess); // Higher if getting worse

	return Math.min(
		1,
		(1 - recentSuccessRate) * 0.5 +
			inconsistencyScore * 0.3 +
			improvementScore * 0.2,
	);
}

/**
 * Calculate retention difficulty based on content and review patterns
 */
function calculateRetentionDifficulty(
	processed: ProcessedText,
	cardReviews: Doc<"cardReviews">[],
): number {
	let difficulty = 0;

	// 1. Abstract concept indicators (harder to retain)
	const abstractKeywords = [
		"concept",
		"theory",
		"principle",
		"abstract",
		"philosophy",
		"methodology",
		"framework",
		"paradigm",
		"hypothesis",
		"assumption",
		"inference",
	];
	const abstractCount = abstractKeywords.filter(
		(keyword) =>
			processed.tokens.includes(keyword) ||
			processed.conceptualTerms.some((term) => term.includes(keyword)),
	).length;
	difficulty += Math.min(0.4, abstractCount * 0.1);

	// 2. Memory-intensive content (lists, dates, names)
	const memoryKeywords = [
		"list",
		"date",
		"year",
		"name",
		"number",
		"formula",
		"equation",
	];
	const memoryCount = memoryKeywords.filter((keyword) =>
		processed.tokens.includes(keyword),
	).length;
	difficulty += Math.min(0.3, memoryCount * 0.1);

	// 3. Review frequency vs retention (frequent reviews but still failing)
	if (cardReviews.length > 5) {
		const recentFailures = cardReviews
			.slice(-5)
			.filter((r) => !r.wasSuccessful).length;
		difficulty += Math.min(0.3, (recentFailures / 5) * 0.3);
	}

	return Math.min(1, difficulty);
}

/**
 * Calculate semantic complexity specifically for review prioritization
 */
function calculateReviewComplexity(processed: ProcessedText): number {
	let complexity = 0;

	// 1. Multiple domain overlap (harder to categorize and remember)
	const domainCount = Object.keys(processed.domainTerms).length;
	complexity += Math.min(0.4, domainCount * 0.1);

	// 2. High conceptual density
	const conceptualDensity =
		processed.conceptualTerms.length / Math.max(processed.tokens.length, 1);
	complexity += Math.min(0.3, conceptualDensity * 3);

	// 3. Technical jargon density
	const totalDomainTerms = Object.values(processed.domainTerms).flat().length;
	const jargonDensity = totalDomainTerms / Math.max(processed.tokens.length, 1);
	complexity += Math.min(0.3, jargonDensity * 5);

	return Math.min(1, complexity);
}

/**
 * NEW: Generate domain-focused learning path that groups cards by subject area
 * Now includes personalized learning patterns for adaptive card selection
 */
function generateDomainFocusedPath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
	language: string,
	learningPatterns?: UserLearningPatterns,
	personalizationConfig?: PathPersonalizationConfig,
) {
	const normalizedLanguage = normalizeLanguage(language);
	const langCode = normalizedLanguage as "en" | "de";

	// Process all cards for domain analysis
	const processedCards = cards.map((card) => ({
		card,
		processed: processText(`${card.front} ${card.back}`, langCode),
		reviews: reviews.filter((r) => r.cardId === card._id),
	}));

	// Group cards by dominant domain
	const domainGroups: { [domain: string]: typeof processedCards } = {};

	for (const processedCard of processedCards) {
		const dominantDomain = getDominantDomain(processedCard.processed);
		if (dominantDomain) {
			if (!domainGroups[dominantDomain]) {
				domainGroups[dominantDomain] = [];
			}
			domainGroups[dominantDomain].push(processedCard);
		}
	}

	// Find the domain with the most cards (focus area)
	let largestDomain = "";
	let maxCards = 0;
	for (const [domain, domainCards] of Object.entries(domainGroups)) {
		if (domainCards.length > maxCards) {
			maxCards = domainCards.length;
			largestDomain = domain;
		}
	}

	if (!largestDomain || maxCards < 3) {
		return []; // Need at least 3 cards in a domain to create a focused path
	}

	// Create domain-focused path with intelligent ordering
	const domainCards = domainGroups[largestDomain];
	const pathCards = domainCards.map(
		({ card, processed, reviews: cardReviews }) => {
			// Calculate domain mastery score
			const domainTermCount = processed.domainTerms[largestDomain]?.length || 0;
			const domainDensity =
				domainTermCount / Math.max(processed.tokens.length, 1);

			// Calculate performance in this domain
			const successRate =
				cardReviews.length > 0
					? cardReviews.filter((r) => r.wasSuccessful).length /
						cardReviews.length
					: 0.5;

			// Calculate domain-specific difficulty
			const domainComplexity = calculateDomainSpecificComplexity(
				processed,
				largestDomain,
			);

			// Combine factors for ordering (easier domain concepts first)
			const domainScore =
				domainDensity * 0.4 + successRate * 0.3 + (1 - domainComplexity) * 0.3;

			return {
				cardId: card._id,
				domainComplexity,
				domainDensity,
				domainScore,
				estimatedDifficulty: 1 - domainScore,
				front: card.front,
				reason: t(
					"contextualLearning.reasons.sharedDomainTerminology",
					normalizedLanguage,
				),
			};
		},
	);

	// Apply personalized learning pattern adjustments
	const personalizedPathCards = pathCards.map((card) => {
		if (!learningPatterns || !personalizationConfig) {
			return card;
		}

		let personalizedScore = card.domainScore;
		let personalizedReason = card.reason;

		// Boost cards with inconsistent performance in this domain
		const isInconsistent =
			learningPatterns.inconsistencyPatterns.cardIds.includes(card.cardId);
		if (isInconsistent) {
			personalizedScore *= personalizationConfig.inconsistencyBoost;
			personalizedReason = t(
				"contextualLearning.reasons.inconsistentPerformance",
				normalizedLanguage,
			);
		}

		// Boost cards in plateau topics within this domain
		const isInPlateauTopic =
			learningPatterns.plateauDetection.stagnantTopics.some((topic) =>
				topic.cardIds.includes(card.cardId),
			);
		if (isInPlateauTopic) {
			personalizedScore *= personalizationConfig.plateauBoost;
			personalizedReason = t(
				"contextualLearning.reasons.plateauTopic",
				normalizedLanguage,
			);
		}

		// Consider user's domain-specific performance patterns
		const cardEaseFactor = card.estimatedDifficulty;
		const difficultyCategory =
			cardEaseFactor > 0.7
				? "hardCards"
				: cardEaseFactor < 0.3
					? "easyCards"
					: "mediumCards";

		const userDomainPattern =
			learningPatterns.difficultyPatterns[difficultyCategory];
		if (userDomainPattern.successRate < 0.6) {
			personalizedScore *= 1 + personalizationConfig.difficultyAdaptation;
		}

		// Weight between traditional domain scoring and learning patterns
		const finalScore =
			card.domainScore * personalizationConfig.srsWeight +
			personalizedScore * personalizationConfig.learningPatternWeight;

		return {
			...card,
			domainScore: finalScore,
			reason: personalizedReason,
		};
	});

	// Sort by domain score (easier concepts first within the domain)
	return personalizedPathCards
		.sort((a, b) => b.domainScore - a.domainScore)
		.slice(0, 8); // Limit to 8 cards for focused learning
}

/**
 * Calculate domain-specific complexity for focused learning
 */
function calculateDomainSpecificComplexity(
	processed: ProcessedText,
	domain: string,
): number {
	let complexity = 0;

	// 1. Domain term sophistication
	const domainTerms = processed.domainTerms[domain] || [];
	const advancedDomainTerms = domainTerms.filter((term) => term.length > 8); // Longer terms often more complex
	complexity += Math.min(
		0.4,
		(advancedDomainTerms.length / Math.max(domainTerms.length, 1)) * 0.4,
	);

	// 2. Conceptual term overlap with domain
	const domainConceptualTerms = processed.conceptualTerms.filter((term) =>
		domainTerms.some(
			(domainTerm) => term.includes(domainTerm) || domainTerm.includes(term),
		),
	);
	complexity += Math.min(
		0.3,
		(domainConceptualTerms.length /
			Math.max(processed.conceptualTerms.length, 1)) *
			0.3,
	);

	// 3. Multi-domain overlap (more complex if spans multiple domains)
	const otherDomainCount = Object.keys(processed.domainTerms).filter(
		(d) => d !== domain && processed.domainTerms[d].length > 0,
	).length;
	complexity += Math.min(0.3, otherDomainCount * 0.1);

	return Math.min(1, complexity);
}
