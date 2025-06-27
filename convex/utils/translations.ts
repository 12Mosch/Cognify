import deTranslations from "../../src/locales/de/translation.json";

// Import translation files directly
import enTranslations from "../../src/locales/en/translation.json";
import type { TimeSlot } from "../../src/utils/scheduling";

export type SupportedLanguage = "en" | "de";
type TranslationResources = typeof enTranslations;

const translations: Record<SupportedLanguage, TranslationResources> = {
	de: deTranslations,
	en: enTranslations,
};

/**
 * Simple translation function for backend use
 * @param key - Translation key in dot notation (e.g., "scheduling.errors.userNotAuthenticated")
 * @param language - Language code ("en" or "de")
 * @param interpolations - Object with values to interpolate into the translation
 * @returns Translated string with interpolations applied
 */
export function t(
	key: string,
	language: SupportedLanguage = "en",
	interpolations?: Record<string, string | number>,
): string {
	const resource = translations[language] || translations.en;

	// Navigate through the nested object using the key path
	const keys = key.split(".");
	let value: unknown = resource;

	for (const k of keys) {
		if (value && typeof value === "object" && value !== null && k in value) {
			value = (value as Record<string, unknown>)[k];
		} else {
			// Fallback to English if key not found in target language
			if (language !== "en") {
				return t(key, "en", interpolations);
			}
			// Return key if not found in English either
			return key;
		}
	}

	if (typeof value !== "string") {
		return key;
	}

	// Apply interpolations
	if (interpolations) {
		return Object.entries(interpolations).reduce(
			(str, [placeholder, replacement]) => {
				//  validation for potentially unsafe content
				const safeReplacement = String(replacement).replace(
					/<script|javascript:|data:|vbscript:/gi,
					"",
				);
				return str.replace(
					new RegExp(`{{${placeholder}}}`, "g"),
					safeReplacement,
				);
			},
			value,
		);
	}

	return value;
}

/**
 * Get human-readable time slot name with time range
 */
export function getTimeSlotName(
	slot: TimeSlot,
	language: SupportedLanguage = "en",
): string {
	const timeSlotKey = `scheduling.timeSlots.${slot}Time`;
	return t(timeSlotKey, language);
}

/**
 * Get energy level translation
 */
export function getEnergyLevel(
	level: "high" | "medium" | "low",
	language: SupportedLanguage = "en",
): string {
	return t(`scheduling.energy.${level}`, language);
}

/**
 * Get priority level translation
 */
export function getPriority(
	priority: "high" | "medium" | "low",
	language: SupportedLanguage = "en",
): string {
	return t(`scheduling.priority.${priority}`, language);
}

/**
 * Get action translation
 */
export function getAction(
	action: "startStudyingNow" | "waitForOptimalTime",
	language: SupportedLanguage = "en",
): string {
	return t(`scheduling.actions.${action}`, language);
}

/**
 * Get error message translation
 */
export function getErrorMessage(
	errorKey: string,
	language: SupportedLanguage = "en",
): string {
	return t(`scheduling.errors.${errorKey}`, language);
}

/**
 * Build reasoning text with interpolations
 */
export function buildReasoning(
	reasoningType:
		| "basedOnSuccessRate"
		| "optimalStudyTime"
		| "considerWaiting"
		| "withPreviousSessions",
	language: SupportedLanguage = "en",
	interpolations?: Record<string, string | number>,
): string {
	return t(`scheduling.reasoning.${reasoningType}`, language, interpolations);
}

/**
 * Normalize language code to supported language
 * Handles cases like "en-US" -> "en"
 */
export function normalizeLanguage(languageCode?: string): SupportedLanguage {
	if (!languageCode) return "en";

	const normalized = languageCode.toLowerCase().split("-")[0];
	return normalized === "de" ? "de" : "en";
}
