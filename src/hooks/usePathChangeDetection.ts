import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Path Change Detection Hook
 *
 * This hook monitors study path regenerations and detects when the adaptive
 * learning system has significantly modified the study path. It provides
 * information about path changes and triggers for UI feedback.
 *
 * Key Features:
 * - Monitors studyPathRegeneration table for changes
 * - Detects significant path modifications (>30% reordering)
 * - Provides path change metadata and reasoning
 * - Caches path data to minimize query frequency
 * - Handles session-based path tracking
 */

interface PathChangeInfo {
	cardsReordered: number;
	totalCards: number;
	changePercentage: number;
	triggerReason: string;
	timestamp: number;
	topPriorityCards: Array<{
		cardId: string;
		priorityScore: number;
		reasoning: string;
	}>;
	hasSignificantChange: boolean;
}

interface UsePathChangeDetectionOptions {
	deckId?: Id<"decks">;
	sessionId?: string;
	significantChangeThreshold?: number; // Default: 0.3 (30%)
	enableCaching?: boolean;
	onPathChange?: (changeInfo: PathChangeInfo) => void;
}

export function usePathChangeDetection(
	options: UsePathChangeDetectionOptions = {},
) {
	const {
		deckId,
		sessionId,
		significantChangeThreshold = 0.3,
		enableCaching = true,
		onPathChange,
	} = options;

	// State management
	const [lastKnownPath, setLastKnownPath] = useState<string[] | null>(null);
	const [pathChangeHistory, setPathChangeHistory] = useState<PathChangeInfo[]>(
		[],
	);
	const [isPathChanging, setIsPathChanging] = useState(false);
	const pathCacheRef = useRef<Map<string, PathChangeInfo>>(new Map());
	const lastNotificationRef = useRef<number>(0);

	// Query for recent path regenerations (conditional)
	const recentPathRegeneration = useQuery(
		api.realTimeAdaptiveLearning.getRecentPathRegeneration,
		sessionId && enableCaching ? { limit: 1, sessionId } : "skip",
	);

	// Query for current study queue to compare against (conditional)
	const currentStudyQueue = useQuery(
		api.realTimeAdaptiveLearning.getAdaptiveStudyQueue,
		deckId && enableCaching ? { deckId, maxCards: 20, sessionId } : "skip",
	);

	// Calculate path change information
	const currentPathChangeInfo = useMemo((): PathChangeInfo | null => {
		if (!recentPathRegeneration || recentPathRegeneration.length === 0) {
			return null;
		}

		const latestRegeneration = recentPathRegeneration[0];
		const cardsReordered = latestRegeneration.newOrder.length;
		const totalCards = Math.max(
			latestRegeneration.originalOrder.length,
			latestRegeneration.newOrder.length,
		);

		// Calculate how much the order changed
		let changedPositions = 0;
		const minLength = Math.min(
			latestRegeneration.originalOrder.length,
			latestRegeneration.newOrder.length,
		);

		for (let i = 0; i < minLength; i++) {
			if (
				latestRegeneration.originalOrder[i] !== latestRegeneration.newOrder[i]
			) {
				changedPositions++;
			}
		}

		// Add any cards that were added or removed
		changedPositions += Math.abs(
			latestRegeneration.originalOrder.length -
				latestRegeneration.newOrder.length,
		);

		const changePercentage = totalCards > 0 ? changedPositions / totalCards : 0;
		const hasSignificantChange = changePercentage >= significantChangeThreshold;

		const changeInfo: PathChangeInfo = {
			cardsReordered,
			changePercentage,
			hasSignificantChange,
			timestamp: latestRegeneration.timestamp,
			topPriorityCards: latestRegeneration.priorityScores
				.slice(0, 5)
				.map((score) => ({
					cardId: score.cardId,
					priorityScore: score.score,
					reasoning: score.reasoning,
				})),
			totalCards,
			triggerReason: latestRegeneration.triggerReason,
		};

		return changeInfo;
	}, [recentPathRegeneration, significantChangeThreshold]);

	// Detect when path has changed
	const hasPathChanged = useMemo(() => {
		if (!currentStudyQueue || !lastKnownPath) return false;

		const currentPath = currentStudyQueue.map((card) => card._id);

		// Compare current path with last known path
		if (currentPath.length !== lastKnownPath.length) return true;

		return currentPath.some((cardId, index) => cardId !== lastKnownPath[index]);
	}, [currentStudyQueue, lastKnownPath]);

	// Update last known path when study queue changes
	useEffect(() => {
		if (currentStudyQueue) {
			const currentPath = currentStudyQueue.map((card) => card._id);
			setLastKnownPath(currentPath);
		}
	}, [currentStudyQueue]);

	// Handle path change detection and caching
	useEffect(() => {
		if (!currentPathChangeInfo) return;

		const cacheKey = `${currentPathChangeInfo.timestamp}_${currentPathChangeInfo.triggerReason}`;

		// Check cache to avoid duplicate notifications
		if (enableCaching && pathCacheRef.current.has(cacheKey)) {
			return;
		}

		// Prevent too frequent notifications (minimum 5 seconds apart)
		const now = Date.now();
		if (now - lastNotificationRef.current < 5000) {
			return;
		}

		// Cache the change info
		if (enableCaching) {
			pathCacheRef.current.set(cacheKey, currentPathChangeInfo);

			// Limit cache size to prevent memory leaks
			if (pathCacheRef.current.size > 50) {
				const firstKey = pathCacheRef.current.keys().next().value;
				if (firstKey) {
					pathCacheRef.current.delete(firstKey);
				}
			}
		}

		// Update state
		setIsPathChanging(true);
		setPathChangeHistory((prev) => [
			currentPathChangeInfo,
			...prev.slice(0, 9),
		]); // Keep last 10 changes

		// Trigger callback if provided
		if (onPathChange && currentPathChangeInfo.hasSignificantChange) {
			onPathChange(currentPathChangeInfo);
			lastNotificationRef.current = now;
		}

		// Reset path changing state after a delay
		const resetTimer = setTimeout(() => {
			setIsPathChanging(false);
		}, 3000);

		return () => clearTimeout(resetTimer);
	}, [currentPathChangeInfo, enableCaching, onPathChange]);

	// Get formatted change reason for display
	const getFormattedChangeReason = useCallback(
		(triggerReason: string): string => {
			const reasonMap: Record<string, string> = {
				answer_significant_change: "Performance improvement detected",
				confidence_rating_significant_change: "Confidence level adjustment",
				difficulty_rating_significant_change: "Difficulty assessment update",
				flip_significant_change: "Study pattern optimization",
				inconsistency_pattern: "Consistency improvement focus",
				plateau_detection: "Learning plateau addressed",
				significant_performance_change: "Learning progress update",
			};

			return reasonMap[triggerReason] || "Study path optimized";
		},
		[],
	);

	// Check if a specific card moved significantly in priority
	const getCardPriorityChange = useCallback(
		(
			cardId: string,
		): {
			moved: boolean;
			direction: "up" | "down" | "none";
			positions: number;
		} => {
			if (!currentPathChangeInfo || !lastKnownPath) {
				return { direction: "none", moved: false, positions: 0 };
			}

			const oldIndex = lastKnownPath.indexOf(cardId);
			const newIndex = currentPathChangeInfo.topPriorityCards.findIndex(
				(card) => card.cardId === cardId,
			);

			if (oldIndex === -1 || newIndex === -1) {
				return { direction: "none", moved: false, positions: 0 };
			}

			const positions = Math.abs(newIndex - oldIndex);
			const moved = positions > 2; // Consider significant if moved more than 2 positions
			const direction =
				newIndex < oldIndex ? "up" : newIndex > oldIndex ? "down" : "none";

			return { direction, moved, positions };
		},
		[currentPathChangeInfo, lastKnownPath],
	);

	// Clear cache manually
	const clearCache = useCallback(() => {
		pathCacheRef.current.clear();
		setPathChangeHistory([]);
	}, []);

	return {
		cardsReordered: currentPathChangeInfo?.cardsReordered || 0,
		changePercentage: currentPathChangeInfo?.changePercentage || 0,
		clearCache,
		// Current state
		currentPathChangeInfo,
		getCardPriorityChange,

		// Utility functions
		getFormattedChangeReason,
		hasPathChanged,

		// Computed values
		hasSignificantChange: currentPathChangeInfo?.hasSignificantChange || false,
		isPathChanging,

		// Raw data for advanced usage
		lastKnownPath,
		pathChangeHistory,
		recentPathRegeneration,
	};
}
