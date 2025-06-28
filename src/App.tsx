"use client";

import {
	SignInButton,
	SignUpButton,
	UserButton,
	useUser,
} from "@clerk/clerk-react";
import { Analytics } from "@vercel/analytics/react";
import { Authenticated, Unauthenticated } from "convex/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Toaster } from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Dashboard } from "./components/Dashboard";
import LanguageSwitcher from "./components/LanguageSwitcher";
import SettingsModal from "./components/SettingsModal";
import {
	hasUserBeenTrackedForRegistration,
	markUserAsTrackedForRegistration,
	useAnalytics,
	useAnalyticsEnhanced,
} from "./lib/analytics";

export default function App() {
	const { user, isLoaded } = useUser();
	const { t } = useTranslation();
	const { trackUserSignUp } = useAnalytics();
	const { identifyUser } = useAnalyticsEnhanced();
	const dashboardRef = useRef<{ goHome: () => void }>(null);
	const SpeedInsights = /* webpackChunkName: "speed-insights" */ lazy(() =>
		import("@vercel/speed-insights/react").then((m) => ({
			default: m.SpeedInsights,
		})),
	);

	// State for Settings modal
	const [showSettings, setShowSettings] = useState(false);
	const [onSettingsClosedCallback, setOnSettingsClosedCallback] = useState<
		(() => void) | null
	>(null);

	// Track user registration when user first signs up
	useEffect(() => {
		if (isLoaded && user) {
			// Check if this is a new user registration
			const userCreatedAt = new Date(user.createdAt || Date.now());
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
					experienceLevel: "beginner",
					name: user.fullName || undefined,
					signupDate: user.createdAt
						? new Date(user.createdAt).toISOString()
						: undefined, // Default, could be set during onboarding
					// These would typically come from onboarding or user preferences
					studyGoal: "casual", // Default for new users
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
			<header className="sticky top-0 z-10 flex flex-row items-center justify-between border-slate-200 border-b-2 bg-white p-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900">
				<button
					aria-label={t("app.goToMainDashboard")}
					className="cursor-pointer rounded-md px-2 py-1 font-bold text-xl transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 dark:hover:text-slate-300"
					onClick={handleGoHome}
					title={t("app.goToMainDashboard")}
					type="button"
				>
					{t("app.title")}
				</button>
				<div className="flex items-center gap-4">
					<LanguageSwitcher />
					<UserButton>
						<UserButton.MenuItems>
							<UserButton.Action
								label={t("navigation.settings")}
								labelIcon={
									<svg
										aria-label="Settings"
										className="h-4 w-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<title>Settings</title>
										<path
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
										<path
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
										/>
									</svg>
								}
								onClick={() => setShowSettings(true)}
							/>
							<UserButton.Action label="signOut" />
						</UserButton.MenuItems>
					</UserButton>
				</div>
			</header>
			<main className="p-8 pt-20">
				<Authenticated>
					<Dashboard
						onSettingsClick={(onSettingsClosed?: () => void) => {
							setShowSettings(true);
							setOnSettingsClosedCallback(() => onSettingsClosed || null);
						}}
						ref={dashboardRef}
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
				containerStyle={{
					top: 80, // Account for header height
				}}
				position="top-right"
				toastOptions={{
					// Default options for all toasts
					duration: 4000,
					// Error toasts
					error: {
						iconTheme: {
							primary: "#ef4444",
							secondary: "#ffffff",
						},
					},
					style: {
						borderRadius: "8px",
						fontSize: "14px",
						maxWidth: "400px",
					},
					// Success toasts
					success: {
						iconTheme: {
							primary: "#10b981",
							secondary: "#ffffff",
						},
					},
				}}
			/>
			<Analytics />
			<Suspense fallback={null}>
				<SpeedInsights />
			</Suspense>
		</>
	);
}

function SignInForm() {
	const { t } = useTranslation();

	return (
		<div className="mx-auto flex w-96 flex-col gap-8 text-center">
			<div>
				<h2 className="mb-4 font-bold text-2xl">
					{t("auth.welcome", { appName: t("app.title") })}
				</h2>
				<p className="text-slate-600 dark:text-slate-400">
					{t("auth.signInPrompt")}
				</p>
			</div>
			<div className="flex flex-col gap-4">
				<SignInButton mode="modal">
					<button
						className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
						type="button"
					>
						{t("auth.signIn")}
					</button>
				</SignInButton>
				<SignUpButton mode="modal">
					<button
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-6 py-3 font-medium text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						type="button"
					>
						{t("auth.signUp")}
					</button>
				</SignUpButton>
			</div>
		</div>
	);
}
