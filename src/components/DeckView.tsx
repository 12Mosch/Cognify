import { useState, useEffect, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { DeckViewSkeleton } from "./skeletons/SkeletonComponents";
import { EditDeckForm } from "./EditDeckForm";
import { toastHelpers, showErrorToast, showSuccessToast } from "../lib/toast";
import { useErrorMonitoring, withFormErrorMonitoring } from "../lib/errorMonitoring";
import { useUser } from "@clerk/clerk-react";
import { usePostHog } from "posthog-js/react";
import { DifficultyIndicator } from "./DifficultyIndicator";

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
  const [errorTracked, setErrorTracked] = useState<{deck?: boolean, cards?: boolean}>({});

  const { t } = useTranslation();
  const { user } = useUser();
  const { trackConvexQuery } = useErrorMonitoring();

  const deck = useQuery(api.decks.getDeckById, { deckId });
  const cards = useQuery(api.cards.getCardsForDeck, { deckId });

  // Track deck loading errors (side effect)
  useEffect(() => {
    if (deck === null && !errorTracked.deck) {
      const deckError = new Error('Failed to load deck or access denied');
      trackConvexQuery('getDeckById', deckError, {
        userId: user?.id,
        deckId,
      });
      setErrorTracked(prev => ({ ...prev, deck: true }));
    }
  }, [deck, errorTracked.deck, trackConvexQuery, user?.id, deckId]);

  // Track cards loading errors (side effect)
  useEffect(() => {
    if (cards === null && !errorTracked.cards) {
      const cardsError = new Error('Failed to load cards for deck');
      trackConvexQuery('getCardsForDeck', cardsError, {
        userId: user?.id,
        deckId,
      });
      setErrorTracked(prev => ({ ...prev, cards: true }));
    }
  }, [cards, errorTracked.cards, trackConvexQuery, user?.id, deckId]);

  // Reset error tracking when deckId changes
  useEffect(() => {
    setErrorTracked({});
  }, [deckId]);

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
      <div className="flex flex-col gap-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{t('study.deckNotFound.title')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('study.deckNotFound.message')}
            </p>
            <button
              onClick={onBack}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
            >
              {t('deckView.backToDashboard')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            aria-label={t('deckView.backToDashboard')}
          >
            ← {t('common.back')}
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{deck.name}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {deck.description || t('deck.noDescription')}
            </p>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              {t('deck.cardCount', { count: cards.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEditDeckForm(true)}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-3 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium"
            aria-label={t('deck.editDeckAria', { deckName: deck.name })}
          >
            {t('deckView.editDeck')}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
          >
            + {t('deckView.addCard')}
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
          onSuccess={handleEditDeckSuccess}
          onCancel={() => setShowEditDeckForm(false)}
          forceShowForm={true}
        />
      )}

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <CardItem
              key={card._id}
              card={card}
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
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-2xl font-bold mb-3 tracking-tight">{t('deckView.noCards')}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
          {t('deckView.addFirstCard')}
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
      showSuccessToast(t('notifications.cardDeleted'));
    } catch (error) {
      console.error("Failed to delete card:", error);

      // Track the deletion error
      trackConvexMutation('deleteCard', error as Error, {
        userId: user?.id,
        deckId: card.deckId,
        cardId: card._id,
        mutationArgs: { cardId: card._id },
      });

      // Show error toast
      showErrorToast(t('errors.generic'));
    }
  };

  const handleFlipCard = () => {
    try {
      setIsFlipped(!isFlipped);
    } catch (error) {
      // Track card flip error
      captureError(error as Error, {
        userId: user?.id,
        deckId: card.deckId,
        cardId: card._id,
        component: 'DeckView_CardItem',
        action: 'flip_card',
        severity: 'low',
        category: 'ui_error',
      });
    }
  };

  // This function is now defined above with error tracking

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      handleFlipCard();
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="flex flex-col h-full min-h-[200px]">
        {/* Card Content with 3D Flip Animation */}
        <div
          className="flashcard-container flex-1 mb-4 cursor-pointer"
          onClick={handleFlipCard}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={isFlipped ? t('study.showFront') : t('study.showBack')}
        >
          <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
            {/* Front side */}
            <div className="flashcard-side flashcard-front flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide pointer-events-none">
                {t('forms.quickAddCard.front')}
              </div>
              <div className="text-sm leading-relaxed pointer-events-none">
                {card.front}
              </div>
            </div>

            {/* Back side */}
            <div className="flashcard-side flashcard-back flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide pointer-events-none">
                {t('forms.quickAddCard.back')}
              </div>
              <div className="text-sm leading-relaxed pointer-events-none">
                {card.back}
              </div>
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <button
              onClick={handleFlipCard}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              {isFlipped ? t('study.showFront') : t('study.showBack')}
            </button>
            <DifficultyIndicator
              repetition={card.repetition}
              easeFactor={card.easeFactor}
              interval={card.interval}
              variant="compact"
              showLabel={false}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              {t('deckView.editCard')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            >
              {t('deckView.deleteCard')}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light dark:bg-dark p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('deckView.deleteCard')}?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t('deckView.confirmDelete')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 bg-red-600 text-white text-sm px-4 py-2 rounded-md border-2 border-red-600 hover:opacity-80 transition-opacity"
              >
                {t('common.delete')}
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

  const { t } = useTranslation();
  const { user } = useUser();
  const posthog = usePostHog();
  const { trackConvexMutation, captureError } = useErrorMonitoring();
  const formErrorMonitor = withFormErrorMonitoring('add_card_to_deck', posthog);
  const addCard = useMutation(api.cards.addCardToDeck);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentAttempt = submissionAttempt + 1;
    setSubmissionAttempt(currentAttempt);

    // Client-side validation with error tracking
    const validationErrors: Record<string, string[]> = {};

    if (!front.trim()) {
      validationErrors.front = [t('forms.validation.frontRequired')];
    }

    if (!back.trim()) {
      validationErrors.back = [t('forms.validation.backRequired')];
    }

    if (front.length > 1000) {
      validationErrors.front = [...(validationErrors.front || []), t('forms.validation.maxLength', { field: t('forms.quickAddCard.front'), max: 1000 })];
    }

    if (back.length > 1000) {
      validationErrors.back = [...(validationErrors.back || []), t('forms.validation.maxLength', { field: t('forms.quickAddCard.back'), max: 1000 })];
    }

    // Track validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0][0];
      setError(firstError);

      formErrorMonitor.trackValidationErrors(validationErrors, {
        userId: user?.id,
        formData: { front, back },
        attemptNumber: currentAttempt,
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
                deckId,
                front: formData.front.trim(),
                back: formData.back.trim(),
              });
            } catch (error) {
              // Track Convex mutation errors
              trackConvexMutation('addCardToDeck', error as Error, {
                userId: user?.id,
                deckId,
                mutationArgs: { deckId, front: formData.front.trim(), back: formData.back.trim() },
              });
              throw error;
            }
          },
          { front, back },
          {
            userId: user?.id,
            submissionAttempt: currentAttempt,
          }
        );

        setFront("");
        setBack("");
        setError(null);
        setSubmissionAttempt(0);
        onSuccess();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('errors.generic');
        setError(errorMessage);

        // Capture general form submission error
        captureError(err as Error, {
          userId: user?.id,
          deckId,
          component: 'DeckView_AddCardForm',
          action: 'submit_form',
          severity: 'medium',
          category: 'ui_error',
          tags: {
            formName: 'add_card_to_deck',
            submissionAttempt: String(currentAttempt),
          },
          additionalData: {
            formData: { frontLength: front.length, backLength: back.length }, // Don't log actual content for privacy
          },
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitCard();
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">{t('deckView.addCard')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="card-front" className="block text-sm font-medium mb-2">
            {t('forms.quickAddCard.front')} *
          </label>
          <textarea
            id="card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder={t('forms.quickAddCard.frontPlaceholder')}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {t('forms.quickAddCard.characterCount', { current: front.length, max: 1000 })}
          </div>
        </div>

        <div>
          <label htmlFor="card-back" className="block text-sm font-medium mb-2">
            {t('forms.quickAddCard.back')} *
          </label>
          <textarea
            id="card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder={t('forms.quickAddCard.backPlaceholder')}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {t('forms.quickAddCard.characterCount', { current: back.length, max: 1000 })}
          </div>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !front.trim() || !back.trim()}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? t('forms.quickAddCard.adding') : t('forms.quickAddCard.add')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            {t('common.cancel')}
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

  const { t } = useTranslation();
  const { user } = useUser();
  const posthog = usePostHog();
  const { trackConvexMutation, captureError } = useErrorMonitoring();
  const formErrorMonitor = withFormErrorMonitoring('edit_card', posthog);
  const updateCard = useMutation(api.cards.updateCard);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentAttempt = submissionAttempt + 1;
    setSubmissionAttempt(currentAttempt);

    // Client-side validation with error tracking
    const validationErrors: Record<string, string[]> = {};

    if (!front.trim()) {
      validationErrors.front = [t('forms.validation.frontRequired')];
    }

    if (!back.trim()) {
      validationErrors.back = [t('forms.validation.backRequired')];
    }

    if (front.length > 1000) {
      validationErrors.front = [...(validationErrors.front || []), t('forms.validation.maxLength', { field: t('forms.quickAddCard.front'), max: 1000 })];
    }

    if (back.length > 1000) {
      validationErrors.back = [...(validationErrors.back || []), t('forms.validation.maxLength', { field: t('forms.quickAddCard.back'), max: 1000 })];
    }

    // Track validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0][0];
      setError(firstError);

      formErrorMonitor.trackValidationErrors(validationErrors, {
        userId: user?.id,
        formData: { front, back },
        attemptNumber: currentAttempt,
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
                cardId: card._id,
                front: formData.front.trim(),
                back: formData.back.trim(),
              });
            } catch (error) {
              // Track Convex mutation errors
              trackConvexMutation('updateCard', error as Error, {
                userId: user?.id,
                deckId: card.deckId,
                cardId: card._id,
                mutationArgs: { cardId: card._id, front: formData.front.trim(), back: formData.back.trim() },
              });
              throw error;
            }
          },
          { front, back },
          {
            userId: user?.id,
            submissionAttempt: currentAttempt,
          }
        );

        setError(null);
        setSubmissionAttempt(0);
        onSuccess();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t('errors.generic');
        setError(errorMessage);

        // Capture general form submission error
        captureError(err as Error, {
          userId: user?.id,
          deckId: card.deckId,
          cardId: card._id,
          component: 'DeckView_EditCardForm',
          action: 'submit_form',
          severity: 'medium',
          category: 'ui_error',
          tags: {
            formName: 'edit_card',
            submissionAttempt: String(currentAttempt),
          },
          additionalData: {
            formData: { frontLength: front.length, backLength: back.length }, // Don't log actual content for privacy
          },
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitUpdate();
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">{t('deckView.editCard')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-card-front" className="block text-sm font-medium mb-2">
            {t('forms.quickAddCard.front')} *
          </label>
          <textarea
            id="edit-card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {t('forms.quickAddCard.characterCount', { current: front.length, max: 1000 })}
          </div>
        </div>

        <div>
          <label htmlFor="edit-card-back" className="block text-sm font-medium mb-2">
            {t('forms.quickAddCard.back')} *
          </label>
          <textarea
            id="edit-card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {t('forms.quickAddCard.characterCount', { current: back.length, max: 1000 })}
          </div>
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !front.trim() || !back.trim()}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? t('forms.quickAddCard.updating') : t('deckView.editCard')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeckView;
