import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Schema for the flashcard app
// Defines the structure of our database tables (collections)
export default defineSchema({
	// Cache Metrics table - tracks cache hit/miss statistics for performance monitoring
	cacheMetrics: defineTable({
		cacheKey: v.string(), // Unix timestamp when metric was recorded
		computationTimeMs: v.optional(v.number()), // Cache key that was accessed
		hitType: v.union(v.literal("hit"), v.literal("miss"), v.literal("expired")), // User ID (optional for global metrics)
		timestamp: v.number(), // Type of cache access
		ttlMs: v.optional(v.number()), // Time taken to compute data on cache miss (ms)
		userId: v.optional(v.string()), // TTL used for cache entry (ms)
	})
		.index("by_timestamp", ["timestamp"]) // Index for time-based queries
		.index("by_cacheKey_and_timestamp", ["cacheKey", "timestamp"]) // Index for key-specific metrics
		.index("by_userId_and_timestamp", ["userId", "timestamp"]), // Index for efficient user deck queries

	// Card Reviews table - tracks individual review outcomes for retention rate calculation
	cardReviews: defineTable({
		cardId: v.id("cards"), // ID of the user who performed the review
		confidenceRating: v.optional(v.number()), // Reference to the reviewed card
		deckId: v.id("decks"), // Reference to the deck (for efficient queries)
		easeFactorAfter: v.number(), // Unix timestamp when review was performed
		easeFactorBefore: v.number(), // Quality rating (0-5 scale from SM-2 algorithm)
		intervalAfter: v.number(), // Whether the review was successful (quality >= 3)
		intervalBefore: v.number(), // Repetition count before this review
		predictedConfidence: v.optional(v.number()), // Repetition count after this review
		quality: v.number(), // Interval before this review
		repetitionAfter: v.number(), // Interval after this review
		// Spaced repetition context at time of review
		repetitionBefore: v.number(), // Ease factor before this review
		// Additional fields for adaptive learning
		responseTime: v.optional(v.number()), // Ease factor after this review
		reviewDate: v.number(), // Time spent on this review in milliseconds
		// Metadata
		reviewDuration: v.optional(v.number()), // Study mode used
		studyMode: v.union(
			v.literal("basic"),
			v.literal("spaced-repetition"),
			v.literal("adaptive-spaced-repetition"),
		), // Time taken to respond in milliseconds
		timeOfDay: v.optional(v.number()), // User's confidence rating (1-5)
		userId: v.string(), // Algorithm's confidence prediction (0-1)
		wasSuccessful: v.boolean(), // Hour of day when review was performed (0-23)
	})
		.index("by_userId_and_date", ["userId", "reviewDate"]) // Index for user review history queries
		.index("by_cardId_and_date", ["cardId", "reviewDate"]) // Index for card-specific review history
		.index("by_deckId_and_date", ["deckId", "reviewDate"]) // Index for deck-specific review analysis
		.index("by_userId_and_success", ["userId", "wasSuccessful"]) // Index for retention rate calculations
		.index("by_userId_and_timeOfDay", ["userId", "timeOfDay"]) // Index for time-of-day performance analysis
		.index("by_userId_date_and_success", [
			"userId",
			"reviewDate",
			"wasSuccessful",
		]), // Index for user's new cards

	// Cards table - stores individual flashcards
	cards: defineTable({
		back: v.string(), // Reference to the deck this card belongs to
		deckId: v.id("decks"), // ID of the user who owns this card (denormalized for performance)
		dueDate: v.optional(v.number()), // Front side of the card (question/prompt)
		easeFactor: v.optional(v.number()), // Back side of the card (answer)
		front: v.string(), // Number of successful repetitions (default: 0)
		interval: v.optional(v.number()), // Ease factor for scheduling (default: 2.5)

		// Spaced Repetition fields (SM-2 algorithm)
		repetition: v.optional(v.number()), // Days until next review (default: 1)
		userId: v.string(), // Unix timestamp when card is due for review
	})
		.index("by_deckId", ["deckId"]) // Index for efficient queries by deck
		.index("by_dueDate", ["dueDate"]) // Index for spaced repetition due date queries
		.index("by_deckId_and_dueDate", ["deckId", "dueDate"]) // Compound index for deck-specific due cards
		.index("by_deckId_and_repetition", ["deckId", "repetition"]) // Index for finding new cards efficiently
		.index("by_userId", ["userId"]) // Index for efficient user-based card queries
		.index("by_userId_and_dueDate", ["userId", "dueDate"]) // Compound index for user's due cards
		.index("by_userId_and_repetition", ["userId", "repetition"]),

	// Confidence Calibrations table - tracks accuracy of confidence predictions
	confidenceCalibrations: defineTable({
		actualPerformance: v.number(), // ID of the user
		calibrationError: v.number(), // ID of the card
		cardId: v.id("cards"), // User's confidence prediction (0-1)
		predictedConfidence: v.number(), // Actual performance (0-1)
		timestamp: v.number(), // Absolute difference between prediction and performance
		userId: v.string(), // Unix timestamp
	})
		.index("by_userId", ["userId"]) // Index for user calibration analysis
		.index("by_cardId", ["cardId"]) // Index for card-specific calibration
		.index("by_userId_and_timestamp", ["userId", "timestamp"]), // Index for all-time leaderboard queries
	// Decks table - stores flashcard decks
	decks: defineTable({
		cardCount: v.number(), // ID of the user who owns this deck
		description: v.string(), // Name of the deck
		name: v.string(), // Description of the deck
		userId: v.string(), // Number of cards in this deck (for performance optimization)
	}).index("by_userId", ["userId"]), // Composite index for filtered retention rate queries

	// Learning Patterns table - stores personalized learning analytics for adaptive algorithm
	learningPatterns: defineTable({
		averageSuccessRate: v.number(), // ID of the user
		// Difficulty-based performance patterns
		difficultyPatterns: v.object({
			easyCards: v.object({
				averageInterval: v.number(),
				successRate: v.number(),
			}),
			hardCards: v.object({
				averageInterval: v.number(),
				successRate: v.number(),
			}),
			mediumCards: v.object({
				averageInterval: v.number(),
				successRate: v.number(),
			}),
		}), // Overall success rate across all reviews
		lastUpdated: v.number(), // Cards mastered per day
		learningVelocity: v.number(),
		personalEaseFactorBias: v.number(),
		retentionCurve: v.array(
			v.object({
				// Personal retention curve data points
				interval: v.number(), // Interval in days
				retentionRate: v.number(), // Retention rate at this interval (0-1)
			}),
		), // Personal adjustment to base ease factor (-0.5 to +0.5)
		// Time-of-day performance breakdown
		timeOfDayPerformance: v.object({
			afternoon: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			early_morning: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			evening: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			late_night: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			morning: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			night: v.object({
				averageResponseTime: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
		}),
		userId: v.string(), // Unix timestamp of last pattern update
	})
		.index("by_userId", ["userId"]) // Index for efficient user pattern queries
		.index("by_lastUpdated", ["lastUpdated"]), // Index for finding patterns that need updating

	// Learning Reflections table - stores metacognitive reflections and self-assessments
	learningReflections: defineTable({
		category: v.union(
			// Category of reflection
			v.literal("difficulty"),
			v.literal("strategy"),
			v.literal("motivation"),
			v.literal("understanding"),
			v.literal("time_management"),
			v.literal("goals"),
		), // ID of the user
		deckId: v.optional(v.id("decks")), // Optional session ID for grouping
		prompt: v.string(), // Optional deck ID for context
		rating: v.number(),
		response: v.string(), // The reflection prompt
		sessionId: v.optional(v.string()), // User's reflection response
		tags: v.array(v.string()), // User's rating (1-5 scale)
		timestamp: v.number(), // Optional tags for categorization
		userId: v.string(), // Unix timestamp
	})
		.index("by_userId_and_timestamp", ["userId", "timestamp"]) // Index for user reflection history
		.index("by_category", ["category"]) // Index for analyzing reflection patterns
		.index("by_deckId", ["deckId"]), // Index for efficient user preference queries

	// Statistics Cache table - caches frequently accessed computed statistics for performance
	statisticsCache: defineTable({
		cacheKey: v.string(), // ID of the user
		computedAt: v.number(), // Unique key identifying the cached statistic (e.g., "user_stats", "retention_rate_30d")
		data: v.any(), // Cached data (JSON serializable)
		expiresAt: v.number(), // Unix timestamp when data was computed
		userId: v.string(), // Unix timestamp when cache expires
		version: v.number(), // Version number for cache invalidation
	})
		.index("by_userId_and_key", ["userId", "cacheKey"]) // Index for efficient cache lookups
		.index("by_expiresAt", ["expiresAt"]) // Index for cache cleanup
		.index("by_userId_and_expires", ["userId", "expiresAt"]), // Compound index for checking specific achievements

	// Study Sessions table - tracks daily study activity for analytics and heatmap visualization
	studySessions: defineTable({
		cardsStudied: v.number(), // ID of the user who completed this session
		deckId: v.id("decks"), // Reference to the deck studied
		sessionDate: v.string(), // Date in YYYY-MM-DD format (user's local date) for consistent daily aggregation
		sessionDuration: v.optional(v.number()), // Number of cards reviewed in this session
		studyMode: v.union(v.literal("basic"), v.literal("spaced-repetition")), // Duration in milliseconds
		userId: v.string(), // Type of study session
		userTimeZone: v.optional(v.string()), // ISO 8601 UTC timestamp for canonical reference
		// Timezone-aware fields for accurate date handling
		utcTimestamp: v.optional(v.string()), // IANA timezone identifier (e.g., "America/New_York")
	})
		.index("by_userId_and_date", ["userId", "sessionDate"]) // Index for efficient user activity queries
		.index("by_userId_and_deckId", ["userId", "deckId"]) // Index for deck-specific activity
		.index("by_date", ["sessionDate"]) // Index for date-based queries
		// Compound index to efficiently check for existing sessions and prevent duplicates
		.index("by_unique_session", [
			"userId",
			"sessionDate",
			"deckId",
			"studyMode",
		]), // Index for deck-specific reflections

	// Study Streaks table - tracks daily study streaks for gamification and motivation
	studyStreaks: defineTable({
		currentStreak: v.number(), // ID of the user
		lastMilestone: v.optional(v.number()), // Current consecutive days of study
		lastStudyDate: v.optional(v.string()), // Longest streak ever achieved
		// Metadata
		lastUpdated: v.optional(v.string()), // Last date user studied (YYYY-MM-DD format) - optional for new users
		longestStreak: v.number(), // Date when current streak started (YYYY-MM-DD format) - optional for new users
		// Milestone tracking
		milestonesReached: v.optional(v.array(v.number())), // User's IANA timezone identifier
		streakStartDate: v.optional(v.string()), // Array of milestone numbers reached (e.g., [7, 30, 100]) - defaults to []
		timezone: v.string(), // Last milestone reached
		totalStudyDays: v.number(), // ISO 8601 timestamp of last update - optional for new users
		userId: v.string(), // Total number of days user has studied (not necessarily consecutive)
	})
		.index("by_userId", ["userId"]) // Index for efficient user streak queries
		.index("by_currentStreak", ["currentStreak"]) // Index for leaderboard queries
		.index("by_longestStreak", ["longestStreak"]), // Index for temporal analysis

	// User Achievements table - tracks unlocked achievements and gamification progress
	userAchievements: defineTable({
		achievementId: v.string(), // ID of the user
		triggerType: v.string(), // ID of the unlocked achievement
		unlockedAt: v.number(), // Unix timestamp when achievement was unlocked
		userId: v.string(), // What triggered the achievement (e.g., "study_session", "streak_updated")
	})
		.index("by_userId", ["userId"]) // Index for efficient user achievement queries
		.index("by_achievementId", ["achievementId"]) // Index for achievement statistics
		.index("by_userId_and_achievement", ["userId", "achievementId"]), // Index for user-specific cache cleanup

	// User Preferences table - stores study scheduling and learning preferences
	userPreferences: defineTable({
		availableDays: v.array(v.string()), // ID of the user
		dailyGoal: v.number(), // Preferred time slots for studying
		lastUpdated: v.number(), // Preferred session duration in minutes
		preferredDuration: v.number(), // Daily study goal in cards
		preferredTimeSlots: v.array(v.string()), // Available days of the week
		userId: v.string(), // Unix timestamp of last update
	}).index("by_userId", ["userId"]), // Index for user-specific metrics
});
