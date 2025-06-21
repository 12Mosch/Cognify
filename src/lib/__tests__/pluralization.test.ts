import i18n from "../../test-i18n";

describe("Pluralization Support", () => {
	beforeAll(async () => {
		// Ensure i18n is initialized
		await i18n.init();
	});

	describe("Card Count Pluralization", () => {
		it("should use singular form for 1 card", () => {
			const result = i18n.t("deck.cardCount", { count: 1 });
			expect(result).toBe("1 card");
		});

		it("should use plural form for 0 cards", () => {
			const result = i18n.t("deck.cardCount", { count: 0 });
			expect(result).toBe("0 cards");
		});

		it("should use plural form for 2 cards", () => {
			const result = i18n.t("deck.cardCount", { count: 2 });
			expect(result).toBe("2 cards");
		});

		it("should use plural form for 32 cards", () => {
			const result = i18n.t("deck.cardCount", { count: 32 });
			expect(result).toBe("32 cards");
		});

		it("should use plural form for 100 cards", () => {
			const result = i18n.t("deck.cardCount", { count: 100 });
			expect(result).toBe("100 cards");
		});
	});

	describe("Dashboard Subtitle Pluralization", () => {
		it("should use singular form for 1 deck", () => {
			const result = i18n.t("dashboard.subtitle.withDecks", { count: 1 });
			expect(result).toBe("1 deck");
		});

		it("should use plural form for 0 decks", () => {
			const result = i18n.t("dashboard.subtitle.withDecks", { count: 0 });
			expect(result).toBe("0 decks");
		});

		it("should use plural form for 3 decks", () => {
			const result = i18n.t("dashboard.subtitle.withDecks", { count: 3 });
			expect(result).toBe("3 decks");
		});
	});

	describe("Study Session Completion Pluralization", () => {
		it("should use singular form for 1 card reviewed", () => {
			const result = i18n.t("notifications.studySessionCompletedWithCount", {
				count: 1,
			});
			expect(result).toBe("Study session complete! Reviewed 1 card.");
		});

		it("should use plural form for 0 cards reviewed", () => {
			const result = i18n.t("notifications.studySessionCompletedWithCount", {
				count: 0,
			});
			expect(result).toBe("Study session complete! Reviewed 0 cards.");
		});

		it("should use plural form for 5 cards reviewed", () => {
			const result = i18n.t("notifications.studySessionCompletedWithCount", {
				count: 5,
			});
			expect(result).toBe("Study session complete! Reviewed 5 cards.");
		});
	});

	describe("Streak Days Pluralization", () => {
		it("should use singular form for 1 day", () => {
			const result = i18n.t("streak.days", { count: 1 });
			expect(result).toBe("1 day");
		});

		it("should use plural form for 0 days", () => {
			const result = i18n.t("streak.days", { count: 0 });
			expect(result).toBe("0 days");
		});

		it("should use plural form for 7 days", () => {
			const result = i18n.t("streak.days", { count: 7 });
			expect(result).toBe("7 days");
		});
	});

	describe("Study Session Stats Pluralization", () => {
		it("should use singular form for 1 card reviewed", () => {
			const result = i18n.t("study.allCaughtUp.sessionStats", { count: 1 });
			expect(result).toBe(
				"Great work! You've reviewed 1 card in this session.",
			);
		});

		it("should use plural form for 0 cards reviewed", () => {
			const result = i18n.t("study.allCaughtUp.sessionStats", { count: 0 });
			expect(result).toBe(
				"Great work! You've reviewed 0 cards in this session.",
			);
		});

		it("should use plural form for 5 cards reviewed", () => {
			const result = i18n.t("study.allCaughtUp.sessionStats", { count: 5 });
			expect(result).toBe(
				"Great work! You've reviewed 5 cards in this session.",
			);
		});
	});

	describe("Edge Cases", () => {
		it("should handle negative numbers (i18next treats -1 as singular)", () => {
			const result = i18n.t("deck.cardCount", { count: -1 });
			// In i18next, -1 is treated as singular (like 1), not plural
			expect(result).toBe("-1 card");
		});

		it("should handle decimal numbers (should use plural)", () => {
			const result = i18n.t("deck.cardCount", { count: 1.5 });
			expect(result).toBe("1.5 cards");
		});

		it("should handle undefined count (should fallback gracefully)", () => {
			const result = i18n.t("deck.cardCount", { count: undefined });
			// i18next should handle this gracefully, likely showing the key or a fallback
			expect(typeof result).toBe("string");
		});
	});
});
