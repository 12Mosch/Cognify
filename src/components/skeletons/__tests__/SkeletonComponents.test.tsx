/**
 * Tests for skeleton components
 */

import { render, screen } from '@testing-library/react';
import {
  DeckCardSkeleton,
  DeckListSkeleton,
  FlashcardSkeleton,
  DeckViewSkeleton,
  StatsSkeleton,
  GenericSkeleton,
  HeatmapSkeleton
} from '../SkeletonComponents';

describe('SkeletonComponents', () => {
  describe('Import Tests', () => {
    test('all skeleton components can be imported', () => {
      expect(DeckCardSkeleton).toBeDefined();
      expect(DeckListSkeleton).toBeDefined();
      expect(FlashcardSkeleton).toBeDefined();
      expect(DeckViewSkeleton).toBeDefined();
      expect(StatsSkeleton).toBeDefined();
      expect(GenericSkeleton).toBeDefined();
      expect(HeatmapSkeleton).toBeDefined();
    });

    test('components are valid React components', () => {
      // React.memo components have $$typeof property
      expect(DeckCardSkeleton).toHaveProperty('$$typeof');
      expect(DeckListSkeleton).toHaveProperty('$$typeof');
      expect(FlashcardSkeleton).toHaveProperty('$$typeof');
      expect(DeckViewSkeleton).toHaveProperty('$$typeof');
      expect(StatsSkeleton).toHaveProperty('$$typeof');
      expect(GenericSkeleton).toHaveProperty('$$typeof');
      expect(HeatmapSkeleton).toHaveProperty('$$typeof');
    });
  });

  describe('Rendering Tests', () => {
    test('DeckCardSkeleton renders with proper accessibility attributes', () => {
      render(<DeckCardSkeleton />);

      const skeleton = screen.getByLabelText('Loading deck');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('DeckListSkeleton renders with default count', () => {
      render(<DeckListSkeleton />);

      const skeleton = screen.getByLabelText('Loading decks');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('DeckListSkeleton renders with custom count', () => {
      render(<DeckListSkeleton count={3} />);

      const skeleton = screen.getByLabelText('Loading decks');
      expect(skeleton).toBeInTheDocument();
    });

    test('FlashcardSkeleton renders with proper accessibility attributes', () => {
      render(<FlashcardSkeleton />);

      const skeleton = screen.getByLabelText('Loading flashcard');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('DeckViewSkeleton renders with default card count', () => {
      render(<DeckViewSkeleton />);

      const skeleton = screen.getByLabelText('Loading deck view');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('DeckViewSkeleton renders with custom card count', () => {
      render(<DeckViewSkeleton cardCount={4} />);

      const skeleton = screen.getByLabelText('Loading deck view');
      expect(skeleton).toBeInTheDocument();
    });

    test('StatsSkeleton renders with proper accessibility attributes', () => {
      render(<StatsSkeleton />);

      const skeleton = screen.getByLabelText('Loading statistics');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('HeatmapSkeleton renders with proper accessibility attributes', () => {
      render(<HeatmapSkeleton />);

      const skeleton = screen.getByLabelText('Loading study history heatmap');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('GenericSkeleton renders with default type', () => {
      render(<GenericSkeleton />);

      const skeleton = screen.getByLabelText('Loading');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('GenericSkeleton renders with deck-list type', () => {
      render(<GenericSkeleton type="deck-list" />);

      const skeleton = screen.getByLabelText('Loading decks');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('GenericSkeleton renders with flashcard type', () => {
      render(<GenericSkeleton type="flashcard" />);

      const skeleton = screen.getByLabelText('Loading flashcard');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    test('GenericSkeleton renders with deck-view type', () => {
      render(<GenericSkeleton type="deck-view" />);

      const skeleton = screen.getByLabelText('Loading deck view');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
    });
  });

  describe('Accessibility Tests', () => {
    test('all skeleton components have proper ARIA attributes', () => {
      const components = [
        { Component: DeckCardSkeleton, label: 'Loading deck' },
        { Component: DeckListSkeleton, label: 'Loading decks' },
        { Component: FlashcardSkeleton, label: 'Loading flashcard' },
        { Component: DeckViewSkeleton, label: 'Loading deck view' },
        { Component: StatsSkeleton, label: 'Loading statistics' },
        { Component: HeatmapSkeleton, label: 'Loading study history heatmap' }
      ];

      components.forEach(({ Component, label }) => {
        const { unmount } = render(<Component />);

        const skeleton = screen.getByLabelText(label);
        expect(skeleton).toHaveAttribute('aria-busy', 'true');
        expect(skeleton).toHaveAttribute('role', 'status');

        unmount();
      });
    });

    test('skeleton components render without errors', () => {
      // Test that all skeleton components can render without throwing errors
      const components = [
        DeckCardSkeleton,
        DeckListSkeleton,
        FlashcardSkeleton,
        DeckViewSkeleton,
        StatsSkeleton,
        HeatmapSkeleton
      ];

      components.forEach((Component) => {
        expect(() => render(<Component />)).not.toThrow();
      });
    });
  });
});
