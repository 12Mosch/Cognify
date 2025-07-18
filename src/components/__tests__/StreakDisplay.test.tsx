import { fireEvent, render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { useAnalytics } from "@/lib/analytics.ts";
import StreakDisplay from "../StreakDisplay";

// Mock dependencies
jest.mock("convex/react");
jest.mock("../../lib/analytics");

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: {
			changeLanguage: jest.fn(),
		},
		t: (key: string, options?: any) => {
			// Return English translations for testing
			const translations: Record<string, string> = {
				"streak.display.day": "day",
				"streak.display.days": "days",
				"streak.display.daysToGo": `${options?.count || 0} days to go`,
				"streak.display.longestStreak": "Longest Streak",
				"streak.display.milestoneAchieved": `${options?.count || 0} days`,
				"streak.display.milestonesAchieved": "Milestones Achieved",
				"streak.display.nextMilestone": "Next milestone",
				"streak.display.status.buildingMomentum.message":
					"Keep going to reach your first milestone",
				"streak.display.status.buildingMomentum.title": "Building Momentum! 🌱",
				"streak.display.status.greatProgress.message":
					"You're developing a strong habit",
				"streak.display.status.greatProgress.title": "Great Progress! 🔥",
				"streak.display.status.startStreak.message":
					"Study today to begin your learning journey",
				"streak.display.status.startStreak.title": "Start Your Streak! 🎯",
				"streak.display.status.streakMaster.message":
					"You're a dedicated learner",
				"streak.display.status.streakMaster.title": "Streak Master! 🏆",
				"streak.display.title": "Study Streak",
				"streak.display.totalDays": "Total Days",
			};
			return translations[key] || key;
		},
	}),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<
	typeof useAnalytics
>;

describe("StreakDisplay", () => {
	const mockPosthog = {
		capture: jest.fn(),
	} as any; // Type assertion to satisfy PostHog interface

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseAnalytics.mockReturnValue({
			captureError: jest.fn(),
			configValidation: {
				isValid: true,
				missingHost: false,
				missingKey: false,
				warnings: [],
			},
			isConfigured: true,
			posthog: mockPosthog,
			trackCardCreated: jest.fn(),
			trackCardFlipped: jest.fn(),
			trackConvexMutationError: jest.fn(),
			trackConvexQueryError: jest.fn(),
			trackDeckCreated: jest.fn(),
			trackDeckDeleted: jest.fn(),
			trackDeckUpdated: jest.fn(),
			trackDifficultyRated: jest.fn(),
			trackStudySessionCompleted: jest.fn(),
			trackStudySessionStarted: jest.fn(),
			trackUserSignUp: jest.fn(),
		});
	});

	it("renders loading skeleton when data is undefined", () => {
		mockUseQuery.mockReturnValue(undefined);

		render(<StreakDisplay />);

		// Check for loading skeleton elements
		expect(screen.getByTestId("streak-loading")).toHaveClass("animate-pulse");
	});

	it("handles null response gracefully (user has no streak yet)", () => {
		mockUseQuery.mockReturnValue(null);

		render(<StreakDisplay />);

		// Should render with zero-streak baseline
		expect(screen.getByTestId("current-streak")).toHaveTextContent("0");
		expect(screen.getByText("Start Your Streak! 🎯")).toBeInTheDocument();
		expect(
			screen.getByText("Study today to begin your learning journey"),
		).toBeInTheDocument();
		expect(screen.getByText("Longest Streak")).toBeInTheDocument();
		expect(screen.getByText("Total Days")).toBeInTheDocument();
	});

	it("renders zero streak data correctly", () => {
		const mockStreakData = {
			currentStreak: 0,
			lastMilestone: null,
			longestStreak: 0,
			milestonesReached: [],
			totalStudyDays: 0,
		};

		mockUseQuery.mockReturnValue(mockStreakData);

		render(<StreakDisplay />);

		expect(screen.getByTestId("current-streak")).toHaveTextContent("0");
		expect(screen.getByText("Start Your Streak! 🎯")).toBeInTheDocument();
		expect(
			screen.getByText("Study today to begin your learning journey"),
		).toBeInTheDocument();
	});

	it("renders active streak data correctly", () => {
		const mockStreakData = {
			currentStreak: 15,
			lastMilestone: 7,
			longestStreak: 20,
			milestonesReached: [7],
			totalStudyDays: 45,
		};

		mockUseQuery.mockReturnValue(mockStreakData);

		render(<StreakDisplay />);

		expect(screen.getByText("15")).toBeInTheDocument();
		expect(screen.getByText("Great Progress! 🔥")).toBeInTheDocument();
		expect(
			screen.getByText("You're developing a strong habit"),
		).toBeInTheDocument();
		expect(screen.getByText("20")).toBeInTheDocument(); // Longest streak
		expect(screen.getByText("45")).toBeInTheDocument(); // Total days
		expect(screen.getByText("🏅 7 days")).toBeInTheDocument(); // Last milestone
	});

	it("shows progress to next milestone", () => {
		const mockStreakData = {
			currentStreak: 15,
			lastMilestone: 7,
			longestStreak: 20,
			milestonesReached: [7],
			totalStudyDays: 45,
		};

		mockUseQuery.mockReturnValue(mockStreakData);

		render(<StreakDisplay />);

		expect(screen.getByText("Next milestone")).toBeInTheDocument();
		expect(screen.getByText("30 days")).toBeInTheDocument();
		expect(screen.getByText("15 days to go")).toBeInTheDocument();
	});

	it("displays milestones achieved", () => {
		const mockStreakData = {
			currentStreak: 35,
			lastMilestone: 30,
			longestStreak: 35,
			milestonesReached: [7, 30],
			totalStudyDays: 35,
		};

		mockUseQuery.mockReturnValue(mockStreakData);

		render(<StreakDisplay />);

		expect(screen.getByText("Milestones Achieved")).toBeInTheDocument();
		expect(screen.getByText("🏅 7")).toBeInTheDocument();
		expect(screen.getByText("🏅 30")).toBeInTheDocument();
	});

	it("tracks analytics when clicked", () => {
		const mockStreakData = {
			currentStreak: 15,
			lastMilestone: 7,
			longestStreak: 20,
			milestonesReached: [7],
			totalStudyDays: 45,
		};

		mockUseQuery.mockReturnValue(mockStreakData);

		render(<StreakDisplay />);

		const streakDisplay = screen.getByTestId("streak-display");
		fireEvent.click(streakDisplay);

		expect(mockPosthog.capture).toHaveBeenCalledWith("streak_display_clicked", {
			currentStreak: 15,
			longestStreak: 20,
			milestonesReached: 1,
			totalStudyDays: 45,
		});
	});

	it("applies custom className", () => {
		mockUseQuery.mockReturnValue({
			currentStreak: 5,
			lastMilestone: null,
			longestStreak: 10,
			milestonesReached: [],
			totalStudyDays: 15,
		});

		render(<StreakDisplay className="custom-class" />);

		expect(screen.getByTestId("streak-display")).toHaveClass("custom-class");
	});

	it("shows correct streak status for different ranges", () => {
		// Test building momentum (< 7 days)
		mockUseQuery.mockReturnValue({
			currentStreak: 3,
			lastMilestone: null,
			longestStreak: 3,
			milestonesReached: [],
			totalStudyDays: 3,
		});

		const { rerender } = render(<StreakDisplay />);
		expect(screen.getByText("Building Momentum! 🌱")).toBeInTheDocument();

		// Test great progress (7-29 days)
		mockUseQuery.mockReturnValue({
			currentStreak: 15,
			lastMilestone: 7,
			longestStreak: 15,
			milestonesReached: [7],
			totalStudyDays: 15,
		});

		rerender(<StreakDisplay />);
		expect(screen.getByText("Great Progress! 🔥")).toBeInTheDocument();

		// Test streak master (30+ days)
		mockUseQuery.mockReturnValue({
			currentStreak: 45,
			lastMilestone: 30,
			longestStreak: 45,
			milestonesReached: [7, 30],
			totalStudyDays: 45,
		});

		rerender(<StreakDisplay />);
		expect(screen.getByText("Streak Master! 🏆")).toBeInTheDocument();
	});
});
