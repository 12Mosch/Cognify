/**
 * Date utility functions for formatting and calculating time differences
 * Used primarily for spaced repetition scheduling and user-friendly date displays
 */

/**
 * Get the user's current timezone identifier
 * @returns IANA timezone identifier (e.g., "America/New_York")
 */
export function getUserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the current date in the user's local timezone as YYYY-MM-DD
 * @param timeZone - Optional IANA timezone identifier. If not provided, uses user's current timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(timeZone?: string): string {
	const tz = timeZone || getUserTimeZone();
	const now = new Date();

	// Use Intl.DateTimeFormat to get the date in the user's timezone
	const formatter = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		// en-CA gives us YYYY-MM-DD format
		timeZone: tz,
		year: "numeric",
	});

	return formatter.format(now);
}

/**
 * Format a timestamp into a user-friendly "next review" message
 * @param timestamp - Unix timestamp in milliseconds
 * @param locale - Optional locale for date formatting (defaults to 'en')
 * @returns Formatted string like "Tomorrow", "in 3 hours", "on Dec 25", etc.
 */
export function formatNextReviewTime(
	timestamp: number,
	locale: string = "en",
): string {
	const now = Date.now();
	const diffMs = timestamp - now;

	// If the time is in the past, return "now"
	if (diffMs <= 0) {
		return "now";
	}

	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	// Less than 1 hour
	if (diffMinutes < 60) {
		if (diffMinutes === 0) {
			return "now";
		}
		if (diffMinutes === 1) {
			return "in 1 minute";
		}
		return `in ${diffMinutes} minutes`;
	}

	// Less than 24 hours
	if (diffHours < 24) {
		if (diffHours === 1) {
			return "in 1 hour";
		}
		return `in ${diffHours} hours`;
	}

	// Tomorrow (next day)
	if (diffDays === 1) {
		return "tomorrow";
	}

	// Within a week
	if (diffDays < 7) {
		return `in ${diffDays} days`;
	}

	// More than a week - show specific date
	const date = new Date(timestamp);
	const today = new Date();

	// Same year - show month and day
	if (date.getFullYear() === today.getFullYear()) {
		return `on ${date.toLocaleDateString(locale, {
			day: "numeric",
			month: "short",
		})}`;
	}

	// Different year - show month, day, and year
	return `on ${date.toLocaleDateString(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	})}`;
}

/**
 * Check if a timestamp is today in the user's local timezone
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if the timestamp is today in local timezone
 */
export function isToday(timestamp: number): boolean {
	const date = new Date(timestamp);
	const today = new Date();

	return (
		date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear()
	);
}

/**
 * Check if a timestamp is tomorrow in the user's local timezone
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if the timestamp is tomorrow in local timezone
 */
export function isTomorrow(timestamp: number): boolean {
	const date = new Date(timestamp);
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);

	return (
		date.getDate() === tomorrow.getDate() &&
		date.getMonth() === tomorrow.getMonth() &&
		date.getFullYear() === tomorrow.getFullYear()
	);
}

/**
 * Get the start of today (midnight) in UTC timezone as a timestamp
 * @returns Unix timestamp for the start of today in UTC
 * @deprecated Use getStartOfTodayLocal() for user's local timezone or rename usage to clarify UTC intent
 */
export function getStartOfTodayUTC(): number {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	return today.getTime();
}

/**
 * Get the end of today (23:59:59.999) in UTC timezone as a timestamp
 * @returns Unix timestamp for the end of today in UTC
 * @deprecated Use getEndOfTodayLocal() for user's local timezone or rename usage to clarify UTC intent
 */
export function getEndOfTodayUTC(): number {
	const today = new Date();
	today.setUTCHours(23, 59, 59, 999);
	return today.getTime();
}

/**
 * Get the start of today (midnight) in the user's local timezone as a timestamp
 * @param timeZone - Optional IANA timezone identifier. If not provided, uses user's current timezone
 * @returns Unix timestamp for the start of today in the specified timezone
 */
export function getStartOfTodayLocal(timeZone?: string): number {
	const tz = timeZone || getUserTimeZone();
	const localDateString = getLocalDateString(tz);

	// Parse the local date string (YYYY-MM-DD format)
	const [year, month, day] = localDateString.split("-").map(Number);

	// Create a date for midnight in the user's local timezone
	// We use a trick: create the date as if it were UTC, then adjust for timezone
	const utcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

	// Get the timezone offset for this specific date in the target timezone
	const formatter = new Intl.DateTimeFormat("en", {
		timeZone: tz,
		timeZoneName: "longOffset",
	});

	const offsetString =
		formatter
			.formatToParts(utcMidnight)
			.find((part) => part.type === "timeZoneName")?.value || "+00:00";

	// Parse the offset (e.g., "+05:00" or "-08:00")
	const offsetMatch = offsetString.match(/([+-])(\d{2}):(\d{2})/);
	if (!offsetMatch) {
		// Fallback to UTC if we can't parse the offset
		return utcMidnight.getTime();
	}

	const sign = offsetMatch[1] === "+" ? 1 : -1;
	const offsetHours = parseInt(offsetMatch[2]);
	const offsetMinutes = parseInt(offsetMatch[3]);
	const offsetMs = sign * (offsetHours * 60 + offsetMinutes) * 60 * 1000;

	// Subtract the offset to get the correct UTC timestamp for local midnight
	return utcMidnight.getTime() - offsetMs;
}

/**
 * Get the end of today (23:59:59.999) in the user's local timezone as a timestamp
 * @param timeZone - Optional IANA timezone identifier. If not provided, uses user's current timezone
 * @returns Unix timestamp for the end of today in the specified timezone
 */
export function getEndOfTodayLocal(timeZone?: string): number {
	const startOfDay = getStartOfTodayLocal(timeZone);
	// Add 24 hours minus 1 millisecond to get end of day
	return startOfDay + 24 * 60 * 60 * 1000 - 1;
}

// Keep the old function names for backward compatibility but mark as deprecated
/**
 * @deprecated Use getStartOfTodayUTC() or getStartOfTodayLocal() instead
 */
export function getStartOfToday(): number {
	return getStartOfTodayUTC();
}

/**
 * @deprecated Use getEndOfTodayUTC() or getEndOfTodayLocal() instead
 */
export function getEndOfToday(): number {
	return getEndOfTodayUTC();
}

/**
 * Format session duration in a human-readable format
 * @param durationMs - Duration in milliseconds
 * @returns Formatted string like "2m 30s" or "45s"
 */
export function formatSessionDuration(durationMs: number): string {
	const minutes = Math.floor(durationMs / 60000);
	const seconds = Math.floor((durationMs % 60000) / 1000);

	if (minutes > 0) {
		return `${minutes}m ${seconds}s`;
	}
	return `${seconds}s`;
}

/**
 * Calculate the number of days between two timestamps
 * @param timestamp1 - First timestamp
 * @param timestamp2 - Second timestamp
 * @returns Number of days between the timestamps (can be negative)
 */
export function daysBetween(timestamp1: number, timestamp2: number): number {
	const diffMs = timestamp2 - timestamp1;
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
