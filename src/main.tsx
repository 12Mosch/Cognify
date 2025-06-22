import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { PostHogProvider } from "posthog-js/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { displayPostHogConfigWarnings } from "./lib/analytics.ts";
import "./i18n";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Display PostHog configuration warnings during app initialization
displayPostHogConfigWarnings();

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		{import.meta.env.VITE_PUBLIC_POSTHOG_KEY && (
			<PostHogProvider
				apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
				options={{
					api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
					capture_exceptions: true,
					cross_subdomain_cookie: false,
					debug: import.meta.env.MODE === "development",
					disable_session_recording: true,
					disable_surveys: true,
					// GDPR compliance
					loaded: (posthog) => {
						// Only enable if user has given consent
						const hasConsent = localStorage.getItem(
							"flashcard_privacy_settings",
						);
						if (hasConsent) {
							try {
								const settings = JSON.parse(hasConsent);
								if (settings.analyticsConsent === "granted") {
									posthog.opt_in_capturing();
								}
							} catch (error) {
								console.warn("Failed to parse privacy settings:", error);
							}
						}
					},
					// Privacy-first defaults
					opt_out_capturing_by_default: true,
					persistence: "localStorage",
					respect_dnt: true,
					secure_cookie: true,
				}}
			>
				<ErrorBoundary>
					<ClerkProvider
						publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
					>
						<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
							<App />
						</ConvexProviderWithClerk>
					</ClerkProvider>
				</ErrorBoundary>
			</PostHogProvider>
		)}
		{!import.meta.env.VITE_PUBLIC_POSTHOG_KEY && (
			<ErrorBoundary>
				<ClerkProvider
					publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
				>
					<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
						<App />
					</ConvexProviderWithClerk>
				</ClerkProvider>
			</ErrorBoundary>
		)}
	</StrictMode>,
);
