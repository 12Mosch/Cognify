import { TFunction } from 'i18next';

/**
 * Time slot definitions for scheduling and performance analysis
 */
export type TimeSlot = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

/**
 * Get time slot from hour of day (0-23)
 *
 * @param hour - Hour of day (0-23)
 * @returns TimeSlot identifier
 *
 * @example
 * getTimeSlot(7) // returns 'early_morning'
 * getTimeSlot(14) // returns 'afternoon'
 * getTimeSlot(22) // returns 'night'
 */
export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 9) return 'early_morning';
  if (hour >= 9 && hour < 13) return 'morning';
  if (hour >= 13 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'night';
  return 'late_night';
}

/**
 * Formats a time slot identifier into a human-readable string
 * @param slot - The time slot identifier (e.g., 'early_morning', 'afternoon')
 * @param t - The translation function from react-i18next
 * @param context - Optional context for different translation namespaces ('scheduling' or 'analytics')
 * @returns Formatted time slot string
 */
export const formatTimeSlot = (
  slot: string, 
  t: TFunction, 
  context: 'scheduling' | 'analytics' = 'scheduling'
): string => {
  const timeSlotMappings = {
    scheduling: {
      early_morning: t('scheduling.timeSlots.earlyMorning', 'Early Morning'),
      morning: t('scheduling.timeSlots.morning', 'Morning'),
      afternoon: t('scheduling.timeSlots.afternoon', 'Afternoon'),
      evening: t('scheduling.timeSlots.evening', 'Evening'),
      night: t('scheduling.timeSlots.night', 'Night'),
      late_night: t('scheduling.timeSlots.lateNight', 'Late Night'),
    },
    analytics: {
      early_morning: t('analytics.timeSlots.earlyMorning', '5-9 AM'),
      morning: t('analytics.timeSlots.morning', '9 AM-1 PM'),
      afternoon: t('analytics.timeSlots.afternoon', '1-5 PM'),
      evening: t('analytics.timeSlots.evening', '5-9 PM'),
      night: t('analytics.timeSlots.night', '9 PM-12 AM'),
      late_night: t('analytics.timeSlots.lateNight', '12-5 AM'),
    }
  };

  const timeSlotNames = timeSlotMappings[context];
  return timeSlotNames[slot as keyof typeof timeSlotNames] || slot;
};
