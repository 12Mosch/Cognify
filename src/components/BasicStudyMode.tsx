import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import { useGestureTutorial } from "../lib/gestureTutorialUtils";
import {
	initializeGestureStyles,
	isTouchDevice,
	useFlashcardGestures,
} from "../lib/gestureUtils";
import { getKeyboardShortcuts, isShortcutKey } from "../types/keyboard";
import { DifficultyIndicator } from "./DifficultyIndicator";
import GestureTutorial from "./GestureTutorial";
import HelpIcon from "./HelpIcon";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import PostSessionSummary from "./PostSessionSummary";
import { StudyProgressBar } from "./StudyProgressBar";
import { FlashcardSkeleton } from "./skeletons/SkeletonComponents";

interface BasicStudyModeProps {
	deckId: Id<"decks">;
	onExit: () => void;
}

function BasicStudyMode({ deckId, onExit }: BasicStudyModeProps) {
	const [currentCardIndex, setCurrentCardIndex] = useState(0);
	const [isFlipped, setIsFlipped] = useState(false);
	const [sessionStarted, setSessionStarted] = useState(false);
	const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
	const [showSummary, setShowSummary] = useState(false);
	const [sessionStartTime, setSessionStartTime] = useState(0);
	const [flipStartTime, setFlipStartTime] = useState<number | null>(null);

	const { t } = useTranslation();
	const deck = useQuery(api.decks.getDeckById, { deckId });
	const cards = useQuery(api.cards.getCardsForDeck, { deckId });

	const { trackStudySessionStarted, trackCardFlipped } = useAnalytics();

	// Gesture tutorial management
	const gestureTutorial = useGestureTutorial("basic");

	// Initialize gesture styles on component mount
	useEffect(() => {
		initializeGestureStyles();
	}, []);

	// Show gesture tutorial when session starts (only on first study session)
	useEffect(() => {
		if (
			sessionStarted &&
			gestureTutorial.shouldShow &&
			cards &&
			cards.length > 0
		) {
			// Small delay to let the study interface load first
			const timer = setTimeout(() => {
				gestureTutorial.showTutorial();
			}, 1000);
			return () => clearTimeout(timer);
		}
	}, [sessionStarted, gestureTutorial, cards]);

	// Calculate cards reviewed based on current position (always accurate regardless of navigation)
	const cardsReviewed = currentCardIndex + 1;

	// Define callback functions first (before any early returns)
	const handleNextCard = useCallback(() => {
		setCurrentCardIndex((prev) => {
			if (cards && prev < cards.length - 1) {
				setIsFlipped(false);
				setFlipStartTime(Date.now()); // Reset flip timer for new card
				return prev + 1;
			}
			return prev;
		});
	}, [cards]);

	// Handle finishing the study session
	const handleFinishSession = useCallback(() => {
		setShowSummary(true);
	}, []);

	const handlePreviousCard = useCallback(() => {
		setCurrentCardIndex((prev) => {
			if (prev > 0) {
				setIsFlipped(false);
				setFlipStartTime(Date.now()); // Reset flip timer for new card
				return prev - 1;
			}
			return prev;
		});
	}, []);

	const handleFlipCard = useCallback(() => {
		// Don't flip if modal is open
		if (showKeyboardHelp || !cards) return;

		const currentCard = cards[currentCardIndex];
		if (!currentCard) return;

		const flipDirection: "front_to_back" | "back_to_front" = isFlipped
			? "back_to_front"
			: "front_to_back";
		const timeToFlip = flipStartTime ? Date.now() - flipStartTime : undefined;

		// Track the card flip event
		trackCardFlipped(currentCard._id, deckId, flipDirection, timeToFlip);

		setIsFlipped((prev) => !prev);
		setFlipStartTime(Date.now());
	}, [
		showKeyboardHelp,
		cards,
		currentCardIndex,
		isFlipped,
		flipStartTime,
		trackCardFlipped,
		deckId,
	]);

	// Configure gesture handlers for mobile touch interactions
	const gestureHandlers = useFlashcardGestures({
		onFlipCard: handleFlipCard,
		onNextCard: handleNextCard,
		disabled: showKeyboardHelp || !cards || cards.length === 0,
		studyMode: "basic",
	});

	// Reset analytics gate whenever we switch decks
	useEffect(() => {
		setSessionStarted(false);
		setCurrentCardIndex(0);
		setIsFlipped(false);
		setShowSummary(false);
		setSessionStartTime(0);
		setFlipStartTime(null);
	}, []);

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

			// Handle navigation shortcuts
			if (isShortcutKey(event, "←")) {
				event.preventDefault();
				handlePreviousCard();
			} else if (isShortcutKey(event, "→")) {
				event.preventDefault();
				handleNextCard();
			}
		};

		document.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			document.removeEventListener("keydown", handleGlobalKeyDown);
		};
		// handleFlipCard, handlePreviousCard, handleNextCard are intentionally omitted - they're stabilized with useCallback([])
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [showKeyboardHelp, handleFlipCard, handleNextCard, handlePreviousCard]);

	// Track study session start when component mounts and deck is loaded
	useEffect(() => {
		if (deck && cards && !sessionStarted) {
			trackStudySessionStarted(deckId, deck.name, cards.length);
			setSessionStarted(true);
			setSessionStartTime(Date.now());
			setFlipStartTime(Date.now()); // Initialize flip timer for first card
		}
	}, [deck, deckId, cards, trackStudySessionStarted, sessionStarted]);

	// Loading state
	if (deck === undefined || cards === undefined) {
		return <FlashcardSkeleton />;
	}

	// Deck not found
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
							onClick={onExit}
							className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
						>
							{t("study.deckNotFound.backToDashboard")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	// No cards in deck
	if (cards.length === 0) {
		return (
			<div className="mx-auto flex max-w-4xl flex-col gap-8">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-3xl">{deck.name}</h1>
					<button
						onClick={onExit}
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
					>
						Back to Dashboard
					</button>
				</div>

				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
							<svg
								className="h-12 w-12 text-slate-400 dark:text-slate-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.5}
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
						</div>
						<h3 className="mb-2 font-semibold text-xl">
							{t("study.emptyDeck.title")}
						</h3>
						<p className="mb-6 text-slate-600 dark:text-slate-400">
							{t("study.emptyDeck.message")}
						</p>
					</div>
				</div>
			</div>
		);
	}

	const currentCard = cards[currentCardIndex];

	// Handle keyboard shortcuts for flipping cards (kept for card-specific events)
	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.code === "Space" || event.code === "Enter") {
			event.preventDefault();
			handleFlipCard();
		}
	};

	// Show summary if session is complete
	if (showSummary && deck) {
		return (
			<PostSessionSummary
				deckId={deckId}
				deckName={deck.name}
				cardsReviewed={cardsReviewed}
				studyMode="basic"
				sessionDuration={
					sessionStartTime > 0 ? Date.now() - sessionStartTime : undefined
				}
				onReturnToDashboard={onExit}
				onContinueStudying={undefined} // Basic mode doesn't support continue studying
			/>
		);
	}

	return (
		<div
			className="mx-auto flex max-w-4xl flex-col p-4"
			style={{ height: "calc(100vh - 120px)" }}
		>
			{/* Header */}
			<div className="mb-4 flex flex-shrink-0 items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">{deck.name}</h1>
					<p className="mt-1 text-slate-600 dark:text-slate-400">
						{t("study.cardProgress", {
							current: currentCardIndex + 1,
							total: cards.length,
						})}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<HelpIcon onClick={() => setShowKeyboardHelp(true)} />
					<button
						onClick={onExit}
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
					>
						{t("study.exitStudySession")}
					</button>
				</div>
			</div>

			{/* Study Progress Bar */}
			<StudyProgressBar
				currentPosition={currentCardIndex + 1}
				totalCards={cards.length}
				isCompleted={currentCardIndex === cards.length - 1}
				className="mb-6 flex-shrink-0"
			/>

			{/* Flashcard with 3D Flip Animation - Takes remaining height */}
			<div
				className="flashcard-container mb-6 flex-1 cursor-pointer"
				onClick={handleFlipCard}
				onKeyDown={handleKeyDown}
				tabIndex={0}
				role="button"
				aria-label={
					isFlipped ? "Click to show question" : "Click to show answer"
				}
				{...gestureHandlers}
			>
				<div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
					{/* Front side (Question) */}
					<div className="flashcard-side flashcard-front flex flex-col border-2 border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
						{/* Content area with proper spacing */}
						<div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-semibold text-lg text-slate-600 dark:text-slate-400">
									{t("forms.quickAddCard.front")}
								</h2>
								<DifficultyIndicator
									repetition={currentCard.repetition}
									easeFactor={currentCard.easeFactor}
									interval={currentCard.interval}
									variant="compact"
									showLabel={true}
								/>
							</div>
							{/* Scrollable text content area */}
							<div
								className="flex-1 overflow-y-auto px-2 py-4"
								style={{ minHeight: 0 }}
							>
								<p className="break-words text-center text-slate-900 text-xl dark:text-slate-100">
									{currentCard.front}
								</p>
							</div>
						</div>
						{/* Fixed bottom section for controls */}
						<div className="mt-4 flex-shrink-0">
							{/* Flip hint with gesture support */}
							<div className="pointer-events-none text-slate-500 text-sm dark:text-slate-400">
								{isTouchDevice()
									? "Tap or swipe left to flip • Swipe right for next card"
									: "Click anywhere or press Space/Enter to flip"}
							</div>
						</div>
					</div>

					{/* Back side (Answer) */}
					<div className="flashcard-side flashcard-back flex flex-col border-2 border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
						{/* Content area with proper spacing */}
						<div className="pointer-events-none flex min-h-0 w-full flex-1 flex-col">
							<div className="mb-4 flex items-center justify-between">
								<h2 className="font-semibold text-lg text-slate-600 dark:text-slate-400">
									{t("forms.quickAddCard.back")}
								</h2>
								<DifficultyIndicator
									repetition={currentCard.repetition}
									easeFactor={currentCard.easeFactor}
									interval={currentCard.interval}
									variant="compact"
									showLabel={true}
								/>
							</div>
							{/* Scrollable text content area */}
							<div
								className="flex-1 overflow-y-auto px-2 py-4"
								style={{ minHeight: 0 }}
							>
								<p className="break-words text-center text-slate-900 text-xl dark:text-slate-100">
									{currentCard.back}
								</p>
							</div>
						</div>
						{/* Fixed bottom section for controls */}
						<div className="mt-4 flex-shrink-0">
							{/* Flip hint with gesture support */}
							<div className="pointer-events-none text-slate-500 text-sm dark:text-slate-400">
								{isTouchDevice()
									? "Tap or swipe left to flip back • Swipe right for next card"
									: "Click anywhere or press Space/Enter to flip back"}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Navigation Controls */}
			<div className="flex flex-shrink-0 justify-center gap-4">
				<button
					onClick={handlePreviousCard}
					disabled={currentCardIndex === 0}
					className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
					aria-label="Previous card (Press Left Arrow)"
				>
					<span className="flex items-center gap-2">
						{t("study.previous")}
						<kbd className="rounded border border-slate-400 bg-slate-300 px-1.5 py-0.5 text-xs dark:border-slate-500 dark:bg-slate-600">
							←
						</kbd>
					</span>
				</button>
				<button
					onClick={
						currentCardIndex === cards.length - 1
							? handleFinishSession
							: handleNextCard
					}
					className="rounded-md border-2 bg-dark px-4 py-2 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
					aria-label={
						currentCardIndex === cards.length - 1
							? "Finish study session"
							: "Next card (Press Right Arrow)"
					}
				>
					<span className="flex items-center gap-2">
						{currentCardIndex === cards.length - 1
							? t("study.session.completed")
							: t("study.next")}
						{currentCardIndex !== cards.length - 1 && (
							<kbd className="rounded border border-slate-400 bg-slate-600 bg-opacity-50 px-1.5 py-0.5 text-xs dark:border-slate-500 dark:bg-slate-300">
								→
							</kbd>
						)}
					</span>
				</button>
			</div>

			{/* Keyboard Shortcuts Modal */}
			<KeyboardShortcutsModal
				isOpen={showKeyboardHelp}
				onClose={() => setShowKeyboardHelp(false)}
				shortcuts={getKeyboardShortcuts("basic")}
				studyMode="basic"
			/>

			{/* Gesture Tutorial */}
			<GestureTutorial
				isOpen={gestureTutorial.isOpen}
				onClose={gestureTutorial.closeTutorial}
				studyMode="basic"
			/>
		</div>
	);
}

export default BasicStudyMode;
