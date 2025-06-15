import { useState, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { 
  shouldShowPrivacyBanner, 
  markPrivacyBannerShown, 
  getEnhancedPrivacySettings, 
  setEnhancedPrivacySettings,
  type EnhancedPrivacySettings 
} from '../lib/analytics';

interface PrivacyBannerProps {
  onSettingsClick?: () => void;
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

  if (!showBanner) {
    return null;
  }

  const settings = getEnhancedPrivacySettings();
  const isEU = settings.region === 'EU';
  const isCA = settings.region === 'CA';

  const handleAcceptAll = () => {
    void (async () => {
      setIsLoading(true);

      const newSettings: EnhancedPrivacySettings = {
        ...settings,
        analyticsConsent: 'granted',
        functionalConsent: 'granted',
        marketingConsent: 'granted',
        gdpr: {
          ...settings.gdpr!,
          consentGiven: true,
          consentDate: new Date().toISOString(),
          dataProcessingPurposes: {
            analytics: true,
            functional: true,
            marketing: true,
            performance: true,
          },
          allowCookies: true,
          anonymizeData: false,
        },
        ccpa: {
          ...settings.ccpa!,
          doNotSell: false,
          dataCategories: {
            personalInfo: true,
            behavioralData: true,
            deviceInfo: true,
          },
        },
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
        analyticsConsent: 'denied',
        functionalConsent: 'denied',
        marketingConsent: 'denied',
        gdpr: {
          ...settings.gdpr!,
          consentGiven: false,
          dataProcessingPurposes: {
            analytics: false,
            functional: false,
            marketing: false,
            performance: false,
          },
          allowCookies: false,
          anonymizeData: true,
        },
        ccpa: {
          ...settings.ccpa!,
          doNotSell: true,
          optOutDate: new Date().toISOString(),
          dataCategories: {
            personalInfo: false,
            behavioralData: false,
            deviceInfo: false,
          },
        },
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
    markPrivacyBannerShown();
    setShowBanner(false);
    onSettingsClick?.();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Privacy message */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {isEU ? 'Your Privacy Matters' : isCA ? 'Privacy Notice' : 'Cookie Notice'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {isEU ? (
                <>
                  We use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. 
                  Under GDPR, we need your consent to process your personal data. You can withdraw consent at any time.
                </>
              ) : isCA ? (
                <>
                  We collect and process personal information as described in our Privacy Policy. 
                  Under CCPA, you have the right to know what personal information we collect and to opt-out of its sale.
                </>
              ) : (
                <>
                  We use cookies to enhance your experience and analyze site usage. 
                  By continuing to use our site, you agree to our use of cookies and data processing practices.
                </>
              )}
            </p>
            <div className="mt-2">
              <a 
                href="/privacy-policy" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>
              {' • '}
              <a 
                href="/cookie-policy" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cookie Policy
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={handleCustomize}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Customize
            </button>
            
            {isEU || isCA ? (
              <>
                <button
                  onClick={handleRejectAll}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {isCA ? 'Opt Out' : 'Reject All'}
                </button>
                <button
                  onClick={handleAcceptAll}
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Processing...' : 'Accept All'}
                </button>
              </>
            ) : (
              <button
                onClick={handleAcceptAll}
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Accept'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
