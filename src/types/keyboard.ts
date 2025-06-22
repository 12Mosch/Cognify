/**
 * Keyboard shortcut types and utilities for the flashcard application
 */

export interface KeyboardShortcut {
	key: string;
	description: string;
	context?: "flip" | "navigation" | "rating" | "general";
}

export interface KeyboardShortcutGroup {
	title: string;
	shortcuts: readonly KeyboardShortcut[];
}

/**
 * Keyboard shortcuts for different study modes
 */
export const KEYBOARD_SHORTCUTS = {
	// Basic Study Session shortcuts
	BASIC_STUDY: [
		{ context: "navigation" as const, description: "Previous card", key: "←" },
		{ context: "navigation" as const, description: "Next card", key: "→" },
	],

	// Spaced Repetition shortcuts (only when card is flipped)
	SPACED_REPETITION: [
		{
			context: "rating" as const,
			description: "Again (when answer is shown)",
			key: "1",
		},
		{
			context: "rating" as const,
			description: "Hard (when answer is shown)",
			key: "2",
		},
		{
			context: "rating" as const,
			description: "Good (when answer is shown)",
			key: "3",
		},
		{
			context: "rating" as const,
			description: "Easy (when answer is shown)",
			key: "4",
		},
	],
	// Universal shortcuts (available in all study modes)
	UNIVERSAL: [
		{ context: "flip" as const, description: "Flip card", key: "Space" },
		{ context: "flip" as const, description: "Flip card", key: "Enter" },
		{
			context: "general" as const,
			description: "Show keyboard shortcuts help",
			key: "?",
		},
	],
} as const;

/**
 * Get keyboard shortcuts for a specific study mode
 */
export function getKeyboardShortcuts(
	mode: "basic" | "spaced-repetition",
): KeyboardShortcutGroup[] {
	const groups: KeyboardShortcutGroup[] = [
		{
			shortcuts: KEYBOARD_SHORTCUTS.UNIVERSAL,
			title: "Card Navigation",
		},
	];

	if (mode === "basic") {
		groups.push({
			shortcuts: KEYBOARD_SHORTCUTS.BASIC_STUDY,
			title: "Navigation",
		});
	} else if (mode === "spaced-repetition") {
		groups.push({
			shortcuts: KEYBOARD_SHORTCUTS.SPACED_REPETITION,
			title: "Rating (when answer is shown)",
		});
	}

	return groups;
}

/**
 * Check if a keyboard event matches a specific shortcut key
 */
export function isShortcutKey(
	event: KeyboardEvent,
	shortcutKey: string,
): boolean {
	// Handle special keys
	switch (shortcutKey) {
		case "Space":
			return event.code === "Space";
		case "Enter":
			return event.code === "Enter";
		case "←":
			return event.code === "ArrowLeft";
		case "→":
			return event.code === "ArrowRight";
		case "?":
			return event.key === "?"; // Handle ? key properly (shift is required to type ?)
		default:
			// Handle number keys and other regular keys
			return event.key === shortcutKey;
	}
}
