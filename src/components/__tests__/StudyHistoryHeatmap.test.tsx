import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import StudyHistoryHeatmap from "../StudyHistoryHeatmap";

// Mock the useQuery hook
jest.mock("convex/react", () => ({
	...jest.requireActual("convex/react"),
	useQuery: jest.fn(),
}));

import { useQuery } from "convex/react";

const mockUseQuery = useQuery as jest.Mock;

// Mock the heatmap utilities
jest.mock("../../lib/heatmapUtils", () => ({
	calculateHeatmapStats: jest.fn(),
	formatTooltipContent: jest.fn(),
	generateHeatmapGrid: jest.fn(),
	getActivityLevelClasses: jest.fn(),
	getDayLabels: jest.fn(),
}));

import {
	calculateHeatmapStats,
	formatTooltipContent,
	generateHeatmapGrid,
	getActivityLevelClasses,
	getDayLabels,
} from "@/lib/heatmapUtils.ts";

const mockGenerateHeatmapGrid = generateHeatmapGrid as jest.Mock;
const mockGetActivityLevelClasses = getActivityLevelClasses as jest.Mock;
const mockFormatTooltipContent = formatTooltipContent as jest.Mock;
const mockGetDayLabels = getDayLabels as jest.Mock;
const mockCalculateHeatmapStats = calculateHeatmapStats as jest.Mock;

describe("StudyHistoryHeatmap", () => {
	const mockConvexClient = new ConvexReactClient("https://test.convex.cloud");

	const mockStudyData = [
		{
			cardsStudied: 5,
			date: "2024-01-15",
			sessionCount: 1,
			totalDuration: 300000,
		},
		{
			cardsStudied: 8,
			date: "2024-01-16",
			sessionCount: 2,
			totalDuration: 450000,
		},
		{ cardsStudied: 0, date: "2024-01-17", sessionCount: 0 },
	];

	const mockHeatmapData = {
		endDate: new Date("2024-12-31"),
		months: [{ name: "Jan", weekSpan: 4, weekStart: 0 }],
		startDate: new Date("2024-01-01"),
		totalDays: 365,
		weeks: [
			{
				days: [
					{
						cardsStudied: 5,
						date: "2024-01-15",
						dayIndex: 1,
						dayOfWeek: 1,
						level: 2 as const,
						sessionCount: 1,
						totalDuration: 300000,
						weekIndex: 0,
					},
					{
						cardsStudied: 8,
						date: "2024-01-16",
						dayIndex: 2,
						dayOfWeek: 2,
						level: 2 as const,
						sessionCount: 2,
						totalDuration: 450000,
						weekIndex: 0,
					},
				],
				weekIndex: 0,
			},
		],
	};

	const mockStats = {
		activeDays: 2,
		averageCardsPerActiveDay: 7,
		maxCardsInDay: 8,
		studyRate: 55,
		totalCards: 13,
		totalSessions: 3,
		totalTime: 750000,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup default mock implementations
		mockGetDayLabels.mockReturnValue(["S", "M", "T", "W", "T", "F", "S"]);
		mockGenerateHeatmapGrid.mockReturnValue(mockHeatmapData);
		mockCalculateHeatmapStats.mockReturnValue(mockStats);
		mockGetActivityLevelClasses.mockReturnValue("bg-blue-300 border-blue-400");
		mockFormatTooltipContent.mockReturnValue(
			"5 cards studied on Mon, Jan 15, 2024",
		);
	});

	const renderComponent = () => {
		return render(
			<ConvexProvider client={mockConvexClient}>
				<StudyHistoryHeatmap />
			</ConvexProvider>,
		);
	};

	it("shows loading skeleton when data is undefined", () => {
		mockUseQuery.mockReturnValue(undefined);

		renderComponent();

		expect(screen.getByRole("status")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Loading study history heatmap"),
		).toBeInTheDocument();
	});

	it("renders heatmap with study data", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(
				screen.getByText("2 days of study activity in the last year"),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Study Activity")).toBeInTheDocument();

		// Check that utility functions were called
		expect(mockGenerateHeatmapGrid).toHaveBeenCalledWith(mockStudyData);
		expect(mockCalculateHeatmapStats).toHaveBeenCalledWith(mockHeatmapData);
	});

	it("displays month labels correctly", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getByText("Jan")).toBeInTheDocument();
		});
	});

	it("displays day labels correctly", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			// Day labels are only shown for odd indices (M, W, F, S)
			expect(mockGetDayLabels).toHaveBeenCalled();
		});
	});

	it("renders heatmap squares with correct accessibility attributes", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			const gridCells = screen.getAllByRole("gridcell");
			expect(gridCells.length).toBeGreaterThan(0);
		});

		const gridCells = screen.getAllByRole("gridcell");
		// Check first grid cell has proper attributes
		expect(gridCells[0]).toHaveAttribute("aria-label");
		expect(gridCells[0]).toHaveAttribute("tabindex", "0");
	});

	it("displays summary statistics correctly", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getByText("13")).toBeInTheDocument(); // totalCards
		});

		expect(screen.getByText("Cards studied")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument(); // activeDays
		expect(screen.getByText("Active days")).toBeInTheDocument();
		expect(screen.getByText("8")).toBeInTheDocument(); // maxCardsInDay
		expect(screen.getByText("Best day")).toBeInTheDocument();
		expect(screen.getByText("55%")).toBeInTheDocument(); // studyRate
		expect(screen.getByText("Study rate")).toBeInTheDocument();
	});

	it("shows tooltip on hover", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getAllByRole("gridcell")).toHaveLength(2);
		});

		const gridCells = screen.getAllByRole("gridcell");
		fireEvent.mouseEnter(gridCells[0]);

		expect(
			screen.getByText("5 cards studied on Mon, Jan 15, 2024"),
		).toBeInTheDocument();
	});

	it("hides tooltip on mouse leave", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getAllByRole("gridcell")).toHaveLength(2);
		});

		const gridCells = screen.getAllByRole("gridcell");

		// Show tooltip
		fireEvent.mouseEnter(gridCells[0]);
		expect(
			screen.getByText("5 cards studied on Mon, Jan 15, 2024"),
		).toBeInTheDocument();

		// Hide tooltip
		fireEvent.mouseLeave(gridCells[0]);
		expect(
			screen.queryByText("5 cards studied on Mon, Jan 15, 2024"),
		).not.toBeInTheDocument();
	});

	it("shows tooltip on keyboard interaction", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getAllByRole("gridcell")).toHaveLength(2);
		});

		const gridCells = screen.getAllByRole("gridcell");

		// Focus and press Enter
		act(() => {
			gridCells[0].focus();
		});
		fireEvent.keyDown(gridCells[0], { key: "Enter" });

		await waitFor(() => {
			expect(
				screen.getByText("5 cards studied on Mon, Jan 15, 2024"),
			).toBeInTheDocument();
		});
	});

	it("shows tooltip on Space key press", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getAllByRole("gridcell")).toHaveLength(2);
		});

		const gridCells = screen.getAllByRole("gridcell");

		// Focus and press Space
		act(() => {
			gridCells[0].focus();
		});
		fireEvent.keyDown(gridCells[0], { key: " " });

		await waitFor(() => {
			expect(
				screen.getByText("5 cards studied on Mon, Jan 15, 2024"),
			).toBeInTheDocument();
		});
	});

	it("renders activity level legend", async () => {
		mockUseQuery.mockReturnValue(mockStudyData);

		renderComponent();

		await waitFor(() => {
			expect(screen.getByText("Less")).toBeInTheDocument();
		});

		expect(screen.getByText("More")).toBeInTheDocument();

		// Check that legend squares are rendered with proper titles
		const legendSquares = screen.getAllByTitle(/Activity level \d/);
		expect(legendSquares).toHaveLength(5); // Levels 0-4
	});

	it("handles empty study data gracefully", async () => {
		mockUseQuery.mockReturnValue([]);

		const emptyStats = {
			activeDays: 0,
			averageCardsPerActiveDay: 0,
			maxCardsInDay: 0,
			studyRate: 0,
			totalCards: 0,
			totalSessions: 0,
			totalTime: 0,
		};

		mockCalculateHeatmapStats.mockReturnValue(emptyStats);

		renderComponent();

		// Wait for the main text to appear
		await waitFor(() => {
			expect(
				screen.getByText("0 days of study activity in the last year"),
			).toBeInTheDocument();
		});

		// Check that all statistics sections are present
		expect(screen.getByText("Cards studied")).toBeInTheDocument();
		expect(screen.getByText("Active days")).toBeInTheDocument();
		expect(screen.getByText("Best day")).toBeInTheDocument();
		expect(screen.getByText("Study rate")).toBeInTheDocument();
	});
});
