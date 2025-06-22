import { internalMutation } from "../_generated/server";

/**
 * Migration script to add cardCount field to existing decks.
 * This should be run once after deploying the schema changes.
 *
 * This migration:
 * 1. Finds all decks that don't have a cardCount field
 * 2. Counts the actual number of cards for each deck
 * 3. Updates the deck with the correct cardCount
 */
export const addCardCountToDecks = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting migration: addCardCountToDecks");

		// Get all decks
		const decks = await ctx.db.query("decks").collect();
		console.log(`Found ${decks.length} decks to potentially migrate`);

		let migratedCount = 0;

		for (const deck of decks) {
			// Check if deck already has cardCount field
			if (deck.cardCount === undefined) {
				// Count the actual number of cards for this deck
				const cards = await ctx.db
					.query("cards")
					.withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
					.collect();

				const actualCardCount = cards.length;

				// Update the deck with the correct cardCount
				await ctx.db.patch(deck._id, {
					cardCount: actualCardCount,
				});

				console.log(
					`Migrated deck "${deck.name}" with ${actualCardCount} cards`,
				);
				migratedCount++;
			}
		}

		console.log(`Migration completed. Migrated ${migratedCount} decks.`);
		return { migratedDecks: migratedCount, totalDecks: decks.length };
	},
});

/**
 * Migration script to migrate studySessions from 'date' field to 'sessionDate' field.
 * This should be run once to fix the schema validation error.
 *
 * This migration:
 * 1. Finds all studySessions that have a 'date' field but no 'sessionDate' field
 * 2. Copies the 'date' value to 'sessionDate' field
 * 3. Optionally removes the old 'date' field (commented out for safety)
 */
export const migrateStudySessionsDateField = internalMutation({
	args: {},
	handler: async (ctx) => {
		console.log("Starting migration: migrateStudySessionsDateField");

		// Get all study sessions
		const sessions = await ctx.db.query("studySessions").collect();
		console.log(
			`Found ${sessions.length} study sessions to potentially migrate`,
		);

		let migratedCount = 0;

		for (const session of sessions) {
			// Check if session has old 'date' field but no 'sessionDate' field
			// Note: TypeScript might complain about 'date' field, but it exists in the actual data
			const sessionAny = session as Record<string, unknown>;

			if (sessionAny.date && !sessionAny.sessionDate) {
				// Copy the 'date' value to 'sessionDate' field
				await ctx.db.patch(session._id, {
					sessionDate: sessionAny.date,
				});

				console.log(
					`Migrated study session ${session._id} with date "${sessionAny.date}"`,
				);
				migratedCount++;
			}
		}

		console.log(
			`Migration completed. Migrated ${migratedCount} study sessions.`,
		);
		return { migratedSessions: migratedCount, totalSessions: sessions.length };
	},
});
