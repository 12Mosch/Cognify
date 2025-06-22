import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { useEffect, useId, useRef, useState } from "react";
import FocusLock from "react-focus-lock";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
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

interface CreateDeckFormProps {
	onSuccess?: (deckName?: string) => void;
	onCancel?: () => void;
}

export function CreateDeckForm({ onSuccess, onCancel }: CreateDeckFormProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [submissionAttempt, setSubmissionAttempt] = useState(0);

	const { t } = useTranslation();
	const { user } = useUser();
	const posthog = usePostHog();
	const createDeck = useMutation(api.decks.createDeck);
	const { trackDeckCreated } = useAnalytics();
	const { captureError, trackConvexMutation } = useErrorMonitoring();

	// Generate unique IDs for form elements
	const titleId = useId();
	const nameId = useId();
	const descriptionId = useId();
	const errorId = useId();

	// Form error monitoring
	const formErrorMonitor = withFormErrorMonitoring("create_deck", posthog);

	// Focus management hooks
	const { storeTriggerElement, restoreFocus } = useFocusManagement(showForm);
	const firstInputRef = useRef<HTMLInputElement>(null);
	useModalEffects(showForm, handleCancel);

	// Focus first input when form opens
	useEffect(() => {
		if (showForm && firstInputRef.current) {
			setTimeout(() => {
				firstInputRef.current?.focus();
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

		if (!name.trim()) {
			validationErrors.name = [t("forms.validation.deckNameRequired")];
		}

		if (name.length > 100) {
			validationErrors.name = [
				...(validationErrors.name || []),
				t("forms.validation.maxLength", {
					field: t("forms.createDeck.name"),
					max: 100,
				}),
			];
		}

		if (description.length > 500) {
			validationErrors.description = [
				t("forms.validation.maxLength", {
					field: t("forms.createDeck.description"),
					max: 500,
				}),
			];
		}

		// Track validation errors if any
		if (Object.keys(validationErrors).length > 0) {
			const firstError = Object.values(validationErrors)[0][0];
			setError(firstError);

			formErrorMonitor.trackValidationErrors(validationErrors, {
				attemptNumber: currentAttempt,
				formData: {
					descriptionLength: description.length,
					nameLength: name.length,
				},
				userId: user?.id,
			});

			return;
		}

		setIsSubmitting(true);
		const startTime = Date.now();

		// Handle async operations without making the handler async
		const submitDeck = async () => {
			try {
				const deckId = await formErrorMonitor.wrapSubmission(
					async (formData) => {
						try {
							return await createDeck({
								description: formData.description.trim(),
								name: formData.name.trim(),
							});
						} catch (error) {
							// Track Convex mutation errors
							trackConvexMutation("createDeck", error as Error, {
								mutationArgs: {
									descriptionLength: formData.description.trim().length,
									nameLength: formData.name.trim().length,
								},
								userId: user?.id,
							});
							throw error;
						}
					},
					{ description, name },
					{
						submissionAttempt: currentAttempt,
						userId: user?.id,
					},
				);

				// Track deck creation event
				trackDeckCreated(deckId as string, name.trim());

				// Store deck name for success callback before resetting form
				const deckName = name.trim();

				// Reset form
				setName("");
				setDescription("");
				setShowForm(false);
				setError(null);
				setSubmissionAttempt(0);

				// Restore focus to trigger element
				restoreFocus();

				// Call success callback with deck name
				onSuccess?.(deckName);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Failed to create deck";
				setError(errorMessage);

				// Capture general form submission error
				captureError(err as Error, {
					action: "submit_form",
					additionalData: {
						formData: { description: description.length, name: name.length }, // Don't log actual content for privacy
						timeToSubmit: Date.now() - startTime,
					},
					category: "ui_error",
					component: "CreateDeckForm",
					severity: "medium",
					tags: {
						formName: "create_deck",
						submissionAttempt: String(currentAttempt),
					},
					userId: user?.id,
				});

				// Show error toast for all failures
				// Let the user see the specific error in the inline error display
				showErrorToast("errors.generic");
			} finally {
				setIsSubmitting(false);
			}
		};

		// Execute the async function and handle any unhandled promise rejections
		void submitDeck();
	};

	function handleCancel() {
		setName("");
		setDescription("");
		setError(null);
		setShowForm(false);
		restoreFocus();
		onCancel?.();
	}

	if (!showForm) {
		return (
			<button
				aria-label={t("forms.createDeck.buttonLabel")}
				className="transform rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
				onClick={() => {
					storeTriggerElement();
					setShowForm(true);
				}}
				type="button"
			>
				+ {t("forms.createDeck.create")}
			</button>
		);
	}

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
						aria-labelledby={titleId}
						aria-modal="true"
						className="pointer-events-auto w-full max-w-md rounded-lg border-2 border-slate-200 bg-slate-100 p-6 dark:border-slate-700 dark:bg-slate-800"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === "Escape") {
								handleCancel();
							}
						}}
						role="dialog"
					>
						<h3 className="mb-4 font-bold text-lg" id={titleId}>
							{t("forms.createDeck.title")}
						</h3>

						<form className="space-y-4" onSubmit={handleSubmit}>
							<div>
								<label
									className="mb-2 block font-medium text-sm"
									htmlFor={nameId}
								>
									{t("forms.createDeck.name")} *
								</label>
								<input
									aria-describedby={error ? errorId : undefined}
									className="w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
									id={nameId}
									maxLength={100}
									onChange={(e) => setName(e.target.value)}
									placeholder={t("forms.createDeck.namePlaceholder")}
									ref={firstInputRef}
									required
									type="text"
									value={name}
								/>
								<div className="mt-1 text-slate-500 text-xs">
									{t("forms.createDeck.characterCount", {
										current: name.length,
										max: 100,
									})}
								</div>
							</div>

							<div>
								<label
									className="mb-2 block font-medium text-sm"
									htmlFor={descriptionId}
								>
									{t("forms.createDeck.description")}
								</label>
								<textarea
									aria-describedby={error ? errorId : undefined}
									className="resize-vertical w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
									id={descriptionId}
									maxLength={500}
									onChange={(e) => setDescription(e.target.value)}
									placeholder={t("forms.createDeck.descriptionPlaceholder")}
									rows={3}
									value={description}
								/>
								<div className="mt-1 text-slate-500 text-xs">
									{t("forms.createDeck.characterCount", {
										current: description.length,
										max: 500,
									})}
								</div>
							</div>

							{error && (
								<div
									aria-live="polite"
									className="rounded-md border border-red-200 bg-red-50 p-3 text-red-600 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
									id={errorId}
									role="alert"
								>
									{error}
								</div>
							)}

							<div className="flex gap-3 pt-2">
								<button
									aria-label={
										isSubmitting
											? t("forms.createDeck.creating")
											: t("forms.createDeck.create")
									}
									className="rounded-md border-2 bg-dark px-4 py-2 font-medium text-light text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-light dark:text-dark"
									disabled={isSubmitting || !name.trim()}
									type="submit"
								>
									{isSubmitting
										? t("forms.createDeck.creating")
										: t("forms.createDeck.create")}
								</button>

								<button
									aria-label={t("forms.createDeck.cancel")}
									className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
									disabled={isSubmitting}
									onClick={handleCancel}
									type="button"
								>
									{t("forms.createDeck.cancel")}
								</button>
							</div>
						</form>
					</div>
				</FocusLock>
			</div>
		</>
	);
}
