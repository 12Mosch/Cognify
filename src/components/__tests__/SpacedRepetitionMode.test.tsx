/**
 * Tests for SpacedRepetitionMode component
 * These tests verify the spaced repetition study interface works correctly
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Id } from "../../../convex/_generated/dataModel";
import SpacedRepetitionMode from "../SpacedRepetitionMode";

// Mock Convex hooks
jest.mock("convex/react", () => ({
	useMutation: jest.fn(),
	useQuery: jest.fn(),
}));

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	hasAnalyticsConsent: jest.fn(() => true),
	trackCardsReviewed: jest.fn(),
	trackSessionCompleted: jest.fn(),
	// Mock the new tracking functions
	trackSessionStarted: jest.fn(),
	trackStreakBroken: jest.fn(),
	trackStreakContinued: jest.fn(),
	trackStreakMilestone: jest.fn(),
	trackStreakStarted: jest.fn(),
	useAnalytics: () => ({
		posthog: null,
		trackCardFlipped: jest.fn(),
		trackDifficultyRated: jest.fn(),
		trackStudySessionStarted: jest.fn(),
	}),
	useAnalyticsEnhanced: () => ({
		hasConsent: true,
		identifyUser: jest.fn(),
		trackEventBatched: jest.fn(),
		trackFeatureFlag: jest.fn(),
	}),
}));

// Mock error monitoring
jest.mock("../../lib/errorMonitoring", () => ({
	useErrorMonitoring: () => ({
		captureError: jest.fn(),
		hasConsent: true,
		trackAuth: jest.fn(),
		trackCardLoading: jest.fn(),
		trackConvexMutation: jest.fn(),
		trackConvexQuery: jest.fn(),
		trackStudySession: jest.fn(),
	}),
}));

// Mock PostSessionSummary component
jest.mock("../PostSessionSummary", () => {
	return function MockPostSessionSummary({ onReturnToDashboard }: any) {
		return (
			<div>
				<h2>Study Session Complete!</h2>
				<button onClick={onReturnToDashboard} type="button">
					Return to Dashboard
				</button>
			</div>
		);
	};
});

// Mock KeyboardShortcutsModal component
jest.mock("../KeyboardShortcutsModal", () => {
	return function MockKeyboardShortcutsModal({ isOpen, onClose }: any) {
		if (!isOpen) return null;
		return (
			<div>
				<h2>Keyboard Shortcuts</h2>
				<p>Available shortcuts for Spaced Repetition mode</p>
				<button onClick={onClose} type="button">
					Close
				</button>
			</div>
		);
	};
});

const mockDeckId = "test-deck-id" as Id<"decks">;
const mockOnExit = jest.fn();

const mockDeck = {
	_creationTime: Date.now(),
	_id: mockDeckId,
	description: "Test Description",
	name: "Test Deck",
	userId: "test-user",
};

const mockCards = [
	{
		_creationTime: Date.now(),
		_id: "card-1" as Id<"cards">,
		back: "4",
		deckId: mockDeckId,
		dueDate: Date.now(),
		easeFactor: 2.5,
		front: "What is 2+2?",
		interval: 1,
		repetition: 0,
	},
	{
		_creationTime: Date.now(),
		_id: "card-2" as Id<"cards">,
		back: "Paris",
		deckId: mockDeckId,
		dueDate: Date.now() - 86400000,
		easeFactor: 2.5,
		front: "What is the capital of France?",
		interval: 6,
		repetition: 1, // Due yesterday
	},
];

describe("SpacedRepetitionMode", () => {
	const mockUseQuery = jest.mocked(jest.requireMock("convex/react").useQuery);
	const mockUseMutation = jest.mocked(
		jest.requireMock("convex/react").useMutation,
	);
	const mockReviewCard = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Mock useMutation to always return our mock functions
		mockUseMutation.mockImplementation(() => {
			// Return mockReviewCard for all mutations to simplify testing
			return mockReviewCard;
		});
	});

	it("renders loading state when data is not loaded", () => {
		// Mock all queries to return undefined (loading state)
		mockUseQuery.mockReturnValue(undefined);

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		expect(screen.getByLabelText("Loading flashcard")).toBeInTheDocument();
		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("renders deck not found state when deck is null", () => {
		// Mock queries to return stable values using call counter
		let callCount = 0;
		const mockValues = [
			null, // deck = null (triggers deck not found)
			[], // studyQueueData = [] (not undefined, so passes loading check)
			{ hasCardsToReview: false, nextDueDate: undefined, totalCardsInDeck: 0 }, // nextReviewInfo
		];

		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		expect(screen.getByText("study.deckNotFound.title")).toBeInTheDocument();
		expect(
			screen.getByText("study.deckNotFound.backToDashboard"),
		).toBeInTheDocument();
	});

	it("renders enhanced no cards state when there are no cards to study", () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true, // Tomorrow
			nextDueDate: Date.now() + 86400000,
			totalCardsInDeck: 5,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		expect(screen.getByText("study.allCaughtUp.title")).toBeInTheDocument();
		expect(
			screen.getByText("study.allCaughtUp.noCardsMessage"),
		).toBeInTheDocument();
		expect(screen.getByText("study.session.nextReview")).toBeInTheDocument();
		expect(
			screen.getByText("study.allCaughtUp.nextReviewMessage"),
		).toBeInTheDocument();
	});

	it("renders enhanced no cards state with session statistics", () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true, // Tomorrow
			nextDueDate: Date.now() + 86400000,
			totalCardsInDeck: 5,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		expect(screen.getByText("study.allCaughtUp.title")).toBeInTheDocument();
		expect(screen.getByText("study.session.nextReview")).toBeInTheDocument();
	});

	it("renders no cards state for empty deck", () => {
		const mockNextReviewInfo = {
			hasCardsToReview: false,
			nextDueDate: undefined,
			totalCardsInDeck: 0,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		expect(screen.getByText("study.allCaughtUp.title")).toBeInTheDocument();
		expect(
			screen.getByText("study.allCaughtUp.emptyDeckMessage"),
		).toBeInTheDocument();
	});

	it("renders study interface with cards", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 2,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [
			mockDeck,
			[mockCards[1], mockCards[0]],
			mockNextReviewInfo,
		];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		await waitFor(() => {
			expect(screen.getByText("Test Deck")).toBeInTheDocument();
		});

		expect(screen.getByText("Spaced Repetition Mode")).toBeInTheDocument();
		expect(screen.getByText("Front (Question)")).toBeInTheDocument();
		expect(
			screen.getByText("What is the capital of France?"),
		).toBeInTheDocument();
		expect(screen.getByText("Show Answer")).toBeInTheDocument();
	});

	it("allows flipping cards to show answer", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[1]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		await waitFor(() => {
			expect(screen.getByText("Show Answer")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Show Answer"));

		expect(screen.getByText("Back (Answer)")).toBeInTheDocument();
		expect(screen.getByText("Paris")).toBeInTheDocument();
		expect(screen.getByText("How well did you know this?")).toBeInTheDocument();
		expect(screen.getByText("Again")).toBeInTheDocument();
		expect(screen.getByText("Hard")).toBeInTheDocument();
		expect(screen.getByText("Good")).toBeInTheDocument();
		expect(screen.getByText("Easy")).toBeInTheDocument();
	});

	it("handles card review and moves to next card", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 2,
		};

		// Mock queries with cycling values - use fixed order to avoid shuffle randomness
		let callCount = 0;
		const mockValues = [mockDeck, mockCards, mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		mockReviewCard.mockResolvedValue(null);

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		// Wait for component to load and determine which card is shown first
		await waitFor(() => {
			// Either card could be shown first due to shuffling, so check for either
			const hasCard1 = screen.queryByText("What is 2+2?");
			const hasCard2 = screen.queryByText("What is the capital of France?");
			expect(hasCard1 || hasCard2).toBeTruthy();
		});

		// Get the current card text to determine which card is being shown
		const isCard1First = screen.queryByText("What is 2+2?") !== null;
		const expectedCardId = isCard1First ? "card-1" : "card-2";
		const expectedNextCardText = isCard1First
			? "What is the capital of France?"
			: "What is 2+2?";

		// Flip the card
		fireEvent.click(screen.getByText("Show Answer"));

		// Rate the card as "Good"
		fireEvent.click(screen.getByText("Good"));

		// Should call reviewCard mutation for the current card
		await waitFor(() => {
			expect(mockReviewCard).toHaveBeenCalledWith({
				cardId: expectedCardId,
				quality: 4,
			});
		});

		// Should move to next card
		await waitFor(() => {
			expect(screen.getByText(expectedNextCardText)).toBeInTheDocument();
		});
	});

	it("exits when all cards are reviewed", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[0]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		mockReviewCard.mockResolvedValue(null);

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		// Wait for component to load
		await waitFor(() => {
			expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
		});

		// Flip and review the only card
		fireEvent.click(screen.getByText("Show Answer"));
		fireEvent.click(screen.getByText("Good"));

		// Should show summary instead of calling onExit directly
		await waitFor(() => {
			expect(screen.getByText("Study Session Complete!")).toBeInTheDocument();
		});
	});

	it("handles exit button click", () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[0]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		const exitButton = screen.getByText("Exit Study");
		fireEvent.click(exitButton);

		expect(mockOnExit).toHaveBeenCalled();
	});

	it("renders help icon and opens keyboard shortcuts modal", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[0]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		await waitFor(() => {
			expect(
				screen.getByLabelText("Show keyboard shortcuts help"),
			).toBeInTheDocument();
		});

		// Click help icon
		const helpIcon = screen.getByLabelText("Show keyboard shortcuts help");
		fireEvent.click(helpIcon);

		await waitFor(() => {
			expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
		});

		expect(
			screen.getByText(/Available shortcuts for Spaced Repetition mode/),
		).toBeInTheDocument();
	});

	it("handles number key shortcuts for rating when card is flipped", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 2,
		};

		// Mock queries with cycling values - use multiple cards so session doesn't end immediately
		let callCount = 0;
		const mockValues = [mockDeck, mockCards, mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		mockReviewCard.mockResolvedValue(null);

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		// Wait for component to load and determine which card is shown first
		await waitFor(() => {
			// Either card could be shown first due to shuffling, so check for either
			const hasCard1 = screen.queryByText("What is 2+2?");
			const hasCard2 = screen.queryByText("What is the capital of France?");
			expect(hasCard1 || hasCard2).toBeTruthy();
		});

		// Get the current card to determine expected cardId
		const isCard1First = screen.queryByText("What is 2+2?") !== null;
		const expectedCardId = isCard1First ? "card-1" : "card-2";

		// Flip the card first
		fireEvent.click(screen.getByText("Show Answer"));

		await waitFor(() => {
			// Look for the answer "4" in the card content, not the keyboard shortcut
			const answerElement = screen.getByText("4", { selector: "p" });
			expect(answerElement).toBeInTheDocument();
		});

		// Press number key 3 for "Good" rating
		fireEvent.keyDown(document, { key: "3" });

		await waitFor(() => {
			expect(mockReviewCard).toHaveBeenCalledWith({
				cardId: expectedCardId,
				quality: 4,
			});
		});
	});

	it("displays rating buttons with keyboard shortcuts", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[0]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		// Wait for component to load and flip card
		await waitFor(() => {
			expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText("Show Answer"));

		await waitFor(() => {
			expect(screen.getByText("Again")).toBeInTheDocument();
		});

		expect(screen.getByText("Hard")).toBeInTheDocument();
		expect(screen.getByText("Good")).toBeInTheDocument();
		expect(screen.getByText("Easy")).toBeInTheDocument();

		// Check for keyboard shortcut indicators - use more specific queries
		expect(
			screen.getByLabelText("Again - I didn't know this at all (Press 1)"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Hard - I knew this with difficulty (Press 2)"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Good - I knew this well (Press 3)"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Easy - I knew this perfectly (Press 4)"),
		).toBeInTheDocument();
	});

	it("opens keyboard shortcuts modal when ? key is pressed", async () => {
		const mockNextReviewInfo = {
			hasCardsToReview: true,
			nextDueDate: undefined,
			totalCardsInDeck: 1,
		};

		// Mock queries with cycling values
		let callCount = 0;
		const mockValues = [mockDeck, [mockCards[0]], mockNextReviewInfo];
		mockUseQuery.mockImplementation(() => {
			const value = mockValues[callCount % mockValues.length];
			callCount++;
			return value;
		});

		render(<SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />);

		await waitFor(() => {
			expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
		});

		// Press ? key
		fireEvent.keyDown(document, { key: "?", shiftKey: true });

		await waitFor(() => {
			expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
		});
	});
});
