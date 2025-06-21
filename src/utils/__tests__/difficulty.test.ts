import { calculateDifficulty } from '../difficulty';

describe('calculateDifficulty', () => {
  describe('hard difficulty', () => {
    it('returns "hard" for success rates below 0.6', () => {
      expect(calculateDifficulty(0.0)).toBe('hard');
      expect(calculateDifficulty(0.1)).toBe('hard');
      expect(calculateDifficulty(0.3)).toBe('hard');
      expect(calculateDifficulty(0.5)).toBe('hard');
      expect(calculateDifficulty(0.59)).toBe('hard');
    });
  });

  describe('medium difficulty', () => {
    it('returns "medium" for success rates between 0.6 and 0.8 (inclusive)', () => {
      expect(calculateDifficulty(0.6)).toBe('medium');
      expect(calculateDifficulty(0.65)).toBe('medium');
      expect(calculateDifficulty(0.7)).toBe('medium');
      expect(calculateDifficulty(0.75)).toBe('medium');
      expect(calculateDifficulty(0.8)).toBe('medium');
    });
  });

  describe('easy difficulty', () => {
    it('returns "easy" for success rates above 0.8', () => {
      expect(calculateDifficulty(0.81)).toBe('easy');
      expect(calculateDifficulty(0.85)).toBe('easy');
      expect(calculateDifficulty(0.9)).toBe('easy');
      expect(calculateDifficulty(0.95)).toBe('easy');
      expect(calculateDifficulty(1.0)).toBe('easy');
    });
  });

  describe('boundary conditions', () => {
    it('handles exact boundary values correctly', () => {
      // Test exact boundaries
      expect(calculateDifficulty(0.6)).toBe('medium'); // Lower boundary of medium
      expect(calculateDifficulty(0.8)).toBe('medium'); // Upper boundary of medium
      
      // Test just below/above boundaries
      expect(calculateDifficulty(0.59999)).toBe('hard');
      expect(calculateDifficulty(0.60001)).toBe('medium');
      expect(calculateDifficulty(0.79999)).toBe('medium');
      expect(calculateDifficulty(0.80001)).toBe('easy');
    });
  });

  describe('edge cases', () => {
    it('handles extreme values', () => {
      expect(calculateDifficulty(0)).toBe('hard');
      expect(calculateDifficulty(1)).toBe('easy');
    });

    it('handles decimal precision', () => {
      expect(calculateDifficulty(0.5999999)).toBe('hard');
      expect(calculateDifficulty(0.6000001)).toBe('medium');
      expect(calculateDifficulty(0.7999999)).toBe('medium');
      expect(calculateDifficulty(0.8000001)).toBe('easy');
    });
  });
});
