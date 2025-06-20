import { memo, useState } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import { formatTimeSlot } from '../utils/scheduling';

interface LearningAnalyticsDashboardProps {
  onBack: () => void;
}

/**
 * Learning Analytics Dashboard Component
 * 
 * Provides comprehensive learning insights and analytics including:
 * - Personal learning patterns and performance metrics
 * - Retention curves and difficulty analysis
 * - Time-of-day performance optimization
 * - Predictive analytics for card mastery
 * - Personalized study recommendations
 * - Learning velocity tracking
 */
const LearningAnalyticsDashboard = memo(function LearningAnalyticsDashboard({ 
  onBack 
}: LearningAnalyticsDashboardProps) {
  const { t } = useTranslation();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch learning analytics data
  const learningPattern = useQuery(api.adaptiveLearning.getUserLearningPattern);
  const spacedRepetitionInsights = useQuery(api.statistics.getSpacedRepetitionInsights);
  const studyActivityData = useQuery(api.studySessions.getStudyActivityHeatmapData);

  // Loading state
  if (learningPattern === undefined || spacedRepetitionInsights === undefined || studyActivityData === undefined) {
    return <AnalyticsSkeleton />;
  }

  // No data state
  if (!learningPattern) {
    return <NoDataState onBack={onBack} />;
  }

  // Get time-of-day insights
  const getOptimalStudyTimes = () => {
    const timeSlots = Object.entries(learningPattern.timeOfDayPerformance)
      .filter(([_, data]) => data.reviewCount >= 5)
      .sort(([_, a], [__, b]) => b.successRate - a.successRate)
      .slice(0, 3);

    return timeSlots.map(([slot, data]) => ({
      timeSlot: slot,
      successRate: data.successRate,
      reviewCount: data.reviewCount,
      averageResponseTime: data.averageResponseTime,
    }));
  };

  const optimalTimes = getOptimalStudyTimes();

  // Get difficulty insights
  const getDifficultyInsights = () => {
    const { easyCards, mediumCards, hardCards } = learningPattern.difficultyPatterns;
    return [
      { difficulty: 'Easy', successRate: easyCards.successRate, averageInterval: easyCards.averageInterval },
      { difficulty: 'Medium', successRate: mediumCards.successRate, averageInterval: mediumCards.averageInterval },
      { difficulty: 'Hard', successRate: hardCards.successRate, averageInterval: hardCards.averageInterval },
    ];
  };

  const difficultyInsights = getDifficultyInsights();

  // Get learning recommendations
  const getRecommendations = () => {
    const recommendations = [];

    // Time-based recommendations
    if (optimalTimes.length > 0) {
      const bestTime = optimalTimes[0];
      recommendations.push({
        type: 'time',
        title: t('statistics.analytics.recommendations.optimalTime.title'),
        description: t('statistics.analytics.recommendations.optimalTime.description', {
          time: formatTimeSlot(bestTime.timeSlot, t, 'analytics'),
          successRate: Math.round(bestTime.successRate * 100)
        }),
        priority: 'high' as const,
      });
    }

    // Difficulty-based recommendations
    const hardCards = difficultyInsights.find(d => d.difficulty === 'Hard');
    if (hardCards && hardCards.successRate < 0.6) {
      recommendations.push({
        type: 'difficulty',
        title: t('statistics.analytics.recommendations.difficultCards.title'),
        description: t('statistics.analytics.recommendations.difficultCards.description'),
        priority: 'medium' as const,
      });
    }

    // Learning velocity recommendations
    if (learningPattern.learningVelocity < 0.5) {
      recommendations.push({
        type: 'velocity',
        title: t('statistics.analytics.recommendations.slowLearning.title'),
        description: t('statistics.analytics.recommendations.slowLearning.description'),
        priority: 'low' as const,
      });
    } else if (learningPattern.learningVelocity > 2.0) {
      recommendations.push({
        type: 'velocity',
        title: t('statistics.analytics.recommendations.fastLearning.title'),
        description: t('statistics.analytics.recommendations.fastLearning.description'),
        priority: 'low' as const,
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
            >
              ← {t('statistics.analytics.back')}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {t('analytics.title', 'Learning Analytics')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                {t('analytics.subtitle', 'Insights into your learning patterns and performance')}
              </p>
            </div>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  selectedTimeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {t(`analytics.timeRange.${range}`, range.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title={t('analytics.metrics.successRate.title', 'Success Rate')}
            value={`${Math.round(learningPattern.averageSuccessRate * 100)}%`}
            change={spacedRepetitionInsights.retentionRate ? 
              `${Math.round(spacedRepetitionInsights.retentionRate)}% retention` : undefined}
            trend="up"
            icon="📈"
          />
          <MetricCard
            title={t('analytics.metrics.learningVelocity.title', 'Learning Velocity')}
            value={`${learningPattern.learningVelocity.toFixed(1)}`}
            subtitle={t('analytics.metrics.learningVelocity.subtitle', 'cards/day')}
            trend={learningPattern.learningVelocity > 1 ? "up" : "down"}
            icon="⚡"
          />
          <MetricCard
            title={t('analytics.metrics.dueCards.title', 'Due Cards')}
            value={spacedRepetitionInsights.totalDueCards.toString()}
            subtitle={t('analytics.metrics.dueCards.subtitle', 'ready to review')}
            trend="neutral"
            icon="📚"
          />
          <MetricCard
            title={t('analytics.metrics.averageInterval.title', 'Avg Interval')}
            value={spacedRepetitionInsights.averageInterval ? 
              `${Math.round(spacedRepetitionInsights.averageInterval)}d` : 'N/A'}
            subtitle={t('analytics.metrics.averageInterval.subtitle', 'between reviews')}
            trend="neutral"
            icon="⏰"
          />
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              {t('analytics.recommendations.title', 'Personalized Recommendations')}
            </h2>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Time-of-Day Performance */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t('analytics.timePerformance.title', 'Time-of-Day Performance')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {optimalTimes.map((time, index) => (
              <div key={time.timeSlot} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatTimeSlot(time.timeSlot, t, 'analytics')}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    index === 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                    index === 1 ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                    'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                  }`}>
                    #{index + 1}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                  {Math.round(time.successRate * 100)}%
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {time.reviewCount} reviews • {Math.round(time.averageResponseTime / 1000)}s avg
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty Analysis */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t('analytics.difficultyAnalysis.title', 'Difficulty Analysis')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficultyInsights.map((insight) => (
              <div key={insight.difficulty} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {insight.difficulty} Cards
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    insight.successRate > 0.8 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                    insight.successRate > 0.6 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                    'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                  }`}>
                    {Math.round(insight.successRate * 100)}%
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Avg interval: {Math.round(insight.averageInterval)} days
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Retention Curve */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t('analytics.retentionCurve.title', 'Personal Retention Curve')}
          </h2>
          <div className="space-y-4">
            {learningPattern.retentionCurve.map((point, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-16 text-sm text-slate-600 dark:text-slate-400">
                  {point.interval}d
                </div>
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${point.retentionRate * 100}%` }}
                  />
                </div>
                <div className="w-16 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {Math.round(point.retentionRate * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// Helper Components
const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  change,
  trend,
  icon
}: {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
        {value}
      </div>
      {subtitle && (
        <div className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</div>
      )}
      {change && (
        <div className={`text-sm mt-2 ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' :
          trend === 'down' ? 'text-red-600 dark:text-red-400' :
          'text-slate-600 dark:text-slate-400'
        }`}>
          {change}
        </div>
      )}
    </div>
  );
});

const RecommendationCard = memo(function RecommendationCard({
  recommendation
}: {
  recommendation: {
    type: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  };
}) {
  const priorityColors = {
    high: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    medium: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
    low: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div className={`p-4 rounded-lg border ${priorityColors[recommendation.priority]}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl">
          {recommendation.type === 'time' ? '⏰' :
           recommendation.type === 'difficulty' ? '🎯' :
           recommendation.type === 'velocity' ? '⚡' : '💡'}
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
            {recommendation.title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {recommendation.description}
          </p>
        </div>
      </div>
    </div>
  );
});

const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    </div>
  );
});

const NoDataState = memo(function NoDataState({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t('analytics.noData.title', 'Not Enough Data Yet')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {t('analytics.noData.description', 'Complete at least 20 reviews to see your learning analytics.')}
        </p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('analytics.noData.backButton', 'Back to Dashboard')}
        </button>
      </div>
    </div>
  );
});

export default LearningAnalyticsDashboard;
