import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Id } from "../../../convex/_generated/dataModel";
import { showErrorToast } from "../../lib/toast";
import LearningReflectionModal from "../LearningReflectionModal";

// Mock the toast function
jest.mock("../../lib/toast", () => ({
	showErrorToast: jest.fn(),
}));

// Mock the Convex hooks
jest.mock("convex/react", () => ({
	useMutation: jest.fn(() => jest.fn()),
	useQuery: jest.fn(() => []),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, fallback?: string) => {
			const translations: Record<string, string> = {
				"reflection.continue": "Continue",
				"reflection.saveError": "Failed to save reflection. Please try again.",
				"reflection.selectPrompt": "Choose a reflection prompt",
				"reflection.skip": "Skip",
				"reflection.subtitle.prompts": "Reflect on your learning experience",
				"reflection.title": "Learning Reflection",
			};
			return translations[key] || fallback || key;
		},
	}),
}));

const mockProps = {
	isOpen: true,
	onClose: jest.fn(),
	sessionContext: {
		averageSuccess: 0.7,
		cardsReviewed: 5,
		deckId: "test-deck-id" as Id<"decks">,
		sessionDuration: 300,
	},
	sessionId: "test-session-id",
};

const mockUseQuery = jest.mocked(jest.requireMock("convex/react").useQuery);
const mockUseMutation = jest.mocked(
	jest.requireMock("convex/react").useMutation,
);

describe("LearningReflectionModal Error Handling", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset mock implementations
		mockUseQuery.mockReset();
		mockUseMutation.mockReset();
	});

	it("shows error toast when reflection save fails", async () => {
		// Mock successful queries - return prompts for the first call
		mockUseQuery
			.mockReturnValueOnce([
				{
					category: "difficulty",
					priority: "high",
					prompt: "What made this material challenging?",
				},
			])
			.mockReturnValue([]); // Return empty array for other queries

		// Mock failing mutation
		const mockSaveReflection = jest
			.fn()
			.mockRejectedValue(new Error("Network error"));
		mockUseMutation.mockReturnValue(mockSaveReflection);

		render(<LearningReflectionModal {...mockProps} />);

		// Wait for component to load
		await waitFor(() => {
			expect(
				screen.getByText("Choose a reflection prompt"),
			).toBeInTheDocument();
		});

		// Select a prompt
		const promptButton = screen.getByText(
			"What made this material challenging?",
		);
		fireEvent.click(promptButton);

		// Fill in response
		const textarea = screen.getByPlaceholderText(
			"Share your thoughts and insights...",
		);
		fireEvent.change(textarea, {
			target: { value: "Test reflection response" },
		});

		// Submit the form
		const continueButton = screen.getByText("Continue");
		fireEvent.click(continueButton);

		// Wait for the error to be handled
		await waitFor(() => {
			expect(mockSaveReflection).toHaveBeenCalled();
		});

		// Verify that the error toast was shown
		await waitFor(() => {
			expect(showErrorToast).toHaveBeenCalledWith(
				"Failed to save reflection. Please try again.",
			);
		});
	});

	it("does not show error toast when reflection save succeeds", async () => {
		// Mock successful queries - return prompts for the first call
		mockUseQuery
			.mockReturnValueOnce([
				{
					category: "difficulty",
					priority: "high",
					prompt: "What made this material challenging?",
				},
			])
			.mockReturnValue([]); // Return empty array for other queries

		// Mock successful mutation
		const mockSaveReflection = jest.fn().mockResolvedValue(undefined);
		mockUseMutation.mockReturnValue(mockSaveReflection);

		render(<LearningReflectionModal {...mockProps} />);

		// Wait for component to load
		await waitFor(() => {
			expect(
				screen.getByText("Choose a reflection prompt"),
			).toBeInTheDocument();
		});

		// Select a prompt
		const promptButton = screen.getByText(
			"What made this material challenging?",
		);
		fireEvent.click(promptButton);

		// Fill in response
		const textarea = screen.getByPlaceholderText(
			"Share your thoughts and insights...",
		);
		fireEvent.change(textarea, {
			target: { value: "Test reflection response" },
		});

		// Submit the form
		const continueButton = screen.getByText("Continue");
		fireEvent.click(continueButton);

		// Wait for the success to be handled
		await waitFor(() => {
			expect(mockSaveReflection).toHaveBeenCalled();
		});

		// Verify that no error toast was shown
		expect(showErrorToast).not.toHaveBeenCalled();
	});

	it("handles invalid category values safely with fallback", async () => {
		// Mock query with invalid category
		mockUseQuery
			.mockReturnValueOnce([
				{
					category: "invalid_category", // Invalid category that should trigger fallback
					priority: "high",
					prompt: "Test prompt with invalid category",
				},
			])
			.mockReturnValue([]);

		const mockSaveReflection = jest.fn().mockResolvedValue(undefined);
		mockUseMutation.mockReturnValue(mockSaveReflection);

		// Spy on console.warn to verify warning is logged
		const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

		render(<LearningReflectionModal {...mockProps} />);

		// Wait for component to load
		await waitFor(() => {
			expect(
				screen.getByText("Choose a reflection prompt"),
			).toBeInTheDocument();
		});

		// Select the prompt with invalid category
		const promptButton = screen.getByText("Test prompt with invalid category");
		fireEvent.click(promptButton);

		// Fill in response
		const textarea = screen.getByPlaceholderText(
			"Share your thoughts and insights...",
		);
		fireEvent.change(textarea, {
			target: { value: "Test reflection response" },
		});

		// Submit the form
		const continueButton = screen.getByText("Continue");
		fireEvent.click(continueButton);

		// Wait for submission
		await waitFor(() => {
			expect(mockSaveReflection).toHaveBeenCalled();
		});

		// Verify that the mutation was called with the fallback category
		expect(mockSaveReflection).toHaveBeenCalledWith({
			category: "understanding", // Should use fallback category
			deckId: "test-deck-id",
			prompt: "Test prompt with invalid category",
			rating: 3,
			response: "Test reflection response",
			sessionId: "test-session-id",
		});

		// Verify that warning was logged
		expect(consoleSpy).toHaveBeenCalledWith(
			'Invalid reflection category received from API: "invalid_category". Using fallback: "understanding"',
		);

		consoleSpy.mockRestore();
	});

	describe("difficulty calculation integration", () => {
		it("uses calculateDifficulty utility function for strategy recommendations", () => {
			// Test that the component properly integrates with the difficulty utility
			const testProps = {
				...mockProps,
				sessionContext: {
					...mockProps.sessionContext,
					averageSuccess: 0.5, // Should result in 'hard' difficulty
				},
			};

			mockUseQuery.mockReturnValueOnce([]).mockReturnValue([]);
			const mockSaveReflection = jest.fn().mockResolvedValue(undefined);
			mockUseMutation.mockReturnValue(mockSaveReflection);

			render(<LearningReflectionModal {...testProps} />);

			// Verify that useQuery was called with the calculated difficulty
			expect(mockUseQuery).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					context: expect.objectContaining({
						difficulty: "hard",
					}),
				}),
			);
		});
	});
});
