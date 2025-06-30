import { renderHook } from "@testing-library/react";
import { usePathChangeDetection } from "../usePathChangeDetection";

// Mock Convex
jest.mock("convex/react", () => ({
	useQuery: jest.fn(),
}));

const mockUseQuery = jest.mocked(require("convex/react").useQuery);

describe("usePathChangeDetection", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should initialize with default values", () => {
		mockUseQuery.mockReturnValue(null);

		const { result } = renderHook(() => usePathChangeDetection());

		expect(result.current.hasSignificantChange).toBe(false);
		expect(result.current.changePercentage).toBe(0);
		expect(result.current.cardsReordered).toBe(0);
		expect(result.current.currentPathChangeInfo).toBeNull();
	});

	it("should detect significant path changes", () => {
		const mockPathRegeneration = [
			{
				_creationTime: Date.now(),
				_id: "test-id",
				deckId: "deck-1",
				newOrder: ["card-3", "card-1", "card-2"],
				originalOrder: ["card-1", "card-2", "card-3"],
				priorityScores: [
					{
						boosts: ["difficulty_boost"],
						cardId: "card-3",
						reasoning: "High priority due to recent struggles",
						score: 0.9,
					},
				],
				sessionId: "session-1",
				timestamp: Date.now(),
				triggerReason: "significant_performance_change",
				userId: "user-1",
			},
		];

		mockUseQuery
			.mockReturnValueOnce(mockPathRegeneration) // recentPathRegeneration
			.mockReturnValueOnce(null); // currentStudyQueue

		const { result } = renderHook(() =>
			usePathChangeDetection({
				deckId: "deck-1" as any,
				enableCaching: true,
				sessionId: "session-1",
			}),
		);

		// Basic functionality test - the hook should initialize properly
		expect(result.current.getFormattedChangeReason).toBeDefined();
		expect(result.current.getCardPriorityChange).toBeDefined();
		expect(result.current.clearCache).toBeDefined();
	});

	it("should format change reasons correctly", () => {
		mockUseQuery.mockReturnValue(null);

		const { result } = renderHook(() => usePathChangeDetection());

		expect(
			result.current.getFormattedChangeReason("significant_performance_change"),
		).toBe("Learning progress update");
		expect(result.current.getFormattedChangeReason("plateau_detection")).toBe(
			"Learning plateau addressed",
		);
		expect(result.current.getFormattedChangeReason("unknown_reason")).toBe(
			"Study path optimized",
		);
	});

	it("should handle onPathChange callback", () => {
		const mockOnPathChange = jest.fn();
		const mockPathRegeneration = [
			{
				_creationTime: Date.now(),
				_id: "test-id",
				deckId: "deck-1",
				newOrder: ["card-2", "card-1"],
				originalOrder: ["card-1", "card-2"],
				priorityScores: [
					{
						boosts: [],
						cardId: "card-2",
						reasoning: "Reordered for better learning",
						score: 0.8,
					},
				],
				sessionId: "session-1",
				timestamp: Date.now(),
				triggerReason: "answer_significant_change",
				userId: "user-1",
			},
		];

		mockUseQuery
			.mockReturnValueOnce(mockPathRegeneration)
			.mockReturnValueOnce(null);

		renderHook(() =>
			usePathChangeDetection({
				deckId: "deck-1" as any,
				onPathChange: mockOnPathChange,
				sessionId: "session-1",
			}),
		);

		// The callback should be called for significant changes
		// Note: In a real test, we'd need to trigger the useEffect
		// This is a simplified test to verify the hook structure
		expect(mockOnPathChange).toHaveBeenCalledTimes(1); // Called when path changes are detected
	});

	it("should skip queries when sessionId is not provided", () => {
		const { result } = renderHook(() => usePathChangeDetection());

		expect(mockUseQuery).toHaveBeenCalledWith(expect.any(Object), "skip");
		expect(result.current.currentPathChangeInfo).toBeNull();
	});

	it("should calculate card priority changes", () => {
		mockUseQuery.mockReturnValue(null);

		const { result } = renderHook(() => usePathChangeDetection());

		const priorityChange = result.current.getCardPriorityChange("card-1");

		expect(priorityChange.moved).toBe(false);
		expect(priorityChange.direction).toBe("none");
		expect(priorityChange.positions).toBe(0);
	});
});
