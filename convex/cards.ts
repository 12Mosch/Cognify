import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { addImageUrlsToCards } from "./utils/imageUrlCache";

/**
 * Get all cards for a specific deck.
 * Only the owner of the deck can access its cards.
 */
export const getCardsForDeck = query({
	args: {
		deckId: v.id("decks"),
	},
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

		// Add image URLs to each card using optimized caching
		return await addImageUrlsToCards(ctx, cards);
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
			// Spaced repetition fields
			repetition: v.optional(v.number()),
			userId: v.string(),
		}),
	),
});

/**
 * Add a new card to a deck.
 * Only the owner of the deck can add cards to it.
 */
export const addCardToDeck = mutation({
	args: {
		back: v.string(),
		backImageId: v.optional(v.id("_storage")),
		deckId: v.id("decks"),
		front: v.string(),
		frontImageId: v.optional(v.id("_storage")),
	},
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
			back: args.back.trim(),
			backImageId: args.backImageId,
			deckId: args.deckId, // Reference to the deck this card belongs to
			dueDate: Date.now(), // Available for study immediately
			easeFactor: 2.5, // Default ease factor
			front: args.front.trim(), // Front side of the card (question/prompt)
			frontImageId: args.frontImageId,
			interval: 1, // Default interval (1 day)
			// Initialize spaced repetition fields for optimal query performance
			repetition: 0, // New card, never reviewed
			userId: identity.subject, // Denormalize userId for efficient filtering
		});

		// Increment the deck's card count for performance optimization
		await ctx.db.patch(args.deckId, {
			cardCount: (deck.cardCount || 0) + 1,
		});

		return cardId;
	},
	returns: v.id("cards"),
});

/**
 * Update an existing card's front and/or back content.
 * Only the owner of the deck can update its cards.
 */
export const updateCard = mutation({
	args: {
		back: v.optional(v.string()),
		backImageId: v.optional(v.id("_storage")),
		cardId: v.id("cards"),
		front: v.optional(v.string()),
		frontImageId: v.optional(v.id("_storage")),
	},
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

		// Validate that the card has a valid deckId before using it
		if (!existingCard.deckId) {
			throw new Error("Card has invalid deck reference");
		}

		// Verify that the user owns the deck containing this card
		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(existingCard.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only update cards in your own decks");
		}

		// Prepare update object
		const updates: {
			front?: string;
			back?: string;
			frontImageId?: Id<"_storage"> | undefined;
			backImageId?: Id<"_storage"> | undefined;
		} = {};

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

		// Handle image updates (allow setting to undefined to remove images)
		if (args.frontImageId !== undefined) {
			updates.frontImageId = args.frontImageId;
		}

		if (args.backImageId !== undefined) {
			updates.backImageId = args.backImageId;
		}

		// Only update if there are changes
		if (Object.keys(updates).length > 0) {
			await ctx.db.patch(args.cardId, updates);
		}

		return null;
	},
	returns: v.null(),
});

/**
 * Delete a card from a deck.
 * Only the owner of the deck can delete its cards.
 */
export const deleteCard = mutation({
	args: {
		cardId: v.id("cards"),
	},
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

		// Validate that the card has a valid deckId before using it
		if (!existingCard.deckId) {
			throw new Error("Card has invalid deck reference");
		}

		// Verify that the user owns the deck containing this card
		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(existingCard.deckId);

		if (!deck) {
			throw new Error("Deck not found");
		}

		if (deck.userId !== identity.subject) {
			throw new Error("You can only delete cards from your own decks");
		}

		// Delete associated images from storage before deleting the card
		const imagesToDelete: string[] = [];
		if (existingCard.frontImageId) {
			imagesToDelete.push(existingCard.frontImageId);
		}
		if (existingCard.backImageId) {
			imagesToDelete.push(existingCard.backImageId);
		}

		// Delete images from storage (if any exist)
		for (const imageId of imagesToDelete) {
			try {
				await ctx.storage.delete(imageId);
			} catch (error) {
				// Log the error but don't fail the card deletion
				// The image might already be deleted or not exist
				console.warn(
					`Failed to delete image ${imageId} for card ${args.cardId}:`,
					error,
				);
			}
		}

		// Delete the card
		await ctx.db.delete(args.cardId);

		// Decrement the deck's card count for performance optimization
		await ctx.db.patch(existingCard.deckId, {
			cardCount: Math.max(0, (deck.cardCount || 0) - 1),
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Generate an upload URL for card images.
 * Only authenticated users can generate upload URLs.
 */
export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to upload files");
		}

		// Generate and return the upload URL
		return await ctx.storage.generateUploadUrl();
	},
	returns: v.string(),
});

/**
 * Delete a file from storage.
 * Only authenticated users can delete files they uploaded.
 * This is used for cleaning up orphaned files when card creation is cancelled.
 */
export const deleteFile = mutation({
	args: {
		storageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to delete files");
		}

		try {
			// Delete the file from storage
			await ctx.storage.delete(args.storageId);
			return { success: true };
		} catch (error) {
			// File might not exist or user might not have permission
			// Log the error but don't throw to avoid breaking the UI
			console.warn(`Failed to delete file ${args.storageId}:`, error);
			return { error: "Failed to delete file", success: false };
		}
	},
	returns: v.object({
		error: v.optional(v.string()),
		success: v.boolean(),
	}),
});

/**
 * Get URLs for card images.
 * Returns URLs for both front and back images if they exist.
 */
export const getCardImageUrls = query({
	args: {
		cardId: v.id("cards"),
	},
	handler: async (ctx, args) => {
		// Get the current authenticated user
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("User must be authenticated to access card images");
		}

		// Get the card
		const card = await ctx.db.get(args.cardId);

		if (!card) {
			throw new Error("Card not found");
		}

		// Verify that the user owns the card
		if (card.userId !== identity.subject) {
			throw new Error("You can only access images from your own cards");
		}

		// Use the optimized image URL fetching utility
		const [cardWithUrls] = await addImageUrlsToCards(ctx, [card]);

		return {
			backImageUrl: cardWithUrls.backImageUrl,
			frontImageUrl: cardWithUrls.frontImageUrl,
		};
	},
});
