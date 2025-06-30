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

	// Card Interactions table - tracks real-time card interactions for adaptive learning
	cardInteractions: defineTable({
		cardId: v.id("cards"), // Reference to the interacted card
		confidenceLevel: v.optional(v.number()), // User's confidence level (1-5)
		deckId: v.id("decks"), // Reference to the deck (for efficient queries)
		difficultyRating: v.optional(v.number()), // User's perceived difficulty (1-5)
		interactionType: v.union(
			v.literal("flip"),
			v.literal("answer"),
			v.literal("difficulty_rating"),
			v.literal("confidence_rating"),
		), // Type of interaction
		processed: v.boolean(), // Whether this interaction has been processed for pattern updates
		quality: v.optional(v.number()), // Quality rating (0-5 scale) for answers
		responseTime: v.optional(v.number()), // Time taken for interaction in milliseconds
		sessionId: v.optional(v.string()), // Session identifier for grouping
		timestamp: v.number(), // Unix timestamp when interaction occurred
		userId: v.string(), // ID of the user who performed the interaction
		wasSuccessful: v.optional(v.boolean()), // Whether the interaction was successful
	})
		.index("by_userId_and_timestamp", ["userId", "timestamp"]) // Index for user interaction history
		.index("by_cardId_and_timestamp", ["cardId", "timestamp"]) // Index for card-specific interactions
		.index("by_sessionId", ["sessionId"]) // Index for session-based queries
		.index("by_processed", ["processed"]) // Index for batch processing unprocessed interactions
		.index("by_userId_and_processed", ["userId", "processed"]), // Index for user-specific processing

	// Card Reviews table - tracks individual review outcomes for retention rate calculation
	cardReviews: defineTable({
		cardId: v.id("cards"), // ID of the user who performed the review
		confidenceRating: v.optional(v.number()), // Reference to the reviewed card
		deckId: v.id("decks"), // Reference to the deck (for efficient queries)
		easeFactorAfter: v.number(), // Unix timestamp when review was performed
		easeFactorBefore: v.number(), // Quality rating (0-5 scale from SM-2 algorithm)
		intervalAfter: v.number(), // Whether the review was successful (quality >= 3)
		intervalBefore: v.number(), // Repetition count before this review
		// Concept mastery integration fields
		masteryAdjustment: v.optional(v.number()), // How much concept mastery influenced SM-2 calculation
		masteryLevel: v.optional(v.number()), // Concept mastery level at time of review (0-1)
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
		back: v.string(), // Back side of the card (answer)
		backImageId: v.optional(v.id("_storage")), // Optional image for back side
		deckId: v.id("decks"), // Reference to the deck this card belongs to
		dueDate: v.optional(v.number()), // Unix timestamp when card is due for review
		easeFactor: v.optional(v.number()), // Ease factor for scheduling (default: 2.5)
		front: v.string(), // Front side of the card (question/prompt)
		frontImageId: v.optional(v.id("_storage")), // Optional image for front side
		interval: v.optional(v.number()), // Days until next review (default: 1)

		// Spaced Repetition fields (SM-2 algorithm)
		repetition: v.optional(v.number()), // Number of successful repetitions (default: 0)
		userId: v.string(), // ID of the user who owns this card (denormalized for performance)
	})
		.index("by_deckId", ["deckId"]) // Index for efficient queries by deck
		.index("by_dueDate", ["dueDate"]) // Index for spaced repetition due date queries
		.index("by_deckId_and_dueDate", ["deckId", "dueDate"]) // Compound index for deck-specific due cards
		.index("by_deckId_and_repetition", ["deckId", "repetition"]) // Index for finding new cards efficiently
		.index("by_userId", ["userId"]) // Index for efficient user-based card queries
		.index("by_userId_and_dueDate", ["userId", "dueDate"]) // Compound index for user's due cards
		.index("by_userId_and_repetition", ["userId", "repetition"]),

	// Concept Masteries table - tracks granular mastery levels for individual concepts
	conceptMasteries: defineTable({
		averageMastery: v.number(), // Average mastery across all concepts
		concepts: v.array(
			v.object({
				averageResponseTime: v.number(),
				conceptId: v.string(),
				conceptKeywords: v.array(v.string()),
				confidenceLevel: v.number(),
				difficultyTrend: v.union(
					v.literal("improving"),
					v.literal("stable"),
					v.literal("declining"),
				),
				lastReviewed: v.number(),
				learningVelocity: v.number(),
				masteryCategory: v.union(
					v.literal("beginner"),
					v.literal("intermediate"),
					v.literal("advanced"),
					v.literal("expert"),
				),
				masteryLevel: v.number(),
				relatedConcepts: v.array(
					v.object({
						conceptId: v.string(),
						mutualReinforcementScore: v.number(),
						relationshipStrength: v.number(),
						relationshipType: v.union(
							v.literal("prerequisite"),
							v.literal("related"),
							v.literal("advanced"),
						),
					}),
				),
				retentionStrength: v.number(),
				reviewCount: v.number(),
				strugglingAreas: v.array(
					v.object({
						firstDetected: v.number(),
						issueType: v.union(
							v.literal("inconsistent"),
							v.literal("plateau"),
							v.literal("declining"),
							v.literal("slow_response"),
						),
						lastOccurrence: v.number(),
						recommendedAction: v.string(),
						severity: v.number(),
					}),
				),
				successRate: v.number(),
			}),
		),
		deckId: v.optional(v.id("decks")), // Optional deck filter
		lastCalculated: v.number(), // Unix timestamp of last calculation
		totalConcepts: v.number(), // Total number of concepts tracked
		userId: v.string(), // ID of the user
	})
		.index("by_userId", ["userId"]) // Index for user-specific mastery queries
		.index("by_deckId", ["deckId"]) // Index for deck-specific mastery
		.index("by_lastCalculated", ["lastCalculated"]), // Index for finding stale data

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

	// Learning Pattern Cache table - caches frequently accessed learning patterns for performance
	learningPatternCache: defineTable({
		accessCount: v.number(), // Number of times this cache entry was accessed
		cachedAt: v.number(), // Unix timestamp when cached
		lastAccessed: v.number(), // Unix timestamp of last access
		patterns: v.object({
			_creationTime: v.number(),
			_id: v.id("learningPatterns"),
			averageSuccessRate: v.number(),
			difficultyPatterns: v.object({
				easyCards: v.object({
					averageInterval: v.number(),
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					successRate: v.number(),
				}),
				hardCards: v.object({
					averageInterval: v.number(),
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					successRate: v.number(),
				}),
				mediumCards: v.object({
					averageInterval: v.number(),
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					successRate: v.number(),
				}),
			}),
			inconsistencyPatterns: v.object({
				averageVariance: v.number(),
				cardIds: v.array(v.string()),
				detectionThreshold: v.number(),
				lastCalculated: v.number(),
			}),
			lastUpdated: v.number(),
			learningVelocity: v.number(),
			personalEaseFactorBias: v.number(),
			personalizationConfig: v.object({
				adaptDifficultyProgression: v.boolean(),
				focusOnPlateauTopics: v.boolean(),
				learningPatternInfluence: v.number(),
				optimizeForTimeOfDay: v.boolean(),
				prioritizeInconsistentCards: v.boolean(),
			}),
			plateauDetection: v.object({
				lastAnalyzed: v.number(),
				plateauThreshold: v.number(),
				stagnantTopics: v.array(
					v.object({
						averagePerformance: v.number(),
						cardIds: v.array(v.string()),
						lastImprovement: v.number(),
						plateauDuration: v.number(),
						topicKeywords: v.array(v.string()),
					}),
				),
			}),
			recentPerformanceTrends: v.object({
				last7Days: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				last14Days: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				lastUpdated: v.number(),
				trend: v.object({
					confidenceChange: v.number(),
					responseTimeChange: v.number(),
					successRateChange: v.number(),
				}),
			}),
			retentionCurve: v.array(
				v.object({
					interval: v.number(),
					retentionRate: v.number(),
				}),
			),
			timeOfDayPerformance: v.object({
				afternoon: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				early_morning: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				evening: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				late_night: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				morning: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
				night: v.object({
					averageResponseTime: v.number(),
					confidenceLevel: v.number(),
					optimalForLearning: v.boolean(),
					reviewCount: v.number(),
					successRate: v.number(),
				}),
			}),
			userId: v.string(),
		}), // Cached learning patterns data
		userId: v.string(), // ID of the user
	})
		.index("by_userId", ["userId"]) // Index for user-specific cache queries
		.index("by_cachedAt", ["cachedAt"]) // Index for cache eviction
		.index("by_lastAccessed", ["lastAccessed"]), // Index for LRU eviction

	// Learning Patterns table - stores personalized learning analytics for adaptive algorithm
	learningPatterns: defineTable({
		averageSuccessRate: v.number(), // Overall success rate across all reviews

		// Difficulty-based performance patterns
		difficultyPatterns: v.object({
			easyCards: v.object({
				averageInterval: v.number(),
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				successRate: v.number(),
			}),
			hardCards: v.object({
				averageInterval: v.number(),
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				successRate: v.number(),
			}),
			mediumCards: v.object({
				averageInterval: v.number(),
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				successRate: v.number(),
			}),
		}),

		// Inconsistency patterns - cards where user alternates between correct/incorrect
		inconsistencyPatterns: v.object({
			averageVariance: v.number(), // Average success rate variance across inconsistent cards
			cardIds: v.array(v.string()), // Cards with high variance in performance
			detectionThreshold: v.number(), // Variance threshold used (default: 0.3)
			lastCalculated: v.number(),
		}),

		lastUpdated: v.number(), // Unix timestamp of last pattern update
		learningVelocity: v.number(), // Cards mastered per day
		personalEaseFactorBias: v.number(), // Personal adjustment to base ease factor (-0.5 to +0.5)

		// Personalization configuration
		personalizationConfig: v.object({
			adaptDifficultyProgression: v.boolean(),
			focusOnPlateauTopics: v.boolean(),
			learningPatternInfluence: v.number(), // 0-1, how much to weight learning patterns vs SRS
			optimizeForTimeOfDay: v.boolean(),
			prioritizeInconsistentCards: v.boolean(),
		}),

		// Plateau detection - topics where performance has stagnated
		plateauDetection: v.object({
			lastAnalyzed: v.number(),
			plateauThreshold: v.number(), // Days without improvement to consider plateau (default: 14)
			stagnantTopics: v.array(
				v.object({
					averagePerformance: v.number(), // Current performance level
					cardIds: v.array(v.string()), // Cards in this topic showing plateau
					lastImprovement: v.number(), // Timestamp of last improvement
					plateauDuration: v.number(), // Days since improvement stopped
					topicKeywords: v.array(v.string()), // Keywords representing the topic
				}),
			),
		}),

		// Recent performance trends - rolling averages over time windows
		recentPerformanceTrends: v.object({
			last7Days: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			last14Days: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			lastUpdated: v.number(),
			trend: v.object({
				confidenceChange: v.number(), // Change in confidence level
				responseTimeChange: v.number(), // Change in ms
				successRateChange: v.number(), // Percentage change from 14d to 7d
			}),
		}),

		retentionCurve: v.array(
			v.object({
				interval: v.number(), // Interval in days
				retentionRate: v.number(), // Retention rate at this interval (0-1)
			}),
		),

		// Time-of-day performance breakdown
		timeOfDayPerformance: v.object({
			afternoon: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(), // Whether this time is optimal for this user
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			early_morning: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			evening: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			late_night: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			morning: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
			night: v.object({
				averageResponseTime: v.number(),
				confidenceLevel: v.number(),
				optimalForLearning: v.boolean(),
				reviewCount: v.number(),
				successRate: v.number(),
			}),
		}),

		userId: v.string(), // ID of the user
	})
		.index("by_userId", ["userId"]) // Index for efficient user pattern queries
		.index("by_lastUpdated", ["lastUpdated"]), // Index for user-specific operation analysis

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
		.index("by_deckId", ["deckId"]), // Index for finding patterns that need updating

	// Performance Metrics table - tracks performance metrics for real-time adaptive learning operations
	performanceMetrics: defineTable({
		batchSize: v.optional(v.number()), // Size of batch processed (if applicable)
		cacheHit: v.optional(v.boolean()), // Whether operation used cached data
		duration: v.number(), // Duration of operation in milliseconds
		errorOccurred: v.optional(v.boolean()), // Whether an error occurred during operation
		operationType: v.string(), // Type of operation performed
		timestamp: v.number(), // Unix timestamp when operation occurred
		userId: v.string(), // ID of the user
	})
		.index("by_userId", ["userId"]) // Index for user-specific metrics
		.index("by_operationType", ["operationType"]) // Index for operation type analysis
		.index("by_timestamp", ["timestamp"]) // Index for temporal analysis
		.index("by_userId_and_operationType", ["userId", "operationType"]), // Index for efficient user preference queries

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

	// Study Path Regeneration table - tracks dynamic study path changes for real-time adaptation
	studyPathRegeneration: defineTable({
		deckId: v.id("decks"), // Reference to the deck
		newOrder: v.array(v.string()), // New card order after regeneration
		originalOrder: v.array(v.string()), // Original card order before regeneration
		priorityScores: v.array(
			v.object({
				boosts: v.array(v.string()),
				cardId: v.string(),
				reasoning: v.string(),
				score: v.number(),
			}),
		), // Priority scores and reasoning for each card
		sessionId: v.string(), // Session identifier
		timestamp: v.number(), // Unix timestamp when regeneration occurred
		triggerReason: v.string(), // Reason for regeneration
		userId: v.string(), // ID of the user
	})
		.index("by_userId", ["userId"]) // Index for user-specific regenerations
		.index("by_sessionId", ["sessionId"]) // Index for session-specific queries
		.index("by_deckId", ["deckId"]) // Index for deck-specific regenerations
		.index("by_timestamp", ["timestamp"]), // Index for deck-specific reflections

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
		]), // Index for temporal analysis

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
