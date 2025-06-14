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
  }),
});
