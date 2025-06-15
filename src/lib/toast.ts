import toast from 'react-hot-toast';

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
    icon: '✅',
  },
  error: {
    duration: 6000, // 6 seconds for errors (longer to read)
    icon: '❌',
  },
  info: {
    duration: 4000, // 4 seconds for info messages
    icon: 'ℹ️',
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
      background: '#10b981', // green-500
      color: '#ffffff',
      fontWeight: '500',
    },
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
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
      background: '#ef4444', // red-500
      color: '#ffffff',
      fontWeight: '500',
    },
    ariaProps: {
      role: 'alert',
      'aria-live': 'assertive',
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
      background: '#3b82f6', // blue-500
      color: '#ffffff',
      fontWeight: '500',
    },
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
    },
  });
}

/**
 * Predefined success messages for common actions
 */
export const SUCCESS_MESSAGES = {
  DECK_CREATED: 'Deck created successfully!',
  CARD_CREATED: 'Card added successfully!',
  CARD_UPDATED: 'Card updated successfully!',
  STUDY_SESSION_COMPLETE: 'Study session completed!',
} as const;

/**
 * Predefined error messages for common failures
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TEMPORARY_ERROR: 'Something went wrong. Please try again in a moment.',
  DECK_CREATE_FAILED: 'Failed to create deck. Please try again.',
  CARD_CREATE_FAILED: 'Failed to add card. Please try again.',
  CARD_UPDATE_FAILED: 'Failed to update card. Please try again.',
} as const;

/**
 * Convenience functions for common toast messages
 */
export const toastHelpers = {
  deckCreated: (deckName?: string) => 
    showSuccessToast(deckName ? `"${deckName}" created successfully!` : SUCCESS_MESSAGES.DECK_CREATED),
  
  cardCreated: () => 
    showSuccessToast(SUCCESS_MESSAGES.CARD_CREATED),
  
  cardUpdated: () => 
    showSuccessToast(SUCCESS_MESSAGES.CARD_UPDATED),
  
  studySessionComplete: (cardsReviewed?: number) => 
    showSuccessToast(
      cardsReviewed 
        ? `Study session complete! Reviewed ${cardsReviewed} card${cardsReviewed === 1 ? '' : 's'}.`
        : SUCCESS_MESSAGES.STUDY_SESSION_COMPLETE
    ),
  
  networkError: () => 
    showErrorToast(ERROR_MESSAGES.NETWORK_ERROR),
  
  temporaryError: () => 
    showErrorToast(ERROR_MESSAGES.TEMPORARY_ERROR),
} as const;
