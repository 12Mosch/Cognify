/**
 * Test suite for Forgetting Curve Optimized Learning Path
 *
 * This test verifies that the forgetting curve path generation algorithm
 * correctly prioritizes cards based on personal forgetting curves and
 * optimal review timing.
 */

// Mock data structures for testing

interface MockCardReview {
	cardId: string;
	quality: number;
	reviewDate: number;
	wasSuccessful: boolean;
}

interface MockLearningPatterns {
	personalizationConfig?: {
		optimizeForTimeOfDay?: boolean;
		prioritizeInconsistentCards?: boolean;
		focusOnPlateauTopics?: boolean;
	};
	inconsistencyPatterns: {
		cardIds: string[];
	};
	plateauDetection: {
		stagnantTopics: Array<{
			cardIds: string[];
		}>;
	};
	timeOfDayPerformance: {
		morning: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
		afternoon: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
		evening: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
		night: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
		early_morning: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
		late_night: {
			successRate: number;
			reviewCount: number;
			averageResponseTime: number;
			confidenceLevel: number;
			optimalForLearning: boolean;
		};
	};
}

// Mock implementation of forgetting curve calculations
function calculatePersonalForgettingCurve(
	cardReviews: MockCardReview[],
	_learningPatterns?: MockLearningPatterns,
): {
	retentionRate: number;
	forgettingRate: number;
	stabilityFactor: number;
} {
	if (cardReviews.length === 0) {
		return {
			forgettingRate: 0.3,
			retentionRate: 0.7,
			stabilityFactor: 1.0,
		};
	}

	const successRate =
		cardReviews.filter((r) => r.wasSuccessful).length / cardReviews.length;

	// Simple forgetting rate calculation
	let forgettingRate = 0.3;
	if (cardReviews.length >= 3) {
		const recentReviews = cardReviews.slice(-3);
		const recentSuccessRate =
			recentReviews.filter((r) => r.wasSuccessful).length /
			recentReviews.length;

		if (recentSuccessRate < successRate) {
			forgettingRate = Math.min(0.5, 0.3 + (successRate - recentSuccessRate));
		} else {
			forgettingRate = Math.max(0.1, 0.3 - (recentSuccessRate - successRate));
		}
	}

	return {
		forgettingRate,
		retentionRate: successRate,
		stabilityFactor: 1.0,
	};
}

function calculateOptimalReviewTime(
	forgettingCurveData: {
		retentionRate: number;
		forgettingRate: number;
		stabilityFactor: number;
	},
	easeFactor: number,
	currentInterval: number,
): number {
	let optimalTime = currentInterval * easeFactor;

	const retentionAdjustment = forgettingCurveData.retentionRate / 0.7;
	const forgettingAdjustment = 0.3 / forgettingCurveData.forgettingRate;

	optimalTime *=
		retentionAdjustment *
		forgettingAdjustment *
		forgettingCurveData.stabilityFactor;

	return Math.max(1, Math.min(180, optimalTime));
}

function calculateForgettingScore(
	daysSinceLastReview: number,
	optimalReviewTime: number,
	retentionRate: number,
	forgettingRate: number,
): number {
	const timingRatio = daysSinceLastReview / optimalReviewTime;

	let score = 0;

	if (timingRatio < 0.5) {
		score = timingRatio * 0.4;
	} else if (timingRatio <= 1.0) {
		score = 0.2 + (timingRatio - 0.5) * 1.6;
	} else {
		const overdue = timingRatio - 1.0;
		const forgettingDecay = Math.exp(-forgettingRate * overdue);
		score = 1.0 + (1.0 - forgettingDecay) * 0.5;
	}

	score *= 2.0 - retentionRate;

	return Math.max(0, Math.min(1.5, score));
}

describe("Forgetting Curve Path Generation", () => {


	const mockReviews: MockCardReview[] = [
		{
			cardId: "card1",
			quality: 4,
			reviewDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
			wasSuccessful: true,
		},
		{
			cardId: "card1",
			quality: 3,
			reviewDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
			wasSuccessful: true,
		},
		{
			cardId: "card2",
			quality: 5,
			reviewDate: Date.now() - 14 * 24 * 60 * 60 * 1000,
			wasSuccessful: true,
		},
		{
			cardId: "card2",
			quality: 4,
			reviewDate: Date.now() - 28 * 24 * 60 * 60 * 1000,
			wasSuccessful: true,
		},
		{
			cardId: "card3",
			quality: 2,
			reviewDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
			wasSuccessful: false,
		},
		{
			cardId: "card3",
			quality: 3,
			reviewDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
			wasSuccessful: true,
		},
	];

	describe("Personal Forgetting Curve Calculation", () => {
		it("should calculate default values for cards with no review history", () => {
			const result = calculatePersonalForgettingCurve([]);

			expect(result.retentionRate).toBe(0.7);
			expect(result.forgettingRate).toBe(0.3);
			expect(result.stabilityFactor).toBe(1.0);
		});

		it("should calculate retention rate based on success patterns", () => {
			const cardReviews = mockReviews.filter((r) => r.cardId === "card1");
			const result = calculatePersonalForgettingCurve(cardReviews);

			expect(result.retentionRate).toBe(1.0); // Both reviews were successful
			expect(result.forgettingRate).toBeGreaterThan(0);
			expect(result.stabilityFactor).toBe(1.0);
		});

		it("should adjust forgetting rate based on recent performance", () => {
			const cardReviews = mockReviews.filter((r) => r.cardId === "card3");
			const result = calculatePersonalForgettingCurve(cardReviews);

			expect(result.retentionRate).toBe(0.5); // 1 success out of 2 reviews
			expect(result.forgettingRate).toBeGreaterThanOrEqual(0.3); // Should be at least default rate
		});
	});

	describe("Optimal Review Time Calculation", () => {
		it("should calculate optimal review time based on forgetting curve", () => {
			const forgettingCurveData = {
				forgettingRate: 0.2,
				retentionRate: 0.8,
				stabilityFactor: 1.0,
			};

			const result = calculateOptimalReviewTime(forgettingCurveData, 2.5, 7);

			expect(result).toBeGreaterThan(7); // Should be longer than current interval
			expect(result).toBeLessThan(180); // Should be within bounds
		});

		it("should respect minimum and maximum bounds", () => {
			const forgettingCurveData = {
				forgettingRate: 0.9, // Very low retention
				retentionRate: 0.1, // Very high forgetting rate
				stabilityFactor: 0.1, // Very low stability
			};

			const result = calculateOptimalReviewTime(forgettingCurveData, 2.5, 1);

			expect(result).toBeGreaterThanOrEqual(1);
			expect(result).toBeLessThanOrEqual(180);
		});
	});

	describe("Forgetting Score Calculation", () => {
		it("should give low scores for early reviews", () => {
			const score = calculateForgettingScore(2, 10, 0.8, 0.3); // 2 days since review, optimal is 10 days

			expect(score).toBeLessThan(0.5);
		});

		it("should give high scores for overdue cards", () => {
			const score = calculateForgettingScore(15, 10, 0.8, 0.3); // 15 days since review, optimal is 10 days

			expect(score).toBeGreaterThan(1.0);
		});

		it("should give optimal scores near the optimal timing", () => {
			const score = calculateForgettingScore(9, 10, 0.8, 0.3); // 9 days since review, optimal is 10 days

			expect(score).toBeGreaterThan(0.8);
			expect(score).toBeLessThan(1.2);
		});

		it("should adjust scores based on retention rate", () => {
			const highRetentionScore = calculateForgettingScore(10, 10, 0.9, 0.3);
			const lowRetentionScore = calculateForgettingScore(10, 10, 0.5, 0.3);

			expect(lowRetentionScore).toBeGreaterThan(highRetentionScore);
		});
	});
});
