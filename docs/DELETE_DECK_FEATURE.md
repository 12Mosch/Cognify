# Delete Deck Feature Implementation

## Overview

This document describes the implementation of the "Delete Deck" feature that allows users to permanently remove entire decks and all their associated cards from the flashcard application.

## Features Implemented

### 1. Backend Mutation (`convex/decks.ts`)

- **`deleteDeck` mutation**: Handles the deletion of both the deck and all its associated data in a single transaction
- **Authentication**: Requires user authentication to delete decks
- **Authorization**: Users can only delete their own decks
- **Cascading deletion**: Removes all associated cards, card reviews, and study sessions
- **Image cleanup**: Automatically deletes all images (frontImageId and backImageId) associated with cards in the deck from Convex File Storage
- **Error handling**: Proper error messages for authentication, authorization, and not found cases

### 2. UI Components

#### DeleteDeckConfirmationModal (`src/components/DeleteDeckConfirmationModal.tsx`)
- **Confirmation dialog**: Shows deck name and card count before deletion
- **Accessibility**: Proper ARIA labels, focus management, and keyboard navigation
- **Loading states**: Shows loading indicator during deletion process
- **Error handling**: User-friendly error messages with toast notifications
- **Focus management**: Traps focus within modal and restores focus after closing

#### DeckView Integration
- **Delete button**: Added to deck management header with warning styling
- **Modal integration**: Opens confirmation modal when delete button is clicked
- **Navigation**: Returns to dashboard after successful deletion

#### Dashboard Integration
- **Dropdown menu**: Added "More options" dropdown to each deck card
- **Delete option**: Accessible delete option within dropdown menu
- **Click outside**: Closes dropdown when clicking outside
- **Independent state**: Each deck card manages its own dropdown state

### 3. Translations

Added comprehensive translations for both English and German:

#### English (`src/locales/en/translation.json`)
```json
{
  "deckView": {
    "confirmDeleteDeck": "Are you sure you want to permanently delete this deck and all {{cardCount}} cards? This action cannot be undone.",
    "deleteDeck": "Delete Deck",
    "deleteDeckAria": "Delete deck {{deckName}}"
  },
  "deck": {
    "moreOptionsAria": "More options for {{deckName}} deck"
  },
  "notifications": {
    "deckDeleted": "Deck deleted successfully!",
    "deckDeletedWithName": "\"{{deckName}}\" deleted successfully!"
  }
}
```

#### German (`src/locales/de/translation.json`)
```json
{
  "deckView": {
    "confirmDeleteDeck": "Sind Sie sicher, dass Sie diesen Stapel und alle {{cardCount}} Karten dauerhaft löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    "deleteDeck": "Stapel löschen",
    "deleteDeckAria": "Stapel {{deckName}} löschen"
  },
  "deck": {
    "moreOptionsAria": "Weitere Optionen für {{deckName}} Stapel"
  },
  "notifications": {
    "deckDeleted": "Stapel erfolgreich gelöscht!",
    "deckDeletedWithName": "\"{{deckName}}\" erfolgreich gelöscht!"
  }
}
```

### 4. Analytics Tracking

#### New Analytics Function (`src/lib/analytics.ts`)
```typescript
export function trackDeckDeleted(
  posthog: ReturnType<typeof usePostHog> | null,
  deckId?: string,
  deckName?: string,
  cardCount?: number,
): void {
  trackEvent(posthog, "deck_deleted", {
    cardCount,
    deckId,
    deckName,
  });
}
```

#### Integration in useAnalytics Hook
- Added `trackDeckDeleted` function to the analytics hook
- Tracks successful deck deletions with deck metadata
- Includes card count for analytics insights

### 5. Error Handling & Loading States

#### Error Scenarios Handled
- **Authentication errors**: User not logged in
- **Authorization errors**: User doesn't own the deck
- **Not found errors**: Deck doesn't exist
- **Network errors**: Connection issues with specific messaging
- **Validation errors**: Invalid deck ID

#### Loading States
- **Button states**: Disabled buttons during deletion
- **Visual feedback**: Loading text and opacity changes
- **Prevention**: Prevents modal closing during deletion

### 6. Testing

#### Component Tests (`src/components/__tests__/DeleteDeckConfirmationModal.test.tsx`)
- Modal rendering and visibility
- Accessibility attributes and focus management
- User interactions (click, keyboard navigation)
- Success and error scenarios
- Loading states and validation

#### Dashboard Integration Tests (`src/components/__tests__/Dashboard.delete.test.tsx`)
- Dropdown menu functionality
- Multiple deck card independence
- Click outside behavior
- Modal integration

## Usage

### From Deck View
1. Navigate to a deck's management page
2. Click the red "Delete Deck" button in the header
3. Confirm deletion in the modal dialog
4. User is redirected to dashboard after successful deletion

### From Dashboard
1. Click the "More options" (three dots) button on any deck card
2. Select "Delete Deck" from the dropdown menu
3. Confirm deletion in the modal dialog
4. Dashboard automatically refreshes to show updated deck list

## Image Cleanup Implementation

### Card Deletion (`convex/cards.ts`)

The `deleteCard` mutation has been enhanced to include automatic image cleanup:

- **Image identification**: Checks for both `frontImageId` and `backImageId` on the card being deleted
- **Storage cleanup**: Deletes associated images from Convex File Storage before removing the card from the database
- **Error resilience**: Image deletion failures are logged but don't prevent card deletion
- **Performance**: Batch processes multiple images if both front and back images exist

### Deck Deletion (`convex/decks.ts`)

The `deleteDeck` mutation includes comprehensive image cleanup:

- **Bulk image collection**: Gathers all `frontImageId` and `backImageId` values from all cards in the deck
- **Batch deletion**: Efficiently deletes all collected images from Convex File Storage
- **Error handling**: Individual image deletion failures are logged but don't prevent deck deletion
- **Order of operations**: Images are deleted before cards to ensure proper cleanup sequence

## Security Considerations

- **Authentication required**: Users must be logged in to delete decks
- **Authorization enforced**: Users can only delete their own decks
- **Cascading deletion**: All associated data is properly cleaned up
- **Image cleanup**: All associated images are deleted from Convex File Storage to prevent orphaned files
- **Transaction safety**: All deletions happen in a single transaction

## Accessibility Features

- **ARIA labels**: Proper labeling for screen readers
- **Focus management**: Focus trapping and restoration
- **Keyboard navigation**: Full keyboard support
- **Color contrast**: Warning colors meet accessibility standards
- **Screen reader support**: Descriptive text for all interactive elements

## Performance Considerations

- **Efficient queries**: Uses indexed queries for associated data cleanup
- **Single transaction**: All deletions happen atomically
- **Optimistic updates**: UI updates immediately after successful deletion
- **Error recovery**: Proper error handling prevents inconsistent states

## Future Enhancements

Potential improvements that could be added:

1. **Soft deletion**: Option to archive decks instead of permanent deletion
2. **Bulk deletion**: Select and delete multiple decks at once
3. **Undo functionality**: Temporary recovery option after deletion
4. **Export before delete**: Option to export deck data before deletion
5. **Deletion confirmation**: Require typing deck name for extra confirmation

## Related Files

- `convex/decks.ts` - Backend mutation
- `src/components/DeleteDeckConfirmationModal.tsx` - Confirmation modal
- `src/components/DeckView.tsx` - Deck management integration
- `src/components/Dashboard.tsx` - Dashboard integration
- `src/lib/analytics.ts` - Analytics tracking
- `src/locales/*/translation.json` - Internationalization
- `src/components/__tests__/*` - Test files
