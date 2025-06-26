import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all decks for the currently authenticated user.
 * Returns an array of deck objects containing _id, userId, name, and description.
 */
export const getDecksForUser = query({
	args: {},
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
	returns: v.array(
		v.object({
			_creationTime: v.number(),
			_id: v.id("decks"),
			cardCount: v.number(),
			description: v.string(),
			name: v.string(),
			userId: v.string(),
		}),
	),
});

/**
 * Create a new deck for the currently authenticated user.
 * Validates input parameters and returns the ID of the newly created deck.
 */
export const createDeck = mutation({
	args: {
		description: v.string(),
		name: v.string(),
	},
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
			cardCount: 0,
			description: args.description.trim(),
			name: args.name.trim(),
			userId: identity.subject, // Initialize with zero cards
		});

		return deckId;
	},
	returns: v.id("decks"),
});

/**
 * Update an existing deck's name and description.
 * Only the owner of the deck can update it.
 */
export const updateDeck = mutation({
	args: {
		deckId: v.id("decks"),
		description: v.string(),
		name: v.string(),
	},
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
			description: args.description.trim(),
			name: args.name.trim(),
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Get a single deck by ID.
 * Only the owner of the deck can access it.
 */
export const getDeckById = query({
	args: {
		deckId: v.id("decks"),
	},
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
	returns: v.union(
		v.object({
			_creationTime: v.number(),
			_id: v.id("decks"),
			cardCount: v.number(),
			description: v.string(),
			name: v.string(),
			userId: v.string(),
		}),
		v.null(),
	),
});
