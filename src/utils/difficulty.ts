/**
 * Utility functions for calculating difficulty levels based on performance metrics
 */

export type DifficultyLevel = 'hard' | 'medium' | 'easy';

/**
 * Calculates difficulty level based on average success rate
 * 
 * @param averageSuccess - Success rate as a decimal between 0 and 1
 * @returns Difficulty level: 'hard' for < 0.6, 'easy' for > 0.8, 'medium' otherwise
 * 
 * @example
 * calculateDifficulty(0.5) // returns 'hard'
 * calculateDifficulty(0.7) // returns 'medium'
 * calculateDifficulty(0.9) // returns 'easy'
 */
export const calculateDifficulty = (averageSuccess: number): DifficultyLevel => {
  if (averageSuccess < 0.6) return 'hard';
  if (averageSuccess > 0.8) return 'easy';
  return 'medium';
};
