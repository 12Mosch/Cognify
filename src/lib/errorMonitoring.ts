/**
 * Error monitoring utilities for flashcard app
 * Provides specialized error handling for common scenarios
 */

import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';
import {
  captureError,
  trackConvexQueryError,
  trackConvexMutationError,
  trackAuthenticationError,
  trackCardLoadingError,
  trackStudySessionError,
  hasAnalyticsConsent,
} from './analytics';

/**
 * Hook for Convex query error monitoring
 */
export function useConvexQueryErrorHandler() {
  const posthog = usePostHog();

  return useCallback((
    queryName: string,
    error: Error,
    context?: {
      userId?: string;
      deckId?: string;
      cardId?: string;
      retryAttempt?: number;
      queryArgs?: Record<string, any>;
    }
  ) => {
    trackConvexQueryError(posthog, queryName, error, context);
  }, [posthog]);
}

/**
 * Hook for Convex mutation error monitoring
 */
export function useConvexMutationErrorHandler() {
  const posthog = usePostHog();

  return useCallback((
    mutationName: string,
    error: Error,
    context?: {
      userId?: string;
      deckId?: string;
      cardId?: string;
      retryAttempt?: number;
      mutationArgs?: Record<string, any>;
    }
  ) => {
    trackConvexMutationError(posthog, mutationName, error, context);
  }, [posthog]);
}

/**
 * Hook for authentication error monitoring
 */
export function useAuthErrorHandler() {
  const posthog = usePostHog();

  return useCallback((
    errorType: 'clerk_error' | 'convex_auth_error' | 'token_expired' | 'permission_denied',
    error: Error,
    context?: {
      userId?: string;
      attemptedAction?: string;
    }
  ) => {
    trackAuthenticationError(posthog, errorType, error, context);
  }, [posthog]);
}

/**
 * Hook for card loading error monitoring
 */
export function useCardLoadingErrorHandler() {
  const posthog = usePostHog();

  return useCallback((
    deckId: string,
    error: Error,
    context?: {
      cardId?: string;
      studyMode?: 'basic' | 'spaced-repetition';
      loadingStage?: 'initial_load' | 'flip_animation' | 'content_render';
    }
  ) => {
    trackCardLoadingError(posthog, deckId, error, context);
  }, [posthog]);
}

/**
 * Hook for study session error monitoring
 */
export function useStudySessionErrorHandler() {
  const posthog = usePostHog();

  return useCallback((
    deckId: string,
    errorType: 'session_start' | 'card_transition' | 'progress_save' | 'session_end',
    error: Error,
    context?: {
      sessionId?: string;
      cardsReviewed?: number;
      studyMode?: 'basic' | 'spaced-repetition';
    }
  ) => {
    trackStudySessionError(posthog, deckId, errorType, error, context);
  }, [posthog]);
}

/**
 * Comprehensive error monitoring hook
 */
export function useErrorMonitoring() {
  const posthog = usePostHog();

  const captureGenericError = useCallback((
    error: Error,
    context?: {
      userId?: string;
      deckId?: string;
      cardId?: string;
      component?: string;
      action?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      recoverable?: boolean;
      additionalData?: Record<string, any>;
    }
  ) => {
    captureError(posthog, error, context);
  }, [posthog]);

  const trackConvexQuery = useConvexQueryErrorHandler();
  const trackConvexMutation = useConvexMutationErrorHandler();
  const trackAuth = useAuthErrorHandler();
  const trackCardLoading = useCardLoadingErrorHandler();
  const trackStudySession = useStudySessionErrorHandler();

  return {
    captureError: captureGenericError,
    trackConvexQuery,
    trackConvexMutation,
    trackAuth,
    trackCardLoading,
    trackStudySession,
    hasConsent: hasAnalyticsConsent(),
  };
}

/**
 * Create an error handler for a specific component
 */
export function createComponentErrorHandler(
  componentName: string,
  posthog?: ReturnType<typeof usePostHog> | null
) {
  return (error: Error, errorInfo?: any) => {
    if (posthog && hasAnalyticsConsent()) {
      captureError(posthog, error, {
        component: componentName,
        action: 'component_error',
        severity: 'medium',
        additionalData: errorInfo,
      });
    }
  };
}

/**
 * Async operation wrapper with error monitoring
 */
export async function withAsyncErrorMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    operationType: string;
    posthog?: ReturnType<typeof usePostHog> | null;
    errorContext?: {
      userId?: string;
      deckId?: string;
      cardId?: string;
      component?: string;
    };
    retryAttempt?: number;
    timeoutMs?: number;
  }
): Promise<T> {
  const startTime = Date.now();
  
  try {
    // Add timeout if specified
    if (context.timeoutMs) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Operation timed out after ${context.timeoutMs}ms`)), context.timeoutMs);
      });
      
      return await Promise.race([operation(), timeoutPromise]);
    }
    
    return await operation();
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (context.posthog && hasAnalyticsConsent()) {
      captureError(context.posthog, error as Error, {
        ...context.errorContext,
        component: 'AsyncOperation',
        action: context.operationType,
        severity: 'medium',
        additionalData: {
          retryAttempt: context.retryAttempt,
          duration,
          timeoutMs: context.timeoutMs,
        },
      });
    }
    
    throw error;
  }
}

/**
 * Retry wrapper with error monitoring
 */
export async function withRetryAndErrorMonitoring<T>(
  operation: () => Promise<T>,
  context: {
    operationType: string;
    posthog?: ReturnType<typeof usePostHog> | null;
    errorContext?: {
      userId?: string;
      deckId?: string;
      cardId?: string;
      component?: string;
    };
    maxRetries?: number;
    retryDelay?: number;
    timeoutMs?: number;
  }
): Promise<T> {
  const maxRetries = context.maxRetries ?? 3;
  const retryDelay = context.retryDelay ?? 1000;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withAsyncErrorMonitoring(operation, {
        ...context,
        retryAttempt: attempt,
      });
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Error recovery utilities
 */
export const ErrorRecovery = {
  /**
   * Attempt to recover from a Convex connection error
   */
  async recoverConvexConnection(): Promise<boolean> {
    try {
      // Force a page reload as a last resort
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Attempt to recover from authentication errors
   */
  async recoverAuthentication(): Promise<boolean> {
    try {
      // Clear any stale auth data
      localStorage.removeItem('clerk-user');
      sessionStorage.clear();
      
      // Redirect to sign-in
      window.location.href = '/';
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Attempt to recover from study session errors
   */
  async recoverStudySession(deckId: string): Promise<boolean> {
    try {
      // Clear any cached study session data
      const sessionKeys = Object.keys(localStorage).filter(key => 
        key.includes('study_session') || key.includes(deckId)
      );
      sessionKeys.forEach(key => localStorage.removeItem(key));
      
      return true;
    } catch {
      return false;
    }
  },
};
