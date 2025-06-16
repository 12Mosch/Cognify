import { Component, ReactNode, ErrorInfo } from "react";
import { usePostHog } from "posthog-js/react";
import { trackErrorBoundary, hasAnalyticsConsent } from "./lib/analytics";

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
  WrappedComponent: React.ComponentType<P & { posthog: ReturnType<typeof usePostHog> | null }>
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

  constructor(props: ErrorBoundaryProps & { posthog: ReturnType<typeof usePostHog> | null }) {
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
      hasError: true,
      error,
      errorInfo: null, // Will be set in componentDidCatch
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Track error with PostHog if consent is given
    if (hasAnalyticsConsent()) {
      try {
        // Get user context if available
        const userId = this.getUserId();

        trackErrorBoundary(
          this.props.posthog,
          error,
          {
            componentStack: errorInfo.componentStack || undefined,
          },
          {
            userId,
            errorBoundary: this.props.name || 'ErrorBoundary',
            recoverable: this.isRecoverableError(error),
          }
        );
      } catch (trackingError) {
        console.error('Failed to track error boundary:', trackingError);
      }
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    // Log error for development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private getUserId(): string | undefined {
    try {
      // Try to get user ID from various sources
      if (typeof window !== 'undefined') {
        // Check if Clerk user is available
        const clerkUser = (window as any).__clerk_user;
        if (clerkUser?.id) return clerkUser.id;

        // Check localStorage for user info
        const userInfo = localStorage.getItem('clerk-user');
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
    const errorStack = error.stack?.toLowerCase() || '';

    // Check for recoverable error patterns
    const recoverablePatterns = [
      'chunk load error',
      'loading chunk',
      'network error',
      'fetch error',
      'timeout',
    ];

    return recoverablePatterns.some(pattern =>
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
  }

  private handleRetry = () => {
    this.setState(prevState => ({
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
      const isClerkError = error.message.includes("@clerk/clerk-react") &&
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
      <div className="bg-red-500/20 border border-red-500/50 p-8 flex flex-col gap-4 container mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-red-700 dark:text-red-400">
          Authentication Configuration Error
        </h1>
        <div className="space-y-3">
          <p>
            Add{" "}
            <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">
              VITE_CLERK_PUBLISHABLE_KEY="{"<"}your publishable key{">"}"
            </code>{" "}
            to the <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm">.env.local</code> file
          </p>
          {clerkDashboardUrl && (
            <p>
              You can find it at{" "}
              <a
                className="underline hover:no-underline text-blue-600 dark:text-blue-400"
                href={trimmedClerkDashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {trimmedClerkDashboardUrl}
              </a>
            </p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
              Show technical details
            </summary>
            <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
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
      <div className="bg-red-500/20 border border-red-500/50 p-8 flex flex-col gap-6 container mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-red-700 dark:text-red-400">
            Something went wrong
          </h1>
        </div>

        <div className="space-y-4">
          <p className="text-slate-700 dark:text-slate-300">
            {isRecoverable
              ? "We encountered a temporary issue. You can try again or reload the page."
              : "An unexpected error occurred. Please reload the page or contact support if the problem persists."
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            {isRecoverable && canRetry && (
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
              >
                Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
              </button>
            )}
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
              Show error details
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <h4 className="font-medium text-sm">Error Message:</h4>
                <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
                  {error.message}
                </pre>
              </div>
              {error.stack && (
                <div>
                  <h4 className="font-medium text-sm">Stack Trace:</h4>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div>
                  <h4 className="font-medium text-sm">Component Stack:</h4>
                  <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
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
