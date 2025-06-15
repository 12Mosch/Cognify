import { memo } from "react";

interface LearningStreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Learning Streak Widget Component
 * 
 * Displays learning streak information with:
 * - Circular progress indicator
 * - Motivational messaging
 * - Streak milestones and achievements
 * - Dark theme support with glowing effects
 * - Responsive design
 */
const LearningStreakWidget = memo(function LearningStreakWidget({
  currentStreak,
  longestStreak
}: LearningStreakWidgetProps) {
  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your learning journey!";
    if (streak === 1) return "Great start! Keep it up!";
    if (streak < 7) return "Building momentum!";
    if (streak < 30) return "You're on fire! 🔥";
    if (streak < 100) return "Incredible dedication!";
    return "Legendary learner! 🏆";
  };

  const getStreakColor = (streak: number) => {
    if (streak === 0) return "text-slate-400";
    if (streak < 7) return "text-orange-500";
    if (streak < 30) return "text-red-500";
    if (streak < 100) return "text-purple-500";
    return "text-yellow-500";
  };

  const getStreakIcon = (streak: number) => {
    if (streak === 0) return "💤";
    if (streak < 7) return "🌱";
    if (streak < 30) return "🔥";
    if (streak < 100) return "⚡";
    return "👑";
  };

  // Calculate progress towards next milestone
  const getNextMilestone = (streak: number) => {
    if (streak < 7) return 7;
    if (streak < 30) return 30;
    if (streak < 100) return 100;
    if (streak < 365) return 365;
    return Math.ceil(streak / 100) * 100;
  };

  const nextMilestone = getNextMilestone(currentStreak);
  const progressPercentage = currentStreak > 0 ? (currentStreak / nextMilestone) * 100 : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          Learning Streak
        </h3>
        <span className="text-2xl" role="img" aria-label="Streak">
          {getStreakIcon(currentStreak)}
        </span>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          {/* Background Circle */}
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-slate-200 dark:text-slate-700"
            />
            {/* Progress Circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
              className={`transition-all duration-1000 ease-out ${getStreakColor(currentStreak)}`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getStreakColor(currentStreak)}`}>
                {currentStreak}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {currentStreak === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Message */}
      <div className="text-center mb-6">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {getStreakMessage(currentStreak)}
        </p>
        {currentStreak > 0 && currentStreak < nextMilestone && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {nextMilestone - currentStreak} days to reach {nextMilestone}-day milestone
          </p>
        )}
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className={`text-xl font-bold ${getStreakColor(currentStreak)}`}>
            {currentStreak}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Current</div>
        </div>
        <div className="text-center p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="text-xl font-bold text-purple-500 dark:text-purple-400">
            {longestStreak}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Best</div>
        </div>
      </div>

      {/* Milestone Progress */}
      {currentStreak > 0 && currentStreak < nextMilestone && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-2">
            <span>Progress to {nextMilestone} days</span>
            <span>{progressPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${
                currentStreak < 7 ? 'from-orange-400 to-orange-500' :
                currentStreak < 30 ? 'from-red-400 to-red-500' :
                currentStreak < 100 ? 'from-purple-400 to-purple-500' :
                'from-yellow-400 to-yellow-500'
              }`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Achievement Badge */}
      {currentStreak >= 7 && (
        <div className="mt-6 p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏆</span>
            <div>
              <div className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                {currentStreak >= 365 ? 'Year-Long Learner!' :
                 currentStreak >= 100 ? 'Century Club!' :
                 currentStreak >= 30 ? 'Monthly Master!' :
                 'Weekly Warrior!'}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Keep up the amazing consistency!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default LearningStreakWidget;
