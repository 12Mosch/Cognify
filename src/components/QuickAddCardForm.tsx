import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";
import FocusLock from "react-focus-lock";
import { useFocusManagement, useModalEffects } from "../hooks/useFocusManagement";
import { showErrorToast } from "../lib/toast";
import { useErrorMonitoring, withFormErrorMonitoring } from "../lib/errorMonitoring";
import { useUser } from "@clerk/clerk-react";
import { usePostHog } from "posthog-js/react";

interface QuickAddCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}



export function QuickAddCardForm({ onSuccess, onCancel }: QuickAddCardFormProps) {
  const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submissionAttempt, setSubmissionAttempt] = useState(0);

  const { user } = useUser();
  const posthog = usePostHog();
  const decks = useQuery(api.decks.getDecksForUser);
  const addCard = useMutation(api.cards.addCardToDeck);
  const { trackCardCreated } = useAnalytics();
  const { captureError, trackConvexMutation, trackConvexQuery } = useErrorMonitoring();

  // Form error monitoring
  const formErrorMonitor = withFormErrorMonitoring('quick_add_card', posthog);

  // Focus management hooks
  const { storeTriggerElement, restoreFocus } = useFocusManagement(showForm);
  const firstSelectRef = useRef<HTMLSelectElement>(null);
  useModalEffects(showForm, handleCancel);

  // Track query errors if they occur
  if (decks === null) {
    // Query failed - track the error
    const queryError = new Error('Failed to load user decks for card creation');
    trackConvexQuery('getDecksForUser', queryError, {
      userId: user?.id,
    });
  }

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
      validationErrors.deckId = ["Please select a deck"];
    }

    if (!front.trim()) {
      validationErrors.front = ["Front content is required"];
    }

    if (!back.trim()) {
      validationErrors.back = ["Back content is required"];
    }

    if (front.length > 1000) {
      validationErrors.front = [...(validationErrors.front || []), "Front content cannot exceed 1000 characters"];
    }

    if (back.length > 1000) {
      validationErrors.back = [...(validationErrors.back || []), "Back content cannot exceed 1000 characters"];
    }

    // Track validation errors if any
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0][0];
      setError(firstError);

      formErrorMonitor.trackValidationErrors(validationErrors, {
        userId: user?.id,
        formData: { selectedDeckId: selectedDeckId || '', front, back },
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
              trackConvexMutation('addCardToDeck', error as Error, {
                userId: user?.id,
                deckId: formData.selectedDeckId as string,
                mutationArgs: {
                  deckId: formData.selectedDeckId,
                  front: formData.front.trim(),
                  back: formData.back.trim()
                },
              });
              throw error;
            }
          },
          { selectedDeckId: selectedDeckId!, front, back },
          {
            userId: user?.id,
            submissionAttempt: currentAttempt,
          }
        );

        // Track card creation event
        const selectedDeck = decks?.find(deck => deck._id === selectedDeckId);
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
        const errorMessage = err instanceof Error ? err.message : "Failed to add card";
        setError(errorMessage);

        // Capture general form submission error
        captureError(err as Error, {
          userId: user?.id,
          deckId: selectedDeckId as string,
          component: 'QuickAddCardForm',
          action: 'submit_form',
          severity: 'medium',
          category: 'ui_error',
          tags: {
            formName: 'quick_add_card',
            submissionAttempt: String(currentAttempt),
          },
          additionalData: {
            formData: {
              selectedDeckId: selectedDeckId as string,
              frontLength: front.length,
              backLength: back.length
            }, // Don't log actual content for privacy
          },
        });

        // Show error toast for all failures
        // Let the user see the specific error in the inline error display
        showErrorToast("Failed to add card. Please try again.");
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
        className="bg-slate-600 dark:bg-slate-400 text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
        aria-label="Quick add card to existing deck"
      >
        + Quick Add Card
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
            className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 max-w-md w-full pointer-events-auto max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-card-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="quick-add-card-title" className="text-lg font-bold mb-4">Quick Add Card</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deck Selection */}
        <div>
          <label 
            htmlFor="deck-select" 
            className="block text-sm font-medium mb-2"
          >
            Select Deck *
          </label>
          <select
            ref={firstSelectRef}
            id="deck-select"
            value={selectedDeckId || ""}
            onChange={(e) => setSelectedDeckId(e.target.value ? e.target.value as Id<"decks"> : null)}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400"
            required
            aria-describedby={error ? "form-error" : undefined}
          >
            <option value="">Choose a deck...</option>
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
            className="block text-sm font-medium mb-2"
          >
            Front (Question) *
          </label>
          <textarea
            id="card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the question or prompt"
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-none"
            rows={3}
            maxLength={1000}
            required
            aria-describedby={error ? "form-error" : undefined}
          />
          <div className="text-xs text-slate-500 mt-1">
            {front.length}/1000 characters
          </div>
        </div>

        {/* Card Back */}
        <div>
          <label 
            htmlFor="card-back" 
            className="block text-sm font-medium mb-2"
          >
            Back (Answer) *
          </label>
          <textarea
            id="card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter the answer or explanation"
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-none"
            rows={3}
            maxLength={1000}
            required
            aria-describedby={error ? "form-error" : undefined}
          />
          <div className="text-xs text-slate-500 mt-1">
            {back.length}/1000 characters
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
            disabled={isSubmitting || !selectedDeckId || !front.trim() || !back.trim()}
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? "Adding..." : "Add Card"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
            </div>
            </form>
          </div>
        </FocusLock>
      </div>
    </>
  );
}
