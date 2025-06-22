import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for managing focus in modal dialogs and forms
 * Provides consistent focus management across the application
 */
export function useFocusManagement(isOpen: boolean) {
	const triggerElementRef = useRef<HTMLElement | null>(null);
	const firstFocusableElementRef = useRef<HTMLElement | null>(null);

	/**
	 * Store reference to the element that triggered the modal
	 * Call this before opening the modal
	 */
	const storeTriggerElement = useCallback(() => {
		triggerElementRef.current = document.activeElement as HTMLElement;
	}, []);

	/**
	 * Restore focus to the triggering element
	 * Call this when closing the modal
	 */
	const restoreFocus = useCallback(() => {
		if (
			triggerElementRef.current &&
			typeof triggerElementRef.current.focus === "function"
		) {
			// Small delay to ensure modal is fully closed before restoring focus
			setTimeout(() => {
				triggerElementRef.current?.focus();
			}, 10);
		}
	}, []);

	/**
	 * Set focus to the first focusable element in the modal
	 * Call this when the modal opens
	 */
	const focusFirstElement = useCallback(() => {
		if (firstFocusableElementRef.current) {
			// Small delay to ensure modal is fully rendered
			setTimeout(() => {
				firstFocusableElementRef.current?.focus();
			}, 10);
		}
	}, []);

	/**
	 * Auto-focus first element when modal opens
	 */
	useEffect(() => {
		if (isOpen) {
			focusFirstElement();
		}
	}, [isOpen, focusFirstElement]);

	return {
		firstFocusableElementRef,
		focusFirstElement,
		restoreFocus,
		storeTriggerElement,
	};
}

/**
 * Hook for managing focus trap and body scroll lock in modals
 */
export function useModalEffects(isOpen: boolean, onClose: () => void) {
	useEffect(() => {
		if (!isOpen) return;

		// Prevent body scroll when modal is open
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		// Handle ESC key
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);

		return () => {
			// Restore body scroll
			document.body.style.overflow = originalOverflow;
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isOpen, onClose]);
}
