import { usePostHog } from 'posthog-js/react';
import { useAnalyticsEnhanced } from '../lib/analytics';

/**
 * Feature Flag Demo Component
 * 
 * Demonstrates how to use PostHog feature flags in the flashcard app.
 * This component shows different features based on feature flag values
 * and tracks feature interactions for analytics.
 * 
 * Example feature flags:
 * - 'new-study-algorithm': Enable experimental spaced repetition improvements
 * - 'dark-mode-toggle': Show dark mode toggle in UI
 * - 'advanced-statistics': Enable detailed analytics dashboard
 * - 'social-sharing': Allow sharing study progress
 */
export default function FeatureFlagDemo() {
  const posthog = usePostHog();
  const { trackFeatureFlag } = useAnalyticsEnhanced();

  // Check feature flags - use isFeatureEnabled() to avoid truthy-string traps
  // getFeatureFlag() can return strings like 'control' which evaluate to truthy
  // even when the feature should be disabled. isFeatureEnabled() guarantees boolean.
  const newStudyAlgorithm = posthog?.isFeatureEnabled('new-study-algorithm');
  const darkModeToggle = posthog?.isFeatureEnabled('dark-mode-toggle');
  const advancedStatistics = posthog?.isFeatureEnabled('advanced-statistics');
  const socialSharing = posthog?.isFeatureEnabled('social-sharing');

  const handleFeatureClick = (flagKey: string, isEnabled: boolean) => {
    // For isFeatureEnabled(), we pass the boolean state as the variant
    trackFeatureFlag(flagKey, isEnabled ? 'enabled' : 'disabled');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
        🚩 Feature Flags Demo
      </h3>
      
      <div className="space-y-4">
        {/* New Study Algorithm */}
        {newStudyAlgorithm && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🧠 Enhanced Study Algorithm
            </h4>
            <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
              You have access to our experimental spaced repetition improvements!
            </p>
            <button
              onClick={() => handleFeatureClick('new-study-algorithm', !!newStudyAlgorithm)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Try Enhanced Algorithm
            </button>
          </div>
        )}

        {/* Dark Mode Toggle */}
        {darkModeToggle && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              🌙 Dark Mode Controls
            </h4>
            <p className="text-purple-700 dark:text-purple-300 text-sm mb-3">
              Advanced dark mode customization is available.
            </p>
            <button
              onClick={() => handleFeatureClick('dark-mode-toggle', !!darkModeToggle)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Customize Theme
            </button>
          </div>
        )}

        {/* Advanced Statistics */}
        {advancedStatistics && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              📊 Advanced Analytics
            </h4>
            <p className="text-green-700 dark:text-green-300 text-sm mb-3">
              Detailed learning insights and progress tracking available.
            </p>
            <button
              onClick={() => handleFeatureClick('advanced-statistics', !!advancedStatistics)}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              View Analytics
            </button>
          </div>
        )}

        {/* Social Sharing */}
        {socialSharing && (
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
              🤝 Social Features
            </h4>
            <p className="text-orange-700 dark:text-orange-300 text-sm mb-3">
              Share your study progress and compete with friends.
            </p>
            <button
              onClick={() => handleFeatureClick('social-sharing', !!socialSharing)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm transition-colors"
            >
              Share Progress
            </button>
          </div>
        )}

        {/* No Features Active */}
        {!newStudyAlgorithm && !darkModeToggle && !advancedStatistics && !socialSharing && (
          <div className="p-4 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-center">
            <p className="text-slate-600 dark:text-slate-400">
              No experimental features are currently enabled for your account.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
              Feature flags are managed through PostHog and may be enabled for testing.
            </p>
          </div>
        )}
      </div>

      {/* Feature Flag Status */}
      <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Feature Flag Status:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Study Algorithm:</span>
            <span className={newStudyAlgorithm ? 'text-green-600' : 'text-slate-400'}>
              {newStudyAlgorithm ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Dark Mode:</span>
            <span className={darkModeToggle ? 'text-green-600' : 'text-slate-400'}>
              {darkModeToggle ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Analytics:</span>
            <span className={advancedStatistics ? 'text-green-600' : 'text-slate-400'}>
              {advancedStatistics ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 dark:text-slate-400">Social:</span>
            <span className={socialSharing ? 'text-green-600' : 'text-slate-400'}>
              {socialSharing ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
