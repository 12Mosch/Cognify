import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Statistics and Analytics Queries for the Flashcard App
 * 
 * This file provides comprehensive analytics data for the statistics dashboard,
 * including user performance metrics, study patterns, and learning insights.
 */

/**
 * Get comprehensive user statistics for the dashboard overview
 */
export const getUserStatistics = query({
  args: {},
  returns: v.object({
    totalDecks: v.number(),
    totalCards: v.number(),
    totalStudySessions: v.number(),
    cardsStudiedToday: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    averageSessionDuration: v.optional(v.number()),
    totalStudyTime: v.optional(v.number()),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to access statistics");
    }

    // Get user's decks
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    // Get total cards across all user's decks
    let totalCards = 0;
    for (const deck of decks) {
      totalCards += deck.cardCount || 0;
    }

    // Get all study sessions for the user
    const allSessions = await ctx.db
      .query("studySessions")
      .withIndex("by_userId_and_date", (q) => q.eq("userId", identity.subject))
      .collect();

    // Calculate today's cards studied
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = allSessions.filter(session => session.date === today);
    const cardsStudiedToday = todaySessions.reduce((sum, session) => sum + session.cardsStudied, 0);

    // Calculate total study time and average session duration
    const sessionsWithDuration = allSessions.filter(session => session.sessionDuration);
    const totalStudyTime = sessionsWithDuration.reduce((sum, session) => sum + (session.sessionDuration || 0), 0);
    const averageSessionDuration = sessionsWithDuration.length > 0
      ? totalStudyTime / sessionsWithDuration.length
      : undefined;

    // Calculate streaks
    const studyDates = Array.from(new Set(allSessions.map(s => s.date)))
      .sort((a, b) => b.localeCompare(a)); // Most recent first

    let currentStreak = 0;
    let longestStreak = 0;

    if (studyDates.length > 0) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Check if user studied today or yesterday to start current streak
      let streakStarted = false;
      if (studyDates.includes(todayStr)) {
        currentStreak = 1;
        streakStarted = true;
      } else if (studyDates.includes(yesterdayStr)) {
        currentStreak = 1;
        streakStarted = true;
      }

      // Calculate current streak by going backwards from today/yesterday
      if (streakStarted) {
        const startDate = studyDates.includes(todayStr) ? today : yesterday;
        for (let i = 1; i < 365; i++) { // Check up to 365 days back
          const checkDate = new Date(startDate);
          checkDate.setDate(checkDate.getDate() - i);
          const checkDateStr = checkDate.toISOString().split('T')[0];

          if (studyDates.includes(checkDateStr)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Calculate longest streak
      let tempStreak = 0;
      for (let i = 0; i < studyDates.length; i++) {
        const currentDate = new Date(studyDates[i]);
        tempStreak = 1;

        // Look for consecutive days
        for (let j = i + 1; j < studyDates.length; j++) {
          const nextDate = new Date(studyDates[j]);
          const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

          if (dayDiff === tempStreak) {
            tempStreak++;
          } else {
            break;
          }
        }

        longestStreak = Math.max(longestStreak, tempStreak);
        i += tempStreak - 1; // Skip the days we've already counted
      }
    }

    return {
      totalDecks: decks.length,
      totalCards,
      totalStudySessions: allSessions.length,
      cardsStudiedToday,
      currentStreak,
      longestStreak,
      averageSessionDuration,
      totalStudyTime,
    };
  },
});

/**
 * Get statistics for a specific deck
 */
export const getDeckStatistics = query({
  args: {
    deckId: v.id("decks"),
  },
  returns: v.object({
    deckName: v.string(),
    totalCards: v.number(),
    newCards: v.number(),
    learningCards: v.number(),
    reviewCards: v.number(),
    masteredCards: v.number(),
    averageEaseFactor: v.optional(v.number()),
    successRate: v.optional(v.number()),
    lastStudied: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to access statistics");
    }

    // Verify deck ownership
    const deck = await ctx.db.get(args.deckId);
    
    if (!deck) {
      throw new Error("Deck not found");
    }

    if (deck.userId !== identity.subject) {
      throw new Error("You can only access statistics for your own decks");
    }

    // Get all cards for the deck
    const cards = await ctx.db
      .query("cards")
      .withIndex("by_deckId", (q) => q.eq("deckId", args.deckId))
      .collect();

    // Categorize cards by learning stage
    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let masteredCards = 0;
    let totalEaseFactor = 0;
    let cardsWithEaseFactor = 0;

    for (const card of cards) {
      const repetition = card.repetition || 0;
      const easeFactor = card.easeFactor || 2.5;

      if (repetition === 0) {
        newCards++;
      } else if (repetition < 3) {
        learningCards++;
      } else if (repetition < 8) {
        reviewCards++;
      } else {
        masteredCards++;
      }

      if (card.easeFactor) {
        totalEaseFactor += easeFactor;
        cardsWithEaseFactor++;
      }
    }

    const averageEaseFactor = cardsWithEaseFactor > 0 
      ? totalEaseFactor / cardsWithEaseFactor 
      : undefined;

    // Get last studied date for this deck
    const lastSession = await ctx.db
      .query("studySessions")
      .withIndex("by_userId_and_deckId", (q) =>
        q.eq("userId", identity.subject).eq("deckId", args.deckId)
      )
      .order("desc")
      .first();

    const lastStudied = lastSession ? new Date(lastSession.date).getTime() : undefined;

    // Calculate success rate based on card progression
    // Cards with higher repetition counts indicate better success
    const totalReviews = cards.reduce((sum, card) => sum + (card.repetition || 0), 0);
    const successRate = cards.length > 0 && totalReviews > 0
      ? Math.min(95, (totalReviews / cards.length) * 15) // Rough estimation
      : undefined;

    return {
      deckName: deck.name,
      totalCards: cards.length,
      newCards,
      learningCards,
      reviewCards,
      masteredCards,
      averageEaseFactor,
      successRate,
      lastStudied,
    };
  },
});

/**
 * Get spaced repetition insights across all user's decks
 */
export const getSpacedRepetitionInsights = query({
  args: {},
  returns: v.object({
    totalDueCards: v.number(),
    totalNewCards: v.number(),
    cardsToReviewToday: v.number(),
    upcomingReviews: v.array(v.object({
      date: v.string(),
      count: v.number(),
    })),
    retentionRate: v.optional(v.number()),
    averageInterval: v.optional(v.number()),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to access statistics");
    }

    // Get user's decks
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    let totalDueCards = 0;
    let totalNewCards = 0;
    let totalInterval = 0;
    let cardsWithInterval = 0;
    const upcomingReviews: { [date: string]: number } = {};

    const now = Date.now();

    for (const deck of decks) {
      // Get cards for this deck
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect();

      for (const card of cards) {
        const repetition = card.repetition || 0;
        const dueDate = card.dueDate || now;
        const interval = card.interval || 1;

        // Count new cards
        if (repetition === 0) {
          totalNewCards++;
        }

        // Count due cards
        if (dueDate <= now) {
          totalDueCards++;
        }

        // Track upcoming reviews (next 7 days)
        if (dueDate > now) {
          const reviewDate = new Date(dueDate).toDateString();
          const daysDiff = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 7) {
            upcomingReviews[reviewDate] = (upcomingReviews[reviewDate] || 0) + 1;
          }
        }

        // Calculate average interval
        if (card.interval && repetition > 0) {
          totalInterval += interval;
          cardsWithInterval++;
        }
      }
    }

    // Convert upcoming reviews to array format
    const upcomingReviewsArray = Object.entries(upcomingReviews)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const averageInterval = cardsWithInterval > 0 
      ? totalInterval / cardsWithInterval 
      : undefined;

    return {
      totalDueCards,
      totalNewCards,
      cardsToReviewToday: totalDueCards, // For now, same as due cards
      upcomingReviews: upcomingReviewsArray,
      retentionRate: undefined, // Will be implemented with session tracking
      averageInterval,
    };
  },
});

/**
 * Get deck performance comparison data
 */
export const getDeckPerformanceComparison = query({
  args: {},
  returns: v.array(v.object({
    deckId: v.id("decks"),
    deckName: v.string(),
    totalCards: v.number(),
    masteredCards: v.number(),
    masteryPercentage: v.number(),
    averageEaseFactor: v.optional(v.number()),
    lastStudied: v.optional(v.number()),
  })),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("User must be authenticated to access statistics");
    }

    // Get user's decks
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const deckPerformance = [];

    for (const deck of decks) {
      // Get cards for this deck
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect();

      let masteredCards = 0;
      let totalEaseFactor = 0;
      let cardsWithEaseFactor = 0;

      for (const card of cards) {
        const repetition = card.repetition || 0;
        const easeFactor = card.easeFactor || 2.5;

        // Consider cards with 8+ repetitions as mastered
        if (repetition >= 8) {
          masteredCards++;
        }

        if (card.easeFactor) {
          totalEaseFactor += easeFactor;
          cardsWithEaseFactor++;
        }
      }

      const masteryPercentage = cards.length > 0 
        ? (masteredCards / cards.length) * 100 
        : 0;

      const averageEaseFactor = cardsWithEaseFactor > 0
        ? totalEaseFactor / cardsWithEaseFactor
        : undefined;

      // Get last studied date for this deck
      const lastSession = await ctx.db
        .query("studySessions")
        .withIndex("by_userId_and_deckId", (q) =>
          q.eq("userId", identity.subject).eq("deckId", deck._id)
        )
        .order("desc")
        .first();

      const lastStudied = lastSession ? new Date(lastSession.date).getTime() : undefined;

      deckPerformance.push({
        deckId: deck._id,
        deckName: deck.name,
        totalCards: cards.length,
        masteredCards,
        masteryPercentage,
        averageEaseFactor,
        lastStudied,
      });
    }

    return deckPerformance;
  },
});

/**
 * Get study activity data for charts with date range filtering
 */
export const getStudyActivityData = query({
  args: {
    dateRange: v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all")),
  },
  returns: v.array(v.object({
    date: v.string(),
    displayDate: v.string(),
    cardsStudied: v.number(),
    sessions: v.number(),
    timeSpent: v.number(), // in minutes
    streak: v.number(),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to access study activity data");
    }

    // Calculate date range
    const days = args.dateRange === '7d' ? 7 :
                 args.dateRange === '30d' ? 30 :
                 args.dateRange === '90d' ? 90 : 365;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get study sessions in the date range
    const sessions = await ctx.db
      .query("studySessions")
      .withIndex("by_userId_and_date", (q) =>
        q.eq("userId", identity.subject)
         .gte("date", startDateStr)
         .lte("date", endDateStr)
      )
      .collect();

    // Group sessions by date
    const sessionsByDate = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const existing = sessionsByDate.get(session.date) || [];
      existing.push(session);
      sessionsByDate.set(session.date, existing);
    }

    // Generate data for each day in the range
    const activityData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const daySessions = sessionsByDate.get(dateStr) || [];
      const cardsStudied = daySessions.reduce((sum, s) => sum + s.cardsStudied, 0);
      const sessionCount = daySessions.length;
      const totalDuration = daySessions.reduce((sum, s) => sum + (s.sessionDuration || 0), 0);
      const timeSpent = Math.round(totalDuration / (1000 * 60)); // Convert to minutes

      activityData.push({
        date: dateStr,
        displayDate: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          ...(args.dateRange === 'all' && { year: '2-digit' })
        }),
        cardsStudied,
        sessions: sessionCount,
        timeSpent,
        streak: cardsStudied > 0 ? 1 : 0,
      });
    }

    return activityData;
  },
});

/**
 * Get detailed card distribution data for charts
 */
export const getCardDistributionData = query({
  args: {},
  returns: v.object({
    newCards: v.number(),
    learningCards: v.number(),
    reviewCards: v.number(),
    dueCards: v.number(),
    masteredCards: v.number(),
    totalCards: v.number(),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to access card distribution data");
    }

    // Get user's decks
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let dueCards = 0;
    let masteredCards = 0;
    let totalCards = 0;

    const now = Date.now();

    for (const deck of decks) {
      // Get cards for this deck
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect();

      totalCards += cards.length;

      for (const card of cards) {
        const repetition = card.repetition || 0;
        const dueDate = card.dueDate || now;

        // Categorize cards by learning stage
        if (repetition === 0) {
          newCards++;
        } else if (repetition < 3) {
          learningCards++;
        } else if (repetition < 8) {
          reviewCards++;
        } else {
          masteredCards++;
        }

        // Count due cards (cards that need review now)
        if (dueDate <= now && repetition > 0) {
          dueCards++;
        }
      }
    }

    return {
      newCards,
      learningCards,
      reviewCards,
      dueCards,
      masteredCards,
      totalCards,
    };
  },
});
