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
    cardCount: v.number(), // Number of cards in this deck (for performance optimization)
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
    .index("by_deckId_and_dueDate", ["deckId", "dueDate"]) // Compound index for deck-specific due cards
    .index("by_deckId_and_repetition", ["deckId", "repetition"]), // Index for finding new cards efficiently

  // Study Sessions table - tracks daily study activity for analytics and heatmap visualization
  studySessions: defineTable({
    userId: v.string(),           // ID of the user who completed this session
    deckId: v.id("decks"),       // Reference to the deck studied
    sessionDate: v.string(),     // Date in YYYY-MM-DD format (user's local date) for consistent daily aggregation
    cardsStudied: v.number(),    // Number of cards reviewed in this session
    sessionDuration: v.optional(v.number()), // Duration in milliseconds
    studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition")), // Type of study session
    // Timezone-aware fields for accurate date handling
    utcTimestamp: v.optional(v.string()),    // ISO 8601 UTC timestamp for canonical reference
    userTimeZone: v.optional(v.string()),    // IANA timezone identifier (e.g., "America/New_York")
  }).index("by_userId_and_date", ["userId", "sessionDate"])     // Index for efficient user activity queries
    .index("by_userId_and_deckId", ["userId", "deckId"])        // Index for deck-specific activity
    .index("by_date", ["sessionDate"])                          // Index for date-based queries
    // Compound index to efficiently check for existing sessions and prevent duplicates
    .index("by_unique_session", ["userId", "sessionDate", "deckId", "studyMode"]),
});
