import { v } from "convex/values";
import { getTimeSlot, type TimeSlot } from "../src/utils/scheduling";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { normalizeLanguage, t } from "./utils/translations";

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

// Personalized learning pattern constants
const INCONSISTENCY_VARIANCE_THRESHOLD = 0.3; // Success rate variance threshold
const PLATEAU_DETECTION_DAYS = 14; // Days without improvement to consider plateau
const RECENT_PERFORMANCE_WINDOW_SHORT = 7; // Days for short-term trend
const RECENT_PERFORMANCE_WINDOW_LONG = 14; // Days for long-term trend
const MIN_REVIEWS_FOR_INCONSISTENCY = 10; // Minimum reviews per card for inconsistency analysis
const MIN_REVIEWS_FOR_PLATEAU = 15; // Minimum reviews for plateau detection

/**
 * Enhanced learning pattern data structure with personalized metrics
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
 * Comprehensive user learning patterns interface for personalized study paths
 */
export interface UserLearningPatterns {
	userId: string;

	// Core performance metrics
	averageSuccessRate: number;
	learningVelocity: number; // Cards mastered per day
	personalEaseFactorBias: number;

	// Inconsistency patterns - cards where user alternates between correct/incorrect
	inconsistencyPatterns: {
		cardIds: string[]; // Cards with high variance in performance
		averageVariance: number; // Average success rate variance across inconsistent cards
		detectionThreshold: number; // Variance threshold used (default: 0.3)
		lastCalculated: number;
	};

	// Plateau detection - topics where performance has stagnated
	plateauDetection: {
		stagnantTopics: Array<{
			topicKeywords: string[]; // Keywords representing the topic
			cardIds: string[]; // Cards in this topic showing plateau
			plateauDuration: number; // Days since improvement stopped
			lastImprovement: number; // Timestamp of last improvement
			averagePerformance: number; // Current performance level
		}>;
		plateauThreshold: number; // Days without improvement to consider plateau (default: 14)
		lastAnalyzed: number;
	};

	// Recent performance trends - rolling averages over time windows
	recentPerformanceTrends: {
		last7Days: {
			successRate: number;
			averageResponseTime: number;
			confidenceLevel: number;
			reviewCount: number;
		};
		last14Days: {
			successRate: number;
			averageResponseTime: number;
			confidenceLevel: number;
			reviewCount: number;
		};
		trend: {
			successRateChange: number; // Percentage change from 14d to 7d
			responseTimeChange: number; // Change in ms
			confidenceChange: number; // Change in confidence level
		};
		lastUpdated: number;
	};

	// Time-based learning preferences
	timeOfDayPerformance: Record<
		TimeSlot,
		{
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean; // Whether this time is optimal for this user
		}
	>;

	// Difficulty-based patterns
	difficultyPatterns: {
		easyCards: {
			successRate: number;
			averageInterval: number;
			averageResponseTime: number;
			confidenceLevel: number;
		};
		mediumCards: {
			successRate: number;
			averageInterval: number;
			averageResponseTime: number;
			confidenceLevel: number;
		};
		hardCards: {
			successRate: number;
			averageInterval: number;
			averageResponseTime: number;
			confidenceLevel: number;
		};
	};

	// Retention curve and predictions
	retentionCurve: Array<{ interval: number; retentionRate: number }>;

	// Configuration for personalization
	personalizationConfig: {
		learningPatternInfluence: number; // 0-1, how much to weight learning patterns vs SRS
		prioritizeInconsistentCards: boolean;
		focusOnPlateauTopics: boolean;
		optimizeForTimeOfDay: boolean;
		adaptDifficultyProgression: boolean;
	};

	lastUpdated: number;
}

/**
 * Configuration options for path generation personalization
 */
export interface PathPersonalizationConfig {
	learningPatternWeight: number; // 0-1, influence of learning patterns
	srsWeight: number; // 0-1, influence of traditional SRS factors
	inconsistencyBoost: number; // Multiplier for inconsistent cards
	plateauBoost: number; // Multiplier for plateau topic cards
	timeOfDayBoost: number; // Multiplier for optimal time performance
	difficultyAdaptation: number; // How much to adapt difficulty progression
}

/**
 * Calculate inconsistency patterns for cards where user alternates between correct/incorrect
 */
function calculateInconsistencyPatterns(
	reviews: Array<{
		cardId: string;
		wasSuccessful: boolean;
		reviewDate: number;
	}>,
): UserLearningPatterns["inconsistencyPatterns"] {
	// Group reviews by card
	const cardReviews = new Map<string, boolean[]>();

	for (const review of reviews) {
		if (!cardReviews.has(review.cardId)) {
			cardReviews.set(review.cardId, []);
		}
		const cardResults = cardReviews.get(review.cardId);
		if (cardResults) {
			cardResults.push(review.wasSuccessful);
		}
	}

	const inconsistentCards: string[] = [];
	let totalVariance = 0;
	let cardCount = 0;

	// Calculate variance for each card with sufficient reviews
	for (const [cardId, results] of cardReviews.entries()) {
		if (results.length >= MIN_REVIEWS_FOR_INCONSISTENCY) {
			// Calculate variance in success rate over time windows
			const windowSize = Math.min(5, Math.floor(results.length / 2));
			let maxVariance = 0;

			for (let i = 0; i <= results.length - windowSize * 2; i++) {
				const window1 = results.slice(i, i + windowSize);
				const window2 = results.slice(i + windowSize, i + windowSize * 2);

				const rate1 = window1.filter((r) => r).length / window1.length;
				const rate2 = window2.filter((r) => r).length / window2.length;

				const variance = Math.abs(rate1 - rate2);
				maxVariance = Math.max(maxVariance, variance);
			}

			if (maxVariance > INCONSISTENCY_VARIANCE_THRESHOLD) {
				inconsistentCards.push(cardId);
			}

			totalVariance += maxVariance;
			cardCount++;
		}
	}

	return {
		averageVariance: cardCount > 0 ? totalVariance / cardCount : 0,
		cardIds: inconsistentCards,
		detectionThreshold: INCONSISTENCY_VARIANCE_THRESHOLD,
		lastCalculated: Date.now(),
	};
}

/**
 * Detect plateau patterns - topics where performance has stagnated
 */
function detectPlateauPatterns(
	reviews: Array<{
		cardId: string;
		wasSuccessful: boolean;
		reviewDate: number;
		responseTime?: number;
	}>,
	cards: Array<{ _id: string; front: string; back: string }>,
): UserLearningPatterns["plateauDetection"] {
	// Simple topic extraction based on common keywords
	const extractTopicKeywords = (text: string): string[] => {
		const words = text
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 3);

		// Return most frequent words as topic indicators
		const wordCount = new Map<string, number>();
		for (const word of words) {
			wordCount.set(word, (wordCount.get(word) || 0) + 1);
		}

		return Array.from(wordCount.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([word]) => word);
	};

	// Group cards by topics
	const topicGroups = new Map<string, string[]>();
	const cardTopics = new Map<string, string[]>();

	for (const card of cards) {
		const keywords = extractTopicKeywords(`${card.front} ${card.back}`);
		cardTopics.set(card._id, keywords);

		for (const keyword of keywords) {
			if (!topicGroups.has(keyword)) {
				topicGroups.set(keyword, []);
			}
			const topicCards = topicGroups.get(keyword);
			if (topicCards) {
				topicCards.push(card._id);
			}
		}
	}

	const stagnantTopics: UserLearningPatterns["plateauDetection"]["stagnantTopics"] =
		[];
	const cutoffDate = Date.now() - PLATEAU_DETECTION_DAYS * 24 * 60 * 60 * 1000;

	// Analyze each topic for plateau patterns
	for (const [topic, cardIds] of topicGroups.entries()) {
		if (cardIds.length < 3) continue; // Need multiple cards for topic analysis

		const topicReviews = reviews.filter((r) => cardIds.includes(r.cardId));
		if (topicReviews.length < MIN_REVIEWS_FOR_PLATEAU) continue;

		// Sort reviews by date
		topicReviews.sort((a, b) => a.reviewDate - b.reviewDate);

		// Calculate performance over time windows
		const windowSize = Math.max(5, Math.floor(topicReviews.length / 4));
		const windows: Array<{
			startDate: number;
			endDate: number;
			performance: number;
		}> = [];

		for (
			let i = 0;
			i <= topicReviews.length - windowSize;
			i += Math.floor(windowSize / 2)
		) {
			const windowReviews = topicReviews.slice(i, i + windowSize);
			const performance =
				windowReviews.filter((r) => r.wasSuccessful).length /
				windowReviews.length;

			windows.push({
				endDate: windowReviews[windowReviews.length - 1].reviewDate,
				performance,
				startDate: windowReviews[0].reviewDate,
			});
		}

		// Check for plateau (no significant improvement in recent windows)
		if (windows.length >= 2) {
			const recentWindows = windows.filter((w) => w.endDate > cutoffDate);
			const olderWindows = windows.filter((w) => w.endDate <= cutoffDate);

			if (recentWindows.length > 0 && olderWindows.length > 0) {
				const recentAvg =
					recentWindows.reduce((sum, w) => sum + w.performance, 0) /
					recentWindows.length;
				const olderAvg =
					olderWindows.reduce((sum, w) => sum + w.performance, 0) /
					olderWindows.length;

				// If recent performance hasn't improved significantly
				if (recentAvg - olderAvg < 0.1) {
					const lastImprovement =
						olderWindows[olderWindows.length - 1]?.endDate || 0;
					const plateauDuration = Math.floor(
						(Date.now() - lastImprovement) / (24 * 60 * 60 * 1000),
					);

					if (plateauDuration >= PLATEAU_DETECTION_DAYS) {
						stagnantTopics.push({
							averagePerformance: recentAvg,
							cardIds: cardIds,
							lastImprovement,
							plateauDuration,
							topicKeywords: [topic],
						});
					}
				}
			}
		}
	}

	return {
		lastAnalyzed: Date.now(),
		plateauThreshold: PLATEAU_DETECTION_DAYS,
		stagnantTopics,
	};
}

/**
 * Calculate recent performance trends with rolling averages
 */
function calculateRecentPerformanceTrends(
	reviews: Array<{
		wasSuccessful: boolean;
		reviewDate: number;
		responseTime?: number;
		confidenceRating?: number;
	}>,
): UserLearningPatterns["recentPerformanceTrends"] {
	const now = Date.now();
	const shortTermCutoff =
		now - RECENT_PERFORMANCE_WINDOW_SHORT * 24 * 60 * 60 * 1000;
	const longTermCutoff =
		now - RECENT_PERFORMANCE_WINDOW_LONG * 24 * 60 * 60 * 1000;

	const shortTermReviews = reviews.filter(
		(r) => r.reviewDate > shortTermCutoff,
	);
	const longTermReviews = reviews.filter((r) => r.reviewDate > longTermCutoff);

	const calculateMetrics = (reviewSet: typeof reviews) => {
		if (reviewSet.length === 0) {
			return {
				averageResponseTime: 0,
				confidenceLevel: 0,
				reviewCount: 0,
				successRate: 0,
			};
		}

		const successRate =
			reviewSet.filter((r) => r.wasSuccessful).length / reviewSet.length;
		const responseTimes = reviewSet
			.filter((r) => r.responseTime)
			.map((r) => r.responseTime || 0);
		const averageResponseTime =
			responseTimes.length > 0
				? responseTimes.reduce((sum, time) => sum + time, 0) /
					responseTimes.length
				: 0;

		const confidenceRatings = reviewSet
			.filter((r) => r.confidenceRating)
			.map((r) => r.confidenceRating || 0);
		const confidenceLevel =
			confidenceRatings.length > 0
				? confidenceRatings.reduce((sum, rating) => sum + rating, 0) /
					confidenceRatings.length
				: 0;

		return {
			averageResponseTime,
			confidenceLevel,
			reviewCount: reviewSet.length,
			successRate,
		};
	};

	const last7Days = calculateMetrics(shortTermReviews);
	const last14Days = calculateMetrics(longTermReviews);

	// Calculate trends (percentage change from long-term to short-term)
	const calculateChange = (oldValue: number, newValue: number): number => {
		if (oldValue === 0) return 0;
		return ((newValue - oldValue) / oldValue) * 100;
	};

	return {
		last7Days,
		last14Days,
		lastUpdated: Date.now(),
		trend: {
			confidenceChange: calculateChange(
				last14Days.confidenceLevel,
				last7Days.confidenceLevel,
			),
			responseTimeChange:
				last7Days.averageResponseTime - last14Days.averageResponseTime,
			successRateChange: calculateChange(
				last14Days.successRate,
				last7Days.successRate,
			),
		},
	};
}

/**
 * Create default personalization configuration
 */
export function createDefaultPersonalizationConfig(): PathPersonalizationConfig {
	return {
		difficultyAdaptation: 0.2, // 20% adaptation for difficulty patterns
		inconsistencyBoost: 1.5, // 50% boost for inconsistent cards
		learningPatternWeight: 0.3, // 30% weight for learning patterns
		plateauBoost: 1.3, // 30% boost for plateau topics
		srsWeight: 0.7, // 70% weight for traditional SRS
		timeOfDayBoost: 1.2, // 20% boost for optimal time performance
	};
}

/**
 * Calculate weighted score combining traditional SRS factors with personalized learning metrics
 */
export function calculateWeightedScore(
	traditionalScore: number,
	learningPatterns: UserLearningPatterns | null,
	cardId: string,
	config: PathPersonalizationConfig,
	additionalFactors?: {
		currentHour?: number;
		cardEaseFactor?: number;
		cardDueDate?: number;
	},
): {
	finalScore: number;
	appliedBoosts: string[];
	reasoning: string;
} {
	if (!learningPatterns) {
		return {
			appliedBoosts: [],
			finalScore: traditionalScore,
			reasoning: "No learning patterns available - using traditional scoring",
		};
	}

	let personalizedScore = traditionalScore;
	const appliedBoosts: string[] = [];
	const reasoningParts: string[] = [];

	// 1. Apply inconsistency pattern boost
	const isInconsistent =
		learningPatterns.inconsistencyPatterns.cardIds.includes(cardId);
	if (isInconsistent && config.inconsistencyBoost > 1) {
		personalizedScore *= config.inconsistencyBoost;
		appliedBoosts.push("inconsistency");
		reasoningParts.push(
			`Inconsistent performance pattern (${Math.round((config.inconsistencyBoost - 1) * 100)}% boost)`,
		);
	}

	// 2. Apply plateau topic boost
	const isInPlateauTopic =
		learningPatterns.plateauDetection.stagnantTopics.some((topic) =>
			topic.cardIds.includes(cardId),
		);
	if (isInPlateauTopic && config.plateauBoost > 1) {
		personalizedScore *= config.plateauBoost;
		appliedBoosts.push("plateau");
		reasoningParts.push(
			`Plateau topic detected (${Math.round((config.plateauBoost - 1) * 100)}% boost)`,
		);
	}

	// 3. Apply time-of-day optimization
	if (
		additionalFactors?.currentHour !== undefined &&
		config.timeOfDayBoost > 1
	) {
		const currentHour = additionalFactors.currentHour;
		const timeSlot = getTimeSlot(currentHour);
		const timePerformance = learningPatterns.timeOfDayPerformance[timeSlot];

		if (
			timePerformance.optimalForLearning &&
			timePerformance.reviewCount >= 5
		) {
			personalizedScore *= config.timeOfDayBoost;
			appliedBoosts.push("timeOfDay");
			reasoningParts.push(
				`Optimal study time (${Math.round((config.timeOfDayBoost - 1) * 100)}% boost)`,
			);
		}
	}

	// 4. Apply difficulty pattern adaptation
	if (
		additionalFactors?.cardEaseFactor !== undefined &&
		config.difficultyAdaptation > 0
	) {
		const easeFactor = additionalFactors.cardEaseFactor;
		const difficultyCategory =
			easeFactor > 2.2
				? "easyCards"
				: easeFactor < 1.8
					? "hardCards"
					: "mediumCards";

		const userDifficultyPattern =
			learningPatterns.difficultyPatterns[difficultyCategory];
		if (userDifficultyPattern.successRate < 0.6) {
			const adaptationBoost = 1 + config.difficultyAdaptation;
			personalizedScore *= adaptationBoost;
			appliedBoosts.push("difficulty");
			reasoningParts.push(
				`Difficulty adaptation (${Math.round(config.difficultyAdaptation * 100)}% boost for struggling category)`,
			);
		}
	}

	// 5. Apply recent performance trend adjustment
	const recentTrend =
		learningPatterns.recentPerformanceTrends.trend.successRateChange;
	if (recentTrend < -10) {
		// Performance declining by more than 10%
		personalizedScore *= 1.15; // 15% boost for declining performance
		appliedBoosts.push("declining");
		reasoningParts.push(`Recent performance decline (15% boost)`);
	} else if (recentTrend > 20) {
		// Performance improving by more than 20%
		personalizedScore *= 0.9; // 10% reduction for improving performance
		appliedBoosts.push("improving");
		reasoningParts.push(`Recent performance improvement (10% reduction)`);
	}

	// 6. Calculate final weighted score
	const finalScore =
		traditionalScore * config.srsWeight +
		personalizedScore * config.learningPatternWeight;

	const reasoning =
		reasoningParts.length > 0
			? `Applied personalization: ${reasoningParts.join(", ")}`
			: "No personalization factors applied";

	return {
		appliedBoosts,
		finalScore,
		reasoning,
	};
}

/**
 * Calculate card priority score for study path generation
 */
export function calculateCardPriorityScore(
	card: {
		_id: string;
		dueDate?: number;
		easeFactor?: number;
		interval?: number;
		repetition?: number;
	},
	reviews: Array<{ wasSuccessful: boolean; reviewDate: number }>,
	learningPatterns: UserLearningPatterns | null,
	config: PathPersonalizationConfig,
	currentTime: number = Date.now(),
): {
	priorityScore: number;
	reasoning: string;
	appliedBoosts: string[];
} {
	// Calculate traditional SRS factors
	const dueDate = card.dueDate || currentTime;
	const overdueDays = Math.max(
		0,
		(currentTime - dueDate) / (24 * 60 * 60 * 1000),
	);
	const easeFactor = card.easeFactor || 2.5;
	const repetition = card.repetition || 0;

	// Traditional priority factors
	let traditionalScore = 0;

	// 1. Overdue factor (0-1, higher for more overdue)
	traditionalScore += Math.min(1, overdueDays / 30) * 0.4;

	// 2. Difficulty factor (0-1, higher for lower ease factor)
	traditionalScore += Math.max(0, (2.5 - easeFactor) / 1.2) * 0.3;

	// 3. Newness factor (0-1, higher for new cards)
	traditionalScore += Math.max(0, (3 - repetition) / 3) * 0.2;

	// 4. Recent performance factor
	if (reviews.length > 0) {
		const recentReviews = reviews.slice(-5); // Last 5 reviews
		const successRate =
			recentReviews.filter((r) => r.wasSuccessful).length /
			recentReviews.length;
		traditionalScore += (1 - successRate) * 0.1;
	}

	// Apply personalized weighting
	const result = calculateWeightedScore(
		traditionalScore,
		learningPatterns,
		card._id,
		config,
		{
			cardDueDate: dueDate,
			cardEaseFactor: easeFactor,
			currentHour: new Date(currentTime).getHours(),
		},
	);

	return {
		appliedBoosts: result.appliedBoosts,
		priorityScore: result.finalScore,
		reasoning: result.reasoning,
	};
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
 * Calculate domain-specific performance adjustments
 */
function calculateDomainAdjustments(
	conceptMastery: {
		masteryLevel: number;
		confidenceLevel: number;
		learningVelocity: number;
		difficultyTrend: "improving" | "stable" | "declining";
		masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
	},
	learningPattern?: LearningPattern,
): {
	domainEaseAdjustment: number;
	domainIntervalMultiplier: number;
	domainReasoning: string;
} {
	let domainEaseAdjustment = 0;
	let domainIntervalMultiplier = 1.0;
	const reasoningParts: string[] = [];

	// Adjust based on overall learning velocity patterns
	if (learningPattern) {
		// If user's general learning velocity differs significantly from concept-specific velocity
		const velocityDifference =
			conceptMastery.learningVelocity - learningPattern.learningVelocity;

		if (Math.abs(velocityDifference) > 0.5) {
			if (velocityDifference > 0) {
				// This concept is learned faster than average - can be more aggressive
				domainEaseAdjustment += 0.05;
				domainIntervalMultiplier *= 1.1;
				reasoningParts.push(
					"Concept learned faster than average (+0.05 ease, +10% interval)",
				);
			} else {
				// This concept is learned slower than average - be more conservative
				domainEaseAdjustment -= 0.05;
				domainIntervalMultiplier *= 0.95;
				reasoningParts.push(
					"Concept learned slower than average (-0.05 ease, -5% interval)",
				);
			}
		}

		// Adjust based on difficulty patterns for similar ease factor ranges
		const currentEaseCategory =
			conceptMastery.masteryLevel > 0.7
				? "easyCards"
				: conceptMastery.masteryLevel < 0.3
					? "hardCards"
					: "mediumCards";

		const difficultyPattern =
			learningPattern.difficultyPatterns[currentEaseCategory];
		if (difficultyPattern.successRate < 0.6) {
			// User struggles with this difficulty category
			domainEaseAdjustment -= 0.1;
			domainIntervalMultiplier *= 0.9;
			reasoningParts.push(
				`Struggling with ${currentEaseCategory} (-0.1 ease, -10% interval)`,
			);
		} else if (difficultyPattern.successRate > 0.85) {
			// User excels at this difficulty category
			domainEaseAdjustment += 0.05;
			domainIntervalMultiplier *= 1.05;
			reasoningParts.push(
				`Excelling at ${currentEaseCategory} (+0.05 ease, +5% interval)`,
			);
		}

		// Time-of-day performance consideration
		const currentHour = new Date().getHours();
		const timeSlot = getTimeSlot(currentHour);
		const timePerformance = learningPattern.timeOfDayPerformance[timeSlot];

		if (timePerformance.reviewCount >= 5) {
			if (timePerformance.successRate > 0.8) {
				domainIntervalMultiplier *= 1.05;
				reasoningParts.push("Optimal time slot (+5% interval)");
			} else if (timePerformance.successRate < 0.6) {
				domainIntervalMultiplier *= 0.95;
				reasoningParts.push("Suboptimal time slot (-5% interval)");
			}
		}
	}

	return {
		domainEaseAdjustment,
		domainIntervalMultiplier,
		domainReasoning: reasoningParts.join("; "),
	};
}

/**
 * Calculate how concept mastery should influence SM-2 parameters
 */
function calculateMasteryInfluence(
	conceptMastery: {
		masteryLevel: number;
		confidenceLevel: number;
		learningVelocity: number;
		difficultyTrend: "improving" | "stable" | "declining";
		masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
	},
	quality: number,
	learningPattern?: LearningPattern,
): {
	easeFactorAdjustment: number;
	intervalMultiplier: number;
	reasoning: string;
} {
	let easeFactorAdjustment = 0;
	let intervalMultiplier = 1.0;
	const reasoningParts: string[] = [];

	// Apply domain-specific adjustments first
	const domainAdjustments = calculateDomainAdjustments(
		conceptMastery,
		learningPattern,
	);
	easeFactorAdjustment += domainAdjustments.domainEaseAdjustment;
	intervalMultiplier *= domainAdjustments.domainIntervalMultiplier;
	if (domainAdjustments.domainReasoning) {
		reasoningParts.push(domainAdjustments.domainReasoning);
	}

	// Base adjustments on mastery level
	if (conceptMastery.masteryLevel >= 0.8) {
		// High mastery - can handle longer intervals and higher ease factors
		easeFactorAdjustment += 0.1;
		intervalMultiplier *= 1.2;
		reasoningParts.push("High mastery level (+0.1 ease, +20% interval)");
	} else if (conceptMastery.masteryLevel <= 0.3) {
		// Low mastery - needs more frequent reviews
		easeFactorAdjustment -= 0.05;
		intervalMultiplier *= 0.8;
		reasoningParts.push("Low mastery level (-0.05 ease, -20% interval)");
	}

	// Adjust based on difficulty trend
	switch (conceptMastery.difficultyTrend) {
		case "improving":
			easeFactorAdjustment += 0.05;
			intervalMultiplier *= 1.1;
			reasoningParts.push("Improving trend (+0.05 ease, +10% interval)");
			break;
		case "declining":
			easeFactorAdjustment -= 0.1;
			intervalMultiplier *= 0.85;
			reasoningParts.push("Declining trend (-0.1 ease, -15% interval)");
			break;
		case "stable":
			// No adjustment for stable trend
			break;
	}

	// Adjust based on learning velocity
	if (conceptMastery.learningVelocity > 1.5) {
		// Fast learner for this concept
		intervalMultiplier *= 1.15;
		reasoningParts.push("High learning velocity (+15% interval)");
	} else if (conceptMastery.learningVelocity < 0.5) {
		// Slow learner for this concept
		intervalMultiplier *= 0.9;
		reasoningParts.push("Low learning velocity (-10% interval)");
	}

	// Adjust based on mastery category
	switch (conceptMastery.masteryCategory) {
		case "expert":
			easeFactorAdjustment += 0.15;
			intervalMultiplier *= 1.3;
			reasoningParts.push("Expert level (+0.15 ease, +30% interval)");
			break;
		case "advanced":
			easeFactorAdjustment += 0.1;
			intervalMultiplier *= 1.2;
			reasoningParts.push("Advanced level (+0.1 ease, +20% interval)");
			break;
		case "intermediate":
			easeFactorAdjustment += 0.05;
			intervalMultiplier *= 1.1;
			reasoningParts.push("Intermediate level (+0.05 ease, +10% interval)");
			break;
		case "beginner":
			easeFactorAdjustment -= 0.05;
			intervalMultiplier *= 0.9;
			reasoningParts.push("Beginner level (-0.05 ease, -10% interval)");
			break;
	}

	// Quality-based fine-tuning
	if (quality === 5 && conceptMastery.masteryLevel > 0.7) {
		// Perfect response with high mastery - boost more aggressively
		easeFactorAdjustment += 0.05;
		intervalMultiplier *= 1.1;
		reasoningParts.push(
			"Perfect response with high mastery (+0.05 ease, +10% interval)",
		);
	} else if (quality === 3 && conceptMastery.masteryLevel < 0.4) {
		// Barely correct with low mastery - be more conservative
		easeFactorAdjustment -= 0.05;
		intervalMultiplier *= 0.9;
		reasoningParts.push(
			"Barely correct with low mastery (-0.05 ease, -10% interval)",
		);
	}

	// Ensure reasonable bounds
	easeFactorAdjustment = Math.max(-0.3, Math.min(0.3, easeFactorAdjustment));
	intervalMultiplier = Math.max(0.5, Math.min(2.0, intervalMultiplier));

	return {
		easeFactorAdjustment,
		intervalMultiplier,
		reasoning: reasoningParts.join("; "),
	};
}

/**
 * Enhanced SM-2 calculation with adaptive learning and concept mastery integration
 */
function calculateAdaptiveSM2(
	quality: number,
	repetition: number,
	easeFactor: number,
	interval: number,
	learningPattern?: LearningPattern,
	conceptMastery?: {
		masteryLevel: number;
		confidenceLevel: number;
		learningVelocity: number;
		difficultyTrend: "improving" | "stable" | "declining";
		masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
	},
	currentHour: number = new Date().getHours(),
): {
	repetition: number;
	easeFactor: number;
	interval: number;
	dueDate: number;
	confidence: number;
	masteryAdjustment: number;
} {
	let newRepetition: number;
	let newEaseFactor = easeFactor;
	let newInterval: number;
	let confidence = 0.5; // Default confidence
	let masteryAdjustment = 0; // Track how much concept mastery influenced the calculation

	// Standard SM-2 logic
	if (quality < 3) {
		newRepetition = 0;
		newInterval = 1;
		// Don't update ease factor for failed reviews (as per SM-2 spec)
	} else {
		newRepetition = repetition + 1;

		if (newRepetition === 1) {
			newInterval = 1;
		} else if (newRepetition === 2) {
			newInterval = 6;
		} else {
			newInterval = Math.round(interval * easeFactor);
		}

		// Update ease factor (only for successful reviews)
		newEaseFactor =
			easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
		newEaseFactor = Math.max(1.3, newEaseFactor);
	}

	// Apply concept mastery adjustments if available
	if (conceptMastery && quality >= 3) {
		// Concept mastery influences ease factor adjustments
		const masteryInfluence = calculateMasteryInfluence(
			conceptMastery,
			quality,
			learningPattern,
		);

		// Apply mastery-based ease factor adjustment
		const masteryEaseAdjustment = masteryInfluence.easeFactorAdjustment;
		newEaseFactor += masteryEaseAdjustment;
		newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));

		// Apply mastery-based interval adjustment
		const masteryIntervalMultiplier = masteryInfluence.intervalMultiplier;
		newInterval = Math.round(newInterval * masteryIntervalMultiplier);

		// Track the total adjustment made
		masteryAdjustment = masteryEaseAdjustment + (masteryIntervalMultiplier - 1);

		// Update confidence based on mastery
		confidence = Math.max(confidence, conceptMastery.confidenceLevel);
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

		// Adjust interval based on learning velocity (if not already adjusted by mastery)
		if (!conceptMastery) {
			if (learningPattern.learningVelocity > 1.5) {
				// Fast learner - can handle slightly longer intervals
				newInterval = Math.round(newInterval * 1.1);
			} else if (learningPattern.learningVelocity < 0.5) {
				// Slower learner - use shorter intervals
				newInterval = Math.round(newInterval * 0.9);
			}
		}

		// Calculate confidence based on patterns (if not already set by mastery)
		if (!conceptMastery) {
			const timeSlot = getTimeSlot(currentHour);
			const timePerformance = learningPattern.timeOfDayPerformance[timeSlot];
			confidence =
				timePerformance.reviewCount >= 5 ? timePerformance.successRate : 0.5;
		}
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
		masteryAdjustment,
		repetition: newRepetition,
	};
}

/**
 * Get cached learning patterns with automatic refresh if stale
 */
export const getCachedLearningPatterns = query({
	args: {
		language: v.optional(v.string()),
		maxAgeHours: v.optional(v.number()), // Maximum age in hours before refresh
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const maxAge = (args.maxAgeHours || 6) * 60 * 60 * 1000; // Default 6 hours
		const pattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!pattern) {
			// No pattern exists - return null to indicate patterns need calculation
			return null;
		}

		// Check if pattern is stale
		const age = Date.now() - pattern.lastUpdated;
		if (age > maxAge) {
			// Pattern is stale - return it but mark as stale
			return {
				...pattern,
				isStale: true,
			};
		}

		return pattern;
	},
	returns: v.union(
		v.object({
			_creationTime: v.number(),
			_id: v.id("learningPatterns"),
			averageSuccessRate: v.float64(),
			difficultyPatterns: v.object({
				easyCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
				hardCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
				mediumCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
			}),
			inconsistencyPatterns: v.object({
				averageVariance: v.float64(),
				cardIds: v.array(v.string()),
				detectionThreshold: v.float64(),
				lastCalculated: v.float64(),
			}),
			lastUpdated: v.float64(),
			learningVelocity: v.float64(),
			personalEaseFactorBias: v.float64(),
			personalizationConfig: v.object({
				adaptDifficultyProgression: v.boolean(),
				focusOnPlateauTopics: v.boolean(),
				learningPatternInfluence: v.float64(),
				optimizeForTimeOfDay: v.boolean(),
				prioritizeInconsistentCards: v.boolean(),
			}),
			plateauDetection: v.object({
				lastAnalyzed: v.float64(),
				plateauThreshold: v.float64(),
				stagnantTopics: v.array(
					v.object({
						averagePerformance: v.float64(),
						cardIds: v.array(v.string()),
						lastImprovement: v.float64(),
						plateauDuration: v.float64(),
						topicKeywords: v.array(v.string()),
					}),
				),
			}),
			recentPerformanceTrends: v.object({
				isStale: v.optional(v.boolean()),
				last7Days: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				last14Days: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				lastUpdated: v.float64(),
				trend: v.object({
					confidenceChange: v.float64(),
					responseTimeChange: v.float64(),
					successRateChange: v.float64(),
				}),
			}),
			retentionCurve: v.array(
				v.object({
					interval: v.float64(),
					retentionRate: v.float64(),
				}),
			),
			timeOfDayPerformance: v.object({
				afternoon: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				early_morning: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				evening: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				late_night: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				morning: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				night: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
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
 * Get or create learning pattern for user
 */
export const getUserLearningPattern = query({
	args: {
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const pattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		return pattern || null;
	},
	returns: v.union(
		v.object({
			_creationTime: v.float64(),
			_id: v.id("learningPatterns"),
			averageSuccessRate: v.float64(),
			difficultyPatterns: v.object({
				easyCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
				hardCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
				mediumCards: v.object({
					averageInterval: v.float64(),
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					successRate: v.float64(),
				}),
			}),
			inconsistencyPatterns: v.object({
				averageVariance: v.float64(),
				cardIds: v.array(v.string()),
				detectionThreshold: v.float64(),
				lastCalculated: v.float64(),
			}),
			lastUpdated: v.float64(),
			learningVelocity: v.float64(),
			personalEaseFactorBias: v.float64(),
			personalizationConfig: v.object({
				adaptDifficultyProgression: v.boolean(),
				focusOnPlateauTopics: v.boolean(),
				learningPatternInfluence: v.float64(),
				optimizeForTimeOfDay: v.boolean(),
				prioritizeInconsistentCards: v.boolean(),
			}),
			plateauDetection: v.object({
				lastAnalyzed: v.float64(),
				plateauThreshold: v.float64(),
				stagnantTopics: v.array(
					v.object({
						averagePerformance: v.float64(),
						cardIds: v.array(v.string()),
						lastImprovement: v.float64(),
						plateauDuration: v.float64(),
						topicKeywords: v.array(v.string()),
					}),
				),
			}),
			recentPerformanceTrends: v.object({
				last7Days: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				last14Days: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				lastUpdated: v.float64(),
				trend: v.object({
					confidenceChange: v.float64(),
					responseTimeChange: v.float64(),
					successRateChange: v.float64(),
				}),
			}),
			retentionCurve: v.array(
				v.object({
					interval: v.float64(),
					retentionRate: v.float64(),
				}),
			),
			timeOfDayPerformance: v.object({
				afternoon: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				early_morning: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				evening: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				late_night: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				morning: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
					reviewCount: v.float64(),
					successRate: v.float64(),
				}),
				night: v.object({
					averageResponseTime: v.float64(),
					confidenceLevel: v.float64(),
					optimalForLearning: v.boolean(),
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
		language: v.optional(v.string()),
		quality: v.number(),
		responseTime: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const language = normalizeLanguage(args.language);

		// Get card and verify ownership
		const card = await ctx.db.get(args.cardId);
		if (!card) {
			throw new Error(t("adaptiveLearning.errors.cardNotFound", language));
		}

		// deepcode ignore Sqli: <No SQL injection risk in Convex>
		const deck = await ctx.db.get(card.deckId);
		if (!deck || deck.userId !== identity.subject) {
			throw new Error(t("adaptiveLearning.errors.onlyOwnCards", language));
		}

		// Get user's learning pattern
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Get concept mastery data for this card
		const conceptMasteries = await ctx.db
			.query("conceptMasteries")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		// Extract relevant concept mastery for this card
		let relevantConceptMastery:
			| {
					masteryLevel: number;
					confidenceLevel: number;
					learningVelocity: number;
					difficultyTrend: "improving" | "stable" | "declining";
					masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
			  }
			| undefined;

		if (conceptMasteries) {
			// Find concept mastery that matches this card's content
			// For now, use the first concept or average if multiple concepts exist
			const concepts = conceptMasteries.concepts;
			if (concepts.length > 0) {
				// Use the concept with the lowest mastery level (most challenging)
				const mostChallengingConcept = concepts.reduce((min, concept) =>
					concept.masteryLevel < min.masteryLevel ? concept : min,
				);

				relevantConceptMastery = {
					confidenceLevel: mostChallengingConcept.confidenceLevel,
					difficultyTrend: mostChallengingConcept.difficultyTrend,
					learningVelocity: mostChallengingConcept.learningVelocity || 1.0,
					masteryCategory: mostChallengingConcept.masteryCategory,
					masteryLevel: mostChallengingConcept.masteryLevel,
				};
			}
		}

		// Get current card parameters
		const currentRepetition = card.repetition ?? 0;
		const currentEaseFactor = card.easeFactor ?? 2.5;
		const currentInterval = card.interval ?? 1;

		// Calculate new parameters with adaptive algorithm including concept mastery
		const result = calculateAdaptiveSM2(
			args.quality,
			currentRepetition,
			currentEaseFactor,
			currentInterval,
			learningPattern || undefined,
			relevantConceptMastery,
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
			masteryAdjustment: result.masteryAdjustment,
			masteryLevel: relevantConceptMastery?.masteryLevel,
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
		let personalizedMessage = `${t("adaptiveLearning.messages.greatJob", language)} `;
		if (result.confidence > 0.8) {
			personalizedMessage += t(
				"adaptiveLearning.messages.masteringWell",
				language,
			);
		} else if (result.confidence < 0.4) {
			personalizedMessage += t(
				"adaptiveLearning.messages.challenging",
				language,
			);
		} else {
			personalizedMessage += t(
				"adaptiveLearning.messages.steadyProgress",
				language,
			);
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
 * Calculate comprehensive learning patterns for a user
 * This is the main analytics service function
 */
export const calculateUserLearningPatterns = mutation({
	args: {
		forceRecalculation: v.optional(v.boolean()),
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Check if patterns were recently calculated (unless forced)
		if (!args.forceRecalculation) {
			const existingPattern = await ctx.db
				.query("learningPatterns")
				.withIndex("by_userId", (q) => q.eq("userId", args.userId))
				.first();

			if (existingPattern) {
				const hoursSinceUpdate =
					(Date.now() - existingPattern.lastUpdated) / (1000 * 60 * 60);
				if (hoursSinceUpdate < 6) {
					// Don't recalculate if updated within 6 hours
					return existingPattern;
				}
			}
		}

		// Get comprehensive review history
		const cutoffDate =
			Date.now() - LEARNING_VELOCITY_WINDOW * 24 * 60 * 60 * 1000;
		const allReviews = await ctx.db
			.query("cardReviews")
			.withIndex("by_userId_and_date", (q) =>
				q.eq("userId", args.userId).gte("reviewDate", cutoffDate),
			)
			.order("desc")
			.take(PERFORMANCE_HISTORY_LIMIT * 2); // Get more data for comprehensive analysis

		if (allReviews.length < MIN_REVIEWS_FOR_ADAPTATION) {
			return null; // Not enough data for meaningful patterns
		}

		// Get user's cards for topic analysis
		const userCards = await ctx.db
			.query("cards")
			.filter((q) => q.eq(q.field("userId"), args.userId))
			.collect();

		// Calculate all learning pattern components
		const inconsistencyPatterns = calculateInconsistencyPatterns(
			allReviews.map((r) => ({
				cardId: r.cardId,
				reviewDate: r.reviewDate,
				wasSuccessful: r.wasSuccessful,
			})),
		);

		const plateauDetection = detectPlateauPatterns(
			allReviews.map((r) => ({
				cardId: r.cardId,
				responseTime: r.responseTime,
				reviewDate: r.reviewDate,
				wasSuccessful: r.wasSuccessful,
			})),
			userCards.map((c) => ({
				_id: c._id,
				back: c.back,
				front: c.front,
			})),
		);

		const recentPerformanceTrends = calculateRecentPerformanceTrends(
			allReviews.map((r) => ({
				confidenceRating: r.confidenceRating,
				responseTime: r.responseTime,
				reviewDate: r.reviewDate,
				wasSuccessful: r.wasSuccessful,
			})),
		);

		// Calculate basic metrics (reuse existing logic)
		const successfulReviews = allReviews.filter((r) => r.wasSuccessful).length;
		const averageSuccessRate = successfulReviews / allReviews.length;

		const masteredCards = allReviews.filter(
			(r) => r.repetitionAfter >= 3,
		).length;
		const daysCovered = Math.max(
			1,
			(Date.now() - allReviews[allReviews.length - 1].reviewDate) /
				(24 * 60 * 60 * 1000),
		);
		const learningVelocity = masteredCards / daysCovered;

		// Calculate enhanced time-of-day performance
		const timeSlotData: Record<
			TimeSlot,
			{
				confidenceSum: number;
				successes: number;
				total: number;
				totalResponseTime: number;
			}
		> = {
			afternoon: {
				confidenceSum: 0,
				successes: 0,
				total: 0,
				totalResponseTime: 0,
			},
			early_morning: {
				confidenceSum: 0,
				successes: 0,
				total: 0,
				totalResponseTime: 0,
			},
			evening: {
				confidenceSum: 0,
				successes: 0,
				total: 0,
				totalResponseTime: 0,
			},
			late_night: {
				confidenceSum: 0,
				successes: 0,
				total: 0,
				totalResponseTime: 0,
			},
			morning: {
				confidenceSum: 0,
				successes: 0,
				total: 0,
				totalResponseTime: 0,
			},
			night: { confidenceSum: 0, successes: 0, total: 0, totalResponseTime: 0 },
		};

		for (const review of allReviews) {
			if (review.timeOfDay !== undefined) {
				const timeSlot = getTimeSlot(review.timeOfDay);
				timeSlotData[timeSlot].total++;
				if (review.wasSuccessful) {
					timeSlotData[timeSlot].successes++;
				}
				if (review.responseTime) {
					timeSlotData[timeSlot].totalResponseTime += review.responseTime;
				}
				if (review.confidenceRating) {
					timeSlotData[timeSlot].confidenceSum += review.confidenceRating;
				}
			}
		}

		// Determine optimal time slots
		const timeSlotPerformance = Object.entries(timeSlotData).map(
			([slot, data]) => ({
				averageResponseTime:
					data.total > 0 ? data.totalResponseTime / data.total : 0,
				confidenceLevel: data.total > 0 ? data.confidenceSum / data.total : 0,
				reviewCount: data.total,
				slot: slot as TimeSlot,
				successRate: data.total > 0 ? data.successes / data.total : 0.5,
			}),
		);

		const optimalSlots = timeSlotPerformance
			.filter((p) => p.reviewCount >= 5)
			.sort((a, b) => b.successRate - a.successRate)
			.slice(0, 2)
			.map((p) => p.slot);

		const timeOfDayPerformance: UserLearningPatterns["timeOfDayPerformance"] =
			Object.fromEntries(
				timeSlotPerformance.map((p) => [
					p.slot,
					{
						averageResponseTime: p.averageResponseTime,
						confidenceLevel: p.confidenceLevel,
						optimalForLearning: optimalSlots.includes(p.slot),
						reviewCount: p.reviewCount,
						successRate: p.successRate,
					},
				]),
			) as UserLearningPatterns["timeOfDayPerformance"];

		return {
			averageSuccessRate,
			inconsistencyPatterns,
			learningVelocity,
			plateauDetection,
			recentPerformanceTrends,
			timeOfDayPerformance,
		};
	},
	returns: v.union(
		v.object({
			averageSuccessRate: v.number(),
			inconsistencyPatterns: v.object({
				averageVariance: v.number(),
				cardIds: v.array(v.string()),
				detectionThreshold: v.number(),
				lastCalculated: v.number(),
			}),
			learningVelocity: v.number(),
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
		}),
		v.null(),
	),
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

		// Calculate new learning pattern metrics
		const cards = await ctx.db.query("cards").collect();
		const inconsistencyPatterns = calculateInconsistencyPatterns(recentReviews);
		const plateauDetection = detectPlateauPatterns(recentReviews, cards);
		const recentPerformanceTrends =
			calculateRecentPerformanceTrends(recentReviews);

		// Determine optimal time slots for learning
		const optimalTimeSlots = Object.entries(timeOfDayPerformance)
			.filter(([_, data]) => data.reviewCount >= 5)
			.sort(([_, a], [__, b]) => b.successRate - a.successRate)
			.slice(0, 2) // Top 2 time slots
			.map(([slot]) => slot);

		// Update time of day performance with optimal flags
		const enhancedTimeOfDayPerformance = Object.fromEntries(
			Object.entries(timeOfDayPerformance).map(([slot, data]) => [
				slot,
				{
					...data,
					optimalForLearning: optimalTimeSlots.includes(slot),
				},
			]),
		) as UserLearningPatterns["timeOfDayPerformance"];

		// Enhanced difficulty patterns with additional metrics
		const enhancedDifficultyPatterns = {
			easyCards: {
				...difficultyPatterns.easyCards,
				averageResponseTime: 0, // TODO: Calculate from response times
				confidenceLevel: 0, // TODO: Calculate from confidence ratings
			},
			hardCards: {
				...difficultyPatterns.hardCards,
				averageResponseTime: 0,
				confidenceLevel: 0,
			},
			mediumCards: {
				...difficultyPatterns.mediumCards,
				averageResponseTime: 0,
				confidenceLevel: 0,
			},
		};

		const patternData: Omit<UserLearningPatterns, "userId"> = {
			averageSuccessRate,
			difficultyPatterns: enhancedDifficultyPatterns,
			inconsistencyPatterns,
			lastUpdated: Date.now(),
			learningVelocity,
			personalEaseFactorBias,
			personalizationConfig: {
				adaptDifficultyProgression: true,
				focusOnPlateauTopics: true,
				learningPatternInfluence: 0.3,
				optimizeForTimeOfDay: true,
				prioritizeInconsistentCards: true,
			},
			plateauDetection,
			recentPerformanceTrends,
			retentionCurve,
			timeOfDayPerformance: enhancedTimeOfDayPerformance,
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
 * Update user's personalization configuration
 */
export const updatePersonalizationConfig = mutation({
	args: {
		adaptDifficultyProgression: v.optional(v.boolean()),
		focusOnPlateauTopics: v.optional(v.boolean()),
		language: v.optional(v.string()),
		learningPatternInfluence: v.optional(v.number()), // 0-1 scale
		optimizeForTimeOfDay: v.optional(v.boolean()),
		prioritizeInconsistentCards: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		// Validate learning pattern influence
		if (args.learningPatternInfluence !== undefined) {
			if (
				args.learningPatternInfluence < 0 ||
				args.learningPatternInfluence > 1
			) {
				throw new Error("Learning pattern influence must be between 0 and 1");
			}
		}

		// Get existing learning pattern or create default
		let existingPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!existingPattern) {
			// Create default learning pattern if none exists
			const defaultConfig = {
				adaptDifficultyProgression: true,
				focusOnPlateauTopics: true,
				learningPatternInfluence: 0.3,
				optimizeForTimeOfDay: true,
				prioritizeInconsistentCards: true,
			};

			await ctx.db.insert("learningPatterns", {
				averageSuccessRate: 0.7,
				difficultyPatterns: {
					easyCards: {
						averageInterval: 7,
						averageResponseTime: 0,
						confidenceLevel: 0,
						successRate: 0.8,
					},
					hardCards: {
						averageInterval: 3,
						averageResponseTime: 0,
						confidenceLevel: 0,
						successRate: 0.6,
					},
					mediumCards: {
						averageInterval: 5,
						averageResponseTime: 0,
						confidenceLevel: 0,
						successRate: 0.7,
					},
				},
				inconsistencyPatterns: {
					averageVariance: 0,
					cardIds: [],
					detectionThreshold: INCONSISTENCY_VARIANCE_THRESHOLD,
					lastCalculated: Date.now(),
				},
				lastUpdated: Date.now(),
				learningVelocity: 1.0,
				personalEaseFactorBias: 0,
				personalizationConfig: defaultConfig,
				plateauDetection: {
					lastAnalyzed: Date.now(),
					plateauThreshold: PLATEAU_DETECTION_DAYS,
					stagnantTopics: [],
				},
				recentPerformanceTrends: {
					last7Days: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						reviewCount: 0,
						successRate: 0,
					},
					last14Days: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						reviewCount: 0,
						successRate: 0,
					},
					lastUpdated: Date.now(),
					trend: {
						confidenceChange: 0,
						responseTimeChange: 0,
						successRateChange: 0,
					},
				},
				retentionCurve: [
					{ interval: 1, retentionRate: 0.9 },
					{ interval: 7, retentionRate: 0.7 },
					{ interval: 30, retentionRate: 0.6 },
					{ interval: 90, retentionRate: 0.5 },
				],
				timeOfDayPerformance: {
					afternoon: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
					early_morning: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
					evening: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
					late_night: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
					morning: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
					night: {
						averageResponseTime: 0,
						confidenceLevel: 0,
						optimalForLearning: false,
						reviewCount: 0,
						successRate: 0.5,
					},
				},
				userId: identity.subject,
			});

			existingPattern = await ctx.db
				.query("learningPatterns")
				.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
				.first();
		}

		if (!existingPattern) {
			throw new Error("Failed to create learning pattern");
		}

		// Update personalization configuration
		const updatedConfig = {
			adaptDifficultyProgression:
				args.adaptDifficultyProgression ??
				existingPattern.personalizationConfig.adaptDifficultyProgression,
			focusOnPlateauTopics:
				args.focusOnPlateauTopics ??
				existingPattern.personalizationConfig.focusOnPlateauTopics,
			learningPatternInfluence:
				args.learningPatternInfluence ??
				existingPattern.personalizationConfig.learningPatternInfluence,
			optimizeForTimeOfDay:
				args.optimizeForTimeOfDay ??
				existingPattern.personalizationConfig.optimizeForTimeOfDay,
			prioritizeInconsistentCards:
				args.prioritizeInconsistentCards ??
				existingPattern.personalizationConfig.prioritizeInconsistentCards,
		};

		await ctx.db.patch(existingPattern._id, {
			lastUpdated: Date.now(),
			personalizationConfig: updatedConfig,
		});

		return {
			message: "Personalization settings updated successfully",
			success: true,
			updatedConfig,
		};
	},
	returns: v.object({
		message: v.string(),
		success: v.boolean(),
		updatedConfig: v.object({
			adaptDifficultyProgression: v.boolean(),
			focusOnPlateauTopics: v.boolean(),
			learningPatternInfluence: v.number(),
			optimizeForTimeOfDay: v.boolean(),
			prioritizeInconsistentCards: v.boolean(),
		}),
	}),
});

/**
 * Get user's current personalization configuration
 */
export const getPersonalizationConfig = query({
	args: {
		language: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const pattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		if (!pattern) {
			// Return default configuration
			return {
				adaptDifficultyProgression: true,
				focusOnPlateauTopics: true,
				learningPatternInfluence: 0.3,
				optimizeForTimeOfDay: true,
				prioritizeInconsistentCards: true,
			};
		}

		return pattern.personalizationConfig;
	},
	returns: v.object({
		adaptDifficultyProgression: v.boolean(),
		focusOnPlateauTopics: v.boolean(),
		learningPatternInfluence: v.number(),
		optimizeForTimeOfDay: v.boolean(),
		prioritizeInconsistentCards: v.boolean(),
	}),
});

/**
 * Get comprehensive learning insights for analytics dashboard
 */
export const getLearningInsights = query({
	args: {
		language: v.optional(v.string()),
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
			const language = normalizeLanguage(args.language);
			throw new Error(
				t("adaptiveLearning.errors.userNotAuthenticated", language),
			);
		}

		const language = normalizeLanguage(args.language);

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
				description: t(
					"adaptiveLearning.recommendations.optimizeStudyTime.description",
					language,
					{
						successRate: Math.round(bestTime[1].successRate * 100),
						timeSlot: bestTime[0].replace(/_/g, " "),
					},
				),
				priority: "high" as const,
				title: t(
					"adaptiveLearning.recommendations.optimizeStudyTime.title",
					language,
				),
				type: t("adaptiveLearning.types.timeOptimization", language),
			});
		}

		// Difficulty-based recommendations
		const hardCardsSuccess =
			learningPattern.difficultyPatterns.hardCards.successRate;
		if (hardCardsSuccess < 0.6) {
			recommendations.push({
				actionable: true,
				description: t(
					"adaptiveLearning.recommendations.focusDifficultCards.description",
					language,
					{
						successRate: Math.round(hardCardsSuccess * 100),
					},
				),
				priority: "medium" as const,
				title: t(
					"adaptiveLearning.recommendations.focusDifficultCards.title",
					language,
				),
				type: t("adaptiveLearning.types.difficultyManagement", language),
			});
		}

		// Learning velocity recommendations
		if (learningPattern.learningVelocity < 0.5) {
			recommendations.push({
				actionable: true,
				description: t(
					"adaptiveLearning.recommendations.increaseFrequency.description",
					language,
				),
				priority: "medium" as const,
				title: t(
					"adaptiveLearning.recommendations.increaseFrequency.title",
					language,
				),
				type: t("adaptiveLearning.types.velocityImprovement", language),
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
