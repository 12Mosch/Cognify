/**
 * Tests for SpacedRepetitionMode component
 * These tests verify the spaced repetition study interface works correctly
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpacedRepetitionMode } from '../SpacedRepetitionMode';
import { Id } from '../../../convex/_generated/dataModel';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock analytics
jest.mock('../../lib/analytics', () => ({
  useAnalytics: () => ({
    trackStudySessionStarted: jest.fn(),
  }),
}));

const mockDeckId = 'test-deck-id' as Id<"decks">;
const mockOnExit = jest.fn();

const mockDeck = {
  _id: mockDeckId,
  _creationTime: Date.now(),
  userId: 'test-user',
  name: 'Test Deck',
  description: 'Test Description',
};

const mockCards = [
  {
    _id: 'card-1' as Id<"cards">,
    _creationTime: Date.now(),
    deckId: mockDeckId,
    front: 'What is 2+2?',
    back: '4',
    repetition: 0,
    easeFactor: 2.5,
    interval: 1,
    dueDate: Date.now(),
  },
  {
    _id: 'card-2' as Id<"cards">,
    _creationTime: Date.now(),
    deckId: mockDeckId,
    front: 'What is the capital of France?',
    back: 'Paris',
    repetition: 1,
    easeFactor: 2.5,
    interval: 6,
    dueDate: Date.now() - 86400000, // Due yesterday
  },
];

describe('SpacedRepetitionMode', () => {
  const mockUseQuery = jest.mocked(jest.requireMock('convex/react').useQuery);
  const mockUseMutation = jest.mocked(jest.requireMock('convex/react').useMutation);
  const mockReviewCard = jest.fn();
  const mockInitializeCard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMutation.mockImplementation((mutation: any) => {
      if (mutation.toString().includes('reviewCard')) {
        return mockReviewCard;
      }
      if (mutation.toString().includes('initializeCard')) {
        return mockInitializeCard;
      }
      return jest.fn();
    });
  });

  it('renders loading state when data is not loaded', () => {
    mockUseQuery.mockImplementation(() => undefined);

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    expect(screen.getByText('Loading spaced repetition session...')).toBeInTheDocument();
  });

  it('renders deck not found state when deck is null', () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return null;
      return [];
    });

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    expect(screen.getByText('Deck Not Found')).toBeInTheDocument();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('renders no cards state when there are no cards to study', () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      return []; // No due cards or new cards
    });

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    expect(screen.getByText('All Caught Up! 🎉')).toBeInTheDocument();
    expect(screen.getByText(/You have no cards due for review/)).toBeInTheDocument();
  });

  it('renders study interface with cards', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getDueCardsForDeck')) return [mockCards[1]]; // Due card
      if (query.toString().includes('getNewCardsForDeck')) return [mockCards[0]]; // New card
      return [];
    });

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Deck')).toBeInTheDocument();
      expect(screen.getByText('Spaced Repetition Mode')).toBeInTheDocument();
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Show Answer')).toBeInTheDocument();
    });
  });

  it('allows flipping cards to show answer', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getDueCardsForDeck')) return [mockCards[1]];
      if (query.toString().includes('getNewCardsForDeck')) return [];
      return [];
    });

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    await waitFor(() => {
      expect(screen.getByText('Show Answer')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show Answer'));

    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('How well did you know this?')).toBeInTheDocument();
    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('handles card review and moves to next card', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getDueCardsForDeck')) return mockCards;
      if (query.toString().includes('getNewCardsForDeck')) return [];
      return [];
    });

    mockReviewCard.mockResolvedValue(null);

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    // Wait for component to load and show first card
    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    // Flip the card
    fireEvent.click(screen.getByText('Show Answer'));

    // Rate the card as "Good"
    fireEvent.click(screen.getByText('Good'));

    // Should call reviewCard mutation
    await waitFor(() => {
      expect(mockReviewCard).toHaveBeenCalledWith({
        cardId: 'card-2',
        quality: 4,
      });
    });

    // Should move to next card
    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });
  });

  it('exits when all cards are reviewed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getDueCardsForDeck')) return [mockCards[0]]; // Only one card
      if (query.toString().includes('getNewCardsForDeck')) return [];
      return [];
    });

    mockReviewCard.mockResolvedValue(null);

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Flip and review the only card
    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Good'));

    // Should exit the study session
    await waitFor(() => {
      expect(mockOnExit).toHaveBeenCalled();
    });
  });

  it('handles exit button click', () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getDueCardsForDeck')) return [mockCards[0]];
      if (query.toString().includes('getNewCardsForDeck')) return [];
      return [];
    });

    render(
      <SpacedRepetitionMode deckId={mockDeckId} onExit={mockOnExit} />
    );

    const exitButton = screen.getByText('Exit Study');
    fireEvent.click(exitButton);

    expect(mockOnExit).toHaveBeenCalled();
  });
});
