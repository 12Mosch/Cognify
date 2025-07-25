/**
 * Tests for KeyboardShortcutsModal component
 * These tests verify the keyboard shortcuts help modal works correctly
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { getKeyboardShortcuts } from "@/types/keyboard.ts";
import KeyboardShortcutsModal from "../KeyboardShortcutsModal";

const mockOnClose = jest.fn();

// Mock translation function for tests
const mockT = (key: string): string => {
	const translations: Record<string, string> = {
		"study.shortcuts.descriptions.againWhenAnswerShown":
			"Again (when answer is shown)",
		"study.shortcuts.descriptions.easyWhenAnswerShown":
			"Easy (when answer is shown)",
		"study.shortcuts.descriptions.flipCard": "Flip card",
		"study.shortcuts.descriptions.goodWhenAnswerShown":
			"Good (when answer is shown)",
		"study.shortcuts.descriptions.hardWhenAnswerShown":
			"Hard (when answer is shown)",
		"study.shortcuts.descriptions.nextCard": "Next card",
		"study.shortcuts.descriptions.previousCard": "Previous card",
		"study.shortcuts.descriptions.showKeyboardShortcutsHelp":
			"Show keyboard shortcuts help",
		"study.shortcuts.groups.cardNavigation": "Card Navigation",
		"study.shortcuts.groups.navigation": "Navigation",
		"study.shortcuts.groups.ratingWhenAnswerShown":
			"Rating (when answer is shown)",
	};
	return translations[key] || key;
};

describe("KeyboardShortcutsModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset body overflow style
		document.body.style.overflow = "unset";
	});

	afterEach(() => {
		// Clean up body overflow style
		document.body.style.overflow = "unset";
	});

	it("does not render when isOpen is false", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={false}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
	});

	it("renders modal when isOpen is true", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
		// Check for the specific paragraph with the study mode text
		expect(
			screen.getByText((_content, element) => {
				return (
					element?.tagName === "P" &&
					(element?.textContent?.includes(
						"Available shortcuts for Basic Study mode:",
					) ??
						false)
				);
			}),
		).toBeInTheDocument();
	});

	it("displays basic study shortcuts correctly", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		// Check for flip shortcuts - there are multiple "Flip card" entries, so use getAllByText
		expect(screen.getAllByText("Flip card")).toHaveLength(2);
		expect(screen.getByText("Space")).toBeInTheDocument();
		expect(screen.getByText("Enter")).toBeInTheDocument();

		// Check for navigation shortcuts
		expect(screen.getByText("Previous card")).toBeInTheDocument();
		expect(screen.getByText("Next card")).toBeInTheDocument();
		expect(screen.getByText("←")).toBeInTheDocument();
		expect(screen.getByText("→")).toBeInTheDocument();
	});

	it("displays spaced repetition shortcuts correctly", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("spaced-repetition", mockT)}
				studyMode="spaced-repetition"
			/>,
		);

		expect(
			screen.getByText((_content, element) => {
				return (
					element?.tagName === "P" &&
					(element?.textContent?.includes(
						"Available shortcuts for Spaced Repetition mode:",
					) ??
						false)
				);
			}),
		).toBeInTheDocument();

		// Check for rating shortcuts
		expect(
			screen.getByText("Again (when answer is shown)"),
		).toBeInTheDocument();
		expect(screen.getByText("Hard (when answer is shown)")).toBeInTheDocument();
		expect(screen.getByText("Good (when answer is shown)")).toBeInTheDocument();
		expect(screen.getByText("Easy (when answer is shown)")).toBeInTheDocument();

		// Check for number keys
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("3")).toBeInTheDocument();
		expect(screen.getByText("4")).toBeInTheDocument();
	});

	it("calls onClose when close button is clicked", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		const closeButton = screen.getByLabelText("Close shortcuts help");
		fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when backdrop is clicked", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		const backdrop = screen.getByTestId("modal-backdrop");
		fireEvent.click(backdrop);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("calls onClose when Escape key is pressed", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		fireEvent.keyDown(document, { key: "Escape" });

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("prevents body scroll when modal is open", () => {
		const { rerender } = render(
			<KeyboardShortcutsModal
				isOpen={false}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		expect(document.body.style.overflow).toBe("unset");

		rerender(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		expect(document.body.style.overflow).toBe("hidden");
	});

	it("has proper accessibility attributes", () => {
		render(
			<KeyboardShortcutsModal
				isOpen={true}
				onClose={mockOnClose}
				shortcuts={getKeyboardShortcuts("basic", mockT)}
				studyMode="basic"
			/>,
		);

		const modal = screen.getByRole("dialog");
		expect(modal).toHaveAttribute("aria-modal", "true");

		// Get the title element and its ID
		const title = screen.getByText("Keyboard Shortcuts");
		const titleId = title.getAttribute("id");

		// Verify the title has an ID (generated by useId())
		expect(titleId).toBeTruthy();

		// Verify the modal is properly labeled by the title
		expect(modal).toHaveAttribute("aria-labelledby", titleId);
	});
});
