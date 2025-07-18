import { usePostHog } from "posthog-js/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Analytics utility functions for PostHog integration
 * Provides type-safe event tracking with error handling, batching, and privacy compliance
 */

/**
 * Type definitions for browser performance memory API
 */
interface PerformanceMemory {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
}

interface ExtendedPerformance extends Performance {
	memory?: PerformanceMemory;
}

/**
 * Type definitions for navigator connection API
 */
interface NetworkInformation {
	effectiveType?: "2g" | "3g" | "4g" | "slow-2g";
	downlink?: number;
	rtt?: number;
	saveData?: boolean;
}

interface ExtendedNavigator extends Navigator {
	connection?: NetworkInformation;
}

/**
 * Type guard to check if performance.memory is available
 */
function hasMemoryAPI(perf: Performance): perf is ExtendedPerformance {
	return (
		"memory" in perf && typeof (perf as ExtendedPerformance).memory === "object"
	);
}

/**
 * Type guard to check if navigator.connection is available
 */
function hasConnectionAPI(nav: Navigator): nav is ExtendedNavigator {
	return (
		"connection" in nav &&
		typeof (nav as ExtendedNavigator).connection === "object"
	);
}

/**
 * Safely get the current environment mode
 * Uses environment variables that work consistently across Vite and Node.js
 * Avoids eval and import.meta access issues entirely
 */
export function getEnvironmentMode(): string {
	// Check for test environment first
	if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
		return "test";
	}

	// Use VITE_MODE if available (set by Vite automatically)
	if (typeof process !== "undefined" && process.env.VITE_MODE) {
		return process.env.VITE_MODE;
	}

	// Use NODE_ENV as fallback (works in both browser and Node.js after bundling)
	if (typeof process !== "undefined" && process.env.NODE_ENV) {
		return process.env.NODE_ENV;
	}

	// Final fallback for browser environments where process might not be available
	// In production builds, bundlers typically replace process.env references
	return "production";
}

/**
 * PostHog configuration validation result
 */
export interface PostHogConfigValidation {
	isValid: boolean;
	missingKey: boolean;
	missingHost: boolean;
	warnings: string[];
}

/**
 * Validates PostHog configuration and returns detailed validation results
 */
export function validatePostHogConfig(): PostHogConfigValidation {
	// Safely get environment variables using the same pattern as getEnvironmentMode
	let posthogKey: string | undefined;
	let posthogHost: string | undefined;

	// Check for test environment first
	if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
		// In test environment, check global mock first, then process.env
		interface GlobalWithImportMeta {
			import?: {
				meta?: {
					env?: Record<string, string>;
				};
			};
		}
		const globalWithMeta = global as GlobalWithImportMeta;
		if (typeof global !== "undefined" && globalWithMeta.import?.meta?.env) {
			posthogKey = globalWithMeta.import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
			posthogHost = globalWithMeta.import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
		} else {
			posthogKey = process.env.VITE_PUBLIC_POSTHOG_KEY;
			posthogHost = process.env.VITE_PUBLIC_POSTHOG_HOST;
		}
	} else {
		// Try to access Vite's import.meta.env safely
		try {
			// Use a safer approach than eval for accessing import.meta
			if (typeof window !== "undefined") {
				// Browser environment - try to access import.meta through window
				const windowWithImportMeta = window as typeof window & {
					import?: { meta?: { env?: Record<string, string> } };
				};
				const importMeta = windowWithImportMeta.import?.meta;
				posthogKey = importMeta?.env?.VITE_PUBLIC_POSTHOG_KEY;
				posthogHost = importMeta?.env?.VITE_PUBLIC_POSTHOG_HOST;
			}

			// If not found in window or not in browser, fallback to process.env
			if (!posthogKey || !posthogHost) {
				posthogKey =
					typeof process !== "undefined"
						? process.env.VITE_PUBLIC_POSTHOG_KEY
						: undefined;
				posthogHost =
					typeof process !== "undefined"
						? process.env.VITE_PUBLIC_POSTHOG_HOST
						: undefined;
			}
		} catch {
			// Fallback to process.env if available
			posthogKey =
				typeof process !== "undefined"
					? process.env.VITE_PUBLIC_POSTHOG_KEY
					: undefined;
			posthogHost =
				typeof process !== "undefined"
					? process.env.VITE_PUBLIC_POSTHOG_HOST
					: undefined;
		}
	}

	const missingKey =
		!posthogKey ||
		posthogKey === "" ||
		posthogKey === "your_posthog_project_api_key_here";
	const missingHost = !posthogHost || posthogHost.trim() === "";

	const warnings: string[] = [];

	if (missingKey && missingHost) {
		warnings.push(
			"PostHog analytics is not configured. Both VITE_PUBLIC_POSTHOG_KEY and VITE_PUBLIC_POSTHOG_HOST are missing.",
		);
	} else if (missingKey) {
		warnings.push(
			"PostHog analytics is not configured. VITE_PUBLIC_POSTHOG_KEY is missing or invalid.",
		);
	} else if (missingHost) {
		warnings.push(
			"PostHog analytics is not configured. VITE_PUBLIC_POSTHOG_HOST is missing.",
		);
	}

	if (warnings.length > 0) {
		warnings.push(
			"Analytics tracking will be disabled. Add the missing environment variables to enable analytics.",
		);
		warnings.push("See .env.example for configuration details.");
	}

	return {
		isValid: !missingKey && !missingHost,
		missingHost,
		missingKey,
		warnings,
	};
}

/**
 * Displays PostHog configuration warnings to developers
 * Only shows warnings in development mode to avoid cluttering production logs
 */
export function displayPostHogConfigWarnings(): void {
	const validation = validatePostHogConfig();

	if (!validation.isValid) {
		const isDevelopment = getEnvironmentMode() === "development";

		if (isDevelopment) {
			// Show detailed warnings in development
			console.group("⚠️ PostHog Configuration Warning");
			validation.warnings.forEach((warning) => {
				console.warn(warning);
			});

			if (validation.missingKey) {
				console.warn(
					"Missing: VITE_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key_here",
				);
			}
			if (validation.missingHost) {
				console.warn(
					"Missing: VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com",
				);
			}

			console.warn(
				"Add these to your .env.local file to enable analytics tracking.",
			);
			console.groupEnd();
		} else {
			// Show minimal warning in production/staging
			console.warn("PostHog analytics not configured - tracking disabled");
		}
	}
}

// Privacy and consent types
export type ConsentStatus = "granted" | "denied" | "pending";

export interface PrivacySettings {
	analyticsConsent: ConsentStatus;
	functionalConsent: ConsentStatus;
	marketingConsent: ConsentStatus;
}

// Analytics queue types
interface QueuedEvent {
	event: AnalyticsEvent;
	properties: Record<string, unknown>;
	timestamp: number;
	featureFlags?: Record<string, boolean | string | number>;
}

// User cohort types
export interface UserCohortProperties {
	signupDate?: string;
	signupWeek?: number;
	signupMonth?: number;
	studyGoal?: "casual" | "intensive" | "exam_prep";
	preferredStudyTime?: "morning" | "afternoon" | "evening";
	experienceLevel?: "beginner" | "intermediate" | "advanced";
	studyPersona?: string;
	engagementTier?: "new_user" | "casual" | "regular" | "power_user";
}

// Define event types for better type safety
export type AnalyticsEvent =
	| "user_signed_up"
	| "deck_created"
	| "deck_updated"
	| "deck_deleted"
	| "card_created"
	| "study_session_started"
	| "study_session_completed"
	| "card_flipped"
	| "difficulty_rated"
	| "streak_started"
	| "streak_continued"
	| "streak_broken"
	| "streak_milestone"
	| "session_started"
	| "cards_reviewed"
	| "session_completed"
	// Error tracking events
	| "error_boundary_triggered"
	| "convex_query_failed"
	| "convex_mutation_failed"
	| "authentication_error"
	| "card_loading_error"
	| "study_session_error"
	| "user_reported_error"
	| "async_operation_failed"
	// Enhanced error tracking events
	| "form_validation_error"
	| "form_submission_error"
	| "performance_error";

export interface AnalyticsEventData {
	user_signed_up: Record<string, never>; // No additional data needed
	deck_created: {
		deckId?: string;
		deckName?: string;
	};
	deck_updated: {
		deckId?: string;
		deckName?: string;
	};
	deck_deleted: {
		deckId?: string;
		deckName?: string;
		cardCount?: number;
	};
	card_created: {
		cardId?: string;
		deckName?: string;
	};
	study_session_started: {
		deckId: string;
		deckName?: string;
		cardCount?: number;
	};
	study_session_completed: {
		deckId: string;
		deckName?: string;
		cardsReviewed: number;
		studyMode: "basic" | "spaced-repetition";
		sessionDuration?: number;
		// Enhanced session completion properties
		averageTimePerCard?: number;
		correctAnswers?: number;
		incorrectAnswers?: number;
		cardsSkipped?: number;
		completionRate?: number; // percentage
		focusTime?: number; // time actually spent studying vs idle
	};
	card_flipped: {
		cardId: string;
		deckId: string;
		flipDirection: "front_to_back" | "back_to_front";
		timeToFlip?: number; // milliseconds
	};
	difficulty_rated: {
		cardId: string;
		deckId: string;
		difficulty: "easy" | "medium" | "hard";
		previousDifficulty?: string;
	};
	// Streak tracking events
	streak_started: {
		streakLength: number;
		studyDate: string; // YYYY-MM-DD format
		timezone: string;
	};
	streak_continued: {
		streakLength: number;
		studyDate: string; // YYYY-MM-DD format
		timezone: string;
		previousStreakLength: number;
	};
	streak_broken: {
		previousStreakLength: number;
		daysMissed: number;
		lastStudyDate: string; // YYYY-MM-DD format
		timezone: string;
	};
	streak_milestone: {
		streakLength: number;
		milestone: number; // 7, 30, 100, etc.
		studyDate: string;
		timezone: string;
	};
	// Funnel analysis events
	session_started: {
		deckId: string;
		deckName?: string;
		studyMode: "basic" | "spaced-repetition";
		cardCount?: number;
		sessionId: string;
	};
	cards_reviewed: {
		deckId: string;
		sessionId: string;
		cardsReviewed: number;
		studyMode: "basic" | "spaced-repetition";
		timeElapsed: number; // milliseconds
	};
	session_completed: {
		deckId: string;
		sessionId: string;
		cardsReviewed: number;
		studyMode: "basic" | "spaced-repetition";
		sessionDuration: number; // milliseconds
		completionRate: number; // percentage
		averageTimePerCard?: number;
		correctAnswers?: number;
		incorrectAnswers?: number;
	};
	// Error tracking event data
	error_boundary_triggered: {
		errorMessage: string;
		errorStack?: string;
		componentStack?: string;
		userId?: string;
		currentRoute?: string;
		userAgent?: string;
		timestamp: number;
		errorBoundary: string; // Which error boundary caught it
		recoverable?: boolean;
	};
	convex_query_failed: {
		queryName: string;
		errorMessage: string;
		errorCode?: string;
		userId?: string;
		deckId?: string;
		cardId?: string;
		retryAttempt?: number;
		queryArgs?: Record<string, unknown>;
	};
	convex_mutation_failed: {
		mutationName: string;
		errorMessage: string;
		errorCode?: string;
		userId?: string;
		deckId?: string;
		cardId?: string;
		retryAttempt?: number;
		mutationArgs?: Record<string, unknown>;
	};
	authentication_error: {
		errorType:
			| "clerk_error"
			| "convex_auth_error"
			| "token_expired"
			| "permission_denied";
		errorMessage: string;
		userId?: string;
		attemptedAction?: string;
		currentRoute?: string;
	};
	card_loading_error: {
		deckId: string;
		cardId?: string;
		errorMessage: string;
		studyMode?: "basic" | "spaced-repetition";
		loadingStage: "initial_load" | "flip_animation" | "content_render";
	};
	study_session_error: {
		deckId: string;
		sessionId?: string;
		errorType:
			| "session_start"
			| "card_transition"
			| "progress_save"
			| "session_end";
		errorMessage: string;
		cardsReviewed?: number;
		studyMode?: "basic" | "spaced-repetition";
	};
	user_reported_error: {
		errorDescription: string;
		userEmail?: string;
		currentRoute?: string;
		reproductionSteps?: string;
		severity: "low" | "medium" | "high" | "critical";
		category?:
			| "ui_bug"
			| "data_loss"
			| "performance"
			| "feature_request"
			| "other";
	};
	async_operation_failed: {
		operationType: string;
		errorMessage: string;
		operationContext?: Record<string, unknown>;
		retryAttempt?: number;
		timeoutDuration?: number;
	};
	// Enhanced error tracking event data
	form_validation_error: {
		formName: string;
		errorCount: number;
		totalErrors: number;
		errorFields: string[];
		validationErrors: string;
		userId?: string;
		attemptNumber: number;
		formDataKeys: string[];
	};
	form_submission_error: {
		formName: string;
		errorMessage: string;
		errorType: string;
		userId?: string;
		submissionAttempt: number;
		timeToSubmit?: number;
		formDataKeys: string[];
	};
	performance_error: {
		operationType: string;
		duration: number;
		threshold: number;
		userId?: string;
		deckId?: string;
		cardId?: string;
		severity: "medium" | "high";
		operationData?: Record<string, unknown>;
	};
}

/**
 * Safe wrapper for PostHog event tracking
 * Ensures analytics failures don't break app functionality
 */
type PropsArg<E extends AnalyticsEvent> = AnalyticsEventData[E] extends Record<
	string,
	never
>
	? []
	: [properties: AnalyticsEventData[E]];

export function trackEvent<E extends AnalyticsEvent>(
	posthog: ReturnType<typeof usePostHog> | null,
	event: E,
	...props: PropsArg<E>
): void {
	const properties = props[0] as PropsArg<E>[0] | undefined;
	try {
		if (!posthog) {
			console.warn("PostHog not available for event tracking:", event);
			return;
		}

		// Track the event with optional properties
		posthog.capture(event, properties);

		// Log in development for debugging
		if (getEnvironmentMode() === "development") {
			console.log("Analytics event tracked:", event, properties);
		}
	} catch (error) {
		// Log error but don't throw to avoid breaking app functionality
		console.error("Failed to track analytics event:", event, error);
	}
}

/**
 * Track user registration event
 * Should only be called once per user registration
 */
export function trackUserSignUp(
	posthog: ReturnType<typeof usePostHog> | null,
): void {
	trackEvent(posthog, "user_signed_up");
}

/**
 * Track deck creation event
 */
export function trackDeckCreated(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId?: string,
	deckName?: string,
): void {
	trackEvent(posthog, "deck_created", {
		deckId,
		deckName,
	});
}

/**
 * Track deck update event
 */
export function trackDeckUpdated(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId?: string,
	deckName?: string,
): void {
	trackEvent(posthog, "deck_updated", {
		deckId,
		deckName,
	});
}

/**
 * Track deck deletion event
 */
export function trackDeckDeleted(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId?: string,
	deckName?: string,
	cardCount?: number,
): void {
	trackEvent(posthog, "deck_deleted", {
		cardCount,
		deckId,
		deckName,
	});
}

/**
 * Track card creation event
 */
export function trackCardCreated(
	posthog: ReturnType<typeof usePostHog> | null,
	cardId?: string,
	deckName?: string,
): void {
	trackEvent(posthog, "card_created", { cardId, deckName });
}

/**
 * Track study session start event
 */
export function trackStudySessionStarted(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	deckName?: string,
	cardCount?: number,
): void {
	trackEvent(posthog, "study_session_started", {
		cardCount,
		deckId,
		deckName,
	});
}

/**
 * Track study session completion event with enhanced metrics
 */
export function trackStudySessionCompleted(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	deckName: string | undefined,
	cardsReviewed: number,
	studyMode: "basic" | "spaced-repetition",
	sessionDuration?: number,
	enhancedMetrics?: {
		averageTimePerCard?: number;
		correctAnswers?: number;
		incorrectAnswers?: number;
		cardsSkipped?: number;
		completionRate?: number;
		focusTime?: number;
	},
): void {
	trackEvent(posthog, "study_session_completed", {
		cardsReviewed,
		deckId,
		deckName,
		sessionDuration,
		studyMode,
		...enhancedMetrics,
	});
}

/**
 * Track card flip interaction
 */
export function trackCardFlipped(
	posthog: ReturnType<typeof usePostHog> | null,
	cardId: string,
	deckId: string,
	flipDirection: "front_to_back" | "back_to_front",
	timeToFlip?: number,
): void {
	trackEvent(posthog, "card_flipped", {
		cardId,
		deckId,
		flipDirection,
		timeToFlip,
	});
}

/**
 * Track difficulty rating
 */
export function trackDifficultyRated(
	posthog: ReturnType<typeof usePostHog> | null,
	cardId: string,
	deckId: string,
	difficulty: "easy" | "medium" | "hard",
	previousDifficulty?: string,
): void {
	trackEvent(posthog, "difficulty_rated", {
		cardId,
		deckId,
		difficulty,
		previousDifficulty,
	});
}

/**
 * Track streak started event
 */
export function trackStreakStarted(
	posthog: ReturnType<typeof usePostHog> | null,
	streakLength: number,
	studyDate: string,
	timezone: string,
): void {
	trackEvent(posthog, "streak_started", {
		streakLength,
		studyDate,
		timezone,
	});
}

/**
 * Track streak continued event
 */
export function trackStreakContinued(
	posthog: ReturnType<typeof usePostHog> | null,
	streakLength: number,
	studyDate: string,
	timezone: string,
	previousStreakLength: number,
): void {
	trackEvent(posthog, "streak_continued", {
		previousStreakLength,
		streakLength,
		studyDate,
		timezone,
	});
}

/**
 * Track streak broken event
 */
export function trackStreakBroken(
	posthog: ReturnType<typeof usePostHog> | null,
	previousStreakLength: number,
	daysMissed: number,
	lastStudyDate: string,
	timezone: string,
): void {
	trackEvent(posthog, "streak_broken", {
		daysMissed,
		lastStudyDate,
		previousStreakLength,
		timezone,
	});
}

/**
 * Track streak milestone event
 */
export function trackStreakMilestone(
	posthog: ReturnType<typeof usePostHog> | null,
	streakLength: number,
	milestone: number,
	studyDate: string,
	timezone: string,
): void {
	trackEvent(posthog, "streak_milestone", {
		milestone,
		streakLength,
		studyDate,
		timezone,
	});
}

/**
 * Track funnel analysis events
 */
export function trackSessionStarted(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	studyMode: "basic" | "spaced-repetition",
	sessionId: string,
	deckName?: string,
	cardCount?: number,
): void {
	trackEvent(posthog, "session_started", {
		cardCount,
		deckId,
		deckName,
		sessionId,
		studyMode,
	});
}

export function trackCardsReviewed(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	sessionId: string,
	cardsReviewed: number,
	studyMode: "basic" | "spaced-repetition",
	timeElapsed: number,
): void {
	trackEvent(posthog, "cards_reviewed", {
		cardsReviewed,
		deckId,
		sessionId,
		studyMode,
		timeElapsed,
	});
}

export function trackSessionCompleted(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	sessionId: string,
	cardsReviewed: number,
	studyMode: "basic" | "spaced-repetition",
	sessionDuration: number,
	completionRate: number,
	enhancedMetrics?: {
		averageTimePerCard?: number;
		correctAnswers?: number;
		incorrectAnswers?: number;
	},
): void {
	trackEvent(posthog, "session_completed", {
		cardsReviewed,
		completionRate,
		deckId,
		sessionDuration,
		sessionId,
		studyMode,
		...enhancedMetrics,
	});
}

/**
 * Error Tracking Functions
 * These functions provide comprehensive error tracking with context
 */

/**
 * Get current app context for error reporting
 */
function getErrorContext(): {
	userAgent?: string;
	currentRoute?: string;
	timestamp: number;
	viewport?: string;
} {
	try {
		return {
			currentRoute: window.location.pathname + window.location.search,
			timestamp: Date.now(),
			userAgent: navigator.userAgent,
			viewport: `${window.innerWidth}x${window.innerHeight}`,
		};
	} catch {
		return {
			timestamp: Date.now(),
		};
	}
}

/**
 * Error rate limiting to prevent spam
 */
const errorRateLimit = new Map<string, { count: number; lastReset: number }>();
const ERROR_RATE_LIMIT_WINDOW = 60000; // 1 minute
const ERROR_RATE_LIMIT_MAX = 10; // Max 10 errors per minute per error type

function shouldRateLimit(errorKey: string): boolean {
	const now = Date.now();
	const current = errorRateLimit.get(errorKey);

	if (!current || now - current.lastReset > ERROR_RATE_LIMIT_WINDOW) {
		errorRateLimit.set(errorKey, { count: 1, lastReset: now });
		return false;
	}

	if (current.count >= ERROR_RATE_LIMIT_MAX) {
		return true;
	}

	current.count++;
	return false;
}

/**
 * Enhanced error categorization
 */
export type ErrorCategory =
	| "network_error"
	| "validation_error"
	| "authentication_error"
	| "permission_error"
	| "data_corruption"
	| "performance_error"
	| "ui_error"
	| "integration_error"
	| "unknown_error";

export function categorizeError(error: Error): ErrorCategory {
	const message = error.message.toLowerCase();
	const stack = error.stack?.toLowerCase() || "";

	// Network errors
	if (
		message.includes("network") ||
		message.includes("fetch") ||
		message.includes("timeout")
	) {
		return "network_error";
	}

	// Authentication errors
	if (
		message.includes("auth") ||
		message.includes("token") ||
		message.includes("unauthorized")
	) {
		return "authentication_error";
	}

	// Permission errors
	if (
		message.includes("permission") ||
		message.includes("forbidden") ||
		message.includes("access denied")
	) {
		return "permission_error";
	}

	// Validation errors
	if (
		message.includes("validation") ||
		message.includes("invalid") ||
		message.includes("required")
	) {
		return "validation_error";
	}

	// Performance errors
	if (
		message.includes("timeout") ||
		message.includes("slow") ||
		message.includes("performance")
	) {
		return "performance_error";
	}

	// UI errors
	if (
		stack.includes("react") ||
		stack.includes("component") ||
		message.includes("render")
	) {
		return "ui_error";
	}

	// Integration errors (Convex, Clerk, etc.)
	if (
		message.includes("convex") ||
		message.includes("clerk") ||
		stack.includes("convex")
	) {
		return "integration_error";
	}

	return "unknown_error";
}

/**
 * Enhanced error context with performance metrics
 */
function getEnhancedErrorContext() {
	const baseContext = getErrorContext();

	return {
		...baseContext,
		connectionType:
			(hasConnectionAPI(navigator) && navigator.connection?.effectiveType) ||
			"unknown",
		cookiesEnabled: navigator.cookieEnabled,
		// Browser state
		isOnline: navigator.onLine,
		// Performance metrics
		memoryUsage:
			hasMemoryAPI(performance) && performance.memory
				? {
						jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
						totalJSHeapSize: performance.memory.totalJSHeapSize,
						usedJSHeapSize: performance.memory.usedJSHeapSize,
					}
				: undefined,
		screenHeight: window.screen.height,
		screenWidth: window.screen.width,
		viewportHeight: window.innerHeight,
		// Viewport info
		viewportWidth: window.innerWidth,
	};
}

/**
 * Capture general errors with enhanced context and categorization
 */
export function captureError(
	posthog: ReturnType<typeof usePostHog> | null,
	error: Error,
	context?: {
		userId?: string;
		deckId?: string;
		cardId?: string;
		component?: string;
		action?: string;
		severity?: "low" | "medium" | "high" | "critical";
		recoverable?: boolean;
		category?: ErrorCategory;
		fingerprint?: string; // For error grouping
		tags?: Record<string, string>;
		additionalData?: Record<string, unknown>;
	},
): void {
	if (!posthog || !hasAnalyticsConsent()) {
		console.error("Error captured (analytics disabled):", error, context);
		return;
	}

	try {
		// Auto-categorize error if not provided
		const category = context?.category || categorizeError(error);

		// Create error fingerprint for grouping
		const fingerprint =
			context?.fingerprint ||
			`${category}_${error.name}_${context?.component || "unknown"}`;

		// Rate limiting check
		if (shouldRateLimit(fingerprint)) {
			console.warn("Error rate limited:", fingerprint);
			return;
		}

		const errorContext = getEnhancedErrorContext();

		// Use PostHog's built-in exception capture with enhanced context
		posthog.captureException(error, {
			action: context?.action,
			cardId: context?.cardId,
			component: context?.component,
			deckId: context?.deckId,
			// Core error info
			errorCategory: category,
			errorFingerprint: fingerprint,
			recoverable: context?.recoverable ?? true,
			severity: context?.severity || "medium",

			// User and app context
			userId: context?.userId,

			// Tags for filtering
			...context?.tags,

			// Enhanced context
			...errorContext,

			// Additional data
			...context?.additionalData,
		});

		// Log in development for debugging
		if (getEnvironmentMode() === "development") {
			console.error("Error captured:", {
				category,
				context,
				error,
				errorContext,
				fingerprint,
			});
		}
	} catch (captureError) {
		console.error("Failed to capture error:", captureError);
	}
}

/**
 * Capture async operation failures
 */
export function captureAsyncError(
	posthog: ReturnType<typeof usePostHog> | null,
	operationType: string,
	error: Error,
	context?: {
		operationContext?: Record<string, unknown>;
		retryAttempt?: number;
		timeoutDuration?: number;
		userId?: string;
	},
): void {
	trackEvent(posthog, "async_operation_failed", {
		errorMessage: error.message,
		operationContext: context?.operationContext,
		operationType,
		retryAttempt: context?.retryAttempt,
		timeoutDuration: context?.timeoutDuration,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: operationType,
		additionalData: context?.operationContext,
		component: "AsyncOperation",
		severity: "medium",
		userId: context?.userId,
	});
}

/**
 * Capture user-reported errors
 */
export function captureUserReportedError(
	posthog: ReturnType<typeof usePostHog> | null,
	errorDescription: string,
	context?: {
		userEmail?: string;
		reproductionSteps?: string;
		severity?: "low" | "medium" | "high" | "critical";
		category?:
			| "ui_bug"
			| "data_loss"
			| "performance"
			| "feature_request"
			| "other";
	},
): void {
	const errorContext = getEnhancedErrorContext();

	trackEvent(posthog, "user_reported_error", {
		category: context?.category || "other",
		currentRoute: errorContext.currentRoute,
		errorDescription,
		reproductionSteps: context?.reproductionSteps,
		severity: context?.severity || "medium",
		userEmail: context?.userEmail,
		...errorContext,
	});
}

/**
 * Track form validation errors
 */
export function trackFormValidationError(
	posthog: ReturnType<typeof usePostHog> | null,
	formName: string,
	validationErrors: Record<string, string[]>,
	context?: {
		userId?: string;
		formData?: Record<string, unknown>;
		attemptNumber?: number;
	},
): void {
	if (!posthog || !hasAnalyticsConsent()) return;

	const errorCount = Object.keys(validationErrors).length;
	const totalErrors = Object.values(validationErrors).flat().length;

	trackEvent(posthog, "form_validation_error", {
		attemptNumber: context?.attemptNumber || 1,
		errorCount,
		errorFields: Object.keys(validationErrors),
		formDataKeys: context?.formData ? Object.keys(context.formData) : [],
		formName,
		totalErrors,
		userId: context?.userId,
		validationErrors: JSON.stringify(validationErrors),
	});
}

/**
 * Track form submission errors
 */
export function trackFormSubmissionError(
	posthog: ReturnType<typeof usePostHog> | null,
	formName: string,
	error: Error,
	context?: {
		userId?: string;
		formData?: Record<string, unknown>;
		submissionAttempt?: number;
		timeToSubmit?: number;
	},
): void {
	if (!posthog || !hasAnalyticsConsent()) return;

	trackEvent(posthog, "form_submission_error", {
		errorMessage: error.message,
		errorType: error.name,
		formDataKeys: context?.formData ? Object.keys(context.formData) : [],
		formName,
		submissionAttempt: context?.submissionAttempt || 1,
		timeToSubmit: context?.timeToSubmit,
		userId: context?.userId,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: `submit_${formName}`,
		additionalData: {
			formDataKeys: context?.formData ? Object.keys(context.formData) : [],
			timeToSubmit: context?.timeToSubmit,
		},
		category: "validation_error",
		component: "FormSubmission",
		severity: "medium",
		tags: {
			formName,
			submissionAttempt: String(context?.submissionAttempt || 1),
		},
		userId: context?.userId,
	});
}

/**
 * Track performance errors and slow operations
 */
export function trackPerformanceError(
	posthog: ReturnType<typeof usePostHog> | null,
	operationType: string,
	duration: number,
	context?: {
		userId?: string;
		deckId?: string;
		cardId?: string;
		threshold?: number;
		operationData?: Record<string, unknown>;
	},
): void {
	if (!posthog || !hasAnalyticsConsent()) return;

	const threshold = context?.threshold || 5000; // Default 5 second threshold
	const isSlowOperation = duration > threshold;

	if (isSlowOperation) {
		trackEvent(posthog, "performance_error", {
			cardId: context?.cardId,
			deckId: context?.deckId,
			duration,
			operationData: context?.operationData,
			operationType,
			severity: duration > threshold * 2 ? "high" : "medium",
			threshold,
			userId: context?.userId,
		});

		// Create a synthetic error for the slow operation
		const performanceError = new Error(
			`Slow operation: ${operationType} took ${duration}ms`,
		);
		captureError(posthog, performanceError, {
			action: operationType,
			additionalData: context?.operationData,
			cardId: context?.cardId,
			category: "performance_error",
			component: "PerformanceMonitor",
			deckId: context?.deckId,
			severity: duration > threshold * 2 ? "high" : "medium",
			tags: {
				duration: String(duration),
				operationType,
				threshold: String(threshold),
			},
			userId: context?.userId,
		});
	}
}

/**
 * Flashcard-specific error tracking functions
 */

/**
 * Track Convex query failures
 */
export function trackConvexQueryError(
	posthog: ReturnType<typeof usePostHog> | null,
	queryName: string,
	error: Error,
	context?: {
		userId?: string;
		deckId?: string;
		cardId?: string;
		retryAttempt?: number;
		queryArgs?: Record<string, unknown>;
	},
): void {
	trackEvent(posthog, "convex_query_failed", {
		cardId: context?.cardId,
		deckId: context?.deckId,
		errorCode:
			error instanceof Error && "code" in error
				? String((error as Error & { code: unknown }).code)
				: undefined,
		errorMessage: error.message,
		queryArgs: context?.queryArgs,
		queryName,
		retryAttempt: context?.retryAttempt,
		userId: context?.userId,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: queryName,
		additionalData: context?.queryArgs,
		cardId: context?.cardId,
		component: "ConvexQuery",
		deckId: context?.deckId,
		severity: "high",
		userId: context?.userId,
	});
}

/**
 * Track Convex mutation failures
 */
export function trackConvexMutationError(
	posthog: ReturnType<typeof usePostHog> | null,
	mutationName: string,
	error: Error,
	context?: {
		userId?: string;
		deckId?: string;
		cardId?: string;
		retryAttempt?: number;
		mutationArgs?: Record<string, unknown>;
	},
): void {
	trackEvent(posthog, "convex_mutation_failed", {
		cardId: context?.cardId,
		deckId: context?.deckId,
		errorCode:
			error instanceof Error && "code" in error
				? String((error as Error & { code: unknown }).code)
				: undefined,
		errorMessage: error.message,
		mutationArgs: context?.mutationArgs,
		mutationName,
		retryAttempt: context?.retryAttempt,
		userId: context?.userId,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: mutationName,
		additionalData: context?.mutationArgs,
		cardId: context?.cardId,
		component: "ConvexMutation",
		deckId: context?.deckId,
		severity: "critical", // Mutations are more critical than queries
		userId: context?.userId,
	});
}

/**
 * Track authentication errors
 */
export function trackAuthenticationError(
	posthog: ReturnType<typeof usePostHog> | null,
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
): void {
	const errorContext = getErrorContext();

	trackEvent(posthog, "authentication_error", {
		attemptedAction: context?.attemptedAction,
		currentRoute: errorContext.currentRoute,
		errorMessage: error.message,
		errorType,
		userId: context?.userId,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: context?.attemptedAction || "auth_check",
		additionalData: { errorType },
		component: "Authentication",
		severity: "high",
		userId: context?.userId,
	});
}

/**
 * Track card loading errors
 */
export function trackCardLoadingError(
	posthog: ReturnType<typeof usePostHog> | null,
	deckId: string,
	error: Error,
	context?: {
		cardId?: string;
		studyMode?: "basic" | "spaced-repetition";
		loadingStage?: "initial_load" | "flip_animation" | "content_render";
	},
): void {
	trackEvent(posthog, "card_loading_error", {
		cardId: context?.cardId,
		deckId,
		errorMessage: error.message,
		loadingStage: context?.loadingStage || "initial_load",
		studyMode: context?.studyMode,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: context?.loadingStage || "load_card",
		additionalData: { studyMode: context?.studyMode },
		cardId: context?.cardId,
		component: "CardLoader",
		deckId,
		severity: "medium",
	});
}

/**
 * Track study session errors
 */
export function trackStudySessionError(
	posthog: ReturnType<typeof usePostHog> | null,
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
): void {
	trackEvent(posthog, "study_session_error", {
		cardsReviewed: context?.cardsReviewed,
		deckId,
		errorMessage: error.message,
		errorType,
		sessionId: context?.sessionId,
		studyMode: context?.studyMode,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: errorType,
		additionalData: {
			cardsReviewed: context?.cardsReviewed,
			sessionId: context?.sessionId,
			studyMode: context?.studyMode,
		},
		component: "StudySession",
		deckId,
		severity: errorType === "progress_save" ? "critical" : "high",
	});
}

/**
 * Track error boundary triggers
 */
export function trackErrorBoundary(
	posthog: ReturnType<typeof usePostHog> | null,
	error: Error,
	errorInfo: {
		componentStack?: string;
	},
	context?: {
		userId?: string;
		errorBoundary?: string;
		recoverable?: boolean;
	},
): void {
	const errorContext = getErrorContext();

	trackEvent(posthog, "error_boundary_triggered", {
		componentStack: errorInfo.componentStack,
		currentRoute: errorContext.currentRoute,
		errorBoundary: context?.errorBoundary || "RootErrorBoundary",
		errorMessage: error.message,
		errorStack: error.stack,
		recoverable: context?.recoverable ?? false,
		timestamp: errorContext.timestamp,
		userAgent: errorContext.userAgent,
		userId: context?.userId,
	});

	// Also capture the full error
	captureError(posthog, error, {
		action: "component_error",
		additionalData: {
			componentStack: errorInfo.componentStack,
			viewport: errorContext.viewport,
		},
		component: context?.errorBoundary || "ErrorBoundary",
		recoverable: context?.recoverable ?? false,
		severity: "critical",
		userId: context?.userId,
	});
}

/**
 * Analytics Queue for batching events to improve performance
 * Automatically flushes events based on batch size or time interval
 */
class AnalyticsQueue {
	private queue: QueuedEvent[] = [];
	private flushInterval: ReturnType<typeof setInterval> | null = null;
	private readonly BATCH_SIZE = 10;
	private readonly FLUSH_INTERVAL = 5000; // 5 seconds

	constructor(private posthog: ReturnType<typeof usePostHog> | null) {
		this.startFlushTimer();
	}

	enqueue<E extends AnalyticsEvent>(
		event: E,
		properties: AnalyticsEventData[E],
		featureFlags?: Record<string, boolean | string | number>,
	): void {
		this.queue.push({
			event,
			featureFlags,
			properties,
			timestamp: Date.now(),
		});

		if (this.queue.length >= this.BATCH_SIZE) {
			this.flush();
		}
	}

	private flush(): void {
		if (this.queue.length === 0 || !this.posthog) return;

		const events = this.queue.splice(0);

		// Send events in batch
		events.forEach(({ event, properties, featureFlags }) => {
			try {
				const eventProperties = {
					...properties,
					...featureFlags,
				};
				this.posthog?.capture(event, eventProperties);
			} catch (error) {
				console.error("Failed to send batched event:", event, error);
			}
		});

		// Log in development for debugging
		if (getEnvironmentMode() === "development") {
			console.log("Analytics batch flushed:", events.length, "events");
		}
	}

	private startFlushTimer(): void {
		this.flushInterval = setInterval(() => {
			this.flush();
		}, this.FLUSH_INTERVAL);
	}

	destroy(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
		}
		this.flush(); // Send remaining events
	}
}

/**
 * Privacy compliance utilities with GDPR/CCPA support
 */
export const PRIVACY_STORAGE_KEY = "flashcard_privacy_settings";
export const PRIVACY_BANNER_KEY = "flashcard_privacy_banner_shown";

export interface GDPRSettings {
	consentGiven: boolean;
	consentDate?: string;
	dataProcessingPurposes: {
		analytics: boolean;
		functional: boolean;
		marketing: boolean;
		performance: boolean;
	};
	dataRetentionPeriod: number; // days
	anonymizeData: boolean;
	allowCookies: boolean;
}

export interface CCPASettings {
	doNotSell: boolean;
	optOutDate?: string;
	dataCategories: {
		personalInfo: boolean;
		behavioralData: boolean;
		deviceInfo: boolean;
	};
}

export interface EnhancedPrivacySettings extends PrivacySettings {
	gdpr?: GDPRSettings;
	ccpa?: CCPASettings;
	region?: "EU" | "CA" | "US" | "OTHER";
	lastUpdated?: string;
}

export function getPrivacySettings(): PrivacySettings {
	try {
		const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.warn("Failed to load privacy settings:", error);
	}

	// Default to pending consent
	return {
		analyticsConsent: "pending",
		functionalConsent: "pending",
		marketingConsent: "pending",
	};
}

export function getEnhancedPrivacySettings(): EnhancedPrivacySettings {
	try {
		const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
		if (stored) {
			const settings = JSON.parse(stored);
			// Migrate old settings to new format if needed
			if (!settings.gdpr && !settings.ccpa) {
				return migrateToEnhancedSettings(settings);
			}
			return settings;
		}
	} catch (error) {
		console.warn("Failed to load enhanced privacy settings:", error);
	}

	// Default enhanced settings
	return {
		analyticsConsent: "pending",
		ccpa: {
			dataCategories: {
				behavioralData: false,
				deviceInfo: false,
				personalInfo: false,
			},
			doNotSell: false,
		},
		functionalConsent: "pending",
		gdpr: {
			allowCookies: false,
			anonymizeData: true,
			consentGiven: false,
			dataProcessingPurposes: {
				analytics: false,
				functional: false,
				marketing: false,
				performance: false,
			},
			dataRetentionPeriod: 365,
		},
		lastUpdated: new Date().toISOString(),
		marketingConsent: "pending",
		region: detectUserRegion(),
	};
}

function migrateToEnhancedSettings(
	oldSettings: PrivacySettings,
): EnhancedPrivacySettings {
	return {
		...oldSettings,
		ccpa: {
			dataCategories: {
				behavioralData: oldSettings.analyticsConsent === "granted",
				deviceInfo: oldSettings.functionalConsent === "granted",
				personalInfo: oldSettings.analyticsConsent === "granted",
			},
			doNotSell: oldSettings.analyticsConsent === "denied",
		},
		gdpr: {
			allowCookies: oldSettings.analyticsConsent === "granted",
			anonymizeData: true,
			consentDate:
				oldSettings.analyticsConsent === "granted"
					? new Date().toISOString()
					: undefined,
			consentGiven: oldSettings.analyticsConsent === "granted",
			dataProcessingPurposes: {
				analytics: oldSettings.analyticsConsent === "granted",
				functional: oldSettings.functionalConsent === "granted",
				marketing: oldSettings.marketingConsent === "granted",
				performance: oldSettings.analyticsConsent === "granted",
			},
			dataRetentionPeriod: 365,
		},
		lastUpdated: new Date().toISOString(),
		region: detectUserRegion(),
	};
}

function detectUserRegion(): "EU" | "CA" | "US" | "OTHER" {
	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (timezone.includes("Europe/")) return "EU";
		if (
			timezone.includes("America/") &&
			(timezone.includes("Toronto") || timezone.includes("Vancouver"))
		)
			return "CA";
		if (timezone.includes("America/")) return "US";
		return "OTHER";
	} catch {
		return "OTHER";
	}
}

export function setPrivacySettings(settings: PrivacySettings): void {
	try {
		localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(settings));
	} catch (error) {
		console.warn("Failed to save privacy settings:", error);
	}
}

export function setEnhancedPrivacySettings(
	settings: EnhancedPrivacySettings,
): void {
	try {
		const updatedSettings = {
			...settings,
			lastUpdated: new Date().toISOString(),
		};
		localStorage.setItem(PRIVACY_STORAGE_KEY, JSON.stringify(updatedSettings));
	} catch (error) {
		console.warn("Failed to save enhanced privacy settings:", error);
	}
}

export function hasAnalyticsConsent(): boolean {
	const settings = getPrivacySettings();
	return settings.analyticsConsent === "granted";
}

export function shouldShowPrivacyBanner(): boolean {
	try {
		const bannerShown = localStorage.getItem(PRIVACY_BANNER_KEY);
		const settings = getPrivacySettings();
		return !bannerShown && settings.analyticsConsent === "pending";
	} catch {
		return true;
	}
}

export function markPrivacyBannerShown(): void {
	try {
		localStorage.setItem(PRIVACY_BANNER_KEY, "true");
	} catch (error) {
		console.warn("Failed to mark privacy banner as shown:", error);
	}
}

/**
 * Cryptographically secure hash function for data anonymization
 * Uses SHA-256 to create irreversible hashes for GDPR compliance
 */
async function hashString(str: string): Promise<string> {
	try {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex.substring(0, 8);
	} catch (error) {
		console.warn(
			"Failed to hash string with crypto.subtle, falling back to simple hash:",
			error,
		);
		// Fallback to a simple hash if crypto.subtle is not available
		return simpleHash(str);
	}
}

/**
 * Simple hash function fallback for environments where crypto.subtle is not available
 * Note: This is not cryptographically secure and should only be used as a fallback
 */
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Anonymize user data for GDPR compliance
 * Uses cryptographically secure SHA-256 hashing to irreversibly anonymize sensitive fields
 *
 * @param data - The data object to anonymize
 * @returns Promise<Record<string, any>> - The anonymized data object
 *
 * @example
 * const userData = { email: 'user@example.com', name: 'John Doe', age: 30 };
 * const anonymized = await anonymizeUserData(userData);
 * // Result: { email: 'anon_a1b2c3d4', name: 'anon_e5f6g7h8', age: 30 }
 */
export async function anonymizeUserData(
	data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const settings = getEnhancedPrivacySettings();
	if (!settings.gdpr?.anonymizeData) {
		return data;
	}

	const anonymized = { ...data };

	// Remove or hash sensitive fields
	const sensitiveFields = ["email", "name", "ip", "userId", "distinctId"];

	for (const field of sensitiveFields) {
		if (anonymized[field] && typeof anonymized[field] === "string") {
			// Use proper cryptographic hash function for anonymization
			anonymized[field] =
				`anon_${await hashString(anonymized[field] as string)}`;
		}
	}

	return anonymized;
}

/**
 * Synchronous version of anonymizeUserData for cases where async operations are not suitable
 * Uses a simple hash function as fallback - less secure but still better than btoa
 *
 * @param data - The data object to anonymize
 * @returns Record<string, any> - The anonymized data object
 *
 * @deprecated Use anonymizeUserData (async version) when possible for better security
 */
export function anonymizeUserDataSync(
	data: Record<string, unknown>,
): Record<string, unknown> {
	const settings = getEnhancedPrivacySettings();
	if (!settings.gdpr?.anonymizeData) {
		return data;
	}

	const anonymized = { ...data };

	// Remove or hash sensitive fields
	const sensitiveFields = ["email", "name", "ip", "userId", "distinctId"];

	sensitiveFields.forEach((field) => {
		if (anonymized[field] && typeof anonymized[field] === "string") {
			// Use simple hash function for synchronous operation
			anonymized[field] = `anon_${simpleHash(anonymized[field] as string)}`;
		}
	});

	return anonymized;
}

/**
 * Feature flag utilities
 */
export function trackFeatureInteraction(
	posthog: ReturnType<typeof usePostHog> | null,
	flagKey: string,
	variant?: string,
): void {
	if (!posthog || !hasAnalyticsConsent()) return;

	try {
		posthog.capture("$feature_interaction", {
			$set: { [`$feature_interaction/${flagKey}`]: true },
			feature_flag: flagKey,
		});

		if (variant) {
			posthog.capture("$feature_flag_called", {
				$feature_flag: flagKey,
				$feature_flag_response: variant,
			});
		}
	} catch (error) {
		console.error("Failed to track feature interaction:", flagKey, error);
	}
}

/**
 * User cohort analysis utilities
 */
export function getWeekOfYear(date: Date): number {
	const start = new Date(date.getFullYear(), 0, 1);
	const diff = date.getTime() - start.getTime();
	const oneWeek = 1000 * 60 * 60 * 24 * 7;
	return Math.floor(diff / oneWeek) + 1;
}

export function getUserStudyPersona(
	props: Partial<UserCohortProperties>,
): string {
	if (props.studyGoal === "exam_prep") return "exam_focused";
	if (props.experienceLevel === "beginner") return "learning_basics";
	if (props.preferredStudyTime === "morning") return "morning_studier";
	return "general_learner";
}

export function identifyUserWithCohorts(
	posthog: ReturnType<typeof usePostHog> | null,
	userId: string,
	userProperties: {
		email?: string;
		name?: string;
		signupDate?: string;
		studyGoal?: "casual" | "intensive" | "exam_prep";
		preferredStudyTime?: "morning" | "afternoon" | "evening";
		experienceLevel?: "beginner" | "intermediate" | "advanced";
	},
): void {
	if (!posthog || !hasAnalyticsConsent()) return;

	try {
		const signupDate = new Date(userProperties.signupDate || Date.now());
		const cohortProperties: UserCohortProperties = {
			engagementTier: "new_user",
			experienceLevel: userProperties.experienceLevel,
			preferredStudyTime: userProperties.preferredStudyTime,
			signupDate: signupDate.toISOString().split("T")[0],
			signupMonth: signupDate.getMonth() + 1, // Will be updated based on usage
			// Signup cohort
			signupWeek: getWeekOfYear(signupDate),

			// User preferences
			studyGoal: userProperties.studyGoal,

			// Behavioral cohorts
			studyPersona: getUserStudyPersona(userProperties),
		};

		posthog.identify(userId, {
			...userProperties,
			...cohortProperties,
		});
	} catch (error) {
		console.error("Failed to identify user with cohorts:", error);
	}
}

/**
 * Hook to get PostHog instance with error handling
 */
export function useAnalytics() {
	const posthog = usePostHog();
	const configValidation = validatePostHogConfig();

	return {
		// Error tracking functions
		captureError: (
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				component?: string;
				action?: string;
				severity?: "low" | "medium" | "high" | "critical";
				recoverable?: boolean;
				additionalData?: Record<string, unknown>;
			},
		) => captureError(posthog, error, context),
		configValidation,
		isConfigured: configValidation.isValid,
		posthog,
		trackCardCreated: (cardId?: string, deckName?: string) =>
			trackCardCreated(posthog, cardId, deckName),
		trackCardFlipped: (
			cardId: string,
			deckId: string,
			flipDirection: "front_to_back" | "back_to_front",
			timeToFlip?: number,
		) => trackCardFlipped(posthog, cardId, deckId, flipDirection, timeToFlip),
		trackConvexMutationError: (
			mutationName: string,
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				retryAttempt?: number;
				mutationArgs?: Record<string, unknown>;
			},
		) => trackConvexMutationError(posthog, mutationName, error, context),
		trackConvexQueryError: (
			queryName: string,
			error: Error,
			context?: {
				userId?: string;
				deckId?: string;
				cardId?: string;
				retryAttempt?: number;
				queryArgs?: Record<string, unknown>;
			},
		) => trackConvexQueryError(posthog, queryName, error, context),
		trackDeckCreated: (deckId?: string, deckName?: string) =>
			trackDeckCreated(posthog, deckId, deckName),
		trackDeckDeleted: (
			deckId?: string,
			deckName?: string,
			cardCount?: number,
		) => trackDeckDeleted(posthog, deckId, deckName, cardCount),
		trackDeckUpdated: (deckId?: string, deckName?: string) =>
			trackDeckUpdated(posthog, deckId, deckName),
		trackDifficultyRated: (
			cardId: string,
			deckId: string,
			difficulty: "easy" | "medium" | "hard",
			previousDifficulty?: string,
		) =>
			trackDifficultyRated(
				posthog,
				cardId,
				deckId,
				difficulty,
				previousDifficulty,
			),
		trackStudySessionCompleted: (
			deckId: string,
			deckName: string | undefined,
			cardsReviewed: number,
			studyMode: "basic" | "spaced-repetition",
			sessionDuration?: number,
			enhancedMetrics?: {
				averageTimePerCard?: number;
				correctAnswers?: number;
				incorrectAnswers?: number;
				cardsSkipped?: number;
				completionRate?: number;
				focusTime?: number;
			},
		) =>
			trackStudySessionCompleted(
				posthog,
				deckId,
				deckName,
				cardsReviewed,
				studyMode,
				sessionDuration,
				enhancedMetrics,
			),
		trackStudySessionStarted: (
			deckId: string,
			deckName?: string,
			cardCount?: number,
		) => trackStudySessionStarted(posthog, deckId, deckName, cardCount),
		trackUserSignUp: () => trackUserSignUp(posthog),
	};
}

/**
 * Enhanced analytics hook with batching, feature flags, and privacy compliance
 */
export function useAnalyticsEnhanced() {
	const posthog = usePostHog();
	const configValidation = validatePostHogConfig();
	const queueRef = useRef<AnalyticsQueue | null>(null);

	useEffect(() => {
		queueRef.current = new AnalyticsQueue(posthog);

		return () => {
			queueRef.current?.destroy();
		};
	}, [posthog]);

	const trackEventBatched = useCallback(
		<E extends AnalyticsEvent>(
			event: E,
			properties: AnalyticsEventData[E],
			includeFlags: string[] = [],
		) => {
			if (!hasAnalyticsConsent()) {
				console.log("Analytics tracking skipped - no consent");
				return;
			}

			const flagContext: Record<string, boolean | string | number> = {};
			includeFlags.forEach((flagKey) => {
				if (posthog) {
					const flagValue = posthog.getFeatureFlag(flagKey);
					if (flagValue !== undefined) {
						flagContext[`$feature/${flagKey}`] = flagValue;
					}
				}
			});

			queueRef.current?.enqueue(event, properties, flagContext);
		},
		[posthog],
	);

	const trackFeatureFlag = useCallback(
		(flagKey: string, variant?: string) => {
			trackFeatureInteraction(posthog, flagKey, variant);
		},
		[posthog],
	);

	const identifyUser = useCallback(
		(
			userId: string,
			userProperties: Parameters<typeof identifyUserWithCohorts>[2],
		) => {
			identifyUserWithCohorts(posthog, userId, userProperties);
		},
		[posthog],
	);

	return {
		configValidation,
		hasConsent: hasAnalyticsConsent(),
		identifyUser,
		isConfigured: configValidation.isValid,
		posthog,
		trackEventBatched,
		trackFeatureFlag,
	};
}

/**
 * Privacy-compliant analytics hook
 */
export function usePrivacyCompliantAnalytics() {
	const posthog = usePostHog();
	const [privacySettings, setPrivacySettingsState] =
		useState<PrivacySettings>(getPrivacySettings);

	useEffect(() => {
		// Load privacy settings on mount
		setPrivacySettingsState(getPrivacySettings());
	}, []);

	const trackWithConsent = useCallback(
		<E extends AnalyticsEvent>(event: E, ...props: PropsArg<E>) => {
			if (privacySettings.analyticsConsent === "denied") {
				console.log("Analytics tracking skipped - consent denied");
				return;
			}

			if (privacySettings.analyticsConsent === "granted") {
				trackEvent(posthog, event, ...props);
			}
			// If consent is pending, we don't track
		},
		[posthog, privacySettings.analyticsConsent],
	);

	const grantConsent = useCallback(
		(type: keyof PrivacySettings = "analyticsConsent") => {
			const newSettings = {
				...privacySettings,
				[type]: "granted" as ConsentStatus,
			};
			setPrivacySettings(newSettings);
			setPrivacySettingsState(newSettings);

			if (type === "analyticsConsent") {
				posthog?.opt_in_capturing();
			}
		},
		[posthog, privacySettings],
	);

	const revokeConsent = useCallback(
		(type: keyof PrivacySettings = "analyticsConsent") => {
			const newSettings = {
				...privacySettings,
				[type]: "denied" as ConsentStatus,
			};
			setPrivacySettings(newSettings);
			setPrivacySettingsState(newSettings);

			if (type === "analyticsConsent") {
				posthog?.opt_out_capturing();
			}
		},
		[posthog, privacySettings],
	);

	return {
		grantConsent,
		hasAnalyticsConsent: privacySettings.analyticsConsent === "granted",
		privacySettings,
		revokeConsent,
		trackWithConsent,
	};
}

/**
 * Utility to check if user has already been tracked for registration
 * Uses localStorage to prevent duplicate registration events
 */
export function hasUserBeenTrackedForRegistration(): boolean {
	try {
		return localStorage.getItem("posthog_user_registered") === "true";
	} catch {
		return false;
	}
}

/**
 * Mark user as tracked for registration
 */
export function markUserAsTrackedForRegistration(): void {
	try {
		localStorage.setItem("posthog_user_registered", "true");
	} catch (error) {
		console.warn("Failed to mark user as tracked for registration:", error);
	}
}
