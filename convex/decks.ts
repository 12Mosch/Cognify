import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get all decks for the currently authenticated user.
 * Returns an array of deck objects containing _id, userId, name, and description.
 */
export const getDecksForUser = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("decks"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      description: v.string(),
    })
  ),
  handler: async (ctx, _args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    // Handle case where user is not authenticated
    if (!identity) {
      throw new Error("User must be authenticated to access decks");
    }

    // Query the decks collection for decks belonging to the current user
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc") // Most recently created first
      .collect();

    return decks;
  },
});

/**
 * Create a new deck for the currently authenticated user.
 * Validates input parameters and returns the ID of the newly created deck.
 */
export const createDeck = mutation({
  args: {
    name: v.string(),
    description: v.string(),
  },
  returns: v.id("decks"),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    // Handle case where user is not authenticated
    if (!identity) {
      throw new Error("User must be authenticated to create a deck");
    }

    // Validate input parameters
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Deck name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Deck name cannot exceed 100 characters");
    }

    if (args.description.length > 500) {
      throw new Error("Deck description cannot exceed 500 characters");
    }

    // Insert the new deck into the database
    const deckId = await ctx.db.insert("decks", {
      userId: identity.subject,
      name: args.name.trim(),
      description: args.description.trim(),
    });

    return deckId;
  },
});

/**
 * Update an existing deck's name and description.
 * Only the owner of the deck can update it.
 */
export const updateDeck = mutation({
  args: {
    deckId: v.id("decks"),
    name: v.string(),
    description: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to update a deck");
    }

    // Get the existing deck to verify ownership
    const existingDeck = await ctx.db.get(args.deckId);
    
    if (!existingDeck) {
      throw new Error("Deck not found");
    }

    if (existingDeck.userId !== identity.subject) {
      throw new Error("You can only update your own decks");
    }

    // Validate input parameters
    if (!args.name || args.name.trim().length === 0) {
      throw new Error("Deck name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Deck name cannot exceed 100 characters");
    }

    if (args.description.length > 500) {
      throw new Error("Deck description cannot exceed 500 characters");
    }

    // Update the deck
    await ctx.db.patch(args.deckId, {
      name: args.name.trim(),
      description: args.description.trim(),
    });

    return null;
  },
});

/**
 * Delete a deck and all its associated cards.
 * Only the owner of the deck can delete it.
 */
export const deleteDeck = mutation({
  args: {
    deckId: v.id("decks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to delete a deck");
    }

    // Get the existing deck to verify ownership
    const existingDeck = await ctx.db.get(args.deckId);
    
    if (!existingDeck) {
      throw new Error("Deck not found");
    }

    if (existingDeck.userId !== identity.subject) {
      throw new Error("You can only delete your own decks");
    }

    // Delete all cards associated with this deck
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    for (const card of cards) {
      await ctx.db.delete(card._id);
    }

    // Delete the deck itself
    await ctx.db.delete(args.deckId);

    return null;
  },
});

/**
 * Get a single deck by ID.
 * Only the owner of the deck can access it.
 */
export const getDeckById = query({
  args: {
    deckId: v.id("decks"),
  },
  returns: v.union(
    v.object({
      _id: v.id("decks"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      description: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get the current authenticated user
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to access deck");
    }

    // Get the deck
    const deck = await ctx.db.get(args.deckId);
    
    if (!deck) {
      return null;
    }

    // Verify ownership
    if (deck.userId !== identity.subject) {
      throw new Error("You can only access your own decks");
    }

    return deck;
  },
});
