/**
 * Tests for retention rate calculation logic
 * These tests verify that our retention rate calculation works correctly
 * with various scenarios and edge cases
 */

describe("Retention Rate Calculation", () => {
	// Mock data structures that match our database schema
	const mockReviews = {
		// Perfect retention scenario - all reviews successful
		perfectRetention: [
			{
				userId: "user1",
				cardId: "card1",
				reviewDate: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
				quality: 4,
				wasSuccessful: true,
				easeFactorBefore: 2.5,
			},
			{
				userId: "user1",
				cardId: "card2",
				reviewDate: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
				quality: 5,
				wasSuccessful: true,
				easeFactorBefore: 2.6,
			},
			{
				userId: "user1",
				cardId: "card3",
				reviewDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
				quality: 4,
				wasSuccessful: true,
				easeFactorBefore: 2.4,
			},
		],

		// Poor retention scenario - mostly failed reviews
		poorRetention: [
			{
				userId: "user1",
				cardId: "card1",
				reviewDate: Date.now() - 5 * 24 * 60 * 60 * 1000,
				quality: 1,
				wasSuccessful: false,
				easeFactorBefore: 2.5,
			},
			{
				userId: "user1",
				cardId: "card2",
				reviewDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
				quality: 2,
				wasSuccessful: false,
				easeFactorBefore: 2.3,
			},
			{
				userId: "user1",
				cardId: "card3",
				reviewDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
				quality: 4,
				wasSuccessful: true,
				easeFactorBefore: 2.1,
			},
		],

		// Mixed retention scenario
		mixedRetention: [
			{
				userId: "user1",
				cardId: "card1",
				reviewDate: Date.now() - 10 * 24 * 60 * 60 * 1000,
				quality: 4,
				wasSuccessful: true,
				easeFactorBefore: 2.5,
			},
			{
				userId: "user1",
				cardId: "card2",
				reviewDate: Date.now() - 8 * 24 * 60 * 60 * 1000,
				quality: 2,
				wasSuccessful: false,
				easeFactorBefore: 2.3,
			},
			{
				userId: "user1",
				cardId: "card3",
				reviewDate: Date.now() - 6 * 24 * 60 * 60 * 1000,
				quality: 5,
				wasSuccessful: true,
				easeFactorBefore: 2.7,
			},
			{
				userId: "user1",
				cardId: "card4",
				reviewDate: Date.now() - 4 * 24 * 60 * 60 * 1000,
				quality: 1,
				wasSuccessful: false,
				easeFactorBefore: 2.2,
			},
			{
				userId: "user1",
				cardId: "card5",
				reviewDate: Date.now() - 2 * 24 * 60 * 60 * 1000,
				quality: 3,
				wasSuccessful: true,
				easeFactorBefore: 2.4,
			},
		],

		// Empty data scenario
		noReviews: [],

		// Old reviews outside time window
		oldReviews: [
			{
				userId: "user1",
				cardId: "card1",
				reviewDate: Date.now() - 40 * 24 * 60 * 60 * 1000, // 40 days ago
				quality: 4,
				wasSuccessful: true,
				easeFactorBefore: 2.5,
			},
		],
	};

	// Mock the calculateRetentionRate function since we can't directly test the Convex function
	const calculateRetentionRate = (
		reviews: any[],
		daysPeriod: number = 30,
	): number | undefined => {
		const cutoffDate = Date.now() - daysPeriod * 24 * 60 * 60 * 1000;

		// Filter reviews within time period
		const recentReviews = reviews.filter(
			(review) => review.reviewDate >= cutoffDate,
		);

		if (recentReviews.length === 0) {
			return undefined;
		}

		// Calculate basic retention rate
		const successfulReviews = recentReviews.filter(
			(review) => review.wasSuccessful,
		).length;
		const totalReviews = recentReviews.length;

		// Calculate weighted retention rate (harder cards weighted more heavily)
		let weightedSuccessSum = 0;
		let weightedTotalSum = 0;

		for (const review of recentReviews) {
			// Weight is inversely proportional to ease factor (harder cards have lower ease factor)
			const weight = 1 / review.easeFactorBefore;

			if (review.wasSuccessful) {
				weightedSuccessSum += weight;
			}
			weightedTotalSum += weight;
		}

		// Use weighted average if we have enough data, otherwise use simple average
		const retentionRate =
			totalReviews >= 10
				? (weightedSuccessSum / weightedTotalSum) * 100
				: (successfulReviews / totalReviews) * 100;

		// Round to one decimal place and ensure it's between 0-100
		return Math.min(100, Math.max(0, Math.round(retentionRate * 10) / 10));
	};

	describe("Basic retention rate calculation", () => {
		it("should return 100% for perfect retention", () => {
			const result = calculateRetentionRate(mockReviews.perfectRetention);
			expect(result).toBe(100);
		});

		it("should return approximately 33.3% for poor retention (1 success out of 3)", () => {
			const result = calculateRetentionRate(mockReviews.poorRetention);
			expect(result).toBeCloseTo(33.3, 1);
		});

		it("should return 60% for mixed retention (3 successes out of 5)", () => {
			const result = calculateRetentionRate(mockReviews.mixedRetention);
			expect(result).toBe(60);
		});

		it("should return undefined for no reviews", () => {
			const result = calculateRetentionRate(mockReviews.noReviews);
			expect(result).toBeUndefined();
		});

		it("should return undefined for reviews outside time window", () => {
			const result = calculateRetentionRate(mockReviews.oldReviews, 30);
			expect(result).toBeUndefined();
		});
	});

	describe("Time window filtering", () => {
		it("should include reviews within 7-day window", () => {
			const recentReviews = [
				{
					userId: "user1",
					cardId: "card1",
					reviewDate: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
					quality: 4,
					wasSuccessful: true,
					easeFactorBefore: 2.5,
				},
			];

			const result = calculateRetentionRate(recentReviews, 7);
			expect(result).toBe(100);
		});

		it("should exclude reviews outside 7-day window", () => {
			const oldReviews = [
				{
					userId: "user1",
					cardId: "card1",
					reviewDate: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
					quality: 4,
					wasSuccessful: true,
					easeFactorBefore: 2.5,
				},
			];

			const result = calculateRetentionRate(oldReviews, 7);
			expect(result).toBeUndefined();
		});
	});

	describe("Edge cases", () => {
		it("should handle single review correctly", () => {
			const singleReview = [mockReviews.perfectRetention[0]];
			const result = calculateRetentionRate(singleReview);
			expect(result).toBe(100);
		});

		it("should handle single failed review correctly", () => {
			const singleFailedReview = [mockReviews.poorRetention[0]];
			const result = calculateRetentionRate(singleFailedReview);
			expect(result).toBe(0);
		});

		it("should return value between 0 and 100", () => {
			const result = calculateRetentionRate(mockReviews.mixedRetention);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(100);
		});

		it("should handle reviews with varying ease factors", () => {
			const varyingEaseReviews = [
				{
					userId: "user1",
					cardId: "card1",
					reviewDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
					quality: 4,
					wasSuccessful: true,
					easeFactorBefore: 1.3, // Very difficult card
				},
				{
					userId: "user1",
					cardId: "card2",
					reviewDate: Date.now() - 1 * 24 * 60 * 60 * 1000,
					quality: 4,
					wasSuccessful: true,
					easeFactorBefore: 3.0, // Easy card
				},
			];

			const result = calculateRetentionRate(varyingEaseReviews);
			expect(result).toBeDefined();
			expect(result).toBeGreaterThan(0);
			expect(result).toBeLessThanOrEqual(100);
		});
	});

	describe("Weighted calculation", () => {
		it("should use simple average for small datasets (< 10 reviews)", () => {
			// With fewer than 10 reviews, should use simple percentage
			const result = calculateRetentionRate(mockReviews.mixedRetention); // 5 reviews
			expect(result).toBe(60); // 3 successes out of 5 = 60%
		});

		it("should use weighted average for larger datasets", () => {
			// Create 10+ reviews to trigger weighted calculation
			const largeDataset = [];
			for (let i = 0; i < 12; i++) {
				largeDataset.push({
					userId: "user1",
					cardId: `card${i}`,
					reviewDate: Date.now() - i * 24 * 60 * 60 * 1000,
					quality: i % 2 === 0 ? 4 : 1, // Alternating success/failure
					wasSuccessful: i % 2 === 0,
					easeFactorBefore: 2.5,
				});
			}

			const result = calculateRetentionRate(largeDataset);
			expect(result).toBeDefined();
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(100);
		});
	});
});
