"use client";

import { useEffect, useRef, useState } from "react";
import {
  Authenticated,
  Unauthenticated,
} from "convex/react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";
import { Dashboard } from "./components/Dashboard";
import { useAnalytics, useAnalyticsEnhanced, hasUserBeenTrackedForRegistration, markUserAsTrackedForRegistration } from "./lib/analytics";
import PrivacySettings from "./components/PrivacySettings";
import FeatureFlagDemo from "./components/FeatureFlagDemo";

export default function App() {
  const { user, isLoaded } = useUser();
  const { trackUserSignUp } = useAnalytics();
  const { identifyUser } = useAnalyticsEnhanced();
  const dashboardRef = useRef<{ goHome: () => void }>(null);

  // State for Privacy Settings and Feature Flags modals
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showFeatureFlags, setShowFeatureFlags] = useState(false);

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
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <button
          onClick={handleGoHome}
          className="text-xl font-bold hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 rounded-md px-2 py-1"
          aria-label="Go to main dashboard"
          title="Go to main dashboard"
        >
          Flashcard App
        </button>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Action
              label="Privacy Settings"
              labelIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              onClick={() => setShowPrivacySettings(true)}
            />
            <UserButton.Action
              label="Feature Flags"
              labelIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 2H21l-3 6 3 6h-8.5l-1-2H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              }
              onClick={() => setShowFeatureFlags(true)}
            />
            <UserButton.Action label="manageAccount" />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
        </UserButton>
      </header>
      <main className="p-8">
        <Authenticated>
          <Dashboard ref={dashboardRef} />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>

      {/* Privacy Settings Modal */}
      <PrivacySettings
        isOpen={showPrivacySettings}
        onClose={() => setShowPrivacySettings(false)}
      />

      {/* Feature Flags Modal */}
      {showFeatureFlags && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Feature Flags
              </h2>
              <button
                onClick={() => setShowFeatureFlags(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                aria-label="Close feature flags"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FeatureFlagDemo />
          </div>
        </div>
      )}

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
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto text-center">
      <div>
        <h2 className="text-2xl font-bold mb-4">Welcome to Flashcard App</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to create and manage your flashcard decks
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <SignInButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-6 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium">
            Sign Up
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}




