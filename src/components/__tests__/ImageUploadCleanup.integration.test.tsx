import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "../../../convex/_generated/dataModel";
import type { CardImageData } from "../../types/cards";
import { QuickAddCardForm } from "../QuickAddCardForm";

// Mock Convex
const mockAddCard = jest.fn();
const mockDeleteFile = jest.fn();
const mockDecks = [
	{
		_creationTime: Date.now(),
		_id: "deck1" as Id<"decks">,
		cardCount: 0,
		name: "Test Deck",
		userId: "user1",
	},
];

jest.mock("convex/react", () => ({
	useMutation: jest.fn((mutation: any) => {
		// Create a mock function that will be called with arguments
		const mockFn = jest.fn().mockImplementation((args: any) => {
			// Determine which mock to call based on the arguments
			if (args?.storageId) {
				return mockDeleteFile(args);
			}
			// Default to addCard for other arguments
			return mockAddCard(args);
		});

		// Store reference to the mutation for potential inspection
		(mockFn as any)._mutationRef = mutation;
		return mockFn;
	}),
	useQuery: () => mockDecks,
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
	useUser: () => ({
		user: { id: "user1" },
	}),
}));

// Mock PostHog
jest.mock("posthog-js/react", () => ({
	usePostHog: () => ({
		capture: jest.fn(),
	}),
}));

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	useAnalytics: () => ({
		trackCardCreated: jest.fn(),
	}),
}));

// Mock error monitoring
jest.mock("../../lib/errorMonitoring", () => ({
	useErrorMonitoring: () => ({
		captureError: jest.fn(),
		trackConvexMutation: jest.fn(),
		trackConvexQuery: jest.fn(),
	}),
	withFormErrorMonitoring: () => ({
		trackValidationErrors: jest.fn(),
		wrapSubmission: async (fn: any, data: any) => {
			return await fn(data);
		},
	}),
}));

// Mock focus management
jest.mock("../../hooks/useFocusManagement", () => ({
	useFocusManagement: () => ({
		restoreFocus: jest.fn(),
		storeTriggerElement: jest.fn(),
	}),
	useModalEffects: jest.fn(),
}));

// Mock toast
jest.mock("../../lib/toast", () => ({
	showErrorToast: jest.fn(),
}));

// Don't mock the useCardImageCleanup hook - let it use the real implementation
// This way it can properly interact with the component's state

// Mock translation
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: any) => {
			// Handle specific translation keys
			if (key === "forms.quickAddCard.cancel") {
				return "Cancel";
			}
			if (key === "common.cancel") {
				return "Cancel";
			}

			// Handle interpolation for character count and other dynamic content
			if (typeof options === "object" && options !== null) {
				if (key === "forms.quickAddCard.characterCount") {
					return `${options.current}/${options.max}`;
				}
				// For other keys with interpolation, return a simple string
				return key.replace(/\{\{(\w+)\}\}/g, (match, prop) => options[prop] || match);
			}
			return key;
		},
	}),
}));

// Mock PhotoUpload component
jest.mock("../PhotoUpload", () => ({
	PhotoUpload: ({ onImageSelect, label }: any) => {
		// Convert translation keys to readable text for testing
		const getDisplayLabel = (label: string) => {
			if (label === "forms.quickAddCard.frontImage") {
				return "Front Image (Optional)";
			}
			if (label === "forms.quickAddCard.backImage") {
				return "Back Image (Optional)";
			}
			return label;
		};

		const displayLabel = getDisplayLabel(label);

		return (
			<div
				data-testid={`photo-upload-${label.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "")}`}
			>
				<button
					onClick={() => {
						const mockImageData: CardImageData = {
							file: new File(["test"], "test.jpg", { type: "image/jpeg" }),
							preview: "blob:test-url",
							storageId: "test-storage-id" as Id<"_storage">,
						};
						onImageSelect(mockImageData);
					}}
					type="button"
				>
					Upload {displayLabel}
				</button>
				<button
					onClick={() => {
						onImageSelect(null);
					}}
					type="button"
				>
					Remove {displayLabel}
				</button>
			</div>
		);
	},
}));

describe("Image Upload Cleanup Integration", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAddCard.mockResolvedValue("card1");
		mockDeleteFile.mockResolvedValue({ success: true });
	});

	it("should clean up uploaded images when form is cancelled", async () => {
		const user = userEvent.setup();
		const mockOnCancel = jest.fn();

		render(<QuickAddCardForm onCancel={mockOnCancel} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Upload an image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Cancel the form
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		// Should call cleanup
		await waitFor(() => {
			expect(mockDeleteFile).toHaveBeenCalledWith({
				storageId: "test-storage-id",
			});
		});

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("should clean up uploaded images when ESC key is pressed", async () => {
		const user = userEvent.setup();
		const mockOnCancel = jest.fn();

		render(<QuickAddCardForm onCancel={mockOnCancel} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Upload an image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Press ESC key
		const form = screen.getByRole("dialog");
		fireEvent.keyDown(form, { key: "Escape" });

		// Should call cleanup
		await waitFor(() => {
			expect(mockDeleteFile).toHaveBeenCalledWith({
				storageId: "test-storage-id",
			});
		});

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("should NOT clean up images when card is successfully created", async () => {
		const user = userEvent.setup();
		const mockOnSuccess = jest.fn();

		render(<QuickAddCardForm onSuccess={mockOnSuccess} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Fill out the form
		const deckSelect = screen.getByRole("combobox");
		await user.selectOptions(deckSelect, "deck1");

		const frontTextarea = screen.getByLabelText(/front/i);
		await user.type(frontTextarea, "Test front");

		const backTextarea = screen.getByLabelText(/back/i);
		await user.type(backTextarea, "Test back");

		// Upload an image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Submit the form
		const submitButton = screen.getByText("forms.quickAddCard.add");
		await user.click(submitButton);

		// Should create card successfully
		await waitFor(() => {
			expect(mockAddCard).toHaveBeenCalledWith({
				back: "Test back",
				backImageId: undefined,
				deckId: "deck1",
				front: "Test front",
				frontImageId: "test-storage-id",
			});
		});

		// Wait for the success callback to be called
		await waitFor(() => {
			expect(mockOnSuccess).toHaveBeenCalled();
		});

		// Should NOT call cleanup when card is successfully created
		expect(mockDeleteFile).not.toHaveBeenCalled();
	});

	it("should clean up multiple uploaded images", async () => {
		const user = userEvent.setup();
		const mockOnCancel = jest.fn();

		render(<QuickAddCardForm onCancel={mockOnCancel} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Upload front image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Upload back image
		const backImageUpload = screen.getByText("Upload Back Image (Optional)");
		await user.click(backImageUpload);

		// Cancel the form
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		// Should call cleanup for both images
		await waitFor(() => {
			expect(mockDeleteFile).toHaveBeenCalledTimes(2);
			expect(mockDeleteFile).toHaveBeenCalledWith({
				storageId: "test-storage-id",
			});
		});

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("should handle cleanup errors gracefully", async () => {
		const user = userEvent.setup();
		const mockOnCancel = jest.fn();

		// Mock deleteFile to reject but not throw in the component
		mockDeleteFile.mockRejectedValue(new Error("Delete failed"));

		render(<QuickAddCardForm onCancel={mockOnCancel} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Upload an image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Cancel the form - should not throw even if cleanup fails
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		await waitFor(() => {
			expect(mockDeleteFile).toHaveBeenCalledWith({
				storageId: "test-storage-id",
			});
		});

		expect(mockOnCancel).toHaveBeenCalled();
	});

	it("should clean up when image is removed before form submission", async () => {
		const user = userEvent.setup();
		const mockOnCancel = jest.fn();

		render(<QuickAddCardForm onCancel={mockOnCancel} />);

		// Open the form
		const addButton = screen.getByText("+ forms.quickAddCard.add");
		await user.click(addButton);

		// Upload an image
		const frontImageUpload = screen.getByText("Upload Front Image (Optional)");
		await user.click(frontImageUpload);

		// Remove the image
		const removeButton = screen.getByText("Remove Front Image (Optional)");
		await user.click(removeButton);

		// Cancel the form
		const cancelButton = screen.getByText("Cancel");
		await user.click(cancelButton);

		// Should not call cleanup since image was already removed
		expect(mockDeleteFile).not.toHaveBeenCalled();
		expect(mockOnCancel).toHaveBeenCalled();
	});
});
