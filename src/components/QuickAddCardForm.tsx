import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useAnalytics } from "../lib/analytics";

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

  const decks = useQuery(api.decks.getDecksForUser);
  const addCard = useMutation(api.cards.addCardToDeck);
  const { trackCardCreated } = useAnalytics();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDeckId) {
      setError("Please select a deck");
      return;
    }

    if (!front.trim() || !back.trim()) {
      setError("Both front and back content are required");
      return;
    }

    if (front.length > 1000 || back.length > 1000) {
      setError("Card content cannot exceed 1000 characters");
      return;
    }

    setIsSubmitting(true);

    const submitCard = async () => {
      try {
        const cardId = await addCard({
          deckId: selectedDeckId,
          front: front.trim(),
          back: back.trim(),
        });

        // Track card creation event
        const selectedDeck = decks?.find(deck => deck._id === selectedDeckId);
        trackCardCreated(cardId, selectedDeck?.name);

        // Reset form
        setSelectedDeckId(null);
        setFront("");
        setBack("");
        setError(null);
        setShowForm(false);

        // Call success callback
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add card");
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitCard();
  };

  const handleCancel = () => {
    setSelectedDeckId(null);
    setFront("");
    setBack("");
    setError(null);
    setShowForm(false);
    onCancel?.();
  };

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
        onClick={() => setShowForm(true)}
        className="bg-slate-600 dark:bg-slate-400 text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
        aria-label="Quick add card to existing deck"
      >
        + Quick Add Card
      </button>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">Quick Add Card</h3>
      
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
  );
}
