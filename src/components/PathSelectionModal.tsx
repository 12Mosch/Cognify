import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Id } from "../../convex/_generated/dataModel";
import PathCustomizationPanel, {
	type PathCustomizationOptions,
} from "./PathCustomizationPanel";

interface PathSelectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectPath: (
		pathType: string,
		customization?: PathCustomizationOptions,
	) => void;
	deckId: Id<"decks">;
	deckName: string;
	availablePaths: Array<{
		pathType: string;
		description: string;
		estimatedTime: number;
		confidence: number;
		path: Array<{
			cardId: Id<"cards">;
			front: string;
			reason: string;
			estimatedDifficulty: number;
		}>;
	}>;
}

/**
 * PathSelectionModal Component
 *
 * Provides an intuitive interface for users to understand and select from all available
 * learning path types. Features clear descriptions, visual indicators, and estimated
 * completion times to help users make informed decisions.
 */
const PathSelectionModal = memo(function PathSelectionModal({
	isOpen,
	onClose,
	onSelectPath,
	deckId: _deckId,
	deckName,
	availablePaths,
}: PathSelectionModalProps) {
	const { t } = useTranslation();
	const [selectedPathType, setSelectedPathType] = useState<string | null>(null);
	const [showCustomization, setShowCustomization] = useState(false);
	const [customizationOptions, setCustomizationOptions] =
		useState<PathCustomizationOptions | null>(null);

	if (!isOpen) return null;

	// Path type configurations with icons and colors
	const pathConfigs = {
		difficulty_progression: {
			color: "blue",
			icon: "📈",
			title: t(
				"knowledge.paths.types.difficultyProgression",
				"Difficulty-Based Learning",
			),
		},
		domain_focused: {
			color: "purple",
			icon: "🎓",
			title: t("knowledge.paths.types.domainFocused", "Domain-Focused Study"),
		},
		prerequisite_order: {
			color: "green",
			icon: "🏗️",
			title: t(
				"knowledge.paths.types.prerequisiteOrder",
				"Foundation-First Learning",
			),
		},
		review_focused: {
			color: "red",
			icon: "🎯",
			title: t(
				"knowledge.paths.types.reviewFocused",
				"Review-Focused Practice",
			),
		},
		spaced_repetition_optimized: {
			color: "indigo",
			icon: "🧠",
			title: t(
				"knowledge.paths.types.spacedRepetitionOptimized",
				"Spaced Repetition Optimized",
			),
		},
	};

	const handleSelectPath = () => {
		if (selectedPathType) {
			if (showCustomization) {
				// Proceed with customized path
				onSelectPath(selectedPathType, customizationOptions || undefined);
				onClose();
			} else {
				// Show customization panel first
				setShowCustomization(true);
			}
		}
	};

	const handleCustomizationBack = () => {
		setShowCustomization(false);
	};

	const handleCustomizationComplete = () => {
		if (selectedPathType) {
			onSelectPath(selectedPathType, customizationOptions || undefined);
			onClose();
		}
	};

	const getColorClasses = (color: string, isSelected: boolean) => {
		const baseClasses = "transition-all duration-200";
		const colorMap = {
			blue: isSelected
				? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
				: "border-slate-200 hover:border-blue-300 dark:border-slate-700 dark:hover:border-blue-600",
			green: isSelected
				? "border-green-500 bg-green-50 dark:bg-green-900/20"
				: "border-slate-200 hover:border-green-300 dark:border-slate-700 dark:hover:border-green-600",
			indigo: isSelected
				? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
				: "border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-600",
			purple: isSelected
				? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
				: "border-slate-200 hover:border-purple-300 dark:border-slate-700 dark:hover:border-purple-600",
			red: isSelected
				? "border-red-500 bg-red-50 dark:bg-red-900/20"
				: "border-slate-200 hover:border-red-300 dark:border-slate-700 dark:hover:border-red-600",
		};
		return `${baseClasses} ${colorMap[color as keyof typeof colorMap]}`;
	};

	const getIconBackgroundClass = (color: string, isSelected: boolean) => {
		const colorMap = {
			blue: isSelected
				? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
				: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300",
			green: isSelected
				? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200"
				: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300",
			indigo: isSelected
				? "bg-indigo-100 text-indigo-700 dark:bg-indigo-800 dark:text-indigo-200"
				: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300",
			purple: isSelected
				? "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200"
				: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300",
			red: isSelected
				? "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200"
				: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300",
		};
		return colorMap[color as keyof typeof colorMap];
	};

	const getConfidenceBarColor = (color: string) => {
		const colorMap = {
			blue: "bg-blue-500 dark:bg-blue-400",
			green: "bg-green-500 dark:bg-green-400",
			indigo: "bg-indigo-500 dark:bg-indigo-400",
			purple: "bg-purple-500 dark:bg-purple-400",
			red: "bg-red-500 dark:bg-red-400",
		};
		return colorMap[color as keyof typeof colorMap];
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-800">
				{/* Header */}
				<div className="sticky top-0 border-slate-200 border-b bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
					<div className="flex items-center justify-between">
						<div>
							<h2 className="font-semibold text-slate-900 text-xl dark:text-slate-100">
								{t("pathSelection.title", "Choose Your Learning Path")}
							</h2>
							<p className="text-slate-600 text-sm dark:text-slate-400">
								{t(
									"pathSelection.subtitle",
									"Select the best approach for studying",
								)}{" "}
								"{deckName}"
							</p>
						</div>
						<button
							aria-label={t("common.close", "Close")}
							className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
							onClick={onClose}
							type="button"
						>
							<svg
								className="h-6 w-6"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<title>{t("common.close", "Close")}</title>
								<path
									d="M6 18L18 6M6 6l12 12"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
								/>
							</svg>
						</button>
					</div>
				</div>

				{/* Content */}
				<div className="p-6">
					{!showCustomization ? (
						<>
							<div className="mb-6">
								<p className="text-slate-700 dark:text-slate-300">
									{t(
										"pathSelection.description",
										"Each learning path is optimized for different goals. Choose the one that best matches your current needs and learning style.",
									)}
								</p>
							</div>

							{/* Path Options */}
							<div className="space-y-4">
								{availablePaths.map((path) => {
									const config =
										pathConfigs[path.pathType as keyof typeof pathConfigs];
									const isSelected = selectedPathType === path.pathType;

									if (!config) return null;

									return (
										<button
											className={`w-full rounded-lg border-2 p-4 text-left ${getColorClasses(config.color, isSelected)}`}
											key={path.pathType}
											onClick={() => setSelectedPathType(path.pathType)}
											type="button"
										>
											<div className="flex items-start gap-4">
												{/* Enhanced Icon with color-coded background */}
												<div
													className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm ${getIconBackgroundClass(config.color, isSelected)}`}
												>
													{config.icon}
												</div>

												{/* Content */}
												<div className="flex-1">
													<div className="mb-3 flex items-start justify-between">
														<div className="flex-1">
															<h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
																{config.title}
															</h3>
															{/* Enhanced confidence indicator */}
															<div className="mt-1 flex items-center gap-2">
																<div
																	className={`h-2 w-16 rounded-full bg-slate-200 dark:bg-slate-600`}
																>
																	<div
																		className={`h-full rounded-full ${getConfidenceBarColor(config.color)}`}
																		style={{
																			width: `${Math.round(path.confidence * 100)}%`,
																		}}
																	/>
																</div>
																<span className="text-slate-600 text-xs dark:text-slate-400">
																	{Math.round(path.confidence * 100)}%{" "}
																	{t(
																		"knowledge.paths.confidence",
																		"confidence",
																	)}
																</span>
															</div>
														</div>
														<div className="ml-4 text-right">
															<div className="font-medium text-slate-900 text-sm dark:text-slate-100">
																~{path.estimatedTime}{" "}
																{t("knowledge.paths.minutes", "min")}
															</div>
															<div className="text-slate-500 text-xs dark:text-slate-400">
																{path.path.length}{" "}
																{path.path.length === 1 ? "card" : "cards"}
															</div>
														</div>
													</div>

													<p className="mb-3 text-slate-600 text-sm dark:text-slate-400">
														{path.description}
													</p>

													{/* Preview of first few cards */}
													<div className="flex flex-wrap gap-2">
														{path.path.slice(0, 3).map((step, index) => (
															<div
																className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs dark:bg-slate-700"
																key={`${step.cardId}-${index}`}
															>
																<span className="font-medium text-slate-500 dark:text-slate-400">
																	{index + 1}.
																</span>
																<span className="text-slate-700 dark:text-slate-300">
																	{step.front.length > 15
																		? `${step.front.substring(0, 15)}...`
																		: step.front}
																</span>
															</div>
														))}
														{path.path.length > 3 && (
															<div className="flex items-center px-2 py-1 text-slate-500 text-xs dark:text-slate-400">
																+{path.path.length - 3}{" "}
																{t("knowledge.paths.more", "more")}
															</div>
														)}
													</div>
												</div>
											</div>
										</button>
									);
								})}
							</div>

							{/* No paths available */}
							{availablePaths.length === 0 && (
								<div className="py-12 text-center">
									<div className="mb-4 text-6xl">🛤️</div>
									<h3 className="mb-2 font-semibold text-lg text-slate-900 dark:text-slate-100">
										{t(
											"pathSelection.noPaths.title",
											"No Learning Paths Available",
										)}
									</h3>
									<p className="text-slate-600 dark:text-slate-400">
										{t(
											"pathSelection.noPaths.description",
											"Add more cards to this deck to generate personalized learning paths.",
										)}
									</p>
								</div>
							)}
						</>
					) : (
						/* Customization Panel */
						<PathCustomizationPanel
							onOptionsChange={setCustomizationOptions}
							pathType={selectedPathType || ""}
						/>
					)}
				</div>

				{/* Footer */}
				<div className="sticky bottom-0 border-slate-200 border-t bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
					<div className="flex justify-end gap-3">
						{showCustomization && (
							<button
								className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
								onClick={handleCustomizationBack}
								type="button"
							>
								{t("common.back", "Back")}
							</button>
						)}
						<button
							className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
							onClick={showCustomization ? onClose : onClose}
							type="button"
						>
							{t("common.cancel", "Cancel")}
						</button>
						<button
							className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
							disabled={!selectedPathType || availablePaths.length === 0}
							onClick={
								showCustomization
									? handleCustomizationComplete
									: handleSelectPath
							}
							type="button"
						>
							{showCustomization
								? t("pathSelection.startPath", "Start Learning Path")
								: t("pathSelection.customize", "Customize & Start")}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
});

export default PathSelectionModal;
