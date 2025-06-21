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
  }).index("by_userId", ["userId"]), // Index for efficient user deck queries

  // Cards table - stores individual flashcards
  cards: defineTable({
    deckId: v.id("decks"), // Reference to the deck this card belongs to
    userId: v.string(),    // ID of the user who owns this card (denormalized for performance)
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
    .index("by_deckId_and_repetition", ["deckId", "repetition"]) // Index for finding new cards efficiently
    .index("by_userId", ["userId"])        // Index for efficient user-based card queries
    .index("by_userId_and_dueDate", ["userId", "dueDate"]) // Compound index for user's due cards
    .index("by_userId_and_repetition", ["userId", "repetition"]), // Index for user's new cards

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

  // Study Streaks table - tracks daily study streaks for gamification and motivation
  studyStreaks: defineTable({
    userId: v.string(),           // ID of the user
    currentStreak: v.number(),    // Current consecutive days of study
    longestStreak: v.number(),    // Longest streak ever achieved
    lastStudyDate: v.optional(v.string()),    // Last date user studied (YYYY-MM-DD format) - optional for new users
    streakStartDate: v.optional(v.string()),  // Date when current streak started (YYYY-MM-DD format) - optional for new users
    timezone: v.string(),         // User's IANA timezone identifier
    // Milestone tracking
    milestonesReached: v.optional(v.array(v.number())), // Array of milestone numbers reached (e.g., [7, 30, 100]) - defaults to []
    lastMilestone: v.optional(v.number()),  // Last milestone reached
    // Metadata
    lastUpdated: v.optional(v.string()),      // ISO 8601 timestamp of last update - optional for new users
    totalStudyDays: v.number(),   // Total number of days user has studied (not necessarily consecutive)
  }).index("by_userId", ["userId"])                             // Index for efficient user streak queries
    .index("by_currentStreak", ["currentStreak"])               // Index for leaderboard queries
    .index("by_longestStreak", ["longestStreak"]),              // Index for all-time leaderboard queries

  // Card Reviews table - tracks individual review outcomes for retention rate calculation
  cardReviews: defineTable({
    userId: v.string(),           // ID of the user who performed the review
    cardId: v.id("cards"),       // Reference to the reviewed card
    deckId: v.id("decks"),       // Reference to the deck (for efficient queries)
    reviewDate: v.number(),      // Unix timestamp when review was performed
    quality: v.number(),         // Quality rating (0-5 scale from SM-2 algorithm)
    wasSuccessful: v.boolean(),  // Whether the review was successful (quality >= 3)
    // Spaced repetition context at time of review
    repetitionBefore: v.number(), // Repetition count before this review
    repetitionAfter: v.number(),  // Repetition count after this review
    intervalBefore: v.number(),   // Interval before this review
    intervalAfter: v.number(),    // Interval after this review
    easeFactorBefore: v.number(), // Ease factor before this review
    easeFactorAfter: v.number(),  // Ease factor after this review
    // Metadata
    reviewDuration: v.optional(v.number()), // Time spent on this review in milliseconds
    studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition"), v.literal("adaptive-spaced-repetition")), // Study mode used
    // Additional fields for adaptive learning
    responseTime: v.optional(v.number()),     // Time taken to respond in milliseconds
    confidenceRating: v.optional(v.number()), // User's confidence rating (1-5)
    predictedConfidence: v.optional(v.number()), // Algorithm's confidence prediction (0-1)
    timeOfDay: v.optional(v.number()),        // Hour of day when review was performed (0-23)
  }).index("by_userId_and_date", ["userId", "reviewDate"])      // Index for user review history queries
    .index("by_cardId_and_date", ["cardId", "reviewDate"])      // Index for card-specific review history
    .index("by_deckId_and_date", ["deckId", "reviewDate"])      // Index for deck-specific review analysis
    .index("by_userId_and_success", ["userId", "wasSuccessful"]) // Index for retention rate calculations
    .index("by_userId_and_timeOfDay", ["userId", "timeOfDay"])  // Index for time-of-day performance analysis
    .index("by_userId_date_and_success", ["userId", "reviewDate", "wasSuccessful"]), // Composite index for filtered retention rate queries

  // Learning Patterns table - stores personalized learning analytics for adaptive algorithm
  learningPatterns: defineTable({
    userId: v.string(),           // ID of the user
    averageSuccessRate: v.number(), // Overall success rate across all reviews
    learningVelocity: v.number(),   // Cards mastered per day
    // Time-of-day performance breakdown
    timeOfDayPerformance: v.object({
      early_morning: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
      morning: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
      afternoon: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
      evening: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
      night: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
      late_night: v.object({
        successRate: v.number(),
        reviewCount: v.number(),
        averageResponseTime: v.number(),
      }),
    }),
    // Difficulty-based performance patterns
    difficultyPatterns: v.object({
      easyCards: v.object({
        successRate: v.number(),
        averageInterval: v.number(),
      }),
      mediumCards: v.object({
        successRate: v.number(),
        averageInterval: v.number(),
      }),
      hardCards: v.object({
        successRate: v.number(),
        averageInterval: v.number(),
      }),
    }),
    personalEaseFactorBias: v.number(),    // Personal adjustment to base ease factor (-0.5 to +0.5)
    retentionCurve: v.array(v.object({     // Personal retention curve data points
      interval: v.number(),                 // Interval in days
      retentionRate: v.number(),           // Retention rate at this interval (0-1)
    })),
    lastUpdated: v.number(),              // Unix timestamp of last pattern update
  }).index("by_userId", ["userId"])       // Index for efficient user pattern queries
    .index("by_lastUpdated", ["lastUpdated"]), // Index for finding patterns that need updating

  // User Preferences table - stores study scheduling and learning preferences
  userPreferences: defineTable({
    userId: v.string(),                   // ID of the user
    preferredTimeSlots: v.array(v.string()), // Preferred time slots for studying
    preferredDuration: v.number(),        // Preferred session duration in minutes
    dailyGoal: v.number(),               // Daily study goal in cards
    availableDays: v.array(v.string()),  // Available days of the week
    lastUpdated: v.number(),             // Unix timestamp of last update
  }).index("by_userId", ["userId"]),     // Index for efficient user preference queries

  // User Achievements table - tracks unlocked achievements and gamification progress
  userAchievements: defineTable({
    userId: v.string(),                  // ID of the user
    achievementId: v.string(),           // ID of the unlocked achievement
    unlockedAt: v.number(),             // Unix timestamp when achievement was unlocked
    triggerType: v.string(),            // What triggered the achievement (e.g., "study_session", "streak_updated")
  }).index("by_userId", ["userId"])      // Index for efficient user achievement queries
    .index("by_achievementId", ["achievementId"]) // Index for achievement statistics
    .index("by_userId_and_achievement", ["userId", "achievementId"]), // Compound index for checking specific achievements

  // Learning Reflections table - stores metacognitive reflections and self-assessments
  learningReflections: defineTable({
    userId: v.string(),                  // ID of the user
    sessionId: v.optional(v.string()),   // Optional session ID for grouping
    deckId: v.optional(v.id("decks")),   // Optional deck ID for context
    category: v.union(                   // Category of reflection
      v.literal("difficulty"),
      v.literal("strategy"),
      v.literal("motivation"),
      v.literal("understanding"),
      v.literal("time_management"),
      v.literal("goals")
    ),
    prompt: v.string(),                  // The reflection prompt
    response: v.string(),                // User's reflection response
    rating: v.number(),                  // User's rating (1-5 scale)
    tags: v.array(v.string()),          // Optional tags for categorization
    timestamp: v.number(),               // Unix timestamp
  }).index("by_userId_and_timestamp", ["userId", "timestamp"]) // Index for user reflection history
    .index("by_category", ["category"])  // Index for analyzing reflection patterns
    .index("by_deckId", ["deckId"]),    // Index for deck-specific reflections

  // Confidence Calibrations table - tracks accuracy of confidence predictions
  confidenceCalibrations: defineTable({
    userId: v.string(),                  // ID of the user
    cardId: v.id("cards"),              // ID of the card
    predictedConfidence: v.number(),     // User's confidence prediction (0-1)
    actualPerformance: v.number(),       // Actual performance (0-1)
    calibrationError: v.number(),        // Absolute difference between prediction and performance
    timestamp: v.number(),               // Unix timestamp
  }).index("by_userId", ["userId"])      // Index for user calibration analysis
    .index("by_cardId", ["cardId"])      // Index for card-specific calibration
    .index("by_userId_and_timestamp", ["userId", "timestamp"]), // Index for temporal analysis

  // Statistics Cache table - caches frequently accessed computed statistics for performance
  statisticsCache: defineTable({
    userId: v.string(),                  // ID of the user
    cacheKey: v.string(),               // Unique key identifying the cached statistic (e.g., "user_stats", "retention_rate_30d")
    data: v.any(),                      // Cached data (JSON serializable)
    computedAt: v.number(),             // Unix timestamp when data was computed
    expiresAt: v.number(),              // Unix timestamp when cache expires
    version: v.number(),                // Version number for cache invalidation
  }).index("by_userId_and_key", ["userId", "cacheKey"])  // Index for efficient cache lookups
    .index("by_expiresAt", ["expiresAt"])                // Index for cache cleanup
    .index("by_userId_and_expires", ["userId", "expiresAt"]), // Index for user-specific cache cleanup

  // Cache Metrics table - tracks cache hit/miss statistics for performance monitoring
  cacheMetrics: defineTable({
    timestamp: v.number(),              // Unix timestamp when metric was recorded
    cacheKey: v.string(),               // Cache key that was accessed
    userId: v.optional(v.string()),     // User ID (optional for global metrics)
    hitType: v.union(v.literal("hit"), v.literal("miss"), v.literal("expired")), // Type of cache access
    computationTimeMs: v.optional(v.number()), // Time taken to compute data on cache miss (ms)
    ttlMs: v.optional(v.number()),      // TTL used for cache entry (ms)
  }).index("by_timestamp", ["timestamp"])               // Index for time-based queries
    .index("by_cacheKey_and_timestamp", ["cacheKey", "timestamp"]) // Index for key-specific metrics
    .index("by_userId_and_timestamp", ["userId", "timestamp"]),    // Index for user-specific metrics
});
