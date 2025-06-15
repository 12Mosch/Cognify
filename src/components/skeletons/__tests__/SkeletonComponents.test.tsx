/**
 * Basic tests for skeleton components
 * Note: Full testing requires proper testing library setup
 */

import {
  DeckCardSkeleton,
  DeckListSkeleton,
  FlashcardSkeleton,
  DeckViewSkeleton,
  StatsSkeleton,
  GenericSkeleton
} from '../SkeletonComponents';

// Simple smoke tests to verify components exist and can be imported
describe('SkeletonComponents - Import Tests', () => {
  test('all skeleton components can be imported', () => {
    expect(DeckCardSkeleton).toBeDefined();
    expect(DeckListSkeleton).toBeDefined();
    expect(FlashcardSkeleton).toBeDefined();
    expect(DeckViewSkeleton).toBeDefined();
    expect(StatsSkeleton).toBeDefined();
    expect(GenericSkeleton).toBeDefined();
  });

  test('components are functions', () => {
    expect(typeof DeckCardSkeleton).toBe('function');
    expect(typeof DeckListSkeleton).toBe('function');
    expect(typeof FlashcardSkeleton).toBe('function');
    expect(typeof DeckViewSkeleton).toBe('function');
    expect(typeof StatsSkeleton).toBe('function');
    expect(typeof GenericSkeleton).toBe('function');
  });

});
