"use client";

import { useEffect, useRef, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Dashboard } from "./components/Dashboard";
import { useAnalytics, useAnalyticsEnhanced, hasUserBeenTrackedForRegistration, markUserAsTrackedForRegistration } from "./lib/analytics";
import SettingsModal from "./components/SettingsModal";
import LanguageSwitcher from "./components/LanguageSwitcher";

export default function App() {
  const { user, isLoaded } = useUser();
  const { t } = useTranslation();
  const { trackUserSignUp } = useAnalytics();
  const { identifyUser } = useAnalyticsEnhanced();
  const dashboardRef = useRef<{ goHome: () => void }>(null);

  // State for Settings modal
  const [showSettings, setShowSettings] = useState(false);
  const [onSettingsClosedCallback, setOnSettingsClosedCallback] = useState<(() => void) | null>(null);

  // Track user registration when user first signs up
  useEffect(() => {
    if (isLoaded && user) {
      // Check if this is a new user registration
      const userCreatedAt = new Date(user.createdAt!);
      const now = new Date();
      const timeDifference = now.getTime() - userCreatedAt.getTime();
      const isNewUser = timeDifference < 60000; // Within last minute (adjust as needed)

      // Only track if user is new and hasn't been tracked before
      if (isNewUser && !hasUserBeenTrackedForRegistration()) {
        trackUserSignUp();
        markUserAsTrackedForRegistration();

        // Identify user with cohort properties for new users
        identifyUser(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName || undefined,
          signupDate: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
          // These would typically come from onboarding or user preferences
          studyGoal: 'casual', // Default, could be set during onboarding
          experienceLevel: 'beginner', // Default for new users
        });
      }
    }
  }, [isLoaded, user, trackUserSignUp, identifyUser]);

  // Handle clicking on the app title to go home
  const handleGoHome = () => {
    if (dashboardRef.current) {
      dashboardRef.current.goHome();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center backdrop-blur-sm">
        <button
          onClick={handleGoHome}
          className="text-xl font-bold hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 rounded-md px-2 py-1"
          aria-label={t('app.goToMainDashboard')}
          title={t('app.goToMainDashboard')}
        >
          {t('app.title')}
        </button>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <UserButton>
          <UserButton.MenuItems>
            <UserButton.Action
              label={t('navigation.settings')}
              labelIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              onClick={() => setShowSettings(true)}
            />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
        </div>
      </header>
      <main className="pt-20 p-8">
        <Authenticated>
          <Dashboard
            ref={dashboardRef}
            onSettingsClick={(onSettingsClosed?: () => void) => {
              setShowSettings(true);
              setOnSettingsClosedCallback(() => onSettingsClosed || null);
            }}
          />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => {
          setShowSettings(false);
          // Call the callback if it exists (from privacy banner)
          if (onSettingsClosedCallback) {
            onSettingsClosedCallback();
            setOnSettingsClosedCallback(null);
          }
        }}
      />

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          // Default options for all toasts
          duration: 4000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
            maxWidth: '400px',
          },
          // Success toasts
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          // Error toasts
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
        containerStyle={{
          top: 80, // Account for header height
        }}
      />
    </>
  );
}

function SignInForm() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto text-center">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t('auth.welcome', { appName: t('app.title') })}</h2>
        <p className="text-slate-600 dark:text-slate-400">
          {t('auth.signInPrompt')}
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <SignInButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium">
            {t('auth.signIn')}
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-6 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium">
            {t('auth.signUp')}
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}
