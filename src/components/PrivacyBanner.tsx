import { usePostHog } from "posthog-js/react";
import { useEffect, useState } from "react";
import {
	type EnhancedPrivacySettings,
	getEnhancedPrivacySettings,
	markPrivacyBannerShown,
	setEnhancedPrivacySettings,
	shouldShowPrivacyBanner,
} from "../lib/analytics";
import { showInfoToast } from "../lib/toast";

interface PrivacyBannerProps {
	onSettingsClick?: (onSettingsClosed?: () => void) => void;
}

/**
 * Privacy Banner Component for GDPR/CCPA Compliance
 *
 * Displays a privacy consent banner when users first visit the site.
 * Provides options to accept all, reject all, or customize privacy settings.
 * Automatically detects user region and shows appropriate messaging.
 */
export default function PrivacyBanner({ onSettingsClick }: PrivacyBannerProps) {
	const [showBanner, setShowBanner] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const posthog = usePostHog();

	useEffect(() => {
		setShowBanner(shouldShowPrivacyBanner());
	}, []);

	// Re-check if banner should show when settings modal closes
	const handleSettingsClosed = () => {
		// Add a small delay to ensure any privacy settings changes have been processed
		setTimeout(() => {
			setShowBanner(shouldShowPrivacyBanner());
		}, 100);
	};

	if (!showBanner) {
		return null;
	}

	const settings = getEnhancedPrivacySettings();
	const isEU = settings.region === "EU";
	const isCA = settings.region === "CA";

	const handleAcceptAll = () => {
		void (async () => {
			setIsLoading(true);

			const newSettings: EnhancedPrivacySettings = {
				...settings,
				analyticsConsent: "granted",
				ccpa: {
					...(settings.ccpa ?? {}),
					dataCategories: {
						behavioralData: true,
						deviceInfo: true,
						personalInfo: true,
					},
					doNotSell: false,
				},
				functionalConsent: "granted",
				gdpr: {
					dataRetentionPeriod: 365, // Default retention period
					...(settings.gdpr ?? {}),
					allowCookies: true,
					anonymizeData: false,
					consentDate: new Date().toISOString(),
					consentGiven: true,
					dataProcessingPurposes: {
						analytics: true,
						functional: true,
						marketing: true,
						performance: true,
					},
				},
				marketingConsent: "granted",
			};

			setEnhancedPrivacySettings(newSettings);
			markPrivacyBannerShown();

			// Enable PostHog tracking
			if (posthog) {
				posthog.opt_in_capturing();
			}

			setShowBanner(false);
			setIsLoading(false);
		})();
	};

	const handleRejectAll = () => {
		void (async () => {
			setIsLoading(true);

			const newSettings: EnhancedPrivacySettings = {
				...settings,
				analyticsConsent: "denied",
				ccpa: {
					...(settings.ccpa ?? {}),
					dataCategories: {
						behavioralData: false,
						deviceInfo: false,
						personalInfo: false,
					},
					doNotSell: true,
					optOutDate: new Date().toISOString(),
				},
				functionalConsent: "denied",
				gdpr: {
					dataRetentionPeriod: 365, // Default retention period
					...(settings.gdpr ?? {}),
					allowCookies: false,
					anonymizeData: true,
					consentGiven: false,
					dataProcessingPurposes: {
						analytics: false,
						functional: false,
						marketing: false,
						performance: false,
					},
				},
				marketingConsent: "denied",
			};

			setEnhancedPrivacySettings(newSettings);
			markPrivacyBannerShown();

			// Ensure PostHog tracking is disabled
			if (posthog) {
				posthog.opt_out_capturing();
			}

			setShowBanner(false);
			setIsLoading(false);
		})();
	};

	const handleCustomize = () => {
		if (onSettingsClick) {
			// Don't mark banner as shown yet - wait until user makes a choice
			// The banner will be hidden when the settings modal opens, but will
			// reappear if the user closes the modal without making any consent decisions
			setShowBanner(false);
			onSettingsClick(handleSettingsClosed);
		} else {
			// If no settings callback is provided, inform user to use account menu
			showInfoToast("Customize privacy settings from the profile menu.");
		}
	};

	return (
		<div className="fixed right-0 bottom-0 left-0 z-50 border-slate-200 border-t-2 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
			<div className="mx-auto max-w-6xl p-4">
				<div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
					{/* Privacy message */}
					<div className="flex-1">
						<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
							{isEU
								? "Your Privacy Matters"
								: isCA
									? "Privacy Notice"
									: "Cookie Notice"}
						</h3>
						<p className="text-slate-600 text-sm leading-relaxed dark:text-slate-400">
							{isEU
								? "We use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. Under GDPR, we need your consent to process your personal data. You can withdraw consent at any time."
								: isCA
									? "We collect and process personal information as described in our Privacy Policy. Under CCPA, you have the right to know what personal information we collect and to opt-out of its sale."
									: "We use cookies to enhance your experience and analyze site usage. By continuing to use our site, you agree to our use of cookies and data processing practices."}
						</p>
						<div className="mt-2">
							<a
								className="text-blue-600 text-sm hover:underline dark:text-blue-400"
								href="/privacy-policy"
								rel="noopener noreferrer"
								target="_blank"
							>
								Privacy Policy
							</a>
							{" • "}
							<a
								className="text-blue-600 text-sm hover:underline dark:text-blue-400"
								href="/cookie-policy"
								rel="noopener noreferrer"
								target="_blank"
							>
								Cookie Policy
							</a>
						</div>
					</div>

					{/* Action buttons */}
					<div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
						<button
							className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
							disabled={isLoading}
							onClick={handleCustomize}
							type="button"
						>
							Customize
						</button>

						{isEU || isCA ? (
							<>
								<button
									className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-600 text-sm transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
									disabled={isLoading}
									onClick={handleRejectAll}
									type="button"
								>
									{isCA ? "Opt Out" : "Reject All"}
								</button>
								<button
									className="rounded-md bg-blue-600 px-6 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={isLoading}
									onClick={handleAcceptAll}
									type="button"
								>
									{isLoading ? "Processing..." : "Accept All"}
								</button>
							</>
						) : (
							<button
								className="rounded-md bg-blue-600 px-6 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={isLoading}
								onClick={handleAcceptAll}
								type="button"
							>
								{isLoading ? "Processing..." : "Accept"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
