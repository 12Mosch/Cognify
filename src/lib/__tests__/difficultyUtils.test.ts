import {
	calculateDifficultyLevel,
	getDifficultyInfo,
	getDifficultyScore,
	getDifficultyStats,
	isCardDifficult,
} from "../difficultyUtils";

describe("difficultyUtils", () => {
	describe("calculateDifficultyLevel", () => {
		it('should return "new" for cards with no repetition', () => {
			expect(calculateDifficultyLevel()).toBe("new");
			expect(calculateDifficultyLevel(0)).toBe("new");
			expect(calculateDifficultyLevel(undefined, 2.5, 1)).toBe("new");
		});

		it('should return "learning" for cards with 1-2 repetitions', () => {
			expect(calculateDifficultyLevel(1, 2.5, 1)).toBe("learning");
			expect(calculateDifficultyLevel(2, 2.5, 6)).toBe("learning");
		});

		it('should return "easy" for cards with high ease factor and long intervals', () => {
			expect(calculateDifficultyLevel(5, 2.8, 30)).toBe("easy");
			expect(calculateDifficultyLevel(10, 3.0, 60)).toBe("easy");
		});

		it('should return "mature" for cards with reasonable ease factor and medium intervals', () => {
			expect(calculateDifficultyLevel(5, 2.5, 15)).toBe("mature");
			expect(calculateDifficultyLevel(8, 2.3, 10)).toBe("mature");
		});

		it('should return "young" for cards still building up intervals', () => {
			expect(calculateDifficultyLevel(3, 2.0, 3)).toBe("young");
			expect(calculateDifficultyLevel(4, 1.8, 2)).toBe("young");
		});
	});

	describe("getDifficultyInfo", () => {
		it("should return correct info for new cards", () => {
			const info = getDifficultyInfo(0, 2.5, 1);
			expect(info.level).toBe("new");
			expect(info.label).toBe("New");
			expect(info.progress).toBe(0);
			expect(info.color.bg).toContain("slate");
		});

		it("should return correct info for learning cards", () => {
			const info = getDifficultyInfo(1, 2.5, 1);
			expect(info.level).toBe("learning");
			expect(info.label).toBe("Learning");
			expect(info.progress).toBeGreaterThan(0);
			expect(info.progress).toBeLessThanOrEqual(30);
			expect(info.color.bg).toContain("blue");
		});

		it("should return correct info for easy cards", () => {
			const info = getDifficultyInfo(10, 3.0, 60);
			expect(info.level).toBe("easy");
			expect(info.label).toBe("Easy");
			expect(info.progress).toBeGreaterThan(85);
			expect(info.color.bg).toContain("emerald");
		});

		it("should handle undefined values gracefully", () => {
			const info = getDifficultyInfo();
			expect(info.level).toBe("new");
			expect(info.progress).toBe(0);
		});
	});

	describe("getDifficultyScore", () => {
		it("should return 0 for new cards", () => {
			expect(getDifficultyScore(0)).toBe(0);
			expect(getDifficultyScore()).toBe(0);
		});

		it("should return higher scores for easier cards", () => {
			const newScore = getDifficultyScore(0);
			const learningScore = getDifficultyScore(1, 2.5, 1);
			const matureScore = getDifficultyScore(5, 2.5, 15);
			const easyScore = getDifficultyScore(10, 3.0, 60);

			expect(newScore).toBeLessThan(learningScore);
			expect(learningScore).toBeLessThan(matureScore);
			expect(matureScore).toBeLessThan(easyScore);
		});

		it("should return scores between 0 and 100", () => {
			const scores = [
				getDifficultyScore(0),
				getDifficultyScore(1, 2.5, 1),
				getDifficultyScore(5, 2.5, 15),
				getDifficultyScore(10, 3.0, 60),
			];

			scores.forEach((score) => {
				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(100);
			});
		});
	});

	describe("getDifficultyStats", () => {
		const mockCards = [
			{ easeFactor: 2.5, interval: 1, repetition: 0 }, // new
			{ easeFactor: 2.5, interval: 1, repetition: 1 }, // learning
			{ easeFactor: 2.5, interval: 6, repetition: 2 }, // learning
			{ easeFactor: 2.5, interval: 15, repetition: 5 }, // mature
			{ easeFactor: 3.0, interval: 60, repetition: 10 }, // easy
			{ easeFactor: 2.0, interval: 3, repetition: 3 }, // young
		];

		it("should count cards by difficulty level", () => {
			const stats = getDifficultyStats(mockCards);

			expect(stats.new).toBe(1);
			expect(stats.learning).toBe(2);
			expect(stats.young).toBe(1);
			expect(stats.mature).toBe(1);
			expect(stats.easy).toBe(1);
			expect(stats.total).toBe(6);
		});

		it("should calculate correct percentages", () => {
			const stats = getDifficultyStats(mockCards);

			expect(stats.percentages.new).toBe(17); // 1/6 ≈ 17%
			expect(stats.percentages.learning).toBe(33); // 2/6 ≈ 33%
			expect(stats.percentages.young).toBe(17); // 1/6 ≈ 17%
			expect(stats.percentages.mature).toBe(17); // 1/6 ≈ 17%
			expect(stats.percentages.easy).toBe(17); // 1/6 ≈ 17%
		});

		it("should handle empty array", () => {
			const stats = getDifficultyStats([]);

			expect(stats.total).toBe(0);
			expect(stats.percentages.new).toBe(0);
			expect(stats.percentages.learning).toBe(0);
			expect(stats.percentages.young).toBe(0);
			expect(stats.percentages.mature).toBe(0);
			expect(stats.percentages.easy).toBe(0);
		});
	});

	describe("isCardDifficult", () => {
		it("should return false for new cards", () => {
			expect(isCardDifficult(0)).toBe(false);
			expect(isCardDifficult()).toBe(false);
		});

		it("should return true for cards with low ease factor after multiple attempts", () => {
			expect(isCardDifficult(3, 1.9)).toBe(true);
			expect(isCardDifficult(5, 1.8)).toBe(true);
		});

		it("should return true for cards with very low ease factor", () => {
			expect(isCardDifficult(1, 1.5)).toBe(true);
			expect(isCardDifficult(2, 1.4)).toBe(true);
		});

		it("should return false for cards with normal ease factors", () => {
			expect(isCardDifficult(3, 2.5)).toBe(false);
			expect(isCardDifficult(5, 2.2)).toBe(false);
		});

		it("should return false for cards with high ease factors", () => {
			expect(isCardDifficult(10, 3.0)).toBe(false);
			expect(isCardDifficult(8, 2.8)).toBe(false);
		});
	});
});
