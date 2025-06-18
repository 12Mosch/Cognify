/**
 * Difficulty Level Utilities for Flashcard Study System
 * 
 * This module provides utilities for calculating and categorizing difficulty levels
 * based on the SM-2 spaced repetition algorithm data. It helps visualize card
 * difficulty and learning progress to users.
 */

export type DifficultyLevel = 'new' | 'learning' | 'young' | 'mature' | 'easy';

export interface DifficultyInfo {
  level: DifficultyLevel;
  label: string;
  description: string;
  color: {
    bg: string;
    text: string;
    border: string;
  };
  progress: number; // 0-100 percentage for progress indicators
}

/**
 * Calculate difficulty level based on SM-2 algorithm parameters
 * 
 * @param repetition - Number of successful repetitions (0 = new card)
 * @param easeFactor - Current ease factor (default 2.5, range typically 1.3-3.0+)
 * @param interval - Current interval in days
 * @returns DifficultyLevel category
 */
export function calculateDifficultyLevel(
  repetition?: number,
  easeFactor?: number,
  interval?: number
): DifficultyLevel {
  // New cards (never reviewed)
  if (repetition === undefined || repetition === 0) {
    return 'new';
  }

  // Learning phase (first few repetitions)
  if (repetition <= 2) {
    return 'learning';
  }

  // Use ease factor and interval to determine maturity
  const currentEaseFactor = easeFactor ?? 2.5;
  const currentInterval = interval ?? 1;

  // Easy cards: high ease factor (>= 2.8) and long intervals (>= 30 days)
  if (currentEaseFactor >= 2.8 && currentInterval >= 30) {
    return 'easy';
  }

  // Mature cards: reasonable ease factor and medium-long intervals
  if (currentEaseFactor >= 2.2 && currentInterval >= 7) {
    return 'mature';
  }

  // Young cards: still building up intervals
  return 'young';
}

/**
 * Get comprehensive difficulty information for display
 * 
 * @param repetition - Number of successful repetitions
 * @param easeFactor - Current ease factor
 * @param interval - Current interval in days
 * @returns Complete difficulty information object
 */
export function getDifficultyInfo(
  repetition?: number,
  easeFactor?: number,
  interval?: number
): DifficultyInfo {
  const level = calculateDifficultyLevel(repetition, easeFactor, interval);
  
  switch (level) {
    case 'new':
      return {
        level,
        label: 'New',
        description: 'Never studied before',
        color: {
          bg: 'bg-slate-100 dark:bg-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          border: 'border-slate-300 dark:border-slate-600',
        },
        progress: 0,
      };

    case 'learning':
      return {
        level,
        label: 'Learning',
        description: 'In initial learning phase',
        color: {
          bg: 'bg-blue-100 dark:bg-blue-900',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-300 dark:border-blue-600',
        },
        progress: Math.min(((repetition ?? 0) / 2) * 30, 30),
      };

    case 'young':
      return {
        level,
        label: 'Young',
        description: 'Building up review intervals',
        color: {
          bg: 'bg-orange-100 dark:bg-orange-900',
          text: 'text-orange-700 dark:text-orange-300',
          border: 'border-orange-300 dark:border-orange-600',
        },
        progress: 30 + Math.min(((easeFactor ?? 2.5) - 1.3) / (2.8 - 1.3) * 30, 30),
      };

    case 'mature':
      return {
        level,
        label: 'Mature',
        description: 'Well-established memory',
        color: {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-300 dark:border-green-600',
        },
        progress: 60 + Math.min(((interval ?? 1) - 7) / (30 - 7) * 25, 25),
      };

    case 'easy':
      return {
        level,
        label: 'Easy',
        description: 'Mastered - long intervals',
        color: {
          bg: 'bg-emerald-100 dark:bg-emerald-900',
          text: 'text-emerald-700 dark:text-emerald-300',
          border: 'border-emerald-300 dark:border-emerald-600',
        },
        progress: 85 + Math.min(((easeFactor ?? 2.5) - 2.8) / (4.0 - 2.8) * 15, 15),
      };

    default:
      // Fallback - should never reach here
      return {
        level: 'new',
        label: 'Unknown',
        description: 'Unknown difficulty',
        color: {
          bg: 'bg-gray-100 dark:bg-gray-700',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-300 dark:border-gray-600',
        },
        progress: 0,
      };
  }
}

/**
 * Get a simplified difficulty score (0-100) for sorting or comparison
 * 
 * @param repetition - Number of successful repetitions
 * @param easeFactor - Current ease factor
 * @param interval - Current interval in days
 * @returns Difficulty score from 0 (hardest/new) to 100 (easiest/mastered)
 */
export function getDifficultyScore(
  repetition?: number,
  easeFactor?: number,
  interval?: number
): number {
  const info = getDifficultyInfo(repetition, easeFactor, interval);
  return info.progress;
}

/**
 * Get difficulty statistics for a collection of cards
 * 
 * @param cards - Array of cards with spaced repetition data
 * @returns Statistics about difficulty distribution
 */
export function getDifficultyStats(cards: Array<{
  repetition?: number;
  easeFactor?: number;
  interval?: number;
}>) {
  const stats = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
    easy: 0,
    total: cards.length,
  };

  cards.forEach(card => {
    const level = calculateDifficultyLevel(card.repetition, card.easeFactor, card.interval);
    stats[level]++;
  });

  return {
    ...stats,
    percentages: {
      new: stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0,
      learning: stats.total > 0 ? Math.round((stats.learning / stats.total) * 100) : 0,
      young: stats.total > 0 ? Math.round((stats.young / stats.total) * 100) : 0,
      mature: stats.total > 0 ? Math.round((stats.mature / stats.total) * 100) : 0,
      easy: stats.total > 0 ? Math.round((stats.easy / stats.total) * 100) : 0,
    },
  };
}

/**
 * Check if a card is considered "difficult" and might need extra attention
 * 
 * @param repetition - Number of successful repetitions
 * @param easeFactor - Current ease factor
 * @param interval - Current interval in days
 * @returns True if the card is considered difficult
 */
export function isCardDifficult(
  repetition?: number,
  easeFactor?: number,
  _interval?: number
): boolean {
  // New cards are not considered difficult (they're just new)
  if (repetition === undefined || repetition === 0) {
    return false;
  }

  // Cards with low ease factor after multiple attempts are difficult
  const currentEaseFactor = easeFactor ?? 2.5;
  
  // If ease factor is significantly below default after several repetitions
  if (repetition >= 3 && currentEaseFactor < 2.0) {
    return true;
  }

  // If ease factor is very low
  if (currentEaseFactor < 1.6) {
    return true;
  }

  return false;
}
