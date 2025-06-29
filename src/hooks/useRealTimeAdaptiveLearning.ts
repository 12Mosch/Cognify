import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Real-Time Adaptive Learning Hook
 *
 * This hook provides a comprehensive interface for integrating real-time
 * adaptive learning features into React components. It handles interaction
 * recording, pattern updates, performance optimization, and provides
 * real-time feedback and recommendations.
 *
 * Key Features:
 * - Automatic interaction recording
 * - Real-time pattern updates
 * - Performance-optimized caching
 * - Adaptive study recommendations
 * - Session-based tracking
 * - Error handling and retry logic
 */

interface UseRealTimeAdaptiveLearningOptions {
	deckId?: Id<"decks">;
	sessionId?: string;
	enableAutoOptimization?: boolean;
	enableRecommendations?: boolean;
	maxRecommendations?: number;
}

interface AdaptiveInteractionContext {
	cardIndex: number;
	totalCards: number;
	studyMode: string;
}

export function useRealTimeAdaptiveLearning(
	options: UseRealTimeAdaptiveLearningOptions = {},
) {
	const {
		deckId,
		sessionId,
		enableAutoOptimization = true,
		enableRecommendations = true,
		maxRecommendations = 5,
	} = options;

	// State management
	const [isProcessing, setIsProcessing] = useState(false);
	const [lastInteractionTime, setLastInteractionTime] = useState<number | null>(
		null,
	);
	const [interactionCount, setInteractionCount] = useState(0);
	const [sessionStartTime] = useState(Date.now());

	// Convex mutations and queries
	const recordCardInteraction = useMutation(
		api.realTimeAdaptiveLearning.recordCardInteraction,
	);
	const reviewCardWithAdaptiveLearning = useMutation(
		api.adaptiveLearningIntegration.reviewCardWithAdaptiveLearning,
	);
	const batchProcessInteractions = useMutation(
		api.performanceOptimization.batchProcessInteractions,
	);
	const cacheLearningPatterns = useMutation(
		api.performanceOptimization.cacheLearningPatterns,
	);

	// Queries
	const adaptiveStudyQueue = useQuery(
		api.realTimeAdaptiveLearning.getAdaptiveStudyQueue,
		deckId ? { deckId, maxCards: 20, sessionId } : "skip",
	);

	const studyRecommendations = useQuery(
		api.adaptiveLearningIntegration.getAdaptiveStudyRecommendations,
		enableRecommendations ? { deckId, maxRecommendations } : "skip",
	);

	const performanceMetrics = useQuery(
		api.performanceOptimization.getPerformanceMetrics,
		enableAutoOptimization ? { limit: 10 } : "skip",
	);

	// Record card flip interaction
	const recordFlip = useCallback(
		async (
			cardId: Id<"cards">,
			responseTime?: number,
			context?: AdaptiveInteractionContext,
		) => {
			if (isProcessing) return;

			setIsProcessing(true);
			try {
				await recordCardInteraction({
					cardId,
					interactionType: "flip",
					responseTime,
					sessionContext: context
						? {
								cardIndex: context.cardIndex,
								sessionId: sessionId || `session_${sessionStartTime}`,
								studyMode: context.studyMode,
								totalCards: context.totalCards,
							}
						: undefined,
				});

				setLastInteractionTime(Date.now());
				setInteractionCount((prev) => prev + 1);
			} catch (error) {
				console.error("Error recording flip interaction:", error);
			} finally {
				setIsProcessing(false);
			}
		},
		[recordCardInteraction, sessionId, sessionStartTime, isProcessing],
	);

	// Record confidence rating interaction
	const recordConfidenceRating = useCallback(
		async (
			cardId: Id<"cards">,
			confidenceLevel: number,
			context?: AdaptiveInteractionContext,
		) => {
			if (isProcessing) return;

			setIsProcessing(true);
			try {
				await recordCardInteraction({
					cardId,
					confidenceLevel,
					interactionType: "confidence_rating",
					sessionContext: context
						? {
								cardIndex: context.cardIndex,
								sessionId: sessionId || `session_${sessionStartTime}`,
								studyMode: context.studyMode,
								totalCards: context.totalCards,
							}
						: undefined,
				});

				setLastInteractionTime(Date.now());
				setInteractionCount((prev) => prev + 1);
			} catch (error) {
				console.error("Error recording confidence rating interaction:", error);
			} finally {
				setIsProcessing(false);
			}
		},
		[recordCardInteraction, sessionId, sessionStartTime, isProcessing],
	);

	// Record difficulty rating interaction
	const recordDifficultyRating = useCallback(
		async (
			cardId: Id<"cards">,
			difficultyRating: number,
			context?: AdaptiveInteractionContext,
		) => {
			if (isProcessing) return;

			setIsProcessing(true);
			try {
				await recordCardInteraction({
					cardId,
					difficultyRating,
					interactionType: "difficulty_rating",
					sessionContext: context
						? {
								cardIndex: context.cardIndex,
								sessionId: sessionId || `session_${sessionStartTime}`,
								studyMode: context.studyMode,
								totalCards: context.totalCards,
							}
						: undefined,
				});

				setLastInteractionTime(Date.now());
				setInteractionCount((prev) => prev + 1);
			} catch (error) {
				console.error("Error recording difficulty rating interaction:", error);
			} finally {
				setIsProcessing(false);
			}
		},
		[recordCardInteraction, sessionId, sessionStartTime, isProcessing],
	);

	// Enhanced card review with full adaptive integration
	const reviewCard = useCallback(
		async (
			cardId: Id<"cards">,
			quality: number,
			options?: {
				responseTime?: number;
				confidenceLevel?: number;
			},
		) => {
			if (isProcessing) return null;

			setIsProcessing(true);
			try {
				const result = await reviewCardWithAdaptiveLearning({
					cardId,
					confidenceLevel: options?.confidenceLevel,
					quality,
					responseTime: options?.responseTime,
					sessionId: sessionId || `session_${sessionStartTime}`,
				});

				setLastInteractionTime(Date.now());
				setInteractionCount((prev) => prev + 1);

				return result;
			} catch (error) {
				console.error("Error reviewing card with adaptive learning:", error);
				return null;
			} finally {
				setIsProcessing(false);
			}
		},
		[reviewCardWithAdaptiveLearning, sessionId, sessionStartTime, isProcessing],
	);

	// Trigger batch processing manually
	const triggerBatchProcessing = useCallback(async () => {
		if (isProcessing) return;

		setIsProcessing(true);
		try {
			const result = await batchProcessInteractions({});
			return result;
		} catch (error) {
			console.error("Error triggering batch processing:", error);
			return null;
		} finally {
			setIsProcessing(false);
		}
	}, [batchProcessInteractions, isProcessing]);

	// Refresh cached patterns
	const refreshCache = useCallback(
		async (forceRefresh = false) => {
			try {
				const result = await cacheLearningPatterns({ forceRefresh });
				return result;
			} catch (error) {
				console.error("Error refreshing cache:", error);
				return null;
			}
		},
		[cacheLearningPatterns],
	);

	// Auto-optimization effect
	useEffect(() => {
		if (!enableAutoOptimization) return;

		// Trigger batch processing every 10 interactions
		if (interactionCount > 0 && interactionCount % 10 === 0) {
			triggerBatchProcessing();
		}

		// Refresh cache every 5 minutes
		const cacheRefreshInterval = setInterval(
			() => {
				refreshCache();
			},
			5 * 60 * 1000,
		);

		return () => clearInterval(cacheRefreshInterval);
	}, [
		interactionCount,
		enableAutoOptimization,
		triggerBatchProcessing,
		refreshCache,
	]);

	// Computed values
	const sessionDuration = useMemo(() => {
		return lastInteractionTime ? lastInteractionTime - sessionStartTime : 0;
	}, [lastInteractionTime, sessionStartTime]);

	const averageInteractionRate = useMemo(() => {
		if (sessionDuration === 0 || interactionCount === 0) return 0;
		return interactionCount / (sessionDuration / 60000); // interactions per minute
	}, [sessionDuration, interactionCount]);

	const isHighActivity = useMemo(() => {
		return averageInteractionRate > 5; // More than 5 interactions per minute
	}, [averageInteractionRate]);

	// Priority recommendations
	const priorityRecommendations = useMemo(() => {
		if (!studyRecommendations?.recommendations) return [];
		return studyRecommendations.recommendations
			.filter((rec) => rec.priority > 0.7)
			.slice(0, 3);
	}, [studyRecommendations]);

	return {
		// Data
		adaptiveStudyQueue,
		averageInteractionRate,
		cacheHitRate: performanceMetrics?.summary.cacheHitRate || 0,

		// Data quality indicators
		hasAdaptiveData: !!studyRecommendations?.dataQuality.hasLearningPatterns,
		interactionCount,
		isHighActivity,

		// State
		isProcessing,
		lastInteractionTime,
		performanceMetrics,
		priorityRecommendations,
		recordConfidenceRating,
		recordDifficultyRating,
		// Core functions
		recordFlip,
		refreshCache,
		reviewCard,
		sessionDuration,

		// Session info
		sessionId: sessionId || `session_${sessionStartTime}`,
		sessionStartTime,
		studyRecommendations,
		totalDataPoints: studyRecommendations?.dataQuality.totalDataPoints || 0,

		// Optimization functions
		triggerBatchProcessing,
	};
}
