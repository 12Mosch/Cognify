/**
 * Tests for StudySession component
 * These tests verify the basic study session interface works correctly with keyboard shortcuts
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StudySession from '../StudySession';
import { Id } from '../../../convex/_generated/dataModel';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

// Mock analytics
jest.mock('../../lib/analytics', () => ({
  useAnalytics: () => ({
    trackStudySessionStarted: jest.fn(),
  }),
}));

const mockUseQuery = jest.mocked(jest.requireMock('convex/react').useQuery);
const mockDeckId = 'test-deck-id' as Id<"decks">;
const mockOnExit = jest.fn();

const mockDeck = {
  _id: mockDeckId,
  name: 'Test Deck',
  description: 'A test deck',
  userId: 'user-123',
  _creationTime: Date.now(),
};

const mockCards = [
  {
    _id: 'card-1' as Id<"cards">,
    deckId: mockDeckId,
    front: 'What is 2+2?',
    back: '4',
    _creationTime: Date.now(),
  },
  {
    _id: 'card-2' as Id<"cards">,
    deckId: mockDeckId,
    front: 'What is the capital of France?',
    back: 'Paris',
    _creationTime: Date.now(),
  },
];

describe('StudySession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is not loaded', () => {
    mockUseQuery.mockImplementation(() => undefined);

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    expect(screen.getByText('Loading study session...')).toBeInTheDocument();
  });

  it('renders study interface with cards and help icon', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('Test Deck')).toBeInTheDocument();
      expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      expect(screen.getByLabelText('Show keyboard shortcuts help')).toBeInTheDocument();
    });
  });

  it('flips card when Space key is pressed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Space key
    fireEvent.keyDown(document, { code: 'Space' });

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('flips card when Enter key is pressed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Enter key
    fireEvent.keyDown(document, { code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('navigates to next card when Right Arrow key is pressed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Right Arrow key
    fireEvent.keyDown(document, { code: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
    });
  });

  it('navigates to previous card when Left Arrow key is pressed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Go to second card first
    fireEvent.keyDown(document, { code: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    // Press Left Arrow key to go back
    fireEvent.keyDown(document, { code: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
      expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    });
  });

  it('opens keyboard shortcuts modal when ? key is pressed', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press ? key
    fireEvent.keyDown(document, { key: '?' });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
      expect(screen.getByText(/Available shortcuts for Basic Study mode/)).toBeInTheDocument();
    });
  });

  it('opens keyboard shortcuts modal when help icon is clicked', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Click help icon
    const helpIcon = screen.getByLabelText('Show keyboard shortcuts help');
    fireEvent.click(helpIcon);

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  it('does not handle keyboard shortcuts when modal is open', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.keyDown(document, { key: '?' });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    // Try to flip card while modal is open - should not work
    fireEvent.keyDown(document, { code: 'Space' });

    // Card should still show question (not flipped)
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.queryByText('4')).not.toBeInTheDocument();
  });

  it('displays navigation buttons with keyboard shortcuts', async () => {
    mockUseQuery.mockImplementation((query: any) => {
      if (query.toString().includes('getDeckById')) return mockDeck;
      if (query.toString().includes('getCardsForDeck')) return mockCards;
      return [];
    });

    render(<StudySession deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('←')).toBeInTheDocument();
      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });
});
