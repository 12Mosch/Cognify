import { usePostHog } from "posthog-js/react";
import { useAnalyticsEnhanced } from "../lib/analytics";

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
	const newStudyAlgorithm = posthog?.isFeatureEnabled("new-study-algorithm");
	const darkModeToggle = posthog?.isFeatureEnabled("dark-mode-toggle");
	const advancedStatistics = posthog?.isFeatureEnabled("advanced-statistics");
	const socialSharing = posthog?.isFeatureEnabled("social-sharing");

	const handleFeatureClick = (flagKey: string, isEnabled: boolean) => {
		// For isFeatureEnabled(), we pass the boolean state as the variant
		trackFeatureFlag(flagKey, isEnabled ? "enabled" : "disabled");
	};

	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
			<h3 className="mb-4 font-bold text-slate-900 text-xl dark:text-slate-100">
				🚩 Feature Flags Demo
			</h3>

			<div className="space-y-4">
				{/* New Study Algorithm */}
				{newStudyAlgorithm && (
					<div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
						<h4 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
							🧠 Enhanced Study Algorithm
						</h4>
						<p className="mb-3 text-blue-700 text-sm dark:text-blue-300">
							You have access to our experimental spaced repetition
							improvements!
						</p>
						<button
							className="rounded bg-blue-500 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-600"
							onClick={() =>
								handleFeatureClick("new-study-algorithm", !!newStudyAlgorithm)
							}
							type="button"
						>
							Try Enhanced Algorithm
						</button>
					</div>
				)}

				{/* Dark Mode Toggle */}
				{darkModeToggle && (
					<div className="rounded-md border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/20">
						<h4 className="mb-2 font-semibold text-purple-900 dark:text-purple-100">
							🌙 Dark Mode Controls
						</h4>
						<p className="mb-3 text-purple-700 text-sm dark:text-purple-300">
							Advanced dark mode customization is available.
						</p>
						<button
							className="rounded bg-purple-500 px-3 py-1 text-sm text-white transition-colors hover:bg-purple-600"
							onClick={() =>
								handleFeatureClick("dark-mode-toggle", !!darkModeToggle)
							}
							type="button"
						>
							Customize Theme
						</button>
					</div>
				)}

				{/* Advanced Statistics */}
				{advancedStatistics && (
					<div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
						<h4 className="mb-2 font-semibold text-green-900 dark:text-green-100">
							📊 Advanced Analytics
						</h4>
						<p className="mb-3 text-green-700 text-sm dark:text-green-300">
							Detailed learning insights and progress tracking available.
						</p>
						<button
							className="rounded bg-green-500 px-3 py-1 text-sm text-white transition-colors hover:bg-green-600"
							onClick={() =>
								handleFeatureClick("advanced-statistics", !!advancedStatistics)
							}
							type="button"
						>
							View Analytics
						</button>
					</div>
				)}

				{/* Social Sharing */}
				{socialSharing && (
					<div className="rounded-md border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
						<h4 className="mb-2 font-semibold text-orange-900 dark:text-orange-100">
							🤝 Social Features
						</h4>
						<p className="mb-3 text-orange-700 text-sm dark:text-orange-300">
							Share your study progress and compete with friends.
						</p>
						<button
							className="rounded bg-orange-500 px-3 py-1 text-sm text-white transition-colors hover:bg-orange-600"
							onClick={() =>
								handleFeatureClick("social-sharing", !!socialSharing)
							}
							type="button"
						>
							Share Progress
						</button>
					</div>
				)}

				{/* No Features Active */}
				{!newStudyAlgorithm &&
					!darkModeToggle &&
					!advancedStatistics &&
					!socialSharing && (
						<div className="rounded-md border border-slate-300 bg-slate-100 p-4 text-center dark:border-slate-600 dark:bg-slate-700">
							<p className="text-slate-600 dark:text-slate-400">
								No experimental features are currently enabled for your account.
							</p>
							<p className="mt-2 text-slate-500 text-sm dark:text-slate-500">
								Feature flags are managed through PostHog and may be enabled for
								testing.
							</p>
						</div>
					)}
			</div>

			{/* Feature Flag Status */}
			<div className="mt-6 border-slate-200 border-t pt-4 dark:border-slate-700">
				<h4 className="mb-2 font-semibold text-slate-700 text-sm dark:text-slate-300">
					Feature Flag Status:
				</h4>
				<div className="grid grid-cols-2 gap-2 text-xs">
					<div className="flex justify-between">
						<span className="text-slate-600 dark:text-slate-400">
							Study Algorithm:
						</span>
						<span
							className={
								newStudyAlgorithm ? "text-green-600" : "text-slate-400"
							}
						>
							{newStudyAlgorithm ? "Enabled" : "Disabled"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-slate-600 dark:text-slate-400">
							Dark Mode:
						</span>
						<span
							className={darkModeToggle ? "text-green-600" : "text-slate-400"}
						>
							{darkModeToggle ? "Enabled" : "Disabled"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-slate-600 dark:text-slate-400">
							Analytics:
						</span>
						<span
							className={
								advancedStatistics ? "text-green-600" : "text-slate-400"
							}
						>
							{advancedStatistics ? "Enabled" : "Disabled"}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-slate-600 dark:text-slate-400">Social:</span>
						<span
							className={socialSharing ? "text-green-600" : "text-slate-400"}
						>
							{socialSharing ? "Enabled" : "Disabled"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
