/**
 * Keyboard shortcut types and utilities for the flashcard application
 */

export interface KeyboardShortcut {
	key: string;
	description: string;
	context?: "flip" | "navigation" | "rating" | "general";
}

export type TranslationFunction = (key: string) => string;

export interface KeyboardShortcutGroup {
	title: string;
	shortcuts: readonly KeyboardShortcut[];
}

/**
 * Keyboard shortcuts for different study modes with translation keys
 */
export const KEYBOARD_SHORTCUTS_KEYS = {
	// Basic Study Session shortcuts
	BASIC_STUDY: [
		{
			context: "navigation" as const,
			descriptionKey: "study.shortcuts.descriptions.previousCard",
			key: "←",
		},
		{
			context: "navigation" as const,
			descriptionKey: "study.shortcuts.descriptions.nextCard",
			key: "→",
		},
	],

	// Spaced Repetition shortcuts (only when card is flipped)
	SPACED_REPETITION: [
		{
			context: "rating" as const,
			descriptionKey: "study.shortcuts.descriptions.againWhenAnswerShown",
			key: "1",
		},
		{
			context: "rating" as const,
			descriptionKey: "study.shortcuts.descriptions.hardWhenAnswerShown",
			key: "2",
		},
		{
			context: "rating" as const,
			descriptionKey: "study.shortcuts.descriptions.goodWhenAnswerShown",
			key: "3",
		},
		{
			context: "rating" as const,
			descriptionKey: "study.shortcuts.descriptions.easyWhenAnswerShown",
			key: "4",
		},
	],
	// Universal shortcuts (available in all study modes)
	UNIVERSAL: [
		{
			context: "flip" as const,
			descriptionKey: "study.shortcuts.descriptions.flipCard",
			key: "Space",
		},
		{
			context: "flip" as const,
			descriptionKey: "study.shortcuts.descriptions.flipCard",
			key: "Enter",
		},
		{
			context: "general" as const,
			descriptionKey: "study.shortcuts.descriptions.showKeyboardShortcutsHelp",
			key: "?",
		},
	],
} as const;

/**
 * Group title translation keys
 */
export const KEYBOARD_SHORTCUT_GROUP_KEYS = {
	CARD_NAVIGATION: "study.shortcuts.groups.cardNavigation",
	NAVIGATION: "study.shortcuts.groups.navigation",
	RATING_WHEN_ANSWER_SHOWN: "study.shortcuts.groups.ratingWhenAnswerShown",
} as const;

/**
 * Get keyboard shortcuts for a specific study mode with translations
 */
export function getKeyboardShortcuts(
	mode: "basic" | "spaced-repetition",
	t: TranslationFunction,
): KeyboardShortcutGroup[] {
	const groups: KeyboardShortcutGroup[] = [
		{
			shortcuts: KEYBOARD_SHORTCUTS_KEYS.UNIVERSAL.map((shortcut) => ({
				...shortcut,
				description: t(shortcut.descriptionKey),
			})),
			title: t(KEYBOARD_SHORTCUT_GROUP_KEYS.CARD_NAVIGATION),
		},
	];

	if (mode === "basic") {
		groups.push({
			shortcuts: KEYBOARD_SHORTCUTS_KEYS.BASIC_STUDY.map((shortcut) => ({
				...shortcut,
				description: t(shortcut.descriptionKey),
			})),
			title: t(KEYBOARD_SHORTCUT_GROUP_KEYS.NAVIGATION),
		});
	} else if (mode === "spaced-repetition") {
		groups.push({
			shortcuts: KEYBOARD_SHORTCUTS_KEYS.SPACED_REPETITION.map((shortcut) => ({
				...shortcut,
				description: t(shortcut.descriptionKey),
			})),
			title: t(KEYBOARD_SHORTCUT_GROUP_KEYS.RATING_WHEN_ANSWER_SHOWN),
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
