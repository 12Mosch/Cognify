# Spaced Repetition Implementation

## Overview

This document describes the implementation of the Spaced Repetition study mode using the SuperMemo-2 (SM-2) algorithm for optimal flashcard scheduling.

## Features

### Core Functionality
- **SM-2 Algorithm**: Implements the proven SuperMemo-2 algorithm for optimal spaced repetition scheduling
- **Quality-Based Reviews**: Users rate their performance on a 0-5 scale (Again, Hard, Good, Easy)
- **Intelligent Queue Management**: Prioritizes due cards over new cards with configurable daily limits
- **Long-term Retention Focus**: Optimizes for memory retention rather than short-term completion

### User Experience
- **Clean Interface**: Distraction-free study environment without progress counters
- **Intuitive Controls**: Simple flip-and-rate workflow
- **Responsive Design**: Works seamlessly across all device sizes
- **Accessibility**: Full ARIA support and keyboard navigation

## Technical Implementation

### Database Schema Updates

The cards table has been extended with spaced repetition fields and optimized indexes:

```typescript
cards: defineTable({
  // Existing fields
  deckId: v.id("decks"),
  front: v.string(),
  back: v.string(),

  // Spaced repetition fields (initialized when cards are created)
  repetition: v.optional(v.number()),    // Number of successful repetitions (default: 0)
  easeFactor: v.optional(v.number()),    // Ease factor for scheduling (default: 2.5)
  interval: v.optional(v.number()),      // Days until next review (default: 1)
  dueDate: v.optional(v.number()),       // Unix timestamp when card is due
}).index("by_deckId", ["deckId"])        // Index for efficient queries by deck
  .index("by_dueDate", ["dueDate"])      // Index for spaced repetition due date queries
  .index("by_deckId_and_dueDate", ["deckId", "dueDate"]) // Compound index for deck-specific due cards
  .index("by_deckId_and_repetition", ["deckId", "repetition"]), // Index for finding new cards efficiently
```

### Performance Optimizations

**Efficient New Card Queries**: Added a compound index `by_deckId_and_repetition` to enable efficient database-level filtering of new cards (repetition = 0) without requiring in-memory filtering. This dramatically improves performance for large decks.

**Automatic Field Initialization**: New cards are created with spaced repetition fields pre-initialized to ensure optimal query performance and eliminate the need for lazy initialization.

**Unified Study Queue**: The `getStudyQueue` API combines due cards and new cards in a single, intelligent query that:
- Prioritizes due cards (highest learning priority)
- Fills remaining slots with new cards up to daily limit
- Optionally shuffles the queue for varied study experience
- Eliminates client-side complexity of managing separate queries
- Reduces network requests from 2 to 1 per study session

**Optimized Next Review Queries**: The `getNextReviewInfo` function has been optimized for O(1) performance:
- **Before**: Fetched ALL reviewed cards (O(n)) and looped through them in memory to find earliest future due date
- **After**: Uses compound index `by_deckId_and_dueDate` with database-level filtering (`dueDate > now`) and `.first()` to get only the earliest future due card in O(1) time
- **Memory Usage**: Reduced from fetching all reviewed cards to fetching only a single card
- **Query Performance**: Scales efficiently regardless of deck size
- **Database Optimization**: Leverages deck.cardCount field instead of querying all cards for total count

### SM-2 Algorithm Implementation

The algorithm is implemented in `convex/spacedRepetition.ts`:

```typescript
function calculateSM2(quality, repetition, easeFactor, interval) {
  // If quality < 3, reset the card (failed review)
  if (quality < 3) {
    newRepetition = 0;
    newInterval = 1;
    // Keep the current ease factor unchanged for failed reviews
  } else {
    // Successful review - increment repetition
    newRepetition = repetition + 1;

    // Calculate new interval based on repetition count
    if (newRepetition === 1) {
      newInterval = 1;
    } else if (newRepetition === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }

    // Update ease factor based on quality (only for successful reviews)
    newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Ensure ease factor doesn't go below 1.3
    if (newEaseFactor < 1.3) {
      newEaseFactor = 1.3;
    }
  }

  return { repetition, easeFactor, interval, dueDate };
}
```

### Algorithm Correctness

**Proper Ease Factor Handling**: The ease factor is only updated on successful reviews (quality >= 3), following the standard SM-2 algorithm. This prevents cards from getting permanently stuck at low ease factors due to early failures.

### Quality Scale

- **0 (Again)**: Complete blackout, incorrect response
- **3 (Hard)**: Correct response with serious difficulty  
- **4 (Good)**: Correct response after some hesitation
- **5 (Easy)**: Perfect response, no hesitation

### Study Queue Logic

1. **Primary Queue**: Cards where `dueDate <= today` (review queue)
2. **Secondary Queue**: New cards (`repetition === 0`) with daily limit (default 20)
3. **No Progress Indicators**: Prevents "grinding" behavior and maintains focus

### Enhanced "All Caught Up" State

When no cards are due for review, the interface provides encouraging and informative feedback:

**Session Statistics**: Displays the number of cards reviewed in the current session with positive reinforcement messaging.

**Next Review Information**: Shows when the next cards will be due using user-friendly formatting:
- "tomorrow" for next day reviews
- "in X hours" for same-day reviews
- "on [date]" for future dates
- Handles empty decks with appropriate messaging

**Positive Reinforcement**: Uses encouraging language that acknowledges the user's progress and maintains motivation for continued learning.

**Visual Design**: Uses color-coded information boxes to clearly communicate different types of information (session stats, next review timing, deck status).

## File Structure

```
src/
├── components/
│   ├── SpacedRepetitionMode.tsx      # Main spaced repetition study interface
│   ├── StudyModeSelector.tsx         # Study mode selection component
│   ├── Dashboard.tsx                 # Updated to support multiple study modes
│   └── __tests__/
│       ├── SpacedRepetitionMode.test.tsx
│       └── StudyModeSelector.test.tsx
convex/
├── spacedRepetition.ts               # SM-2 algorithm and spaced repetition logic
├── schema.ts                         # Updated database schema
└── cards.ts                          # Updated to include spaced repetition fields
docs/
└── SPACED_REPETITION_IMPLEMENTATION.md
```

## API Functions

### Mutations

- `reviewCard(cardId, quality)`: Review a card and update its scheduling parameters
- `initializeCardForSpacedRepetition(cardId)`: Initialize existing cards with default values

### Queries

- `getStudyQueue(deckId, maxCards?, shuffle?)`: **Primary API** - Get a unified study queue combining due cards and new cards, with optional shuffling for varied experience
- `getStudyQueueStats(deckId)`: Get statistics about the study queue (due count, new count, total study cards)
- `getNextReviewInfo(deckId)`: **Performance Optimized** - Get next review information using O(1) indexed queries for earliest due date and deck statistics for enhanced "All Caught Up" messaging
- `getDueCardsForDeck(deckId)`: Get cards that are due for review using efficient compound index
- `getNewCardsForDeck(deckId, limit?)`: **Deprecated** - Use `getStudyQueue` instead for unified experience

## Usage

### Starting a Spaced Repetition Session

1. User clicks "Study" on a deck
2. StudyModeSelector appears with two options:
   - Basic Study (existing functionality)
   - Spaced Repetition (new feature)
3. User selects "Spaced Repetition"
4. SpacedRepetitionMode component loads unified study queue with intelligent card mixing

### Study Flow

1. Card is displayed (question side)
2. User clicks "Show Answer" to flip card
3. User rates their performance:
   - Again (0): Card will be shown again soon
   - Hard (3): Card scheduled with reduced ease
   - Good (4): Card scheduled normally
   - Easy (5): Card scheduled with increased ease
4. Next card is shown automatically
5. Session ends when all cards are reviewed

## Configuration

### Daily New Card Limit

Default: 20 cards per day
- Configurable per user (future enhancement)
- Prevents overwhelming new users
- Maintains sustainable study habits

### Default Values for New Cards

- `repetition`: 0 (new card)
- `easeFactor`: 2.5 (standard starting value)
- `interval`: 1 (review tomorrow)
- `dueDate`: Current timestamp (available immediately)

## Benefits

### For Users
- **Improved Retention**: Scientific approach to memory consolidation
- **Efficient Study Time**: Focus on cards that need attention
- **Reduced Cognitive Load**: No need to decide which cards to study
- **Long-term Learning**: Optimized for permanent knowledge retention

### For the Application
- **Backward Compatibility**: Existing study mode remains unchanged
- **Scalable Architecture**: Clean separation of concerns
- **Data-Driven Insights**: Rich scheduling data for future analytics
- **User Engagement**: More effective learning leads to higher retention

## Future Enhancements

### Planned Features
- **User Settings**: Configurable daily new card limits
- **Study Statistics**: Track learning progress and retention rates
- **Advanced Scheduling**: Custom intervals and ease factor adjustments
- **Deck-Specific Settings**: Different parameters per deck

### Analytics Integration
- Track spaced repetition usage patterns
- Measure retention improvements
- A/B test different algorithm parameters
- Monitor user engagement with the feature

## Testing

### Unit Tests
- SM-2 algorithm correctness
- Component rendering and interactions
- Error handling and edge cases
- Accessibility compliance

### Integration Tests
- End-to-end study session flow
- Database operations and data consistency
- Cross-browser compatibility
- Performance under load

## Conclusion

The Spaced Repetition implementation provides a scientifically-backed approach to flashcard learning that optimizes for long-term retention while maintaining a clean, user-friendly interface. The modular design ensures backward compatibility while enabling future enhancements and customization options.
