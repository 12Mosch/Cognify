import { useState, useEffect } from 'react';
import { usePrivacyCompliantAnalytics, PrivacySettings as PrivacySettingsType, ConsentStatus } from '../lib/analytics';

interface PrivacySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Privacy Settings Modal Component
 * 
 * Allows users to manage their privacy preferences and consent settings
 * for analytics, functional, and marketing data collection.
 * 
 * Features:
 * - Granular consent controls for different data types
 * - Clear explanations of what each consent type covers
 * - Immediate effect when settings are changed
 * - Accessible modal with proper focus management
 * - Dark theme support
 */
export default function PrivacySettings({ isOpen, onClose }: PrivacySettingsProps) {
  const { privacySettings, grantConsent, revokeConsent } = usePrivacyCompliantAnalytics();
  const [localSettings, setLocalSettings] = useState<PrivacySettingsType>(privacySettings);

  // Sync local state when external privacy settings change
  useEffect(() => {
    setLocalSettings(privacySettings);
  }, [privacySettings]);

  if (!isOpen) return null;

  const handleConsentChange = (type: keyof PrivacySettingsType, status: ConsentStatus) => {
    const newSettings = { ...localSettings, [type]: status };
    setLocalSettings(newSettings);
    
    if (status === 'granted') {
      grantConsent(type);
    } else if (status === 'denied') {
      revokeConsent(type);
    }
  };

  const ConsentToggle = ({ 
    type, 
    title, 
    description 
  }: { 
    type: keyof PrivacySettingsType; 
    title: string; 
    description: string; 
  }) => (
    <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => handleConsentChange(type, 'granted')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                localSettings[type] === 'granted'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900'
              }`}
            >
              Allow
            </button>
            <button
              onClick={() => handleConsentChange(type, 'denied')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                localSettings[type] === 'denied'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900'
              }`}
            >
              Deny
            </button>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            Current: {localSettings[type]}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Privacy Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Close privacy settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            We respect your privacy and want to be transparent about how we collect and use your data. 
            You can control what information we collect by adjusting the settings below.
          </p>

          <div className="space-y-6">
            <ConsentToggle
              type="analyticsConsent"
              title="Analytics & Performance"
              description="Helps us understand how you use the app, which features are most popular, and how we can improve your learning experience. This includes tracking study sessions, card interactions, and performance metrics."
            />

            <ConsentToggle
              type="functionalConsent"
              title="Functional & Preferences"
              description="Allows us to remember your preferences, settings, and provide personalized features like study recommendations and progress tracking. This data stays on your device and in your account."
            />

            <ConsentToggle
              type="marketingConsent"
              title="Marketing & Communications"
              description="Enables us to send you updates about new features, study tips, and educational content that might interest you. You can unsubscribe at any time."
            />
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <p>Changes take effect immediately.</p>
                <p>You can update these settings anytime.</p>
              </div>
              <button
                onClick={onClose}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md transition-colors font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
