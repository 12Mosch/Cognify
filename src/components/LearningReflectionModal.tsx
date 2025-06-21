import { memo, useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { showErrorToast } from '../lib/toast';
import { calculateDifficulty } from '../utils/difficulty';

interface LearningReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionContext?: {
    deckId: Id<"decks">;
    cardsReviewed: number;
    sessionDuration: number;
    averageSuccess: number;
  };
  sessionId?: string;
}

/**
 * Learning Reflection Modal Component
 * 
 * Provides metacognitive reflection tools including:
 * - Contextual reflection prompts
 * - Self-assessment ratings
 * - Learning strategy recommendations
 * - Confidence calibration insights
 * - Progress tracking and goal setting
 */
const LearningReflectionModal = memo(function LearningReflectionModal({
  isOpen,
  onClose,
  sessionContext,
  sessionId
}: LearningReflectionModalProps) {
  const { t } = useTranslation();

  // Helper function to convert API prompt to selected prompt
  const convertToSelectedPrompt = (prompt: ReflectionPrompt): SelectedPrompt => {
    // Validate category and provide safe fallback
    if (!isValidReflectionCategory(prompt.category)) {
      console.warn(`Invalid reflection category received from API: "${prompt.category}". Using fallback: "understanding"`);
    }

    return {
      category: isValidReflectionCategory(prompt.category)
        ? prompt.category
        : 'understanding', // Safe fallback - 'understanding' is a neutral, widely applicable category
      prompt: prompt.prompt,
      priority: prompt.priority,
    };
  };

  // Component state
  const [currentStep, setCurrentStep] = useState<'prompts' | 'strategies' | 'calibration'>('prompts');
  const [selectedPrompt, setSelectedPrompt] = useState<SelectedPrompt | null>(null);
  const [reflectionResponse, setReflectionResponse] = useState('');
  const [reflectionRating, setReflectionRating] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Convex queries and mutations
  const reflectionPrompts = useQuery(api.metacognition.getReflectionPrompts, {
    sessionContext,
  });
  
  const strategyRecommendations = useQuery(api.metacognition.getStrategyRecommendations, {
    context: sessionContext ? {
      difficulty: calculateDifficulty(sessionContext.averageSuccess),
      learningGoal: 'understanding',
      timeAvailable: 30,
      userLevel: 'intermediate',
    } : undefined,
  });

  const calibrationInsights = useQuery(api.metacognition.getConfidenceCalibrationInsights);
  const saveReflection = useMutation(api.metacognition.saveReflection);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('prompts');
      setSelectedPrompt(null);
      setReflectionResponse('');
      setReflectionRating(3);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle reflection submission
  const handleSubmitReflection = async () => {
    if (!selectedPrompt || !reflectionResponse.trim()) return;

    setIsSubmitting(true);
    try {
      await saveReflection({
        category: selectedPrompt.category,
        prompt: selectedPrompt.prompt,
        response: reflectionResponse.trim(),
        rating: reflectionRating,
        sessionId,
        deckId: sessionContext?.deckId,
      });

      // Move to next step or close
      if (currentStep === 'prompts') {
        setCurrentStep('strategies');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Error saving reflection:', error);
      // Show user-facing error notification
      showErrorToast(t('reflection.saveError', 'Failed to save reflection. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'difficulty': return '⚡';
      case 'strategy': return '🧠';
      case 'motivation': return '💪';
      case 'understanding': return '💡';
      case 'time_management': return '⏰';
      case 'goals': return '🎯';
      default: return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🧠</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t('reflection.title', 'Learning Reflection')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {currentStep === 'prompts' && t('reflection.subtitle.prompts', 'Reflect on your learning experience')}
                  {currentStep === 'strategies' && t('reflection.subtitle.strategies', 'Discover effective study strategies')}
                  {currentStep === 'calibration' && t('reflection.subtitle.calibration', 'Improve your self-assessment')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label={t('common.close', 'Close')}
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {['prompts', 'strategies', 'calibration'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step
                    ? 'bg-blue-600 text-white'
                    : index < ['prompts', 'strategies', 'calibration'].indexOf(currentStep)
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    index < ['prompts', 'strategies', 'calibration'].indexOf(currentStep)
                      ? 'bg-green-600'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'prompts' && (
            <ReflectionPromptsStep
              prompts={reflectionPrompts || []}
              selectedPrompt={selectedPrompt}
              onSelectPrompt={(prompt) => setSelectedPrompt(prompt ? convertToSelectedPrompt(prompt) : null)}
              response={reflectionResponse}
              onResponseChange={setReflectionResponse}
              rating={reflectionRating}
              onRatingChange={setReflectionRating}
              getPriorityStyle={getPriorityStyle}
              getCategoryIcon={getCategoryIcon}
              t={t}
            />
          )}

          {currentStep === 'strategies' && (
            <StrategyRecommendationsStep
              strategies={strategyRecommendations || []}
              onNext={() => setCurrentStep('calibration')}
              t={t}
            />
          )}

          {currentStep === 'calibration' && (
            <CalibrationInsightsStep
              insights={calibrationInsights}
              onClose={onClose}
              t={t}
            />
          )}
        </div>

        {/* Footer */}
        {currentStep === 'prompts' && (
          <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              {t('reflection.skip', 'Skip')}
            </button>
            <button
              onClick={() => void handleSubmitReflection()}
              disabled={!selectedPrompt || !reflectionResponse.trim() || isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('reflection.saving', 'Saving...') : t('reflection.continue', 'Continue')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

// Type definitions
type ReflectionCategory = "difficulty" | "strategy" | "motivation" | "understanding" | "time_management" | "goals";
type Priority = "high" | "medium" | "low";

// Type guard function to validate reflection categories
const isValidReflectionCategory = (category: string): category is ReflectionCategory => {
  return ["difficulty", "strategy", "motivation", "understanding", "time_management", "goals"].includes(category);
};

interface ReflectionPrompt {
  category: string;
  prompt: string;
  priority: Priority;
}

interface SelectedPrompt {
  category: ReflectionCategory;
  prompt: string;
  priority: string;
}

// Helper Component Interfaces
interface ReflectionPromptsStepProps {
  prompts: ReflectionPrompt[];
  selectedPrompt: SelectedPrompt | null;
  onSelectPrompt: (prompt: ReflectionPrompt | null) => void;
  response: string;
  onResponseChange: (value: string) => void;
  rating: number;
  onRatingChange: (value: number) => void;
  getPriorityStyle: (priority: string) => string;
  getCategoryIcon: (category: string) => string;
  t: TFunction;
}

// Helper Components
const ReflectionPromptsStep = memo(function ReflectionPromptsStep({
  prompts,
  selectedPrompt,
  onSelectPrompt,
  response,
  onResponseChange,
  rating,
  onRatingChange,
  getPriorityStyle,
  getCategoryIcon,
  t
}: ReflectionPromptsStepProps) {
  return (
    <div className="space-y-6">
      {/* Prompt Selection */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t('reflection.selectPrompt', 'Choose a reflection prompt')}
        </h3>
        <div className="space-y-3">
          {prompts.map((prompt, index: number) => (
            <button
              key={index}
              onClick={() => onSelectPrompt(prompt)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                selectedPrompt?.prompt === prompt.prompt
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : `${getPriorityStyle(prompt.priority)} hover:border-slate-300 dark:hover:border-slate-600`
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getCategoryIcon(prompt.category)}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                      {t(`reflection.categories.${prompt.category}`, prompt.category)}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      prompt.priority === 'high' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                      prompt.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                      'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    }`}>
                      {prompt.priority}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{prompt.prompt}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Response Input */}
      {selectedPrompt && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
            {t('reflection.yourResponse', 'Your reflection')}
          </h3>
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder={t('reflection.responsePlaceholder', 'Share your thoughts and insights...')}
            className="w-full h-32 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          
          {/* Rating */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('reflection.rateExperience', 'How would you rate this learning experience?')}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => onRatingChange(value)}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-colors ${
                    rating === value
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>{t('reflection.rating.poor', 'Poor')}</span>
              <span>{t('reflection.rating.excellent', 'Excellent')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

interface StrategyRecommendationsStepProps {
  strategies: Array<{
    strategy: {
      id: string;
      name: string;
      description: string;
      category: string;
      effectiveness: number;
      difficulty: string;
      timeRequired: number;
    };
    relevanceScore: number;
    reasoning: string;
  }>;
  onNext: () => void;
  t: TFunction;
}

const StrategyRecommendationsStep = memo(function StrategyRecommendationsStep({
  strategies,
  onNext,
  t
}: StrategyRecommendationsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t('reflection.strategies.title', 'Recommended Study Strategies')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {t('reflection.strategies.subtitle', 'Based on your learning patterns, here are some strategies that might help:')}
        </p>
      </div>

      <div className="space-y-4">
        {strategies.slice(0, 3).map((rec) => (
          <div key={rec.strategy.id} className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                {rec.strategy.name}
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {Math.round(rec.relevanceScore * 100)}% match
                </span>
                <div className={`px-2 py-1 text-xs rounded ${
                  rec.strategy.difficulty === 'beginner' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                  rec.strategy.difficulty === 'intermediate' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
                  'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                }`}>
                  {rec.strategy.difficulty}
                </div>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {rec.strategy.description}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {rec.reasoning}
            </p>
            {rec.strategy.timeRequired > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ⏱️ {rec.strategy.timeRequired} min additional time per session
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('reflection.continue', 'Continue')}
        </button>
      </div>
    </div>
  );
});

interface CalibrationInsightsStepProps {
  insights: {
    averageCalibrationError: number;
    overconfidenceBias: number;
    calibrationTrend: string;
    recommendations: string[];
  } | null | undefined;
  onClose: () => void;
  t: TFunction;
}

const CalibrationInsightsStep = memo(function CalibrationInsightsStep({
  insights,
  onClose,
  t
}: CalibrationInsightsStepProps) {
  if (!insights) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-slate-600 dark:text-slate-400">
          {t('reflection.calibration.loading', 'Loading calibration insights...')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t('reflection.calibration.title', 'Confidence Calibration Insights')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          {t('reflection.calibration.subtitle', 'How well do you predict your own performance?')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {Math.round(insights.averageCalibrationError * 100)}%
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t('reflection.calibration.averageError', 'Average Calibration Error')}
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
            {insights.calibrationTrend === 'improving' ? '📈' : 
             insights.calibrationTrend === 'declining' ? '📉' : '➡️'}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {t(`reflection.calibration.trend.${insights.calibrationTrend}`, insights.calibrationTrend)}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">
          {t('reflection.calibration.recommendations', 'Recommendations')}
        </h4>
        <div className="space-y-2">
          {insights.recommendations.map((rec: string, index: number) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">{rec}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          {t('reflection.complete', 'Complete')}
        </button>
      </div>
    </div>
  );
});

export default LearningReflectionModal;
