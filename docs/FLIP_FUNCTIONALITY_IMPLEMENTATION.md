# Flip Functionality Implementation

## Overview

This document describes the implementation of the flip functionality for flashcards across all study components. The flip feature allows users to toggle between viewing the question side and the answer side of each card during study sessions, enhanced with realistic 3D flip animations.

## Features

### Core Functionality
- **Click-to-flip**: Users can click anywhere on the flashcard to flip between question and answer
- **Keyboard shortcuts**: Space and Enter keys can be used to flip cards
- **3D flip animations**: Realistic 3D card flip animations using CSS transforms
- **Visual transitions**: Smooth CSS transitions with 0.6s duration and cubic-bezier easing
- **State management**: Proper state management ensures flip state resets when navigating between cards
- **Accessibility**: Full keyboard navigation and screen reader support
- **Cross-browser compatibility**: Fallback animations for browsers without 3D transform support

### User Experience
- **Intuitive interaction**: The entire flashcard area is clickable for easy flipping
- **Visual hints**: Clear indication of how to flip cards with helpful text
- **Consistent behavior**: Flip state resets when moving to next/previous cards
- **Responsive design**: Works seamlessly on different screen sizes

## Implementation Details

### State Management
The components use React's `useState` hook to manage:
- `currentCardIndex: number` - Current card position (0-based)
- `isFlipped: boolean` - Whether card shows front (question) or back (answer)
- `sessionStarted: boolean` - Analytics tracking state

### 3D Animation Architecture

#### CSS Structure
The 3D flip animation uses a three-layer structure:
1. **Container** (`.flashcard-container`): Provides perspective for 3D effect
2. **Inner wrapper** (`.flashcard-inner`): The element that actually rotates
3. **Sides** (`.flashcard-front`, `.flashcard-back`): Individual card faces

#### CSS Classes
```css
.flashcard-container {
  perspective: 1000px;
  transform-style: preserve-3d;
}

.flashcard-inner {
  transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard-inner.flipped {
  transform: rotateY(180deg);
}

.flashcard-side {
  backface-visibility: hidden;
}

.flashcard-front {
  transform: rotateY(0deg);
}

.flashcard-back {
  transform: rotateY(180deg);
}
```

#### Browser Compatibility
- **Modern browsers**: Full 3D transform support with hardware acceleration
- **Fallback**: Opacity-based transitions for browsers without 3D transform support
- **Performance**: Uses CSS transforms for optimal performance

### Key Functions

#### `handleFlipCard()`
```typescript
const handleFlipCard = () => {
  setIsFlipped(!isFlipped);
};
```
Toggles between front and back of the current card.

#### `handleKeyDown(event: React.KeyboardEvent)`
```typescript
const handleKeyDown = (event: React.KeyboardEvent) => {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    handleFlipCard();
  }
};
```
Handles keyboard shortcuts for flipping cards. Supports Space and Enter keys.

#### Navigation Functions
- `handleNextCard()` - Advances to next card and resets flip state
- `handlePreviousCard()` - Goes to previous card and resets flip state

### UI Components

#### 3D Flashcard Structure
```typescript
<div
  className="flashcard-container min-h-[300px] cursor-pointer"
  onClick={handleFlipCard}
  onKeyDown={handleKeyDown}
  tabIndex={0}
  role="button"
  aria-label={isFlipped ? "Click to show question" : "Click to show answer"}
>
  <div className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}>
    {/* Front side (Question) */}
    <div className="flashcard-side flashcard-front bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col justify-center items-center text-center">
      <div className="mb-6 pointer-events-none">
        <h2 className="text-lg font-semibold mb-4">Question</h2>
        <p className="text-xl">{currentCard.front}</p>
      </div>
    </div>

    {/* Back side (Answer) */}
    <div className="flashcard-side flashcard-back bg-slate-50 dark:bg-slate-800 p-8 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors flex flex-col justify-center items-center text-center">
      <div className="mb-6 pointer-events-none">
        <h2 className="text-lg font-semibold mb-4">Answer</h2>
        <p className="text-xl">{currentCard.back}</p>
      </div>
    </div>
  </div>
</div>
```

Key features:
- **3D Container**: `.flashcard-container` provides perspective for 3D effect
- **Rotating Inner**: `.flashcard-inner` rotates on Y-axis when flipped
- **Dual Sides**: Both front and back are always rendered but only one is visible
- **Smooth Animation**: 0.6s transition with cubic-bezier easing
- **Accessibility**: Maintains keyboard navigation and screen reader support
- **Pointer Events**: `pointer-events-none` on content prevents interference with flip interaction

#### User Guidance
```typescript
<div className="text-sm text-slate-500 dark:text-slate-400 mb-4 pointer-events-none">
  Click anywhere or press Space/Enter to flip
</div>
```

Provides clear instructions for users on how to interact with the flashcard.

## Accessibility Features

### Keyboard Navigation
- **Tab navigation**: Flashcard is focusable with Tab key
- **Space/Enter activation**: Standard keyboard shortcuts for button activation
- **Focus indicators**: Visual focus indicators for keyboard users

### Screen Reader Support
- **Role attributes**: `role="button"` indicates interactive element
- **ARIA labels**: Dynamic labels describe current state and available actions
- **Semantic structure**: Proper heading hierarchy and content structure

### Visual Accessibility
- **High contrast**: Clear visual distinction between question and answer states
- **Hover states**: Visual feedback for mouse users
- **Transition animations**: Smooth transitions that don't cause motion sickness

## Integration with Existing Components

### StudySession Component
The flip functionality is fully integrated into the existing StudySession component:
- Maintains all existing navigation features
- Preserves analytics tracking
- Works with existing progress tracking
- Compatible with deck loading and error states

### Consistent with Other Study Modes
The implementation follows the same patterns used in:
- `StudyMode.tsx` - Uses identical `isFlipped` state pattern
- `SpacedRepetitionMode.tsx` - Consistent flip behavior
- `DeckView.tsx` - Similar card interaction patterns

## Testing Strategy

### Manual Testing
1. **Basic flip functionality**
   - Click on flashcard to flip between question and answer
   - Verify content changes correctly
   - Test on different screen sizes

2. **Keyboard navigation**
   - Tab to flashcard and press Space to flip
   - Tab to flashcard and press Enter to flip
   - Verify focus indicators are visible

3. **Navigation integration**
   - Flip card, then navigate to next card
   - Verify flip state resets to question
   - Test with previous card navigation

4. **Accessibility testing**
   - Test with screen reader
   - Verify ARIA labels are announced correctly
   - Test keyboard-only navigation

### Automated Testing
The component includes comprehensive unit tests covering:
- Flip functionality with click and keyboard events
- State management and navigation
- Accessibility attributes
- Loading and error states

## Browser Compatibility

The flip functionality uses standard web technologies:
- **CSS Transitions**: Supported in all modern browsers
- **React Event Handlers**: Standard React patterns
- **Keyboard Events**: Standard DOM events
- **ARIA Attributes**: Widely supported accessibility features

## Performance Considerations

- **Minimal re-renders**: State changes are optimized to minimize unnecessary renders
- **CSS transitions**: Hardware-accelerated transitions for smooth animations
- **Event delegation**: Efficient event handling without memory leaks
- **Accessibility**: No performance impact from accessibility features

## Recent Enhancements

### ✅ 3D Flip Animations (Implemented)
- **Realistic 3D effect**: Cards now flip with a realistic 3D rotation animation
- **Hardware acceleration**: Uses CSS transforms for optimal performance
- **Cross-browser support**: Includes fallback animations for older browsers
- **Smooth transitions**: 0.6s duration with cubic-bezier easing function

## Future Enhancements

Potential improvements for the flip functionality:
1. **Gesture support**: Touch gestures for mobile devices (swipe to flip)
2. **Customizable shortcuts**: User-configurable keyboard shortcuts
3. **Audio feedback**: Optional sound effects for flips
4. **Animation preferences**: User setting to disable animations for accessibility
5. **Custom flip directions**: Vertical flip or other animation styles
