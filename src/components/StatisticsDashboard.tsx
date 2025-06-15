import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { StatisticsDashboardSkeleton } from "./skeletons/StatisticsSkeleton";
import { StatisticsOverviewCards } from "./statistics/StatisticsOverviewCards";
import StudyActivityChart from "./statistics/StudyActivityChart";
import DeckPerformanceChart from "./statistics/DeckPerformanceChart";
import CardDistributionChart from "./statistics/CardDistributionChart";
import UpcomingReviewsWidget from "./statistics/UpcomingReviewsWidget";
import LearningStreakWidget from "./statistics/LearningStreakWidget";
import SpacedRepetitionInsights from "./statistics/SpacedRepetitionInsights";
import StudyHistoryHeatmap from "./StudyHistoryHeatmap";
import { toastHelpers } from "../lib/toast";

/**
 * Comprehensive Statistics Dashboard Component
 * 
 * Provides detailed analytics and insights for the flashcard learning app including:
 * - Overall learning statistics and progress tracking
 * - Study session patterns and performance metrics
 * - Deck-specific analytics and comparisons
 * - Spaced repetition algorithm insights
 * - Learning streaks and achievements
 * - Interactive charts and visualizations
 * 
 * Features:
 * - Dark theme with glowing blue/green accent colors
 * - Responsive grid-based layout
 * - Real-time data from Convex queries
 * - Export capabilities for study data
 * - Filter options for date ranges and decks
 * - Accessibility with proper ARIA labels
 * - Smooth loading states with skeleton components
 */

interface StatisticsDashboardProps {
  onBack: () => void;
}

type DateRange = '7d' | '30d' | '90d' | 'all';
type ExportFormat = 'csv' | 'json';

export default function StatisticsDashboard({ onBack }: StatisticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch statistics data
  const userStats = useQuery(api.statistics.getUserStatistics);
  const spacedRepetitionInsights = useQuery(api.statistics.getSpacedRepetitionInsights);
  const deckPerformance = useQuery(api.statistics.getDeckPerformanceComparison);
  const decks = useQuery(api.decks.getDecksForUser);

  // Loading state
  if (userStats === undefined || spacedRepetitionInsights === undefined || 
      deckPerformance === undefined || decks === undefined) {
    return <StatisticsDashboardSkeleton />;
  }

  const handleExportData = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      const exportData = {
        userStatistics: userStats,
        spacedRepetitionInsights,
        deckPerformance,
        exportDate: new Date().toISOString(),
        dateRange,
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcard-statistics-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // CSV export - simplified version
        const csvData = [
          ['Metric', 'Value'],
          ['Total Decks', userStats.totalDecks.toString()],
          ['Total Cards', userStats.totalCards.toString()],
          ['Current Streak', userStats.currentStreak.toString()],
          ['Longest Streak', userStats.longestStreak.toString()],
          ['Due Cards', spacedRepetitionInsights.totalDueCards.toString()],
          ['New Cards', spacedRepetitionInsights.totalNewCards.toString()],
        ];

        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flashcard-statistics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toastHelpers.success(`Statistics exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export failed:', error);
      toastHelpers.error('Failed to export statistics');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Learning Analytics
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive insights into your flashcard learning progress
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-400 dark:focus:border-blue-400 transition-colors"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>

          {/* Export Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  void handleExportData(e.target.value as ExportFormat);
                  e.target.value = ''; // Reset selection
                }
              }}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            >
              <option value="">
                {isExporting ? 'Exporting...' : 'Export Data'}
              </option>
              <option value="csv">Export as CSV</option>
              <option value="json">Export as JSON</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <StatisticsOverviewCards 
        userStats={userStats}
        spacedRepetitionInsights={spacedRepetitionInsights}
      />

      {/* Study History Heatmap - Full Width */}
      <div className="mb-8">
        <StudyHistoryHeatmap />
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Study Activity Chart - Full Width */}
        <div className="lg:col-span-2">
          <StudyActivityChart dateRange={dateRange} />
        </div>

        {/* Deck Performance Chart */}
        <DeckPerformanceChart
          deckPerformance={deckPerformance}
          selectedDeckId={selectedDeckId}
          onDeckSelect={setSelectedDeckId}
        />

        {/* Card Distribution Chart */}
        <CardDistributionChart spacedRepetitionInsights={spacedRepetitionInsights} />
      </div>

      {/* Secondary Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UpcomingReviewsWidget 
          upcomingReviews={spacedRepetitionInsights.upcomingReviews}
        />
        
        <LearningStreakWidget 
          currentStreak={userStats.currentStreak}
          longestStreak={userStats.longestStreak}
        />
        
        <SpacedRepetitionInsights 
          insights={spacedRepetitionInsights}
        />
      </div>

      {/* Deck Performance Table */}
      {deckPerformance.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
            Deck Performance Overview
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Deck</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Cards</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Mastered</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Progress</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Avg. Ease</th>
                </tr>
              </thead>
              <tbody>
                {deckPerformance.map((deck) => (
                  <tr key={deck.deckId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {deck.deckName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {deck.totalCards}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {deck.masteredCards}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(deck.masteryPercentage, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[3rem]">
                          {deck.masteryPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {deck.averageEaseFactor ? deck.averageEaseFactor.toFixed(2) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
