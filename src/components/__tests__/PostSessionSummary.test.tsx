/**
 * Tests for PostSessionSummary component
 * These tests verify the post-session summary interface works correctly
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../convex/_generated/dataModel";
import PostSessionSummary from "../PostSessionSummary";

// Mock Convex hooks
jest.mock("convex/react", () => ({
	useMutation: jest.fn(),
	useQuery: jest.fn(),
}));

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>;

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	useAnalytics: () => ({
		trackStudySessionCompleted: jest.fn(),
	}),
}));

// Mock dateUtils
jest.mock("../../lib/dateUtils", () => ({
	getLocalDateString: jest.fn(() => "2024-01-15"),
	getUserTimeZone: jest.fn(() => "America/New_York"),
}));

describe("PostSessionSummary", () => {
	const mockDeckId = "deck123" as Id<"decks">;
	const mockDeckName = "Test Deck";
	const mockOnReturnToDashboard = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock study queue stats
		mockUseQuery.mockReturnValue({
			dueCount: 5,
			newCount: 10,
			totalCardsInDeck: 25,
			totalStudyCards: 15,
		});

		// Mock useMutation to return a mock function with required properties
		const mockRecordStudySession = jest.fn().mockResolvedValue(undefined);
		Object.assign(mockRecordStudySession, {
			withOptimisticUpdate: jest.fn(),
		});
		mockUseMutation.mockReturnValue(mockRecordStudySession as any);
	});

	it("renders session completion message with basic study mode", () => {
		render(
			<PostSessionSummary
				cardsReviewed={8}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		expect(screen.getByText("Study Session Complete!")).toBeInTheDocument();
		expect(screen.getAllByText("8")).toHaveLength(2); // Appears in subtitle and stats
		expect(screen.getByText("Test Deck")).toBeInTheDocument();
		expect(screen.getByText("Basic Study")).toBeInTheDocument();
	});

	it("renders session completion message with spaced repetition mode", () => {
		render(
			<PostSessionSummary
				cardsReviewed={12}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(screen.getByText("Study Session Complete!")).toBeInTheDocument();
		expect(screen.getAllByText("12")).toHaveLength(2); // Appears in subtitle and stats
		expect(screen.getByText("Test Deck")).toBeInTheDocument();
		expect(screen.getByText("Spaced Repetition")).toBeInTheDocument();
	});

	it("displays session duration when provided", () => {
		const sessionDuration = 125000; // 2 minutes 5 seconds

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				sessionDuration={sessionDuration}
				studyMode="basic"
			/>,
		);

		expect(screen.getByText("common.sessionDuration")).toBeInTheDocument();
		expect(screen.getByText("2m 5s")).toBeInTheDocument();
	});

	it("formats duration correctly for seconds only", () => {
		const sessionDuration = 45000; // 45 seconds

		render(
			<PostSessionSummary
				cardsReviewed={3}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				sessionDuration={sessionDuration}
				studyMode="basic"
			/>,
		);

		expect(screen.getByText("45s")).toBeInTheDocument();
	});

	it("handles singular card count correctly", () => {
		render(
			<PostSessionSummary
				cardsReviewed={1}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		// Check that the subtitle contains the card count and deck name
		// Note: subtitle text is split across multiple nodes, so we check individual parts
		expect(screen.getAllByText("1")).toHaveLength(2); // Appears in subtitle and stats
		expect(screen.getByText("Test Deck")).toBeInTheDocument();
		expect(screen.getByText("Cards Reviewed")).toBeInTheDocument(); // Appears in stats section
	});

	it("calls onReturnToDashboard when return button is clicked", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		const returnButton = screen.getByText("Return to Dashboard");
		fireEvent.click(returnButton);

		expect(mockOnReturnToDashboard).toHaveBeenCalledTimes(1);
	});

	it("shows continue studying button for spaced repetition with due cards when onContinueStudying is provided", () => {
		const mockOnContinueStudying = jest.fn();

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onContinueStudying={mockOnContinueStudying}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		// Check for the continue studying button by finding a button that contains the text
		const continueButton = screen.getByRole("button", {
			name: /Continue Studying.*5.*more cards/i,
		});
		expect(continueButton).toBeInTheDocument();
	});

	it("does not show continue studying button when onContinueStudying is not provided", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(screen.queryByText(/Continue Studying/)).not.toBeInTheDocument();
	});

	it("calls onContinueStudying when continue studying button is clicked", () => {
		const mockOnContinueStudying = jest.fn();

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onContinueStudying={mockOnContinueStudying}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		const continueButton = screen.getByRole("button", {
			name: /Continue Studying.*5.*more cards/i,
		});
		fireEvent.click(continueButton);

		expect(mockOnContinueStudying).toHaveBeenCalledTimes(1);
	});

	it("does not show continue studying button for basic mode", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		expect(screen.queryByText(/Continue Studying/)).not.toBeInTheDocument();
	});

	it("shows appropriate next study message for basic mode", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		expect(
			screen.getByText(
				"Great job studying! You can review these cards again anytime.",
			),
		).toBeInTheDocument();
	});

	it("shows appropriate next study message for spaced repetition with due cards", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText("You have 5 more cards ready to review now."),
		).toBeInTheDocument();
	});

	it("shows appropriate message when no cards are due", () => {
		mockUseQuery.mockReturnValue({
			dueCount: 0,
			newCount: 8,
			totalCardsInDeck: 20,
			totalStudyCards: 0,
		});

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText(/Excellent! You're all caught up/),
		).toBeInTheDocument();
	});

	it("shows appropriate message when new cards are available", () => {
		mockUseQuery.mockReturnValue({
			dueCount: 0,
			newCount: 15,
			totalCardsInDeck: 25,
			totalStudyCards: 15,
		});

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText(/Come back tomorrow to study 15 new cards/),
		).toBeInTheDocument();
	});

	it("shows motivational message for spaced repetition", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText(
				"Keep up the great work! Consistent practice leads to long-term retention.",
			),
		).toBeInTheDocument();
	});

	it("shows motivational message for basic mode", () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		expect(
			screen.getByText(
				"Great job studying! Regular review helps reinforce your learning.",
			),
		).toBeInTheDocument();
	});

	it("focuses the heading when component mounts", async () => {
		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="basic"
			/>,
		);

		await waitFor(() => {
			const heading = screen.getByTestId("session-complete-heading");
			expect(heading).toHaveFocus();
		});
	});

	it("handles loading state when study queue stats are not available", () => {
		mockUseQuery.mockReturnValue(undefined);

		render(
			<PostSessionSummary
				cardsReviewed={5}
				deckId={mockDeckId}
				deckName={mockDeckName}
				onReturnToDashboard={mockOnReturnToDashboard}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText(
				"Come back later to continue your spaced repetition schedule.",
			),
		).toBeInTheDocument();
	});
});
