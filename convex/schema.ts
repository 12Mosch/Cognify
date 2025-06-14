import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema for the flashcard app
// Defines the structure of our database tables (collections)
export default defineSchema({
  // Decks table - stores flashcard decks
  decks: defineTable({
    userId: v.string(), // ID of the user who owns this deck
    name: v.string(),   // Name of the deck
    description: v.string(), // Description of the deck
  }),

  // Cards table - stores individual flashcards
  cards: defineTable({
    deckId: v.id("decks"), // Reference to the deck this card belongs to
    front: v.string(),     // Front side of the card (question/prompt)
    back: v.string(),      // Back side of the card (answer)

    // Spaced Repetition fields (SM-2 algorithm)
    repetition: v.optional(v.number()),    // Number of successful repetitions (default: 0)
    easeFactor: v.optional(v.number()),    // Ease factor for scheduling (default: 2.5)
    interval: v.optional(v.number()),      // Days until next review (default: 1)
    dueDate: v.optional(v.number()),       // Unix timestamp when card is due for review
  }).index("by_deckId", ["deckId"])        // Index for efficient queries by deck
    .index("by_dueDate", ["dueDate"])      // Index for spaced repetition due date queries
    .index("by_deckId_and_dueDate", ["deckId", "dueDate"]), // Compound index for deck-specific due cards
});
