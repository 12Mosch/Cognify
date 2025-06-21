/**
 * Tests for EditDeckForm component
 * These tests verify the deck editing functionality works correctly
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Id } from "../../../convex/_generated/dataModel";
import { EditDeckForm } from "../EditDeckForm";

// Mock Convex hooks
jest.mock("convex/react", () => ({
	useQuery: jest.fn(),
	useMutation: jest.fn(),
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: any) => {
			// Mock translation keys with proper values
			const translations: Record<string, string> = {
				"forms.editDeck.title": "Edit Deck",
				"forms.editDeck.name": "Deck Name",
				"forms.editDeck.namePlaceholder": "Enter deck name",
				"forms.editDeck.description": "Description (optional)",
				"forms.editDeck.descriptionPlaceholder": "Enter deck description",
				"forms.editDeck.update": "Update Deck",
				"forms.editDeck.updating": "Updating...",
				"forms.editDeck.cancel": "Cancel",
				"forms.editDeck.buttonLabel": "Edit deck",
				"forms.editDeck.characterCount": `${options?.current || 0}/${options?.max || 0} characters`,
				"forms.validation.deckNameRequired": "Deck name is required",
				"forms.validation.maxLength": `${options?.field || "Field"} must be at most ${options?.max || 0} characters`,
				"deck.editDeck": "Edit Deck",
				"deck.editDeckAria": `Edit ${options?.deckName || "deck"} deck`,
			};

			return translations[key] || key;
		},
	}),
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
	useUser: () => ({
		user: { id: "test-user-id" },
		isLoaded: true,
	}),
}));

// Mock PostHog
jest.mock("posthog-js/react", () => ({
	usePostHog: () => ({
		capture: jest.fn(),
		identify: jest.fn(),
	}),
}));

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	useAnalytics: () => ({
		trackDeckUpdated: jest.fn(),
	}),
}));

// Mock error monitoring
jest.mock("../../lib/errorMonitoring", () => ({
	useErrorMonitoring: () => ({
		captureError: jest.fn(),
		trackConvexMutation: jest.fn(),
	}),
	withFormErrorMonitoring: () => ({
		wrapSubmission: jest.fn((fn, formData) => fn(formData)),
		trackValidationErrors: jest.fn(),
	}),
}));

// Mock toast
jest.mock("../../lib/toast", () => ({
	showErrorToast: jest.fn(),
}));

// Mock focus management hooks
jest.mock("../../hooks/useFocusManagement", () => ({
	useFocusManagement: () => ({
		storeTriggerElement: jest.fn(),
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

const mockDeck = {
	_id: "deck_test123" as Id<"decks">,
	_creationTime: Date.now(),
	name: "Test Deck",
	description: "A test deck for testing",
	userId: "user_test123",
	cardCount: 5,
};

const mockUseMutation = jest.mocked(
	jest.requireMock("convex/react").useMutation,
);
const mockUpdateDeck = jest.fn();

describe("EditDeckForm", () => {
	const mockOnSuccess = jest.fn();
	const mockOnCancel = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockUseMutation.mockReturnValue(mockUpdateDeck);
		mockUpdateDeck.mockResolvedValue(undefined);
	});

	describe("Button State", () => {
		it("renders edit button when form is not shown", () => {
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /Edit deck/i }),
			).toBeInTheDocument();
			expect(screen.getByText("Edit Deck")).toBeInTheDocument();
		});

		it("opens form when edit button is clicked", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(screen.getByText("Edit Deck")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test Deck")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("A test deck for testing"),
			).toBeInTheDocument();
		});
	});

	describe("Form Rendering", () => {
		it("renders form directly when forceShowForm is true", () => {
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
					forceShowForm={true}
				/>,
			);

			expect(screen.getByText("Edit Deck")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test Deck")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("A test deck for testing"),
			).toBeInTheDocument();
		});

		it("renders form with pre-filled values", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(screen.getByText("Edit Deck")).toBeInTheDocument();
			expect(screen.getByDisplayValue("Test Deck")).toBeInTheDocument();
			expect(
				screen.getByDisplayValue("A test deck for testing"),
			).toBeInTheDocument();
		});

		it("renders form fields with correct labels", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(screen.getByLabelText(/Deck Name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
		});

		it("renders action buttons", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(
				screen.getByRole("button", { name: /Update Deck/i }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /Cancel/i }),
			).toBeInTheDocument();
		});

		it("renders character counters", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const characterCounters = screen.getAllByText(/\d+\/\d+ characters/);
			expect(characterCounters).toHaveLength(2); // One for name, one for description
		});
	});

	describe("Form Validation", () => {
		it("disables submit button when deck name is empty", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
					forceShowForm={true}
				/>,
			);

			const nameInput = screen.getByLabelText(/Deck Name/i);
			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			await user.clear(nameInput);

			expect(submitButton).toBeDisabled();
			expect(mockUpdateDeck).not.toHaveBeenCalled();
		});

		it("disables submit button when name is empty", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const nameInput = screen.getByLabelText(/Deck Name/i);
			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			await user.clear(nameInput);

			expect(submitButton).toBeDisabled();
		});
	});

	describe("Form Submission", () => {
		it("submits form with updated values", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const nameInput = screen.getByLabelText(/Deck Name/i);
			const descriptionInput = screen.getByLabelText(/Description/i);
			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			await user.clear(nameInput);
			await user.type(nameInput, "Updated Deck Name");
			await user.clear(descriptionInput);
			await user.type(descriptionInput, "Updated description");
			await user.click(submitButton);

			await waitFor(() => {
				expect(mockUpdateDeck).toHaveBeenCalledWith({
					deckId: mockDeck._id,
					name: "Updated Deck Name",
					description: "Updated description",
				});
			});
		});

		it("calls onSuccess callback after successful submission", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			await user.click(submitButton);

			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalledWith("Test Deck");
			});
		});

		it("shows loading state during submission", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			// Make the mutation hang
			// biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty to create a hanging promise for testing loading states
			mockUpdateDeck.mockImplementation(() => new Promise(() => {}));

			await user.click(submitButton);

			expect(screen.getByText("Updating...")).toBeInTheDocument();
			expect(submitButton).toBeDisabled();
		});
	});

	describe("Form Cancellation", () => {
		it("resets form values when cancelled", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const nameInput = screen.getByLabelText(/Deck Name/i);
			const cancelButton = screen.getByRole("button", { name: /Cancel/i });

			await user.clear(nameInput);
			await user.type(nameInput, "Changed Name");
			await user.click(cancelButton);

			// Form should be closed (check for modal title, not button text)
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			expect(mockOnCancel).toHaveBeenCalled();
		});
	});

	describe("Error Handling", () => {
		it("displays error message when submission fails", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			mockUpdateDeck.mockRejectedValue(new Error("Update failed"));

			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText("Update failed")).toBeInTheDocument();
			});
		});

		it("re-enables form after error", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const submitButton = screen.getByRole("button", { name: /Update Deck/i });

			mockUpdateDeck.mockRejectedValue(new Error("Update failed"));

			await user.click(submitButton);

			await waitFor(() => {
				expect(submitButton).not.toBeDisabled();
			});

			expect(screen.getByText("Update Deck")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has proper modal attributes", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			const dialog = screen.getByRole("dialog");
			expect(dialog).toHaveAttribute("aria-modal", "true");
			expect(dialog).toHaveAttribute("aria-labelledby");
		});

		it("has proper form labels", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(screen.getByLabelText(/Deck Name/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
		});

		it("has focus lock", async () => {
			const user = userEvent.setup();
			render(
				<EditDeckForm
					deck={mockDeck}
					onSuccess={mockOnSuccess}
					onCancel={mockOnCancel}
				/>,
			);

			const editButton = screen.getByRole("button", { name: /Edit deck/i });
			await user.click(editButton);

			expect(screen.getByTestId("focus-lock")).toBeInTheDocument();
		});
	});
});
