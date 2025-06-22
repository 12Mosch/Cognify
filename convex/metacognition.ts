import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Metacognitive Learning Tools
 *
 * This module provides tools to enhance metacognitive awareness including:
 * - Confidence ratings and calibration tracking
 * - Learning reflection prompts and journaling
 * - Study strategy recommendations
 * - Self-assessment and awareness building
 * - Learning goal setting and tracking
 * - Cognitive load monitoring
 */

// Learning reflection categories
// type ReflectionCategory = 'difficulty' | 'strategy' | 'motivation' | 'understanding' | 'time_management' | 'goals';

// interface LearningReflection {
//   userId: string;
//   sessionId?: string;
//   deckId?: string;
//   category: ReflectionCategory;
//   prompt: string;
//   response: string;
//   rating: number; // 1-5 scale
//   timestamp: number;
//   tags: string[];
// }

// interface ConfidenceCalibration {
//   userId: string;
//   cardId: string;
//   predictedConfidence: number; // User's prediction (0-1)
//   actualPerformance: number; // Actual success (0-1)
//   calibrationError: number; // |predicted - actual|
//   timestamp: number;
// }

interface StudyStrategy {
	id: string;
	name: string;
	description: string;
	category:
		| "encoding"
		| "retrieval"
		| "elaboration"
		| "organization"
		| "metacognitive";
	effectiveness: number; // 0-1 based on research
	difficulty: "beginner" | "intermediate" | "advanced";
	timeRequired: number; // minutes
	applicableContexts: string[];
}

// Predefined study strategies
const STUDY_STRATEGIES: StudyStrategy[] = [
	{
		applicableContexts: ["flashcards", "concepts", "facts"],
		category: "retrieval",
		description: "Test yourself without looking at the answer first",
		difficulty: "beginner",
		effectiveness: 0.9,
		id: "active_recall",
		name: "Active Recall",
		timeRequired: 0,
	},
	{
		applicableContexts: ["memorization", "long_term_retention"],
		category: "retrieval",
		description: "Review material at increasing intervals",
		difficulty: "beginner",
		effectiveness: 0.95,
		id: "spaced_repetition",
		name: "Spaced Repetition",
		timeRequired: 0,
	},
	{
		applicableContexts: ["concepts", "understanding", "connections"],
		category: "elaboration",
		description: 'Ask yourself "why" and "how" questions about the material',
		difficulty: "intermediate",
		effectiveness: 0.7,
		id: "elaborative_interrogation",
		name: "Elaborative Interrogation",
		timeRequired: 5,
	},
	{
		applicableContexts: ["complex_topics", "problem_solving"],
		category: "elaboration",
		description: "Explain the material to yourself in your own words",
		difficulty: "intermediate",
		effectiveness: 0.8,
		id: "self_explanation",
		name: "Self-Explanation",
		timeRequired: 3,
	},
	{
		applicableContexts: ["visual_learners", "complex_concepts"],
		category: "encoding",
		description: "Combine visual and verbal information",
		difficulty: "intermediate",
		effectiveness: 0.75,
		id: "dual_coding",
		name: "Dual Coding",
		timeRequired: 5,
	},
	{
		applicableContexts: ["problem_solving", "skill_building"],
		category: "organization",
		description: "Mix different types of problems or topics in one session",
		difficulty: "advanced",
		effectiveness: 0.8,
		id: "interleaving",
		name: "Interleaving",
		timeRequired: 0,
	},
	{
		applicableContexts: ["self_regulation", "complex_learning"],
		category: "metacognitive",
		description: "Regularly assess your understanding and adjust strategies",
		difficulty: "advanced",
		effectiveness: 0.85,
		id: "metacognitive_monitoring",
		name: "Metacognitive Monitoring",
		timeRequired: 2,
	},
];

// Reflection prompts for different contexts
const REFLECTION_PROMPTS = {
	difficulty: [
		"What made this material challenging for you?",
		"Which concepts do you find most difficult and why?",
		"How did you overcome difficulties in this session?",
		"What would help you better understand the challenging parts?",
	],
	goals: [
		"How does today's learning contribute to your larger goals?",
		"What specific progress did you make today?",
		"What do you want to achieve in your next study session?",
		"How can you measure your learning progress?",
	],
	motivation: [
		"What motivated you to study today?",
		"How engaged did you feel during this session?",
		"What would increase your motivation for this subject?",
		"How does this learning connect to your goals?",
	],
	strategy: [
		"Which study techniques worked best for you today?",
		"What would you do differently in your next study session?",
		"How effective was your approach to learning this material?",
		"What new strategies could you try next time?",
	],
	time_management: [
		"How effectively did you use your study time?",
		"What distractions affected your focus today?",
		"How could you better organize your study sessions?",
		"What time of day works best for your learning?",
	],
	understanding: [
		"How well do you understand the material you just studied?",
		"What connections can you make between today's content and what you already know?",
		"Which concepts are you most confident about?",
		"What questions do you still have about this topic?",
	],
};

/**
 * Get personalized reflection prompts for a user
 */
export const getReflectionPrompts = query({
	args: {
		category: v.optional(
			v.union(
				v.literal("difficulty"),
				v.literal("strategy"),
				v.literal("motivation"),
				v.literal("understanding"),
				v.literal("time_management"),
				v.literal("goals"),
			),
		),
		sessionContext: v.optional(
			v.object({
				averageSuccess: v.number(),
				cardsReviewed: v.number(),
				deckId: v.id("decks"),
				sessionDuration: v.number(),
			}),
		),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Get user's recent reflections to avoid repetition
		const recentReflections = await ctx.db
			.query("learningReflections")
			.withIndex(
				"by_userId_and_timestamp",
				(q) =>
					q
						.eq("userId", identity.subject)
						.gte("timestamp", Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
			)
			.collect();

		const usedPrompts = new Set(recentReflections.map((r) => r.prompt));

		// Generate contextual prompts
		const prompts = [];

		if (args.category) {
			// Get prompts for specific category
			const categoryPrompts = REFLECTION_PROMPTS[args.category];
			for (const prompt of categoryPrompts) {
				if (!usedPrompts.has(prompt)) {
					prompts.push({
						category: args.category,
						priority: "medium" as const,
						prompt,
					});
				}
			}
		} else {
			// Get contextual prompts based on session data
			if (args.sessionContext) {
				const { averageSuccess, cardsReviewed, sessionDuration } =
					args.sessionContext;

				// Difficulty-based prompts
				if (averageSuccess < 0.6) {
					prompts.push({
						category: "difficulty",
						priority: "high" as const,
						prompt: "What made this material challenging for you?",
					});
					prompts.push({
						category: "strategy",
						priority: "high" as const,
						prompt: "What would you do differently in your next study session?",
					});
				}

				// Success-based prompts
				if (averageSuccess > 0.8) {
					prompts.push({
						category: "strategy",
						priority: "medium" as const,
						prompt: "Which study techniques worked best for you today?",
					});
				}

				// Time-based prompts
				if (sessionDuration > 45) {
					prompts.push({
						category: "time_management",
						priority: "medium" as const,
						prompt: "How effectively did you use your study time?",
					});
				}

				// Volume-based prompts
				if (cardsReviewed > 50) {
					prompts.push({
						category: "understanding",
						priority: "medium" as const,
						prompt: "How well do you understand the material you just studied?",
					});
				}
			}

			// Add general prompts if not enough contextual ones
			if (prompts.length < 3) {
				const generalPrompts = [
					{
						category: "understanding",
						priority: "medium" as const,
						prompt: "How well do you understand the material you just studied?",
					},
					{
						category: "motivation",
						priority: "low" as const,
						prompt: "How engaged did you feel during this session?",
					},
					{
						category: "goals",
						priority: "low" as const,
						prompt:
							"How does today's learning contribute to your larger goals?",
					},
				];

				for (const generalPrompt of generalPrompts) {
					if (!usedPrompts.has(generalPrompt.prompt) && prompts.length < 3) {
						prompts.push(generalPrompt);
					}
				}
			}
		}

		return prompts.slice(0, 5); // Return max 5 prompts
	},
	returns: v.array(
		v.object({
			category: v.string(),
			priority: v.union(
				v.literal("high"),
				v.literal("medium"),
				v.literal("low"),
			),
			prompt: v.string(),
		}),
	),
});

/**
 * Save a learning reflection
 */
export const saveReflection = mutation({
	args: {
		category: v.union(
			v.literal("difficulty"),
			v.literal("strategy"),
			v.literal("motivation"),
			v.literal("understanding"),
			v.literal("time_management"),
			v.literal("goals"),
		),
		deckId: v.optional(v.id("decks")),
		prompt: v.string(),
		rating: v.number(), // 1-5 scale
		response: v.string(),
		sessionId: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		return await ctx.db.insert("learningReflections", {
			category: args.category,
			deckId: args.deckId,
			prompt: args.prompt,
			rating: Math.max(1, Math.min(5, args.rating)),
			response: args.response,
			sessionId: args.sessionId,
			tags: args.tags || [],
			timestamp: Date.now(),
			userId: identity.subject,
		});
	},
	returns: v.id("learningReflections"),
});

/**
 * Get study strategy recommendations based on user's learning patterns
 */
export const getStrategyRecommendations = query({
	args: {
		context: v.optional(
			v.object({
				difficulty: v.union(
					v.literal("easy"),
					v.literal("medium"),
					v.literal("hard"),
				),
				learningGoal: v.union(
					v.literal("memorization"),
					v.literal("understanding"),
					v.literal("application"),
				),
				timeAvailable: v.number(), // minutes
				userLevel: v.union(
					v.literal("beginner"),
					v.literal("intermediate"),
					v.literal("advanced"),
				),
			}),
		),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		// Get user's learning pattern for personalization
		const learningPattern = await ctx.db
			.query("learningPatterns")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.first();

		const recommendations = [];

		for (const strategy of STUDY_STRATEGIES) {
			let relevanceScore = strategy.effectiveness; // Base score
			let reasoning = `Highly effective technique (${Math.round(strategy.effectiveness * 100)}% effectiveness)`;

			// Adjust based on context
			if (args.context) {
				const { difficulty, learningGoal, timeAvailable, userLevel } =
					args.context;

				// Difficulty matching
				if (difficulty === "hard" && strategy.category === "metacognitive") {
					relevanceScore += 0.2;
					reasoning += ". Excellent for challenging material";
				}

				// Goal matching
				if (
					learningGoal === "memorization" &&
					strategy.category === "retrieval"
				) {
					relevanceScore += 0.3;
					reasoning += ". Perfect for memorization goals";
				} else if (
					learningGoal === "understanding" &&
					strategy.category === "elaboration"
				) {
					relevanceScore += 0.3;
					reasoning += ". Ideal for deep understanding";
				}

				// Time constraints
				if (strategy.timeRequired > timeAvailable) {
					relevanceScore -= 0.4;
					reasoning += ". May require more time than available";
				} else if (strategy.timeRequired === 0) {
					relevanceScore += 0.1;
					reasoning += ". No additional time required";
				}

				// User level matching
				if (strategy.difficulty === userLevel) {
					relevanceScore += 0.2;
					reasoning += `. Matches your ${userLevel} level`;
				} else if (
					(userLevel === "beginner" && strategy.difficulty === "advanced") ||
					(userLevel === "advanced" && strategy.difficulty === "beginner")
				) {
					relevanceScore -= 0.3;
				}
			}

			// Personalization based on learning pattern
			if (learningPattern) {
				if (
					learningPattern.averageSuccessRate < 0.6 &&
					strategy.category === "retrieval"
				) {
					relevanceScore += 0.2;
					reasoning += ". Recommended due to current performance patterns";
				}
			}

			recommendations.push({
				reasoning,
				relevanceScore: Math.max(0, Math.min(1, relevanceScore)),
				strategy: {
					category: strategy.category,
					description: strategy.description,
					difficulty: strategy.difficulty,
					effectiveness: strategy.effectiveness,
					id: strategy.id,
					name: strategy.name,
					timeRequired: strategy.timeRequired,
				},
			});
		}

		// Sort by relevance and return top recommendations
		return recommendations
			.sort((a, b) => b.relevanceScore - a.relevanceScore)
			.slice(0, 5);
	},
	returns: v.array(
		v.object({
			reasoning: v.string(),
			relevanceScore: v.number(),
			strategy: v.object({
				category: v.string(),
				description: v.string(),
				difficulty: v.string(),
				effectiveness: v.number(),
				id: v.string(),
				name: v.string(),
				timeRequired: v.number(),
			}),
		}),
	),
});

/**
 * Track confidence calibration
 */
export const recordConfidenceCalibration = mutation({
	args: {
		actualPerformance: v.number(),
		cardId: v.id("cards"), // 0-1
		predictedConfidence: v.number(), // 0-1
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const calibrationError = Math.abs(
			args.predictedConfidence - args.actualPerformance,
		);

		await ctx.db.insert("confidenceCalibrations", {
			actualPerformance: args.actualPerformance,
			calibrationError,
			cardId: args.cardId,
			predictedConfidence: args.predictedConfidence,
			timestamp: Date.now(),
			userId: identity.subject,
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Get confidence calibration insights
 */
export const getConfidenceCalibrationInsights = query({
	args: {},
	handler: async (ctx, _args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("User must be authenticated");
		}

		const calibrations = await ctx.db
			.query("confidenceCalibrations")
			.withIndex("by_userId", (q) => q.eq("userId", identity.subject))
			.order("desc")
			.take(100);

		if (calibrations.length === 0) {
			return {
				averageCalibrationError: 0,
				calibrationTrend: "stable",
				overconfidenceBias: 0,
				recommendations: [
					"Complete more reviews with confidence ratings to get insights",
				],
			};
		}

		const averageCalibrationError =
			calibrations.reduce((sum, c) => sum + c.calibrationError, 0) /
			calibrations.length;
		const overconfidenceBias =
			calibrations.reduce(
				(sum, c) => sum + (c.predictedConfidence - c.actualPerformance),
				0,
			) / calibrations.length;

		// Calculate trend (compare first half vs second half)
		const midpoint = Math.floor(calibrations.length / 2);
		const recentError =
			calibrations
				.slice(0, midpoint)
				.reduce((sum, c) => sum + c.calibrationError, 0) / midpoint;
		const olderError =
			calibrations
				.slice(midpoint)
				.reduce((sum, c) => sum + c.calibrationError, 0) /
			(calibrations.length - midpoint);

		let calibrationTrend: "improving" | "stable" | "declining" = "stable";
		if (recentError < olderError - 0.05) calibrationTrend = "improving";
		else if (recentError > olderError + 0.05) calibrationTrend = "declining";

		// Generate recommendations
		const recommendations = [];
		if (overconfidenceBias > 0.2) {
			recommendations.push(
				"You tend to be overconfident. Try to be more conservative in your predictions.",
			);
		} else if (overconfidenceBias < -0.2) {
			recommendations.push(
				"You tend to underestimate your knowledge. Trust your understanding more.",
			);
		}

		if (averageCalibrationError > 0.3) {
			recommendations.push(
				"Focus on accurately assessing your knowledge before answering.",
			);
		}

		if (calibrationTrend === "declining") {
			recommendations.push(
				"Your calibration has been getting worse. Take more time to reflect on your confidence.",
			);
		}

		return {
			averageCalibrationError,
			calibrationTrend,
			overconfidenceBias,
			recommendations:
				recommendations.length > 0
					? recommendations
					: ["Your confidence calibration looks good! Keep it up."],
		};
	},
	returns: v.object({
		averageCalibrationError: v.number(),
		calibrationTrend: v.string(), // Positive = overconfident, negative = underconfident
		overconfidenceBias: v.number(), // "improving", "stable", "declining"
		recommendations: v.array(v.string()),
	}),
});
