import toast from "react-hot-toast";
import i18n from "../i18n";

/**
 * Toast notification utilities for consistent user feedback
 *
 * This module provides typed toast functions for different types of user feedback:
 * - Success messages for positive actions (deck creation, card updates, etc.)
 * - Error messages for non-critical failures (network issues, temporary failures)
 * - Info messages for general user feedback
 *
 * All toasts are configured with appropriate timing and accessibility features.
 */

/**
 * Configuration for different toast types
 */
const TOAST_CONFIG = {
	success: {
		duration: 4000, // 4 seconds for success messages
		icon: "✅",
	},
	error: {
		duration: 6000, // 6 seconds for errors (longer to read)
		icon: "❌",
	},
	info: {
		duration: 4000, // 4 seconds for info messages
		icon: "ℹ️",
	},
	achievement: {
		duration: 6000, // 6 seconds for achievements (longer to celebrate)
		icon: "🏆",
	},
} as const;

/**
 * Show a success toast notification
 * Used for positive feedback like successful deck creation, card updates, etc.
 */
export function showSuccessToast(message: string): void {
	toast.success(message, {
		duration: TOAST_CONFIG.success.duration,
		icon: TOAST_CONFIG.success.icon,
		style: {
			background: "#10b981", // green-500
			color: "#ffffff",
			fontWeight: "500",
		},
		ariaProps: {
			role: "status",
			"aria-live": "polite",
		},
	});
}

/**
 * Show an error toast notification
 * Used for non-critical errors that don't require immediate action
 */
export function showErrorToast(message: string): void {
	toast.error(message, {
		duration: TOAST_CONFIG.error.duration,
		icon: TOAST_CONFIG.error.icon,
		style: {
			background: "#ef4444", // red-500
			color: "#ffffff",
			fontWeight: "500",
		},
		ariaProps: {
			role: "alert",
			"aria-live": "assertive",
		},
	});
}

/**
 * Show an info toast notification
 * Used for general informational messages
 */
export function showInfoToast(message: string): void {
	toast(message, {
		duration: TOAST_CONFIG.info.duration,
		icon: TOAST_CONFIG.info.icon,
		style: {
			background: "#3b82f6", // blue-500
			color: "#ffffff",
			fontWeight: "500",
		},
		ariaProps: {
			role: "status",
			"aria-live": "polite",
		},
	});
}

/**
 * Show an achievement toast notification
 * Used for celebrating unlocked achievements with special styling
 */
export function showAchievementToast(
	achievementName: string,
	achievementIcon?: string,
): void {
	const displayIcon = achievementIcon || TOAST_CONFIG.achievement.icon;

	toast.success(`Achievement Unlocked: ${achievementName}`, {
		duration: TOAST_CONFIG.achievement.duration,
		icon: displayIcon,
		style: {
			background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", // golden gradient
			color: "#ffffff",
			fontWeight: "600",
			border: "2px solid #d97706",
			boxShadow: "0 10px 25px rgba(251, 191, 36, 0.3)",
		},
		ariaProps: {
			role: "status",
			"aria-live": "polite",
		},
	});
}

/**
 * Get internationalized success messages for common actions
 */
export const getSuccessMessages = () =>
	({
		DECK_CREATED: i18n.t("notifications.deckCreated"),
		DECK_UPDATED: i18n.t("notifications.deckUpdated"),
		CARD_CREATED: i18n.t("notifications.cardAdded"),
		CARD_UPDATED: i18n.t("notifications.cardUpdated"),
		CARD_DELETED: i18n.t("notifications.cardDeleted"),
		STUDY_SESSION_COMPLETE: i18n.t("notifications.studySessionCompleted"),
	}) as const;

/**
 * Get internationalized error messages for common failures
 */
export const getErrorMessages = () =>
	({
		NETWORK_ERROR: i18n.t("notifications.networkError"),
		TEMPORARY_ERROR: i18n.t("notifications.temporaryError"),
		DECK_CREATE_FAILED: i18n.t("errors.generic"),
		CARD_CREATE_FAILED: i18n.t("errors.generic"),
		CARD_UPDATE_FAILED: i18n.t("errors.generic"),
	}) as const;

/**
 * Convenience functions for common toast messages with internationalization
 */
export const toastHelpers = {
	deckCreated: (deckName?: string) =>
		showSuccessToast(
			deckName
				? i18n.t("notifications.deckCreatedWithName", { deckName })
				: getSuccessMessages().DECK_CREATED,
		),

	deckUpdated: (deckName?: string) =>
		showSuccessToast(
			deckName
				? i18n.t("notifications.deckUpdatedWithName", { deckName })
				: getSuccessMessages().DECK_UPDATED,
		),

	cardCreated: () => showSuccessToast(getSuccessMessages().CARD_CREATED),

	cardUpdated: () => showSuccessToast(getSuccessMessages().CARD_UPDATED),

	cardDeleted: () => showSuccessToast(getSuccessMessages().CARD_DELETED),

	studySessionComplete: (cardsReviewed?: number) =>
		showSuccessToast(
			cardsReviewed
				? i18n.t("notifications.studySessionCompletedWithCount", {
						count: cardsReviewed,
					})
				: getSuccessMessages().STUDY_SESSION_COMPLETE,
		),

	networkError: () => showErrorToast(getErrorMessages().NETWORK_ERROR),

	temporaryError: () => showErrorToast(getErrorMessages().TEMPORARY_ERROR),

	// Generic success and error methods for flexibility
	success: (message: string) => showSuccessToast(message),

	error: (message: string) => showErrorToast(message),

	// Achievement notification
	achievement: (achievementName: string, achievementIcon?: string) =>
		showAchievementToast(achievementName, achievementIcon),
} as const;
