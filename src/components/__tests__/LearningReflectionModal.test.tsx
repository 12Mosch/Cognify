import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LearningReflectionModal from '../LearningReflectionModal';
import { showErrorToast } from '../../lib/toast';

// Mock the toast function
jest.mock('../../lib/toast', () => ({
  showErrorToast: jest.fn(),
}));

// Mock the Convex hooks
jest.mock('convex/react', () => ({
  useQuery: jest.fn(() => []),
  useMutation: jest.fn(() => jest.fn()),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  sessionContext: {
    deckId: 'test-deck-id' as any,
    cardsReviewed: 5,
    sessionDuration: 300,
    averageSuccess: 0.7,
  },
  sessionId: 'test-session-id',
};

const mockUseQuery = jest.mocked(jest.requireMock('convex/react').useQuery);
const mockUseMutation = jest.mocked(jest.requireMock('convex/react').useMutation);

describe('LearningReflectionModal Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error toast when reflection save fails', async () => {
    // Mock successful queries - return prompts for the first call
    mockUseQuery.mockReturnValueOnce([
      {
        category: 'difficulty',
        prompt: 'What made this material challenging?',
        priority: 'high',
      },
    ]).mockReturnValue([]); // Return empty array for other queries

    // Mock failing mutation
    const mockSaveReflection = jest.fn().mockRejectedValue(new Error('Network error'));
    mockUseMutation.mockReturnValue(mockSaveReflection);

    render(<LearningReflectionModal {...mockProps} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Learning Reflection')).toBeInTheDocument();
    });

    // Select a prompt
    const promptButton = screen.getByText('What made this material challenging?');
    fireEvent.click(promptButton);

    // Fill in response
    const textarea = screen.getByPlaceholderText('Share your thoughts and insights...');
    fireEvent.change(textarea, { target: { value: 'Test reflection response' } });

    // Submit the form
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    // Wait for the error to be handled
    await waitFor(() => {
      expect(mockSaveReflection).toHaveBeenCalled();
    });

    // Verify that the error toast was shown
    await waitFor(() => {
      expect(showErrorToast).toHaveBeenCalledWith('Failed to save reflection. Please try again.');
    });
  });

  it('does not show error toast when reflection save succeeds', async () => {
    // Mock successful queries - return prompts for the first call
    mockUseQuery.mockReturnValueOnce([
      {
        category: 'difficulty',
        prompt: 'What made this material challenging?',
        priority: 'high',
      },
    ]).mockReturnValue([]); // Return empty array for other queries

    // Mock successful mutation
    const mockSaveReflection = jest.fn().mockResolvedValue(undefined);
    mockUseMutation.mockReturnValue(mockSaveReflection);

    render(<LearningReflectionModal {...mockProps} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Learning Reflection')).toBeInTheDocument();
    });

    // Select a prompt
    const promptButton = screen.getByText('What made this material challenging?');
    fireEvent.click(promptButton);

    // Fill in response
    const textarea = screen.getByPlaceholderText('Share your thoughts and insights...');
    fireEvent.change(textarea, { target: { value: 'Test reflection response' } });

    // Submit the form
    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    // Wait for the success to be handled
    await waitFor(() => {
      expect(mockSaveReflection).toHaveBeenCalled();
    });

    // Verify that no error toast was shown
    expect(showErrorToast).not.toHaveBeenCalled();
  });
});
