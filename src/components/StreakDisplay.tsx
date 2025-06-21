import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAnalytics } from "../lib/analytics";
import { useTranslation } from "react-i18next";

interface StreakDisplayProps {
  className?: string;
}

/**
 * Streak Display Component
 * 
 * Shows the user's current study streak with visual indicators and milestones.
 * Includes motivational messaging and streak statistics.
 */
export default function StreakDisplay({ className = "" }: StreakDisplayProps) {
  const streakData = useQuery(api.streaks.getCurrentStreak);
  const { posthog } = useAnalytics();
  const { t } = useTranslation();

  if (streakData === undefined) {
    return (
      <div className={`bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse" data-testid="streak-loading">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-4"></div>
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-2"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
        </div>
      </div>
    );
  }

  // Handle null response to avoid crash - user has no streak yet
  // Treat as zero-streak baseline if streakData is null
  const safeStreakData = streakData ?? {
    currentStreak: 0,
    longestStreak: 0,
    totalStudyDays: 0,
    milestonesReached: [],
    lastMilestone: null
  };

  const { currentStreak, longestStreak, totalStudyDays, milestonesReached, lastMilestone } = safeStreakData;

  // Determine streak status and styling
  const getStreakStatus = () => {
    if (currentStreak === 0) {
      return {
        title: t('streak.display.status.startStreak.title'),
        message: t('streak.display.status.startStreak.message'),
        bgColor: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700",
        borderColor: "border-slate-200 dark:border-slate-600",
        textColor: "text-slate-600 dark:text-slate-400",
        streakColor: "text-slate-800 dark:text-slate-200",
      };
    } else if (currentStreak < 7) {
      return {
        title: t('streak.display.status.buildingMomentum.title'),
        message: t('streak.display.status.buildingMomentum.message'),
        bgColor: "from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20",
        borderColor: "border-blue-200 dark:border-blue-800",
        textColor: "text-blue-600 dark:text-blue-400",
        streakColor: "text-blue-800 dark:text-blue-200",
      };
    } else if (currentStreak < 30) {
      return {
        title: t('streak.display.status.greatProgress.title'),
        message: t('streak.display.status.greatProgress.message'),
        bgColor: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
        borderColor: "border-orange-200 dark:border-orange-800",
        textColor: "text-orange-600 dark:text-orange-400",
        streakColor: "text-orange-800 dark:text-orange-200",
      };
    } else {
      return {
        title: t('streak.display.status.streakMaster.title'),
        message: t('streak.display.status.streakMaster.message'),
        bgColor: "from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20",
        borderColor: "border-purple-200 dark:border-purple-800",
        textColor: "text-purple-600 dark:text-purple-400",
        streakColor: "text-purple-800 dark:text-purple-200",
      };
    }
  };

  const status = getStreakStatus();

  // Get next milestone
  const milestones = [7, 30, 50, 100, 200, 365];
  const nextMilestone = milestones.find(m => m > currentStreak);

  const handleStreakClick = () => {
    // Track interaction with streak display
    if (posthog) {
      posthog.capture('streak_display_clicked', {
        currentStreak,
        longestStreak,
        totalStudyDays,
        milestonesReached: milestonesReached.length,
      });
    }
  };

  return (
    <div
      className={`bg-gradient-to-r ${status.bgColor} border ${status.borderColor} rounded-lg p-6 cursor-pointer hover:shadow-lg dark:hover:shadow-slate-900/20 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-300 group ${className}`}
      onClick={handleStreakClick}
      data-testid="streak-display"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
          {t('streak.display.title')}
        </h3>
        {lastMilestone && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full hover:scale-105 transition-transform duration-200">
            🏅 {t('streak.display.milestoneAchieved', { count: lastMilestone })}
          </div>
        )}
      </div>

      {/* Current streak display */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${status.streakColor} mb-1 group-hover:scale-110 transition-transform duration-200`} data-testid="current-streak">
          {currentStreak}
        </div>
        <div className={`text-sm font-medium ${status.textColor} group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors`}>
          {currentStreak === 1 ? t('streak.display.day') : t('streak.display.days')}
        </div>
      </div>

      {/* Status message */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
          {status.title}
        </div>
        <div className={`text-sm ${status.textColor} group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors`}>
          {status.message}
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && currentStreak > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
            <span>{t('streak.display.nextMilestone')}</span>
            <span>{t('streak.display.milestoneAchieved', { count: nextMilestone })}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 group-hover:h-2.5 transition-all duration-200">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center group-hover:text-slate-400 dark:group-hover:text-slate-300 transition-colors">
            {t('streak.display.daysToGo', { count: nextMilestone - currentStreak })}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-600">
        <div className="text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors duration-200">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            {longestStreak}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            {t('streak.display.longestStreak')}
          </div>
        </div>
        <div className="text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors duration-200">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            {totalStudyDays}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            {t('streak.display.totalDays')}
          </div>
        </div>
      </div>

      {/* Milestones achieved */}
      {milestonesReached.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
            {t('streak.display.milestonesAchieved')}
          </div>
          <div className="flex flex-wrap gap-1">
            {milestonesReached.map((milestone: number) => (
              <span
                key={milestone}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full hover:scale-105 hover:bg-yellow-200 dark:hover:bg-yellow-900/40 transition-all duration-200 cursor-pointer"
              >
                🏅 {milestone}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
