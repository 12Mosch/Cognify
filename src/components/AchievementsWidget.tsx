import { memo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';

interface AchievementsWidgetProps {
  className?: string;
}

/**
 * Achievements Widget Component
 * 
 * Displays user's gamification progress including:
 * - Unlocked achievements and badges
 * - Progress toward next achievements
 * - Category-based progress visualization
 * - Points and tier system
 * - Motivational elements
 */
const AchievementsWidget = memo(function AchievementsWidget({ 
  className = "" 
}: AchievementsWidgetProps) {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  // Fetch user achievements
  const achievementsData = useQuery(api.gamification.getUserAchievements);

  // Loading state
  if (achievementsData === undefined) {
    return <AchievementsWidgetSkeleton className={className} />;
  }

  const {
    unlockedAchievements,
    totalPoints,
    nextAchievements,
    categoryProgress,
  } = achievementsData;

  // Get tier styling
  const getTierStyle = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'gold':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'platinum':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'diamond':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'silver':
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'streak': return '🔥';
      case 'mastery': return '🎯';
      case 'velocity': return '⚡';
      case 'consistency': return '📅';
      case 'exploration': return '🗺️';
      case 'social': return '👥';
      default: return '🏆';
    }
  };

  const categories = Object.entries(categoryProgress);
  const recentAchievements = unlockedAchievements
    .sort((a, b) => b.unlockedAt - a.unlockedAt)
    .slice(0, 3);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🏆</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t('achievements.title', 'Achievements')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {totalPoints} {t('achievements.points', 'points')} • {unlockedAchievements.length} {t('achievements.unlocked', 'unlocked')}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowAllAchievements(!showAllAchievements)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {showAllAchievements ? 
            t('achievements.showSummary', 'Show Summary') : 
            t('achievements.showAll', 'Show All')
          }
        </button>
      </div>

      {!showAllAchievements ? (
        /* Summary View */
        <div className="space-y-6">
          {/* Recent Achievements */}
          {recentAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('achievements.recent', 'Recent Achievements')}
              </h4>
              <div className="space-y-2">
                {recentAchievements.map((achievement) => (
                  <AchievementCard
                    key={achievement.achievementId}
                    achievement={achievement.achievement}
                    unlockedAt={achievement.unlockedAt}
                    getTierStyle={getTierStyle}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category Progress */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('achievements.categoryProgress', 'Category Progress')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(([category, progress]) => (
                <div
                  key={category}
                  className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getCategoryIcon(category)}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                      {t(`achievements.categories.${category}`, category)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {Math.round(progress * 100)}% {t('achievements.complete', 'complete')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Achievements */}
          {nextAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('achievements.nextToUnlock', 'Next to Unlock')}
              </h4>
              <div className="space-y-3">
                {nextAchievements.slice(0, 3).map((next) => (
                  <ProgressAchievementCard
                    key={next.achievement.id}
                    achievement={next.achievement}
                    progress={next.progress}
                    currentValue={next.currentValue}
                    targetValue={next.targetValue}
                    getTierStyle={getTierStyle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* All Achievements View */
        <div className="space-y-4">
          {/* Filter by category */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {t('achievements.all', 'All')}
            </button>
            {categories.map(([category]) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1 ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <span>{getCategoryIcon(category)}</span>
                <span className="capitalize">{t(`achievements.categories.${category}`, category)}</span>
              </button>
            ))}
          </div>

          {/* Unlocked Achievements */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t('achievements.unlocked', 'Unlocked')} ({unlockedAchievements.length})
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {unlockedAchievements
                .filter(a => !selectedCategory || a.achievement.category === selectedCategory)
                .map((achievement) => (
                  <AchievementCard
                    key={achievement.achievementId}
                    achievement={achievement.achievement}
                    unlockedAt={achievement.unlockedAt}
                    getTierStyle={getTierStyle}
                  />
                ))}
            </div>
          </div>

          {/* Progress Achievements */}
          {nextAchievements.filter(a => !selectedCategory || a.achievement.category === selectedCategory).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                {t('achievements.inProgress', 'In Progress')}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {nextAchievements
                  .filter(a => !selectedCategory || a.achievement.category === selectedCategory)
                  .map((next) => (
                    <ProgressAchievementCard
                      key={next.achievement.id}
                      achievement={next.achievement}
                      progress={next.progress}
                      currentValue={next.currentValue}
                      targetValue={next.targetValue}
                      getTierStyle={getTierStyle}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Helper Components
const AchievementCard = memo(function AchievementCard({
  achievement,
  unlockedAt,
  getTierStyle
}: {
  achievement: {
    id: string;
    name: string;
    description: string;
    tier: string;
    icon: string;
    points: number;
  };
  unlockedAt?: number;
  getTierStyle: (tier: string) => string;
}) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
      <div className="text-2xl">{achievement.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium text-slate-900 dark:text-slate-100">
            {achievement.name}
          </h5>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getTierStyle(achievement.tier)}`}>
            {achievement.tier}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {achievement.description}
        </p>
        {unlockedAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('achievements.unlockedOn', 'Unlocked on')} {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          +{achievement.points}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          {t('achievements.points', 'points')}
        </div>
      </div>
    </div>
  );
});

const ProgressAchievementCard = memo(function ProgressAchievementCard({
  achievement,
  progress,
  currentValue,
  targetValue,
  getTierStyle
}: {
  achievement: {
    id: string;
    name: string;
    description: string;
    tier: string;
    icon: string;
    points: number;
  };
  progress: number;
  currentValue: number;
  targetValue: number;
  getTierStyle: (tier: string) => string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
      <div className="text-2xl opacity-60">{achievement.icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h5 className="font-medium text-slate-900 dark:text-slate-100">
            {achievement.name}
          </h5>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getTierStyle(achievement.tier)}`}>
            {achievement.tier}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          {achievement.description}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {currentValue}/{targetValue}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
          +{achievement.points}
        </div>
        <div className="text-xs text-slate-600 dark:text-slate-400">
          points
        </div>
      </div>
    </div>
  );
});

const AchievementsWidgetSkeleton = memo(function AchievementsWidgetSkeleton({ className }: { className: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
});

export default AchievementsWidget;
