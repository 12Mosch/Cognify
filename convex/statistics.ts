import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";

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
    // Use a more lenient approach to account for timezone differences
    const utcToday = new Date().toISOString().split('T')[0];
    const utcYesterday = new Date();
    utcYesterday.setDate(utcYesterday.getDate() - 1);
    const utcYesterdayStr = utcYesterday.toISOString().split('T')[0];

    // Include sessions from both UTC today and yesterday to account for timezone differences
    const todaySessions = allSessions.filter(session =>
      session.sessionDate === utcToday || session.sessionDate === utcYesterdayStr
    );
    const cardsStudiedToday = todaySessions.reduce((sum, session) => sum + session.cardsStudied, 0);

    // Calculate total study time and average session duration
    const sessionsWithDuration = allSessions.filter(session => session.sessionDuration);
    const totalStudyTime = sessionsWithDuration.reduce((sum, session) => sum + (session.sessionDuration || 0), 0);
    const averageSessionDuration = sessionsWithDuration.length > 0
      ? totalStudyTime / sessionsWithDuration.length
      : undefined;

    // Calculate streaks
    const studyDates = Array.from(new Set(allSessions.map(s => s.sessionDate)))
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
      if (studyDates.includes(todayStr) || studyDates.includes(yesterdayStr)) {
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
      } else if (card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21) {
        // Consider cards mastered if they have good ease factor and long interval
        masteredCards++;
      } else {
        reviewCards++;
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

    const lastStudied = lastSession ? new Date(lastSession.sessionDate).getTime() : undefined;

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
 * Get deck progress data for dashboard cards
 */
export const getDeckProgressData = query({
  args: {},
  returns: v.array(v.object({
    deckId: v.id("decks"),
    studiedCards: v.number(),
    totalCards: v.number(),
    progressPercentage: v.number(),
    status: v.union(v.literal("new"), v.literal("in-progress"), v.literal("mastered")),
    lastStudied: v.optional(v.number()),
  })),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to access deck progress data");
    }

    // Get user's decks
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .collect();

    const deckProgressData = [];

    for (const deck of decks) {
      // Get cards for this deck
      const cards = await ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect();

      // Count studied cards (cards with repetition > 0) and mastered cards
      const studiedCards = cards.filter(card => (card.repetition || 0) > 0).length;
      const masteredCards = cards.filter(card =>
        card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21
      ).length;
      const totalCards = cards.length;

      // Calculate progress based on mastered cards (consistent with statistics dashboard)
      const progressPercentage = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

      // Determine status based on actual mastery, not just studied cards
      let status: "new" | "in-progress" | "mastered";
      if (studiedCards === 0) {
        status = "new";
      } else if (progressPercentage >= 80) {
        // Use 80% threshold for mastered status (more achievable than 90%)
        status = "mastered";
      } else {
        status = "in-progress";
      }

      // Get last studied date for this deck
      const lastSession = await ctx.db
        .query("studySessions")
        .withIndex("by_userId_and_deckId", (q) =>
          q.eq("userId", identity.subject).eq("deckId", deck._id)
        )
        .order("desc")
        .first();

      const lastStudied = lastSession ? new Date(lastSession.sessionDate).getTime() : undefined;

      deckProgressData.push({
        deckId: deck._id,
        studiedCards,
        totalCards,
        progressPercentage,
        status,
        lastStudied,
      });
    }

    return deckProgressData;
  },
});

/**
 * Interface for card review data used in retention rate calculation
 */
interface ReviewData {
  wasSuccessful: boolean;
  easeFactorBefore: number;
}

/**
 * Calculate retention rate based on review history over a specified time period
 * @param ctx - Convex context
 * @param userId - User ID
 * @param daysPeriod - Number of days to look back (default: 30)
 * @returns Retention rate as percentage (0-100) or undefined if no data
 */
async function calculateRetentionRate(
  ctx: QueryCtx,
  userId: string,
  daysPeriod: number = 30
): Promise<number | undefined> {
  const cutoffDate = Date.now() - (daysPeriod * 24 * 60 * 60 * 1000);

  // Get all reviews in the time period
  const reviews = await ctx.db
    .query("cardReviews")
    .withIndex("by_userId_and_date", (q) =>
      q.eq("userId", userId).gte("reviewDate", cutoffDate)
    )
    .collect();

  if (reviews.length === 0) {
    return undefined; // No data available
  }

  // Calculate basic retention rate
  const successfulReviews = reviews.filter((review: ReviewData) => review.wasSuccessful).length;
  const totalReviews = reviews.length;

  // Calculate weighted retention rate (harder cards weighted more heavily)
  let weightedSuccessSum = 0;
  let weightedTotalSum = 0;

  for (const review of reviews as ReviewData[]) {
    // Weight is inversely proportional to ease factor (harder cards have lower ease factor)
    const weight = 1 / review.easeFactorBefore;

    if (review.wasSuccessful) {
      weightedSuccessSum += weight;
    }
    weightedTotalSum += weight;
  }

  // Use weighted average if we have enough data, otherwise use simple average
  const retentionRate = totalReviews >= 10
    ? (weightedSuccessSum / weightedTotalSum) * 100
    : (successfulReviews / totalReviews) * 100;

  // Round to one decimal place and ensure it's between 0-100
  return Math.min(100, Math.max(0, Math.round(retentionRate * 10) / 10));
}

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

    // Fetch all cards for all decks in parallel for better performance
    const allCardsPromises = decks.map(deck =>
      ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect()
    );

    const allCardsResults = await Promise.all(allCardsPromises);
    const allCards = allCardsResults.flat();

    for (const card of allCards) {
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

    // Convert upcoming reviews to array format
    const upcomingReviewsArray = Object.entries(upcomingReviews)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const averageInterval = cardsWithInterval > 0
      ? totalInterval / cardsWithInterval
      : undefined;

    // Calculate retention rate using review history
    const retentionRate = await calculateRetentionRate(ctx, identity.subject, 30);

    return {
      totalDueCards,
      totalNewCards,
      cardsToReviewToday: totalDueCards, // For now, same as due cards
      upcomingReviews: upcomingReviewsArray,
      retentionRate,
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

    // Execute all deck performance calculations in parallel for better performance
    const deckPerformancePromises = decks.map(async (deck) => {
      // Execute card and session queries in parallel for each deck
      const [cards, lastSession] = await Promise.all([
        ctx.db
          .query("cards")
          .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
          .collect(),
        ctx.db
          .query("studySessions")
          .withIndex("by_userId_and_deckId", (q) =>
            q.eq("userId", identity.subject).eq("deckId", deck._id)
          )
          .order("desc")
          .first()
      ]);

      let masteredCards = 0;
      let totalEaseFactor = 0;
      let cardsWithEaseFactor = 0;

      for (const card of cards) {
        const easeFactor = card.easeFactor || 2.5;

        // Consider cards mastered if they have good ease factor and long interval
        // This aligns with the criteria used in other statistics functions
        if (card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21) {
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

      const lastStudied = lastSession ? new Date(lastSession.sessionDate).getTime() : undefined;

      return {
        deckId: deck._id,
        deckName: deck.name,
        totalCards: cards.length,
        masteredCards,
        masteryPercentage,
        averageEaseFactor,
        lastStudied,
      };
    });

    const deckPerformance = await Promise.all(deckPerformancePromises);
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
         .gte("sessionDate", startDateStr)
         .lte("sessionDate", endDateStr)
      )
      .collect();

    // Group sessions by date
    const sessionsByDate = new Map<string, typeof sessions>();
    for (const session of sessions) {
      const existing = sessionsByDate.get(session.sessionDate) || [];
      existing.push(session);
      sessionsByDate.set(session.sessionDate, existing);
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
 * Unified dashboard data query that consolidates multiple statistics queries
 * for better performance and atomic data updates
 */
export const getDashboardData = query({
  args: {},
  returns: v.object({
    userStatistics: v.object({
      totalDecks: v.number(),
      totalCards: v.number(),
      totalStudySessions: v.number(),
      cardsStudiedToday: v.number(),
      currentStreak: v.number(),
      longestStreak: v.number(),
      averageSessionDuration: v.optional(v.number()),
      totalStudyTime: v.optional(v.number()),
    }),
    spacedRepetitionInsights: v.object({
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
    deckPerformance: v.array(v.object({
      deckId: v.id("decks"),
      deckName: v.string(),
      totalCards: v.number(),
      masteredCards: v.number(),
      masteryPercentage: v.number(),
      averageEaseFactor: v.optional(v.number()),
      lastStudied: v.optional(v.number()),
    })),
    decks: v.array(v.object({
      _id: v.id("decks"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      description: v.string(),
      cardCount: v.number(),
    })),
    cardDistribution: v.object({
      newCards: v.number(),
      learningCards: v.number(),
      reviewCards: v.number(),
      dueCards: v.number(),
      masteredCards: v.number(),
      totalCards: v.number(),
    }),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User must be authenticated to access dashboard data");
    }

    // Get user's decks (used by multiple calculations)
    const decks = await ctx.db
      .query("decks")
      .filter((q) => q.eq(q.field("userId"), identity.subject))
      .order("desc")
      .collect();

    // Calculate user statistics
    let totalCards = 0;
    for (const deck of decks) {
      totalCards += deck.cardCount || 0;
    }

    const allSessions = await ctx.db
      .query("studySessions")
      .withIndex("by_userId_and_date", (q) => q.eq("userId", identity.subject))
      .collect();

    // Use a more lenient approach to account for timezone differences
    const utcToday = new Date().toISOString().split('T')[0];
    const utcYesterday = new Date();
    utcYesterday.setDate(utcYesterday.getDate() - 1);
    const utcYesterdayStr = utcYesterday.toISOString().split('T')[0];

    // Include sessions from both UTC today and yesterday to account for timezone differences
    const todaySessions = allSessions.filter(session =>
      session.sessionDate === utcToday || session.sessionDate === utcYesterdayStr
    );
    const cardsStudiedToday = todaySessions.reduce((sum, session) => sum + session.cardsStudied, 0);

    // Calculate streaks
    const sessionsByDate = new Map<string, number>();
    allSessions.forEach(session => {
      const existing = sessionsByDate.get(session.sessionDate) || 0;
      sessionsByDate.set(session.sessionDate, existing + session.cardsStudied);
    });

    const sortedDates = Array.from(sessionsByDate.keys()).sort().reverse();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayDate = new Date();
    const checkDate = new Date(todayDate);

    // Calculate current streak
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const cardsOnDate = sessionsByDate.get(dateStr) || 0;

      if (cardsOnDate > 0) {
        currentStreak++;
      } else if (dateStr !== utcToday) {
        break;
      }

      checkDate.setDate(checkDate.getDate() - 1);
      if (currentStreak > 100) break; // Safety limit
    }

    // Calculate longest streak
    for (const date of sortedDates) {
      const cardsOnDate = sessionsByDate.get(date) || 0;
      if (cardsOnDate > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    const totalStudyTime = allSessions.reduce((sum, session) => sum + (session.sessionDuration || 0), 0);
    const averageSessionDuration = allSessions.length > 0 ? totalStudyTime / allSessions.length : undefined;

    const userStatistics = {
      totalDecks: decks.length,
      totalCards,
      totalStudySessions: allSessions.length,
      cardsStudiedToday,
      currentStreak,
      longestStreak,
      averageSessionDuration,
      totalStudyTime: totalStudyTime > 0 ? totalStudyTime : undefined,
    };

    // Calculate spaced repetition insights with parallel card queries
    let totalDueCards = 0;
    let totalNewCards = 0;
    let totalInterval = 0;
    let cardsWithInterval = 0;
    const upcomingReviews: { [date: string]: number } = {};

    const now = Date.now();

    // Fetch all cards for all decks in parallel
    const allCardsPromises = decks.map(deck =>
      ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect()
    );

    const allCardsResults = await Promise.all(allCardsPromises);
    const allCards = allCardsResults.flat();

    for (const card of allCards) {
      if (!card.dueDate || card.dueDate <= now) {
        if (card.repetition === 0 || !card.repetition) {
          totalNewCards++;
        } else {
          totalDueCards++;
        }
      }

      if (card.interval && card.interval > 0) {
        totalInterval += card.interval;
        cardsWithInterval++;
      }

      if (card.dueDate && card.dueDate > now) {
        const dueDate = new Date(card.dueDate).toISOString().split('T')[0];
        upcomingReviews[dueDate] = (upcomingReviews[dueDate] || 0) + 1;
      }
    }

    const upcomingReviewsArray = Object.entries(upcomingReviews)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 14);

    const averageInterval = cardsWithInterval > 0 ? totalInterval / cardsWithInterval : undefined;
    const cardsToReviewToday = totalDueCards;

    // Calculate retention rate using review history
    const retentionRate = await calculateRetentionRate(ctx, identity.subject, 30);

    const spacedRepetitionInsights = {
      totalDueCards,
      totalNewCards,
      cardsToReviewToday,
      upcomingReviews: upcomingReviewsArray,
      retentionRate,
      averageInterval,
    };

    // Calculate deck performance with parallel queries
    const deckPerformancePromises = decks.map(async (deck) => {
      // Execute card and session queries in parallel for each deck
      const [cards, lastSession] = await Promise.all([
        ctx.db
          .query("cards")
          .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
          .collect(),
        ctx.db
          .query("studySessions")
          .withIndex("by_userId_and_deckId", (q) =>
            q.eq("userId", identity.subject).eq("deckId", deck._id)
          )
          .order("desc")
          .first()
      ]);

      let masteredCards = 0;
      let totalEaseFactor = 0;
      let cardsWithEase = 0;

      for (const card of cards) {
        if (card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21) {
          masteredCards++;
        }
        if (card.easeFactor) {
          totalEaseFactor += card.easeFactor;
          cardsWithEase++;
        }
      }

      const masteryPercentage = cards.length > 0 ? (masteredCards / cards.length) * 100 : 0;
      const averageEaseFactor = cardsWithEase > 0 ? totalEaseFactor / cardsWithEase : undefined;
      const lastStudied = lastSession ? new Date(lastSession.sessionDate).getTime() : undefined;

      return {
        deckId: deck._id,
        deckName: deck.name,
        totalCards: cards.length,
        masteredCards,
        masteryPercentage,
        averageEaseFactor,
        lastStudied,
      };
    });

    const deckPerformance = await Promise.all(deckPerformancePromises);

    // Calculate card distribution using already fetched cards from spaced repetition insights
    // This reuses the allCards array to avoid duplicate queries
    let newCards = 0;
    let learningCards = 0;
    let reviewCards = 0;
    let dueCards = 0;
    let masteredCards = 0;
    const totalCardsForDistribution = allCards.length;

    for (const card of allCards) {
      if (!card.repetition || card.repetition === 0) {
        newCards++;
      } else if (card.repetition < 3) {
        learningCards++;
      } else if (card.dueDate && card.dueDate <= now) {
        dueCards++;
      } else if (card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21) {
        masteredCards++;
      } else {
        reviewCards++;
      }
    }

    const cardDistribution = {
      newCards,
      learningCards,
      reviewCards,
      dueCards,
      masteredCards,
      totalCards: totalCardsForDistribution,
    };

    return {
      userStatistics,
      spacedRepetitionInsights,
      deckPerformance,
      decks,
      cardDistribution,
    };
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

    // Fetch all cards for all decks in parallel for better performance
    const allCardsPromises = decks.map(deck =>
      ctx.db
        .query("cards")
        .withIndex("by_deckId", (q) => q.eq("deckId", deck._id))
        .collect()
    );

    const allCardsResults = await Promise.all(allCardsPromises);
    const allCards = allCardsResults.flat();

    totalCards = allCards.length;

    for (const card of allCards) {
      const repetition = card.repetition || 0;
      const dueDate = card.dueDate || now;

      // Categorize cards by learning stage
      if (repetition === 0) {
        newCards++;
      } else if (repetition < 3) {
        learningCards++;
      } else if (card.easeFactor && card.easeFactor >= 2.5 && card.interval && card.interval >= 21) {
        // Consider cards mastered if they have good ease factor and long interval
        masteredCards++;
      } else {
        reviewCards++;
      }

      // Count due cards (cards that need review now)
      if (dueDate <= now && repetition > 0) {
        dueCards++;
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
