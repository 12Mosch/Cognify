/**
 * Error monitoring utilities for flashcard app
 * Provides specialized error handling for common scenarios
 */

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";
import {
	captureError,
	categorizeError,
	type ErrorCategory,
	hasAnalyticsConsent,
	trackAuthenticationError,
	trackCardLoadingError,
	trackConvexMutationError,
	trackConvexQueryError,
	trackFormSubmissionError,
	trackFormValidationError,
	trackPerformanceError,
	trackStudySessionError,
} from "./analytics";

/**
 * Hook for Convex query error monitoring
 */
export function useConvexQueryErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			queryName: string,
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				retryAttempt?: number;
				queryArgs?: Record<string, any>;
			},
		) => {
			trackConvexQueryError(posthog, queryName, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for Convex mutation error monitoring
 */
export function useConvexMutationErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			mutationName: string,
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				retryAttempt?: number;
				mutationArgs?: Record<string, any>;
			},
		) => {
			trackConvexMutationError(posthog, mutationName, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for authentication error monitoring
 */
export function useAuthErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			errorType:
				| "clerk_error"
				| "convex_auth_error"
				| "token_expired"
				| "permission_denied",
			error: Error,
			context?: {
				userId?: string;
				attemptedAction?: string;
			},
		) => {
			trackAuthenticationError(posthog, errorType, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for card loading error monitoring
 */
export function useCardLoadingErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			deckId: string,
			error: Error,
			context?: {
				cardId?: string;
				studyMode?: "basic" | "spaced-repetition";
				loadingStage?: "initial_load" | "flip_animation" | "content_render";
			},
		) => {
			trackCardLoadingError(posthog, deckId, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for study session error monitoring
 */
export function useStudySessionErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			deckId: string,
			errorType:
				| "session_start"
				| "card_transition"
				| "progress_save"
				| "session_end",
			error: Error,
			context?: {
				sessionId?: string;
				cardsReviewed?: number;
				studyMode?: "basic" | "spaced-repetition";
			},
		) => {
			trackStudySessionError(posthog, deckId, errorType, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for form validation error monitoring
 */
export function useFormValidationErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			formName: string,
			validationErrors: Record<string, string[]>,
			context?: {
				userId?: string;
				formData?: Record<string, any>;
				attemptNumber?: number;
			},
		) => {
			trackFormValidationError(posthog, formName, validationErrors, context);
		},
		[posthog],
	);
}

/**
 * Hook for form submission error monitoring
 */
export function useFormSubmissionErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			formName: string,
			error: Error,
			context?: {
				userId?: string;
				formData?: Record<string, any>;
				submissionAttempt?: number;
				timeToSubmit?: number;
			},
		) => {
			trackFormSubmissionError(posthog, formName, error, context);
		},
		[posthog],
	);
}

/**
 * Hook for performance error monitoring
 */
export function usePerformanceErrorHandler() {
	const posthog = usePostHog();

	return useCallback(
		(
			operationType: string,
			duration: number,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				threshold?: number;
				operationData?: Record<string, any>;
			},
		) => {
			trackPerformanceError(posthog, operationType, duration, context);
		},
		[posthog],
	);
}

/**
 * Comprehensive error monitoring hook
 */
export function useErrorMonitoring() {
	const posthog = usePostHog();

	const captureGenericError = useCallback(
		(
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				component?: string;
				action?: string;
				severity?: "low" | "medium" | "high" | "critical";
				recoverable?: boolean;
				category?:
					| "network_error"
					| "validation_error"
					| "authentication_error"
					| "permission_error"
					| "data_corruption"
					| "performance_error"
					| "ui_error"
					| "integration_error"
					| "unknown_error";
				fingerprint?: string;
				tags?: Record<string, string>;
				additionalData?: Record<string, any>;
			},
		) => {
			captureError(posthog, error, context);
		},
		[posthog],
	);

	const trackConvexQuery = useConvexQueryErrorHandler();
	const trackConvexMutation = useConvexMutationErrorHandler();
	const trackAuth = useAuthErrorHandler();
	const trackCardLoading = useCardLoadingErrorHandler();
	const trackStudySession = useStudySessionErrorHandler();
	const trackFormValidation = useFormValidationErrorHandler();
	const trackFormSubmission = useFormSubmissionErrorHandler();
	const trackPerformance = usePerformanceErrorHandler();

	return {
		captureError: captureGenericError,
		trackConvexQuery,
		trackConvexMutation,
		trackAuth,
		trackCardLoading,
		trackStudySession,
		trackFormValidation,
		trackFormSubmission,
		trackPerformance,
		hasConsent: hasAnalyticsConsent(),
	};
}

/**
 * Create an error handler for a specific component
 */
export function createComponentErrorHandler(
	componentName: string,
	posthog?: ReturnType<typeof usePostHog> | null,
) {
	return (error: Error, errorInfo?: any) => {
		if (posthog && hasAnalyticsConsent()) {
			captureError(posthog, error, {
				component: componentName,
				action: "component_error",
				severity: "medium",
				additionalData: errorInfo,
			});
		}
	};
}

/**
 * Enhanced async operation wrapper with error monitoring and performance tracking
 */
export async function withAsyncErrorMonitoring<T>(
	operation: () => Promise<T>,
	context: {
		operationType: string;
		posthog?: ReturnType<typeof usePostHog> | null;
		errorContext?: {
			userId?: string;
			deckId?: string;
			cardId?: string;
			component?: string;
		};
		retryAttempt?: number;
		timeoutMs?: number;
		performanceThreshold?: number;
		errorCategory?: ErrorCategory; // Allow explicit category override
	},
): Promise<T> {
	const startTime = Date.now();

	try {
		let result: T;

		// Add timeout if specified
		if (context.timeoutMs) {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(
					() =>
						reject(
							new Error(`Operation timed out after ${context.timeoutMs}ms`),
						),
					context.timeoutMs,
				);
			});

			result = await Promise.race([operation(), timeoutPromise]);
		} else {
			result = await operation();
		}

		const duration = Date.now() - startTime;

		// Track performance if operation was slow
		if (
			context.performanceThreshold &&
			duration > context.performanceThreshold &&
			context.posthog
		) {
			trackPerformanceError(context.posthog, context.operationType, duration, {
				...context.errorContext,
				threshold: context.performanceThreshold,
				operationData: {
					retryAttempt: context.retryAttempt,
					timeoutMs: context.timeoutMs,
				},
			});
		}

		return result;
	} catch (error) {
		const duration = Date.now() - startTime;

		if (context.posthog && hasAnalyticsConsent()) {
			const errorObj = error as Error;

			// Determine error category - use explicit override, auto-categorize, or fall back to performance for timeouts
			let category: ErrorCategory;
			if (context.errorCategory) {
				category = context.errorCategory;
			} else if (context.timeoutMs && errorObj.message.includes("timed out")) {
				// Only categorize as performance_error if it's actually a timeout
				category = "performance_error";
			} else {
				// Use the categorizeError helper to properly categorize the error
				category = categorizeError(errorObj);
			}

			captureError(context.posthog, errorObj, {
				...context.errorContext,
				component: "AsyncOperation",
				action: context.operationType,
				severity: "medium",
				category,
				tags: {
					operationType: context.operationType,
					retryAttempt: String(context.retryAttempt || 0),
					duration: String(duration),
				},
				additionalData: {
					retryAttempt: context.retryAttempt,
					duration,
					timeoutMs: context.timeoutMs,
					performanceThreshold: context.performanceThreshold,
				},
			});
		}

		throw error;
	}
}

/**
 * Retry wrapper with error monitoring
 */
export async function withRetryAndErrorMonitoring<T>(
	operation: () => Promise<T>,
	context: {
		operationType: string;
		posthog?: ReturnType<typeof usePostHog> | null;
		errorContext?: {
			userId?: string;
			deckId?: string;
			cardId?: string;
			component?: string;
		};
		maxRetries?: number;
		retryDelay?: number;
		timeoutMs?: number;
		errorCategory?: ErrorCategory; // Allow explicit category override
	},
): Promise<T> {
	const maxRetries = context.maxRetries ?? 3;
	const retryDelay = context.retryDelay ?? 1000;

	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await withAsyncErrorMonitoring(operation, {
				...context,
				retryAttempt: attempt,
			});
		} catch (error) {
			lastError = error as Error;

			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Wait before retrying
			if (retryDelay > 0) {
				await new Promise((resolve) =>
					setTimeout(resolve, retryDelay * Math.pow(2, attempt)),
				);
			}
		}
	}

	throw lastError!;
}

/**
 * Form error monitoring wrapper
 */
export function withFormErrorMonitoring<T extends Record<string, any>>(
	formName: string,
	posthog?: ReturnType<typeof usePostHog> | null,
) {
	return {
		/**
		 * Track form validation errors
		 */
		trackValidationErrors: (
			validationErrors: Record<string, string[]>,
			context?: {
				userId?: string;
				formData?: T;
				attemptNumber?: number;
			},
		) => {
			if (posthog && hasAnalyticsConsent()) {
				trackFormValidationError(posthog, formName, validationErrors, {
					...context,
					formData: context?.formData as Record<string, any>,
				});
			}
		},

		/**
		 * Track form submission errors
		 */
		trackSubmissionError: (
			error: Error,
			context?: {
				userId?: string;
				formData?: T;
				submissionAttempt?: number;
				timeToSubmit?: number;
			},
		) => {
			if (posthog && hasAnalyticsConsent()) {
				trackFormSubmissionError(posthog, formName, error, {
					...context,
					formData: context?.formData as Record<string, any>,
				});
			}
		},

		/**
		 * Wrap form submission with error monitoring
		 */
		wrapSubmission: async <R>(
			submitFn: (formData: T) => Promise<R>,
			formData: T,
			context?: {
				userId?: string;
				submissionAttempt?: number;
			},
		): Promise<R> => {
			const startTime = Date.now();

			try {
				const result = await submitFn(formData);
				return result;
			} catch (error) {
				const timeToSubmit = Date.now() - startTime;

				if (posthog && hasAnalyticsConsent()) {
					trackFormSubmissionError(posthog, formName, error as Error, {
						...context,
						formData: formData as Record<string, any>,
						timeToSubmit,
					});
				}

				throw error;
			}
		},
	};
}

/**
 * Error recovery utilities
 */
export const ErrorRecovery = {
	/**
	 * Attempt to recover from a Convex connection error
	 */
	async recoverConvexConnection(): Promise<boolean> {
		try {
			// Force a page reload as a last resort
			window.location.reload();
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Attempt to recover from authentication errors
	 */
	async recoverAuthentication(): Promise<boolean> {
		try {
			// Clear any stale auth data
			localStorage.removeItem("clerk-user");
			sessionStorage.clear();

			// Redirect to sign-in
			window.location.href = "/";
			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Attempt to recover from study session errors
	 */
	async recoverStudySession(deckId: string): Promise<boolean> {
		try {
			// Clear any cached study session data
			const sessionKeys = Object.keys(localStorage).filter(
				(key) => key.includes("study_session") || key.includes(deckId),
			);
			sessionKeys.forEach((key) => localStorage.removeItem(key));

			return true;
		} catch {
			return false;
		}
	},

	/**
	 * Attempt to recover from form submission errors
	 */
	async recoverFormSubmission(formName: string): Promise<boolean> {
		try {
			// Clear any cached form data that might be corrupted
			const formKeys = Object.keys(localStorage).filter(
				(key) =>
					key.includes(`form_${formName}`) || key.includes(`draft_${formName}`),
			);
			formKeys.forEach((key) => localStorage.removeItem(key));

			return true;
		} catch {
			return false;
		}
	},
};
