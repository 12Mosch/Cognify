import { useTranslation } from "react-i18next";
import { Id } from "../../convex/_generated/dataModel";

interface StudyModeSelectorProps {
  deckId: Id<"decks">;
  deckName: string;
  onSelectMode: (mode: 'basic' | 'spaced-repetition') => void;
  onCancel: () => void;
}

/**
 * StudyModeSelector Component - Choose between different study modes
 * 
 * This component allows users to select between different study modes:
 * - Basic Study: Simple sequential review of all cards
 * - Spaced Repetition: Intelligent scheduling using SM-2 algorithm
 */
function StudyModeSelector({ deckId: _deckId, deckName, onSelectMode, onCancel }: StudyModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{t('study.modeSelector.title')}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {t('study.modeSelector.subtitle', { deckName })}
        </p>
      </div>

      {/* Study Mode Options */}
      <div className="grid gap-6">
        {/* Basic Study Mode */}
        <div
          className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group"
          onClick={() => onSelectMode('basic')}
          data-testid="basic-study-card"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg 
                className="w-6 h-6 text-blue-600 dark:text-blue-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 5l7 7-7 7" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {t('study.modeSelector.basicStudy.title')}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                {t('study.modeSelector.basicStudy.description')}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {t('study.modeSelector.basicStudy.features.sequential')}
                </span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {t('study.modeSelector.basicStudy.features.simple')}
                </span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  {t('study.modeSelector.basicStudy.features.quick')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Spaced Repetition Mode */}
        <div
          className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer group"
          onClick={() => onSelectMode('spaced-repetition')}
          data-testid="spaced-repetition-card"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg 
                className="w-6 h-6 text-green-600 dark:text-green-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z" 
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                {t('study.modeSelector.spacedRepetition.title')}
                <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {t('study.modeSelector.spacedRepetition.subtitle')}
                </span>
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                {t('study.modeSelector.spacedRepetition.description')}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {t('study.modeSelector.spacedRepetition.features.algorithm')}
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {t('study.modeSelector.spacedRepetition.features.timing')}
                </span>
                <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                  {t('study.modeSelector.spacedRepetition.features.retention')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Button */}
      <div className="text-center">
        <button
          onClick={onCancel}
          className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-6 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium"
        >
          {t('study.modeSelector.cancel')}
        </button>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <svg 
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
              {t('study.modeSelector.info.title')}
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('study.modeSelector.info.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudyModeSelector;
