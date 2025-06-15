import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAnalytics } from "../lib/analytics";

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

  if (streakData === undefined) {
    return (
      <div className={`bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-orange-200 dark:bg-orange-700 rounded w-32 mb-4"></div>
          <div className="h-12 bg-orange-200 dark:bg-orange-700 rounded w-20 mb-2"></div>
          <div className="h-4 bg-orange-200 dark:bg-orange-700 rounded w-48"></div>
        </div>
      </div>
    );
  }

  const { currentStreak, longestStreak, totalStudyDays, milestonesReached, lastMilestone } = streakData;

  // Determine streak status and styling
  const getStreakStatus = () => {
    if (currentStreak === 0) {
      return {
        title: "Start Your Streak! 🎯",
        message: "Study today to begin your learning journey",
        bgColor: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700",
        borderColor: "border-slate-200 dark:border-slate-600",
        textColor: "text-slate-600 dark:text-slate-400",
        streakColor: "text-slate-800 dark:text-slate-200",
      };
    } else if (currentStreak < 7) {
      return {
        title: "Building Momentum! 🌱",
        message: "Keep going to reach your first milestone",
        bgColor: "from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20",
        borderColor: "border-green-200 dark:border-green-800",
        textColor: "text-green-600 dark:text-green-400",
        streakColor: "text-green-800 dark:text-green-200",
      };
    } else if (currentStreak < 30) {
      return {
        title: "Great Progress! 🔥",
        message: "You're developing a strong habit",
        bgColor: "from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20",
        borderColor: "border-orange-200 dark:border-orange-800",
        textColor: "text-orange-600 dark:text-orange-400",
        streakColor: "text-orange-800 dark:text-orange-200",
      };
    } else {
      return {
        title: "Streak Master! 🏆",
        message: "You're a dedicated learner",
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
      className={`bg-gradient-to-r ${status.bgColor} border ${status.borderColor} rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onClick={handleStreakClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Study Streak
        </h3>
        {lastMilestone && (
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full">
            🏅 {lastMilestone} days
          </div>
        )}
      </div>

      {/* Current streak display */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${status.streakColor} mb-1`}>
          {currentStreak}
        </div>
        <div className={`text-sm font-medium ${status.textColor}`}>
          {currentStreak === 1 ? 'day' : 'days'}
        </div>
      </div>

      {/* Status message */}
      <div className="text-center mb-4">
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
          {status.title}
        </div>
        <div className={`text-sm ${status.textColor}`}>
          {status.message}
        </div>
      </div>

      {/* Progress to next milestone */}
      {nextMilestone && currentStreak > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
            <span>Next milestone</span>
            <span>{nextMilestone} days</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((currentStreak / nextMilestone) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            {nextMilestone - currentStreak} days to go
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-600">
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {longestStreak}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Longest Streak
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {totalStudyDays}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Total Days
          </div>
        </div>
      </div>

      {/* Milestones achieved */}
      {milestonesReached.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
            Milestones Achieved
          </div>
          <div className="flex flex-wrap gap-1">
            {milestonesReached.map((milestone) => (
              <span
                key={milestone}
                className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full"
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
