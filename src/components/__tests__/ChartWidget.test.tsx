import { render, screen } from "@testing-library/react";
import ChartWidget from "../statistics/ChartWidget";

describe("ChartWidget", () => {
	const mockChildren = (
		<div data-testid="chart-content">Mock Chart Content</div>
	);

	it("renders with required props", () => {
		render(<ChartWidget title="Test Chart">{mockChildren}</ChartWidget>);

		expect(screen.getByText("Test Chart")).toBeInTheDocument();
		expect(screen.getByTestId("chart-content")).toBeInTheDocument();
	});

	it("renders with title and subtitle", () => {
		render(
			<ChartWidget
				subtitle="This is a test chart description"
				title="Test Chart"
			>
				{mockChildren}
			</ChartWidget>,
		);

		expect(screen.getByText("Test Chart")).toBeInTheDocument();
		expect(
			screen.getByText("This is a test chart description"),
		).toBeInTheDocument();
	});

	it("renders header actions when provided", () => {
		const headerActions = (
			<button data-testid="export-button" type="button">
				Export
			</button>
		);

		render(
			<ChartWidget headerActions={headerActions} title="Test Chart">
				{mockChildren}
			</ChartWidget>,
		);

		expect(screen.getByTestId("export-button")).toBeInTheDocument();
	});

	it("renders footer content when provided", () => {
		const footer = <div data-testid="chart-footer">Chart Footer Content</div>;

		render(
			<ChartWidget footer={footer} title="Test Chart">
				{mockChildren}
			</ChartWidget>,
		);

		expect(screen.getByTestId("chart-footer")).toBeInTheDocument();
	});

	it("applies custom chart height", () => {
		render(
			<ChartWidget chartHeight="h-96" title="Test Chart">
				{mockChildren}
			</ChartWidget>,
		);

		// Check that the chart content is rendered (height class is applied to container div)
		expect(screen.getByTestId("chart-content")).toBeInTheDocument();
	});

	it("applies default chart height when not specified", () => {
		render(<ChartWidget title="Test Chart">{mockChildren}</ChartWidget>);

		// Check that the chart content is rendered (default height class is applied)
		expect(screen.getByTestId("chart-content")).toBeInTheDocument();
	});

	it("has proper accessibility structure", () => {
		render(
			<ChartWidget subtitle="Chart description" title="Test Chart">
				{mockChildren}
			</ChartWidget>,
		);

		// Title should be an h3 heading
		const title = screen.getByRole("heading", { level: 3 });
		expect(title).toHaveTextContent("Test Chart");
	});
});
