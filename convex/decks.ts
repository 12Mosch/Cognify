import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
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
 * Delete a deck and all its associated cards.
 * Only the owner of the deck can delete it.
 * This operation is irreversible and removes all cards in the deck.
 */
export const deleteDeck = mutation({
	args: {
		deckId: v.id("decks"),
	},
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

		// Get all cards in this deck to delete them
		const cards = await ctx.db
			.query("cards")
			.withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
			.collect();

		// Delete all images associated with cards in this deck
		const imagesToDelete: Id<"_storage">[] = [];
		for (const card of cards) {
			if (card.frontImageId) {
				imagesToDelete.push(card.frontImageId);
			}
			if (card.backImageId) {
				imagesToDelete.push(card.backImageId);
			}
		}

		// Delete images from storage in parallel (if any exist)
		if (imagesToDelete.length > 0) {
			const deletionPromises = imagesToDelete.map(async (imageId) => {
				try {
					await ctx.storage.delete(imageId);
					return { imageId, success: true };
				} catch (error) {
					// Log the error but don't fail the deck deletion
					// The image might already be deleted or not exist
					console.warn(
						`Failed to delete image ${imageId} for deck ${args.deckId}:`,
						error,
					);
					return { error, imageId, success: false };
				}
			});

			// Wait for all deletion attempts to complete
			await Promise.allSettled(deletionPromises);
		}

		// Delete all cards in the deck
		for (const card of cards) {
			await ctx.db.delete(card._id);
		}

		// Delete any card reviews associated with this deck
		const cardReviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_deckId_and_date", (q) => q.eq("deckId", args.deckId))
			.collect();

		for (const review of cardReviews) {
			await ctx.db.delete(review._id);
		}

		// Delete any study sessions associated with this deck
		const studySessions = await ctx.db
			.query("studySessions")
			.withIndex("by_userId_and_deckId", (q) =>
				q.eq("userId", identity.subject).eq("deckId", args.deckId),
			)
			.collect();

		for (const session of studySessions) {
			await ctx.db.delete(session._id);
		}

		// Finally, delete the deck itself
		await ctx.db.delete(args.deckId);

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
