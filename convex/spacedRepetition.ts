import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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
  interval: number
): {
  repetition: number;
  easeFactor: number;
  interval: number;
  dueDate: number;
} {
  let newRepetition = repetition;
  let newEaseFactor = easeFactor;
  let newInterval = interval;

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
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ensure ease factor doesn't go below 1.3
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }
  }

  // Calculate due date (current time + interval in days)
  const now = Date.now();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const dueDate = now + (newInterval * millisecondsPerDay);

  return {
    repetition: newRepetition,
    easeFactor: newEaseFactor,
    interval: newInterval,
    dueDate,
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
  returns: v.null(),
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

    // Get the deck to verify ownership
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
      currentInterval
    );

    // Update the card with new spaced repetition parameters
    await ctx.db.patch(args.cardId, {
      repetition,
      easeFactor,
      interval,
      dueDate,
    });

    return null;
  },
});

/**
 * Get cards that are due for review in a specific deck
 */
export const getDueCardsForDeck = query({
  args: {
    deckId: v.id("decks"),
  },
  returns: v.array(
    v.object({
      _id: v.id("cards"),
      _creationTime: v.number(),
      deckId: v.id("decks"),
      front: v.string(),
      back: v.string(),
      repetition: v.optional(v.number()),
      easeFactor: v.optional(v.number()),
      interval: v.optional(v.number()),
      dueDate: v.optional(v.number()),
    })
  ),
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
        q.eq("deckId", args.deckId).lte("dueDate", now)
      )
      .collect();

    return dueCards;
  },
});

/**
 * Get new cards (never reviewed) for a specific deck with daily limit
 */
export const getNewCardsForDeck = query({
  args: {
    deckId: v.id("decks"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("cards"),
      _creationTime: v.number(),
      deckId: v.id("decks"),
      front: v.string(),
      back: v.string(),
      repetition: v.optional(v.number()),
      easeFactor: v.optional(v.number()),
      interval: v.optional(v.number()),
      dueDate: v.optional(v.number()),
    })
  ),
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
        q.eq("deckId", args.deckId).eq("repetition", 0)
      )
      .take(limit);

    return newCards;
  },
});

/**
 * Initialize spaced repetition fields for existing cards that don't have them
 */
export const initializeCardForSpacedRepetition = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
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

    // Get the deck to verify ownership
    const deck = await ctx.db.get(card.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only initialize your own cards");
    }

    // Only initialize if fields are missing
    const updates: any = {};
    
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
});
