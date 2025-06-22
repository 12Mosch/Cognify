import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import {
	forwardRef,
	lazy,
	memo,
	Suspense,
	useEffect,
	useImperativeHandle,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useErrorMonitoring } from "../lib/errorMonitoring";
import { toastHelpers } from "../lib/toast";
import AchievementsWidget from "./AchievementsWidget";
import { CreateDeckForm } from "./CreateDeckForm";
import KnowledgeMapWidget from "./KnowledgeMapWidget";
import PrivacyBanner from "./PrivacyBanner";
import { QuickAddCardForm } from "./QuickAddCardForm";
import SmartSchedulingWidget from "./SmartSchedulingWidget";
import StreakDisplay from "./StreakDisplay";
import {
	DeckListSkeleton,
	GenericSkeleton,
} from "./skeletons/SkeletonComponents";

// Lazy-loaded components for better performance
const DeckView = lazy(() => import("./DeckView"));
const StudyModeSelector = lazy(() => import("./StudyModeSelector"));
const BasicStudyMode = lazy(() => import("./BasicStudyMode"));
const SpacedRepetitionMode = lazy(() => import("./SpacedRepetitionMode"));
const AdaptiveStudyMode = lazy(() => import("./AdaptiveStudyMode"));
const StatisticsDashboard = lazy(() => import("./StatisticsDashboard"));

// Loading fallback component with skeleton loaders
function LoadingFallback({
	type = "default",
}: {
	type?: "default" | "deck-list" | "flashcard" | "deck-view";
}) {
	return <GenericSkeleton type={type} />;
}

interface Deck {
	_id: Id<"decks">;
	_creationTime: number;
	userId: string;
	name: string;
	description: string;
	cardCount: number;
}

interface DeckProgress {
	deckId: Id<"decks">;
	studiedCards: number;
	totalCards: number;
	progressPercentage: number;
	status: "new" | "in-progress" | "mastered";
	lastStudied?: number;
}

// Main Dashboard wrapper that handles all navigation state
export const Dashboard = forwardRef<
	{ goHome: () => void },
	{ onSettingsClick?: () => void }
>(function Dashboard({ onSettingsClick }, ref) {
	const [showingStatistics, setShowingStatistics] = useState(false);
	const [studyingDeckId, setStudyingDeckId] = useState<Id<"decks"> | null>(
		null,
	);
	const [studyMode, setStudyMode] = useState<
		"basic" | "spaced-repetition" | "adaptive" | null
	>(null);
	const [selectingStudyMode, setSelectingStudyMode] =
		useState<Id<"decks"> | null>(null);
	const [viewingDeckId, setViewingDeckId] = useState<Id<"decks"> | null>(null);

	// Expose goHome method to parent component
	useImperativeHandle(
		ref,
		() => ({
			goHome: () => {
				// Reset all navigation states to return to main dashboard
				setShowingStatistics(false);
				setStudyingDeckId(null);
				setStudyMode(null);
				setSelectingStudyMode(null);
				setViewingDeckId(null);
			},
		}),
		[],
	);

	// If user is viewing statistics, show the StatisticsDashboard component
	if (showingStatistics) {
		return (
			<Suspense fallback={<LoadingFallback type="default" />}>
				<StatisticsDashboard onBack={() => setShowingStatistics(false)} />
			</Suspense>
		);
	}

	// If user is viewing a deck, show the DeckView component
	if (viewingDeckId) {
		return (
			<Suspense fallback={<LoadingFallback type="deck-view" />}>
				<DeckView
					deckId={viewingDeckId}
					onBack={() => setViewingDeckId(null)}
				/>
			</Suspense>
		);
	}

	// If user is selecting a study mode, show the StudyModeSelector
	if (selectingStudyMode) {
		return (
			<Suspense fallback={<LoadingFallback type="default" />}>
				<StudyModeSelector
					deckId={selectingStudyMode}
					deckName="Deck" // We'll get the name in the component
					onCancel={() => setSelectingStudyMode(null)}
					onSelectMode={(mode: "basic" | "spaced-repetition" | "adaptive") => {
						setStudyMode(mode);
						setStudyingDeckId(selectingStudyMode);
						setSelectingStudyMode(null);
					}}
				/>
			</Suspense>
		);
	}

	// If user is in a study session, show the appropriate study component
	if (studyingDeckId && studyMode) {
		const handleExitStudy = () => {
			setStudyingDeckId(null);
			setStudyMode(null);
		};

		if (studyMode === "spaced-repetition") {
			return (
				<Suspense fallback={<LoadingFallback type="flashcard" />}>
					<SpacedRepetitionMode
						deckId={studyingDeckId}
						onExit={handleExitStudy}
					/>
				</Suspense>
			);
		} else if (studyMode === "adaptive") {
			return (
				<Suspense fallback={<LoadingFallback type="flashcard" />}>
					<AdaptiveStudyMode deckId={studyingDeckId} onExit={handleExitStudy} />
				</Suspense>
			);
		} else {
			return (
				<Suspense fallback={<LoadingFallback type="flashcard" />}>
					<BasicStudyMode deckId={studyingDeckId} onExit={handleExitStudy} />
				</Suspense>
			);
		}
	}

	// Render the main dashboard content
	return (
		<DashboardContent
			onManageCards={setViewingDeckId}
			onSettingsClick={onSettingsClick}
			onShowStatistics={() => setShowingStatistics(true)}
			onStartStudy={setSelectingStudyMode}
		/>
	);
});

// Separate component for the main dashboard content to avoid unnecessary queries
function DashboardContent({
	onShowStatistics,
	onStartStudy,
	onManageCards,
	onSettingsClick,
}: {
	onShowStatistics: () => void;
	onStartStudy: (deckId: Id<"decks">) => void;
	onManageCards: (deckId: Id<"decks">) => void;
	onSettingsClick?: () => void;
}) {
	const [errorTracked, setErrorTracked] = useState<{ decks?: boolean }>({});
	const { t } = useTranslation();

	const { user } = useUser();
	const { captureError, trackConvexQuery } = useErrorMonitoring();

	// Only fetch decks when we're in the main dashboard content
	const decks = useQuery(api.decks.getDecksForUser);
	const deckProgressData = useQuery(api.statistics.getDeckProgressData);

	// Track decks loading errors (side effect)
	useEffect(() => {
		if (decks === null && !errorTracked.decks) {
			const queryError = new Error("Failed to load user decks");
			trackConvexQuery("getDecksForUser", queryError, {
				userId: user?.id,
			});
			setErrorTracked((prev) => ({ ...prev, decks: true }));
		}
	}, [decks, errorTracked.decks, trackConvexQuery, user?.id]);

	// Loading state
	if (decks === undefined || deckProgressData === undefined) {
		return <DeckListSkeleton />;
	}

	// Success handlers with toast notifications
	const handleCreateSuccess = (deckName?: string) => {
		try {
			// The query will automatically refetch due to Convex reactivity
			toastHelpers.deckCreated(deckName);
		} catch (error) {
			captureError(error as Error, {
				action: "handle_deck_create_success",
				additionalData: { deckName },
				category: "ui_error",
				component: "Dashboard",
				severity: "low",
				userId: user?.id,
			});
		}
	};

	const handleCardCreateSuccess = () => {
		try {
			// The query will automatically refetch due to Convex reactivity
			toastHelpers.cardCreated();
		} catch (error) {
			captureError(error as Error, {
				action: "handle_card_create_success",
				category: "ui_error",
				component: "Dashboard",
				severity: "low",
				userId: user?.id,
			});
		}
	};

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-8">
			{/* Header */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">
						{t("dashboard.title")}
					</h1>
					<p className="mt-1 font-medium text-slate-700 dark:text-slate-300">
						{decks.length === 0
							? t("dashboard.subtitle.empty")
							: t("dashboard.subtitle.withDecks", { count: decks.length })}
					</p>
				</div>
				<div className="flex flex-col items-center gap-3 sm:flex-row">
					{/* Primary CTA - Create Deck */}
					<CreateDeckForm onSuccess={handleCreateSuccess} />

					{/* Secondary CTA - Add Card */}
					<QuickAddCardForm onSuccess={handleCardCreateSuccess} />

					{/* Tertiary Action - Statistics Link */}
					<button
						aria-label={t("dashboard.buttons.showStatistics")}
						className="flex items-center gap-2 rounded-lg px-6 py-3 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:text-slate-400 dark:focus:ring-slate-500 dark:focus:ring-offset-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200"
						onClick={onShowStatistics}
						type="button"
					>
						<svg
							aria-hidden="true"
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>{t("dashboard.buttons.showStatistics")}</title>
							<path
								d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
							/>
						</svg>
						{t("dashboard.buttons.showStatistics")}
					</button>
				</div>
			</div>

			{/* Streak Display, Smart Scheduling, and Achievements */}
			<div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
				<StreakDisplay />
				<SmartSchedulingWidget />
				<AchievementsWidget />
			</div>

			{/* Knowledge Map Widget */}
			<KnowledgeMapWidget className="mb-6" />

			{/* Decks Grid */}
			{decks.length === 0 ? (
				<EmptyState />
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{decks.map((deck) => {
						const progressData = deckProgressData.find(
							(p) => p.deckId === deck._id,
						);
						return (
							<DeckCard
								deck={deck}
								key={deck._id}
								onManageCards={() => onManageCards(deck._id)}
								onStartStudy={() => onStartStudy(deck._id)}
								progressData={progressData}
							/>
						);
					})}
				</div>
			)}

			{/* Privacy Banner */}
			<PrivacyBanner onSettingsClick={onSettingsClick} />
		</div>
	);
}

const EmptyState = memo(function EmptyState() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col items-center justify-center px-4 py-16">
			<div className="max-w-md text-center">
				<div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
					<svg
						aria-hidden="true"
						className="h-12 w-12 text-slate-400 dark:text-slate-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
						/>
					</svg>
				</div>
				<h3 className="mb-3 font-bold text-2xl tracking-tight">
					{t("emptyState.title")}
				</h3>
				<p className="mb-6 text-slate-600 leading-relaxed dark:text-slate-400">
					{t("emptyState.description")}
				</p>
				<div className="font-medium text-slate-500 text-sm dark:text-slate-400">
					{t("emptyState.getStarted")}
				</div>
			</div>
		</div>
	);
});

const DeckCard = memo(function DeckCard({
	deck,
	progressData,
	onStartStudy,
	onManageCards,
}: {
	deck: Deck;
	progressData?: DeckProgress;
	onStartStudy: () => void;
	onManageCards: () => void;
}) {
	const { t, i18n } = useTranslation();

	const formatDate = (timestamp: number) => {
		// Get the current language from i18n
		const currentLanguage = i18n.resolvedLanguage?.split("-")[0] || "en";

		return new Date(timestamp).toLocaleDateString(currentLanguage, {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	};

	// Get status badge configuration
	const getStatusBadge = () => {
		if (!progressData) return null;

		const { status } = progressData;
		const badgeConfig = {
			"in-progress": {
				ariaLabel: t("deck.status.inProgressAria"),
				className:
					"bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
				text: t("deck.status.inProgress"),
			},
			mastered: {
				ariaLabel: t("deck.status.masteredAria"),
				className:
					"bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
				text: t("deck.status.mastered"),
			},
			new: {
				ariaLabel: t("deck.status.newAria"),
				className:
					"bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600",
				text: t("deck.status.new"),
			},
		};

		const config = badgeConfig[status];
		return (
			<output
				aria-label={config.ariaLabel}
				className={`status-badge absolute top-3 right-3 rounded-md border px-2 py-1 font-medium text-xs ${config.className} transition-colors duration-200`}
			>
				{config.text}
			</output>
		);
	};

	// Get progress bar configuration
	const getProgressConfig = () => {
		if (!progressData) return null;

		const { progressPercentage, status } = progressData;
		const progressConfig = {
			"in-progress": "bg-blue-500 dark:bg-blue-400",
			mastered: "bg-green-500 dark:bg-green-400",
			new: "bg-slate-200 dark:bg-slate-700",
		};

		return {
			barColor: progressConfig[status],
			percentage: progressPercentage,
			textColor:
				status === "mastered"
					? "text-green-700 dark:text-green-300"
					: status === "in-progress"
						? "text-blue-700 dark:text-blue-300"
						: "text-slate-600 dark:text-slate-400",
		};
	};

	const progressConfig = getProgressConfig();

	return (
		<div className="group relative rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-lg dark:border-slate-700/60 dark:from-slate-800 dark:to-slate-900 dark:hover:border-slate-600 dark:hover:shadow-slate-900/20">
			{/* Status Badge */}
			{getStatusBadge()}

			<div className="flex h-full flex-col">
				{/* Deck Header */}
				<div className="mb-6 flex-1 pr-16">
					{" "}
					{/* Add right padding to avoid status badge overlap */}
					<h3 className="mb-4 line-clamp-2 font-bold text-xl tracking-tight transition-colors group-hover:text-slate-900 dark:group-hover:text-slate-100">
						{deck.name}
					</h3>
					{deck.description && (
						<p className="mb-0 line-clamp-3 font-normal text-slate-600 text-sm leading-relaxed dark:text-slate-400">
							{deck.description}
						</p>
					)}
				</div>

				{/* Progress Bar */}
				{progressConfig && (
					<div className="mb-4">
						<div className="mb-2 flex items-center justify-between">
							<span className="font-medium text-slate-600 text-xs dark:text-slate-400">
								{t("deck.progress.label")}
							</span>
							<span
								className={`font-semibold text-xs ${progressConfig.textColor}`}
							>
								{progressConfig.percentage}%
							</span>
						</div>
						<div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
							<div
								aria-label={t("deck.progress.aria", {
									percentage: progressConfig.percentage,
								})}
								aria-valuemax={100}
								aria-valuemin={0}
								aria-valuenow={progressConfig.percentage}
								className={`progress-bar h-full ${progressConfig.barColor} rounded-full transition-all duration-500 ease-out`}
								role="progressbar"
								style={{ width: `${progressConfig.percentage}%` }}
							/>
						</div>
					</div>
				)}

				{/* Deck Metadata */}
				<div className="mb-4 flex items-center justify-between border-slate-200/60 border-t pt-4 dark:border-slate-700/60">
					<div className="flex flex-wrap items-center gap-3">
						<span className="deck-metadata-badge rounded-md border border-slate-200/50 bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600 text-xs transition-colors duration-200 hover:bg-slate-200 dark:border-slate-600/50 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700">
							{t("deck.cardCount", { count: deck.cardCount })}
						</span>
						{progressData?.lastStudied && (
							<span className="deck-metadata-badge rounded-md border border-slate-200/50 bg-slate-100 px-2.5 py-1.5 font-medium text-slate-600 text-xs transition-colors duration-200 hover:bg-slate-200 dark:border-slate-600/50 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700">
								{t("deck.lastStudied", {
									date: formatDate(progressData.lastStudied),
								})}
							</span>
						)}
						<span className="deck-metadata-badge font-medium text-slate-500 text-xs transition-colors duration-200 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300">
							{t("deck.createdOn", { date: formatDate(deck._creationTime) })}
						</span>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex items-center gap-2">
					<button
						aria-label={t("deck.manageCardsAria", { deckName: deck.name })}
						className="flex-1 rounded-lg border border-slate-200/50 bg-slate-100 px-4 py-2.5 font-medium text-slate-700 text-sm transition-all duration-200 hover:scale-[1.01] hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-600/50 dark:bg-slate-700/50 dark:text-slate-300 dark:focus:ring-slate-500 dark:focus:ring-offset-slate-900 dark:hover:bg-slate-700"
						onClick={onManageCards}
						type="button"
					>
						{t("deck.manageCards")}
					</button>
					<button
						aria-label={t("deck.studyAria", { deckName: deck.name })}
						className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 font-semibold text-sm text-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
						onClick={onStartStudy}
						type="button"
					>
						{t("deck.studyNow")}
					</button>
				</div>
			</div>
		</div>
	);
});
