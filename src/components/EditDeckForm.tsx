import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import FocusLock from "react-focus-lock";
import { useFocusManagement, useModalEffects } from "../hooks/useFocusManagement";
import { showErrorToast } from "../lib/toast";
import { useErrorMonitoring, withFormErrorMonitoring } from "../lib/errorMonitoring";
import { useUser } from "@clerk/clerk-react";
import { usePostHog } from "posthog-js/react";

interface Deck {
  _id: Id<"decks">;
  _creationTime: number;
  userId: string;
  name: string;
  description: string;
  cardCount: number;
}

interface EditDeckFormProps {
  deck: Deck;
  onSuccess?: (deckName?: string) => void;
  onCancel?: () => void;
  forceShowForm?: boolean;
}

export function EditDeckForm({ deck, onSuccess, onCancel, forceShowForm = false }: EditDeckFormProps) {
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(forceShowForm);
  const [submissionAttempt, setSubmissionAttempt] = useState(0);

  const { t } = useTranslation();
  const { user } = useUser();
  const posthog = usePostHog();
  const updateDeck = useMutation(api.decks.updateDeck);
  const { trackDeckUpdated } = useAnalytics();
  const { captureError, trackConvexMutation } = useErrorMonitoring();

  // Form error monitoring
  const formErrorMonitor = withFormErrorMonitoring('edit_deck', posthog);

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

  // Reset form values when deck changes
  useEffect(() => {
    setName(deck.name);
    setDescription(deck.description);
    setError(null);
  }, [deck.name, deck.description]);

  // Update showForm when forceShowForm changes
  useEffect(() => {
    if (forceShowForm !== undefined) {
      setShowForm(forceShowForm);
    }
  }, [forceShowForm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const currentAttempt = submissionAttempt + 1;
    setSubmissionAttempt(currentAttempt);

    // Client-side validation with error tracking
    const validationErrors: Record<string, string[]> = {};

    if (!name.trim()) {
      validationErrors.name = [t('forms.validation.deckNameRequired')];
    }

    if (name.length > 100) {
      validationErrors.name = [...(validationErrors.name || []), t('forms.validation.maxLength', { field: t('forms.editDeck.name'), max: 100 })];
    }

    if (description.length > 500) {
      validationErrors.description = [t('forms.validation.maxLength', { field: t('forms.editDeck.description'), max: 500 })];
    }

    // If there are validation errors, show them and track
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0][0];
      setError(firstError);
      
      formErrorMonitor.trackValidationErrors(validationErrors, {
        userId: user?.id,
        attemptNumber: currentAttempt,
      });
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now();

    // Handle async operations without making the handler async
    const submitDeck = async () => {
      try {
        await formErrorMonitor.wrapSubmission(
          async (formData) => {
            try {
              return await updateDeck({
                deckId: deck._id,
                name: formData.name.trim(),
                description: formData.description.trim(),
              });
            } catch (error) {
              // Track Convex mutation errors
              trackConvexMutation('updateDeck', error as Error, {
                userId: user?.id,
                mutationArgs: {
                  deckId: deck._id,
                  nameLength: formData.name.trim().length,
                  descriptionLength: formData.description.trim().length
                },
              });
              throw error;
            }
          },
          { name, description },
          {
            userId: user?.id,
            submissionAttempt: currentAttempt,
          }
        );

        // Track deck update event
        trackDeckUpdated?.(deck._id, name.trim());

        // Store deck name for success callback before resetting form
        const deckName = name.trim();

        // Reset form state
        setShowForm(false);
        setError(null);
        setSubmissionAttempt(0);

        // Restore focus to trigger element
        restoreFocus();

        // Call success callback with deck name
        onSuccess?.(deckName);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update deck";
        setError(errorMessage);

        // Capture general form submission error
        captureError(err as Error, {
          userId: user?.id,
          component: 'EditDeckForm',
          action: 'submit_form',
          severity: 'medium',
          category: 'ui_error',
          tags: {
            formName: 'edit_deck',
            submissionAttempt: String(currentAttempt),
            deckId: deck._id,
          },
          additionalData: {
            formData: { name: name.length, description: description.length }, // Don't log actual content for privacy
            timeToSubmit: Date.now() - startTime,
          },
        });

        // Show error toast for all failures
        // Let the user see the specific error in the inline error display
        showErrorToast('errors.generic');
      } finally {
        setIsSubmitting(false);
      }
    };

    // Execute the async function and handle any unhandled promise rejections
    void submitDeck();
  };

  function handleCancel() {
    // Reset to original deck values
    setName(deck.name);
    setDescription(deck.description);
    setError(null);
    setShowForm(false);
    restoreFocus();
    onCancel?.();
  }

  if (!showForm) {
    return (
      <button
        onClick={() => {
          storeTriggerElement();
          setShowForm(true);
        }}
        className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity font-medium"
        aria-label={t('forms.editDeck.buttonLabel')}
      >
        {t('deck.editDeck')}
      </button>
    );
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <FocusLock>
          <div
            className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 max-w-md w-full pointer-events-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-deck-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-deck-title" className="text-lg font-bold mb-4">{t('forms.editDeck.title')}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-deck-name"
                  className="block text-sm font-medium mb-2"
                >
                  {t('forms.editDeck.name')} *
                </label>
                <input
                  ref={firstInputRef}
                  id="edit-deck-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('forms.editDeck.namePlaceholder')}
                  className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400"
                  maxLength={100}
                  required
                  aria-describedby={error ? "form-error" : undefined}
                />
                <div className="text-xs text-slate-500 mt-1">
                  {t('forms.editDeck.characterCount', { current: name.length, max: 100 })}
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-deck-description"
                  className="block text-sm font-medium mb-2"
                >
                  {t('forms.editDeck.description')}
                </label>
                <textarea
                  id="edit-deck-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('forms.editDeck.descriptionPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
                  maxLength={500}
                  aria-describedby={error ? "form-error" : undefined}
                />
                <div className="text-xs text-slate-500 mt-1">
                  {t('forms.editDeck.characterCount', { current: description.length, max: 500 })}
                </div>
              </div>

              {error && (
                <div 
                  id="form-error"
                  className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  aria-label={isSubmitting ? t('forms.editDeck.updating') : t('forms.editDeck.update')}
                >
                  {isSubmitting ? t('forms.editDeck.updating') : t('forms.editDeck.update')}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('forms.editDeck.cancel')}
                >
                  {t('forms.editDeck.cancel')}
                </button>
              </div>
            </form>
          </div>
        </FocusLock>
      </div>
    </>
  );
}
