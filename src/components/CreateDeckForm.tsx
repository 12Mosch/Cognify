import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface CreateDeckFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateDeckForm({ onSuccess, onCancel }: CreateDeckFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const createDeck = useMutation(api.decks.createDeck);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError("Deck name is required");
      return;
    }

    if (name.length > 100) {
      setError("Deck name cannot exceed 100 characters");
      return;
    }

    if (description.length > 500) {
      setError("Deck description cannot exceed 500 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      await createDeck({
        name: name.trim(),
        description: description.trim(),
      });

      // Reset form
      setName("");
      setDescription("");
      setShowForm(false);
      setError(null);

      // Call success callback
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create deck");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setDescription("");
    setError(null);
    setShowForm(false);
    onCancel?.();
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
        aria-label="Create new deck"
      >
        + Create New Deck
      </button>
    );
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">Create New Deck</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label 
            htmlFor="deck-name" 
            className="block text-sm font-medium mb-2"
          >
            Deck Name *
          </label>
          <input
            id="deck-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter deck name"
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400"
            maxLength={100}
            required
            aria-describedby={error ? "form-error" : undefined}
          />
          <div className="text-xs text-slate-500 mt-1">
            {name.length}/100 characters
          </div>
        </div>

        <div>
          <label 
            htmlFor="deck-description" 
            className="block text-sm font-medium mb-2"
          >
            Description
          </label>
          <textarea
            id="deck-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter deck description (optional)"
            rows={3}
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            maxLength={500}
            aria-describedby={error ? "form-error" : undefined}
          />
          <div className="text-xs text-slate-500 mt-1">
            {description.length}/500 characters
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
            aria-label={isSubmitting ? "Creating deck..." : "Create deck"}
          >
            {isSubmitting ? "Creating..." : "Create Deck"}
          </button>
          
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel deck creation"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
