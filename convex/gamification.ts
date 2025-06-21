import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { QueryCtx, MutationCtx } from "./_generated/server";
import { getCachedData, withCache, CacheKeys, CACHE_TTL } from "./utils/cache";

/**
 * Enhanced Gamification System
 * 
 * This module provides comprehensive gamification features including:
 * - Achievement badges and unlocks
 * - Progress visualization and milestones
 * - Learning challenges and goals
 * - Social features (optional)
 * - Motivation and engagement tracking
 */

// Achievement types and categories
type AchievementCategory = 'streak' | 'mastery' | 'velocity' | 'consistency' | 'exploration' | 'social';
type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  criteria: {
    type: string;
    value: number;
    timeframe?: string; // e.g., "daily", "weekly", "monthly"
  };
  points: number;
  isSecret: boolean; // Hidden until unlocked
}

// Predefined achievements
const ACHIEVEMENTS: Achievement[] = [
  // Streak Achievements
  {
    id: 'first_streak',
    name: 'Getting Started',
    description: 'Complete your first study session',
    category: 'streak',
    tier: 'bronze',
    icon: '🌱',
    criteria: { type: 'study_sessions', value: 1 },
    points: 10,
    isSecret: false,
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Study for 7 consecutive days',
    category: 'streak',
    tier: 'silver',
    icon: '⚔️',
    criteria: { type: 'streak_days', value: 7 },
    points: 50,
    isSecret: false,
  },
  {
    id: 'month_master',
    name: 'Month Master',
    description: 'Study for 30 consecutive days',
    category: 'streak',
    tier: 'gold',
    icon: '👑',
    criteria: { type: 'streak_days', value: 30 },
    points: 200,
    isSecret: false,
  },
  {
    id: 'century_scholar',
    name: 'Century Scholar',
    description: 'Study for 100 consecutive days',
    category: 'streak',
    tier: 'platinum',
    icon: '💎',
    criteria: { type: 'streak_days', value: 100 },
    points: 500,
    isSecret: false,
  },

  // Mastery Achievements
  {
    id: 'first_mastery',
    name: 'First Mastery',
    description: 'Master your first card (5+ successful reviews)',
    category: 'mastery',
    tier: 'bronze',
    icon: '🎯',
    criteria: { type: 'mastered_cards', value: 1 },
    points: 15,
    isSecret: false,
  },
  {
    id: 'deck_master',
    name: 'Deck Master',
    description: 'Master an entire deck (80%+ cards mastered)',
    category: 'mastery',
    tier: 'gold',
    icon: '🏆',
    criteria: { type: 'deck_mastery_percentage', value: 80 },
    points: 150,
    isSecret: false,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Achieve 100% success rate in a 50+ card session',
    category: 'mastery',
    tier: 'platinum',
    icon: '✨',
    criteria: { type: 'perfect_session', value: 50 },
    points: 300,
    isSecret: true,
  },

  // Velocity Achievements
  {
    id: 'speed_learner',
    name: 'Speed Learner',
    description: 'Review 100 cards in a single day',
    category: 'velocity',
    tier: 'silver',
    icon: '⚡',
    criteria: { type: 'daily_cards', value: 100 },
    points: 75,
    isSecret: false,
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Review 500 cards in a single day',
    category: 'velocity',
    tier: 'platinum',
    icon: '🏃‍♂️',
    criteria: { type: 'daily_cards', value: 500 },
    points: 400,
    isSecret: true,
  },

  // Consistency Achievements
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study before 8 AM for 7 consecutive days',
    category: 'consistency',
    tier: 'silver',
    icon: '🌅',
    criteria: { type: 'early_morning_streak', value: 7 },
    points: 60,
    isSecret: false,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study after 10 PM for 7 consecutive days',
    category: 'consistency',
    tier: 'silver',
    icon: '🦉',
    criteria: { type: 'night_study_streak', value: 7 },
    points: 60,
    isSecret: false,
  },

  // Exploration Achievements
  {
    id: 'deck_creator',
    name: 'Deck Creator',
    description: 'Create your first deck',
    category: 'exploration',
    tier: 'bronze',
    icon: '📚',
    criteria: { type: 'decks_created', value: 1 },
    points: 20,
    isSecret: false,
  },
  {
    id: 'prolific_creator',
    name: 'Prolific Creator',
    description: 'Create 10 decks',
    category: 'exploration',
    tier: 'gold',
    icon: '🎨',
    criteria: { type: 'decks_created', value: 10 },
    points: 180,
    isSecret: false,
  },
];

/**
 * Get user's achievements and progress
 */
export const getUserAchievements = query({
  args: {},
  returns: v.object({
    unlockedAchievements: v.array(v.object({
      achievementId: v.string(),
      unlockedAt: v.number(),
      achievement: v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        category: v.string(),
        tier: v.string(),
        icon: v.string(),
        criteria: v.object({
          type: v.string(),
          value: v.number(),
          timeframe: v.optional(v.string()),
        }),
        points: v.number(),
        isSecret: v.boolean(),
      }),
    })),
    totalPoints: v.number(),
    nextAchievements: v.array(v.object({
      achievement: v.object({
        id: v.string(),
        name: v.string(),
        description: v.string(),
        category: v.string(),
        tier: v.string(),
        icon: v.string(),
        criteria: v.object({
          type: v.string(),
          value: v.number(),
          timeframe: v.optional(v.string()),
        }),
        points: v.number(),
        isSecret: v.boolean(),
      }),
      progress: v.number(), // 0-1 scale
      currentValue: v.number(),
      targetValue: v.number(),
    })),
    categoryProgress: v.object({
      streak: v.number(),
      mastery: v.number(),
      velocity: v.number(),
      consistency: v.number(),
      exploration: v.number(),
      social: v.number(),
    }),
  }),
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Get user's unlocked achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    const unlockedAchievements = userAchievements.map(ua => ({
      achievementId: ua.achievementId,
      unlockedAt: ua.unlockedAt,
      achievement: ACHIEVEMENTS.find(a => a.id === ua.achievementId),
    })).filter((ua): ua is typeof ua & { achievement: Achievement } => ua.achievement !== undefined);

    const totalPoints = unlockedAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0);

    // Calculate progress toward next achievements
    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));
    const availableAchievements = ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id) && !a.isSecret);

    // Get user stats for progress calculation
    const userStats = await calculateUserStatsQuery(ctx, identity.subject);
    
    const nextAchievements = availableAchievements.map(achievement => {
      const { progress, currentValue, targetValue } = calculateAchievementProgress(achievement, userStats);
      return {
        achievement: {
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          tier: achievement.tier,
          icon: achievement.icon,
          criteria: achievement.criteria,
          points: achievement.points,
          isSecret: achievement.isSecret,
        },
        progress,
        currentValue,
        targetValue,
      };
    }).sort((a, b) => b.progress - a.progress).slice(0, 5);

    // Calculate category progress
    const categoryProgress = {
      streak: unlockedAchievements.filter(ua => ua.achievement.category === 'streak').length / ACHIEVEMENTS.filter(a => a.category === 'streak').length,
      mastery: unlockedAchievements.filter(ua => ua.achievement.category === 'mastery').length / ACHIEVEMENTS.filter(a => a.category === 'mastery').length,
      velocity: unlockedAchievements.filter(ua => ua.achievement.category === 'velocity').length / ACHIEVEMENTS.filter(a => a.category === 'velocity').length,
      consistency: unlockedAchievements.filter(ua => ua.achievement.category === 'consistency').length / ACHIEVEMENTS.filter(a => a.category === 'consistency').length,
      exploration: unlockedAchievements.filter(ua => ua.achievement.category === 'exploration').length / ACHIEVEMENTS.filter(a => a.category === 'exploration').length,
      social: 0, // Not implemented yet
    };

    return {
      unlockedAchievements,
      totalPoints,
      nextAchievements,
      categoryProgress,
    };
  },
});

/**
 * Check and unlock achievements for a user
 */
export const checkAchievements = mutation({
  args: {
    triggerType: v.string(), // e.g., "study_session", "deck_created", "streak_updated"
    triggerData: v.optional(v.any()),
  },
  returns: v.array(v.object({
    achievementId: v.string(),
    achievement: v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      category: v.string(),
      tier: v.string(),
      icon: v.string(),
      criteria: v.object({
        type: v.string(),
        value: v.number(),
        timeframe: v.optional(v.string()),
      }),
      points: v.number(),
      isSecret: v.boolean(),
    }),
  })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be authenticated");
    }

    // Get currently unlocked achievements
    const userAchievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId));

    // Get user stats
    const userStats = await calculateUserStatsMutation(ctx, identity.subject);

    // Check each achievement
    const newlyUnlocked = [];
    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue;

      const { progress } = calculateAchievementProgress(achievement, userStats);
      if (progress >= 1.0) {
        // Unlock achievement
        await ctx.db.insert("userAchievements", {
          userId: identity.subject,
          achievementId: achievement.id,
          unlockedAt: Date.now(),
          triggerType: args.triggerType,
        });

        newlyUnlocked.push({
          achievementId: achievement.id,
          achievement: {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            tier: achievement.tier,
            icon: achievement.icon,
            criteria: achievement.criteria,
            points: achievement.points,
            isSecret: achievement.isSecret,
          },
        });
      }
    }

    return newlyUnlocked;
  },
});

/**
 * Calculate user statistics for achievement progress (query context - no caching)
 */
async function calculateUserStatsQuery(ctx: QueryCtx, userId: string) {
  // Try to get cached data first
  const cacheKey = CacheKeys.userStats(userId);
  const cached = await getCachedData(ctx, userId, cacheKey);

  if (cached) {
    return cached;
  }

  return await computeUserStats(ctx, userId);
}

/**
 * Calculate user statistics for achievement progress (mutation context - with caching)
 */
async function calculateUserStatsMutation(ctx: MutationCtx, userId: string) {
  return await withCache(
    ctx,
    userId,
    CacheKeys.userStats(userId),
    CACHE_TTL.USER_STATS,
    () => computeUserStats(ctx, userId)
  );
}

/**
 * Core computation logic for user statistics
 */
async function computeUserStats(ctx: QueryCtx | MutationCtx, userId: string) {

  // Execute all database queries in parallel for better performance
  const [streakData, studySessions, decks, reviews] = await Promise.all([
    // Get streak data
    ctx.db
      .query("studyStreaks")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first(),

    // Get study sessions
    ctx.db
      .query("studySessions")
      .withIndex("by_userId_and_date", (q: any) => q.eq("userId", userId))
      .collect(),

    // Get decks
    ctx.db
      .query("decks")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect(),

    // Get card reviews
    ctx.db
      .query("cardReviews")
      .withIndex("by_userId_and_date", (q: any) => q.eq("userId", userId))
      .collect(),
  ]);

  // Calculate stats
  const totalStudySessions = studySessions.length;
  const currentStreak = streakData?.currentStreak || 0;
  const longestStreak = streakData?.longestStreak || 0;
  const totalDecks = decks.length;
  const totalReviews = reviews.length;
  const successfulReviews = reviews.filter((r: any) => r.wasSuccessful).length;
  const masteredCards = reviews.filter((r: any) => r.repetitionAfter >= 5).length;

  // Daily stats
  const today = new Date().toISOString().split('T')[0];
  const todayReviews = reviews.filter((r: any) => {
    const reviewDate = new Date(r.reviewDate).toISOString().split('T')[0];
    return reviewDate === today;
  });

  return {
    totalStudySessions,
    currentStreak,
    longestStreak,
    totalDecks,
    totalReviews,
    successfulReviews,
    masteredCards,
    dailyCards: todayReviews.length,
    successRate: totalReviews > 0 ? successfulReviews / totalReviews : 0,
  };
}

/**
 * Calculate progress toward a specific achievement
 */
function calculateAchievementProgress(achievement: Achievement, userStats: any) {
  let currentValue: number;
  const targetValue = achievement.criteria.value;

  switch (achievement.criteria.type) {
    case 'study_sessions':
      currentValue = userStats.totalStudySessions;
      break;
    case 'streak_days':
      currentValue = achievement.id === 'week_warrior' || achievement.id === 'month_master' || achievement.id === 'century_scholar' 
        ? userStats.currentStreak 
        : userStats.longestStreak;
      break;
    case 'mastered_cards':
      currentValue = userStats.masteredCards;
      break;
    case 'daily_cards':
      currentValue = userStats.dailyCards;
      break;
    case 'decks_created':
      currentValue = userStats.totalDecks;
      break;
    case 'perfect_session':
      // This would need more complex logic to track perfect sessions
      currentValue = 0;
      break;
    default:
      currentValue = 0;
  }

  const progress = Math.min(1.0, currentValue / targetValue);
  return { progress, currentValue, targetValue };
}
