import { usePostHog } from "posthog-js/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import i18n from "./i18n";
import { hasAnalyticsConsent, trackErrorBoundary } from "./lib/analytics";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: (error: Error, retry: () => void) => ReactNode;
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	name?: string; // Name of the error boundary for tracking
}

interface ErrorBoundaryState {
	error: Error | null;
	errorInfo: ErrorInfo | null;
	hasError: boolean;
	retryCount: number;
}

// HOC to inject PostHog into class component
function withPostHog<P extends object>(
	WrappedComponent: React.ComponentType<
		P & { posthog: ReturnType<typeof usePostHog> | null }
	>,
) {
	return function WithPostHogComponent(props: P) {
		const posthog = usePostHog();
		return <WrappedComponent {...props} posthog={posthog} />;
	};
}

class ErrorBoundaryClass extends Component<
	ErrorBoundaryProps & { posthog: ReturnType<typeof usePostHog> | null },
	ErrorBoundaryState
> {
	private retryTimeoutId: NodeJS.Timeout | null = null;

	constructor(
		props: ErrorBoundaryProps & {
			posthog: ReturnType<typeof usePostHog> | null;
		},
	) {
		super(props);
		this.state = {
			error: null,
			errorInfo: null,
			hasError: false,
			retryCount: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			error,
			errorInfo: null,
			hasError: true, // Will be set in componentDidCatch
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		this.setState({ errorInfo });

		// Track error with PostHog if consent is given
		if (hasAnalyticsConsent()) {
			try {
				// Get user context if available
				const userId = this.getUserId();

				// Use PostHog's capture method for error tracking
				if (this.props.posthog) {
					this.props.posthog.capture("error_boundary_triggered", {
						// PostHog exception format
						$exception: error.message,
						$stacktrace: error.stack,
						componentStack: errorInfo.componentStack,
						cookiesEnabled: navigator.cookieEnabled,

						// App state context
						currentRoute: window.location.pathname + window.location.search,

						// Core error context
						errorBoundary: this.props.name || "ErrorBoundary",

						// Error categorization
						errorCategory: this.categorizeError(error),
						errorSeverity: this.getErrorSeverity(error),

						// Browser context
						isOnline: navigator.onLine,

						// Memory usage if available
						memoryUsage:
							"memory" in performance
								? {
										totalJSHeapSize: (
											performance as unknown as {
												memory: {
													usedJSHeapSize: number;
													totalJSHeapSize: number;
												};
											}
										).memory.totalJSHeapSize,
										usedJSHeapSize: (
											performance as unknown as {
												memory: {
													usedJSHeapSize: number;
													totalJSHeapSize: number;
												};
											}
										).memory.usedJSHeapSize,
									}
								: undefined,
						recoverable: this.isRecoverableError(error),
						retryCount: this.state.retryCount,
						timestamp: Date.now(),
						userAgent: navigator.userAgent,
						userId,
						viewport: `${window.innerWidth}x${window.innerHeight}`,
					});
				}

				// Also track with our legacy system for consistency
				trackErrorBoundary(
					this.props.posthog,
					error,
					{
						componentStack: errorInfo.componentStack || undefined,
					},
					{
						errorBoundary: this.props.name || "ErrorBoundary",
						recoverable: this.isRecoverableError(error),
						userId,
					},
				);
			} catch (trackingError) {
				console.error("Failed to track error boundary:", trackingError);
			}
		}

		// Call custom error handler if provided
		if (this.props.onError) {
			try {
				this.props.onError(error, errorInfo);
			} catch (handlerError) {
				console.error("Error in custom error handler:", handlerError);
			}
		}

		// Log error for development
		if (process.env.NODE_ENV === "development") {
			console.error("ErrorBoundary caught an error:", error, errorInfo);
			console.error("Error category:", this.categorizeError(error));
			console.error("Error severity:", this.getErrorSeverity(error));
		}
	}

	private getUserId(): string | undefined {
		try {
			// Try to get user ID from various sources
			if (typeof window !== "undefined") {
				// Check if Clerk user is available
				const clerkUser = (
					window as unknown as { __clerk_user?: { id: string } }
				).__clerk_user;
				if (clerkUser?.id) return clerkUser.id;

				// Check localStorage for user info
				const userInfo = localStorage.getItem("clerk-user");
				if (userInfo) {
					const parsed = JSON.parse(userInfo);
					if (parsed?.id) return parsed.id;
				}
			}
		} catch {
			// Ignore errors when getting user ID
		}
		return undefined;
	}

	private isRecoverableError(error: Error): boolean {
		const errorMessage = error.message.toLowerCase();
		const errorStack = error.stack?.toLowerCase() || "";

		// Check for recoverable error patterns
		const recoverablePatterns = [
			"chunk load error",
			"loading chunk",
			"network error",
			"fetch error",
			"timeout",
		];

		return recoverablePatterns.some(
			(pattern) =>
				errorMessage.includes(pattern) || errorStack.includes(pattern),
		);
	}

	private categorizeError(error: Error): string {
		const message = error.message.toLowerCase();
		const stack = error.stack?.toLowerCase() || "";

		// Network errors
		if (
			message.includes("network") ||
			message.includes("fetch") ||
			message.includes("timeout")
		) {
			return "network_error";
		}

		// Authentication errors
		if (
			message.includes("auth") ||
			message.includes("token") ||
			message.includes("unauthorized")
		) {
			return "authentication_error";
		}

		// Permission errors
		if (
			message.includes("permission") ||
			message.includes("forbidden") ||
			message.includes("access denied")
		) {
			return "permission_error";
		}

		// Validation errors
		if (
			message.includes("validation") ||
			message.includes("invalid") ||
			message.includes("required")
		) {
			return "validation_error";
		}

		// Performance errors
		if (
			message.includes("timeout") ||
			message.includes("slow") ||
			message.includes("performance")
		) {
			return "performance_error";
		}

		// UI errors
		if (
			stack.includes("react") ||
			stack.includes("component") ||
			message.includes("render")
		) {
			return "ui_error";
		}

		// Integration errors (Convex, Clerk, etc.)
		if (
			message.includes("convex") ||
			message.includes("clerk") ||
			stack.includes("convex")
		) {
			return "integration_error";
		}

		return "unknown_error";
	}

	private getErrorSeverity(
		error: Error,
	): "low" | "medium" | "high" | "critical" {
		const message = error.message.toLowerCase();
		const stack = error.stack?.toLowerCase() || "";

		// Critical errors that break core functionality
		if (
			message.includes("chunk load error") ||
			message.includes("script error") ||
			message.includes("out of memory") ||
			(stack.includes("convex") && message.includes("mutation"))
		) {
			return "critical";
		}

		// High severity errors that significantly impact user experience
		if (
			message.includes("auth") ||
			message.includes("permission") ||
			message.includes("network") ||
			(stack.includes("react") && message.includes("render"))
		) {
			return "high";
		}

		// Medium severity errors that cause minor issues
		if (
			message.includes("validation") ||
			message.includes("timeout") ||
			message.includes("fetch")
		) {
			return "medium";
		}

		// Default to low for unknown errors
		return "low";
	}

	private handleRetry = () => {
		this.setState((prevState) => ({
			error: null,
			errorInfo: null,
			hasError: false,
			retryCount: prevState.retryCount + 1,
		}));
	};

	private handleReload = () => {
		window.location.reload();
	};

	componentWillUnmount() {
		if (this.retryTimeoutId) {
			clearTimeout(this.retryTimeoutId);
		}
	}

	render() {
		if (this.state.hasError && this.state.error) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.handleRetry);
			}

			// Check for specific error types and provide appropriate UI
			const error = this.state.error;
			const isClerkError =
				error.message.includes("@clerk/clerk-react") &&
				error.message.includes("publishableKey");

			if (isClerkError) {
				return this.renderClerkErrorUI(error);
			}

			// Default error UI with recovery options
			return this.renderDefaultErrorUI(error);
		}

		return this.props.children;
	}

	private renderClerkErrorUI(error: Error) {
		const errorText = error.toString();
		const [clerkDashboardUrl] = errorText.match(/https:\S+/) ?? [];
		const trimmedClerkDashboardUrl = clerkDashboardUrl?.endsWith(".")
			? clerkDashboardUrl.slice(0, -1)
			: clerkDashboardUrl;

		return (
			<div className="container mx-auto flex max-w-2xl flex-col gap-4 border border-red-500/50 bg-red-500/20 p-8">
				<h1 className="font-bold text-red-700 text-xl dark:text-red-400">
					{i18n.t("components.errorBoundary.authConfigError")}
				</h1>
				<div className="space-y-3">
					<p>
						Add{" "}
						<code className="rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
							VITE_CLERK_PUBLISHABLE_KEY="{"<"}your publishable key{">"}"
						</code>{" "}
						to the{" "}
						<code className="rounded bg-slate-100 px-2 py-1 text-sm dark:bg-slate-800">
							.env.local
						</code>{" "}
						file
					</p>
					{clerkDashboardUrl && (
						<p>
							You can find it at{" "}
							<a
								className="text-blue-600 underline hover:no-underline dark:text-blue-400"
								href={trimmedClerkDashboardUrl}
								rel="noopener noreferrer"
								target="_blank"
							>
								{trimmedClerkDashboardUrl}
							</a>
						</p>
					)}
					<details className="mt-4">
						<summary className="cursor-pointer text-slate-600 text-sm hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
							{i18n.t("components.errorBoundary.showTechnicalDetails")}
						</summary>
						<pre className="mt-2 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
							{errorText}
						</pre>
					</details>
				</div>
			</div>
		);
	}

	private renderDefaultErrorUI(error: Error) {
		const isRecoverable = this.isRecoverableError(error);
		const canRetry = this.state.retryCount < 3;

		return (
			<div className="container mx-auto flex max-w-2xl flex-col gap-6 border border-red-500/50 bg-red-500/20 p-8">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500">
						<svg
							aria-label="Error"
							className="h-5 w-5 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>Error</title>
							<path
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
					</div>
					<h1 className="font-bold text-red-700 text-xl dark:text-red-400">
						Something went wrong
					</h1>
				</div>

				<div className="space-y-4">
					<p className="text-slate-700 dark:text-slate-300">
						{isRecoverable
							? i18n.t("components.errorBoundary.temporaryIssue")
							: i18n.t("components.errorBoundary.unexpectedError")}
					</p>

					<div className="flex flex-col gap-3 sm:flex-row">
						{isRecoverable && canRetry && (
							<button
								className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
								onClick={this.handleRetry}
								type="button"
							>
								{i18n.t("components.errorBoundary.tryAgain")}{" "}
								{this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
							</button>
						)}
						<button
							className="rounded-md bg-slate-600 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700"
							onClick={this.handleReload}
							type="button"
						>
							{i18n.t("components.errorBoundary.reloadPage")}
						</button>
					</div>

					<details className="mt-4">
						<summary className="cursor-pointer text-slate-600 text-sm hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
							Show error details
						</summary>
						<div className="mt-2 space-y-2">
							<div>
								<h4 className="font-medium text-sm">Error Message:</h4>
								<pre className="overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
									{error.message}
								</pre>
							</div>
							{error.stack && (
								<div>
									<h4 className="font-medium text-sm">Stack Trace:</h4>
									<pre className="max-h-40 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
										{error.stack}
									</pre>
								</div>
							)}
							{this.state.errorInfo?.componentStack && (
								<div>
									<h4 className="font-medium text-sm">
										{i18n.t("components.errorBoundary.componentStack")}
									</h4>
									<pre className="max-h-40 overflow-auto rounded bg-slate-100 p-3 text-xs dark:bg-slate-800">
										{this.state.errorInfo?.componentStack}
									</pre>
								</div>
							)}
						</div>
					</details>
				</div>
			</div>
		);
	}
}

// Export the wrapped component
export const ErrorBoundary = withPostHog(ErrorBoundaryClass);
