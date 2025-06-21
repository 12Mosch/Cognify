# Toast Notifications System

## Overview

The flashcard app uses a centralized toast notification system built on `react-hot-toast` to provide consistent, accessible user feedback. Toast notifications complement existing inline form validation and provide non-intrusive feedback for user actions.

## Features

- **Consistent Positioning**: All toasts appear in the top-right corner
- **Accessibility**: Proper ARIA attributes and screen reader support
- **Appropriate Timing**: Different durations for different message types
- **Visual Consistency**: Consistent styling with app theme
- **Non-intrusive**: Doesn't interfere with existing inline validation

## Usage

### Basic Toast Functions

```typescript
import { showSuccessToast, showErrorToast, showInfoToast } from '../lib/toast';

// Success messages (4 seconds, green)
showSuccessToast('Operation completed successfully!');

// Error messages (6 seconds, red)
showErrorToast('Something went wrong. Please try again.');

// Info messages (4 seconds, blue)
showInfoToast('Here\'s some helpful information.');
```

### Helper Functions

The `toastHelpers` object provides convenient functions for common actions:

```typescript
import { toastHelpers } from '../lib/toast';

// Deck operations
toastHelpers.deckCreated('My New Deck'); // Shows: "My New Deck" created successfully!
toastHelpers.deckCreated(); // Shows: Deck created successfully!

// Card operations
toastHelpers.cardCreated(); // Shows: Card added successfully!
toastHelpers.cardUpdated(); // Shows: Card updated successfully!

// Study sessions
toastHelpers.studySessionComplete(5); // Shows: Study session complete! Reviewed 5 cards.
toastHelpers.studySessionComplete(); // Shows: Study session completed!

// Achievement notifications
toastHelpers.achievement('Week Warrior', '⚔️'); // Shows: Achievement Unlocked: Week Warrior
toastHelpers.achievement('Getting Started'); // Shows: Achievement Unlocked: Getting Started (with default trophy icon)

// Error handling
toastHelpers.networkError(); // Shows: Network error. Please check your connection and try again.
toastHelpers.temporaryError(); // Shows: Something went wrong. Please try again in a moment.
```

### Achievement Notifications

Achievement toasts have special styling and behavior to celebrate user accomplishments:

```typescript
import { toastHelpers } from '../lib/toast';

// Single achievement
toastHelpers.achievement('Week Warrior', '⚔️');

// Multiple achievements (automatically staggered)
newAchievements.forEach((achievement, index) => {
  setTimeout(() => {
    toastHelpers.achievement(
      achievement.achievement.name,
      achievement.achievement.icon
    );
  }, index * 1500); // 1.5 second delay between each toast
});
```

**Features:**
- **Golden gradient styling** with special border and shadow effects
- **Longer duration** (6 seconds) to allow users to appreciate the achievement
- **Custom icons** from achievement data or default trophy emoji
- **Staggered display** when multiple achievements are unlocked simultaneously
- **Error handling** with console fallback if toast system fails

## Implementation Details

### Configuration

Toasts are configured in `src/App.tsx` with the following settings:

- **Position**: `top-right`
- **Offset**: 80px from top (accounts for header)
- **Max Width**: 400px
- **Border Radius**: 8px
- **Font Size**: 14px

### Toast Types and Timing

| Type | Duration | Icon | Use Case |
|------|----------|------|----------|
| Success | 4 seconds | ✅ | Positive feedback (deck created, card added) |
| Error | 6 seconds | ❌ | Non-critical errors (network issues) |
| Info | 4 seconds | ℹ️ | General information |
| Achievement | 6 seconds | 🏆 (or custom) | Gamification achievements with golden styling |

### Accessibility

All toasts include proper accessibility attributes:

- **Success/Info**: `role="status"` with `aria-live="polite"`
- **Error**: `role="alert"` with `aria-live="assertive"`

## Integration Points

### Form Success Handlers

Toast notifications are integrated into form success callbacks:

```typescript
// Dashboard.tsx
const handleCreateSuccess = (deckName?: string) => {
  toastHelpers.deckCreated(deckName);
};

const handleCardCreateSuccess = () => {
  toastHelpers.cardCreated();
};
```

### Error Handling

All errors show toast notifications alongside inline errors for better user experience:

```typescript
// CreateDeckForm.tsx
catch (err) {
  const errorMessage = err instanceof Error ? err.message : "Failed to create deck";
  setError(errorMessage); // Inline error (preserved)

  // Show error toast for all failures
  // Let the user see the specific error in the inline error display
  showErrorToast("Failed to create deck. Please try again.");
}
```

## Design Principles

### Complementary, Not Replacement

- **Inline validation errors**: Preserved for immediate field-level feedback
- **Toast notifications**: Added for success messages and non-critical errors
- **Modal dialogs**: Still used for critical confirmations (delete actions)

### User Experience

- **Success feedback**: Immediate positive reinforcement for completed actions
- **Error handling**: Non-intrusive error reporting that doesn't block workflow
- **Consistency**: Uniform messaging and timing across the application

### Accessibility First

- **Screen readers**: Proper ARIA roles and live regions
- **Keyboard navigation**: Toasts don't interfere with keyboard workflows
- **Visual indicators**: Clear icons and colors for different message types

## Testing

Unit tests are provided in `src/lib/__tests__/toast.test.ts` covering:

- Basic toast functions
- Helper functions
- Configuration options
- Accessibility attributes
- Message formatting

## Future Enhancements

Potential improvements for the toast system:

1. **Undo Actions**: Add undo functionality for destructive actions
2. **Progress Toasts**: Show progress for long-running operations
3. **Grouped Notifications**: Stack similar notifications
4. **Persistent Toasts**: Option for toasts that don't auto-dismiss
5. **Custom Positioning**: Per-toast positioning options

## Troubleshooting

### Common Issues

1. **Toasts not appearing**: Check that `<Toaster />` is included in App.tsx
2. **Styling issues**: Verify Tailwind classes are available
3. **Accessibility warnings**: Ensure proper ARIA attributes are set

### Performance Considerations

- Toast notifications are lightweight and don't impact app performance
- Automatic cleanup prevents memory leaks
- Minimal bundle size impact (~2KB gzipped)
