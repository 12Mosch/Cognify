import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import { getLocalDateString, getUserTimeZone } from "../lib/dateUtils";

interface PostSessionSummaryProps {
	deckId: Id<"decks">;
	deckName: string;
	cardsReviewed: number;
	studyMode: "basic" | "spaced-repetition";
	sessionDuration?: number;
	onReturnToDashboard: () => void;
	onContinueStudying?: () => void;
}

/**
 * PostSessionSummary Component - Display completion summary after study session
 *
 * This component provides closure and accomplishment feedback after completing
 * a study session. It shows:
 * - Session completion message with cards reviewed count
 * - Next study recommendations (especially for spaced repetition)
 * - Return to dashboard action
 * - Analytics tracking for session completion
 *
 * Features:
 * - Responsive design with proper dark mode support
 * - Accessibility with proper focus management and ARIA labels
 * - Different messaging for basic vs spaced repetition modes
 * - Integration with spaced repetition statistics for recommendations
 * - Smooth transitions and visual feedback
 */
function PostSessionSummary({
	deckId,
	deckName,
	cardsReviewed,
	studyMode,
	sessionDuration,
	onReturnToDashboard,
	onContinueStudying,
}: PostSessionSummaryProps) {
	const [hasTrackedCompletion, setHasTrackedCompletion] = useState(false);
	const [hasRecordedSession, setHasRecordedSession] = useState(false);

	const { t } = useTranslation();

	// Get study queue statistics for next session recommendations
	const studyQueueStats = useQuery(api.spacedRepetition.getStudyQueueStats, {
		deckId,
	});

	// Convex mutation for recording study session
	const recordStudySession = useMutation(api.studySessions.recordStudySession);

	const { trackStudySessionCompleted } = useAnalytics();

	// Record study session in database (only once)
	useEffect(() => {
		if (!hasRecordedSession && cardsReviewed > 0) {
			// Get user's timezone and local date for accurate session recording
			const userTimeZone = getUserTimeZone();
			const localDate = getLocalDateString(userTimeZone);

			recordStudySession({
				deckId,
				cardsStudied: cardsReviewed,
				sessionDuration,
				studyMode,
				userTimeZone,
				localDate,
			}).catch((error) => {
				console.error("Failed to record study session:", error);
				// Don't block the UI if session recording fails
			});
			setHasRecordedSession(true);
		}
	}, [
		deckId,
		cardsReviewed,
		sessionDuration,
		studyMode,
		recordStudySession,
		hasRecordedSession,
	]);

	// Track session completion analytics (only once)
	useEffect(() => {
		if (!hasTrackedCompletion && trackStudySessionCompleted) {
			trackStudySessionCompleted(
				deckId,
				deckName,
				cardsReviewed,
				studyMode,
				sessionDuration,
			);
			setHasTrackedCompletion(true);
		}
	}, [
		deckId,
		deckName,
		cardsReviewed,
		studyMode,
		sessionDuration,
		trackStudySessionCompleted,
		hasTrackedCompletion,
	]);

	// Focus management for accessibility
	useEffect(() => {
		// Focus the main heading when component mounts
		const heading = document.querySelector(
			'[data-testid="session-complete-heading"]',
		) as HTMLElement;
		if (heading) {
			heading.focus();
		}
	}, []);

	// Format session duration if available
	const formatDuration = (duration: number): string => {
		const minutes = Math.floor(duration / 60000);
		const seconds = Math.floor((duration % 60000) / 1000);

		if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		}
		return `${seconds}s`;
	};

	// Generate next study recommendation message
	const getNextStudyMessage = (): string => {
		if (studyMode === "basic") {
			return "Great job studying! You can review these cards again anytime.";
		}

		if (!studyQueueStats) {
			return "Come back later to continue your spaced repetition schedule.";
		}

		const { dueCount, newCount, totalStudyCards } = studyQueueStats;

		if (totalStudyCards === 0) {
			return "Excellent! You're all caught up. Check back tomorrow for new cards to review.";
		}

		if (dueCount > 0) {
			return `You have ${dueCount} more card${dueCount === 1 ? "" : "s"} ready to review now.`;
		}

		if (newCount > 0) {
			return `Come back tomorrow to study ${Math.min(newCount, 20)} new card${Math.min(newCount, 20) === 1 ? "" : "s"} based on your spaced repetition schedule.`;
		}

		return "Check back tomorrow for your next spaced repetition session.";
	};

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-8">
			{/* Success Icon and Header */}
			<div className="text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
					<svg
						className="h-8 w-8 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h1
					className="mb-2 font-bold text-3xl text-slate-900 dark:text-slate-100"
					data-testid="session-complete-heading"
					tabIndex={-1}
				>
					{t("postSessionSummary.title")}
				</h1>
				<p className="text-slate-600 dark:text-slate-400">
					{t("postSessionSummary.subtitle")}{" "}
					<span className="font-semibold text-slate-900 dark:text-slate-100">
						{cardsReviewed}
					</span>{" "}
					{t("postSessionSummary.stats.cardsReviewed", {
						count: cardsReviewed,
					})}{" "}
					{t("common.from")} <span className="font-semibold">{deckName}</span>
				</p>
			</div>

			{/* Session Statistics */}
			<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800">
				<div className="grid gap-4">
					{/* Cards Reviewed */}
					<div className="flex items-center justify-between">
						<span className="text-slate-600 dark:text-slate-400">
							{t("postSessionSummary.stats.cardsReviewed")}
						</span>
						<span className="font-semibold text-slate-900 dark:text-slate-100">
							{cardsReviewed}
						</span>
					</div>

					{/* Study Mode */}
					<div className="flex items-center justify-between">
						<span className="text-slate-600 dark:text-slate-400">
							{t("common.studyMode")}
						</span>
						<span className="font-semibold text-slate-900 dark:text-slate-100">
							{studyMode === "basic"
								? t("study.modeSelector.basicStudy.title")
								: t("study.modeSelector.spacedRepetition.title")}
						</span>
					</div>

					{/* Session Duration (if available) */}
					{sessionDuration && (
						<div className="flex items-center justify-between">
							<span className="text-slate-600 dark:text-slate-400">
								{t("common.sessionDuration")}
							</span>
							<span className="font-semibold text-slate-900 dark:text-slate-100">
								{formatDuration(sessionDuration)}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Next Study Recommendation */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
				<div className="flex items-start gap-3">
					<svg
						className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div>
						<h3 className="mb-1 font-semibold text-blue-800 text-sm dark:text-blue-200">
							{t("common.whatsNext")}
						</h3>
						<p className="text-blue-700 text-xs dark:text-blue-300">
							{getNextStudyMessage()}
						</p>
					</div>
				</div>
			</div>

			{/* Action Buttons */}
			<div className="flex flex-col gap-3">
				<button
					onClick={onReturnToDashboard}
					className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
					autoFocus
				>
					{t("postSessionSummary.actions.returnToDashboard")}
				</button>

				{/* Continue Studying Button (for spaced repetition with more cards available) */}
				{studyMode === "spaced-repetition" &&
					studyQueueStats &&
					studyQueueStats.dueCount > 0 &&
					onContinueStudying && (
						<button
							onClick={onContinueStudying}
							className="rounded-lg border-2 border-slate-300 bg-slate-200 px-6 py-3 font-medium text-slate-900 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-offset-slate-900"
						>
							{t("postSessionSummary.actions.continueStudying")} (
							{studyQueueStats.dueCount}{" "}
							{t("common.moreCards", { count: studyQueueStats.dueCount })})
						</button>
					)}
			</div>

			{/* Motivational Message */}
			<div className="text-center">
				<p className="text-slate-500 text-sm dark:text-slate-400">
					{studyMode === "spaced-repetition"
						? "Keep up the great work! Consistent practice leads to long-term retention."
						: "Great job studying! Regular review helps reinforce your learning."}
				</p>
			</div>
		</div>
	);
}

export default PostSessionSummary;
