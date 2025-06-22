import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { query } from "./_generated/server";

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

// interface CardRelationship {
//   cardId1: string;
//   cardId2: string;
//   relationshipType: 'similar' | 'prerequisite' | 'related' | 'opposite' | 'example';
//   strength: number; // 0-1 scale
//   reason: string;
// }

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
	type: "similar" | "prerequisite" | "related" | "contains";
	weight: number; // Strength of relationship
	label?: string;
}

/**
 * Find related cards based on content similarity and learning patterns
 */
export const getRelatedCards = query({
	args: {
		cardId: v.id("cards"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const limit = args.limit || 5;

		// Get the source card
		const sourceCard = await ctx.db.get(args.cardId);
		if (!sourceCard) {
			throw new Error("Card not found");
		}

		// Verify ownership
		const sourceDeck = await ctx.db.get(sourceCard.deckId);
		if (!sourceDeck || sourceDeck.userId !== identity.subject) {
			throw new Error("You can only get related cards for your own cards");
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
			const relationship = calculateCardRelationship(sourceCard, card);
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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Get cards to cluster
		let cards = [];
		if (args.deckId) {
			// Verify deck ownership
			const deck = await ctx.db.get(args.deckId);
			if (!deck || deck.userId !== identity.subject) {
				throw new Error("You can only get clusters for your own decks");
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
		const clusters = performSimpleClustering(cards);

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
						cardReviews.filter((r: Doc<"cardReviews">) => r.wasSuccessful).length /
						cardReviews.length;
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
						`Center card ${cluster.centerCard} not found in cards array`,
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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const nodes: KnowledgeGraphNode[] = [];
		const edges: KnowledgeGraphEdge[] = [];

		// Get user's decks and cards
		let targetDecks = [];
		if (args.deckId) {
			const deck = await ctx.db.get(args.deckId);
			if (!deck || deck.userId !== identity.subject) {
				throw new Error("You can only get graph data for your own decks");
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
				);
				if (relationship.strength > 0.4) {
					// Higher threshold for graph
					edges.push({
						label: relationship.type,
						source: `card_${cardsForRelationships[i]._id}`,
						target: `card_${cardsForRelationships[j]._id}`,
						type: relationship.type as
							| "similar"
							| "prerequisite"
							| "related"
							| "contains",
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
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// If no deckId provided, return empty array
		if (!args.deckId) {
			return [];
		}

		// At this point, we know args.deckId is defined
		const deckId = args.deckId;

		// Verify deck ownership
		const deck = await ctx.db.get(deckId);
		if (!deck || deck.userId !== identity.subject) {
			throw new Error("You can only get learning paths for your own decks");
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

		// Generate different types of learning paths
		const paths = [];

		// 1. Difficulty-based path (easy to hard)
		const difficultyPath = generateDifficultyBasedPath(cards, deckReviews);
		if (difficultyPath.length > 0) {
			paths.push({
				confidence: 0.8,
				description:
					"Start with easier concepts and gradually increase difficulty",
				estimatedTime: difficultyPath.length * 2,
				path: difficultyPath, // 2 minutes per card
				pathType: "difficulty_progression",
			});
		}

		// 2. Prerequisite-based path
		const prerequisitePath = generatePrerequisitePath(cards, deckReviews);
		if (prerequisitePath.length > 0) {
			paths.push({
				confidence: 0.7,
				description: "Learn foundational concepts before advanced ones",
				estimatedTime: prerequisitePath.length * 2.5,
				path: prerequisitePath,
				pathType: "prerequisite_order",
			});
		}

		// 3. Review-focused path (struggling cards first)
		const reviewPath = generateReviewFocusedPath(cards, deckReviews);
		if (reviewPath.length > 0) {
			paths.push({
				confidence: 0.9,
				description: "Focus on cards you find most challenging",
				estimatedTime: reviewPath.length * 3,
				path: reviewPath,
				pathType: "review_focused",
			});
		}

		return paths.slice(0, 3); // Return top 3 paths
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

function calculateCardRelationship(
	card1: Doc<"cards">,
	card2: Doc<"cards">,
): { type: string; strength: number; reason: string } {
	// Optimized text similarity calculation with early termination
	const text1 = `${card1.front} ${card1.back}`.toLowerCase();
	const text2 = `${card2.front} ${card2.back}`.toLowerCase();

	// Early termination for very short texts or identical cards
	if (text1.length < 3 || text2.length < 3 || text1 === text2) {
		return { reason: "Insufficient content", strength: 0, type: "unrelated" };
	}

	const words1 = new Set(text1.split(/\s+/).filter((word) => word.length > 2)); // Filter short words
	const words2 = new Set(text2.split(/\s+/).filter((word) => word.length > 2));

	// Early termination if no meaningful words
	if (words1.size === 0 || words2.size === 0) {
		return { reason: "No meaningful content", strength: 0, type: "unrelated" };
	}

	const intersection = new Set(Array.from(words1).filter((x) => words2.has(x)));

	// Early termination if no common words
	if (intersection.size === 0) {
		return { reason: "No common terms", strength: 0, type: "unrelated" };
	}

	const union = new Set([...Array.from(words1), ...Array.from(words2)]);
	const similarity = intersection.size / union.size;

	let type = "related";
	let reason = "Shares common terms";

	if (similarity > 0.6) {
		type = "similar";
		reason = "Very similar content";
	} else if (similarity > 0.3) {
		type = "related";
		reason = "Related concepts";
	} else {
		type = "weakly_related";
		reason = "Few common terms";
	}

	return { reason, strength: similarity, type };
}

function performSimpleClustering(cards: Doc<"cards">[]): ConceptCluster[] {
	// Optimized clustering based on text similarity with performance limits
	const clusters: ConceptCluster[] = [];
	const used = new Set();

	// Limit clustering to prevent performance issues
	const maxCards = Math.min(cards.length, 100);

	for (let i = 0; i < maxCards; i++) {
		if (used.has(cards[i]._id)) continue;

		const cluster: ConceptCluster = {
			cardIds: [cards[i]._id],
			centerCard: cards[i]._id,
			description: "Related concepts",
			difficulty: 0.5,
			id: `cluster_${i}`,
			masteryLevel: 0,
			name: `Concept Group ${i + 1}`,
		};

		used.add(cards[i]._id);

		// Find similar cards (limit comparisons for performance)
		const maxComparisons = Math.min(i + 30, maxCards);
		for (let j = i + 1; j < maxComparisons; j++) {
			if (used.has(cards[j]._id)) continue;

			const relationship = calculateCardRelationship(cards[i], cards[j]);
			if (relationship.strength > 0.4) {
				cluster.cardIds.push(cards[j]._id);
				used.add(cards[j]._id);

				// Limit cluster size to prevent overly large clusters
				if (cluster.cardIds.length >= 10) break;
			}
		}

		if (cluster.cardIds.length >= 2) {
			clusters.push(cluster);
		}

		// Limit total number of clusters
		if (clusters.length >= 20) break;
	}

	return clusters;
}

function generateDifficultyBasedPath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
) {
	// Sort cards by estimated difficulty (based on review success rates)
	const cardDifficulties = cards.map((card) => {
		const cardReviews = reviews.filter((r) => r.cardId === card._id);
		const successRate =
			cardReviews.length > 0
				? cardReviews.filter((r) => r.wasSuccessful).length / cardReviews.length
				: 0.5;

		return {
			cardId: card._id,
			estimatedDifficulty: 1 - successRate,
			front: card.front,
			reason: `Estimated difficulty: ${Math.round((1 - successRate) * 100)}%`,
		};
	});

	return cardDifficulties
		.sort((a, b) => a.estimatedDifficulty - b.estimatedDifficulty)
		.slice(0, 10);
}

function generatePrerequisitePath(
	cards: Doc<"cards">[],
	_reviews: Doc<"cardReviews">[],
) {
	// Simple heuristic: shorter cards are often more basic
	return cards
		.map((card) => ({
			cardId: card._id,
			estimatedDifficulty: card.front.length / 100,
			front: card.front,
			reason: "Foundational concept", // Simple heuristic
		}))
		.sort((a, b) => a.estimatedDifficulty - b.estimatedDifficulty)
		.slice(0, 8);
}

function generateReviewFocusedPath(
	cards: Doc<"cards">[],
	reviews: Doc<"cardReviews">[],
) {
	// Focus on cards with low success rates
	const strugglingCards = cards
		.map((card) => {
			const cardReviews = reviews.filter((r) => r.cardId === card._id);
			const successRate =
				cardReviews.length > 0
					? cardReviews.filter((r) => r.wasSuccessful).length /
						cardReviews.length
					: 0.5;

			return {
				cardId: card._id,
				estimatedDifficulty: 1 - successRate,
				front: card.front,
				reason: `Success rate: ${Math.round(successRate * 100)}%`,
				reviewCount: cardReviews.length,
			};
		})
		.filter((card) => card.reviewCount > 0 && card.estimatedDifficulty > 0.3)
		.sort((a, b) => b.estimatedDifficulty - a.estimatedDifficulty);

	return strugglingCards.slice(0, 6);
}
