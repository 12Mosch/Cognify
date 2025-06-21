import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
	useFocusManagement,
	useModalEffects,
} from "../hooks/useFocusManagement";
import { useAnalytics } from "../lib/analytics";
import {
	useErrorMonitoring,
	withFormErrorMonitoring,
} from "../lib/errorMonitoring";
import { showErrorToast } from "../lib/toast";

interface QuickAddCardFormProps {
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function QuickAddCardForm({
	onSuccess,
	onCancel,
}: QuickAddCardFormProps) {
	const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(
		null,
	);
	const [front, setFront] = useState("");
	const [back, setBack] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [submissionAttempt, setSubmissionAttempt] = useState(0);

	const { t } = useTranslation();
	const { user } = useUser();
	const posthog = usePostHog();
	const decks = useQuery(api.decks.getDecksForUser);
	const addCard = useMutation(api.cards.addCardToDeck);
	const { trackCardCreated } = useAnalytics();
	const { captureError, trackConvexMutation, trackConvexQuery } =
		useErrorMonitoring();

	// Form error monitoring
	const formErrorMonitor = withFormErrorMonitoring("quick_add_card", posthog);

	// Focus management hooks
	const { storeTriggerElement, restoreFocus } = useFocusManagement(showForm);
	const firstSelectRef = useRef<HTMLSelectElement>(null);
	useModalEffects(showForm, handleCancel);

	// Track query errors if they occur
	useEffect(() => {
		if (decks === null) {
			// Query failed - track the error
			const queryError = new Error(
				"Failed to load user decks for card creation",
			);
			trackConvexQuery("getDecksForUser", queryError, {
				userId: user?.id,
			});
		}
	}, [decks, trackConvexQuery, user?.id]);

	// Focus first select when form opens
	useEffect(() => {
		if (showForm && firstSelectRef.current) {
			setTimeout(() => {
				firstSelectRef.current?.focus();
			}, 10);
		}
	}, [showForm]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const currentAttempt = submissionAttempt + 1;
		setSubmissionAttempt(currentAttempt);

		// Client-side validation with error tracking
		const validationErrors: Record<string, string[]> = {};

		if (!selectedDeckId) {
			validationErrors.deckId = [t("forms.validation.selectDeckRequired")];
		}

		if (!front.trim()) {
			validationErrors.front = [t("forms.validation.frontRequired")];
		}

		if (!back.trim()) {
			validationErrors.back = [t("forms.validation.backRequired")];
		}

		if (front.length > 1000) {
			validationErrors.front = [
				...(validationErrors.front || []),
				t("forms.validation.maxLength", {
					field: t("forms.quickAddCard.front"),
					max: 1000,
				}),
			];
		}

		if (back.length > 1000) {
			validationErrors.back = [
				...(validationErrors.back || []),
				t("forms.validation.maxLength", {
					field: t("forms.quickAddCard.back"),
					max: 1000,
				}),
			];
		}

		// Track validation errors if any
		if (Object.keys(validationErrors).length > 0) {
			const firstError = Object.values(validationErrors)[0][0];
			setError(firstError);

			formErrorMonitor.trackValidationErrors(validationErrors, {
				userId: user?.id,
				formData: {
					selectedDeckId,
					frontLength: front.length,
					backLength: back.length,
				},
				attemptNumber: currentAttempt,
			});

			return;
		}

		setIsSubmitting(true);

		const submitCard = async () => {
			let shouldCloseForms = false;

			try {
				const cardId = await formErrorMonitor.wrapSubmission(
					async (formData) => {
						try {
							return await addCard({
								deckId: formData.selectedDeckId as Id<"decks">,
								front: formData.front.trim(),
								back: formData.back.trim(),
							});
						} catch (error) {
							// Track Convex mutation errors
							trackConvexMutation("addCardToDeck", error as Error, {
								userId: user?.id,
								deckId: formData.selectedDeckId as string,
								mutationArgs: {
									deckId: formData.selectedDeckId,
									front: formData.front.trim(),
									back: formData.back.trim(),
								},
							});
							throw error;
						}
					},
					{ selectedDeckId: selectedDeckId!, front, back },
					{
						userId: user?.id,
						submissionAttempt: currentAttempt,
					},
				);

				// Track card creation event
				const selectedDeck = decks?.find((deck) => deck._id === selectedDeckId);
				trackCardCreated(cardId as string, selectedDeck?.name);

				// Reset form
				setSelectedDeckId(null);
				setFront("");
				setBack("");
				setError(null);
				setSubmissionAttempt(0);
				shouldCloseForms = true;

				// Call success callback
				onSuccess?.();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t("errors.generic");
				setError(errorMessage);

				// Capture general form submission error
				captureError(err as Error, {
					userId: user?.id,
					deckId: selectedDeckId as string,
					component: "QuickAddCardForm",
					action: "submit_form",
					severity: "medium",
					category: "ui_error",
					tags: {
						formName: "quick_add_card",
						submissionAttempt: String(currentAttempt),
					},
					additionalData: {
						formData: {
							selectedDeckId: selectedDeckId as string,
							frontLength: front.length,
							backLength: back.length,
						}, // Don't log actual content for privacy
					},
				});

				// Show error toast for all failures
				// Let the user see the specific error in the inline error display
				showErrorToast(t("errors.generic"));
			} finally {
				setIsSubmitting(false);

				// Close form and restore focus only on success
				if (shouldCloseForms) {
					setShowForm(false);
					restoreFocus();
				}
			}
		};

		void submitCard();
	};

	function handleCancel() {
		setSelectedDeckId(null);
		setFront("");
		setBack("");
		setError(null);
		setShowForm(false);
		restoreFocus();
		onCancel?.();
	}

	// Don't show button if no decks exist
	if (decks === undefined) {
		return null; // Loading
	}

	if (decks.length === 0) {
		return null; // No decks to add cards to
	}

	if (!showForm) {
		return (
			<button
				onClick={() => {
					storeTriggerElement();
					setShowForm(true);
				}}
				className="rounded-lg border-2 border-slate-400 px-6 py-3 font-semibold text-slate-700 transition-all duration-200 hover:border-slate-600 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-500 dark:text-slate-300 dark:focus:ring-slate-500 dark:focus:ring-offset-slate-900 dark:hover:border-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
				aria-label={t("forms.quickAddCard.buttonLabel")}
			>
				+ {t("forms.quickAddCard.add")}
			</button>
		);
	}

	return (
		<>
			{/* Modal Overlay */}
			<div
				className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4"
				onClick={handleCancel}
				aria-hidden="true"
			/>

			{/* Modal Content */}
			<div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
				<FocusLock>
					<div
						className="pointer-events-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-slate-200 bg-slate-100 p-6 dark:border-slate-700 dark:bg-slate-800"
						role="dialog"
						aria-modal="true"
						aria-labelledby="quick-add-card-title"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 id="quick-add-card-title" className="mb-4 font-bold text-lg">
							{t("forms.quickAddCard.title")}
						</h3>

						<form onSubmit={handleSubmit} className="space-y-4">
							{/* Deck Selection */}
							<div>
								<label
									htmlFor="deck-select"
									className="mb-2 block font-medium text-sm"
								>
									{t("forms.quickAddCard.selectDeck")} *
								</label>
								<select
									ref={firstSelectRef}
									id="deck-select"
									value={selectedDeckId || ""}
									onChange={(e) =>
										setSelectedDeckId(
											e.target.value ? (e.target.value as Id<"decks">) : null,
										)
									}
									className="w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
									required
									aria-describedby={error ? "form-error" : undefined}
								>
									<option value="">
										{t("forms.quickAddCard.selectDeckPlaceholder")}
									</option>
									{decks.map((deck) => (
										<option key={deck._id} value={deck._id}>
											{deck.name}
										</option>
									))}
								</select>
							</div>

							{/* Card Front */}
							<div>
								<label
									htmlFor="card-front"
									className="mb-2 block font-medium text-sm"
								>
									{t("forms.quickAddCard.front")} *
								</label>
								<textarea
									id="card-front"
									value={front}
									onChange={(e) => setFront(e.target.value)}
									placeholder={t("forms.quickAddCard.frontPlaceholder")}
									className="w-full resize-none rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
									rows={3}
									maxLength={1000}
									required
									aria-describedby={error ? "form-error" : undefined}
								/>
								<div className="mt-1 text-slate-500 text-xs">
									{t("forms.quickAddCard.characterCount", {
										current: front.length,
										max: 1000,
									})}
								</div>
							</div>

							{/* Card Back */}
							<div>
								<label
									htmlFor="card-back"
									className="mb-2 block font-medium text-sm"
								>
									{t("forms.quickAddCard.back")} *
								</label>
								<textarea
									id="card-back"
									value={back}
									onChange={(e) => setBack(e.target.value)}
									placeholder={t("forms.quickAddCard.backPlaceholder")}
									className="w-full resize-none rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
									rows={3}
									maxLength={1000}
									required
									aria-describedby={error ? "form-error" : undefined}
								/>
								<div className="mt-1 text-slate-500 text-xs">
									{t("forms.quickAddCard.characterCount", {
										current: back.length,
										max: 1000,
									})}
								</div>
							</div>

							{error && (
								<div
									id="form-error"
									className="rounded-md border border-red-200 bg-red-50 p-3 text-red-600 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
									role="alert"
									aria-live="polite"
								>
									{error}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<button
									type="submit"
									disabled={
										isSubmitting ||
										!selectedDeckId ||
										!front.trim() ||
										!back.trim()
									}
									className="rounded-md border-2 bg-dark px-4 py-2 font-medium text-light text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-light dark:text-dark"
								>
									{isSubmitting
										? t("forms.quickAddCard.adding")
										: t("forms.quickAddCard.add")}
								</button>
								<button
									type="button"
									onClick={handleCancel}
									className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
								>
									{t("forms.quickAddCard.cancel")}
								</button>
							</div>
						</form>
					</div>
				</FocusLock>
			</div>
		</>
	);
}
