import { getTimeSlot, TimeSlot } from "../scheduling";

describe("getTimeSlot", () => {
	describe("early_morning slot (5-8 hours)", () => {
		it('returns "early_morning" for hours 5-8', () => {
			expect(getTimeSlot(5)).toBe("early_morning");
			expect(getTimeSlot(6)).toBe("early_morning");
			expect(getTimeSlot(7)).toBe("early_morning");
			expect(getTimeSlot(8)).toBe("early_morning");
		});
	});

	describe("morning slot (9-12 hours)", () => {
		it('returns "morning" for hours 9-12', () => {
			expect(getTimeSlot(9)).toBe("morning");
			expect(getTimeSlot(10)).toBe("morning");
			expect(getTimeSlot(11)).toBe("morning");
			expect(getTimeSlot(12)).toBe("morning");
		});
	});

	describe("afternoon slot (13-16 hours)", () => {
		it('returns "afternoon" for hours 13-16', () => {
			expect(getTimeSlot(13)).toBe("afternoon");
			expect(getTimeSlot(14)).toBe("afternoon");
			expect(getTimeSlot(15)).toBe("afternoon");
			expect(getTimeSlot(16)).toBe("afternoon");
		});
	});

	describe("evening slot (17-20 hours)", () => {
		it('returns "evening" for hours 17-20', () => {
			expect(getTimeSlot(17)).toBe("evening");
			expect(getTimeSlot(18)).toBe("evening");
			expect(getTimeSlot(19)).toBe("evening");
			expect(getTimeSlot(20)).toBe("evening");
		});
	});

	describe("night slot (21-23 hours)", () => {
		it('returns "night" for hours 21-23', () => {
			expect(getTimeSlot(21)).toBe("night");
			expect(getTimeSlot(22)).toBe("night");
			expect(getTimeSlot(23)).toBe("night");
		});
	});

	describe("late_night slot (0-4 hours)", () => {
		it('returns "late_night" for hours 0-4', () => {
			expect(getTimeSlot(0)).toBe("late_night");
			expect(getTimeSlot(1)).toBe("late_night");
			expect(getTimeSlot(2)).toBe("late_night");
			expect(getTimeSlot(3)).toBe("late_night");
			expect(getTimeSlot(4)).toBe("late_night");
		});
	});

	describe("edge cases", () => {
		it("handles boundary values correctly", () => {
			// Test boundaries between slots
			expect(getTimeSlot(4)).toBe("late_night");
			expect(getTimeSlot(5)).toBe("early_morning");
			expect(getTimeSlot(8)).toBe("early_morning");
			expect(getTimeSlot(9)).toBe("morning");
			expect(getTimeSlot(12)).toBe("morning");
			expect(getTimeSlot(13)).toBe("afternoon");
			expect(getTimeSlot(16)).toBe("afternoon");
			expect(getTimeSlot(17)).toBe("evening");
			expect(getTimeSlot(20)).toBe("evening");
			expect(getTimeSlot(21)).toBe("night");
			expect(getTimeSlot(23)).toBe("night");
		});
	});

	describe("type safety", () => {
		it("returns valid TimeSlot values", () => {
			const validTimeSlots: TimeSlot[] = [
				"early_morning",
				"morning",
				"afternoon",
				"evening",
				"night",
				"late_night",
			];

			// Test all hours of the day
			for (let hour = 0; hour < 24; hour++) {
				const result = getTimeSlot(hour);
				expect(validTimeSlots).toContain(result);
			}
		});
	});
});
