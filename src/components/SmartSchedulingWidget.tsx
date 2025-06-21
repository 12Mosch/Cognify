import { memo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { formatTimeSlot } from '../utils/scheduling';

interface SmartSchedulingWidgetProps {
  className?: string;
}

/**
 * Smart Scheduling Widget Component
 * 
 * Provides intelligent study session recommendations including:
 * - Real-time optimal study time detection
 * - Personalized scheduling based on performance patterns
 * - Energy level predictions
 * - Immediate study recommendations
 * - Weekly study schedule overview
 */
const SmartSchedulingWidget = memo(function SmartSchedulingWidget({ 
  className = "" 
}: SmartSchedulingWidgetProps) {
  const { t } = useTranslation();
  const [showWeeklySchedule, setShowWeeklySchedule] = useState(false);

  // Fetch today's recommendations and weekly schedule
  const todayRecommendations = useQuery(api.smartScheduling.getTodayStudyRecommendations, {
    userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  
  const weeklySchedule = useQuery(api.smartScheduling.getStudyRecommendations, {
    daysAhead: 7,
    userTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Loading state
  if (todayRecommendations === undefined || weeklySchedule === undefined) {
    return <SchedulingWidgetSkeleton className={className} />;
  }

  // Error state - Convex returns null for query errors
  if (todayRecommendations === null || weeklySchedule === null) {
    return <SchedulingErrorState className={className} />;
  }

  // No data state
  if (!todayRecommendations) {
    return <NoSchedulingDataState className={className} />;
  }

  const {
    currentTimeSlot,
    isOptimalTime,
    nextOptimalTime,
    immediateRecommendation,
    dueCardsCount,
    newCardsAvailable,
    energyLevelPrediction,
  } = todayRecommendations;

  // Get energy level styling
  const getEnergyLevelStyle = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'low':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600';
    }
  };



  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-all duration-300 group ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
            <span className="text-white text-lg">🧠</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
              {t('scheduling.title', 'Smart Scheduling')}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
              {t('scheduling.subtitle', 'AI-powered study recommendations')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowWeeklySchedule(!showWeeklySchedule)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:scale-105 transition-all duration-200 px-3 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          {showWeeklySchedule ?
            t('scheduling.showToday', 'Show Today') :
            t('scheduling.showWeekly', 'Show Weekly')
          }
        </button>
      </div>

      {!showWeeklySchedule ? (
        /* Today's Recommendations */
        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {t('scheduling.currentTime', 'Current Time Slot')}
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                {formatTimeSlot(currentTimeSlot, t, 'scheduling')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-200 hover:scale-105 ${
                isOptimalTime
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                  : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
              }`}>
                {isOptimalTime ?
                  t('scheduling.optimal', 'Optimal') :
                  t('scheduling.suboptimal', 'Sub-optimal')
                }
              </div>
            </div>
          </div>

          {/* Energy Level */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 cursor-pointer">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                {t('scheduling.energyLevel', 'Predicted Energy Level')}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border transition-all duration-200 hover:scale-105 ${getEnergyLevelStyle(energyLevelPrediction)}`}>
                <span>
                  {energyLevelPrediction === 'high' ? '🔥' :
                   energyLevelPrediction === 'medium' ? '⚡' : '😴'}
                </span>
                {t(`scheduling.energy.${energyLevelPrediction}`, energyLevelPrediction)}
              </div>
            </div>
          </div>

          {/* Cards Available */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">
                {dueCardsCount}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                {t('scheduling.dueCards', 'Due Cards')}
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 hover:border-green-300 dark:hover:border-green-700 hover:scale-105 transition-all duration-200 cursor-pointer">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
                {newCardsAvailable}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {t('scheduling.newCards', 'New Cards')}
              </div>
            </div>
          </div>

          {/* Immediate Recommendation */}
          {immediateRecommendation && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 hover:border-purple-300 dark:hover:border-purple-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="text-2xl hover:scale-110 transition-transform duration-200">💡</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    {immediateRecommendation.action}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                    {immediateRecommendation.reasoning}
                  </p>
                  {immediateRecommendation.estimatedDuration > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        ⏱️ {immediateRecommendation.estimatedDuration} min
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        📚 {immediateRecommendation.expectedCards} cards
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                        🎯 {Math.round(immediateRecommendation.confidence * 100)}% confidence
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Optimal Time */}
          {nextOptimalTime && !isOptimalTime && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:border-yellow-300 dark:hover:border-yellow-700 hover:scale-[1.02] transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 hover:scale-110 transition-transform duration-200">⏰</span>
                <span className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-600 dark:hover:text-yellow-200 transition-colors">
                  {t('scheduling.nextOptimal', 'Next optimal time')}: <strong>{nextOptimalTime}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Weekly Schedule */
        <div className="space-y-4">
          {weeklySchedule && weeklySchedule.length > 0 ? (
            weeklySchedule.slice(0, 7).map((day, index) => (
              <WeeklyScheduleDay key={day.date} day={day} isToday={index === 0} />
            ))
          ) : weeklySchedule === null ? (
            /* Weekly schedule error state */
            <div className="text-center py-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-red-700 dark:text-red-300 font-medium mb-1">
                {t('scheduling.weeklyError.title', 'Unable to load weekly schedule')}
              </div>
              <div className="text-sm text-red-600 dark:text-red-400">
                {t('scheduling.weeklyError.description', 'Today\'s recommendations are still available above')}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {t('scheduling.noWeeklyData', 'Weekly schedule will appear after more study sessions')}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Helper Components
const WeeklyScheduleDay = memo(function WeeklyScheduleDay({
  day,
  isToday
}: {
  day: {
    date: string;
    recommendations: Array<{
      timeSlot: string;
      startTime: string;
      duration: number;
      expectedCards: number;
      priority: string;
    }>;
    totalEstimatedCards: number;
    estimatedStudyTime: number;
  };
  isToday: boolean;
}) {
  const { i18n } = useTranslation();
  const date = new Date(day.date);
  const dayName = date.toLocaleDateString(i18n.language, { weekday: 'short' });
  const dayNumber = date.getDate();

  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 hover:scale-[1.02] cursor-pointer ${
      isToday
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700'
        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-transform duration-200 hover:scale-110 ${
            isToday
              ? 'bg-blue-600 text-white'
              : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
          }`}>
            {dayNumber}
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              {dayName}
              {isToday && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">Today</span>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
            {day.totalEstimatedCards} cards
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
            {day.estimatedStudyTime} min
          </div>
        </div>
      </div>
      
      {day.recommendations.length > 0 && (
        <div className="space-y-2">
          {day.recommendations.slice(0, 2).map((rec, index) => (
            <div key={index} className="flex items-center justify-between text-sm hover:bg-slate-100 dark:hover:bg-slate-600 p-2 rounded transition-colors duration-200">
              <span className="text-slate-600 dark:text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors">
                {rec.startTime} • {rec.duration}min
              </span>
              <span className={`px-2 py-1 rounded text-xs transition-all duration-200 hover:scale-105 ${
                rec.priority === 'high'
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : rec.priority === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                  : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              }`}>
                {rec.expectedCards} cards
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

const SchedulingWidgetSkeleton = memo(function SchedulingWidgetSkeleton({ className }: { className: string }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
});

const NoSchedulingDataState = memo(function NoSchedulingDataState({ className }: { className: string }) {
  const { t } = useTranslation();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🧠</div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {t('scheduling.noData.title', 'Building Your Schedule')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('scheduling.noData.description', 'Complete a few study sessions to get personalized recommendations')}
        </p>
      </div>
    </div>
  );
});

const SchedulingErrorState = memo(function SchedulingErrorState({ className }: { className: string }) {
  const { t } = useTranslation();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl p-6 border border-red-200 dark:border-red-700 ${className}`}>
      <div className="text-center py-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
          {t('scheduling.error.title', 'Unable to load recommendations')}
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {t('scheduling.error.description', 'Please try again later')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {t('scheduling.error.retry', 'Retry')}
        </button>
      </div>
    </div>
  );
});

export default SmartSchedulingWidget;
