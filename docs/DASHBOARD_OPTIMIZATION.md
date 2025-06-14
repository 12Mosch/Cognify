# Dashboard Data Fetching Optimization

## Overview

This document describes the optimization implemented to improve Dashboard performance by eliminating the N+1 query problem when displaying deck card counts.

## Problem

Previously, the `DeckCard` component in `Dashboard.tsx` was making individual queries to fetch all cards for each deck just to display the card count:

```typescript
// Before optimization - inefficient
const cards = useQuery(api.cards.getCardsForDeck, { deckId: deck._id });
// Then using: cards.length
```

This resulted in:
- 1 query to fetch all decks for the user
- N additional queries to fetch cards for each deck (where N = number of decks)
- Poor performance with large numbers of decks or cards
- Unnecessary data transfer (fetching full card objects just for counting)

## Solution

Implemented a `cardCount` field directly on deck documents that is maintained automatically:

### Backend Changes

1. **Schema Update** (`convex/schema.ts`):
   - Added `cardCount: v.number()` field to the decks table

2. **Deck Queries** (`convex/decks.ts`):
   - Updated `getDecksForUser` return type to include `cardCount`
   - Modified `createDeck` to initialize `cardCount: 0`

3. **Card Mutations** (`convex/cards.ts`):
   - Updated `addCardToDeck` to increment deck's `cardCount`
   - Updated `deleteCard` to decrement deck's `cardCount`

### Frontend Changes

4. **Dashboard Component** (`src/components/Dashboard.tsx`):
   - Updated `Deck` interface to include `cardCount: number`
   - Modified `DeckCard` to use `deck.cardCount` instead of querying cards
   - Removed the expensive `useQuery(api.cards.getCardsForDeck)` call

## Performance Benefits

- **Reduced Queries**: From N+1 queries to just 1 query
- **Faster Loading**: Card counts are immediately available with deck data
- **Better Scalability**: Performance doesn't degrade with more decks or cards
- **Reduced Bandwidth**: No longer fetching full card objects for counting

## Data Consistency

The `cardCount` field is automatically maintained by:
- Incrementing when cards are added via `addCardToDeck`
- Decrementing when cards are deleted via `deleteCard`
- Using `Math.max(0, count - 1)` to prevent negative counts

## Migration

For existing data, a migration script is provided at `convex/migrations/addCardCountToDecks.ts`:

```typescript
// Run this once after deploying schema changes
import { addCardCountToDecks } from "./convex/migrations/addCardCountToDecks";
```

The migration:
1. Finds decks without `cardCount` field
2. Counts actual cards for each deck
3. Updates decks with correct `cardCount` values

## Testing

- All existing functionality remains unchanged
- Card counts are displayed correctly
- Performance improvements are immediately visible
- Linting passes with no issues

## Future Considerations

This pattern can be extended to other aggregate data:
- Due cards count for spaced repetition
- Study session statistics
- Last studied timestamps

The key principle is storing frequently-accessed aggregate data directly on parent documents rather than computing it on every query.
