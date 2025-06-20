import { memo } from "react";
import { useTranslation } from "react-i18next";

// Define type that matches the actual Convex query return structure
// Manually defined to ensure proper optional property handling
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

interface SpacedRepetitionInsightsProps {
  insights: SpacedRepetitionInsights;
}

/**
 * Spaced Repetition Insights Widget Component
 * 
 * Displays key spaced repetition algorithm insights with:
 * - Algorithm performance metrics
 * - Learning efficiency indicators
 * - Visual progress indicators
 * - Dark theme support with accent colors
 * - Responsive design
 */
const SpacedRepetitionInsights = memo(function SpacedRepetitionInsights({
  insights
}: SpacedRepetitionInsightsProps) {
  const { t } = useTranslation();

  const getRetentionColor = (rate?: number) => {
    if (!rate) return "text-slate-400";
    if (rate >= 90) return "text-blue-500";
    if (rate >= 80) return "text-cyan-500";
    if (rate >= 70) return "text-amber-500";
    return "text-red-500";
  };

  const getRetentionMessage = (rate?: number) => {
    if (!rate) return t('statistics.widgets.spacedRepetition.retentionMessages.noData');
    if (rate >= 90) return t('statistics.widgets.spacedRepetition.retentionMessages.excellent');
    if (rate >= 80) return t('statistics.widgets.spacedRepetition.retentionMessages.good');
    if (rate >= 70) return t('statistics.widgets.spacedRepetition.retentionMessages.fair');
    return t('statistics.widgets.spacedRepetition.retentionMessages.needsImprovement');
  };

  const getIntervalEfficiency = (interval?: number) => {
    if (!interval) return { level: t('statistics.widgets.spacedRepetition.intervalEfficiency.unknown'), color: "text-slate-400" };
    if (interval >= 30) return { level: t('statistics.widgets.spacedRepetition.intervalEfficiency.excellent'), color: "text-green-500" };
    if (interval >= 14) return { level: t('statistics.widgets.spacedRepetition.intervalEfficiency.good'), color: "text-blue-500" };
    if (interval >= 7) return { level: t('statistics.widgets.spacedRepetition.intervalEfficiency.fair'), color: "text-yellow-500" };
    return { level: t('statistics.widgets.spacedRepetition.intervalEfficiency.learning'), color: "text-orange-500" };
  };

  const intervalEfficiency = getIntervalEfficiency(insights.averageInterval);

  const totalCards = insights.totalDueCards + insights.totalNewCards;
  const workloadBalance = totalCards > 0 ? (insights.totalNewCards / totalCards) * 100 : 0;

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">
          {t('statistics.widgets.spacedRepetition.title')}
        </h3>
        <span className="text-2xl" role="img" aria-label="Brain">
          🧠
        </span>
      </div>

      {/* Key Metrics */}
      <div className="space-y-4">
        {/* Retention Rate */}
        <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('statistics.widgets.spacedRepetition.retentionRate')}
            </span>
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${getRetentionColor(insights.retentionRate)}`}>
              {insights.retentionRate !== undefined ? `${insights.retentionRate.toFixed(1)}%` : 'N/A'}
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {getRetentionMessage(insights.retentionRate)}
              </div>
              {insights.retentionRate !== undefined && (
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 mt-1">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      insights.retentionRate >= 90 ? 'bg-green-500' :
                      insights.retentionRate >= 80 ? 'bg-blue-500' :
                      insights.retentionRate >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(insights.retentionRate, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Average Interval */}
        <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('statistics.widgets.spacedRepetition.averageInterval')}
            </span>
            <span className="text-lg">⏱️</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-2xl font-bold ${intervalEfficiency.color}`}>
              {insights.averageInterval ? `${insights.averageInterval.toFixed(1)}d` : 'N/A'}
            </div>
            <div className="flex-1">
              <div className={`text-xs font-medium ${intervalEfficiency.color}`}>
                {intervalEfficiency.level}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t('statistics.widgets.spacedRepetition.timeBetweenReviews')}
              </div>
            </div>
          </div>
        </div>

        {/* Workload Balance */}
        <div className="p-4 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('statistics.widgets.spacedRepetition.newVsReviewBalance')}
            </span>
            <span className="text-lg">⚖️</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400">{t('statistics.widgets.spacedRepetition.newCards')}</span>
              <span className="font-semibold">{insights.totalNewCards}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-red-600 dark:text-red-400">{t('statistics.widgets.spacedRepetition.dueCards')}</span>
              <span className="font-semibold">{insights.totalDueCards}</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mt-2">
              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-red-500 relative">
                <div 
                  className="absolute top-0 left-0 h-2 bg-blue-500 rounded-l-full transition-all duration-500"
                  style={{ width: `${workloadBalance}%` }}
                ></div>
              </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
              {t('statistics.widgets.spacedRepetition.balancePercentage', {
                newPercentage: workloadBalance.toFixed(0),
                reviewPercentage: (100 - workloadBalance).toFixed(0)
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Algorithm Tips */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <span className="text-lg mt-0.5">💡</span>
          <div>
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">
              {t('statistics.widgets.spacedRepetition.algorithmTip')}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              {insights.retentionRate !== undefined && insights.retentionRate < 80 ?
                t('statistics.widgets.spacedRepetition.tips.improveRetention') :
                insights.averageInterval && insights.averageInterval < 7 ?
                t('statistics.widgets.spacedRepetition.tips.frequentReviews') :
                insights.totalDueCards > insights.totalNewCards * 2 ?
                t('statistics.widgets.spacedRepetition.tips.balanceDueCards') :
                t('statistics.widgets.spacedRepetition.tips.workingWell')
              }
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-500 dark:text-cyan-400">
            {insights.upcomingReviews.length}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{t('statistics.widgets.spacedRepetition.reviewDays')}</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-500 dark:text-purple-400">
            {insights.cardsToReviewToday}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{t('statistics.widgets.spacedRepetition.dueToday')}</div>
        </div>
      </div>
    </div>
  );
});

export default SpacedRepetitionInsights;
