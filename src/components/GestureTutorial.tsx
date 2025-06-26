import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { isTouchDevice } from "../lib/gestureUtils";

interface GestureTutorialProps {
	isOpen: boolean;
	onClose: () => void;
	studyMode: "basic" | "spaced-repetition";
}

/**
 * GestureTutorial Component - Interactive tutorial for mobile gesture controls
 *
 * Shows users how to use swipe gestures for flashcard navigation and rating.
 * Only displays on touch devices and can be dismissed permanently.
 */
export function GestureTutorial({
	isOpen,
	onClose,
	studyMode,
}: GestureTutorialProps) {
	const [currentStep, setCurrentStep] = useState(0);
	const { t } = useTranslation();

	// Reset step when modal opens
	useEffect(() => {
		if (isOpen) {
			setCurrentStep(0);
		}
	}, [isOpen]);

	// Don't show tutorial on non-touch devices
	if (!isTouchDevice() || !isOpen) {
		return null;
	}

	const basicModeSteps = [
		{
			description: t(
				"components.gestureTutorial.basicMode.welcome.description",
			),
			gesture: "👋",
			instruction: t(
				"components.gestureTutorial.basicMode.welcome.instruction",
			),
			title: t("components.gestureTutorial.basicMode.welcome.title"),
		},
		{
			description: t(
				"components.gestureTutorial.basicMode.flipCards.description",
			),
			gesture: "👈",
			instruction: t(
				"components.gestureTutorial.basicMode.flipCards.instruction",
			),
			title: t("components.gestureTutorial.basicMode.flipCards.title"),
		},
		{
			description: t(
				"components.gestureTutorial.basicMode.nextCard.description",
			),
			gesture: "👉",
			instruction: t(
				"components.gestureTutorial.basicMode.nextCard.instruction",
			),
			title: t("components.gestureTutorial.basicMode.nextCard.title"),
		},
	];

	const spacedRepetitionSteps = [
		{
			description: t(
				"components.gestureTutorial.spacedRepetition.welcome.description",
			),
			gesture: "🧠",
			instruction: t(
				"components.gestureTutorial.spacedRepetition.welcome.instruction",
			),
			title: t("components.gestureTutorial.spacedRepetition.welcome.title"),
		},
		{
			description: t(
				"components.gestureTutorial.spacedRepetition.flipCards.description",
			),
			gesture: "👈",
			instruction: t(
				"components.gestureTutorial.spacedRepetition.flipCards.instruction",
			),
			title: t("components.gestureTutorial.spacedRepetition.flipCards.title"),
		},
		{
			description: t(
				"components.gestureTutorial.spacedRepetition.rateEasy.description",
			),
			gesture: "👉",
			instruction: t(
				"components.gestureTutorial.spacedRepetition.rateEasy.instruction",
			),
			title: t("components.gestureTutorial.spacedRepetition.rateEasy.title"),
		},
		{
			description: t(
				"components.gestureTutorial.spacedRepetition.rateAgain.description",
			),
			gesture: "👇",
			instruction: t(
				"components.gestureTutorial.spacedRepetition.rateAgain.instruction",
			),
			title: t("components.gestureTutorial.spacedRepetition.rateAgain.title"),
		},
	];

	const steps = studyMode === "basic" ? basicModeSteps : spacedRepetitionSteps;
	const currentStepData = steps[currentStep];

	const handleNext = () => {
		if (currentStep < steps.length - 1) {
			setCurrentStep(currentStep + 1);
		} else {
			handleFinish();
		}
	};

	const handlePrevious = () => {
		if (currentStep > 0) {
			setCurrentStep(currentStep - 1);
		}
	};

	const handleFinish = () => {
		// Mark tutorial as completed in localStorage
		localStorage.setItem(`gesture-tutorial-completed-${studyMode}`, "true");
		onClose();
	};

	const handleSkip = () => {
		handleFinish();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div className="mx-4 w-full max-w-md overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-800">
				{/* Header */}
				<div className="bg-blue-500 p-6 text-center text-white dark:bg-blue-600">
					<div className="mb-2 text-4xl">{currentStepData.gesture}</div>
					<h2 className="font-bold text-xl">{currentStepData.title}</h2>
					<p className="mt-2 text-blue-100">{currentStepData.description}</p>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="mb-6 text-center">
						<p className="text-lg text-slate-700 leading-relaxed dark:text-slate-300">
							{currentStepData.instruction}
						</p>
					</div>

					{/* Progress indicator */}
					<div className="mb-6 flex justify-center">
						<div className="flex space-x-2">
							{steps.map((step, index) => (
								<div
									className={`h-2 w-2 rounded-full transition-colors ${
										index === currentStep
											? "bg-blue-500"
											: index < currentStep
												? "bg-blue-300"
												: "bg-slate-300 dark:bg-slate-600"
									}`}
									key={`step-${index}-${step.title}`}
								/>
							))}
						</div>
					</div>

					{/* Navigation buttons */}
					<div className="flex items-center justify-between">
						<button
							className="text-slate-500 text-sm transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
							onClick={handleSkip}
							type="button"
						>
							{t("components.gestureTutorial.buttons.skipTutorial")}
						</button>

						<div className="flex space-x-3">
							{currentStep > 0 && (
								<button
									className="px-4 py-2 text-slate-600 text-sm transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
									onClick={handlePrevious}
									type="button"
								>
									{t("components.gestureTutorial.buttons.previous")}
								</button>
							)}

							<button
								className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
								onClick={handleNext}
								type="button"
							>
								{currentStep === steps.length - 1
									? t("components.gestureTutorial.buttons.gotIt")
									: t("components.gestureTutorial.buttons.next")}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default GestureTutorial;
