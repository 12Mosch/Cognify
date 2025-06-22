import { useTranslation } from "react-i18next";
import type { Id } from "../../convex/_generated/dataModel";

interface StudyModeSelectorProps {
	deckId: Id<"decks">;
	deckName: string;
	onSelectMode: (mode: "basic" | "spaced-repetition" | "adaptive") => void;
	onCancel: () => void;
}

/**
 * StudyModeSelector Component - Choose between different study modes
 *
 * This component allows users to select between different study modes:
 * - Basic Study: Simple sequential review of all cards
 * - Spaced Repetition: Intelligent scheduling using SM-2 algorithm
 * - Adaptive Learning: Personalized spaced repetition with learning patterns
 */
function StudyModeSelector({
	deckId: _deckId,
	deckName,
	onSelectMode,
	onCancel,
}: StudyModeSelectorProps) {
	const { t } = useTranslation();

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-8">
			{/* Header */}
			<div className="text-center">
				<h1 className="mb-2 font-bold text-3xl">
					{t("study.modeSelector.title")}
				</h1>
				<p className="text-slate-600 dark:text-slate-400">
					{t("study.modeSelector.subtitle", { deckName })}
				</p>
			</div>

			{/* Study Mode Options */}
			<div className="grid gap-6">
				{/* Basic Study Mode */}
				<button
					aria-label="Select Basic Study Mode"
					className="group w-full cursor-pointer rounded-lg border-2 border-slate-200 bg-slate-50 p-6 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
					data-testid="basic-study-card"
					onClick={() => onSelectMode("basic")}
					type="button"
				>
					<div className="flex items-start gap-4">
						<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
							<svg
								aria-hidden="true"
								className="h-6 w-6 text-blue-600 dark:text-blue-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 5l7 7-7 7"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<div className="flex-1">
							<h3 className="mb-2 font-semibold text-lg transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">
								{t("study.modeSelector.basicStudy.title")}
							</h3>
							<p className="mb-3 text-slate-600 text-sm dark:text-slate-400">
								{t("study.modeSelector.basicStudy.description")}
							</p>
							<div className="flex flex-wrap gap-2">
								<span className="rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
									{t("study.modeSelector.basicStudy.features.sequential")}
								</span>
								<span className="rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
									{t("study.modeSelector.basicStudy.features.simple")}
								</span>
								<span className="rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300">
									{t("study.modeSelector.basicStudy.features.quick")}
								</span>
							</div>
						</div>
					</div>
				</button>

				{/* Spaced Repetition Mode */}
				<button
					aria-label="Select Spaced Repetition Study Mode"
					className="group w-full cursor-pointer rounded-lg border-2 border-slate-200 bg-slate-50 p-6 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
					data-testid="spaced-repetition-card"
					onClick={() => onSelectMode("spaced-repetition")}
					type="button"
				>
					<div className="flex items-start gap-4">
						<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
							<svg
								aria-hidden="true"
								className="h-6 w-6 text-green-600 dark:text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v6a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 00-2 2h-2a2 2 0 00-2 2v6a2 2 0 01-2 2H9z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<div className="flex-1">
							<h3 className="mb-2 font-semibold text-lg transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">
								{t("study.modeSelector.spacedRepetition.title")}
								<span className="ml-2 rounded bg-green-100 px-2 py-1 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
									{t("study.modeSelector.spacedRepetition.subtitle")}
								</span>
							</h3>
							<p className="mb-3 text-slate-600 text-sm dark:text-slate-400">
								{t("study.modeSelector.spacedRepetition.description")}
							</p>
							<div className="flex flex-wrap gap-2">
								<span className="rounded bg-green-100 px-2 py-1 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
									{t("study.modeSelector.spacedRepetition.features.algorithm")}
								</span>
								<span className="rounded bg-green-100 px-2 py-1 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
									{t("study.modeSelector.spacedRepetition.features.timing")}
								</span>
								<span className="rounded bg-green-100 px-2 py-1 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
									{t("study.modeSelector.spacedRepetition.features.retention")}
								</span>
							</div>
						</div>
					</div>
				</button>

				{/* Adaptive Learning Mode */}
				<button
					aria-label="Select Adaptive Learning Study Mode"
					className="group w-full cursor-pointer rounded-lg border-2 border-slate-200 bg-slate-50 p-6 text-left transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
					data-testid="adaptive-learning-card"
					onClick={() => onSelectMode("adaptive")}
					type="button"
				>
					<div className="flex items-start gap-4">
						<div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
							<svg
								aria-hidden="true"
								className="h-6 w-6 text-purple-600 dark:text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</div>
						<div className="flex-1">
							<h3 className="mb-2 font-semibold text-lg transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300">
								{t(
									"study.modeSelector.adaptiveLearning.title",
									"Adaptive Learning",
								)}
								<span className="ml-2 rounded bg-purple-100 px-2 py-1 text-purple-700 text-xs dark:bg-purple-900 dark:text-purple-300">
									{t(
										"study.modeSelector.adaptiveLearning.subtitle",
										"AI-Powered",
									)}
								</span>
							</h3>
							<p className="mb-3 text-slate-600 text-sm dark:text-slate-400">
								{t(
									"study.modeSelector.adaptiveLearning.description",
									"Personalized spaced repetition that adapts to your learning patterns, optimal study times, and individual performance.",
								)}
							</p>
							<div className="flex flex-wrap gap-2">
								<span className="rounded bg-purple-100 px-2 py-1 text-purple-700 text-xs dark:bg-purple-900 dark:text-purple-300">
									{t(
										"study.modeSelector.adaptiveLearning.features.personalized",
										"Personalized",
									)}
								</span>
								<span className="rounded bg-purple-100 px-2 py-1 text-purple-700 text-xs dark:bg-purple-900 dark:text-purple-300">
									{t(
										"study.modeSelector.adaptiveLearning.features.timeOptimized",
										"Time-Optimized",
									)}
								</span>
								<span className="rounded bg-purple-100 px-2 py-1 text-purple-700 text-xs dark:bg-purple-900 dark:text-purple-300">
									{t(
										"study.modeSelector.adaptiveLearning.features.intelligent",
										"Intelligent",
									)}
								</span>
							</div>
						</div>
					</div>
				</button>
			</div>

			{/* Cancel Button */}
			<div className="text-center">
				<button
					className="rounded-md border-2 border-slate-300 bg-slate-200 px-6 py-3 font-medium text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
					onClick={onCancel}
					type="button"
				>
					{t("study.modeSelector.cancel")}
				</button>
			</div>

			{/* Info Section */}
			<div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
				<div className="flex items-start gap-3">
					<svg
						aria-hidden="true"
						className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
						/>
					</svg>
					<div>
						<h4 className="mb-1 font-semibold text-blue-800 text-sm dark:text-blue-200">
							{t("study.modeSelector.info.title")}
						</h4>
						<p className="text-blue-700 text-xs dark:text-blue-300">
							{t("study.modeSelector.info.description")}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default StudyModeSelector;
