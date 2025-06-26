import { v } from "convex/values";
import {
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { CACHE_TTL, CacheKeys, getCachedData, withCache } from "./utils/cache";
import {
	normalizeLanguage,
	type SupportedLanguage,
	t,
} from "./utils/translations";

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
type AchievementCategory =
	| "streak"
	| "mastery"
	| "velocity"
	| "consistency"
	| "exploration"
	| "social";
type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

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

/**
 * Get achievement data with translations
 */
function getAchievementData(
	achievementId: string,
	language: SupportedLanguage,
): Achievement {
	const baseAchievement = ACHIEVEMENTS_BASE.find((a) => a.id === achievementId);
	if (!baseAchievement) {
		throw new Error(`Achievement not found: ${achievementId}`);
	}

	return {
		...baseAchievement,
		description: t(
			`achievements.specific.${achievementId}.description`,
			language,
		),
		name: t(`achievements.specific.${achievementId}.name`, language),
	};
}

// Predefined achievements base data (without translations)
const ACHIEVEMENTS_BASE: Omit<Achievement, "name" | "description">[] = [
	// Streak Achievements
	{
		category: "streak",
		criteria: { type: "study_sessions", value: 1 },
		icon: "🌱",
		id: "first_streak",
		isSecret: false,
		points: 10,
		tier: "bronze",
	},
	{
		category: "streak",
		criteria: { type: "streak_days", value: 7 },
		icon: "⚔️",
		id: "week_warrior",
		isSecret: false,
		points: 50,
		tier: "silver",
	},
	{
		category: "streak",
		criteria: { type: "streak_days", value: 30 },
		icon: "👑",
		id: "month_master",
		isSecret: false,
		points: 200,
		tier: "gold",
	},
	{
		category: "streak",
		criteria: { type: "streak_days", value: 100 },
		icon: "💎",
		id: "century_scholar",
		isSecret: false,
		points: 500,
		tier: "platinum",
	},

	// Mastery Achievements
	{
		category: "mastery",
		criteria: { type: "mastered_cards", value: 1 },
		icon: "🎯",
		id: "first_mastery",
		isSecret: false,
		points: 15,
		tier: "bronze",
	},
	{
		category: "mastery",
		criteria: { type: "deck_mastery_percentage", value: 80 },
		icon: "🏆",
		id: "deck_master",
		isSecret: false,
		points: 150,
		tier: "gold",
	},
	{
		category: "mastery",
		criteria: { type: "perfect_session", value: 50 },
		icon: "✨",
		id: "perfectionist",
		isSecret: true,
		points: 300,
		tier: "platinum",
	},

	// Velocity Achievements
	{
		category: "velocity",
		criteria: { type: "daily_cards", value: 100 },
		icon: "⚡",
		id: "speed_learner",
		isSecret: false,
		points: 75,
		tier: "silver",
	},
	{
		category: "velocity",
		criteria: { type: "daily_cards", value: 500 },
		icon: "🏃‍♂️",
		id: "marathon_runner",
		isSecret: true,
		points: 400,
		tier: "platinum",
	},

	// Consistency Achievements
	{
		category: "consistency",
		criteria: { type: "early_morning_streak", value: 7 },
		icon: "🌅",
		id: "early_bird",
		isSecret: false,
		points: 60,
		tier: "silver",
	},
	{
		category: "consistency",
		criteria: { type: "night_study_streak", value: 7 },
		icon: "🦉",
		id: "night_owl",
		isSecret: false,
		points: 60,
		tier: "silver",
	},

	// Exploration Achievements
	{
		category: "exploration",
		criteria: { type: "decks_created", value: 1 },
		icon: "📚",
		id: "deck_creator",
		isSecret: false,
		points: 20,
		tier: "bronze",
	},
	{
		category: "exploration",
		criteria: { type: "decks_created", value: 10 },
		icon: "🎨",
		id: "prolific_creator",
		isSecret: false,
		points: 180,
		tier: "gold",
	},
];

/**
 * Get user's achievements and progress
 */
export const getUserAchievements = query({
	args: {
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const language = normalizeLanguage(args.language);
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error(t("errors.userNotAuthenticated", language));
		}

		// Get user's unlocked achievements
		const userAchievements = await ctx.db
			.query("userAchievements")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.collect();

		const unlockedAchievements = userAchievements
			.map((ua) => {
				const baseAchievement = ACHIEVEMENTS_BASE.find(
					(a) => a.id === ua.achievementId,
				);
				if (!baseAchievement) return null;

				return {
					achievement: getAchievementData(ua.achievementId, language),
					achievementId: ua.achievementId,
					unlockedAt: ua.unlockedAt,
				};
			})
			.filter((ua): ua is NonNullable<typeof ua> => ua !== null);

		const totalPoints = unlockedAchievements.reduce(
			(sum, ua) => sum + ua.achievement.points,
			0,
		);

		// Calculate progress toward next achievements
		const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));
		const availableAchievements = ACHIEVEMENTS_BASE.filter(
			(a) => !unlockedIds.has(a.id) && !a.isSecret,
		);

		// Get user stats for progress calculation
		const userStats = await calculateUserStatsQuery(ctx, identity.subject);

		const nextAchievements = availableAchievements
			.map((baseAchievement) => {
				const achievement = getAchievementData(baseAchievement.id, language);
				const { progress, currentValue, targetValue } =
					calculateAchievementProgress(achievement, userStats);
				return {
					achievement: {
						category: achievement.category,
						criteria: achievement.criteria,
						description: achievement.description,
						icon: achievement.icon,
						id: achievement.id,
						isSecret: achievement.isSecret,
						name: achievement.name,
						points: achievement.points,
						tier: achievement.tier,
					},
					currentValue,
					progress,
					targetValue,
				};
			})
			.sort((a, b) => b.progress - a.progress)
			.slice(0, 5);

		// Calculate category progress
		const categoryProgress = {
			consistency:
				unlockedAchievements.filter(
					(ua) => ua.achievement.category === "consistency",
				).length /
				ACHIEVEMENTS_BASE.filter((a) => a.category === "consistency").length,
			exploration:
				unlockedAchievements.filter(
					(ua) => ua.achievement.category === "exploration",
				).length /
				ACHIEVEMENTS_BASE.filter((a) => a.category === "exploration").length,
			mastery:
				unlockedAchievements.filter(
					(ua) => ua.achievement.category === "mastery",
				).length /
				ACHIEVEMENTS_BASE.filter((a) => a.category === "mastery").length,
			social: 0,
			streak:
				unlockedAchievements.filter(
					(ua) => ua.achievement.category === "streak",
				).length /
				ACHIEVEMENTS_BASE.filter((a) => a.category === "streak").length,
			velocity:
				unlockedAchievements.filter(
					(ua) => ua.achievement.category === "velocity",
				).length /
				ACHIEVEMENTS_BASE.filter((a) => a.category === "velocity").length,
		};

		return {
			categoryProgress,
			nextAchievements,
			totalPoints,
			unlockedAchievements,
		};
	},
	returns: v.object({
		categoryProgress: v.object({
			consistency: v.number(),
			exploration: v.number(),
			mastery: v.number(),
			social: v.number(),
			streak: v.number(),
			velocity: v.number(),
		}),
		nextAchievements: v.array(
			v.object({
				achievement: v.object({
					category: v.string(),
					criteria: v.object({
						timeframe: v.optional(v.string()),
						type: v.string(),
						value: v.number(),
					}),
					description: v.string(),
					icon: v.string(),
					id: v.string(),
					isSecret: v.boolean(),
					name: v.string(),
					points: v.number(),
					tier: v.string(),
				}),
				currentValue: v.number(), // 0-1 scale
				progress: v.number(),
				targetValue: v.number(),
			}),
		),
		totalPoints: v.number(),
		unlockedAchievements: v.array(
			v.object({
				achievement: v.object({
					category: v.string(),
					criteria: v.object({
						timeframe: v.optional(v.string()),
						type: v.string(),
						value: v.number(),
					}),
					description: v.string(),
					icon: v.string(),
					id: v.string(),
					isSecret: v.boolean(),
					name: v.string(),
					points: v.number(),
					tier: v.string(),
				}),
				achievementId: v.string(),
				unlockedAt: v.number(),
			}),
		),
	}),
});

/**
 * Check and unlock achievements for a user
 */
export const checkAchievements = mutation({
	args: {
		language: v.optional(v.string()),
		triggerData: v.optional(v.any()), // e.g., "study_session", "deck_created", "streak_updated"
		triggerType: v.string(),
	},
	handler: async (ctx, args) => {
		const language = normalizeLanguage(args.language);
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error(t("errors.userNotAuthenticated", language));
		}

		// Get currently unlocked achievements
		const userAchievements = await ctx.db
			.query("userAchievements")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.collect();

		const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

		// Get user stats
		const userStats = await calculateUserStatsMutation(ctx, identity.subject);

		// Check each achievement
		const newlyUnlocked = [];
		for (const baseAchievement of ACHIEVEMENTS_BASE) {
			if (unlockedIds.has(baseAchievement.id)) continue;

			const achievement = getAchievementData(baseAchievement.id, language);
			const { progress } = calculateAchievementProgress(achievement, userStats);
			if (progress >= 1.0) {
				// Unlock achievement
				await ctx.db.insert("userAchievements", {
					achievementId: achievement.id,
					triggerType: args.triggerType,
					unlockedAt: Date.now(),
					userId: identity.subject,
				});

				newlyUnlocked.push({
					achievement: {
						category: achievement.category,
						criteria: achievement.criteria,
						description: achievement.description,
						icon: achievement.icon,
						id: achievement.id,
						isSecret: achievement.isSecret,
						name: achievement.name,
						points: achievement.points,
						tier: achievement.tier,
					},
					achievementId: achievement.id,
				});
			}
		}

		return newlyUnlocked;
	},
	returns: v.array(
		v.object({
			achievement: v.object({
				category: v.string(),
				criteria: v.object({
					timeframe: v.optional(v.string()),
					type: v.string(),
					value: v.number(),
				}),
				description: v.string(),
				icon: v.string(),
				id: v.string(),
				isSecret: v.boolean(),
				name: v.string(),
				points: v.number(),
				tier: v.string(),
			}),
			achievementId: v.string(),
		}),
	),
});

/**
 * Calculate user statistics for achievement progress (query context - no caching)
 */
async function calculateUserStatsQuery(
	ctx: QueryCtx,
	userId: string,
): Promise<UserStats> {
	// Try to get cached data first
	const cacheKey = CacheKeys.userStats(userId);
	const cached = await getCachedData(ctx, userId, cacheKey);

	if (cached) {
		return cached as UserStats;
	}

	return await computeUserStats(ctx, userId);
}

/**
 * Calculate user statistics for achievement progress (mutation context - with caching)
 */
async function calculateUserStatsMutation(
	ctx: MutationCtx,
	userId: string,
): Promise<UserStats> {
	return await withCache(
		ctx,
		userId,
		CacheKeys.userStats(userId),
		CACHE_TTL.USER_STATS,
		() => computeUserStats(ctx, userId),
	);
}

/**
 * Core computation logic for user statistics
 */
async function computeUserStats(
	ctx: QueryCtx | MutationCtx,
	userId: string,
): Promise<UserStats> {
	// Execute all database queries in parallel for better performance
	const [streakData, studySessions, decks, reviews] = await Promise.all([
		// Get streak data
		ctx.db
			.query("studyStreaks")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.first(),

		// Get study sessions
		ctx.db
			.query("studySessions")
			.withIndex("by_userId_and_date", (q) => q.eq("userId", userId))
			.collect(),

		// Get decks
		ctx.db
			.query("decks")
			.withIndex("by_userId", (q) => q.eq("userId", userId))
			.collect(),

		// Get card reviews
		ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) => q.eq("userId", userId))
			.collect(),
	]);

	// Calculate stats
	const totalStudySessions = studySessions.length;
	const currentStreak = streakData?.currentStreak || 0;
	const longestStreak = streakData?.longestStreak || 0;
	const totalDecks = decks.length;
	const totalReviews = reviews.length;
	const successfulReviews = reviews.filter((r) => r.wasSuccessful).length;
	const masteredCards = reviews.filter((r) => r.repetitionAfter >= 5).length;

	// Daily stats
	const today = new Date().toISOString().split("T")[0];
	const todayReviews = reviews.filter((r) => {
		const reviewDate = new Date(r.reviewDate).toISOString().split("T")[0];
		return reviewDate === today;
	});

	return {
		currentStreak,
		dailyCards: todayReviews.length,
		longestStreak,
		masteredCards,
		successfulReviews,
		successRate: totalReviews > 0 ? successfulReviews / totalReviews : 0,
		totalDecks,
		totalReviews,
		totalStudySessions,
	};
}

// Define the user stats interface
interface UserStats {
	totalStudySessions: number;
	currentStreak: number;
	longestStreak: number;
	totalDecks: number;
	totalReviews: number;
	successfulReviews: number;
	masteredCards: number;
	dailyCards: number;
	successRate: number;
}

/**
 * Calculate progress toward a specific achievement
 */
function calculateAchievementProgress(
	achievement: Achievement,
	userStats: UserStats,
) {
	let currentValue: number;
	const targetValue = achievement.criteria.value;

	switch (achievement.criteria.type) {
		case "study_sessions":
			currentValue = userStats.totalStudySessions;
			break;
		case "streak_days":
			currentValue =
				achievement.id === "week_warrior" ||
				achievement.id === "month_master" ||
				achievement.id === "century_scholar"
					? userStats.currentStreak
					: userStats.longestStreak;
			break;
		case "mastered_cards":
			currentValue = userStats.masteredCards;
			break;
		case "daily_cards":
			currentValue = userStats.dailyCards;
			break;
		case "decks_created":
			currentValue = userStats.totalDecks;
			break;
		case "perfect_session":
			// This would need more complex logic to track perfect sessions
			currentValue = 0;
			break;
		default:
			currentValue = 0;
	}

	const progress = Math.min(1.0, currentValue / targetValue);
	return { currentValue, progress, targetValue };
}
