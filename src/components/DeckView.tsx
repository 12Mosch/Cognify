import { useState, memo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { DeckViewSkeleton } from "./skeletons/SkeletonComponents";
import { toastHelpers } from "../lib/toast";

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
}

function DeckView({ deckId, onBack }: DeckViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const deck = useQuery(api.decks.getDeckById, { deckId });
  const cards = useQuery(api.cards.getCardsForDeck, { deckId });

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
            <h2 className="text-2xl font-bold mb-4">Deck Not Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              The deck you're looking for doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={onBack}
              className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
            >
              Back to Dashboard
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
            aria-label="Back to dashboard"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-3xl font-bold">{deck.name}</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {deck.description || "No description"}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {cards.length} card{cards.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-6 py-3 rounded-md border-2 hover:opacity-80 transition-opacity font-medium"
        >
          + Add Card
        </button>
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
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-xl font-semibold mb-2">No Cards Yet</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Start building your deck by adding your first flashcard. Click the "Add Card" button above to get started.
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

  const deleteCard = useMutation(api.cards.deleteCard);

  const handleDelete = async () => {
    try {
      await deleteCard({ cardId: card._id });
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

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
          aria-label={isFlipped ? "Click to show front" : "Click to show back"}
        >
          <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
            {/* Front side */}
            <div className="flashcard-side flashcard-front flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide pointer-events-none">
                Front
              </div>
              <div className="text-sm leading-relaxed pointer-events-none">
                {card.front}
              </div>
            </div>

            {/* Back side */}
            <div className="flashcard-side flashcard-back flex flex-col justify-center">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide pointer-events-none">
                Back
              </div>
              <div className="text-sm leading-relaxed pointer-events-none">
                {card.back}
              </div>
            </div>
          </div>
        </div>

        {/* Card Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleFlipCard}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            {isFlipped ? "Show Front" : "Show Back"}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light dark:bg-dark p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Card?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to delete this card? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDelete()}
                className="flex-1 bg-red-600 text-white text-sm px-4 py-2 rounded-md border-2 border-red-600 hover:opacity-80 transition-opacity"
              >
                Delete
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

  const addCard = useMutation(api.cards.addCardToDeck);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        await addCard({
          deckId,
          front: front.trim(),
          back: back.trim(),
        });

        setFront("");
        setBack("");
        setError(null);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add card");
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitCard();
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">Add New Card</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="card-front" className="block text-sm font-medium mb-2">
            Front (Question/Prompt) *
          </label>
          <textarea
            id="card-front"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Enter the front side of the card"
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {front.length}/1000 characters
          </div>
        </div>

        <div>
          <label htmlFor="card-back" className="block text-sm font-medium mb-2">
            Back (Answer) *
          </label>
          <textarea
            id="card-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Enter the back side of the card"
            className="w-full px-3 py-2 border-2 border-slate-300 dark:border-slate-600 rounded-md bg-light dark:bg-dark text-dark dark:text-light focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 resize-vertical"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="text-xs text-slate-500 mt-1">
            {back.length}/1000 characters
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
            {isSubmitting ? "Adding..." : "Add Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            Cancel
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

  const updateCard = useMutation(api.cards.updateCard);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!front.trim() || !back.trim()) {
      setError("Both front and back content are required");
      return;
    }

    if (front.length > 1000 || back.length > 1000) {
      setError("Card content cannot exceed 1000 characters");
      return;
    }

    setIsSubmitting(true);

    const submitUpdate = async () => {
      try {
        await updateCard({
          cardId: card._id,
          front: front.trim(),
          back: back.trim(),
        });

        setError(null);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update card");
      } finally {
        setIsSubmitting(false);
      }
    };

    void submitUpdate();
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg border-2 border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-bold mb-4">Edit Card</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-card-front" className="block text-sm font-medium mb-2">
            Front (Question/Prompt) *
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
            {front.length}/1000 characters
          </div>
        </div>

        <div>
          <label htmlFor="edit-card-back" className="block text-sm font-medium mb-2">
            Back (Answer) *
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
            {back.length}/1000 characters
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
            {isSubmitting ? "Updating..." : "Update Card"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-slate-200 dark:bg-slate-700 text-dark dark:text-light text-sm px-4 py-2 rounded-md border-2 border-slate-300 dark:border-slate-600 hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeckView;
