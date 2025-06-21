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
	// Universal shortcuts (available in all study modes)
	UNIVERSAL: [
		{ key: "Space", description: "Flip card", context: "flip" as const },
		{ key: "Enter", description: "Flip card", context: "flip" as const },
		{
			key: "?",
			description: "Show keyboard shortcuts help",
			context: "general" as const,
		},
	],

	// Basic Study Session shortcuts
	BASIC_STUDY: [
		{ key: "←", description: "Previous card", context: "navigation" as const },
		{ key: "→", description: "Next card", context: "navigation" as const },
	],

	// Spaced Repetition shortcuts (only when card is flipped)
	SPACED_REPETITION: [
		{
			key: "1",
			description: "Again (when answer is shown)",
			context: "rating" as const,
		},
		{
			key: "2",
			description: "Hard (when answer is shown)",
			context: "rating" as const,
		},
		{
			key: "3",
			description: "Good (when answer is shown)",
			context: "rating" as const,
		},
		{
			key: "4",
			description: "Easy (when answer is shown)",
			context: "rating" as const,
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
			title: "Card Navigation",
			shortcuts: KEYBOARD_SHORTCUTS.UNIVERSAL,
		},
	];

	if (mode === "basic") {
		groups.push({
			title: "Navigation",
			shortcuts: KEYBOARD_SHORTCUTS.BASIC_STUDY,
		});
	} else if (mode === "spaced-repetition") {
		groups.push({
			title: "Rating (when answer is shown)",
			shortcuts: KEYBOARD_SHORTCUTS.SPACED_REPETITION,
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
