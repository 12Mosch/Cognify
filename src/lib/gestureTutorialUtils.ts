import { useState } from "react";
import { isTouchDevice } from "./gestureUtils";

/**
 * Hook to check if gesture tutorial should be shown
 *
 * @param studyMode - The current study mode
 * @returns Object with shouldShow boolean and showTutorial function
 */
export function useGestureTutorial(studyMode: "basic" | "spaced-repetition") {
	const [showTutorial, setShowTutorial] = useState(false);

	// Check if tutorial has been completed
	const hasCompletedTutorial = () => {
		return (
			localStorage.getItem(`gesture-tutorial-completed-${studyMode}`) === "true"
		);
	};

	// Show tutorial if on touch device and hasn't been completed
	const shouldShowTutorial = isTouchDevice() && !hasCompletedTutorial();

	const triggerTutorial = () => {
		if (isTouchDevice()) {
			setShowTutorial(true);
		}
	};

	const closeTutorial = () => {
		setShowTutorial(false);
	};

	return {
		closeTutorial,
		isOpen: showTutorial,
		shouldShow: shouldShowTutorial,
		showTutorial: triggerTutorial,
	};
}

/**
 * Reset tutorial completion status (useful for testing or settings)
 */
export function resetGestureTutorial(
	studyMode?: "basic" | "spaced-repetition",
) {
	if (studyMode) {
		localStorage.removeItem(`gesture-tutorial-completed-${studyMode}`);
	} else {
		localStorage.removeItem("gesture-tutorial-completed-basic");
		localStorage.removeItem("gesture-tutorial-completed-spaced-repetition");
	}
}
