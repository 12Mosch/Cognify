/**
 * Tests for BasicStudyMode component
 * These tests verify the basic study session interface works correctly with keyboard shortcuts
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BasicStudyMode from '../BasicStudyMode';
import { Id } from '../../../convex/_generated/dataModel';

// Mock Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
}));

// Mock analytics
jest.mock('../../lib/analytics', () => ({
  useAnalytics: () => ({
    trackStudySessionStarted: jest.fn(),
    trackCardFlipped: jest.fn(),
  }),
}));

const mockUseQuery = jest.mocked(jest.requireMock('convex/react').useQuery);
const mockDeckId = 'test-deck-id' as Id<"decks">;
const mockOnExit = jest.fn();

// Helper function to setup mocks for successful data loading
const setupSuccessfulMocks = () => {
  // Reset the mock completely and set up fresh implementation
  mockUseQuery.mockReset();

  // Use cycling values approach that's resilient to React StrictMode double-rendering
  // This pattern is used successfully in SpacedRepetitionMode tests
  let callCount = 0;
  const mockValues = [mockDeck, mockCards]; // deck query first, then cards query

  mockUseQuery.mockImplementation(() => {
    const value = mockValues[callCount % mockValues.length];
    callCount++;
    return value;
  });
};

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

describe('BasicStudyMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when data is not loaded', () => {
    mockUseQuery.mockImplementation(() => undefined);

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    // Check for skeleton loading state instead of specific text
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading flashcard')).toBeInTheDocument();
  });

  it('renders study interface with cards and help icon', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('Test Deck')).toBeInTheDocument();
    });

    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByLabelText('Show keyboard shortcuts help')).toBeInTheDocument();
  });

  it('flips card when Space key is pressed', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Space key
    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('flips card when Enter key is pressed', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Enter key (fix the key value)
    fireEvent.keyDown(document, { code: 'Enter', key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('navigates to next card when Right Arrow key is pressed', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press Right Arrow key (fix the key value)
    fireEvent.keyDown(document, { code: 'ArrowRight', key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
  });

  it('navigates to previous card when Left Arrow key is pressed', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Go to second card first
    fireEvent.keyDown(document, { code: 'ArrowRight', key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    });

    // Press Left Arrow key to go back (fix the key value)
    fireEvent.keyDown(document, { code: 'ArrowLeft', key: 'ArrowLeft' });

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    expect(screen.getByText('Card 1 of 2')).toBeInTheDocument();
  });

  it('opens keyboard shortcuts modal when ? key is pressed', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Press ? key (Shift + /)
    fireEvent.keyDown(document, { key: '?', shiftKey: true });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });
  });

  it('opens keyboard shortcuts modal when help icon is clicked', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

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
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.keyDown(document, { key: '?', shiftKey: true });

    await waitFor(() => {
      expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    });

    // Try to flip card while modal is open - should not work
    fireEvent.keyDown(document, { code: 'Space', key: ' ' });

    // Card should still show question (not flipped) - check aria-label indicates it's showing question
    expect(screen.getByRole('button', { name: 'Click to show answer' })).toBeInTheDocument();
  });

  it('displays navigation buttons with keyboard shortcuts', async () => {
    setupSuccessfulMocks();

    render(<BasicStudyMode deckId={mockDeckId} onExit={mockOnExit} />);

    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('←')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });
});
