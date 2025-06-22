import { useEffect, useState } from "react";
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
			description: "Learn how to navigate flashcards with simple gestures.",
			gesture: "👋",
			instruction: "Swipe gestures make studying faster and more intuitive.",
			title: "Welcome to Touch Controls!",
		},
		{
			description:
				"Swipe left or tap anywhere to flip the card and see the answer.",
			gesture: "👈",
			instruction: "Try swiping left on any flashcard to reveal the answer.",
			title: "Flip Cards",
		},
		{
			description: "Swipe right to move to the next card in your deck.",
			gesture: "👉",
			instruction: "Swipe right when you're ready for the next question.",
			title: "Next Card",
		},
	];

	const spacedRepetitionSteps = [
		{
			description: "Learn gesture controls for spaced repetition study mode.",
			gesture: "🧠",
			instruction:
				"Gestures help you rate cards quickly during study sessions.",
			title: "Welcome to Smart Study!",
		},
		{
			description: "Swipe left or tap to reveal the answer.",
			gesture: "👈",
			instruction: "Swipe left to see the answer and rate your knowledge.",
			title: "Flip Cards",
		},
		{
			description: "Swipe right when you knew the answer perfectly.",
			gesture: "👉",
			instruction: 'Right swipe = "Easy" - you knew this perfectly!',
			title: "Rate Easy",
		},
		{
			description: "Swipe down when you didn't know the answer.",
			gesture: "👇",
			instruction: 'Down swipe = "Again" - study this card more.',
			title: "Rate Again",
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
							Skip Tutorial
						</button>

						<div className="flex space-x-3">
							{currentStep > 0 && (
								<button
									className="px-4 py-2 text-slate-600 text-sm transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
									onClick={handlePrevious}
									type="button"
								>
									Previous
								</button>
							)}

							<button
								className="rounded-md bg-blue-500 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-600"
								onClick={handleNext}
								type="button"
							>
								{currentStep === steps.length - 1 ? "Get Started!" : "Next"}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default GestureTutorial;
