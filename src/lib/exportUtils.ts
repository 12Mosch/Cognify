import { saveAs } from 'file-saver';

/**
 * Export utility functions for statistics dashboard
 * Provides clean, testable functions for exporting data without DOM manipulation
 */

export type ExportFormat = 'csv' | 'json';

export interface UserStats {
  totalDecks: number;
  totalCards: number;
  totalStudySessions: number;
  cardsStudiedToday: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionDuration?: number;
  totalStudyTime?: number;
}

export interface SpacedRepetitionInsights {
  totalDueCards: number;
  totalNewCards: number;
  cardsToReviewToday: number;
  upcomingReviews: Array<{
    date: string;
    count: number;
  }>;
  retentionRate?: number;
  averageInterval?: number;
}

export interface DeckPerformance {
  deckId: string;
  deckName: string;
  totalCards: number;
  masteredCards: number;
  masteryPercentage: number;
  averageEaseFactor?: number;
  lastStudied?: number;
}

export interface ExportData {
  userStatistics: UserStats;
  spacedRepetitionInsights: SpacedRepetitionInsights;
  deckPerformance: DeckPerformance[];
  exportDate: string;
  dateRange: string;
}

/**
 * Generate a filename with current date
 */
const generateFilename = (format: ExportFormat): string => {
  const dateStr = new Date().toISOString().split('T')[0];
  return `flashcard-statistics-${dateStr}.${format}`;
};

/**
 * Export data as JSON format
 */
export const exportAsJSON = (data: ExportData): void => {
  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], {
      type: 'application/json',
    });
    const filename = generateFilename('json');
    saveAs(blob, filename);
  } catch (error) {
    console.error('JSON export failed:', error);
    throw new Error('Failed to export data as JSON');
  }
};

/**
 * Convert data to CSV format
 */
const convertToCSV = (data: ExportData): string => {
  const csvRows = [
    ['Metric', 'Value'],
    ['Total Decks', data.userStatistics.totalDecks.toString()],
    ['Total Cards', data.userStatistics.totalCards.toString()],
    ['Total Study Sessions', data.userStatistics.totalStudySessions.toString()],
    ['Cards Studied Today', data.userStatistics.cardsStudiedToday.toString()],
    ['Current Streak', data.userStatistics.currentStreak.toString()],
    ['Longest Streak', data.userStatistics.longestStreak.toString()],
    ['Due Cards', data.spacedRepetitionInsights.totalDueCards.toString()],
    ['New Cards', data.spacedRepetitionInsights.totalNewCards.toString()],
    ['Cards to Review Today', data.spacedRepetitionInsights.cardsToReviewToday.toString()],
  ];

  // Add optional metrics if they exist
  if (data.userStatistics.averageSessionDuration !== undefined) {
    csvRows.push(['Average Session Duration (min)', data.userStatistics.averageSessionDuration.toString()]);
  }
  if (data.userStatistics.totalStudyTime !== undefined) {
    csvRows.push(['Total Study Time (min)', data.userStatistics.totalStudyTime.toString()]);
  }
  if (data.spacedRepetitionInsights.retentionRate !== undefined) {
    csvRows.push(['Retention Rate (%)', data.spacedRepetitionInsights.retentionRate.toString()]);
  }
  if (data.spacedRepetitionInsights.averageInterval !== undefined) {
    csvRows.push(['Average Interval (days)', data.spacedRepetitionInsights.averageInterval.toString()]);
  }

  // Add deck performance data
  if (data.deckPerformance.length > 0) {
    csvRows.push(['', '']); // Empty row separator
    csvRows.push(['Deck Performance', '']);
    csvRows.push(['Deck Name', 'Total Cards', 'Mastered Cards', 'Mastery %', 'Avg Ease Factor']);
    
    data.deckPerformance.forEach(deck => {
      csvRows.push([
        deck.deckName,
        deck.totalCards.toString(),
        deck.masteredCards.toString(),
        deck.masteryPercentage.toFixed(1),
        deck.averageEaseFactor ? deck.averageEaseFactor.toFixed(2) : 'N/A'
      ]);
    });
  }

  return csvRows.map(row => row.join(',')).join('\n');
};

/**
 * Export data as CSV format
 */
export const exportAsCSV = (data: ExportData): void => {
  try {
    const csvContent = convertToCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const filename = generateFilename('csv');
    saveAs(blob, filename);
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error('Failed to export data as CSV');
  }
};

/**
 * Main export function that handles both formats
 */
export const exportStatisticsData = (data: ExportData, format: ExportFormat): void => {
  switch (format) {
    case 'json':
      exportAsJSON(data);
      break;
    case 'csv':
      exportAsCSV(data);
      break;
    default:
      // This should never happen due to TypeScript typing, but handle it gracefully
      throw new Error(`Unsupported export format: ${String(format)}`);
  }
};
