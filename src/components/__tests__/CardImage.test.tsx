import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CardImage } from "../CardImage";

describe("CardImage", () => {
	const defaultProps = {
		alt: "Test image",
		className: "test-class",
		src: "https://example.com/image.jpg",
	};

	it("renders image with correct attributes", () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
		expect(image).toHaveClass("test-class");
	});

	it("shows loading state initially", () => {
		render(<CardImage {...defaultProps} />);

		expect(screen.getByText("Loading...")).toBeInTheDocument();

		const image = screen.getByAltText("Test image");
		expect(image).toHaveClass("opacity-0");
	});

	it("hides loading state and shows image when loaded", async () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");

		// Simulate image load
		fireEvent.load(image);

		await waitFor(() => {
			expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
		});

		expect(image).toHaveClass("opacity-100");
	});

	it("shows error fallback when image fails to load", async () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");

		// Simulate image error
		fireEvent.error(image);

		await waitFor(() => {
			expect(screen.getByText("Image unavailable")).toBeInTheDocument();
		});

		expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
		expect(screen.queryByAltText("Test image")).not.toBeInTheDocument();
	});

	it("applies fallback className to error state", async () => {
		render(<CardImage {...defaultProps} fallbackClassName="fallback-class" />);

		const image = screen.getByAltText("Test image");
		fireEvent.error(image);

		await waitFor(() => {
			const fallbackContainer = screen
				.getByText("Image unavailable")
				.closest("div")?.parentElement;
			expect(fallbackContainer).toHaveClass("fallback-class");
		});
	});

	it("shows error icon in fallback state", async () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");
		fireEvent.error(image);

		await waitFor(() => {
			const errorIcon = screen.getByTitle("Image failed to load");
			expect(errorIcon).toBeInTheDocument();
		});
	});

	it("handles multiple load/error events correctly", async () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");

		// First, trigger error
		fireEvent.error(image);

		await waitFor(() => {
			expect(screen.getByText("Image unavailable")).toBeInTheDocument();
		});

		// Then trigger load (shouldn't change anything since error occurred)
		fireEvent.load(image);

		// Should still show error state
		expect(screen.getByText("Image unavailable")).toBeInTheDocument();
	});

	it("resets state when src changes", async () => {
		const { rerender } = render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");
		fireEvent.error(image);

		// Change src
		rerender(
			<CardImage {...defaultProps} src="https://example.com/new-image.jpg" />,
		);

		// Should show loading state again
		await waitFor(() => {
			expect(screen.getByText("Loading...")).toBeInTheDocument();
		});
		expect(screen.queryByText("Image unavailable")).not.toBeInTheDocument();
	});

	it("applies transition classes correctly", () => {
		render(<CardImage {...defaultProps} />);

		const image = screen.getByAltText("Test image");
		expect(image).toHaveClass("transition-opacity", "duration-200");
	});
});
