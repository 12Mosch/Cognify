import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

// Time slot definitions for scheduling
type TimeSlot = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

interface StudyRecommendation {
  timeSlot: TimeSlot;
  startTime: string; // HH:MM format
  duration: number; // minutes
  expectedCards: number;
  confidence: number; // 0-1 scale
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

interface StudySchedule {
  date: string; // YYYY-MM-DD
  recommendations: StudyRecommendation[];
  totalEstimatedCards: number;
  estimatedStudyTime: number; // minutes
  optimalTimeSlot: TimeSlot;
}

/**
 * Get time slot from hour (0-23)
 */
function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 9) return 'early_morning';
  if (hour >= 9 && hour < 13) return 'morning';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'late_night';
}

/**
 * Get human-readable time slot name
 */
function getTimeSlotName(slot: TimeSlot): string {
  const names = {
    early_morning: 'Early Morning (5-9 AM)',
    morning: 'Morning (9 AM-1 PM)',
    afternoon: 'Afternoon (1-5 PM)',
    evening: 'Evening (5-9 PM)',
    night: 'Night (9 PM-12 AM)',
    late_night: 'Late Night (12-5 AM)',
  };
  return names[slot];
}

/**
 * Calculate optimal study duration based on learning velocity and available cards
 */
function calculateOptimalDuration(
  learningVelocity: number,
  availableCards: number,
  timeSlotPerformance: number
): { duration: number; expectedCards: number } {
  // Base duration calculation
  const baseCardsPerMinute = learningVelocity / (24 * 60); // Convert daily velocity to per-minute
  const adjustedCardsPerMinute = baseCardsPerMinute * timeSlotPerformance;

  // Optimal session length (research suggests 20-45 minutes for focused learning)
  const minDuration = 15;
  const maxDuration = 45;
  const optimalDuration = Math.min(maxDuration, Math.max(minDuration, availableCards / adjustedCardsPerMinute));

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
  isTopPerformingSlot: boolean
): 'high' | 'medium' | 'low' {
  const hasHighSuccessRate = performance.successRate >= 0.8;
  const hasSufficientData = performance.reviewCount >= 10;
  const hasManyDueCards = dueCardCount > 10;
  const hasFewDueCards = dueCardCount < 5;
  const hasPoorPerformance = performance.successRate < 0.6;

  // High priority conditions
  if (isTopPerformingSlot && hasManyDueCards && hasHighSuccessRate) {
    return 'high';
  }
  if (hasHighSuccessRate && hasSufficientData && dueCardCount >= 5) {
    return 'high';
  }

  // Low priority conditions
  if (hasFewDueCards || hasPoorPerformance) {
    return 'low';
  }

  // Default to medium priority
  return 'medium';
}

/**
 * Generate study recommendations for the next 7 days
 */
export const getStudyRecommendations = query({
  args: {
    daysAhead: v.optional(v.number()), // Default 7 days
    userTimeZone: v.optional(v.string()), // IANA timezone
  },
  returns: v.array(v.object({
    date: v.string(),
    recommendations: v.array(v.object({
      timeSlot: v.string(),
      startTime: v.string(),
      duration: v.number(),
      expectedCards: v.number(),
      confidence: v.number(),
      reasoning: v.string(),
      priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    })),
    totalEstimatedCards: v.number(),
    estimatedStudyTime: v.number(),
    optimalTimeSlot: v.string(),
  })),
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
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Count due cards for this day using efficient user-based index
      const userDueCards = await ctx.db
        .query("cards")
        .withIndex("by_userId_and_dueDate", (q) =>
          q.eq("userId", identity.subject).lte("dueDate", dayEnd.getTime())
        )
        .filter((q) => q.gte(q.field("dueDate"), 0))
        .collect();

      // Generate recommendations for this day
      const recommendations: StudyRecommendation[] = [];
      
      // Find optimal time slots based on performance
      const timeSlotPerformance = Object.entries(learningPattern.timeOfDayPerformance)
        .filter(([_, data]) => data.reviewCount >= 3)
        .sort(([_, a], [__, b]) => b.successRate - a.successRate)
        .slice(0, 3); // Top 3 time slots

      for (const [slot, performance] of timeSlotPerformance) {
        const timeSlot = slot as TimeSlot;
        const { duration, expectedCards } = calculateOptimalDuration(
          learningPattern.learningVelocity,
          userDueCards.length,
          performance.successRate
        );

        if (expectedCards > 0) {
          // Determine start time for the slot
          const slotHours = {
            early_morning: 7,
            morning: 10,
            afternoon: 14,
            evening: 18,
            night: 20,
            late_night: 1,
          };

          const startHour = slotHours[timeSlot];
          const startTime = `${startHour.toString().padStart(2, '0')}:00`;

          // Calculate confidence based on performance and available data
          const confidence = Math.min(0.95, performance.successRate * (performance.reviewCount / 20));

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
            isTopPerformingSlot
          );

          recommendations.push({
            timeSlot,
            startTime,
            duration,
            expectedCards,
            confidence,
            reasoning,
            priority,
          });
        }
      }

      // Calculate totals
      const totalEstimatedCards = recommendations.reduce((sum, rec) => sum + rec.expectedCards, 0);
      const estimatedStudyTime = recommendations.reduce((sum, rec) => sum + rec.duration, 0);
      const optimalTimeSlot = recommendations.length > 0 ? recommendations[0].timeSlot : 'morning';

      schedules.push({
        date: dateStr,
        recommendations,
        totalEstimatedCards,
        estimatedStudyTime,
        optimalTimeSlot,
      });
    }

    return schedules;
  },
});

/**
 * Get today's study recommendations with real-time updates
 */
export const getTodayStudyRecommendations = query({
  args: {
    userTimeZone: v.optional(v.string()),
  },
  returns: v.object({
    currentTimeSlot: v.string(),
    isOptimalTime: v.boolean(),
    nextOptimalTime: v.optional(v.string()),
    immediateRecommendation: v.optional(v.object({
      action: v.string(),
      reasoning: v.string(),
      estimatedDuration: v.number(),
      expectedCards: v.number(),
      confidence: v.number(),
    })),
    dueCardsCount: v.number(),
    newCardsAvailable: v.number(),
    energyLevelPrediction: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  }),
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
        isOptimalTime: false,
        dueCardsCount: 0,
        newCardsAvailable: 0,
        energyLevelPrediction: 'medium' as const,
      };
    }

    // Check current time slot performance
    const currentSlotPerformance = learningPattern.timeOfDayPerformance[currentTimeSlot];
    const isOptimalTime = currentSlotPerformance.successRate > 0.75 && currentSlotPerformance.reviewCount >= 5;

    // Find next optimal time
    const futureSlots = Object.entries(learningPattern.timeOfDayPerformance)
      .filter(([slot, data]) => {
        const slotHour = {
          early_morning: 7, morning: 10, afternoon: 14,
          evening: 18, night: 20, late_night: 1,
        }[slot as TimeSlot];
        return slotHour > currentHour && data.successRate > 0.7 && data.reviewCount >= 3;
      })
      .sort(([_, a], [__, b]) => b.successRate - a.successRate);

    const nextOptimalTime = futureSlots.length > 0 ? 
      getTimeSlotName(futureSlots[0][0] as TimeSlot) : undefined;

    // Count due and new cards using efficient user-based indexes
    const nowTimestamp = Date.now();

    const dueCards = await ctx.db
      .query("cards")
      .withIndex("by_userId_and_dueDate", (q) =>
        q.eq("userId", identity.subject).lte("dueDate", nowTimestamp)
      )
      .collect();

    const newCards = await ctx.db
      .query("cards")
      .withIndex("by_userId_and_repetition", (q) =>
        q.eq("userId", identity.subject).eq("repetition", 0)
      )
      .collect();

    const dueCardsCount = dueCards.length;
    const newCardsAvailable = newCards.length;

    // Predict energy level based on time and historical performance
    let energyLevelPrediction: 'high' | 'medium' | 'low' = 'medium';
    if (currentSlotPerformance.successRate > 0.8) {
      energyLevelPrediction = 'high';
    } else if (currentSlotPerformance.successRate < 0.6) {
      energyLevelPrediction = 'low';
    }

    // Generate immediate recommendation
    let immediateRecommendation = undefined;
    if (dueCardsCount > 0 && isOptimalTime) {
      const { duration, expectedCards } = calculateOptimalDuration(
        learningPattern.learningVelocity,
        dueCardsCount,
        currentSlotPerformance.successRate
      );

      immediateRecommendation = {
        action: "Start studying now",
        reasoning: `This is your optimal study time with ${Math.round(currentSlotPerformance.successRate * 100)}% success rate`,
        estimatedDuration: duration,
        expectedCards,
        confidence: currentSlotPerformance.successRate,
      };
    } else if (dueCardsCount > 0 && !isOptimalTime && nextOptimalTime) {
      immediateRecommendation = {
        action: "Wait for optimal time",
        reasoning: `Consider waiting until ${nextOptimalTime} for better performance`,
        estimatedDuration: 0,
        expectedCards: 0,
        confidence: 0.6,
      };
    }

    return {
      currentTimeSlot,
      isOptimalTime,
      nextOptimalTime,
      immediateRecommendation,
      dueCardsCount,
      newCardsAvailable,
      energyLevelPrediction,
    };
  },
});

/**
 * Record user's study session preferences for better scheduling
 */
export const recordStudyPreferences = mutation({
  args: {
    preferredTimeSlots: v.array(v.string()),
    preferredDuration: v.number(), // minutes
    dailyGoal: v.number(), // cards per day
    availableDays: v.array(v.string()), // days of week
  },
  returns: v.null(),
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
      userId: identity.subject,
      preferredTimeSlots: args.preferredTimeSlots,
      preferredDuration: args.preferredDuration,
      dailyGoal: args.dailyGoal,
      availableDays: args.availableDays,
      lastUpdated: Date.now(),
    };

    if (existingPrefs) {
      await ctx.db.patch(existingPrefs._id, preferencesData);
    } else {
      await ctx.db.insert("userPreferences", preferencesData);
    }

    return null;
  },
});
