/**
 * Date utility functions for formatting and calculating time differences
 * Used primarily for spaced repetition scheduling and user-friendly date displays
 */

/**
 * Format a timestamp into a user-friendly "next review" message
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted string like "Tomorrow", "in 3 hours", "on Dec 25", etc.
 */
export function formatNextReviewTime(timestamp: number): string {
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
    return `on ${date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })}`;
  }
  
  // Different year - show month, day, and year
  return `on ${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })}`;
}

/**
 * Check if a timestamp is today
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if the timestamp is today
 */
export function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  const today = new Date();
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

/**
 * Check if a timestamp is tomorrow
 * @param timestamp - Unix timestamp in milliseconds
 * @returns true if the timestamp is tomorrow
 */
export function isTomorrow(timestamp: number): boolean {
  const date = new Date(timestamp);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return date.getDate() === tomorrow.getDate() &&
         date.getMonth() === tomorrow.getMonth() &&
         date.getFullYear() === tomorrow.getFullYear();
}

/**
 * Get the start of today (midnight) as a timestamp
 * @returns Unix timestamp for the start of today
 */
export function getStartOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/**
 * Get the end of today (23:59:59.999) as a timestamp
 * @returns Unix timestamp for the end of today
 */
export function getEndOfToday(): number {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today.getTime();
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
