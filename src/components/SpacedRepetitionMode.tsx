import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	trackCardsReviewed,
	trackSessionCompleted,
	trackSessionStarted,
	trackStreakBroken,
	trackStreakContinued,
	trackStreakMilestone,
	trackStreakStarted,
	useAnalytics,
	useAnalyticsEnhanced,
} from "../lib/analytics";
import {
	formatNextReviewTime,
	getLocalDateString,
	getUserTimeZone,
} from "../lib/dateUtils";
import { useErrorMonitoring } from "../lib/errorMonitoring";
import { useGestureTutorial } from "../lib/gestureTutorialUtils";
import {
	initializeGestureStyles,
	isTouchDevice,
	useFlashcardGestures,
} from "../lib/gestureUtils";
import type { Card } from "../types/cards";
import { getKeyboardShortcuts, isShortcutKey } from "../types/keyboard";
import { DifficultyIndicator } from "./DifficultyIndicator";
import GestureTutorial from "./GestureTutorial";
import HelpIcon from "./HelpIcon";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import PostSessionSummary from "./PostSessionSummary";
import { StudyProgressBar } from "./StudyProgressBar";
import { FlashcardSkeleton } from "./skeletons/SkeletonComponents";

interface SpacedRepetitionModeProps {
	deckId: Id<"decks">;
	onExit: () => void;
}

/**
 * SpacedRepetitionMode Component - Intelligent study interface using SM-2 algorithm
 *
 * This component provides a spaced repetition study experience where users can:
 * - Review cards that are due based on the SM-2 algorithm
 * - Study new cards with a daily limit
 * - Rate their performance to optimize future scheduling
 * - Focus on long-term retention rather than short-term completion
 *
 * Features:
 * - SM-2 algorithm for optimal scheduling
 * - Quality-based response buttons (Again, Hard, Good, Easy)
 * - Intelligent queue management (due cards first, then new cards)
 * - No visible progress counters to prevent "grinding" behavior
 * - Clean, distraction-free interface
 */
function SpacedRepetitionMode({ deckId, onExit }: SpacedRepetitionModeProps) {
	// State management for the study session
	const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
	const [isFlipped, setIsFlipped] = useState<boolean>(false);
	const [studyQueue, setStudyQueue] = useState<Card[]>([]);
	const [sessionStarted, setSessionStarted] = useState<boolean>(false);
	const [showKeyboardHelp, setShowKeyboardHelp] = useState<boolean>(false);
	const [showSummary, setShowSummary] = useState<boolean>(false);
	const [sessionStartTime, setSessionStartTime] = useState<number>(0);
	const [cardsReviewed, setCardsReviewed] = useState<number>(0);
	const [flipStartTime, setFlipStartTime] = useState<number | null>(null);
	const [sessionId] = useState<string>(() => {
		// Generate cryptographically secure random session ID
		const timestamp = Date.now();
		const randomBytes = new Uint8Array(8);
		crypto.getRandomValues(randomBytes);
		const randomString = Array.from(randomBytes, (byte) => byte.toString(36))
			.join("")
			.substring(0, 11);
		return `session_${timestamp}_${randomString}`;
	});
	const [_lastCardReviewTime, setLastCardReviewTime] = useState<number>(0);
	const [errorTracked, setErrorTracked] = useState<{
		deck?: boolean;
		studyQueue?: boolean;
	}>({});

	const { t } = useTranslation();

	// Fetch deck and study queue using Convex queries
	const deck = useQuery(api.decks.getDeckById, { deckId });
	const studyQueueData = useQuery(api.spacedRepetition.getStudyQueue, {
		deckId,
		shuffle: true, // Enable shuffling for varied study experience
	});
	const nextReviewInfo = useQuery(api.spacedRepetition.getNextReviewInfo, {
		deckId,
	});

	// Mutations for card operations
	const reviewCard = useMutation(api.spacedRepetition.reviewCard);
	const initializeCard = useMutation(
		api.spacedRepetition.initializeCardForSpacedRepetition,
	);
	const updateStreak = useMutation(api.streaks.updateStreak);
	const recordStudySession = useMutation(api.studySessions.recordStudySession);

	const { trackStudySessionStarted, posthog } = useAnalytics();
	const { trackEventBatched, hasConsent } = useAnalyticsEnhanced();
	const {
		trackConvexMutation,
		trackStudySession,
		captureError,
		trackConvexQuery,
	} = useErrorMonitoring();

	// Gesture tutorial management
	const gestureTutorial = useGestureTutorial("spaced-repetition");

	// Initialize gesture styles on component mount
	useEffect(() => {
		initializeGestureStyles();
	}, []);

	// Show gesture tutorial when session starts (only on first study session)
	useEffect(() => {
		if (sessionStarted && gestureTutorial.shouldShow && studyQueue.length > 0) {
			// Small delay to let the study interface load first
			const timer = setTimeout(() => {
				gestureTutorial.showTutorial();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [sessionStarted, gestureTutorial, studyQueue.length]);

	// Initialize study queue when data is loaded
	useEffect(() => {
		if (studyQueueData && !sessionStarted) {
			setStudyQueue(studyQueueData);

			if (studyQueueData.length > 0 && deck) {
				// Track legacy study session started event
				trackStudySessionStarted(deckId, deck.name, studyQueueData.length);

				// Track funnel analysis session started event
				if (hasConsent) {
					trackSessionStarted(
						posthog,
						deckId,
						"spaced-repetition",
						sessionId,
						deck.name,
						studyQueueData.length,
					);
				}

				setSessionStarted(true);
				setSessionStartTime(Date.now());
				setFlipStartTime(Date.now()); // Initialize flip timer for first card
				setLastCardReviewTime(Date.now());
			}
		}
	}, [
		studyQueueData,
		sessionStarted,
		deckId,
		deck,
		trackStudySessionStarted,
		hasConsent,
		posthog,
		sessionId,
	]);

	// Track deck loading errors (side effect)
	useEffect(() => {
		if (deck === null && !errorTracked.deck) {
			const deckError = new Error("Deck not found or access denied");
			trackConvexQuery("getDeckById", deckError, {
				deckId,
			});
			setErrorTracked((prev) => ({ ...prev, deck: true }));
		}
	}, [deck, errorTracked.deck, trackConvexQuery, deckId]);

	// Track study queue loading errors (side effect)
	useEffect(() => {
		if (studyQueueData === null && !errorTracked.studyQueue) {
			const queueError = new Error("Failed to load study queue");
			trackConvexQuery("getStudyQueue", queueError, {
				deckId,
			});
			setErrorTracked((prev) => ({ ...prev, studyQueue: true }));
		}
	}, [studyQueueData, errorTracked.studyQueue, trackConvexQuery, deckId]);

	/**
	 * Handle session completion with analytics and streak tracking
	 */
	const handleSessionCompletion = useCallback(
		async (finalCardsReviewed: number) => {
			if (!deck || sessionStartTime === 0) return;

			const sessionDuration = Date.now() - sessionStartTime;
			const completionRate =
				studyQueue.length > 0
					? (finalCardsReviewed / studyQueue.length) * 100
					: 0;

			// Track session completion for funnel analysis
			if (hasConsent) {
				trackSessionCompleted(
					posthog,
					deckId,
					sessionId,
					finalCardsReviewed,
					"spaced-repetition",
					sessionDuration,
					completionRate,
				);
			}

			// Record study session in database
			try {
				const userTimeZone = getUserTimeZone();
				const localDate = getLocalDateString(userTimeZone);

				await recordStudySession({
					cardsStudied: finalCardsReviewed,
					deckId,
					localDate,
					sessionDuration,
					studyMode: "spaced-repetition",
					userTimeZone,
				});

				// Update streak and track streak events
				const streakResult = await updateStreak({
					studyDate: localDate,
					timezone: userTimeZone,
				});

				// Track streak events based on result
				if (hasConsent && streakResult) {
					if (streakResult.streakEvent === "started") {
						trackStreakStarted(
							posthog,
							streakResult.currentStreak,
							localDate,
							userTimeZone,
						);
					} else if (streakResult.streakEvent === "continued") {
						trackStreakContinued(
							posthog,
							streakResult.currentStreak,
							localDate,
							userTimeZone,
							streakResult.currentStreak - 1,
						);
					} else if (streakResult.streakEvent === "broken") {
						trackStreakBroken(
							posthog,
							streakResult.longestStreak,
							1, // daysMissed - simplified for now
							localDate,
							userTimeZone,
						);
					}

					// Track milestone if achieved
					if (streakResult.isNewMilestone && streakResult.milestone) {
						trackStreakMilestone(
							posthog,
							streakResult.currentStreak,
							streakResult.milestone,
							localDate,
							userTimeZone,
						);
					}
				}
			} catch (error) {
				console.error("Error completing session:", error);
				// Track study session error
				trackStudySession(deckId, "session_end", error as Error, {
					cardsReviewed: finalCardsReviewed,
					sessionId,
					studyMode: "spaced-repetition",
				});
			}
		},
		[
			deck,
			sessionStartTime,
			studyQueue.length,
			hasConsent,
			posthog,
			deckId,
			sessionId,
			recordStudySession,
			updateStreak,
			trackStudySession,
		],
	);

	/**
	 * Handle flipping the current card between front and back
	 */
	const handleFlipCard = useCallback(() => {
		try {
			if (studyQueue.length === 0) return;

			const currentCard = studyQueue[currentCardIndex];
			if (!currentCard) return;

			const flipDirection: "front_to_back" | "back_to_front" = isFlipped
				? "back_to_front"
				: "front_to_back";
			const timeToFlip = flipStartTime ? Date.now() - flipStartTime : undefined;

			// Track the card flip event with batching and feature flags
			if (hasConsent) {
				trackEventBatched(
					"card_flipped",
					{
						cardId: currentCard._id,
						deckId,
						flipDirection,
						timeToFlip,
					},
					["new-study-algorithm", "advanced-statistics"],
				);
			}

			setIsFlipped((prev) => !prev);
			setFlipStartTime(Date.now());
		} catch (error) {
			// Track card flip error
			captureError(error as Error, {
				action: "flip_card",
				additionalData: {
					currentCardIndex,
					isFlipped,
					studyQueueLength: studyQueue.length,
				},
				cardId: studyQueue[currentCardIndex]?._id,
				category: "ui_error",
				component: "SpacedRepetitionMode",
				deckId,
				severity: "low",
			});
		}
	}, [
		studyQueue,
		currentCardIndex,
		isFlipped,
		flipStartTime,
		deckId,
		hasConsent,
		trackEventBatched,
		captureError,
	]);

	/**
	 * Handle card review with quality rating
	 */
	const handleReview = useCallback(
		async (quality: number) => {
			if (studyQueue.length === 0) return;

			const currentCard = studyQueue[currentCardIndex];

			// Map quality numbers to difficulty labels for analytics
			const getDifficultyFromQuality = (
				q: number,
			): "easy" | "medium" | "hard" => {
				if (q === 0) return "hard"; // Again
				if (q === 3) return "hard"; // Hard
				if (q === 4) return "medium"; // Good
				if (q === 5) return "easy"; // Easy
				return "medium"; // Default fallback
			};

			const difficulty = getDifficultyFromQuality(quality);

			// Track difficulty rating with batching and feature flags
			if (hasConsent) {
				trackEventBatched(
					"difficulty_rated",
					{
						cardId: currentCard._id,
						deckId,
						difficulty,
					},
					["new-study-algorithm", "advanced-statistics"],
				);
			}

			try {
				// Initialize card for spaced repetition if needed
				if (currentCard.repetition === undefined) {
					await initializeCard({ cardId: currentCard._id });
				}

				// Review the card with the given quality
				await reviewCard({ cardId: currentCard._id, quality });
			} catch (error) {
				console.error("Error reviewing card:", error);

				// Track the specific error based on the operation
				if (currentCard.repetition === undefined) {
					trackConvexMutation(
						"initializeCardForSpacedRepetition",
						error as Error,
						{
							cardId: currentCard._id,
							deckId,
							mutationArgs: { cardId: currentCard._id },
						},
					);
				} else {
					trackConvexMutation("reviewCard", error as Error, {
						cardId: currentCard._id,
						deckId,
						mutationArgs: { cardId: currentCard._id, quality },
					});
				}

				// Continue to next card even if there's an error
			}

			// Increment cards reviewed count (once per review attempt)
			const newCardsReviewed = cardsReviewed + 1;
			setCardsReviewed(newCardsReviewed);
			setLastCardReviewTime(Date.now());

			// Track cards reviewed for funnel analysis
			if (hasConsent && sessionStartTime > 0) {
				trackCardsReviewed(
					posthog,
					deckId,
					sessionId,
					newCardsReviewed,
					"spaced-repetition",
					Date.now() - sessionStartTime,
				);
			}

			// Move to next card or finish session
			const nextIndex = currentCardIndex + 1;
			if (nextIndex >= studyQueue.length) {
				// Session complete - handle completion tracking and streak updates
				await handleSessionCompletion(newCardsReviewed);
				setShowSummary(true);
			} else {
				setCurrentCardIndex(nextIndex);
				setIsFlipped(false);
				setFlipStartTime(Date.now()); // Reset flip timer for new card
			}
		},
		[
			studyQueue,
			currentCardIndex,
			initializeCard,
			reviewCard,
			deckId,
			hasConsent,
			trackEventBatched,
			cardsReviewed,
			posthog,
			sessionId,
			sessionStartTime,
			handleSessionCompletion,
			trackConvexMutation,
		],
	);

	// Configure gesture handlers for mobile touch interactions
	const gestureHandlers = useFlashcardGestures({
		disabled: showKeyboardHelp || studyQueue.length === 0,
		onFlipCard: handleFlipCard, // Easy rating on right swipe when flipped
		onRateEasy: () => isFlipped && void handleReview(5), // Again rating on down swipe when flipped
		onRateHard: () => isFlipped && void handleReview(0),
		studyMode: "spaced-repetition",
	});

	/**
	 * Reset session state to start a new study session
	 */
	const resetSessionState = useCallback(() => {
		setCurrentCardIndex(0);
		setIsFlipped(false);
		setStudyQueue([]);
		setSessionStarted(false);
		setShowSummary(false);
		setSessionStartTime(0);
		setCardsReviewed(0);
		setFlipStartTime(null);
	}, []);

	/**
	 * Handle continuing study session - restart with fresh queue
	 */
	const handleContinueStudying = useCallback(() => {
		resetSessionState();
		// The useEffect will automatically reinitialize the session when sessionStarted becomes false
	}, [resetSessionState]);

	// Reset state when deck changes
	useEffect(() => {
		resetSessionState();
		setErrorTracked({}); // Reset error tracking state
	}, [resetSessionState]);

	// Global keyboard event listener for shortcuts
	useEffect(() => {
		const handleGlobalKeyDown = (event: KeyboardEvent) => {
			// Don't handle shortcuts if modal is open or if user is typing in an input
			if (
				showKeyboardHelp ||
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			// Handle help shortcut
			if (isShortcutKey(event, "?")) {
				event.preventDefault();
				setShowKeyboardHelp(true);
				return;
			}

			// Handle flip shortcuts
			if (isShortcutKey(event, "Space") || isShortcutKey(event, "Enter")) {
				event.preventDefault();
				handleFlipCard();
				return;
			}

			// Handle rating shortcuts (only when card is flipped)
			if (isFlipped && studyQueue.length > 0) {
				if (isShortcutKey(event, "1")) {
					event.preventDefault();
					void handleReview(0); // Again
				} else if (isShortcutKey(event, "2")) {
					event.preventDefault();
					void handleReview(3); // Hard
				} else if (isShortcutKey(event, "3")) {
					event.preventDefault();
					void handleReview(4); // Good
				} else if (isShortcutKey(event, "4")) {
					event.preventDefault();
					void handleReview(5); // Easy
				}
			}
		};

		document.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			document.removeEventListener("keydown", handleGlobalKeyDown);
		};
		// handleFlipCard is intentionally omitted - it's stabilized with useCallback([])
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		isFlipped,
		studyQueue.length,
		showKeyboardHelp,
		handleReview,
		handleFlipCard,
	]);

	/**
	 * Handle keyboard shortcuts for flipping cards
	 */
	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.code === "Space" || event.code === "Enter") {
			event.preventDefault();
			handleFlipCard();
		}
	};

	// Loading state
	if (deck === undefined || studyQueueData === undefined) {
		return <FlashcardSkeleton />;
	}

	// Error state - deck not found
	if (deck === null) {
		return (
			<div className="mx-auto flex max-w-4xl flex-col gap-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<h2 className="mb-4 font-bold text-2xl">
							{t("study.deckNotFound.title")}
						</h2>
						<p className="mb-6 text-slate-600 dark:text-slate-400">
							{t("study.deckNotFound.message")}
						</p>
						<button
							aria-label={t("study.deckNotFound.backToDashboard")}
							className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
							onClick={onExit}
							type="button"
						>
							{t("study.deckNotFound.backToDashboard")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// Error state - study queue failed to load
	if (studyQueueData === null) {
		return (
			<div className="mx-auto flex max-w-4xl flex-col gap-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<h2 className="mb-4 font-bold text-2xl">{t("errors.generic")}</h2>
						<p className="mb-6 text-slate-600 dark:text-slate-400">
							{t("errors.network")}
						</p>
						<button
							aria-label={t("study.deckNotFound.backToDashboard")}
							className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
							onClick={onExit}
							type="button"
						>
							{t("study.deckNotFound.backToDashboard")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// No cards to study state
	if (studyQueueData && studyQueueData.length === 0) {
		// Generate enhanced messaging based on session and next review data
		const sessionCardsReviewed = cardsReviewed;
		const hasNextReview = nextReviewInfo?.nextDueDate;
		const nextReviewTime = hasNextReview
			? formatNextReviewTime(hasNextReview)
			: null;
		const totalCards = nextReviewInfo?.totalCardsInDeck || 0;

		return (
			<div className="mx-auto flex max-w-4xl flex-col gap-8">
				{/* Header with deck name and exit button */}
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-3xl">{deck.name}</h1>
					<button
						aria-label={t("study.exitStudy")}
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						onClick={onExit}
						type="button"
					>
						{t("study.exitStudy")}
					</button>
				</div>

				{/* Enhanced "All Caught Up" message */}
				<div className="flex items-center justify-center py-12">
					<div className="max-w-2xl text-center">
						<h2 className="mb-4 font-bold text-2xl">
							{t("study.allCaughtUp.title")}
						</h2>

						{/* Session statistics */}
						{sessionCardsReviewed > 0 && (
							<div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
								<p className="font-medium text-green-800 dark:text-green-200">
									{t("study.allCaughtUp.sessionStats", {
										count: sessionCardsReviewed,
									})}
								</p>
							</div>
						)}

						{/* Main encouragement message */}
						<p className="mb-4 text-lg text-slate-600 dark:text-slate-400">
							{t("study.allCaughtUp.noCardsMessage")}
						</p>

						{/* Next review information */}
						{hasNextReview && nextReviewTime ? (
							<div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
								<p className="text-blue-800 dark:text-blue-200">
									<span className="font-medium">
										{t("study.session.nextReview", { time: nextReviewTime })}
									</span>
								</p>
								<p className="mt-1 text-blue-600 text-sm dark:text-blue-300">
									{t("study.allCaughtUp.nextReviewMessage", {
										time: nextReviewTime,
									})}
								</p>
							</div>
						) : totalCards > 0 ? (
							<div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
								<p className="text-slate-600 dark:text-slate-400">
									All {totalCards} card{totalCards === 1 ? "" : "s"} in this
									deck {totalCards === 1 ? "is" : "are"} up to date.
								</p>
								<p className="mt-1 text-slate-500 text-sm dark:text-slate-500">
									Add new cards to continue expanding your knowledge!
								</p>
							</div>
						) : (
							<div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
								<p className="text-slate-600 dark:text-slate-400">
									{t("study.allCaughtUp.emptyDeckMessage")}
								</p>
							</div>
						)}

						<button
							aria-label={t("study.deckNotFound.backToDashboard")}
							className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
							onClick={onExit}
							type="button"
						>
							{t("study.deckNotFound.backToDashboard")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	const currentCard = studyQueue[currentCardIndex];

	// Additional safety check - if currentCard is undefined, show loading
	if (!currentCard) {
		return <FlashcardSkeleton />;
	}

	// Show summary if session is complete
	if (showSummary && deck) {
		return (
			<PostSessionSummary
				cardsReviewed={cardsReviewed}
				deckId={deckId}
				deckName={deck.name}
				onContinueStudying={handleContinueStudying}
				onReturnToDashboard={onExit}
				sessionDuration={
					sessionStartTime > 0 ? Date.now() - sessionStartTime : undefined
				}
				studyMode="spaced-repetition"
			/>
		);
	}

	return (
		<div
			className="mx-auto flex max-w-4xl flex-col p-4"
			style={{ height: "calc(100vh - 120px)" }}
		>
			{/* Header with deck name, help icon, and exit button */}
			<div className="mb-6 flex flex-shrink-0 items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">{deck.name}</h1>
					<p className="mt-1 text-slate-600 dark:text-slate-400">
						{t("study.spacedRepetitionMode")}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<HelpIcon onClick={() => setShowKeyboardHelp(true)} />
					<button
						aria-label={t("study.exitStudy")}
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						onClick={onExit}
						type="button"
					>
						{t("study.exitStudy")}
					</button>
				</div>
			</div>

			{/* Study Progress Bar */}
			<StudyProgressBar
				className="mb-6 flex-shrink-0"
				currentPosition={currentCardIndex + 1}
				isCompleted={currentCardIndex + 1 >= studyQueue.length}
				totalCards={studyQueue.length}
			/>

			{/* Flashcard with 3D Flip Animation - Takes remaining height */}
			{/* biome-ignore lint/a11y/useSemanticElements: Container needs to hold other buttons, so div with role="button" is appropriate */}
			<div
				aria-label={
					isFlipped ? "Click to show question" : "Click to show answer"
				}
				className="flashcard-container flex-1 cursor-pointer"
				onClick={handleFlipCard}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				{...gestureHandlers}
			>
				<div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
					{/* Front side (Question) */}
					<div className="flashcard-side flashcard-front flex flex-col border-2 border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
						{/* Content area with proper spacing */}
						<div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg text-slate-600 dark:text-slate-400">
									{t("forms.quickAddCard.front")}
								</h2>
								<DifficultyIndicator
									easeFactor={currentCard.easeFactor}
									interval={currentCard.interval}
									repetition={currentCard.repetition}
									showLabel={true}
									variant="compact"
								/>
							</div>
							{/* Scrollable text content area */}
							<div
								className="flex-1 overflow-y-auto px-2 py-4"
								style={{ minHeight: 0 }}
							>
								<div className="space-y-4">
									{currentCard.frontImageUrl && (
										<img
											alt="Front side content"
											className="mx-auto max-h-48 max-w-full rounded-lg object-contain"
											src={currentCard.frontImageUrl}
										/>
									)}
									<p className="break-words text-center text-2xl text-slate-900 leading-relaxed dark:text-slate-100">
										{currentCard.front}
									</p>
								</div>
							</div>
						</div>
						{/* Fixed bottom section for controls */}
						<div className="mt-6 flex-shrink-0">
							{/* Show Answer button */}
							<button
								aria-label={t("study.showAnswer")}
								className="pointer-events-auto rounded-md border-2 bg-dark px-8 py-4 font-medium text-lg text-light transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
								onClick={(e) => {
									e.stopPropagation();
									handleFlipCard();
								}}
								type="button"
							>
								{t("study.showAnswer")}
							</button>
							{/* Flip hint with gesture support */}
							<div className="pointer-events-none mt-4 text-slate-500 text-sm dark:text-slate-400">
								{isTouchDevice()
									? "Tap or swipe left to show answer"
									: "Click anywhere or press Space/Enter to flip"}
							</div>
						</div>
					</div>

					{/* Back side (Answer) */}
					<div className="flashcard-side flashcard-back flex flex-col border-2 border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
						{/* Content area with proper spacing */}
						<div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col">
							<div className="mb-6 flex items-center justify-between">
								<h2 className="font-semibold text-lg text-slate-600 dark:text-slate-400">
									{t("forms.quickAddCard.back")}
								</h2>
								<DifficultyIndicator
									easeFactor={currentCard.easeFactor}
									interval={currentCard.interval}
									repetition={currentCard.repetition}
									showLabel={true}
									variant="compact"
								/>
							</div>
							{/* Scrollable text content area */}
							<div
								className="flex-1 overflow-y-auto px-2 py-2"
								style={{ minHeight: 0 }}
							>
								<div className="space-y-4">
									{currentCard.backImageUrl && (
										<img
											alt="Back side content"
											className="mx-auto max-h-48 max-w-full rounded-lg object-contain"
											src={currentCard.backImageUrl}
										/>
									)}
									<p className="break-words text-center text-2xl text-slate-900 leading-relaxed dark:text-slate-100">
										{currentCard.back}
									</p>
								</div>
							</div>
						</div>
						{/* Fixed bottom section for controls */}
						<div className="mt-6 flex-shrink-0">
							{/* Quality rating buttons */}
							<div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
								<p className="mb-2 text-slate-600 dark:text-slate-400">
									How well did you know this?
								</p>
								<div className="grid grid-cols-2 gap-3">
									<button
										aria-label="Again - I didn't know this at all (Press 1)"
										className="relative rounded-md bg-red-500 px-4 py-3 font-medium text-white transition-colors hover:bg-red-600"
										onClick={(e) => {
											e.stopPropagation();
											void handleReview(0);
										}}
										type="button"
									>
										<span className="flex items-center justify-between">
											{t("study.difficulty.again")}
											<kbd className="ml-2 rounded border border-red-400 bg-red-600 bg-opacity-50 px-1.5 py-0.5 text-xs">
												1
											</kbd>
										</span>
									</button>
									<button
										aria-label="Hard - I knew this with difficulty (Press 2)"
										className="relative rounded-md bg-orange-500 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-600"
										onClick={(e) => {
											e.stopPropagation();
											void handleReview(3);
										}}
										type="button"
									>
										<span className="flex items-center justify-between">
											{t("study.difficulty.hard")}
											<kbd className="ml-2 rounded border border-orange-400 bg-orange-600 bg-opacity-50 px-1.5 py-0.5 text-xs">
												2
											</kbd>
										</span>
									</button>
									<button
										aria-label="Good - I knew this well (Press 3)"
										className="relative rounded-md bg-green-500 px-4 py-3 font-medium text-white transition-colors hover:bg-green-600"
										onClick={(e) => {
											e.stopPropagation();
											void handleReview(4);
										}}
										type="button"
									>
										<span className="flex items-center justify-between">
											{t("study.difficulty.good")}
											<kbd className="ml-2 rounded border border-green-400 bg-green-600 bg-opacity-50 px-1.5 py-0.5 text-xs">
												3
											</kbd>
										</span>
									</button>
									<button
										aria-label="Easy - I knew this perfectly (Press 4)"
										className="relative rounded-md bg-blue-500 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-600"
										onClick={(e) => {
											e.stopPropagation();
											void handleReview(5);
										}}
										type="button"
									>
										<span className="flex items-center justify-between">
											{t("study.difficulty.easy")}
											<kbd className="ml-2 rounded border border-blue-400 bg-blue-600 bg-opacity-50 px-1.5 py-0.5 text-xs">
												4
											</kbd>
										</span>
									</button>
								</div>
								{/* Flip hint with gesture support */}
								<div className="pointer-events-none mt-4 text-slate-500 text-sm dark:text-slate-400">
									{isTouchDevice()
										? "Swipe left to flip • Swipe right for Easy • Swipe down for Again"
										: "Click anywhere or press Space/Enter to flip back"}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Keyboard Shortcuts Modal */}
			<KeyboardShortcutsModal
				isOpen={showKeyboardHelp}
				onClose={() => setShowKeyboardHelp(false)}
				shortcuts={getKeyboardShortcuts(
					"spaced-repetition",
					t as (key: string) => string,
				)}
				studyMode="spaced-repetition"
			/>

			{/* Gesture Tutorial */}
			<GestureTutorial
				isOpen={gestureTutorial.isOpen}
				onClose={gestureTutorial.closeTutorial}
				studyMode="spaced-repetition"
			/>
		</div>
	);
}

export default SpacedRepetitionMode;
