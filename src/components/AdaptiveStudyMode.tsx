import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import { toastHelpers } from "../lib/toast";
import LearningReflectionModal from "./LearningReflectionModal";
import { FlashcardSkeleton } from "./skeletons/SkeletonComponents";

// SM-2 algorithm considers quality >= 3 as successful
const SM2_SUCCESS_THRESHOLD = 3;

interface AdaptiveStudyModeProps {
	deckId: Id<"decks">;
	onExit: () => void;
}

/**
 * Adaptive Study Mode Component
 *
 * Enhanced spaced repetition study mode that uses personalized learning patterns
 * to optimize the learning experience for each individual user.
 *
 * Features:
 * - Personalized difficulty adjustments based on learning patterns
 * - Time-of-day performance optimization
 * - Confidence ratings and predictions
 * - Adaptive scheduling based on individual learning velocity
 * - Real-time feedback and personalized messages
 */
export default function AdaptiveStudyMode({
	deckId,
	onExit,
}: AdaptiveStudyModeProps) {
	const { t, i18n } = useTranslation();
	const { trackStudySessionStarted } = useAnalytics();

	// Component state
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [showConfidenceRating, setShowConfidenceRating] = useState(false);
	const [confidenceRating, setConfidenceRating] = useState<number | null>(null);
	const [responseStartTime, setResponseStartTime] = useState<number | null>(
		null,
	);
	const [sessionStarted, setSessionStarted] = useState(false);
	const [personalizedMessage, setPersonalizedMessage] = useState<string>("");
	const [showReflectionModal, setShowReflectionModal] = useState(false);
	const [sessionStats, setSessionStats] = useState<{
		cardsReviewed: number;
		sessionDuration: number;
		averageSuccess: number;
		sessionStartTime: number;
	} | null>(null);
	const [reviewResults, setReviewResults] = useState<number[]>([]); // Track quality ratings for each review
	const [sessionCompleted, setSessionCompleted] = useState(false); // Track if session is completed

	// Ref to track timeout for personalized message cleanup
	const messageTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	// Convex queries and mutations
	const decks = useQuery(api.decks.getDecksForUser);
	const deck = decks?.find((d) => d._id === deckId);
	const studyQueue = useQuery(api.spacedRepetition.getStudyQueue, { deckId });
	const learningPattern = useQuery(api.adaptiveLearning.getUserLearningPattern);
	const reviewCardAdaptive = useMutation(
		api.adaptiveLearning.reviewCardAdaptive,
	);
	const checkAchievements = useMutation(api.gamification.checkAchievements);

	// Get current card with bounds checking
	const currentCard =
		studyQueue && studyQueue.length > 0 && currentCardIndex < studyQueue.length
			? studyQueue[currentCardIndex]
			: null;

	// Helper function to show achievement notifications with staggered timing
	const showAchievementNotifications = useCallback(
		(
			achievements: Array<{
				achievementId: string;
				achievement: {
					name: string;
					icon: string;
				};
			}>,
			context: string = "",
		) => {
			if (achievements.length === 0) return;

			try {
				// Show individual toast notifications for each achievement
				// Use a staggered delay to prevent overwhelming the user
				achievements.forEach((achievement, index) => {
					setTimeout(() => {
						toastHelpers.achievement(
							achievement.achievement.name,
							achievement.achievement.icon,
						);
					}, index * 1500); // 1.5 second delay between each toast
				});
			} catch (toastError) {
				// Fallback: log to console if toast system fails
				console.error(
					`Failed to show ${context} achievement toast notifications:`,
					toastError,
				);
				console.log(`New ${context} achievements unlocked:`, achievements);
			}
		},
		[],
	);

	// Track session start
	useEffect(() => {
		if (deck && studyQueue && studyQueue.length > 0 && !sessionStarted) {
			trackStudySessionStarted(deckId, deck.name, studyQueue.length);
			setSessionStarted(true);
			setResponseStartTime(Date.now());

			// Initialize session stats
			setSessionStats({
				averageSuccess: 0,
				cardsReviewed: 0,
				sessionDuration: 0,
				sessionStartTime: Date.now(),
			});
		}
	}, [deck, studyQueue, sessionStarted, trackStudySessionStarted, deckId]);

	// Cleanup timeout on component unmount
	useEffect(() => {
		return () => {
			if (messageTimeoutRef.current) {
				clearTimeout(messageTimeoutRef.current);
			}
		};
	}, []);

	// Handle card flip
	const handleFlipCard = useCallback(() => {
		if (!isFlipped) {
			setIsFlipped(true);
			setShowConfidenceRating(true);
		}
	}, [isFlipped]);

	// Handle confidence rating
	const handleConfidenceRating = useCallback((rating: number) => {
		setConfidenceRating(rating);
		setShowConfidenceRating(false);
	}, []);

	// Handle study session achievements
	const handleStudyAchievements = useCallback(
		async (quality: number, cardId: Id<"cards">) => {
			try {
				const newAchievements = await checkAchievements({
					language: i18n.language,
					triggerData: { cardId, deckId, quality },
					triggerType: "study_session",
				});
				showAchievementNotifications(newAchievements, "study session");
			} catch (error) {
				console.error("Error checking achievements:", error);
			}
		},
		[checkAchievements, deckId, showAchievementNotifications, i18n.language],
	);

	// Handle session completion achievements
	const handleSessionCompletionAchievements = useCallback(
		async (cardsReviewed: number) => {
			try {
				const sessionAchievements = await checkAchievements({
					language: i18n.language,
					triggerData: { cardsReviewed, deckId },
					triggerType: "session_complete",
				});
				showAchievementNotifications(sessionAchievements, "session completion");
			} catch (error) {
				console.error("Error checking session achievements:", error);
			}
		},
		[checkAchievements, deckId, showAchievementNotifications, i18n.language],
	);

	// Move to next card in the study queue
	const moveToNextCard = useCallback(() => {
		setCurrentCardIndex((prev) => prev + 1);
		setIsFlipped(false);
		setConfidenceRating(null);
		setResponseStartTime(Date.now());

		// Clear personalized message after a delay
		if (messageTimeoutRef.current) {
			clearTimeout(messageTimeoutRef.current);
		}
		messageTimeoutRef.current = setTimeout(
			() => setPersonalizedMessage(""),
			3000,
		);
	}, []);

	// Complete the study session
	const completeSession = useCallback(
		async (finalQuality: number) => {
			if (!sessionStats || !studyQueue) {
				onExit();
				return;
			}

			const sessionDuration =
				(Date.now() - sessionStats.sessionStartTime) / 1000 / 60; // minutes

			// Calculate actual average success rate from review results
			const finalReviewResults = [...reviewResults, finalQuality]; // Include the current review
			const successfulReviews = finalReviewResults.filter(
				(q) => q >= SM2_SUCCESS_THRESHOLD,
			).length;
			const actualAverageSuccess =
				finalReviewResults.length > 0
					? successfulReviews / finalReviewResults.length
					: 0;

			const finalStats = {
				...sessionStats,
				averageSuccess: actualAverageSuccess,
				cardsReviewed: studyQueue?.length || 0,
				sessionDuration,
			};
			setSessionStats(finalStats);
			setSessionCompleted(true); // Mark session as completed to prevent loading states
			setShowReflectionModal(true);

			// Check for session-based achievements
			await handleSessionCompletionAchievements(studyQueue?.length || 0);
		},
		[
			sessionStats,
			studyQueue,
			reviewResults,
			onExit,
			handleSessionCompletionAchievements,
		],
	);

	// Handle quality rating and card review
	const handleReview = useCallback(
		async (quality: number) => {
			if (!currentCard || !responseStartTime) return;

			const responseTime = Date.now() - responseStartTime;

			try {
				const result = await reviewCardAdaptive({
					cardId: currentCard._id,
					confidenceRating: confidenceRating || undefined,
					quality,
					responseTime,
				});

				setPersonalizedMessage(result.personalizedMessage);

				// Track review result for session statistics
				setReviewResults((prev) => [...prev, quality]);

				// Check for study session achievements
				await handleStudyAchievements(quality, currentCard._id);

				// Move to next card or finish session
				if (studyQueue && currentCardIndex < studyQueue.length - 1) {
					moveToNextCard();
				} else {
					await completeSession(quality);
				}
			} catch (error) {
				console.error("Error reviewing card:", error);
			}
		},
		[
			currentCard,
			responseStartTime,
			confidenceRating,
			reviewCardAdaptive,
			currentCardIndex,
			studyQueue,
			handleStudyAchievements,
			moveToNextCard,
			completeSession,
		],
	);

	// Handle keyboard-triggered review actions with error handling
	const handleKeyboardReview = useCallback(
		(quality: number) => {
			handleReview(quality).catch((error) => {
				console.error("Error handling keyboard review:", error);
			});
		},
		[handleReview],
	);

	// Handle button-triggered review actions with error handling
	const handleButtonReview = useCallback(
		(quality: number) => {
			handleReview(quality).catch((error) => {
				console.error("Error handling button review:", error);
			});
		},
		[handleReview],
	);

	// Keyboard shortcuts
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (event.key) {
				case " ":
				case "Enter":
					event.preventDefault();
					if (!isFlipped) {
						handleFlipCard();
					}
					break;
				case "1":
					if (isFlipped && !showConfidenceRating) handleKeyboardReview(0);
					break;
				case "2":
					if (isFlipped && !showConfidenceRating) handleKeyboardReview(3);
					break;
				case "3":
					if (isFlipped && !showConfidenceRating) handleKeyboardReview(4);
					break;
				case "4":
					if (isFlipped && !showConfidenceRating) handleKeyboardReview(5);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [isFlipped, showConfidenceRating, handleFlipCard, handleKeyboardReview]);

	// Loading states - don't show skeleton if session is completed
	if ((!deck || !studyQueue) && !sessionCompleted) {
		return <FlashcardSkeleton />;
	}

	if (studyQueue && studyQueue.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 dark:from-slate-900 dark:to-slate-800">
				<div className="text-center">
					<div className="mb-4 text-6xl">🎉</div>
					<h2 className="mb-2 font-bold text-2xl text-slate-900 dark:text-slate-100">
						{t("study.noCardsToReview", "No cards to review")}
					</h2>
					<p className="mb-6 text-slate-600 dark:text-slate-400">
						{t("study.allCaughtUp.noCardsMessage")}
					</p>
					<button
						className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
						onClick={onExit}
						type="button"
					>
						{t("study.returnToDashboard", "Return to Dashboard")}
					</button>
				</div>
			</div>
		);
	}

	// Additional safety check for currentCard - don't show skeleton if session is completed
	if (!currentCard && !sessionCompleted) {
		return <FlashcardSkeleton />;
	}

	// If session is completed, show the reflection modal or exit
	if (sessionCompleted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4 dark:from-slate-900 dark:to-slate-800">
				<LearningReflectionModal
					isOpen={showReflectionModal}
					onClose={() => {
						setShowReflectionModal(false);
						onExit();
					}}
					sessionContext={
						sessionStats
							? {
									averageSuccess: sessionStats.averageSuccess,
									cardsReviewed: sessionStats.cardsReviewed,
									deckId,
									sessionDuration: sessionStats.sessionDuration,
								}
							: undefined
					}
					sessionId={`session_${Date.now()}`}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
			{/* Header */}
			<div className="flex items-center justify-between border-slate-200 border-b bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
				<div className="flex items-center gap-4">
					<button
						className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
						onClick={onExit}
						type="button"
					>
						← {t("study.exit", "Exit")}
					</button>
					<h1 className="font-semibold text-slate-900 text-xl dark:text-slate-100">
						{deck?.name || ""}
					</h1>
					<span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700 text-sm dark:bg-blue-900 dark:text-blue-300">
						{t("study.adaptive", "Adaptive")}
					</span>
				</div>
				<div className="text-slate-600 text-sm dark:text-slate-400">
					{currentCardIndex + 1} / {studyQueue?.length || 0}
				</div>
			</div>

			{/* Learning Pattern Insights */}
			{learningPattern && (
				<div className="border-blue-200 border-b bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
					<div className="flex items-center gap-4 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-blue-600 dark:text-blue-400">📊</span>
							<span className="text-blue-700 dark:text-blue-300">
								{t("study.successRate", "Success Rate")}:{" "}
								{Math.round(learningPattern.averageSuccessRate * 100)}%
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-blue-600 dark:text-blue-400">⚡</span>
							<span className="text-blue-700 dark:text-blue-300">
								{t("study.learningVelocity", "Learning Velocity")}:{" "}
								{learningPattern.learningVelocity.toFixed(1)}{" "}
								{t("study.cardsPerDay", "cards/day")}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Personalized Message */}
			{personalizedMessage && (
				<div className="border-green-200 border-b bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
					<div className="flex items-center gap-2">
						<span className="text-green-600 dark:text-green-400">💡</span>
						<span className="text-green-700 dark:text-green-300">
							{personalizedMessage}
						</span>
					</div>
				</div>
			)}

			{/* Main Card Area */}
			<div className="flex flex-1 items-center justify-center p-8">
				<div className="w-full max-w-2xl">
					{/* Flashcard */}
					<button
						className="flex min-h-[300px] w-full cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800"
						onClick={handleFlipCard}
						type="button"
					>
						<div className="p-8 text-center">
							<div className="space-y-4">
								{/* Display image if available */}
								{isFlipped && currentCard?.backImageUrl && (
									<img
										alt="Back side content"
										className="mx-auto max-h-48 max-w-full rounded-lg object-contain"
										crossOrigin="anonymous"
										src={currentCard.backImageUrl}
									/>
								)}
								{!isFlipped && currentCard?.frontImageUrl && (
									<img
										alt="Front side content"
										className="mx-auto max-h-48 max-w-full rounded-lg object-contain"
										crossOrigin="anonymous"
										src={currentCard.frontImageUrl}
									/>
								)}
								{/* Display text content */}
								<div className="text-lg text-slate-900 leading-relaxed dark:text-slate-100">
									{isFlipped
										? currentCard?.back || ""
										: currentCard?.front || ""}
								</div>
							</div>
							{!isFlipped && (
								<div className="mt-6 text-slate-500 text-sm dark:text-slate-400">
									{t("study.clickToReveal", "Click to reveal")}
								</div>
							)}
						</div>
					</button>

					{/* Confidence Rating */}
					{showConfidenceRating && (
						<div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
							<p className="mb-3 text-sm text-yellow-800 dark:text-yellow-200">
								{t("study.howConfident", "How confident are you?")}
							</p>
							<div className="flex gap-2">
								{[1, 2, 3, 4, 5].map((rating) => (
									<button
										className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-800 transition-colors hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700"
										key={rating}
										onClick={() => handleConfidenceRating(rating)}
										type="button"
									>
										{rating}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Quality Rating Buttons */}
					{isFlipped && !showConfidenceRating && (
						<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
							<button
								className="rounded-lg bg-red-100 p-4 font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
								onClick={() => handleButtonReview(0)}
								type="button"
							>
								{t("study.again", "Again")} (1)
							</button>
							<button
								className="rounded-lg bg-orange-100 p-4 font-medium text-orange-700 transition-colors hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:hover:bg-orange-800"
								onClick={() => handleButtonReview(3)}
								type="button"
							>
								{t("study.hard", "Hard")} (2)
							</button>
							<button
								className="rounded-lg bg-blue-100 p-4 font-medium text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
								onClick={() => handleButtonReview(4)}
								type="button"
							>
								{t("study.good", "Good")} (3)
							</button>
							<button
								className="rounded-lg bg-green-100 p-4 font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
								onClick={() => handleButtonReview(5)}
								type="button"
							>
								{t("study.easy", "Easy")} (4)
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Footer with keyboard shortcuts */}
			<div className="border-slate-200 border-t bg-white/80 p-4 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-800/80">
				<div className="text-center text-slate-600 text-sm dark:text-slate-400">
					{t("study.keyboardShortcuts", "Keyboard shortcuts")}: Space/Enter{" "}
					{t("study.toFlip", "to flip")}, 1-4 {t("study.toRate", "to rate")}
				</div>
			</div>
		</div>
	);
}
