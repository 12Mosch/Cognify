import { v } from "convex/values";
import { getTimeSlot, type TimeSlot } from "../src/utils/scheduling";
import { mutation, query } from "./_generated/server";

/**
 * Smart Study Scheduling System
 *
 * This module provides intelligent study session recommendations based on:
 * - User's historical performance patterns
 * - Optimal study times based on success rates
 * - Spaced repetition scheduling optimization
 * - Energy level predictions
 * - Available time slots
 * - Learning velocity and capacity
 */

// Time slot to hour mappings for consistent scheduling
const TIME_SLOT_HOURS: Record<TimeSlot, number> = {
	afternoon: 14,
	early_morning: 7,
	evening: 18,
	late_night: 1,
	morning: 10,
	night: 20,
};

interface StudyRecommendation {
	timeSlot: TimeSlot;
	startTime: string; // HH:MM format
	duration: number; // minutes
	expectedCards: number;
	confidence: number; // 0-1 scale
	reasoning: string;
	priority: "high" | "medium" | "low";
}

interface StudySchedule {
	date: string; // YYYY-MM-DD
	recommendations: StudyRecommendation[];
	totalEstimatedCards: number;
	estimatedStudyTime: number; // minutes
	optimalTimeSlot: TimeSlot;
}

/**
 * Get human-readable time slot name
 */
function getTimeSlotName(slot: TimeSlot): string {
	const names = {
		afternoon: "Afternoon (1-5 PM)",
		early_morning: "Early Morning (5-9 AM)",
		evening: "Evening (5-9 PM)",
		late_night: "Late Night (12-5 AM)",
		morning: "Morning (9 AM-1 PM)",
		night: "Night (9 PM-12 AM)",
	};
	return names[slot];
}

/**
 * Calculate optimal study duration based on learning velocity and available cards
 */
function calculateOptimalDuration(
	learningVelocity: number,
	availableCards: number,
	timeSlotPerformance: number,
): { duration: number; expectedCards: number } {
	// Base duration calculation
	const baseCardsPerMinute = learningVelocity / (24 * 60); // Convert daily velocity to per-minute
	const adjustedCardsPerMinute = baseCardsPerMinute * timeSlotPerformance;

	// Optimal session length (research suggests 20-45 minutes for focused learning)
	const minDuration = 15;
	const maxDuration = 45;
	const optimalDuration = Math.min(
		maxDuration,
		Math.max(minDuration, availableCards / adjustedCardsPerMinute),
	);

	const expectedCards = Math.round(adjustedCardsPerMinute * optimalDuration);

	return {
		duration: Math.round(optimalDuration),
		expectedCards: Math.min(expectedCards, availableCards),
	};
}

/**
 * Determine study session priority based on multiple factors
 */
function calculateStudyPriority(
	performance: { successRate: number; reviewCount: number },
	dueCardCount: number,
	isTopPerformingSlot: boolean,
): "high" | "medium" | "low" {
	const hasHighSuccessRate = performance.successRate >= 0.8;
	const hasSufficientData = performance.reviewCount >= 10;
	const hasManyDueCards = dueCardCount > 10;
	const hasFewDueCards = dueCardCount < 5;
	const hasPoorPerformance = performance.successRate < 0.6;

	// High priority conditions
	if (isTopPerformingSlot && hasManyDueCards && hasHighSuccessRate) {
		return "high";
	}
	if (hasHighSuccessRate && hasSufficientData && dueCardCount >= 5) {
		return "high";
	}

	// Low priority conditions
	if (hasFewDueCards || hasPoorPerformance) {
		return "low";
	}

	// Default to medium priority
	return "medium";
}

/**
 * Generate study recommendations for the next 7 days
 */
export const getStudyRecommendations = query({
	args: {
		daysAhead: v.optional(v.number()), // Default 7 days
		userTimeZone: v.optional(v.string()), // IANA timezone
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const daysAhead = args.daysAhead || 7;

		// Get user's learning pattern
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!learningPattern) {
			return []; // No pattern data available yet
		}

		// Note: Card filtering is handled later in the loop for each day

		// Calculate due cards for each day
		const schedules: StudySchedule[] = [];
		const now = new Date();

		for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
			const targetDate = new Date(now);
			targetDate.setDate(now.getDate() + dayOffset);
			const dateStr = targetDate.toISOString().split("T")[0];

			const dayStart = new Date(targetDate);
			dayStart.setHours(0, 0, 0, 0);
			const dayEnd = new Date(targetDate);
			dayEnd.setHours(23, 59, 59, 999);

			// Count due cards for this day using efficient user-based index
			const userDueCards = await ctx.db
				.query("cards")
				.withIndex("by_userId_and_dueDate", (q) =>
					q.eq("userId", identity.subject).lte("dueDate", dayEnd.getTime()),
				)
				.collect();

			// Generate recommendations for this day
			const recommendations: StudyRecommendation[] = [];

			// Find optimal time slots based on performance
			const timeSlotPerformance = Object.entries(
				learningPattern.timeOfDayPerformance,
			)
				.filter(([_, data]) => data.reviewCount >= 3)
				.sort(([_, a], [__, b]) => b.successRate - a.successRate)
				.slice(0, 3); // Top 3 time slots

			for (const [slot, performance] of timeSlotPerformance) {
				const timeSlot = slot as TimeSlot;
				const { duration, expectedCards } = calculateOptimalDuration(
					learningPattern.learningVelocity,
					userDueCards.length,
					performance.successRate,
				);

				if (expectedCards > 0) {
					// Determine start time for the slot
					const startHour = TIME_SLOT_HOURS[timeSlot];
					const startTime = `${startHour.toString().padStart(2, "0")}:00`;

					// Calculate confidence based on performance and available data
					const confidence = Math.min(
						0.95,
						performance.successRate * (performance.reviewCount / 20),
					);

					// Generate reasoning
					let reasoning = `Based on your ${Math.round(performance.successRate * 100)}% success rate during ${getTimeSlotName(timeSlot).toLowerCase()}`;
					if (performance.reviewCount >= 10) {
						reasoning += ` (${performance.reviewCount} previous sessions)`;
					}

					// Determine priority using helper function
					const isTopPerformingSlot = timeSlotPerformance[0][0] === slot;
					const priority = calculateStudyPriority(
						performance,
						userDueCards.length,
						isTopPerformingSlot,
					);

					recommendations.push({
						confidence,
						duration,
						expectedCards,
						priority,
						reasoning,
						startTime,
						timeSlot,
					});
				}
			}

			// Calculate totals
			const totalEstimatedCards = recommendations.reduce(
				(sum, rec) => sum + rec.expectedCards,
				0,
			);
			const estimatedStudyTime = recommendations.reduce(
				(sum, rec) => sum + rec.duration,
				0,
			);
			const optimalTimeSlot =
				recommendations.length > 0 ? recommendations[0].timeSlot : "morning";

			schedules.push({
				date: dateStr,
				estimatedStudyTime,
				optimalTimeSlot,
				recommendations,
				totalEstimatedCards,
			});
		}

		return schedules;
	},
	returns: v.array(
		v.object({
			date: v.string(),
			estimatedStudyTime: v.number(),
			optimalTimeSlot: v.string(),
			recommendations: v.array(
				v.object({
					confidence: v.number(),
					duration: v.number(),
					expectedCards: v.number(),
					priority: v.union(
						v.literal("high"),
						v.literal("medium"),
						v.literal("low"),
					),
					reasoning: v.string(),
					startTime: v.string(),
					timeSlot: v.string(),
				}),
			),
			totalEstimatedCards: v.number(),
		}),
	),
});

/**
 * Get today's study recommendations with real-time updates
 */
export const getTodayStudyRecommendations = query({
	args: {
		userTimeZone: v.optional(v.string()),
	},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const now = new Date();
		const currentHour = now.getHours();
		const currentTimeSlot = getTimeSlot(currentHour);

		// Get learning pattern
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!learningPattern) {
			return {
				currentTimeSlot,
				dueCardsCount: 0,
				energyLevelPrediction: "medium" as const,
				isOptimalTime: false,
				newCardsAvailable: 0,
			};
		}

		// Check current time slot performance
		const currentSlotPerformance =
			learningPattern.timeOfDayPerformance[currentTimeSlot];
		const isOptimalTime =
			currentSlotPerformance.successRate > 0.75 &&
			currentSlotPerformance.reviewCount >= 5;

		// Find next optimal time
		const futureSlots = Object.entries(learningPattern.timeOfDayPerformance)
			.filter(([slot, data]) => {
				const slotHour = TIME_SLOT_HOURS[slot as TimeSlot];
				return (
					slotHour > currentHour &&
					data.successRate > 0.7 &&
					data.reviewCount >= 3
				);
			})
			.sort(([_, a], [__, b]) => b.successRate - a.successRate);

		const nextOptimalTime =
			futureSlots.length > 0
				? getTimeSlotName(futureSlots[0][0] as TimeSlot)
				: undefined;

		// Count due and new cards using efficient user-based indexes
		const nowTimestamp = Date.now();

		const dueCards = await ctx.db
			.query("cards")
			.withIndex("by_userId_and_dueDate", (q) =>
				q.eq("userId", identity.subject).lte("dueDate", nowTimestamp),
			)
			.collect();

		const newCards = await ctx.db
			.query("cards")
			.withIndex("by_userId_and_repetition", (q) =>
				q.eq("userId", identity.subject).eq("repetition", 0),
			)
			.collect();

		const dueCardsCount = dueCards.length;
		const newCardsAvailable = newCards.length;

		// Predict energy level based on time and historical performance
		let energyLevelPrediction: "high" | "medium" | "low" = "medium";
		if (currentSlotPerformance.successRate > 0.8) {
			energyLevelPrediction = "high";
		} else if (currentSlotPerformance.successRate < 0.6) {
			energyLevelPrediction = "low";
		}

		// Generate immediate recommendation
		let immediateRecommendation:
			| {
					action: string;
					reasoning: string;
					estimatedDuration: number;
					expectedCards: number;
					confidence: number;
			  }
			| undefined;
		if (dueCardsCount > 0 && isOptimalTime) {
			const { duration, expectedCards } = calculateOptimalDuration(
				learningPattern.learningVelocity,
				dueCardsCount,
				currentSlotPerformance.successRate,
			);

			immediateRecommendation = {
				action: "Start studying now",
				confidence: currentSlotPerformance.successRate,
				estimatedDuration: duration,
				expectedCards,
				reasoning: `This is your optimal study time with ${Math.round(currentSlotPerformance.successRate * 100)}% success rate`,
			};
		} else if (dueCardsCount > 0 && !isOptimalTime && nextOptimalTime) {
			immediateRecommendation = {
				action: "Wait for optimal time",
				confidence: 0.6,
				estimatedDuration: 0,
				expectedCards: 0,
				reasoning: `Consider waiting until ${nextOptimalTime} for better performance`,
			};
		}

		return {
			currentTimeSlot,
			dueCardsCount,
			energyLevelPrediction,
			immediateRecommendation,
			isOptimalTime,
			newCardsAvailable,
			nextOptimalTime,
		};
	},
	returns: v.object({
		currentTimeSlot: v.string(),
		dueCardsCount: v.number(),
		energyLevelPrediction: v.union(
			v.literal("high"),
			v.literal("medium"),
			v.literal("low"),
		),
		immediateRecommendation: v.optional(
			v.object({
				action: v.string(),
				confidence: v.number(),
				estimatedDuration: v.number(),
				expectedCards: v.number(),
				reasoning: v.string(),
			}),
		),
		isOptimalTime: v.boolean(),
		newCardsAvailable: v.number(),
		nextOptimalTime: v.optional(v.string()),
	}),
});

/**
 * Record user's study session preferences for better scheduling
 */
export const recordStudyPreferences = mutation({
	args: {
		availableDays: v.array(v.string()),
		dailyGoal: v.number(), // minutes
		preferredDuration: v.number(), // cards per day
		preferredTimeSlots: v.array(v.string()), // days of week
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Store or update user preferences
		const existingPrefs = await ctx.db
			.query("userPreferences")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		const preferencesData = {
			availableDays: args.availableDays,
			dailyGoal: args.dailyGoal,
			lastUpdated: Date.now(),
			preferredDuration: args.preferredDuration,
			preferredTimeSlots: args.preferredTimeSlots,
			userId: identity.subject,
		};

		if (existingPrefs) {
			await ctx.db.patch(existingPrefs._id, preferencesData);
		} else {
			await ctx.db.insert("userPreferences", preferencesData);
		}

		return null;
	},
	returns: v.null(),
});
