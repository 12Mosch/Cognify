/**
 * Tests for PathCustomizationPanel component
 * These tests verify the path customization interface works correctly
 */

import { fireEvent, render, screen } from "@testing-library/react";
import PathCustomizationPanel, {
	type PathCustomizationOptions,
} from "../PathCustomizationPanel";

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, defaultValue?: string) => defaultValue || key,
	}),
}));

const mockOnOptionsChange = jest.fn();

const defaultProps = {
	onOptionsChange: mockOnOptionsChange,
	pathType: "difficulty_progression",
};

describe("PathCustomizationPanel", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders customization interface", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		expect(
			screen.getByText("Customize Your Learning Path"),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Adjust these settings to personalize your learning experience.",
			),
		).toBeInTheDocument();
	});

	it("shows path-specific options for difficulty progression", () => {
		render(
			<PathCustomizationPanel
				{...defaultProps}
				pathType="difficulty_progression"
			/>,
		);

		expect(screen.getByText("Difficulty Progression")).toBeInTheDocument();
		expect(screen.getByText("Session Length")).toBeInTheDocument();
		expect(screen.getByText("Learning Focus")).toBeInTheDocument();
	});

	it("shows path-specific options for review focused", () => {
		render(
			<PathCustomizationPanel {...defaultProps} pathType="review_focused" />,
		);

		expect(screen.getByText("Review Frequency")).toBeInTheDocument();
		expect(screen.getByText("Session Length")).toBeInTheDocument();
		expect(screen.getByText("Personalization")).toBeInTheDocument();
	});

	it("shows path-specific options for spaced repetition optimized", () => {
		render(
			<PathCustomizationPanel
				{...defaultProps}
				pathType="spaced_repetition_optimized"
			/>,
		);

		expect(screen.getByText("Review Frequency")).toBeInTheDocument();
		expect(screen.getByText("Session Length")).toBeInTheDocument();
		expect(screen.getByText("Personalization")).toBeInTheDocument();
	});

	it("calls onOptionsChange when option is selected", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const fastOption = screen.getByRole("radio", { name: /Accelerated/ });
		fireEvent.click(fastOption);

		expect(mockOnOptionsChange).toHaveBeenCalledWith(
			expect.objectContaining({
				difficultyProgressionSpeed: "fast",
			}),
		);
	});

	it("applies initial options correctly", () => {
		const initialOptions: Partial<PathCustomizationOptions> = {
			difficultyProgressionSpeed: "fast",
			sessionLength: "long",
		};

		render(
			<PathCustomizationPanel
				{...defaultProps}
				initialOptions={initialOptions}
			/>,
		);

		const fastOption = screen.getByRole("radio", { name: /Accelerated/ });
		const longOption = screen.getByRole("radio", { name: /Long/ });

		expect(fastOption).toBeChecked();
		expect(longOption).toBeChecked();
	});

	it("renders quick presets", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		expect(screen.getByText("Quick Presets")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Beginner" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Standard" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Intensive" }),
		).toBeInTheDocument();
	});

	it("applies beginner preset correctly", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const beginnerButton = screen.getByRole("button", { name: "Beginner" });
		fireEvent.click(beginnerButton);

		expect(mockOnOptionsChange).toHaveBeenCalledWith({
			difficultyProgressionSpeed: "slow",
			focusMode: "breadth",
			personalizationLevel: "moderate",
			reviewFrequency: "conservative",
			sessionLength: "short",
		});
	});

	it("applies standard preset correctly", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const standardButton = screen.getByRole("button", { name: "Standard" });
		fireEvent.click(standardButton);

		expect(mockOnOptionsChange).toHaveBeenCalledWith({
			difficultyProgressionSpeed: "normal",
			focusMode: "balanced",
			personalizationLevel: "moderate",
			reviewFrequency: "balanced",
			sessionLength: "medium",
		});
	});

	it("applies intensive preset correctly", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const intensiveButton = screen.getByRole("button", { name: "Intensive" });
		fireEvent.click(intensiveButton);

		expect(mockOnOptionsChange).toHaveBeenCalledWith({
			difficultyProgressionSpeed: "fast",
			focusMode: "depth",
			personalizationLevel: "maximum",
			reviewFrequency: "aggressive",
			sessionLength: "long",
		});
	});

	it("shows option descriptions", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		expect(
			screen.getByText("Slower progression with more practice"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Balanced difficulty progression"),
		).toBeInTheDocument();
		expect(
			screen.getByText("Faster progression for experienced learners"),
		).toBeInTheDocument();
	});

	it("handles session length options", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const shortOption = screen.getByRole("radio", { name: /Short/ });
		fireEvent.click(shortOption);

		expect(mockOnOptionsChange).toHaveBeenCalledWith(
			expect.objectContaining({
				sessionLength: "short",
			}),
		);
	});

	it("handles focus mode options for applicable paths", () => {
		render(
			<PathCustomizationPanel
				{...defaultProps}
				pathType="difficulty_progression"
			/>,
		);

		const depthOption = screen.getByRole("radio", { name: /Depth/ });
		fireEvent.click(depthOption);

		expect(mockOnOptionsChange).toHaveBeenCalledWith(
			expect.objectContaining({
				focusMode: "depth",
			}),
		);
	});

	it("shows correct options for domain focused path", () => {
		render(
			<PathCustomizationPanel {...defaultProps} pathType="domain_focused" />,
		);

		expect(screen.getByText("Session Length")).toBeInTheDocument();
		expect(screen.getByText("Learning Focus")).toBeInTheDocument();
		expect(screen.getByText("Personalization")).toBeInTheDocument();
	});

	it("shows correct options for prerequisite order path", () => {
		render(
			<PathCustomizationPanel
				{...defaultProps}
				pathType="prerequisite_order"
			/>,
		);

		expect(screen.getByText("Difficulty Progression")).toBeInTheDocument();
		expect(screen.getByText("Session Length")).toBeInTheDocument();
		expect(screen.getByText("Learning Focus")).toBeInTheDocument();
	});

	it("maintains state when switching between options", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		// Select fast progression
		const fastOption = screen.getByRole("radio", { name: /Accelerated/ });
		fireEvent.click(fastOption);

		// Select long session
		const longOption = screen.getByRole("radio", { name: /Long/ });
		fireEvent.click(longOption);

		// Both should be selected
		expect(fastOption).toBeChecked();
		expect(longOption).toBeChecked();

		// Should have called onOptionsChange twice
		expect(mockOnOptionsChange).toHaveBeenCalledTimes(2);
	});

	it("has proper accessibility attributes", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const radioButtons = screen.getAllByRole("radio");
		expect(radioButtons.length).toBeGreaterThan(0);

		radioButtons.forEach((radio) => {
			expect(radio).toHaveAttribute("name");
			expect(radio).toHaveAttribute("type", "radio");
		});
	});

	it("groups radio buttons correctly", () => {
		render(<PathCustomizationPanel {...defaultProps} />);

		const allRadios = screen.getAllByRole("radio");

		// Find radios by their name attributes
		const difficultyRadios = allRadios.filter(
			(radio) => radio.getAttribute("name") === "difficultyProgressionSpeed",
		);
		const sessionRadios = allRadios.filter(
			(radio) => radio.getAttribute("name") === "sessionLength",
		);

		// Each group should have the same name attribute
		expect(difficultyRadios.length).toBeGreaterThan(0);
		expect(sessionRadios.length).toBeGreaterThan(0);

		difficultyRadios.forEach((radio) => {
			expect(radio).toHaveAttribute("name", "difficultyProgressionSpeed");
		});

		sessionRadios.forEach((radio) => {
			expect(radio).toHaveAttribute("name", "sessionLength");
		});
	});
});
