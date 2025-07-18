import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { internalMutation } from "../_generated/server";

/**
 * Migration to add userId field to existing cards for performance optimization.
 *
 * This migration addresses the performance issue where card filtering required
 * fetching deck information for each card. By denormalizing the userId field
 * directly on cards, we can use efficient database indexes for user-based queries.
 *
 * Run this migration once after deploying the schema changes.
 */
export const addUserIdToExistingCards = internalMutation({
	args: {
		batchSize: v.optional(v.number()), // Process cards in batches to avoid timeouts
	},
	handler: async (ctx: MutationCtx, args: { batchSize?: number }) => {
		const batchSize = args.batchSize || 100;
		let processedCount = 0;
		let updatedCount = 0;

		console.log("Starting migration: Adding userId to existing cards");

		// Process cards in batches to avoid timeout issues
		let hasMore = true;
		let lastId: Id<"cards"> | undefined;

		while (hasMore) {
			// Get a batch of cards that don't have userId field
			let cardsQuery = ctx.db.query("cards");
			if (lastId) {
				cardsQuery = cardsQuery.filter((q) =>
					q.gt(q.field("_id"), lastId as Id<"cards">),
				);
			}

			const cards = await cardsQuery
				.filter((q) => q.eq(q.field("userId"), undefined))
				.take(batchSize);

			if (cards.length === 0) {
				hasMore = false;
				break;
			}

			// Process each card in the batch
			for (const card of cards) {
				try {
					// Get the deck to find the userId
					// deepcode ignore Sqli: <No SQL injection risk in Convex>
					const deck = await ctx.db.get(card.deckId);

					if (deck) {
						// Update the card with the userId from its deck
						await ctx.db.patch(card._id, {
							userId: deck.userId,
						});
						updatedCount++;
					} else {
						console.warn(
							`Card ${card._id} references non-existent deck ${card.deckId}`,
						);
					}

					processedCount++;
				} catch (error) {
					console.error(`Error processing card ${card._id}:`, error);
				}
			}

			// Update lastId for next batch
			lastId = cards[cards.length - 1]._id;

			console.log(
				`Processed ${processedCount} cards, updated ${updatedCount} cards`,
			);

			// Add small delay between batches to reduce database load
			if (cards.length === batchSize) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		console.log(
			`Migration completed: Processed ${processedCount} cards, updated ${updatedCount} cards`,
		);

		return {
			processedCount,
			success: true,
			updatedCount,
		};
	},
});

/**
 * Verify migration completion by checking for cards without userId
 */
export const verifyUserIdMigration = internalMutation({
	args: {},
	handler: async (ctx: MutationCtx, _args: Record<string, never>) => {
		// Count cards without userId
		const cardsWithoutUserId = await ctx.db
			.query("cards")
			.filter((q) => q.eq(q.field("userId"), undefined))
			.collect();

		// Count total cards
		const totalCards = await ctx.db.query("cards").collect();

		console.log(`Migration verification:`);
		console.log(`- Total cards: ${totalCards.length}`);
		console.log(`- Cards without userId: ${cardsWithoutUserId.length}`);
		console.log(`- Migration complete: ${cardsWithoutUserId.length === 0}`);

		return {
			cardsWithoutUserId: cardsWithoutUserId.length,
			migrationComplete: cardsWithoutUserId.length === 0,
			totalCards: totalCards.length,
		};
	},
});
