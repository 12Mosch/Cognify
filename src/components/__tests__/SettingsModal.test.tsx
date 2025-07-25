import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { resetGestureTutorial } from "../../lib/gestureTutorialUtils";
import { showSuccessToast } from "../../lib/toast";
import SettingsModal from "../SettingsModal";

// Mock the child components
jest.mock("../PrivacySettings", () => {
	return jest.fn(({ embedded }) => (
		<div data-embedded={embedded} data-testid="privacy-settings">
			Privacy Settings
		</div>
	));
});

jest.mock("../FeatureFlagDemo", () => {
	return jest.fn(() => (
		<div data-testid="feature-flag-demo">Feature Flag Demo</div>
	));
});

// Mock the tutorial utils
jest.mock("../../lib/gestureTutorialUtils", () => ({
	resetGestureTutorial: jest.fn(),
}));

// Mock toast
jest.mock("../../lib/toast", () => ({
	showSuccessToast: jest.fn(),
}));

// Mock analytics
jest.mock("../../lib/analytics", () => ({
	usePrivacyCompliantAnalytics: () => ({
		grantConsent: jest.fn(),
		privacySettings: {
			analyticsConsent: "pending",
			functionalConsent: "pending",
			marketingConsent: "pending",
		},
		revokeConsent: jest.fn(),
	}),
}));

const mockResetGestureTutorial = jest.mocked(resetGestureTutorial);
const mockShowSuccessToast = jest.mocked(showSuccessToast);

// Mock window.confirm
const originalConfirm = window.confirm;

describe("SettingsModal", () => {
	const mockOnClose = jest.fn();
	const originalAddEventListener = document.addEventListener.bind(document);
	const originalRemoveEventListener =
		document.removeEventListener.bind(document);
	const mockAddEventListener = jest.fn();
	const mockRemoveEventListener = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		mockOnClose.mockClear();
		mockAddEventListener.mockClear();
		mockRemoveEventListener.mockClear();
		// Reset body overflow style
		document.body.style.overflow = "";
		// Mock event listeners
		document.addEventListener = mockAddEventListener;
		document.removeEventListener = mockRemoveEventListener;
		// Mock window.confirm
		window.confirm = jest.fn();
	});

	afterEach(() => {
		// Clean up any remaining event listeners
		document.body.style.overflow = "";
		// Restore original event listeners
		document.addEventListener = originalAddEventListener;
		document.removeEventListener = originalRemoveEventListener;
		// Restore window.confirm
		window.confirm = originalConfirm;
	});

	it("renders nothing when closed", () => {
		render(<SettingsModal isOpen={false} onClose={mockOnClose} />);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("renders modal with proper ARIA attributes when open", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		const dialog = screen.getByRole("dialog");
		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveAttribute("aria-modal", "true");

		// Get the title element and its ID
		const titleElement = screen.getByText("Settings");
		const titleId = titleElement.getAttribute("id");
		expect(titleId).toBeTruthy();

		// Check that the dialog is labeled by the title
		expect(dialog).toHaveAttribute("aria-labelledby", titleId);
	});

	it("prevents background scroll when open", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
		expect(document.body.style.overflow).toBe("hidden");
	});

	it("restores background scroll when closed", () => {
		const { rerender } = render(
			<SettingsModal isOpen={true} onClose={mockOnClose} />,
		);
		expect(document.body.style.overflow).toBe("hidden");

		rerender(<SettingsModal isOpen={false} onClose={mockOnClose} />);
		expect(document.body.style.overflow).toBe("");
	});

	it("closes modal when ESC key is pressed", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		// Get the keydown handler that was registered
		const keydownHandler = mockAddEventListener.mock.calls.find(
			(call) => call[0] === "keydown",
		)?.[1];

		expect(keydownHandler).toBeDefined();

		// Simulate ESC key press by calling the handler directly
		keydownHandler?.({ key: "Escape" });
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("closes modal when close button is clicked", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		const closeButton = screen.getByLabelText("Close settings");
		fireEvent.click(closeButton);
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("switches between Account and Security tabs", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		// Should start with Account tab active (Privacy Settings visible)
		expect(screen.getByTestId("privacy-settings")).toBeInTheDocument();
		expect(screen.queryByTestId("feature-flag-demo")).not.toBeInTheDocument();

		// Click Security tab - use role to be more specific and avoid SVG title
		const securityTab = screen.getByRole("button", { name: /security/i });
		fireEvent.click(securityTab);

		// Should now show Feature Flags
		expect(screen.queryByTestId("privacy-settings")).not.toBeInTheDocument();
		expect(screen.getByTestId("feature-flag-demo")).toBeInTheDocument();

		// Click Account tab again
		const accountTab = screen.getByRole("button", { name: /account/i });
		fireEvent.click(accountTab);

		// Should show Privacy Settings again
		expect(screen.getByTestId("privacy-settings")).toBeInTheDocument();
		expect(screen.queryByTestId("feature-flag-demo")).not.toBeInTheDocument();
	});

	it("passes embedded prop to PrivacySettings", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		const privacySettings = screen.getByTestId("privacy-settings");
		expect(privacySettings).toHaveAttribute("data-embedded", "true");
	});

	it("sets up focus management when opened", async () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		// Check that event listeners are set up for focus management
		await waitFor(() => {
			expect(mockAddEventListener).toHaveBeenCalledWith(
				"keydown",
				expect.any(Function),
			);
		});
	});

	it("sets up focus trap event listeners", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		// Check that event listeners are set up for focus trapping
		expect(mockAddEventListener).toHaveBeenCalledWith(
			"keydown",
			expect.any(Function),
		);
		// Should be called twice - once for ESC handler, once for focus trap
		expect(mockAddEventListener).toHaveBeenCalledTimes(2);
	});

	it("does not interfere with other key presses", () => {
		render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

		// Get the keydown handler that was registered
		const keydownHandler = mockAddEventListener.mock.calls.find(
			(call) => call[0] === "keydown",
		)?.[1];

		expect(keydownHandler).toBeDefined();

		// Press a non-ESC key
		keydownHandler?.({ key: "Enter" });
		expect(mockOnClose).not.toHaveBeenCalled();

		keydownHandler?.({ key: "Space" });
		expect(mockOnClose).not.toHaveBeenCalled();
	});

	describe("Tutorial Reset Functionality", () => {
		it("renders tutorial settings in account tab", () => {
			render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

			// Should be on account tab by default
			expect(screen.getByText("settings.tutorials.title")).toBeInTheDocument();
			expect(
				screen.getByText("settings.tutorials.resetAll"),
			).toBeInTheDocument();
			expect(
				screen.getByText("settings.tutorials.resetBasic"),
			).toBeInTheDocument();
			expect(
				screen.getByText("settings.tutorials.resetSpaced"),
			).toBeInTheDocument();
		});

		it("resets all tutorials when confirmed", async () => {
			(window.confirm as jest.Mock).mockReturnValue(true);

			render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

			const resetAllButton = screen.getByRole("button", { name: "Reset All" });
			fireEvent.click(resetAllButton);

			await waitFor(() => {
				expect(window.confirm).toHaveBeenCalledWith(
					"settings.tutorials.confirmReset",
				);
				expect(mockResetGestureTutorial).toHaveBeenCalledWith();
				expect(mockShowSuccessToast).toHaveBeenCalledWith(
					"settings.tutorials.resetAllSuccess",
				);
			});
		});

		it("resets basic tutorial when confirmed", async () => {
			(window.confirm as jest.Mock).mockReturnValue(true);

			render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

			// Get the first "Reset" button (basic mode)
			const resetButtons = screen.getAllByRole("button", { name: "Reset" });
			const resetBasicButton = resetButtons[0];
			fireEvent.click(resetBasicButton);

			await waitFor(() => {
				expect(window.confirm).toHaveBeenCalled();
				expect(mockResetGestureTutorial).toHaveBeenCalledWith("basic");
				expect(mockShowSuccessToast).toHaveBeenCalledWith(
					"settings.tutorials.resetBasicSuccess",
				);
			});
		});

		it("resets spaced repetition tutorial when confirmed", async () => {
			(window.confirm as jest.Mock).mockReturnValue(true);

			render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

			// Get the second "Reset" button (spaced repetition)
			const resetButtons = screen.getAllByRole("button", { name: "Reset" });
			const resetSpacedButton = resetButtons[1];
			fireEvent.click(resetSpacedButton);

			await waitFor(() => {
				expect(window.confirm).toHaveBeenCalled();
				expect(mockResetGestureTutorial).toHaveBeenCalledWith(
					"spaced-repetition",
				);
				expect(mockShowSuccessToast).toHaveBeenCalledWith(
					"settings.tutorials.resetSpacedSuccess",
				);
			});
		});

		it("does not reset tutorials when cancelled", async () => {
			(window.confirm as jest.Mock).mockReturnValue(false);

			render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

			const resetAllButton = screen.getByRole("button", { name: "Reset All" });
			fireEvent.click(resetAllButton);

			await waitFor(() => {
				expect(window.confirm).toHaveBeenCalled();
				expect(mockResetGestureTutorial).not.toHaveBeenCalled();
				expect(mockShowSuccessToast).not.toHaveBeenCalled();
			});
		});
	});
});
