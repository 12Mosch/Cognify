import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useEffect, useId, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	useFocusManagement,
	useModalEffects,
} from "../hooks/useFocusManagement";
import { useAnalytics } from "../lib/analytics";
import { useErrorMonitoring } from "../lib/errorMonitoring";
import { showErrorToast, showSuccessToast } from "../lib/toast";

interface DeleteDeckConfirmationModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm?: () => void;
	deck: {
		_id: Id<"decks">;
		name: string;
		cardCount: number;
	};
}

export function DeleteDeckConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	deck,
}: DeleteDeckConfirmationModalProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const { t } = useTranslation();
	const { user } = useUser();
	const deleteDeck = useMutation(api.decks.deleteDeck);
	const { trackConvexMutation } = useErrorMonitoring();
	const { trackDeckDeleted } = useAnalytics();

	// Generate unique IDs for accessibility
	const titleId = useId();
	const descriptionId = useId();

	// Focus management hooks
	const { restoreFocus } = useFocusManagement(isOpen);
	const cancelButtonRef = useRef<HTMLButtonElement>(null);
	useModalEffects(isOpen, handleCancel);

	// Focus cancel button when modal opens (safer default than delete button)
	useEffect(() => {
		if (isOpen && cancelButtonRef.current) {
			setTimeout(() => {
				cancelButtonRef.current?.focus();
			}, 10);
		}
	}, [isOpen]);

	const handleDelete = async () => {
		if (isDeleting) return;

		// Basic validation
		if (!deck._id) {
			showErrorToast(t("errors.generic"));
			return;
		}

		setIsDeleting(true);

		try {
			await deleteDeck({ deckId: deck._id });

			// Track successful deletion
			trackDeckDeleted(deck._id, deck.name, deck.cardCount);

			// Show success notification
			showSuccessToast(
				t("notifications.deckDeletedWithName", { deckName: deck.name }),
			);

			// Close modal and call onConfirm callback
			handleCancel();
			onConfirm?.();
		} catch (error) {
			console.error("Failed to delete deck:", error);

			// Track the deletion error
			trackConvexMutation("deleteDeck", error as Error, {
				deckId: deck._id,
				mutationArgs: { deckId: deck._id },
				userId: user?.id,
			});

			// Show appropriate error message based on error type
			const errorMessage =
				error instanceof Error && error.message.includes("network")
					? t("notifications.networkError")
					: t("errors.generic");

			showErrorToast(errorMessage);
		} finally {
			setIsDeleting(false);
		}
	};

	function handleCancel() {
		if (isDeleting) return; // Prevent closing while deleting
		onClose();
		restoreFocus();
	}

	if (!isOpen) return null;

	return (
		<>
			{/* Modal Overlay */}
			<div
				aria-hidden="true"
				className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4"
				onClick={handleCancel}
			/>

			{/* Modal Content */}
			<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
				<FocusLock>
					<div
						aria-describedby={descriptionId}
						aria-labelledby={titleId}
						aria-modal="true"
						className={`pointer-events-auto w-full max-w-md rounded-lg border-2 border-slate-200 bg-light p-6 dark:border-slate-700 dark:bg-dark ${
							isDeleting ? "opacity-75" : ""
						}`}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Escape" && !isDeleting) {
								handleCancel();
							}
						}}
						role="dialog"
					>
						{/* Warning Icon */}
						<div className="mb-4 flex justify-center">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
								<svg
									aria-hidden="true"
									className="h-6 w-6 text-red-600 dark:text-red-400"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
								>
									<path
										d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						</div>

						{/* Title */}
						<h3 className="mb-4 text-center font-semibold text-lg" id={titleId}>
							{t("deckView.deleteDeck")}?
						</h3>

						{/* Description */}
						<p
							className="mb-6 text-center text-slate-600 dark:text-slate-400"
							id={descriptionId}
						>
							{t("deckView.confirmDeleteDeck", {
								cardCount: deck.cardCount,
							})}
						</p>

						{/* Deck Info */}
						<div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
							<p className="font-medium text-slate-900 dark:text-slate-100">
								{deck.name}
							</p>
							<p className="text-slate-600 text-sm dark:text-slate-400">
								{t("deck.cardCount", { count: deck.cardCount })}
							</p>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-3">
							<button
								className="flex-1 rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
								disabled={isDeleting}
								onClick={handleCancel}
								ref={cancelButtonRef}
								type="button"
							>
								{t("common.cancel")}
							</button>
							<button
								className="flex-1 rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm text-white transition-opacity hover:opacity-80 disabled:opacity-50"
								disabled={isDeleting}
								onClick={() => void handleDelete()}
								type="button"
							>
								{isDeleting ? t("common.loading") : t("common.delete")}
							</button>
						</div>
					</div>
				</FocusLock>
			</div>
		</>
	);
}
