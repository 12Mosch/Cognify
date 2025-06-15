import { memo } from "react";

// Define types that match the actual Convex query return structure
// These are manually defined to ensure proper optional property handling
interface UserStats {
  totalDecks: number;
  totalCards: number;
  totalStudySessions: number;
  cardsStudiedToday: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionDuration?: number;
  totalStudyTime?: number;
}

interface SpacedRepetitionInsights {
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

interface StatisticsOverviewCardsProps {
  userStats: UserStats;
  spacedRepetitionInsights: SpacedRepetitionInsights;
}

/**
 * Overview Cards Component for Statistics Dashboard
 * 
 * Displays key metrics in an attractive card grid layout with:
 * - Glowing blue/cyan accent colors for primary metrics
 * - Green accents for positive performance indicators
 * - Icons and visual hierarchy for easy scanning
 * - Responsive grid layout
 * - Dark theme support
 */
export const StatisticsOverviewCards = memo(function StatisticsOverviewCards({
  userStats,
  spacedRepetitionInsights
}: StatisticsOverviewCardsProps) {
  const cards = [
    {
      title: "Total Decks",
      value: userStats.totalDecks,
      subtitle: "Learning collections",
      icon: "📚",
      color: "blue",
      trend: null,
    },
    {
      title: "Total Cards",
      value: userStats.totalCards,
      subtitle: "Flashcards created",
      icon: "🃏",
      color: "cyan",
      trend: null,
    },
    {
      title: "Due Today",
      value: spacedRepetitionInsights.cardsToReviewToday,
      subtitle: "Cards to review",
      icon: "⏰",
      color: spacedRepetitionInsights.cardsToReviewToday > 0 ? "orange" : "green",
      trend: null,
    },
    {
      title: "Current Streak",
      value: userStats.currentStreak,
      subtitle: `Best: ${userStats.longestStreak} days`,
      icon: "🔥",
      color: userStats.currentStreak > 0 ? "green" : "gray",
      trend: null,
    },
    {
      title: "New Cards",
      value: spacedRepetitionInsights.totalNewCards,
      subtitle: "Ready to learn",
      icon: "✨",
      color: "purple",
      trend: null,
    },
    {
      title: "Study Sessions",
      value: userStats.totalStudySessions,
      subtitle: "Total completed",
      icon: "📖",
      color: "indigo",
      trend: null,
    },
    {
      title: "Average Interval",
      value: spacedRepetitionInsights.averageInterval ?
        `${spacedRepetitionInsights.averageInterval.toFixed(1)}d` : 'N/A',
      subtitle: "Between reviews",
      icon: "📅",
      color: "teal",
      trend: null,
    },
    {
      title: "Retention Rate",
      value: spacedRepetitionInsights.retentionRate ?
        `${spacedRepetitionInsights.retentionRate.toFixed(1)}%` : 'N/A',
      subtitle: "Success rate",
      icon: "🎯",
      color: "green",
      trend: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <StatisticsCard key={index} {...card} />
      ))}
    </div>
  );
});

interface StatisticsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  } | null;
}

const StatisticsCard = memo(function StatisticsCard({
  title,
  value,
  subtitle,
  icon,
  color,
  trend
}: StatisticsCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-400/10',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-600 dark:text-blue-400',
          glow: 'shadow-blue-500/20 dark:shadow-blue-400/20',
        };
      case 'cyan':
        return {
          bg: 'bg-cyan-500/10 dark:bg-cyan-400/10',
          border: 'border-cyan-200 dark:border-cyan-800',
          text: 'text-cyan-600 dark:text-cyan-400',
          glow: 'shadow-cyan-500/20 dark:shadow-cyan-400/20',
        };
      case 'green':
        return {
          bg: 'bg-green-500/10 dark:bg-green-400/10',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-600 dark:text-green-400',
          glow: 'shadow-green-500/20 dark:shadow-green-400/20',
        };
      case 'orange':
        return {
          bg: 'bg-orange-500/10 dark:bg-orange-400/10',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-600 dark:text-orange-400',
          glow: 'shadow-orange-500/20 dark:shadow-orange-400/20',
        };
      case 'purple':
        return {
          bg: 'bg-purple-500/10 dark:bg-purple-400/10',
          border: 'border-purple-200 dark:border-purple-800',
          text: 'text-purple-600 dark:text-purple-400',
          glow: 'shadow-purple-500/20 dark:shadow-purple-400/20',
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-400/10',
          border: 'border-indigo-200 dark:border-indigo-800',
          text: 'text-indigo-600 dark:text-indigo-400',
          glow: 'shadow-indigo-500/20 dark:shadow-indigo-400/20',
        };
      case 'teal':
        return {
          bg: 'bg-teal-500/10 dark:bg-teal-400/10',
          border: 'border-teal-200 dark:border-teal-800',
          text: 'text-teal-600 dark:text-teal-400',
          glow: 'shadow-teal-500/20 dark:shadow-teal-400/20',
        };
      default:
        return {
          bg: 'bg-slate-500/10 dark:bg-slate-400/10',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-600 dark:text-slate-400',
          glow: 'shadow-slate-500/20 dark:shadow-slate-400/20',
        };
    }
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className={`
      ${colorClasses.bg} ${colorClasses.border} ${colorClasses.glow}
      p-6 rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:scale-105
      bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-750
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-2xl" role="img" aria-label={title}>
          {icon}
        </span>
      </div>
      
      {/* Main Value */}
      <div className="mb-2">
        <span className={`text-3xl font-bold ${colorClasses.text}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>
      
      {/* Subtitle and Trend */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </span>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend.isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            <span>{trend.isPositive ? '↗' : '↘'}</span>
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
});
