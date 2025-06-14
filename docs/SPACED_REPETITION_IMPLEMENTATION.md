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

The cards table has been extended with spaced repetition fields:

```typescript
cards: defineTable({
  // Existing fields
  deckId: v.id("decks"),
  front: v.string(),
  back: v.string(),
  
  // New spaced repetition fields
  repetition: v.optional(v.number()),    // Number of successful repetitions
  easeFactor: v.optional(v.number()),    // Ease factor for scheduling (default: 2.5)
  interval: v.optional(v.number()),      // Days until next review
  dueDate: v.optional(v.number()),       // Unix timestamp when card is due
})
```

### SM-2 Algorithm Implementation

The algorithm is implemented in `convex/spacedRepetition.ts`:

```typescript
function calculateSM2(quality, repetition, easeFactor, interval) {
  // If quality < 3, reset the card (failed review)
  if (quality < 3) {
    newRepetition = 0;
    newInterval = 1;
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
  }
  
  // Update ease factor based on quality
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  // Ensure ease factor doesn't go below 1.3
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }
  
  return { repetition, easeFactor, interval, dueDate };
}
```

### Quality Scale

- **0 (Again)**: Complete blackout, incorrect response
- **3 (Hard)**: Correct response with serious difficulty  
- **4 (Good)**: Correct response after some hesitation
- **5 (Easy)**: Perfect response, no hesitation

### Study Queue Logic

1. **Primary Queue**: Cards where `dueDate <= today` (review queue)
2. **Secondary Queue**: New cards (`repetition === 0`) with daily limit (default 20)
3. **No Progress Indicators**: Prevents "grinding" behavior and maintains focus

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

- `getDueCardsForDeck(deckId)`: Get cards that are due for review
- `getNewCardsForDeck(deckId, limit?)`: Get new cards with daily limit

## Usage

### Starting a Spaced Repetition Session

1. User clicks "Study" on a deck
2. StudyModeSelector appears with two options:
   - Basic Study (existing functionality)
   - Spaced Repetition (new feature)
3. User selects "Spaced Repetition"
4. SpacedRepetitionMode component loads with due cards and new cards

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
