import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
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
import { exportStatisticsData, type ExportFormat } from "../lib/exportUtils";

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

export default function StatisticsDashboard({ onBack }: StatisticsDashboardProps) {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch unified dashboard data
  const dashboardData = useQuery(api.statistics.getDashboardData);

  // Loading state
  if (dashboardData === undefined) {
    return <StatisticsDashboardSkeleton />;
  }

  // Defensive data extraction with fallbacks for malformed responses
  // This protects against API changes, network issues, or unexpected data structures
  const userStats = dashboardData?.userStatistics || {
    totalDecks: 0,
    totalCards: 0,
    totalStudySessions: 0,
    cardsStudiedToday: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageSessionDuration: undefined,
    totalStudyTime: undefined,
  };

  const spacedRepetitionInsights = dashboardData?.spacedRepetitionInsights || {
    totalDueCards: 0,
    totalNewCards: 0,
    cardsToReviewToday: 0,
    upcomingReviews: [],
    retentionRate: undefined,
    averageInterval: undefined,
  };

  const deckPerformance = Array.isArray(dashboardData?.deckPerformance)
    ? dashboardData.deckPerformance
    : [];

  const rawCardDistribution = dashboardData?.cardDistribution || {
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    dueCards: 0,
    masteredCards: 0,
    totalCards: 0,
  };

  const cardDistribution = {
    newCards: typeof rawCardDistribution.newCards === 'number' ? rawCardDistribution.newCards : 0,
    learningCards: typeof rawCardDistribution.learningCards === 'number' ? rawCardDistribution.learningCards : 0,
    reviewCards: typeof rawCardDistribution.reviewCards === 'number' ? rawCardDistribution.reviewCards : 0,
    dueCards: typeof rawCardDistribution.dueCards === 'number' ? rawCardDistribution.dueCards : 0,
    masteredCards: typeof rawCardDistribution.masteredCards === 'number' ? rawCardDistribution.masteredCards : 0,
    totalCards: typeof rawCardDistribution.totalCards === 'number' ? rawCardDistribution.totalCards : 0,
  };

  // Validate critical data properties to ensure they're numbers
  const safeUserStats = {
    ...userStats,
    totalDecks: typeof userStats.totalDecks === 'number' ? userStats.totalDecks : 0,
    totalCards: typeof userStats.totalCards === 'number' ? userStats.totalCards : 0,
    totalStudySessions: typeof userStats.totalStudySessions === 'number' ? userStats.totalStudySessions : 0,
    cardsStudiedToday: typeof userStats.cardsStudiedToday === 'number' ? userStats.cardsStudiedToday : 0,
    currentStreak: typeof userStats.currentStreak === 'number' ? userStats.currentStreak : 0,
    longestStreak: typeof userStats.longestStreak === 'number' ? userStats.longestStreak : 0,
  };

  const safeSpacedRepetitionInsights = {
    ...spacedRepetitionInsights,
    totalDueCards: typeof spacedRepetitionInsights.totalDueCards === 'number' ? spacedRepetitionInsights.totalDueCards : 0,
    totalNewCards: typeof spacedRepetitionInsights.totalNewCards === 'number' ? spacedRepetitionInsights.totalNewCards : 0,
    cardsToReviewToday: typeof spacedRepetitionInsights.cardsToReviewToday === 'number' ? spacedRepetitionInsights.cardsToReviewToday : 0,
    upcomingReviews: Array.isArray(spacedRepetitionInsights.upcomingReviews) ? spacedRepetitionInsights.upcomingReviews : [],
  };

  const handleExportData = async (format: ExportFormat) => {
    setIsExporting(true);
    try {
      // Prepare export data with defensive checks already applied
      const exportData = {
        userStatistics: safeUserStats,
        spacedRepetitionInsights: safeSpacedRepetitionInsights,
        deckPerformance: deckPerformance.map(deck => ({
          deckId: deck?.deckId || 'unknown',
          deckName: typeof deck?.deckName === 'string' ? deck.deckName : 'Unknown Deck',
          totalCards: typeof deck?.totalCards === 'number' ? deck.totalCards : 0,
          masteredCards: typeof deck?.masteredCards === 'number' ? deck.masteredCards : 0,
          masteryPercentage: typeof deck?.masteryPercentage === 'number' ? deck.masteryPercentage : 0,
          averageEaseFactor: typeof deck?.averageEaseFactor === 'number' ? deck.averageEaseFactor : undefined,
          lastStudied: typeof deck?.lastStudied === 'number' ? deck.lastStudied : undefined,
        })),
        exportDate: new Date().toISOString(),
        dateRange,
      };

      // Use the utility function to handle the export
      exportStatisticsData(exportData, format);

      toastHelpers.success(t('statistics.dashboard.export.exportSuccess', { format: format.toUpperCase() }));
    } catch (error) {
      console.error('Export failed:', error);
      toastHelpers.error(t('statistics.dashboard.export.exportError'));
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
              aria-label={t('statistics.dashboard.backToDashboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {t('statistics.dashboard.title')}
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            {t('statistics.dashboard.subtitle')}
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
            <option value="7d">{t('statistics.dashboard.dateRange.last7Days')}</option>
            <option value="30d">{t('statistics.dashboard.dateRange.last30Days')}</option>
            <option value="90d">{t('statistics.dashboard.dateRange.last90Days')}</option>
            <option value="all">{t('statistics.dashboard.dateRange.allTime')}</option>
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
                {isExporting ? t('statistics.dashboard.export.exporting') : t('statistics.dashboard.export.exportData')}
              </option>
              <option value="csv">{t('statistics.dashboard.export.exportAsCSV')}</option>
              <option value="json">{t('statistics.dashboard.export.exportAsJSON')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <StatisticsOverviewCards
        userStats={safeUserStats}
        spacedRepetitionInsights={safeSpacedRepetitionInsights}
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
        <CardDistributionChart
          spacedRepetitionInsights={safeSpacedRepetitionInsights}
          cardDistribution={cardDistribution}
        />
      </div>

      {/* Secondary Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UpcomingReviewsWidget
          upcomingReviews={safeSpacedRepetitionInsights.upcomingReviews}
        />

        <LearningStreakWidget
          currentStreak={safeUserStats.currentStreak}
          longestStreak={safeUserStats.longestStreak}
        />

        <SpacedRepetitionInsights
          insights={safeSpacedRepetitionInsights}
        />
      </div>

      {/* Deck Performance Table */}
      {deckPerformance.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold mb-6 text-slate-800 dark:text-slate-200">
            {t('statistics.table.deckPerformance.title')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('statistics.table.deckPerformance.headers.deck')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('statistics.table.deckPerformance.headers.cards')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('statistics.table.deckPerformance.headers.mastered')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('statistics.table.deckPerformance.headers.progress')}</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{t('statistics.table.deckPerformance.headers.avgEase')}</th>
                </tr>
              </thead>
              <tbody>
                {deckPerformance.map((deck) => {
                  // Defensive checks for deck data
                  const safeDeck = {
                    deckId: deck?.deckId || 'unknown',
                    deckName: typeof deck?.deckName === 'string' ? deck.deckName : 'Unknown Deck',
                    totalCards: typeof deck?.totalCards === 'number' ? deck.totalCards : 0,
                    masteredCards: typeof deck?.masteredCards === 'number' ? deck.masteredCards : 0,
                    masteryPercentage: typeof deck?.masteryPercentage === 'number' ? deck.masteryPercentage : 0,
                    averageEaseFactor: typeof deck?.averageEaseFactor === 'number' ? deck.averageEaseFactor : undefined,
                  };

                  return (
                    <tr key={safeDeck.deckId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {safeDeck.deckName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {safeDeck.totalCards}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {safeDeck.masteredCards}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(Math.max(safeDeck.masteryPercentage, 0), 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[3rem]">
                            {safeDeck.masteryPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {safeDeck.averageEaseFactor ? safeDeck.averageEaseFactor.toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
