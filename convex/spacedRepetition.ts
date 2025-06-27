import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { CacheInvalidation } from "./utils/cache";

/**
 * SM-2 Algorithm Implementation for Spaced Repetition
 *
 * This file implements the SuperMemo-2 (SM-2) algorithm for optimal spaced repetition
 * scheduling. The algorithm calculates when a card should be reviewed next based on
 * the user's performance and the card's learning history.
 *
 * Quality Scale:
 * - 0 (Again): Complete blackout, incorrect response
 * - 3 (Hard): Correct response with serious difficulty
 * - 4 (Good): Correct response after some hesitation
 * - 5 (Easy): Perfect response, no hesitation
 */

/**
 * Default values for new cards in the spaced repetition system
 */
const DEFAULT_REPETITION = 0;
const DEFAULT_EASE_FACTOR = 2.5;
const DEFAULT_INTERVAL = 1;
const DAILY_NEW_CARD_LIMIT = 20;

/**
 * Calculate the next review parameters using the SM-2 algorithm
 *
 * @param quality - User response quality (0-5 scale)
 * @param repetition - Current number of successful repetitions
 * @param easeFactor - Current ease factor
 * @param interval - Current interval in days
 * @returns Updated repetition, easeFactor, interval, and dueDate
 */
function calculateSM2(
	quality: number,
	repetition: number,
	easeFactor: number,
	interval: number,
): {
	repetition: number;
	easeFactor: number;
	interval: number;
	dueDate: number;
} {
	let newRepetition: number;
	let newEaseFactor = easeFactor;
	let newInterval: number;

	// If quality < 3, reset the card (failed review)
	if (quality < 3) {
		newRepetition = 0;
		newInterval = 1;
		// Keep the current ease factor unchanged for failed reviews
	} else {
		// Successful review - increment repetition
		newRepetition = repetition + 1;

		// Calculate new interval based on repetition count
		if (newRepetition === 1) {
			newInterval = 1;
		} else if (newRepetition === 2) {
			newInterval = 6;
		} else {
			newInterval = Math.round(interval * easeFactor);
		}

		// Update ease factor based on quality (only for successful reviews)
		newEaseFactor =
			easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

		// Ensure ease factor doesn't go below 1.3
		if (newEaseFactor < 1.3) {
			newEaseFactor = 1.3;
		}
	}

	// Calculate due date (current time + interval in days)
	const now = Date.now();
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	const dueDate = now + newInterval * millisecondsPerDay;

	return {
		dueDate,
		easeFactor: newEaseFactor,
		interval: newInterval,
		repetition: newRepetition,
	};
}

/**
 * Review a card and update its spaced repetition parameters
 */
export const reviewCard = mutation({
	args: {
		cardId: v.id("cards"),
		quality: v.number(), // 0-5 scale
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to review cards");
		}

		// Validate quality score
		if (args.quality < 0 || args.quality > 5) {
			throw new Error("Quality must be between 0 and 5");
		}

		// Get the card
		const card = await ctx.db.get(args.cardId);

		if (!card) {
			throw new Error("Card not found");
		}

		// Validate that the card has a valid deckId before using it
		if (!card.deckId) {
			throw new Error("Card has invalid deck reference");
		}

		// Get the deck to verify ownership
		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(card.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only review cards from your own decks");
		}

		// Get current spaced repetition values or use defaults
		const currentRepetition = card.repetition ?? DEFAULT_REPETITION;
		const currentEaseFactor = card.easeFactor ?? DEFAULT_EASE_FACTOR;
		const currentInterval = card.interval ?? DEFAULT_INTERVAL;

		// Calculate new values using SM-2 algorithm
		const { repetition, easeFactor, interval, dueDate } = calculateSM2(
			args.quality,
			currentRepetition,
			currentEaseFactor,
			currentInterval,
		);

		// Record the review outcome for retention rate calculation
		await ctx.db.insert("cardReviews", {
			cardId: args.cardId,
			deckId: card.deckId,
			easeFactorAfter: easeFactor,
			easeFactorBefore: currentEaseFactor,
			intervalAfter: interval,
			intervalBefore: currentInterval, // SM-2 considers quality >= 3 as successful
			quality: args.quality,
			repetitionAfter: repetition,
			repetitionBefore: currentRepetition,
			reviewDate: Date.now(),
			studyMode: "spaced-repetition",
			userId: identity.subject,
			wasSuccessful: args.quality >= 3,
		});

		// Update the card with new spaced repetition parameters
		await ctx.db.patch(args.cardId, {
			dueDate,
			easeFactor,
			interval,
			repetition,
		});

		// Invalidate relevant caches after card review
		await CacheInvalidation.onCardReview(ctx, identity.subject);

		return null;
	},
	returns: v.null(),
});

/**
 * Get cards that are due for review in a specific deck
 */
export const getDueCardsForDeck = query({
	args: {
		deckId: v.id("decks"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access cards");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only access cards from your own decks");
		}

		const now = Date.now();

		// Get cards that are due for review (dueDate <= now)
		const dueCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_dueDate", (q) =>
				q.eq("deckId", args.deckId).lte("dueDate", now),
			)
			.collect();

		// Add image URLs to each card
		return await Promise.all(
			dueCards.map(async (card) => ({
				...card,
				backImageUrl: card.backImageId
					? await ctx.storage.getUrl(card.backImageId)
					: null,
				frontImageUrl: card.frontImageId
					? await ctx.storage.getUrl(card.frontImageId)
					: null,
			})),
		);
	},
	returns: v.array(
		v.object({
			_creationTime: v.number(),
			_id: v.id("cards"),
			back: v.string(),
			backImageId: v.optional(v.id("_storage")),
			backImageUrl: v.union(v.string(), v.null()),
			deckId: v.id("decks"),
			dueDate: v.optional(v.number()),
			easeFactor: v.optional(v.number()),
			front: v.string(),
			frontImageId: v.optional(v.id("_storage")),
			frontImageUrl: v.union(v.string(), v.null()),
			interval: v.optional(v.number()),
			repetition: v.optional(v.number()),
			userId: v.string(),
		}),
	),
});

/**
 * Gets a combined list of due and new cards for a study session.
 * Prioritizes due cards first, then fills the rest of the queue with new cards
 * up to the daily limit. This provides a unified study experience.
 */
export const getStudyQueue = query({
	args: {
		deckId: v.id("decks"),
		maxCards: v.optional(v.number()), // Optional override for daily limit
		shuffle: v.optional(v.boolean()), // Whether to shuffle the final queue
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access cards");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only access cards from your own decks");
		}

		const now = Date.now();
		const maxCards = args.maxCards ?? DAILY_NEW_CARD_LIMIT;

		// 1. Get all cards that are due for review (highest priority)
		const dueCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_dueDate", (q) =>
				q.eq("deckId", args.deckId).lte("dueDate", now),
			)
			.collect();

		let newCards: Doc<"cards">[] = [];

		// 2. If we have fewer due cards than the daily limit, fill with new cards
		if (dueCards.length < maxCards) {
			const remainingSlots = maxCards - dueCards.length;
			newCards = await ctx.db
				.query("cards")
				.withIndex("by_deckId_and_repetition", (q) =>
					q.eq("deckId", args.deckId).eq("repetition", 0),
				)
				.take(remainingSlots);
		}

		// 3. Combine the cards into a study queue
		const queue = [...dueCards, ...newCards];

		// 4. Optional: Shuffle the queue so users don't always see due cards first
		// This creates a more varied study experience
		if (args.shuffle !== false) {
			// Default to true unless explicitly set to false
			for (let i = queue.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[queue[i], queue[j]] = [queue[j], queue[i]];
			}
		}

		// 5. Add image URLs to each card
		return await Promise.all(
			queue.map(async (card) => ({
				...card,
				backImageUrl: card.backImageId
					? await ctx.storage.getUrl(card.backImageId)
					: null,
				frontImageUrl: card.frontImageId
					? await ctx.storage.getUrl(card.frontImageId)
					: null,
			})),
		);
	},
	returns: v.array(
		v.object({
			_creationTime: v.number(),
			_id: v.id("cards"),
			back: v.string(),
			backImageId: v.optional(v.id("_storage")),
			backImageUrl: v.union(v.string(), v.null()),
			deckId: v.id("decks"),
			dueDate: v.optional(v.number()),
			easeFactor: v.optional(v.number()),
			front: v.string(),
			frontImageId: v.optional(v.id("_storage")),
			frontImageUrl: v.union(v.string(), v.null()),
			interval: v.optional(v.number()),
			repetition: v.optional(v.number()),
			userId: v.string(),
		}),
	),
});

/**
 * Get new cards (never reviewed) for a specific deck with daily limit
 * @deprecated Use getStudyQueue instead for a unified study experience
 */
export const getNewCardsForDeck = query({
	args: {
		deckId: v.id("decks"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access cards");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only access cards from your own decks");
		}

		const limit = args.limit ?? DAILY_NEW_CARD_LIMIT;

		// Get cards that have never been reviewed (repetition = 0) using efficient database index
		// This query uses the compound index to find new cards directly in the database
		// Note: Cards should be initialized with repetition = 0 when created for this to work efficiently
		const newCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_repetition", (q) =>
				q.eq("deckId", args.deckId).eq("repetition", 0),
			)
			.take(limit);

		// Add image URLs to each card
		return await Promise.all(
			newCards.map(async (card) => ({
				...card,
				backImageUrl: card.backImageId
					? await ctx.storage.getUrl(card.backImageId)
					: null,
				frontImageUrl: card.frontImageId
					? await ctx.storage.getUrl(card.frontImageId)
					: null,
			})),
		);
	},
	returns: v.array(
		v.object({
			_creationTime: v.number(),
			_id: v.id("cards"),
			back: v.string(),
			backImageId: v.optional(v.id("_storage")),
			backImageUrl: v.union(v.string(), v.null()),
			deckId: v.id("decks"),
			dueDate: v.optional(v.number()),
			easeFactor: v.optional(v.number()),
			front: v.string(),
			frontImageId: v.optional(v.id("_storage")),
			frontImageUrl: v.union(v.string(), v.null()),
			interval: v.optional(v.number()),
			repetition: v.optional(v.number()),
			userId: v.string(),
		}),
	),
});

/**
 * Get study queue statistics for a deck (useful for UI progress indicators)
 */
export const getStudyQueueStats = query({
	args: {
		deckId: v.id("decks"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access cards");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only access cards from your own decks");
		}

		const now = Date.now();

		// Get counts efficiently using indexes
		const dueCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_dueDate", (q) =>
				q.eq("deckId", args.deckId).lte("dueDate", now),
			)
			.collect();

		const newCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_repetition", (q) =>
				q.eq("deckId", args.deckId).eq("repetition", 0),
			)
			.collect();

		const totalCards = await ctx.db
			.query("cards")
			.withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
			.collect();

		const dueCount = dueCards.length;
		const newCount = newCards.length;
		const availableNewCards = Math.min(
			newCount,
			Math.max(0, DAILY_NEW_CARD_LIMIT - dueCount),
		);
		const totalStudyCards = dueCount + availableNewCards;

		return {
			dueCount,
			newCount,
			totalCardsInDeck: totalCards.length,
			totalStudyCards,
		};
	},
	returns: v.object({
		dueCount: v.number(),
		newCount: v.number(),
		totalCardsInDeck: v.number(),
		totalStudyCards: v.number(),
	}),
});

/**
 * Get next review information for a deck including earliest due date and daily review stats
 *
 * Performance optimized to use O(1) indexed queries:
 * - Uses compound index by_deckId_and_dueDate for efficient database-level filtering
 * - Queries only the single earliest future due card instead of all reviewed cards
 * - Leverages deck.cardCount for total count instead of querying all cards
 */
export const getNextReviewInfo = query({
	args: {
		deckId: v.id("decks"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access cards");
		}

		// Verify deck ownership
		const deck = await ctx.db.get(args.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only access cards from your own decks");
		}

		const now = Date.now();

		// Use compound index to efficiently find the earliest future due card
		const nextCard = await ctx.db
			.query("cards")
			.withIndex("by_deckId_and_dueDate", (q) =>
				q.eq("deckId", args.deckId).gt("dueDate", now),
			)
			.order("asc") // Order by dueDate ascending to get the earliest
			.first(); // Take only the first (earliest) result

		const nextDueDate = nextCard?.dueDate;

		return {
			hasCardsToReview: Boolean(nextDueDate),
			nextDueDate,
			totalCardsInDeck: deck.cardCount || 0,
		};
	},
	returns: v.object({
		hasCardsToReview: v.boolean(), // Earliest due date for any card in the deck
		nextDueDate: v.optional(v.number()), // Whether there are any cards that will be due in the future
		totalCardsInDeck: v.number(), // Total number of cards in the deck
	}),
});

/**
 * Initialize spaced repetition fields for existing cards that don't have them
 */
export const initializeCardForSpacedRepetition = mutation({
	args: {
		cardId: v.id("cards"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to initialize cards");
		}

		// Get the card
		const card = await ctx.db.get(args.cardId);

		if (!card) {
			throw new Error("Card not found");
		}

		// Validate that the card has a valid deckId before using it
		if (!card.deckId) {
			throw new Error("Card has invalid deck reference");
		}

		// Get the deck to verify ownership
		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(card.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only initialize your own cards");
		}

		// Only initialize if fields are missing
		const updates: Partial<{
			repetition: number;
			easeFactor: number;
			interval: number;
			dueDate: number;
		}> = {};

		if (card.repetition === undefined) {
			updates.repetition = DEFAULT_REPETITION;
		}

		if (card.easeFactor === undefined) {
			updates.easeFactor = DEFAULT_EASE_FACTOR;
		}

		if (card.interval === undefined) {
			updates.interval = DEFAULT_INTERVAL;
		}

		if (card.dueDate === undefined) {
			// New cards are immediately available for study
			updates.dueDate = Date.now();
		}

		// Only update if there are changes to make
		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(args.cardId, updates);
		}

		return null;
	},
	returns: v.null(),
});
