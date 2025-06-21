import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StatisticsDashboard from "../StatisticsDashboard";

// Mock the chart components since they use recharts
jest.mock("../statistics/StudyActivityChart", () => {
	return function MockStudyActivityChart() {
		return <div data-testid="study-activity-chart">Study Activity Chart</div>;
	};
});

jest.mock("../statistics/DeckPerformanceChart", () => {
	return function MockDeckPerformanceChart() {
		return (
			<div data-testid="deck-performance-chart">Deck Performance Chart</div>
		);
	};
});

jest.mock("../statistics/CardDistributionChart", () => {
	return function MockCardDistributionChart({
		spacedRepetitionInsights,
		cardDistribution,
	}: any) {
		return (
			<div data-testid="card-distribution-chart">
				Card Distribution Chart - {cardDistribution?.totalCards || 0} total
				cards - {spacedRepetitionInsights?.totalDueCards || 0} due
			</div>
		);
	};
});

jest.mock("../statistics/UpcomingReviewsWidget", () => {
	return function MockUpcomingReviewsWidget() {
		return (
			<div data-testid="upcoming-reviews-widget">Upcoming Reviews Widget</div>
		);
	};
});

jest.mock("../statistics/LearningStreakWidget", () => {
	return function MockLearningStreakWidget() {
		return (
			<div data-testid="learning-streak-widget">Learning Streak Widget</div>
		);
	};
});

jest.mock("../statistics/SpacedRepetitionInsights", () => {
	return function MockSpacedRepetitionInsights() {
		return (
			<div data-testid="spaced-repetition-insights">
				Spaced Repetition Insights
			</div>
		);
	};
});

jest.mock("../statistics/StatisticsOverviewCards", () => {
	return {
		StatisticsOverviewCards: function MockStatisticsOverviewCards() {
			return (
				<div data-testid="statistics-overview-cards">
					Statistics Overview Cards
				</div>
			);
		},
	};
});

// Mock StudyHistoryHeatmap component
jest.mock("../StudyHistoryHeatmap", () => {
	return function MockStudyHistoryHeatmap() {
		return <div data-testid="study-history-heatmap">Study History Heatmap</div>;
	};
});

// Mock Convex queries
jest.mock("convex/react", () => ({
	...jest.requireActual("convex/react"),
	useQuery: jest.fn(),
	ConvexProvider: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ConvexReactClient: jest.fn().mockImplementation(() => ({})),
}));

import { useQuery } from "convex/react";

const mockUseQuery = useQuery as jest.Mock;

// Mock toast helpers
jest.mock("../../lib/toast", () => ({
	toastHelpers: {
		success: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock export utilities
jest.mock("../../lib/exportUtils", () => ({
	exportStatisticsData: jest.fn(),
}));

describe("StatisticsDashboard", () => {
	const mockOnBack = jest.fn();

	const mockUserStats = {
		totalDecks: 5,
		totalCards: 50,
		totalStudySessions: 10,
		cardsStudiedToday: 8,
		currentStreak: 3,
		longestStreak: 7,
		averageSessionDuration: 15,
		totalStudyTime: 300,
	};

	const mockSpacedRepetitionInsights = {
		totalDueCards: 12,
		totalNewCards: 8,
		cardsToReviewToday: 12,
		upcomingReviews: [
			{ date: "2024-01-15", count: 5 },
			{ date: "2024-01-16", count: 3 },
		],
		retentionRate: 85.5,
		averageInterval: 14.2,
	};

	const mockDeckPerformance = [
		{
			deckId: "deck1",
			deckName: "Spanish Vocabulary",
			totalCards: 20,
			masteredCards: 15,
			masteryPercentage: 75,
			averageEaseFactor: 2.8,
		},
		{
			deckId: "deck2",
			deckName: "Math Formulas",
			totalCards: 15,
			masteredCards: 8,
			masteryPercentage: 53.3,
			averageEaseFactor: 2.4,
		},
	];

	const mockDecks = [
		{
			_id: "deck1",
			_creationTime: Date.now(),
			userId: "user1",
			name: "Spanish Vocabulary",
			description: "Common Spanish words",
			cardCount: 20,
		},
		{
			_id: "deck2",
			_creationTime: Date.now(),
			userId: "user1",
			name: "Math Formulas",
			description: "Essential math formulas",
			cardCount: 15,
		},
	];

	const mockCardDistribution = {
		newCards: 8,
		learningCards: 12,
		reviewCards: 15,
		dueCards: 5,
		masteredCards: 10,
		totalCards: 50,
	};

	const mockDashboardData = {
		userStatistics: mockUserStats,
		spacedRepetitionInsights: mockSpacedRepetitionInsights,
		deckPerformance: mockDeckPerformance,
		decks: mockDecks,
		cardDistribution: mockCardDistribution,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup mock query responses - always return mockDashboardData for the main query
		mockUseQuery.mockImplementation(() => {
			return mockDashboardData;
		});
	});

	const renderWithConvex = (component: React.ReactElement) => {
		return render(component);
	};

	it("renders the statistics dashboard with all components", async () => {
		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		// Check for main heading
		expect(screen.getByText("Learning Analytics")).toBeInTheDocument();

		// Check for all major components
		await waitFor(() => {
			expect(
				screen.getByTestId("statistics-overview-cards"),
			).toBeInTheDocument();
		});

		expect(screen.getByTestId("study-history-heatmap")).toBeInTheDocument();
		expect(screen.getByTestId("study-activity-chart")).toBeInTheDocument();
		expect(screen.getByTestId("deck-performance-chart")).toBeInTheDocument();
		expect(screen.getByTestId("card-distribution-chart")).toBeInTheDocument();
		expect(screen.getByTestId("upcoming-reviews-widget")).toBeInTheDocument();
		expect(screen.getByTestId("learning-streak-widget")).toBeInTheDocument();
		expect(
			screen.getByTestId("spaced-repetition-insights"),
		).toBeInTheDocument();
	});

	it("calls onBack when back button is clicked", () => {
		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		const backButton = screen.getByLabelText("Back to dashboard");
		fireEvent.click(backButton);

		expect(mockOnBack).toHaveBeenCalledTimes(1);
	});

	it("allows changing date range filter", () => {
		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		const dateRangeSelect = screen.getByDisplayValue("Last 30 days");
		fireEvent.change(dateRangeSelect, { target: { value: "7d" } });

		expect(dateRangeSelect).toHaveValue("7d");
	});

	it("displays deck performance table when deck data is available", async () => {
		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		await waitFor(() => {
			expect(screen.getByText("Deck Performance Overview")).toBeInTheDocument();
		});

		expect(screen.getByText("Spanish Vocabulary")).toBeInTheDocument();
		expect(screen.getByText("Math Formulas")).toBeInTheDocument();
	});

	it("shows loading state when data is undefined", () => {
		mockUseQuery.mockImplementation(() => {
			return undefined;
		});

		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		// Should show skeleton loader
		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Loading statistics dashboard"),
		).toBeInTheDocument();
	});

	it("handles export functionality", async () => {
		renderWithConvex(<StatisticsDashboard onBack={mockOnBack} />);

		const exportSelect = screen.getByDisplayValue("Export Data");
		fireEvent.change(exportSelect, { target: { value: "json" } });

		// Wait for the export to complete
		await waitFor(() => {
			// The export functionality should reset the select value
			expect((exportSelect as HTMLSelectElement).value).toBe("");
		});
	});
});
