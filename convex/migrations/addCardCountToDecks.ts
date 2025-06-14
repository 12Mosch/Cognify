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
        
        console.log(`Migrated deck "${deck.name}" with ${actualCardCount} cards`);
        migratedCount++;
      }
    }
    
    console.log(`Migration completed. Migrated ${migratedCount} decks.`);
    return { migratedDecks: migratedCount, totalDecks: decks.length };
  },
});
