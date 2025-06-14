import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get all cards for a specific deck.
 * Only the owner of the deck can access its cards.
 */
export const getCardsForDeck = query({
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
      // Spaced repetition fields
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

    // First, verify that the user owns the deck
    const deck = await ctx.db.get(args.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only access cards from your own decks");
    }

    // Query all cards for this deck using the index
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .order("desc") // Most recently created first
      .collect();

    return cards;
  },
});

/**
 * Add a new card to a deck.
 * Only the owner of the deck can add cards to it.
 */
export const addCardToDeck = mutation({
  args: {
    deckId: v.id("decks"),
    front: v.string(),
    back: v.string(),
  },
  returns: v.id("cards"),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to add cards");
    }

    // Validate input
    if (!args.front.trim()) {
      throw new Error("Card front content is required");
    }

    if (!args.back.trim()) {
      throw new Error("Card back content is required");
    }

    if (args.front.length > 1000) {
      throw new Error("Card front content cannot exceed 1000 characters");
    }

    if (args.back.length > 1000) {
      throw new Error("Card back content cannot exceed 1000 characters");
    }

    // Verify that the user owns the deck
    const deck = await ctx.db.get(args.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only add cards to your own decks");
    }

    // Insert the new card into the database with initialized spaced repetition fields
    const cardId = await ctx.db.insert("cards", {
      deckId: args.deckId,
      front: args.front.trim(),
      back: args.back.trim(),
      // Initialize spaced repetition fields for optimal query performance
      repetition: 0,        // New card, never reviewed
      easeFactor: 2.5,      // Default ease factor
      interval: 1,          // Default interval (1 day)
      dueDate: Date.now(),  // Available for study immediately
    });

    return cardId;
  },
});

/**
 * Update an existing card's front and/or back content.
 * Only the owner of the deck can update its cards.
 */
export const updateCard = mutation({
  args: {
    cardId: v.id("cards"),
    front: v.optional(v.string()),
    back: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to update cards");
    }

    // Get the existing card
    const existingCard = await ctx.db.get(args.cardId);
    
    if (!existingCard) {
      throw new Error("Card not found");
    }

    // Verify that the user owns the deck containing this card
    const deck = await ctx.db.get(existingCard.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only update cards in your own decks");
    }

    // Prepare update object
    const updates: { front?: string; back?: string } = {};

    if (args.front !== undefined) {
      if (!args.front.trim()) {
        throw new Error("Card front content cannot be empty");
      }
      if (args.front.length > 1000) {
        throw new Error("Card front content cannot exceed 1000 characters");
      }
      updates.front = args.front.trim();
    }

    if (args.back !== undefined) {
      if (!args.back.trim()) {
        throw new Error("Card back content cannot be empty");
      }
      if (args.back.length > 1000) {
        throw new Error("Card back content cannot exceed 1000 characters");
      }
      updates.back = args.back.trim();
    }

    // Only update if there are changes
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.cardId, updates);
    }

    return null;
  },
});

/**
 * Delete a card from a deck.
 * Only the owner of the deck can delete its cards.
 */
export const deleteCard = mutation({
  args: {
    cardId: v.id("cards"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to delete cards");
    }

    // Get the existing card
    const existingCard = await ctx.db.get(args.cardId);
    
    if (!existingCard) {
      throw new Error("Card not found");
    }

    // Verify that the user owns the deck containing this card
    const deck = await ctx.db.get(existingCard.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only delete cards from your own decks");
    }

    // Delete the card
    await ctx.db.delete(args.cardId);

    return null;
  },
});
