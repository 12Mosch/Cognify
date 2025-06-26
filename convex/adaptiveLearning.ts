import { v } from "convex/values";
import { getTimeSlot, type TimeSlot } from "../src/utils/scheduling";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

/**
 * Adaptive Learning Algorithm for Personalized Spaced Repetition
 *
 * This module enhances the standard SM-2 algorithm with personalized adaptations
 * based on individual learning patterns, performance history, and contextual factors.
 *
 * Key Features:
 * - Personal learning velocity tracking
 * - Time-of-day performance optimization
 * - Difficulty pattern recognition
 * - Adaptive ease factor adjustments
 * - Retention prediction and early intervention
 */

// Learning pattern analysis constants
const LEARNING_VELOCITY_WINDOW = 30; // Days to analyze for velocity
const PERFORMANCE_HISTORY_LIMIT = 100; // Recent reviews to consider
// const TIME_SLOT_HOURS = 4; // Group hours into 6 time slots per day (unused for now)
const MIN_REVIEWS_FOR_ADAPTATION = 20; // Minimum reviews before personalizing

/**
 * Learning pattern data structure
 */
interface LearningPattern {
	userId: string;
	averageSuccessRate: number;
	learningVelocity: number; // Cards mastered per day
	timeOfDayPerformance: Record<
		TimeSlot,
		{
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
		}
	>;
	difficultyPatterns: {
		easyCards: { successRate: number; averageInterval: number };
		mediumCards: { successRate: number; averageInterval: number };
		hardCards: { successRate: number; averageInterval: number };
	};
	personalEaseFactorBias: number; // Adjustment to base ease factor
	retentionCurve: Array<{ interval: number; retentionRate: number }>;
	lastUpdated: number;
}

/**
 * Calculate personalized ease factor adjustment
 */
function calculatePersonalizedEaseFactor(
	baseEaseFactor: number,
	learningPattern: LearningPattern,
	currentHour: number,
	cardDifficulty: "easy" | "medium" | "hard",
): number {
	let adjustedEaseFactor = baseEaseFactor;

	// Apply personal bias
	adjustedEaseFactor += learningPattern.personalEaseFactorBias;

	// Time-of-day adjustment
	const timeSlot = getTimeSlot(currentHour);
	const timePerformance = learningPattern.timeOfDayPerformance[timeSlot];
	if (timePerformance.reviewCount >= 5) {
		const timeAdjustment = (timePerformance.successRate - 0.75) * 0.2;
		adjustedEaseFactor += timeAdjustment;
	}

	// Difficulty pattern adjustment
	const difficultyData =
		learningPattern.difficultyPatterns[
			(cardDifficulty +
				"Cards") as keyof typeof learningPattern.difficultyPatterns
		];
	if (difficultyData.successRate < 0.6) {
		adjustedEaseFactor -= 0.1; // Make intervals shorter for consistently difficult cards
	} else if (difficultyData.successRate > 0.9) {
		adjustedEaseFactor += 0.1; // Make intervals longer for consistently easy cards
	}

	// Ensure ease factor stays within reasonable bounds
	return Math.max(1.3, Math.min(3.0, adjustedEaseFactor));
}

/**
 * Enhanced SM-2 calculation with adaptive learning
 */
function calculateAdaptiveSM2(
	quality: number,
	repetition: number,
	easeFactor: number,
	interval: number,
	learningPattern?: LearningPattern,
	currentHour: number = new Date().getHours(),
): {
	repetition: number;
	easeFactor: number;
	interval: number;
	dueDate: number;
	confidence: number;
} {
	let newRepetition: number;
	let newEaseFactor = easeFactor;
	let newInterval: number;
	let confidence = 0.5; // Default confidence

	// Standard SM-2 logic
	if (quality < 3) {
		newRepetition = 0;
		newInterval = 1;
	} else {
		newRepetition = repetition + 1;

		if (newRepetition === 1) {
			newInterval = 1;
		} else if (newRepetition === 2) {
			newInterval = 6;
		} else {
			newInterval = Math.round(interval * easeFactor);
		}

		// Update ease factor
		newEaseFactor =
			easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
		newEaseFactor = Math.max(1.3, newEaseFactor);
	}

	// Apply adaptive learning if pattern data is available
	if (learningPattern) {
		const cardDifficulty: "easy" | "medium" | "hard" =
			easeFactor > 2.2 ? "easy" : easeFactor < 1.8 ? "hard" : "medium";

		newEaseFactor = calculatePersonalizedEaseFactor(
			newEaseFactor,
			learningPattern,
			currentHour,
			cardDifficulty,
		);

		// Adjust interval based on learning velocity
		if (learningPattern.learningVelocity > 1.5) {
			// Fast learner - can handle slightly longer intervals
			newInterval = Math.round(newInterval * 1.1);
		} else if (learningPattern.learningVelocity < 0.5) {
			// Slower learner - use shorter intervals
			newInterval = Math.round(newInterval * 0.9);
		}

		// Calculate confidence based on historical performance
		const timeSlot = getTimeSlot(currentHour);
		const timePerformance = learningPattern.timeOfDayPerformance[timeSlot];
		confidence =
			timePerformance.reviewCount >= 5 ? timePerformance.successRate : 0.5;
	}

	// Calculate due date
	const now = Date.now();
	const millisecondsPerDay = 24 * 60 * 60 * 1000;
	const dueDate = now + newInterval * millisecondsPerDay;

	return {
		confidence,
		dueDate,
		easeFactor: newEaseFactor,
		interval: newInterval,
		repetition: newRepetition,
	};
}

/**
 * Get or create learning pattern for user
 */
export const getUserLearningPattern = query({
	args: {},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const pattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		return pattern || null;
	},
	returns: v.union(
		v.object({
			_creationTime: v.number(),
			_id: v.id("learningPatterns"),
			averageSuccessRate: v.float64(),
			difficultyPatterns: v.object({
				easyCards: v.object({
					averageInterval: v.float64(),
					successRate: v.float64(),
				}),
				hardCards: v.object({
					averageInterval: v.float64(),
					successRate: v.float64(),
				}),
				mediumCards: v.object({
					averageInterval: v.float64(),
					successRate: v.float64(),
				}),
			}),
			lastUpdated: v.float64(),
			learningVelocity: v.float64(),
			personalEaseFactorBias: v.float64(),
			retentionCurve: v.array(
				v.object({
					interval: v.float64(),
					retentionRate: v.float64(),
				}),
			),
			timeOfDayPerformance: v.object({
				afternoon: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				early_morning: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				evening: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				late_night: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				morning: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				night: v.object({
					averageResponseTime: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
			}),
			userId: v.string(),
		}),
		v.null(),
	),
});

/**
 * Review card with adaptive learning algorithm
 */
export const reviewCardAdaptive = mutation({
	args: {
		cardId: v.id("cards"),
		confidenceRating: v.optional(v.number()),
		quality: v.number(),
		responseTime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Get card and verify ownership
		const card = await ctx.db.get(args.cardId);
		if (!card) {
			throw new Error("Card not found");
		}

		// deepcode ignore Sqli: <No SQL injection risk in Convex>
  		const deck = await ctx.db.get(card.deckId);
		if (!deck || deck.userId !== identity.subject) {
			throw new Error("You can only review your own cards");
		}

		// Get user's learning pattern
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Get current card parameters
		const currentRepetition = card.repetition ?? 0;
		const currentEaseFactor = card.easeFactor ?? 2.5;
		const currentInterval = card.interval ?? 1;

		// Calculate new parameters with adaptive algorithm
		const result = calculateAdaptiveSM2(
			args.quality,
			currentRepetition,
			currentEaseFactor,
			currentInterval,
			learningPattern || undefined,
		);

		// Update card
		await ctx.db.patch(args.cardId, {
			dueDate: result.dueDate,
			easeFactor: result.easeFactor,
			interval: result.interval,
			repetition: result.repetition,
		});

		// Record detailed review for pattern analysis
		await ctx.db.insert("cardReviews", {
			cardId: args.cardId,
			confidenceRating: args.confidenceRating,
			deckId: card.deckId,
			easeFactorAfter: result.easeFactor,
			easeFactorBefore: currentEaseFactor,
			intervalAfter: result.interval,
			intervalBefore: currentInterval,
			predictedConfidence: result.confidence,
			quality: args.quality,
			repetitionAfter: result.repetition,
			repetitionBefore: currentRepetition,
			responseTime: args.responseTime,
			reviewDate: Date.now(),
			studyMode: "adaptive-spaced-repetition",
			timeOfDay: new Date().getHours(),
			userId: identity.subject,
			wasSuccessful: args.quality >= 3,
		});

		// Generate personalized message
		let personalizedMessage = "Great job! ";
		if (result.confidence > 0.8) {
			personalizedMessage += "You're mastering this topic well!";
		} else if (result.confidence < 0.4) {
			personalizedMessage +=
				"This seems challenging - consider reviewing related concepts.";
		} else {
			personalizedMessage += "You're making steady progress!";
		}

		// Trigger learning pattern update (async)
		await ctx.scheduler.runAfter(
			0,
			api.adaptiveLearning.updateLearningPattern,
			{
				userId: identity.subject,
			},
		);

		return {
			confidence: result.confidence,
			nextReviewDate: result.dueDate,
			personalizedMessage,
			success: true,
		};
	},
	returns: v.object({
		confidence: v.number(),
		nextReviewDate: v.number(),
		personalizedMessage: v.string(),
		success: v.boolean(),
	}),
});

/**
 * Update user's learning pattern based on recent review history
 * This runs asynchronously after each review to maintain up-to-date patterns
 */
export const updateLearningPattern = mutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get recent reviews for pattern analysis
		const cutoffDate =
			Date.now() - LEARNING_VELOCITY_WINDOW * 24 * 60 * 60 * 1000;
		const recentReviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) =>
				q.eq("userId", args.userId).gte("reviewDate", cutoffDate),
			)
			.order("desc")
			.take(PERFORMANCE_HISTORY_LIMIT);

		if (recentReviews.length < MIN_REVIEWS_FOR_ADAPTATION) {
			return null; // Not enough data for meaningful patterns
		}

		// Calculate overall success rate
		const successfulReviews = recentReviews.filter(
			(r) => r.wasSuccessful,
		).length;
		const averageSuccessRate = successfulReviews / recentReviews.length;

		// Calculate learning velocity (cards mastered per day)
		const masteredCards = recentReviews.filter(
			(r) => r.repetitionAfter >= 3,
		).length;
		const daysCovered = Math.max(
			1,
			(Date.now() - recentReviews[recentReviews.length - 1].reviewDate) /
				(24 * 60 * 60 * 1000),
		);
		const learningVelocity = masteredCards / daysCovered;

		// Analyze time-of-day performance
		const timeSlotData: Record<
			TimeSlot,
			{ successes: number; total: number; totalResponseTime: number }
		> = {
			afternoon: { successes: 0, total: 0, totalResponseTime: 0 },
			early_morning: { successes: 0, total: 0, totalResponseTime: 0 },
			evening: { successes: 0, total: 0, totalResponseTime: 0 },
			late_night: { successes: 0, total: 0, totalResponseTime: 0 },
			morning: { successes: 0, total: 0, totalResponseTime: 0 },
			night: { successes: 0, total: 0, totalResponseTime: 0 },
		};

		for (const review of recentReviews) {
			if (review.timeOfDay !== undefined) {
				const timeSlot = getTimeSlot(review.timeOfDay);
				timeSlotData[timeSlot].total++;
				if (review.wasSuccessful) {
					timeSlotData[timeSlot].successes++;
				}
				if (review.responseTime) {
					timeSlotData[timeSlot].totalResponseTime += review.responseTime;
				}
			}
		}

		const timeOfDayPerformance: LearningPattern["timeOfDayPerformance"] = {
			afternoon: { averageResponseTime: 0, reviewCount: 0, successRate: 0.5 },
			early_morning: {
				averageResponseTime: 0,
				reviewCount: 0,
				successRate: 0.5,
			},
			evening: { averageResponseTime: 0, reviewCount: 0, successRate: 0.5 },
			late_night: { averageResponseTime: 0, reviewCount: 0, successRate: 0.5 },
			morning: { averageResponseTime: 0, reviewCount: 0, successRate: 0.5 },
			night: { averageResponseTime: 0, reviewCount: 0, successRate: 0.5 },
		};

		for (const [slot, data] of Object.entries(timeSlotData)) {
			timeOfDayPerformance[slot as TimeSlot] = {
				averageResponseTime:
					data.total > 0 ? data.totalResponseTime / data.total : 0,
				reviewCount: data.total,
				successRate: data.total > 0 ? data.successes / data.total : 0.5,
			};
		}

		// Analyze difficulty patterns
		const difficultyData = {
			easy: { successes: 0, total: 0, totalInterval: 0 },
			hard: { successes: 0, total: 0, totalInterval: 0 },
			medium: { successes: 0, total: 0, totalInterval: 0 },
		};

		for (const review of recentReviews) {
			const difficulty =
				review.easeFactorBefore > 2.2
					? "easy"
					: review.easeFactorBefore < 1.8
						? "hard"
						: "medium";

			difficultyData[difficulty].total++;
			if (review.wasSuccessful) {
				difficultyData[difficulty].successes++;
			}
			difficultyData[difficulty].totalInterval += review.intervalAfter;
		}

		const difficultyPatterns: LearningPattern["difficultyPatterns"] = {
			easyCards: {
				averageInterval:
					difficultyData.easy.total > 0
						? difficultyData.easy.totalInterval / difficultyData.easy.total
						: 7,
				successRate:
					difficultyData.easy.total > 0
						? difficultyData.easy.successes / difficultyData.easy.total
						: 0.8,
			},
			hardCards: {
				averageInterval:
					difficultyData.hard.total > 0
						? difficultyData.hard.totalInterval / difficultyData.hard.total
						: 3,
				successRate:
					difficultyData.hard.total > 0
						? difficultyData.hard.successes / difficultyData.hard.total
						: 0.6,
			},
			mediumCards: {
				averageInterval:
					difficultyData.medium.total > 0
						? difficultyData.medium.totalInterval / difficultyData.medium.total
						: 5,
				successRate:
					difficultyData.medium.total > 0
						? difficultyData.medium.successes / difficultyData.medium.total
						: 0.7,
			},
		};

		// Calculate personal ease factor bias
		const averageEaseFactorAfter =
			recentReviews.reduce((sum, r) => sum + r.easeFactorAfter, 0) /
			recentReviews.length;
		const personalEaseFactorBias = Math.max(
			-0.5,
			Math.min(0.5, averageEaseFactorAfter - 2.5),
		);

		// Build retention curve (simplified)
		const retentionCurve = [
			{ interval: 1, retentionRate: Math.min(0.95, averageSuccessRate + 0.1) },
			{ interval: 7, retentionRate: averageSuccessRate },
			{ interval: 30, retentionRate: Math.max(0.5, averageSuccessRate - 0.1) },
			{ interval: 90, retentionRate: Math.max(0.4, averageSuccessRate - 0.2) },
		];

		// Create or update learning pattern
		const existingPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.first();

		const patternData: Omit<LearningPattern, "userId"> = {
			averageSuccessRate,
			difficultyPatterns,
			lastUpdated: Date.now(),
			learningVelocity,
			personalEaseFactorBias,
			retentionCurve,
			timeOfDayPerformance,
		};

		if (existingPattern) {
			await ctx.db.patch(existingPattern._id, patternData);
		} else {
			await ctx.db.insert("learningPatterns", {
				userId: args.userId,
				...patternData,
			});
		}

		return null;
	},
	returns: v.null(),
});

/**
 * Get comprehensive learning insights for analytics dashboard
 */
export const getLearningInsights = query({
	args: {
		timeRange: v.optional(
			v.union(
				v.literal("7d"),
				v.literal("30d"),
				v.literal("90d"),
				v.literal("1y"),
			),
		),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Get learning pattern
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!learningPattern) {
			return {
				learningPattern: null,
				predictions: {
					masteryPrediction: [],
					optimalStudyLoad: 20,
				},
				recommendations: [],
				trends: {
					learningVelocityTrend: 0,
					retentionTrend: 0,
					successRateTrend: 0,
				},
			};
		}

		// Calculate time range for analysis
		const timeRange = args.timeRange || "30d";
		const daysBack =
			timeRange === "7d"
				? 7
				: timeRange === "30d"
					? 30
					: timeRange === "90d"
						? 90
						: 365;
		const cutoffDate = Date.now() - daysBack * 24 * 60 * 60 * 1000;

		// Get recent reviews for trend analysis
		const recentReviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) =>
				q.eq("userId", identity.subject).gte("reviewDate", cutoffDate),
			)
			.collect();

		// Generate recommendations
		const recommendations = [];

		// Time-based recommendations
		const timePerformance = Object.entries(learningPattern.timeOfDayPerformance)
			.filter(([_, data]) => data.reviewCount >= 5)
			.sort(([_, a], [__, b]) => b.successRate - a.successRate);

		if (timePerformance.length > 0) {
			const bestTime = timePerformance[0];
			recommendations.push({
				actionable: true,
				description: `Your best performance is during ${bestTime[0].replace(/_/g, " ")} with ${Math.round(bestTime[1].successRate * 100)}% success rate.`,
				priority: "high" as const,
				title: "Optimize Your Study Time",
				type: "time_optimization",
			});
		}

		// Difficulty-based recommendations
		const hardCardsSuccess =
			learningPattern.difficultyPatterns.hardCards.successRate;
		if (hardCardsSuccess < 0.6) {
			recommendations.push({
				actionable: true,
				description: `Your success rate with difficult cards is ${Math.round(hardCardsSuccess * 100)}%. Consider shorter intervals or additional review techniques.`,
				priority: "medium" as const,
				title: "Focus on Difficult Cards",
				type: "difficulty_management",
			});
		}

		// Learning velocity recommendations
		if (learningPattern.learningVelocity < 0.5) {
			recommendations.push({
				actionable: true,
				description:
					"Your learning velocity is below optimal. Consider shorter, more frequent study sessions.",
				priority: "medium" as const,
				title: "Increase Study Frequency",
				type: "velocity_improvement",
			});
		}

		// Calculate trends (simplified)
		const halfwayPoint = cutoffDate + (Date.now() - cutoffDate) / 2;
		const firstHalf = recentReviews.filter((r) => r.reviewDate < halfwayPoint);
		const secondHalf = recentReviews.filter(
			(r) => r.reviewDate >= halfwayPoint,
		);

		const firstHalfSuccess =
			firstHalf.length > 0
				? firstHalf.filter((r) => r.wasSuccessful).length / firstHalf.length
				: 0;
		const secondHalfSuccess =
			secondHalf.length > 0
				? secondHalf.filter((r) => r.wasSuccessful).length / secondHalf.length
				: 0;

		const successRateTrend =
			firstHalfSuccess > 0
				? ((secondHalfSuccess - firstHalfSuccess) / firstHalfSuccess) * 100
				: 0;

		// Get user's decks for mastery prediction
		const userDecks = await ctx.db
			.query("decks")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.collect();

		const masteryPredictions = userDecks.slice(0, 3).map((deck) => ({
			confidence: 0.75,
			deckId: deck._id,
			deckName: deck.name, // Simplified: 30 days
			estimatedMasteryDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
		}));

		return {
			learningPattern,
			predictions: {
				masteryPrediction: masteryPredictions,
				optimalStudyLoad: Math.max(
					10,
					Math.min(50, Math.round(learningPattern.learningVelocity * 20)),
				),
			},
			recommendations,
			trends: {
				learningVelocityTrend: 0,
				retentionTrend: 0, // Simplified
				successRateTrend, // Simplified
			},
		};
	},
	returns: v.object({
		learningPattern: v.union(
			v.object({
				_creationTime: v.number(),
				_id: v.id("learningPatterns"),
				averageSuccessRate: v.float64(),
				difficultyPatterns: v.object({
					easyCards: v.object({
						averageInterval: v.float64(),
						successRate: v.float64(),
					}),
					hardCards: v.object({
						averageInterval: v.float64(),
						successRate: v.float64(),
					}),
					mediumCards: v.object({
						averageInterval: v.float64(),
						successRate: v.float64(),
					}),
				}),
				lastUpdated: v.float64(),
				learningVelocity: v.float64(),
				personalEaseFactorBias: v.float64(),
				retentionCurve: v.array(
					v.object({
						interval: v.float64(),
						retentionRate: v.float64(),
					}),
				),
				timeOfDayPerformance: v.object({
					afternoon: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
					early_morning: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
					evening: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
					late_night: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
					morning: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
					night: v.object({
						averageResponseTime: v.float64(),
						reviewCount: v.float64(),
						successRate: v.float64(),
					}),
				}),
				userId: v.string(),
			}),
			v.null(),
		),
		predictions: v.object({
			masteryPrediction: v.array(
				v.object({
					confidence: v.number(),
					deckId: v.id("decks"),
					deckName: v.string(),
					estimatedMasteryDate: v.number(),
				}),
			),
			optimalStudyLoad: v.number(), // Recommended daily cards
		}),
		recommendations: v.array(
			v.object({
				actionable: v.boolean(),
				description: v.string(),
				priority: v.union(
					v.literal("high"),
					v.literal("medium"),
					v.literal("low"),
				),
				title: v.string(),
				type: v.string(),
			}),
		),
		trends: v.object({
			learningVelocityTrend: v.number(), // Percentage change
			retentionTrend: v.number(),
			successRateTrend: v.number(),
		}),
	}),
});
