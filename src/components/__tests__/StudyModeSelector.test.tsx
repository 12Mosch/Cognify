/**
 * Tests for StudyModeSelector component
 * These tests verify the study mode selection interface works correctly
 */

import { fireEvent, render, screen } from "@testing-library/react";
import type { Id } from "../../../convex/_generated/dataModel";
import StudyModeSelector from "../StudyModeSelector";

// Mock the useQuery hook
jest.mock("convex/react", () => ({
	useQuery: jest.fn(() => []), // Return empty array for learning paths
}));

const mockDeckId = "test-deck-id" as Id<"decks">;
const mockDeckName = "Test Deck";
const mockOnSelectMode = jest.fn();
const mockOnCancel = jest.fn();

describe("StudyModeSelector", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders study mode selection interface", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		expect(screen.getByText("Choose Study Mode")).toBeInTheDocument();
		expect(
			screen.getByText("How would you like to study Test Deck?"),
		).toBeInTheDocument();
		expect(screen.getByText("Basic Study")).toBeInTheDocument();
		expect(screen.getByText("Spaced Repetition")).toBeInTheDocument();
		expect(screen.getByText("Cancel")).toBeInTheDocument();
	});

	it("displays basic study mode information", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		expect(screen.getByText("Basic Study")).toBeInTheDocument();
		expect(
			screen.getByText("Simple sequential review of all cards in the deck."),
		).toBeInTheDocument();
		expect(screen.getByText("Sequential Review")).toBeInTheDocument();
		expect(screen.getByText("Simple Interface")).toBeInTheDocument();
		expect(screen.getByText("Quick Setup")).toBeInTheDocument();
	});

	it("displays spaced repetition mode information", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		expect(screen.getByText("Spaced Repetition")).toBeInTheDocument();
		expect(screen.getByText("Recommended")).toBeInTheDocument();
		expect(
			screen.getByText("Intelligent scheduling based on the SM-2 algorithm."),
		).toBeInTheDocument();
		expect(screen.getByText("SM-2 Algorithm")).toBeInTheDocument();
		expect(screen.getByText("Optimal Timing")).toBeInTheDocument();
		expect(screen.getByText("Better Retention")).toBeInTheDocument();
	});

	it("displays information about spaced repetition", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		expect(screen.getByText("What is Spaced Repetition?")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Spaced repetition is a learning technique that involves reviewing information at increasing intervals to improve long-term retention.",
			),
		).toBeInTheDocument();
	});

	it("calls onSelectMode with basic when basic study is clicked", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		const basicStudyCard = screen.getByTestId("basic-study-card");
		fireEvent.click(basicStudyCard);

		expect(mockOnSelectMode).toHaveBeenCalledWith("basic");
	});

	it("calls onSelectMode with spaced-repetition when spaced repetition is clicked", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		const spacedRepetitionCard = screen.getByTestId("spaced-repetition-card");
		fireEvent.click(spacedRepetitionCard);

		expect(mockOnSelectMode).toHaveBeenCalledWith("spaced-repetition");
	});

	it("calls onCancel when cancel button is clicked", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		const cancelButton = screen.getByText("Cancel");
		fireEvent.click(cancelButton);

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("has proper accessibility attributes", () => {
		render(
			<StudyModeSelector
				deckId={mockDeckId}
				deckName={mockDeckName}
				onCancel={mockOnCancel}
				onSelectMode={mockOnSelectMode}
			/>,
		);

		// Check that clickable elements are properly structured using test IDs
		const basicStudyCard = screen.getByTestId("basic-study-card");
		const spacedRepetitionCard = screen.getByTestId("spaced-repetition-card");

		expect(basicStudyCard).toHaveClass("cursor-pointer");
		expect(spacedRepetitionCard).toHaveClass("cursor-pointer");
	});
});
