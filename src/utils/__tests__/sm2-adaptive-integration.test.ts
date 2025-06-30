/**
 * Comprehensive tests for SM-2 algorithm integration with adaptive learning
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

// Mock data structures for testing
interface MockConceptMastery {
	masteryLevel: number;
	confidenceLevel: number;
	learningVelocity: number;
	difficultyTrend: "improving" | "stable" | "declining";
	masteryCategory: "beginner" | "intermediate" | "advanced" | "expert";
}

interface MockLearningPattern {
	learningVelocity: number;
	difficultyPatterns: {
		easyCards: { successRate: number };
		mediumCards: { successRate: number };
		hardCards: { successRate: number };
	};
	timeOfDayPerformance: {
		morning: { successRate: number; reviewCount: number };
		afternoon: { successRate: number; reviewCount: number };
		evening: { successRate: number; reviewCount: number };
	};
}

// Mock implementation of the SM-2 algorithm with adaptive learning
function calculateAdaptiveSM2(
	quality: number,
	repetition: number,
	easeFactor: number,
	interval: number,
	learningPattern?: MockLearningPattern,
	conceptMastery?: MockConceptMastery,
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
	let confidence = 0.5;
	let masteryAdjustment = 0;

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

		// Update ease factor (only for successful reviews)
		newEaseFactor =
			easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
		newEaseFactor = Math.max(1.3, newEaseFactor);
	}

	// Apply concept mastery adjustments if available
	if (conceptMastery && quality >= 3) {
		const masteryInfluence = calculateMasteryInfluence(conceptMastery, quality);

		newEaseFactor += masteryInfluence.easeFactorAdjustment;
		newEaseFactor = Math.max(1.3, Math.min(3.0, newEaseFactor));

		newInterval = Math.round(newInterval * masteryInfluence.intervalMultiplier);
		masteryAdjustment =
			masteryInfluence.easeFactorAdjustment +
			(masteryInfluence.intervalMultiplier - 1);

		confidence = Math.max(confidence, conceptMastery.confidenceLevel);
	}

	// Apply learning pattern adjustments
	if (learningPattern && !conceptMastery) {
		if (learningPattern.learningVelocity > 1.5) {
			newInterval = Math.round(newInterval * 1.1);
		} else if (learningPattern.learningVelocity < 0.5) {
			newInterval = Math.round(newInterval * 0.9);
		}
	}

	const dueDate = Date.now() + newInterval * 24 * 60 * 60 * 1000;

	return {
		confidence,
		dueDate,
		easeFactor: newEaseFactor,
		interval: newInterval,
		masteryAdjustment,
		repetition: newRepetition,
	};
}

function calculateMasteryInfluence(
	conceptMastery: MockConceptMastery,
	quality: number,
): {
	easeFactorAdjustment: number;
	intervalMultiplier: number;
} {
	let easeFactorAdjustment = 0;
	let intervalMultiplier = 1.0;

	// Base adjustments on mastery level
	if (conceptMastery.masteryLevel >= 0.8) {
		easeFactorAdjustment += 0.1;
		intervalMultiplier *= 1.2;
	} else if (conceptMastery.masteryLevel <= 0.3) {
		easeFactorAdjustment -= 0.05;
		intervalMultiplier *= 0.8;
	}

	// Adjust based on difficulty trend
	switch (conceptMastery.difficultyTrend) {
		case "improving":
			easeFactorAdjustment += 0.05;
			intervalMultiplier *= 1.1;
			break;
		case "declining":
			easeFactorAdjustment -= 0.1;
			intervalMultiplier *= 0.85;
			break;
	}

	// Adjust based on mastery category
	switch (conceptMastery.masteryCategory) {
		case "expert":
			easeFactorAdjustment += 0.15;
			intervalMultiplier *= 1.3;
			break;
		case "beginner":
			easeFactorAdjustment -= 0.05;
			intervalMultiplier *= 0.9;
			break;
	}

	// Quality-based fine-tuning
	if (quality === 5 && conceptMastery.masteryLevel > 0.7) {
		easeFactorAdjustment += 0.05;
		intervalMultiplier *= 1.1;
	}

	// Ensure reasonable bounds
	easeFactorAdjustment = Math.max(-0.3, Math.min(0.3, easeFactorAdjustment));
	intervalMultiplier = Math.max(0.5, Math.min(2.0, intervalMultiplier));

	return { easeFactorAdjustment, intervalMultiplier };
}

describe("SM-2 Adaptive Learning Integration", () => {
	let mockConceptMastery: MockConceptMastery;
	let mockLearningPattern: MockLearningPattern;

	beforeEach(() => {
		mockConceptMastery = {
			confidenceLevel: 0.6,
			difficultyTrend: "stable",
			learningVelocity: 1.0,
			masteryCategory: "intermediate",
			masteryLevel: 0.5,
		};

		mockLearningPattern = {
			difficultyPatterns: {
				easyCards: { successRate: 0.9 },
				hardCards: { successRate: 0.5 },
				mediumCards: { successRate: 0.7 },
			},
			learningVelocity: 1.0,
			timeOfDayPerformance: {
				afternoon: { reviewCount: 8, successRate: 0.7 },
				evening: { reviewCount: 5, successRate: 0.6 },
				morning: { reviewCount: 10, successRate: 0.8 },
			},
		};
	});

	describe("Basic SM-2 Algorithm", () => {
		it("should handle successful reviews correctly", () => {
			const result = calculateAdaptiveSM2(4, 0, 2.5, 1);

			expect(result.repetition).toBe(1);
			expect(result.easeFactor).toBeGreaterThanOrEqual(2.5); // Quality 4 should maintain or increase ease factor
			expect(result.interval).toBe(1);
			expect(result.masteryAdjustment).toBe(0);
		});

		it("should handle failed reviews correctly", () => {
			const result = calculateAdaptiveSM2(2, 3, 2.5, 7);

			expect(result.repetition).toBe(0);
			expect(result.easeFactor).toBe(2.5); // Unchanged for failed reviews
			expect(result.interval).toBe(1);
		});

		it("should calculate intervals correctly for multiple repetitions", () => {
			// First repetition
			let result = calculateAdaptiveSM2(4, 0, 2.5, 1);
			expect(result.interval).toBe(1);

			// Second repetition
			result = calculateAdaptiveSM2(4, 1, result.easeFactor, result.interval);
			expect(result.interval).toBe(6);

			// Third repetition
			result = calculateAdaptiveSM2(4, 2, result.easeFactor, result.interval);
			expect(result.interval).toBeGreaterThan(6);
		});
	});

	describe("Concept Mastery Integration", () => {
		it("should boost parameters for high mastery levels", () => {
			const highMastery: MockConceptMastery = {
				...mockConceptMastery,
				masteryCategory: "expert",
				masteryLevel: 0.9,
			};

			const result = calculateAdaptiveSM2(4, 2, 2.5, 6, undefined, highMastery);

			expect(result.easeFactor).toBeGreaterThan(2.5);
			expect(result.interval).toBeGreaterThan(6);
			expect(result.masteryAdjustment).toBeGreaterThan(0);
		});

		it("should be conservative for low mastery levels", () => {
			const lowMastery: MockConceptMastery = {
				...mockConceptMastery,
				masteryCategory: "beginner",
				masteryLevel: 0.2,
			};

			const result = calculateAdaptiveSM2(4, 2, 2.5, 6, undefined, lowMastery);

			// With low mastery, the ease factor should be reduced from the base calculation
			expect(result.easeFactor).toBeLessThan(2.6); // Should be less than what it would be without mastery adjustment
			expect(result.masteryAdjustment).toBeLessThan(0);
		});

		it("should adjust based on difficulty trends", () => {
			const improvingMastery: MockConceptMastery = {
				...mockConceptMastery,
				difficultyTrend: "improving",
			};

			const decliningMastery: MockConceptMastery = {
				...mockConceptMastery,
				difficultyTrend: "declining",
			};

			const improvingResult = calculateAdaptiveSM2(
				4,
				2,
				2.5,
				6,
				undefined,
				improvingMastery,
			);
			const decliningResult = calculateAdaptiveSM2(
				4,
				2,
				2.5,
				6,
				undefined,
				decliningMastery,
			);

			expect(improvingResult.easeFactor).toBeGreaterThan(
				decliningResult.easeFactor,
			);
			expect(improvingResult.interval).toBeGreaterThan(
				decliningResult.interval,
			);
		});
	});

	describe("Learning Pattern Integration", () => {
		it("should adjust intervals based on learning velocity", () => {
			const fastLearner: MockLearningPattern = {
				...mockLearningPattern,
				learningVelocity: 2.0,
			};

			const slowLearner: MockLearningPattern = {
				...mockLearningPattern,
				learningVelocity: 0.3,
			};

			const fastResult = calculateAdaptiveSM2(4, 2, 2.5, 6, fastLearner);
			const slowResult = calculateAdaptiveSM2(4, 2, 2.5, 6, slowLearner);

			expect(fastResult.interval).toBeGreaterThan(slowResult.interval);
		});
	});

	describe("Edge Cases and Validation", () => {
		it("should maintain ease factor bounds", () => {
			// Test very low quality
			const lowQualityResult = calculateAdaptiveSM2(0, 2, 1.3, 6);
			expect(lowQualityResult.easeFactor).toBeGreaterThanOrEqual(1.3);

			// Test with extreme mastery adjustments
			const extremeMastery: MockConceptMastery = {
				confidenceLevel: 1.0,
				difficultyTrend: "improving",
				learningVelocity: 3.0,
				masteryCategory: "expert",
				masteryLevel: 1.0,
			};

			const extremeResult = calculateAdaptiveSM2(
				5,
				2,
				2.5,
				6,
				undefined,
				extremeMastery,
			);
			expect(extremeResult.easeFactor).toBeLessThanOrEqual(3.0);
		});

		it("should handle missing optional parameters gracefully", () => {
			const result = calculateAdaptiveSM2(4, 2, 2.5, 6);

			expect(result.repetition).toBe(3);
			expect(result.easeFactor).toBeGreaterThanOrEqual(2.5); // Quality 4 should maintain or increase ease factor
			expect(result.interval).toBeGreaterThan(6);
			expect(result.masteryAdjustment).toBe(0);
		});

		it("should prioritize concept mastery over learning patterns", () => {
			const result = calculateAdaptiveSM2(
				4,
				2,
				2.5,
				6,
				mockLearningPattern,
				mockConceptMastery,
			);

			// Should use concept mastery confidence instead of pattern-based confidence
			expect(result.confidence).toBe(mockConceptMastery.confidenceLevel);
		});
	});
});
