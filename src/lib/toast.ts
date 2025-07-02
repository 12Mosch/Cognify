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
	achievement: {
		duration: 6000, // 6 seconds for achievements (longer to celebrate)
		icon: "🏆",
	},
	error: {
		duration: 6000, // 6 seconds for errors (longer to read)
		icon: "❌",
	},
	info: {
		duration: 4000, // 4 seconds for info messages
		icon: "ℹ️",
	},
	pathAdjustment: {
		duration: 3500, // 3.5 seconds for path adjustments (subtle, non-intrusive)
		icon: "🎯",
	},
	success: {
		duration: 4000, // 4 seconds for success messages
		icon: "✅",
	},
} as const;

/**
 * Show a success toast notification
 * Used for positive feedback like successful deck creation, card updates, etc.
 */
export function showSuccessToast(message: string): void {
	toast.success(message, {
		ariaProps: {
			"aria-live": "polite",
			role: "status",
		},
		duration: TOAST_CONFIG.success.duration,
		icon: TOAST_CONFIG.success.icon,
		style: {
			background: "#10b981", // green-500
			color: "#ffffff",
			fontWeight: "500",
		},
	});
}

/**
 * Show an error toast notification
 * Used for non-critical errors that don't require immediate action
 */
export function showErrorToast(message: string): void {
	toast.error(message, {
		ariaProps: {
			"aria-live": "assertive",
			role: "alert",
		},
		duration: TOAST_CONFIG.error.duration,
		icon: TOAST_CONFIG.error.icon,
		style: {
			background: "#ef4444", // red-500
			color: "#ffffff",
			fontWeight: "500",
		},
	});
}

/**
 * Show an info toast notification
 * Used for general informational messages
 */
export function showInfoToast(message: string): void {
	toast(message, {
		ariaProps: {
			"aria-live": "polite",
			role: "status",
		},
		duration: TOAST_CONFIG.info.duration,
		icon: TOAST_CONFIG.info.icon,
		style: {
			background: "#3b82f6", // blue-500
			color: "#ffffff",
			fontWeight: "500",
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
		ariaProps: {
			"aria-live": "polite",
			role: "status",
		},
		duration: TOAST_CONFIG.achievement.duration,
		icon: displayIcon,
		style: {
			background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)", // golden gradient
			border: "2px solid #d97706",
			boxShadow: "0 10px 25px rgba(251, 191, 36, 0.3)",
			color: "#ffffff",
			fontWeight: "600",
		},
	});
}

/**
 * Show a path adjustment toast notification
 * Used for subtle, non-intrusive feedback when study paths are optimized
 */
export function showPathAdjustmentToast(
	message: string,
	changePercentage?: number,
): void {
	const displayMessage = changePercentage
		? `${message} (${i18n.t("notifications.cardsReordered", { percentage: Math.round(changePercentage * 100) })})`
		: message;

	toast(displayMessage, {
		ariaProps: {
			"aria-live": "polite",
			role: "status",
		},
		duration: TOAST_CONFIG.pathAdjustment.duration,
		icon: TOAST_CONFIG.pathAdjustment.icon,
		style: {
			background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)", // purple gradient
			border: "1px solid #7c3aed",
			boxShadow: "0 4px 12px rgba(139, 92, 246, 0.15)",
			color: "#ffffff",
			fontSize: "13px",
			fontWeight: "500",
			maxWidth: "350px",
		},
	});
}

/**
 * Get internationalized success messages for common actions
 */
export const getSuccessMessages = () =>
	({
		CARD_CREATED: i18n.t("notifications.cardAdded"),
		CARD_DELETED: i18n.t("notifications.cardDeleted"),
		CARD_UPDATED: i18n.t("notifications.cardUpdated"),
		DECK_CREATED: i18n.t("notifications.deckCreated"),
		DECK_UPDATED: i18n.t("notifications.deckUpdated"),
		STUDY_SESSION_COMPLETE: i18n.t("notifications.studySessionCompleted"),
	}) as const;

/**
 * Get internationalized error messages for common failures
 */
export const getErrorMessages = () =>
	({
		CARD_CREATE_FAILED: i18n.t("errors.generic"),
		CARD_UPDATE_FAILED: i18n.t("errors.generic"),
		DECK_CREATE_FAILED: i18n.t("errors.generic"),
		NETWORK_ERROR: i18n.t("notifications.networkError"),
		TEMPORARY_ERROR: i18n.t("notifications.temporaryError"),
	}) as const;

/**
 * Convenience functions for common toast messages with internationalization
 */
export const toastHelpers = {
	// Achievement notification
	achievement: (achievementName: string, achievementIcon?: string) =>
		showAchievementToast(achievementName, achievementIcon),

	cardCreated: () => showSuccessToast(getSuccessMessages().CARD_CREATED),

	cardDeleted: () => showSuccessToast(getSuccessMessages().CARD_DELETED),

	cardUpdated: () => showSuccessToast(getSuccessMessages().CARD_UPDATED),

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

	error: (message: string) => showErrorToast(message),

	networkError: () => showErrorToast(getErrorMessages().NETWORK_ERROR),

	// Path adjustment notifications
	pathOptimized: (changePercentage?: number) =>
		showPathAdjustmentToast(
			i18n.t("notifications.pathOptimized"),
			changePercentage,
		),

	pathUpdated: (reason?: string) =>
		showPathAdjustmentToast(
			reason
				? `${i18n.t("notifications.pathUpdated")}: ${reason}`
				: i18n.t("notifications.pathUpdated"),
		),

	studySessionComplete: (cardsReviewed?: number) =>
		showSuccessToast(
			cardsReviewed
				? i18n.t("notifications.studySessionCompletedWithCount", {
						count: cardsReviewed,
					})
				: getSuccessMessages().STUDY_SESSION_COMPLETE,
		),

	// Generic success and error methods for flexibility
	success: (message: string) => showSuccessToast(message),

	temporaryError: () => showErrorToast(getErrorMessages().TEMPORARY_ERROR),
} as const;
