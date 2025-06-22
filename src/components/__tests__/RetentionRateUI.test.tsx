/**
 * Tests for retention rate UI components
 * These tests verify that the UI correctly displays retention rates and handles edge cases
 */

import { render, screen } from "@testing-library/react";
import type React from "react";
import SpacedRepetitionInsights from "../statistics/SpacedRepetitionInsights";
import { StatisticsOverviewCards } from "../statistics/StatisticsOverviewCards";

// Mock translation function
jest.mock("react-i18next", () => ({
	...jest.requireActual("react-i18next"),
	useTranslation: () => ({
		t: (key: string, _options?: any) => {
			// Simple mock translations for testing
			const translations: { [key: string]: string } = {
				"statistics.cards.retentionRate": "Retention Rate",
				"statistics.cards.successRate": "Success Rate",
				"statistics.widgets.spacedRepetition.retentionMessages.excellent":
					"Excellent retention!",
				"statistics.widgets.spacedRepetition.retentionMessages.fair":
					"Fair retention",
				"statistics.widgets.spacedRepetition.retentionMessages.good":
					"Good retention",
				"statistics.widgets.spacedRepetition.retentionMessages.needsImprovement":
					"Needs improvement",
				"statistics.widgets.spacedRepetition.retentionMessages.noData":
					"No data available",
				"statistics.widgets.spacedRepetition.retentionRate": "Retention Rate",
				"statistics.widgets.spacedRepetition.title":
					"Spaced Repetition Insights",
			};
			return translations[key] || key;
		},
	}),
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<div>{children}</div>
);

describe("Retention Rate UI Components", () => {
	describe("SpacedRepetitionInsights", () => {
		it("should display retention rate correctly when data is available", () => {
			const mockInsights = {
				averageInterval: 14.2,
				cardsToReviewToday: 10,
				retentionRate: 85.5,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			// Should display the retention rate with one decimal place
			expect(screen.getByText("85.5%")).toBeInTheDocument();

			// Should display appropriate message for good retention (80-90%)
			expect(screen.getByText("Good retention")).toBeInTheDocument();
		});

		it("should display N/A when retention rate is undefined", () => {
			const mockInsights = {
				averageInterval: undefined,
				cardsToReviewToday: 0,
				retentionRate: undefined,
				totalDueCards: 0,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			// Should display multiple N/A values (retention rate and average interval)
			expect(screen.getAllByText("N/A")).toHaveLength(2);

			// Should display no data message
			expect(screen.getByText("No data available")).toBeInTheDocument();
		});

		it("should display excellent retention message for high rates", () => {
			const mockInsights = {
				averageInterval: 21.0,
				cardsToReviewToday: 10,
				retentionRate: 95.0,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			expect(screen.getByText("95.0%")).toBeInTheDocument();
			expect(screen.getByText("Excellent retention!")).toBeInTheDocument();
		});

		it("should display needs improvement message for low rates", () => {
			const mockInsights = {
				averageInterval: 7.5,
				cardsToReviewToday: 10,
				retentionRate: 65.0,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			expect(screen.getByText("65.0%")).toBeInTheDocument();
			expect(screen.getByText("Needs improvement")).toBeInTheDocument();
		});
	});

	describe("StatisticsOverviewCards", () => {
		const mockUserStats = {
			averageSessionDuration: 900000,
			cardsStudiedToday: 8,
			currentStreak: 5,
			longestStreak: 12,
			totalCards: 50,
			totalDecks: 3,
			totalStudySessions: 15, // 15 minutes in milliseconds
			totalStudyTime: 13500000, // 225 minutes in milliseconds
		};

		it("should display retention rate correctly in overview cards", () => {
			const mockSpacedRepetitionInsights = {
				averageInterval: 16.7,
				cardsToReviewToday: 10,
				retentionRate: 88.3,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<StatisticsOverviewCards
						spacedRepetitionInsights={mockSpacedRepetitionInsights}
						userStats={mockUserStats}
					/>
				</TestWrapper>,
			);

			// Should display retention rate with one decimal place
			expect(screen.getByText("88.3%")).toBeInTheDocument();

			// Should display the retention rate title
			expect(screen.getByText("Retention Rate")).toBeInTheDocument();
		});

		it("should display N/A when retention rate is undefined in overview cards", () => {
			const mockSpacedRepetitionInsights = {
				averageInterval: undefined,
				cardsToReviewToday: 0,
				retentionRate: undefined,
				totalDueCards: 0,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<StatisticsOverviewCards
						spacedRepetitionInsights={mockSpacedRepetitionInsights}
						userStats={mockUserStats}
					/>
				</TestWrapper>,
			);

			// Should display multiple N/A values (retention rate and average interval)
			expect(screen.getAllByText("N/A")).toHaveLength(2);

			// Should display the retention rate title
			expect(screen.getByText("Retention Rate")).toBeInTheDocument();
		});

		it("should handle edge case of 0% retention rate", () => {
			const mockSpacedRepetitionInsights = {
				averageInterval: 5.0,
				cardsToReviewToday: 10,
				retentionRate: 0.0,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<StatisticsOverviewCards
						spacedRepetitionInsights={mockSpacedRepetitionInsights}
						userStats={mockUserStats}
					/>
				</TestWrapper>,
			);

			// Should display 0.0% correctly (not N/A)
			expect(screen.getByText("0.0%")).toBeInTheDocument();

			// Should also display the retention rate title
			expect(screen.getByText("Retention Rate")).toBeInTheDocument();
		});

		it("should handle edge case of 100% retention rate", () => {
			const mockSpacedRepetitionInsights = {
				averageInterval: 30.0,
				cardsToReviewToday: 10,
				retentionRate: 100.0,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<StatisticsOverviewCards
						spacedRepetitionInsights={mockSpacedRepetitionInsights}
						userStats={mockUserStats}
					/>
				</TestWrapper>,
			);

			// Should display 100.0% correctly
			expect(screen.getByText("100.0%")).toBeInTheDocument();
		});
	});

	describe("Edge cases and validation", () => {
		it("should handle very high retention rates correctly", () => {
			const mockInsights = {
				averageInterval: 30.0,
				cardsToReviewToday: 10,
				retentionRate: 99.9,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			expect(screen.getByText("99.9%")).toBeInTheDocument();
			expect(screen.getByText("Excellent retention!")).toBeInTheDocument();
		});

		it("should handle very low retention rates correctly", () => {
			const mockInsights = {
				averageInterval: 1.0,
				cardsToReviewToday: 10,
				retentionRate: 0.1,
				totalDueCards: 10,
				totalNewCards: 5,
				upcomingReviews: [],
			};

			render(
				<TestWrapper>
					<SpacedRepetitionInsights insights={mockInsights} />
				</TestWrapper>,
			);

			expect(screen.getByText("0.1%")).toBeInTheDocument();
			expect(screen.getByText("Needs improvement")).toBeInTheDocument();
		});
	});
});
