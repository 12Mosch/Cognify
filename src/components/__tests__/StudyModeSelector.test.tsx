/**
 * Tests for StudyModeSelector component
 * These tests verify the study mode selection interface works correctly
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { StudyModeSelector } from '../StudyModeSelector';
import { Id } from '../../../convex/_generated/dataModel';

const mockDeckId = 'test-deck-id' as Id<"decks">;
const mockDeckName = 'Test Deck';
const mockOnSelectMode = jest.fn();
const mockOnCancel = jest.fn();

describe('StudyModeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders study mode selection interface', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Choose Study Mode')).toBeInTheDocument();
    expect(screen.getByText(/How would you like to study Test Deck/)).toBeInTheDocument();
    expect(screen.getByText('Basic Study')).toBeInTheDocument();
    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('displays basic study mode information', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Basic Study')).toBeInTheDocument();
    expect(screen.getByText(/Review all cards in sequence/)).toBeInTheDocument();
    expect(screen.getByText('Sequential')).toBeInTheDocument();
    expect(screen.getByText('All Cards')).toBeInTheDocument();
    expect(screen.getByText('Quick Review')).toBeInTheDocument();
  });

  it('displays spaced repetition mode information', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText(/Intelligent scheduling based on the SM-2 algorithm/)).toBeInTheDocument();
    expect(screen.getByText('SM-2 Algorithm')).toBeInTheDocument();
    expect(screen.getByText('Optimal Timing')).toBeInTheDocument();
    expect(screen.getByText('Long-term Retention')).toBeInTheDocument();
  });

  it('displays information about spaced repetition', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('About Spaced Repetition')).toBeInTheDocument();
    expect(screen.getByText(/Spaced repetition is a learning technique/)).toBeInTheDocument();
  });

  it('calls onSelectMode with basic when basic study is clicked', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    const basicStudyCard = screen.getByText('Basic Study').closest('div');
    if (basicStudyCard) {
      fireEvent.click(basicStudyCard);
    }

    expect(mockOnSelectMode).toHaveBeenCalledWith('basic');
  });

  it('calls onSelectMode with spaced-repetition when spaced repetition is clicked', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    const spacedRepetitionCard = screen.getByText('Spaced Repetition').closest('div');
    if (spacedRepetitionCard) {
      fireEvent.click(spacedRepetitionCard);
    }

    expect(mockOnSelectMode).toHaveBeenCalledWith('spaced-repetition');
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(
      <StudyModeSelector
        deckId={mockDeckId}
        deckName={mockDeckName}
        onSelectMode={mockOnSelectMode}
        onCancel={mockOnCancel}
      />
    );

    // Check that clickable elements are properly structured
    const basicStudyCard = screen.getByText('Basic Study').closest('div');
    const spacedRepetitionCard = screen.getByText('Spaced Repetition').closest('div');

    expect(basicStudyCard).toHaveClass('cursor-pointer');
    expect(spacedRepetitionCard).toHaveClass('cursor-pointer');
  });
});
