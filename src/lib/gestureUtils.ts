/**
 * Gesture Utilities for Mobile Touch Interactions
 *
 * This module provides utilities for handling touch gestures in the flashcard
 * study interface, including swipe detection, haptic feedback, and visual feedback.
 */

import {
	SwipeableHandlers,
	SwipeEventData,
	useSwipeable,
} from "react-swipeable";

export interface GestureConfig {
	onSwipeLeft?: () => void;
	onSwipeRight?: () => void;
	onSwipeUp?: () => void;
	onSwipeDown?: () => void;
	threshold?: number;
	trackMouse?: boolean;
	trackTouch?: boolean;
	disabled?: boolean;
}

export type GestureHandlers = SwipeableHandlers;

/**
 * Custom hook for handling swipe gestures with enhanced functionality
 *
 * @param config - Configuration object for gesture handling
 * @returns Swipeable handlers to attach to DOM elements
 */
export function useGestures(config: GestureConfig): GestureHandlers {
	const {
		onSwipeLeft,
		onSwipeRight,
		onSwipeUp,
		onSwipeDown,
		threshold = 50,
		trackMouse = false,
		trackTouch = true,
		disabled = false,
	} = config;

	return useSwipeable({
		onSwipedLeft: (_eventData: SwipeEventData) => {
			if (disabled) return;

			// Provide haptic feedback if available
			triggerHapticFeedback("light");

			// Trigger visual feedback
			triggerVisualFeedback("left");

			onSwipeLeft?.();
		},
		onSwipedRight: (_eventData: SwipeEventData) => {
			if (disabled) return;

			// Provide haptic feedback if available
			triggerHapticFeedback("light");

			// Trigger visual feedback
			triggerVisualFeedback("right");

			onSwipeRight?.();
		},
		onSwipedUp: (_eventData: SwipeEventData) => {
			if (disabled) return;

			// Provide haptic feedback if available
			triggerHapticFeedback("light");

			// Trigger visual feedback
			triggerVisualFeedback("up");

			onSwipeUp?.();
		},
		onSwipedDown: (_eventData: SwipeEventData) => {
			if (disabled) return;

			// Provide haptic feedback if available
			triggerHapticFeedback("light");

			// Trigger visual feedback
			triggerVisualFeedback("down");

			onSwipeDown?.();
		},
		delta: threshold,
		trackMouse,
		trackTouch,
	});
}

/**
 * Trigger haptic feedback if available on the device
 *
 * @param type - Type of haptic feedback ('light', 'medium', 'heavy')
 */
export function triggerHapticFeedback(
	type: "light" | "medium" | "heavy" = "light",
): void {
	// Check if the device supports haptic feedback
	if ("vibrate" in navigator) {
		// Simple vibration patterns for different feedback types
		const patterns = {
			light: [10],
			medium: [20],
			heavy: [30],
		};

		navigator.vibrate(patterns[type]);
	}

	// For iOS devices with haptic feedback support
	if ("hapticFeedback" in window) {
		try {
			const hapticTypes = {
				light: "impactLight",
				medium: "impactMedium",
				heavy: "impactHeavy",
			};

			// @ts-expect-error - This is a non-standard API
			window.hapticFeedback?.[hapticTypes[type]]?.();
		} catch (error) {
			// Silently fail if haptic feedback is not available
			console.debug("Haptic feedback not available:", error);
		}
	}
}

/**
 * Trigger visual feedback for gesture recognition
 *
 * @param direction - Direction of the swipe gesture
 */
export function triggerVisualFeedback(
	direction: "left" | "right" | "up" | "down",
): void {
	// Create a temporary visual indicator
	const indicator = document.createElement("div");
	indicator.className = "gesture-feedback";
	indicator.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 9999;
    background: rgba(59, 130, 246, 0.8);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  `;

	// Set the content based on direction
	const messages = {
		left: "← Flip Card",
		right: "→ Next Card",
		up: "↑ Swipe Up",
		down: "↓ Swipe Down",
	};

	indicator.textContent = messages[direction];

	// Add to DOM
	document.body.appendChild(indicator);

	// Animate in
	requestAnimationFrame(() => {
		indicator.style.opacity = "1";
	});

	// Remove after animation
	setTimeout(() => {
		indicator.style.opacity = "0";
		setTimeout(() => {
			if (indicator.parentNode) {
				indicator.parentNode.removeChild(indicator);
			}
		}, 200);
	}, 800);
}

/**
 * Check if the current device likely supports touch gestures
 *
 * @returns True if touch gestures are likely supported
 */
export function isTouchDevice(): boolean {
	return (
		"ontouchstart" in window ||
		navigator.maxTouchPoints > 0 ||
		// @ts-expect-error - Legacy property
		navigator.msMaxTouchPoints > 0
	);
}

/**
 * Check if the user prefers reduced motion
 *
 * @returns True if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Enhanced gesture configuration for flashcard study modes
 */
export interface FlashcardGestureConfig {
	onFlipCard?: () => void;
	onNextCard?: () => void;
	onRateEasy?: () => void;
	onRateHard?: () => void;
	disabled?: boolean;
	studyMode?: "basic" | "spaced-repetition";
}

/**
 * Specialized hook for flashcard gesture handling
 *
 * @param config - Flashcard-specific gesture configuration
 * @returns Gesture handlers optimized for flashcard interactions
 */
export function useFlashcardGestures(
	config: FlashcardGestureConfig,
): GestureHandlers {
	const {
		onFlipCard,
		onNextCard,
		onRateEasy,
		onRateHard,
		disabled = false,
		studyMode = "basic",
	} = config;

	return useGestures({
		onSwipeLeft: onFlipCard,
		onSwipeRight: studyMode === "basic" ? onNextCard : onRateEasy,
		onSwipeUp: studyMode === "spaced-repetition" ? onRateEasy : undefined,
		onSwipeDown: studyMode === "spaced-repetition" ? onRateHard : undefined,
		threshold: 60, // Slightly higher threshold for flashcards to prevent accidental swipes
		trackMouse: false, // Only track touch for mobile gestures
		trackTouch: true,
		disabled,
	});
}

/**
 * Add CSS for gesture feedback animations
 * This should be called once during app initialization
 */
export function initializeGestureStyles(): void {
	// Check if styles are already added
	if (document.getElementById("gesture-styles")) {
		return;
	}

	const style = document.createElement("style");
	style.id = "gesture-styles";
	style.textContent = `
    @media (prefers-reduced-motion: no-preference) {
      .gesture-feedback {
        animation: gesturePopIn 0.8s ease-out;
      }
      
      @keyframes gesturePopIn {
        0% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.8);
        }
        20% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1.1);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .gesture-feedback {
        animation: none;
        transition: opacity 0.2s ease-in-out;
      }
    }
  `;

	document.head.appendChild(style);
}

export default useGestures;
