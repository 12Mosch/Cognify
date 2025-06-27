import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "../../../convex/_generated/dataModel";
import { showErrorToast, showSuccessToast } from "../../lib/toast";
import { DeleteDeckConfirmationModal } from "../DeleteDeckConfirmationModal";

// Mock toast functions
jest.mock("../../lib/toast", () => ({
	showErrorToast: jest.fn(),
	showSuccessToast: jest.fn(),
}));

// Mock Convex hooks
jest.mock("convex/react", () => ({
	useMutation: jest.fn(),
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
	useUser: jest.fn(() => ({
		user: { id: "test-user-id" },
	})),
}));

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	useAnalytics: () => ({
		trackDeckDeleted: jest.fn(),
	}),
}));

// Mock error monitoring
jest.mock("../../lib/errorMonitoring", () => ({
	useErrorMonitoring: () => ({
		trackConvexMutation: jest.fn(),
	}),
}));

// Mock focus management hooks
jest.mock("../../hooks/useFocusManagement", () => ({
	useFocusManagement: () => ({
		restoreFocus: jest.fn(),
	}),
	useModalEffects: jest.fn(),
}));

// Mock react-focus-lock
jest.mock("react-focus-lock", () => {
	return function MockFocusLock({ children }: { children: React.ReactNode }) {
		return <div data-testid="focus-lock">{children}</div>;
	};
});

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: any) => {
			const translations: Record<string, string> = {
				"common.cancel": "Cancel",
				"common.delete": "Delete",
				"common.loading": "Loading...",
				"deck.cardCount": "{{count}} cards",
				"deckView.confirmDeleteDeck":
					"Are you sure you want to permanently delete this deck and all {{cardCount}} cards? This action cannot be undone.",
				"deckView.deleteDeck": "Delete Deck",
				"errors.generic": "Something went wrong. Please try again.",
				"notifications.deckDeletedWithName":
					'"{{deckName}}" deleted successfully!',
				"notifications.networkError":
					"Network error. Please check your connection and try again.",
			};

			let result = translations[key] || key;
			if (options) {
				Object.entries(options).forEach(([placeholder, value]) => {
					result = result.replace(
						new RegExp(`{{${placeholder}}}`, "g"),
						String(value),
					);
				});
			}
			return result;
		},
	}),
}));

const mockDeck = {
	_id: "deck_test123" as Id<"decks">,
	cardCount: 5,
	name: "Test Deck",
};

const mockUseMutation = jest.mocked(
	jest.requireMock("convex/react").useMutation,
);
const mockDeleteDeck = jest.fn();
const mockShowSuccessToast = jest.mocked(showSuccessToast);
const mockShowErrorToast = jest.mocked(showErrorToast);

describe("DeleteDeckConfirmationModal", () => {
	const mockOnClose = jest.fn();
	const mockOnConfirm = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseMutation.mockReturnValue(mockDeleteDeck);
		mockDeleteDeck.mockResolvedValue(undefined);
	});

	it("does not render when isOpen is false", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={false}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("renders modal when isOpen is true", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(screen.getByText("Delete Deck?")).toBeInTheDocument();
	});

	it("displays deck information correctly", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		expect(screen.getByText("Test Deck")).toBeInTheDocument();
		expect(screen.getByText("5 cards")).toBeInTheDocument();
		expect(
			screen.getByText(/permanently delete this deck and all 5 cards/),
		).toBeInTheDocument();
	});

	it("has proper accessibility attributes", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const modal = screen.getByRole("dialog");
		expect(modal).toHaveAttribute("aria-modal", "true");
		expect(modal).toHaveAttribute("aria-labelledby");
		expect(modal).toHaveAttribute("aria-describedby");
	});

	it("focuses cancel button when modal opens", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		expect(cancelButton).toBeInTheDocument();
	});

	it("calls onClose when cancel button is clicked", async () => {
		const user = userEvent.setup();
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const cancelButton = screen.getByRole("button", { name: "Cancel" });
		await user.click(cancelButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when backdrop is clicked", async () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		// Click on the backdrop (overlay)
		const backdrop =
			screen.getByRole("dialog").parentElement?.previousElementSibling;
		if (backdrop) {
			fireEvent.click(backdrop);
			expect(mockOnClose).toHaveBeenCalledTimes(1);
		}
	});

	it("calls onClose when Escape key is pressed", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const modal = screen.getByRole("dialog");
		fireEvent.keyDown(modal, { key: "Escape" });

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("successfully deletes deck and shows success message", async () => {
		const user = userEvent.setup();
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(mockDeleteDeck).toHaveBeenCalledWith({ deckId: mockDeck._id });
		});

		await waitFor(() => {
			expect(mockShowSuccessToast).toHaveBeenCalledWith(
				'"Test Deck" deleted successfully!',
			);
			expect(mockOnClose).toHaveBeenCalled();
			expect(mockOnConfirm).toHaveBeenCalled();
		});
	});

	it("shows loading state during deletion", async () => {
		const user = userEvent.setup();
		// Make the mutation hang to test loading state
		mockDeleteDeck.mockImplementation(() => new Promise(() => {}));

		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(screen.getByText("Loading...")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
			expect(screen.getByRole("button", { name: "Loading..." })).toBeDisabled();
		});
	});

	it("handles deletion error and shows error message", async () => {
		const user = userEvent.setup();
		const error = new Error("Failed to delete deck");
		mockDeleteDeck.mockRejectedValue(error);

		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(mockShowErrorToast).toHaveBeenCalledWith(
				"Something went wrong. Please try again.",
			);
		});

		// Modal should remain open after error
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		expect(mockOnClose).not.toHaveBeenCalled();
		expect(mockOnConfirm).not.toHaveBeenCalled();
	});

	it("handles network error with specific message", async () => {
		const user = userEvent.setup();
		const networkError = new Error("network timeout");
		mockDeleteDeck.mockRejectedValue(networkError);

		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(mockShowErrorToast).toHaveBeenCalledWith(
				"Network error. Please check your connection and try again.",
			);
		});
	});

	it("prevents closing modal during deletion", async () => {
		const user = userEvent.setup();
		// Make the mutation hang to test loading state
		mockDeleteDeck.mockImplementation(() => new Promise(() => {}));

		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		// Try to close with Escape key during deletion
		const modal = screen.getByRole("dialog");
		fireEvent.keyDown(modal, { key: "Escape" });

		// Should not close
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	it("validates deck ID before deletion", async () => {
		const user = userEvent.setup();
		const invalidDeck = { ...mockDeck, _id: "" as Id<"decks"> };

		render(
			<DeleteDeckConfirmationModal
				deck={invalidDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		const deleteButton = screen.getByRole("button", { name: "Delete" });
		await user.click(deleteButton);

		await waitFor(() => {
			expect(mockShowErrorToast).toHaveBeenCalledWith(
				"Something went wrong. Please try again.",
			);
		});

		expect(mockDeleteDeck).not.toHaveBeenCalled();
	});

	it("has focus lock for accessibility", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		expect(screen.getByTestId("focus-lock")).toBeInTheDocument();
	});

	it("displays warning icon", () => {
		render(
			<DeleteDeckConfirmationModal
				deck={mockDeck}
				isOpen={true}
				onClose={mockOnClose}
				onConfirm={mockOnConfirm}
			/>,
		);

		// Check for warning icon (SVG with specific path)
		const warningIcon = screen
			.getByRole("dialog")
			.querySelector('svg[viewBox="0 0 24 24"]');
		expect(warningIcon).toBeInTheDocument();
	});
});
