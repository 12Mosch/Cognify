import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  formatNextReviewTime,
  isToday,
  isTomorrow,
  getStartOfToday,
  getEndOfToday,
  formatSessionDuration,
  daysBetween,
  getUserTimeZone,
  getLocalDateString
} from '../dateUtils';

describe('dateUtils', () => {
beforeEach(() => {
     // Mock Date.now() to return a consistent timestamp for testing
     // January 15, 2024, 12:00:00 PM UTC
     vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
   });

  afterAll(() => {
    // Restore real timers so other test files are unaffected
    vi.useRealTimers();
  });

  describe('formatNextReviewTime', () => {
    const baseTime = new Date('2024-01-15T12:00:00.000Z').getTime();

    it('returns "now" for past timestamps', () => {
      const pastTime = baseTime - 1000; // 1 second ago
      expect(formatNextReviewTime(pastTime)).toBe('now');
    });

    it('formats minutes correctly', () => {
      const in30Minutes = baseTime + (30 * 60 * 1000);
      expect(formatNextReviewTime(in30Minutes)).toBe('in 30 minutes');
      
      const in1Minute = baseTime + (1 * 60 * 1000);
      expect(formatNextReviewTime(in1Minute)).toBe('in 1 minute');
    });

    it('formats hours correctly', () => {
      const in3Hours = baseTime + (3 * 60 * 60 * 1000);
      expect(formatNextReviewTime(in3Hours)).toBe('in 3 hours');
      
      const in1Hour = baseTime + (1 * 60 * 60 * 1000);
      expect(formatNextReviewTime(in1Hour)).toBe('in 1 hour');
    });

    it('returns "tomorrow" for next day', () => {
      const tomorrow = baseTime + (24 * 60 * 60 * 1000);
      expect(formatNextReviewTime(tomorrow)).toBe('tomorrow');
    });

    it('formats days correctly', () => {
      const in3Days = baseTime + (3 * 24 * 60 * 60 * 1000);
      expect(formatNextReviewTime(in3Days)).toBe('in 3 days');
    });

    it('formats dates within same year', () => {
      const in2Weeks = baseTime + (14 * 24 * 60 * 60 * 1000);
      expect(formatNextReviewTime(in2Weeks)).toBe('on Jan 29');
    });

    it('formats dates in different year', () => {
      const nextYear = new Date('2025-03-15T12:00:00.000Z').getTime();
      expect(formatNextReviewTime(nextYear)).toBe('on Mar 15, 2025');
    });
  });

  describe('isToday', () => {
    it('returns true for timestamps on the same day', () => {
      const sameDay = new Date('2024-01-15T08:30:00.000Z').getTime();
      expect(isToday(sameDay)).toBe(true);
    });

    it('returns false for timestamps on different days', () => {
      const yesterday = new Date('2024-01-14T23:59:59.999Z').getTime();
      const tomorrow = new Date('2024-01-16T00:00:00.000Z').getTime();
      expect(isToday(yesterday)).toBe(false);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('returns true for timestamps on the next day', () => {
      const tomorrow = new Date('2024-01-16T08:30:00.000Z').getTime();
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it('returns false for timestamps not on the next day', () => {
      const today = new Date('2024-01-15T12:00:00.000Z').getTime();
      const dayAfterTomorrow = new Date('2024-01-17T12:00:00.000Z').getTime();
      expect(isTomorrow(today)).toBe(false);
      expect(isTomorrow(dayAfterTomorrow)).toBe(false);
    });
  });

  describe('getStartOfToday', () => {
    it('returns midnight of current day', () => {
      const startOfDay = getStartOfToday();
      const expected = new Date('2024-01-15T00:00:00.000Z').getTime();
      expect(startOfDay).toBe(expected);
    });
  });

  describe('getEndOfToday', () => {
    it('returns end of current day', () => {
      const endOfDay = getEndOfToday();
      const expected = new Date('2024-01-15T23:59:59.999Z').getTime();
      expect(endOfDay).toBe(expected);
    });
  });

  describe('formatSessionDuration', () => {
    it('formats seconds only', () => {
      expect(formatSessionDuration(45000)).toBe('45s');
      expect(formatSessionDuration(1000)).toBe('1s');
    });

    it('formats minutes and seconds', () => {
      expect(formatSessionDuration(125000)).toBe('2m 5s');
      expect(formatSessionDuration(60000)).toBe('1m 0s');
    });

    it('handles zero duration', () => {
      expect(formatSessionDuration(0)).toBe('0s');
    });
  });

  describe('daysBetween', () => {
    it('calculates positive days difference', () => {
      const day1 = new Date('2024-01-15T12:00:00.000Z').getTime();
      const day2 = new Date('2024-01-18T12:00:00.000Z').getTime();
      expect(daysBetween(day1, day2)).toBe(3);
    });

    it('calculates negative days difference', () => {
      const day1 = new Date('2024-01-18T12:00:00.000Z').getTime();
      const day2 = new Date('2024-01-15T12:00:00.000Z').getTime();
      expect(daysBetween(day1, day2)).toBe(-3);
    });

    it('returns 0 for same day', () => {
      const day1 = new Date('2024-01-15T08:00:00.000Z').getTime();
      const day2 = new Date('2024-01-15T20:00:00.000Z').getTime();
      expect(daysBetween(day1, day2)).toBe(0);
    });
  });

  describe('getUserTimeZone', () => {
    it('returns a valid IANA timezone identifier', () => {
      const timeZone = getUserTimeZone();
      expect(typeof timeZone).toBe('string');
      expect(timeZone.length).toBeGreaterThan(0);
      // Should contain at least one slash for IANA format (e.g., "America/New_York")
      expect(timeZone).toMatch(/\//);
    });
  });

  describe('getLocalDateString', () => {
    it('returns date in YYYY-MM-DD format', () => {
      const dateString = getLocalDateString();
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('accepts custom timezone parameter', () => {
      const utcDate = getLocalDateString('UTC');
      const nyDate = getLocalDateString('America/New_York');

      expect(utcDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nyDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Dates might be different depending on time of day and timezone offset
    });

    it('handles timezone edge cases', () => {
      // Test with various timezones
      const timezones = ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

      timezones.forEach(tz => {
        const dateString = getLocalDateString(tz);
        expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});
