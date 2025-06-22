import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-js/react";
import { memo, useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import {
	useErrorMonitoring,
	withFormErrorMonitoring,
} from "../lib/errorMonitoring";
import { showErrorToast, showSuccessToast, toastHelpers } from "../lib/toast";
import { DifficultyIndicator } from "./DifficultyIndicator";
import { EditDeckForm } from "./EditDeckForm";
import { DeckViewSkeleton } from "./skeletons/SkeletonComponents";

interface DeckViewProps {
	deckId: Id<"decks">;
	onBack: () => void;
}

interface Card {
	_id: Id<"cards">;
	_creationTime: number;
	deckId: Id<"decks">;
	front: string;
	back: string;
	// Spaced repetition fields
	repetition?: number;
	easeFactor?: number;
	interval?: number;
	dueDate?: number;
}

function DeckView({ deckId, onBack }: DeckViewProps) {
	const [showAddForm, setShowAddForm] = useState(false);
	const [editingCard, setEditingCard] = useState<Card | null>(null);
	const [showEditDeckForm, setShowEditDeckForm] = useState(false);
	const [errorTracked, setErrorTracked] = useState<{
		deck?: boolean;
		cards?: boolean;
	}>({});

	const { t } = useTranslation();
	const { user } = useUser();
	const { trackConvexQuery } = useErrorMonitoring();

	const deck = useQuery(api.decks.getDeckById, { deckId });
	const cards = useQuery(api.cards.getCardsForDeck, { deckId });

	// Track deck loading errors (side effect)
	useEffect(() => {
		if (deck === null && !errorTracked.deck) {
			const deckError = new Error("Failed to load deck or access denied");
			trackConvexQuery("getDeckById", deckError, {
				deckId,
				userId: user?.id,
			});
			setErrorTracked((prev) => ({ ...prev, deck: true }));
		}
	}, [deck, errorTracked.deck, trackConvexQuery, user?.id, deckId]);

	// Track cards loading errors (side effect)
	useEffect(() => {
		if (cards === null && !errorTracked.cards) {
			const cardsError = new Error("Failed to load cards for deck");
			trackConvexQuery("getCardsForDeck", cardsError, {
				deckId,
				userId: user?.id,
			});
			setErrorTracked((prev) => ({ ...prev, cards: true }));
		}
	}, [cards, errorTracked.cards, trackConvexQuery, user?.id, deckId]);

	// Reset error tracking on component mount
	useEffect(() => {
		setErrorTracked({});
	}, []);

	// Success handler for deck editing
	const handleEditDeckSuccess = (deckName?: string) => {
		setShowEditDeckForm(false);
		toastHelpers.deckUpdated(deckName);
	};

	// Loading state
	if (deck === undefined || cards === undefined) {
		return <DeckViewSkeleton />;
	}

	// Deck not found
	if (!deck) {
		return (
			<div className="mx-auto flex max-w-6xl flex-col gap-8">
				<div className="flex items-center justify-center py-12">
					<div className="text-center">
						<h2 className="mb-4 font-bold text-2xl">
							{t("study.deckNotFound.title")}
						</h2>
						<p className="mb-6 text-slate-600 dark:text-slate-400">
							{t("study.deckNotFound.message")}
						</p>
						<button
							className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
							onClick={onBack}
							type="button"
						>
							{t("deckView.backToDashboard")}
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-8">
			{/* Header */}
			<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
				<div className="flex items-center gap-4">
					<button
						aria-label={t("deckView.backToDashboard")}
						className="text-slate-600 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
						onClick={onBack}
						type="button"
					>
						← {t("common.back")}
					</button>
					<div>
						<h1 className="font-bold text-3xl tracking-tight">{deck.name}</h1>
						<p className="mt-2 text-slate-600 leading-relaxed dark:text-slate-400">
							{deck.description || t("deck.noDescription")}
						</p>
						<p className="mt-2 font-medium text-slate-500 text-sm">
							{t("deck.cardCount", { count: cards.length })}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<button
						aria-label={t("deck.editDeckAria", { deckName: deck.name })}
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-3 font-medium text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						onClick={() => setShowEditDeckForm(true)}
						type="button"
					>
						{t("deckView.editDeck")}
					</button>
					<button
						className="rounded-md border-2 bg-dark px-6 py-3 font-medium text-light text-sm transition-opacity hover:opacity-80 dark:bg-light dark:text-dark"
						onClick={() => setShowAddForm(true)}
						type="button"
					>
						+ {t("deckView.addCard")}
					</button>
				</div>
			</div>

			{/* Add Card Form */}
			{showAddForm && (
				<AddCardForm
					deckId={deckId}
					onCancel={() => setShowAddForm(false)}
					onSuccess={() => {
						setShowAddForm(false);
						toastHelpers.cardCreated();
					}}
				/>
			)}

			{/* Edit Card Form */}
			{editingCard && (
				<EditCardForm
					card={editingCard}
					onCancel={() => setEditingCard(null)}
					onSuccess={() => {
						setEditingCard(null);
						toastHelpers.cardUpdated();
					}}
				/>
			)}

			{/* Edit Deck Form */}
			{showEditDeckForm && deck && (
				<EditDeckForm
					deck={deck}
					forceShowForm={true}
					onCancel={() => setShowEditDeckForm(false)}
					onSuccess={handleEditDeckSuccess}
				/>
			)}

			{/* Cards Grid */}
			{cards.length === 0 ? (
				<EmptyState />
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{cards.map((card) => (
						<CardItem
							card={card}
							key={card._id}
							onEdit={() => setEditingCard(card)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

const EmptyState = memo(function EmptyState() {
	const { t } = useTranslation();

	return (
		<div className="flex items-center justify-center py-16">
			<div className="max-w-md text-center">
				<div className="mb-4 text-6xl">📚</div>
				<h3 className="mb-3 font-bold text-2xl tracking-tight">
					{t("deckView.noCards")}
				</h3>
				<p className="mb-6 text-slate-600 leading-relaxed dark:text-slate-400">
					{t("deckView.addFirstCard")}
				</p>
			</div>
		</div>
	);
});

interface CardItemProps {
	card: Card;
	onEdit: () => void;
}

const CardItem = memo(function CardItem({ card, onEdit }: CardItemProps) {
	const [isFlipped, setIsFlipped] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const { t } = useTranslation();
	const { user } = useUser();
	const { trackConvexMutation, captureError } = useErrorMonitoring();
	const deleteCard = useMutation(api.cards.deleteCard);

	const handleDelete = async () => {
		try {
			await deleteCard({ cardId: card._id });
			setShowDeleteConfirm(false);
			showSuccessToast(t("notifications.cardDeleted"));
		} catch (error) {
			console.error("Failed to delete card:", error);

			// Track the deletion error
			trackConvexMutation("deleteCard", error as Error, {
				cardId: card._id,
				deckId: card.deckId,
				mutationArgs: { cardId: card._id },
				userId: user?.id,
			});

			// Show error toast
			showErrorToast(t("errors.generic"));
		}
	};

	const handleFlipCard = () => {
		try {
			setIsFlipped(!isFlipped);
		} catch (error) {
			// Track card flip error
			captureError(error as Error, {
				action: "flip_card",
				cardId: card._id,
				category: "ui_error",
				component: "DeckView_CardItem",
				deckId: card.deckId,
				severity: "low",
				userId: user?.id,
			});
		}
	};

	// This function is now defined above with error tracking

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.code === "Space" || event.code === "Enter") {
			event.preventDefault();
			handleFlipCard();
		}
	};

	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-6 transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
			<div className="flex h-full min-h-[200px] flex-col">
				{/* Card Content with 3D Flip Animation */}
				<button
					aria-label={isFlipped ? t("study.showFront") : t("study.showBack")}
					className="flashcard-container mb-4 flex-1 cursor-pointer"
					onClick={handleFlipCard}
					onKeyDown={handleKeyDown}
					type="button"
				>
					<div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
						{/* Front side */}
						<div className="flashcard-side flashcard-front flex flex-col justify-center">
							<div className="pointer-events-none mb-2 text-slate-500 text-xs uppercase tracking-wide">
								{t("forms.quickAddCard.front")}
							</div>
							<div className="pointer-events-none text-sm leading-relaxed">
								{card.front}
							</div>
						</div>

						{/* Back side */}
						<div className="flashcard-side flashcard-back flex flex-col justify-center">
							<div className="pointer-events-none mb-2 text-slate-500 text-xs uppercase tracking-wide">
								{t("forms.quickAddCard.back")}
							</div>
							<div className="pointer-events-none text-sm leading-relaxed">
								{card.back}
							</div>
						</div>
					</div>
				</button>

				{/* Card Actions */}
				<div className="flex items-center justify-between border-slate-200 border-t pt-4 dark:border-slate-700">
					<div className="flex items-center gap-3">
						<button
							className="text-slate-500 text-xs transition-colors hover:text-slate-700 dark:hover:text-slate-300"
							onClick={handleFlipCard}
							type="button"
						>
							{isFlipped ? t("study.showFront") : t("study.showBack")}
						</button>
						<DifficultyIndicator
							easeFactor={card.easeFactor}
							interval={card.interval}
							repetition={card.repetition}
							showLabel={false}
							variant="compact"
						/>
					</div>

					<div className="flex gap-2">
						<button
							className="text-blue-600 text-xs transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
							onClick={onEdit}
							type="button"
						>
							{t("deckView.editCard")}
						</button>
						<button
							className="text-red-600 text-xs transition-colors hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
							onClick={() => setShowDeleteConfirm(true)}
							type="button"
						>
							{t("deckView.deleteCard")}
						</button>
					</div>
				</div>
			</div>

			{/* Delete Confirmation */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
					<div className="mx-4 max-w-sm rounded-lg border-2 border-slate-200 bg-light p-6 dark:border-slate-700 dark:bg-dark">
						<h3 className="mb-4 font-semibold text-lg">
							{t("deckView.deleteCard")}?
						</h3>
						<p className="mb-6 text-slate-600 dark:text-slate-400">
							{t("deckView.confirmDelete")}
						</p>
						<div className="flex gap-3">
							<button
								className="flex-1 rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
								onClick={() => setShowDeleteConfirm(false)}
								type="button"
							>
								{t("common.cancel")}
							</button>
							<button
								className="flex-1 rounded-md border-2 border-red-600 bg-red-600 px-4 py-2 text-sm text-white transition-opacity hover:opacity-80"
								onClick={() => void handleDelete()}
								type="button"
							>
								{t("common.delete")}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

interface AddCardFormProps {
	deckId: Id<"decks">;
	onCancel: () => void;
	onSuccess: () => void;
}

function AddCardForm({ deckId, onCancel, onSuccess }: AddCardFormProps) {
	const [front, setFront] = useState("");
	const [back, setBack] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submissionAttempt, setSubmissionAttempt] = useState(0);

	const frontId = useId();
	const backId = useId();

	const { t } = useTranslation();
	const { user } = useUser();
	const posthog = usePostHog();
	const { trackConvexMutation, captureError } = useErrorMonitoring();
	const formErrorMonitor = withFormErrorMonitoring("add_card_to_deck", posthog);
	const addCard = useMutation(api.cards.addCardToDeck);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const currentAttempt = submissionAttempt + 1;
		setSubmissionAttempt(currentAttempt);

		// Client-side validation with error tracking
		const validationErrors: Record<string, string[]> = {};

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
				attemptNumber: currentAttempt,
				formData: { back, front },
				userId: user?.id,
			});

			return;
		}

		setIsSubmitting(true);

		const submitCard = async () => {
			try {
				await formErrorMonitor.wrapSubmission(
					async (formData) => {
						try {
							return await addCard({
								back: formData.back.trim(),
								deckId,
								front: formData.front.trim(),
							});
						} catch (error) {
							// Track Convex mutation errors
							trackConvexMutation("addCardToDeck", error as Error, {
								deckId,
								mutationArgs: {
									back: formData.back.trim(),
									deckId,
									front: formData.front.trim(),
								},
								userId: user?.id,
							});
							throw error;
						}
					},
					{ back, front },
					{
						submissionAttempt: currentAttempt,
						userId: user?.id,
					},
				);

				setFront("");
				setBack("");
				setError(null);
				setSubmissionAttempt(0);
				onSuccess();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t("errors.generic");
				setError(errorMessage);

				// Capture general form submission error
				captureError(err as Error, {
					action: "submit_form",
					additionalData: {
						formData: { backLength: back.length, frontLength: front.length }, // Don't log actual content for privacy
					},
					category: "ui_error",
					component: "DeckView_AddCardForm",
					deckId,
					severity: "medium",
					tags: {
						formName: "add_card_to_deck",
						submissionAttempt: String(currentAttempt),
					},
					userId: user?.id,
				});
			} finally {
				setIsSubmitting(false);
			}
		};

		void submitCard();
	};

	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-100 p-6 dark:border-slate-700 dark:bg-slate-800">
			<h3 className="mb-4 font-bold text-lg">{t("deckView.addCard")}</h3>

			<form className="space-y-4" onSubmit={handleSubmit}>
				<div>
					<label className="mb-2 block font-medium text-sm" htmlFor={frontId}>
						{t("forms.quickAddCard.front")} *
					</label>
					<textarea
						className="resize-vertical w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
						id={frontId}
						maxLength={1000}
						onChange={(e) => setFront(e.target.value)}
						placeholder={t("forms.quickAddCard.frontPlaceholder")}
						required
						rows={3}
						value={front}
					/>
					<div className="mt-1 text-slate-500 text-xs">
						{t("forms.quickAddCard.characterCount", {
							current: front.length,
							max: 1000,
						})}
					</div>
				</div>

				<div>
					<label className="mb-2 block font-medium text-sm" htmlFor={backId}>
						{t("forms.quickAddCard.back")} *
					</label>
					<textarea
						className="resize-vertical w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
						id={backId}
						maxLength={1000}
						onChange={(e) => setBack(e.target.value)}
						placeholder={t("forms.quickAddCard.backPlaceholder")}
						required
						rows={3}
						value={back}
					/>
					<div className="mt-1 text-slate-500 text-xs">
						{t("forms.quickAddCard.characterCount", {
							current: back.length,
							max: 1000,
						})}
					</div>
				</div>

				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-600 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<button
						className="rounded-md border-2 bg-dark px-4 py-2 font-medium text-light text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-light dark:text-dark"
						disabled={isSubmitting || !front.trim() || !back.trim()}
						type="submit"
					>
						{isSubmitting
							? t("forms.quickAddCard.adding")
							: t("forms.quickAddCard.add")}
					</button>
					<button
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						onClick={onCancel}
						type="button"
					>
						{t("common.cancel")}
					</button>
				</div>
			</form>
		</div>
	);
}

interface EditCardFormProps {
	card: Card;
	onCancel: () => void;
	onSuccess: () => void;
}

function EditCardForm({ card, onCancel, onSuccess }: EditCardFormProps) {
	const [front, setFront] = useState(card.front);
	const [back, setBack] = useState(card.back);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submissionAttempt, setSubmissionAttempt] = useState(0);

	const frontId = useId();
	const backId = useId();

	const { t } = useTranslation();
	const { user } = useUser();
	const posthog = usePostHog();
	const { trackConvexMutation, captureError } = useErrorMonitoring();
	const formErrorMonitor = withFormErrorMonitoring("edit_card", posthog);
	const updateCard = useMutation(api.cards.updateCard);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const currentAttempt = submissionAttempt + 1;
		setSubmissionAttempt(currentAttempt);

		// Client-side validation with error tracking
		const validationErrors: Record<string, string[]> = {};

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
				attemptNumber: currentAttempt,
				formData: { back, front },
				userId: user?.id,
			});

			return;
		}

		setIsSubmitting(true);

		const submitUpdate = async () => {
			try {
				await formErrorMonitor.wrapSubmission(
					async (formData) => {
						try {
							return await updateCard({
								back: formData.back.trim(),
								cardId: card._id,
								front: formData.front.trim(),
							});
						} catch (error) {
							// Track Convex mutation errors
							trackConvexMutation("updateCard", error as Error, {
								cardId: card._id,
								deckId: card.deckId,
								mutationArgs: {
									back: formData.back.trim(),
									cardId: card._id,
									front: formData.front.trim(),
								},
								userId: user?.id,
							});
							throw error;
						}
					},
					{ back, front },
					{
						submissionAttempt: currentAttempt,
						userId: user?.id,
					},
				);

				setError(null);
				setSubmissionAttempt(0);
				onSuccess();
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : t("errors.generic");
				setError(errorMessage);

				// Capture general form submission error
				captureError(err as Error, {
					action: "submit_form",
					additionalData: {
						formData: { backLength: back.length, frontLength: front.length }, // Don't log actual content for privacy
					},
					cardId: card._id,
					category: "ui_error",
					component: "DeckView_EditCardForm",
					deckId: card.deckId,
					severity: "medium",
					tags: {
						formName: "edit_card",
						submissionAttempt: String(currentAttempt),
					},
					userId: user?.id,
				});
			} finally {
				setIsSubmitting(false);
			}
		};

		void submitUpdate();
	};

	return (
		<div className="rounded-lg border-2 border-slate-200 bg-slate-100 p-6 dark:border-slate-700 dark:bg-slate-800">
			<h3 className="mb-4 font-bold text-lg">{t("deckView.editCard")}</h3>

			<form className="space-y-4" onSubmit={handleSubmit}>
				<div>
					<label className="mb-2 block font-medium text-sm" htmlFor={frontId}>
						{t("forms.quickAddCard.front")} *
					</label>
					<textarea
						className="resize-vertical w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
						id={frontId}
						maxLength={1000}
						onChange={(e) => setFront(e.target.value)}
						required
						rows={3}
						value={front}
					/>
					<div className="mt-1 text-slate-500 text-xs">
						{t("forms.quickAddCard.characterCount", {
							current: front.length,
							max: 1000,
						})}
					</div>
				</div>

				<div>
					<label className="mb-2 block font-medium text-sm" htmlFor={backId}>
						{t("forms.quickAddCard.back")} *
					</label>
					<textarea
						className="resize-vertical w-full rounded-md border-2 border-slate-300 bg-light px-3 py-2 text-dark focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-dark dark:text-light dark:focus:border-slate-400"
						id={backId}
						maxLength={1000}
						onChange={(e) => setBack(e.target.value)}
						required
						rows={3}
						value={back}
					/>
					<div className="mt-1 text-slate-500 text-xs">
						{t("forms.quickAddCard.characterCount", {
							current: back.length,
							max: 1000,
						})}
					</div>
				</div>

				{error && (
					<div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-600 text-sm dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
						{error}
					</div>
				)}

				<div className="flex gap-3 pt-2">
					<button
						className="rounded-md border-2 bg-dark px-4 py-2 font-medium text-light text-sm transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-light dark:text-dark"
						disabled={isSubmitting || !front.trim() || !back.trim()}
						type="submit"
					>
						{isSubmitting
							? t("forms.quickAddCard.updating")
							: t("deckView.editCard")}
					</button>
					<button
						className="rounded-md border-2 border-slate-300 bg-slate-200 px-4 py-2 text-dark text-sm transition-opacity hover:opacity-80 dark:border-slate-600 dark:bg-slate-700 dark:text-light"
						onClick={onCancel}
						type="button"
					>
						{t("common.cancel")}
					</button>
				</div>
			</form>
		</div>
	);
}

export default DeckView;
