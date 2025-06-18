# StudyProgressBar Component

## Overview

The `StudyProgressBar` component provides a comprehensive visual progress indicator for flashcard study sessions. It displays the user's current position within a study session with both numerical and visual feedback, following the existing design system and accessibility guidelines.

## Features

### Visual Progress Indication
- **Current Position Display**: Shows "Card X of Y" format for clear position awareness
- **Percentage Completion**: Displays exact completion percentage in a styled badge
- **Visual Progress Bar**: Animated progress bar that fills as the user progresses
- **Completion Status**: Shows completion indicator with checkmark icon when finished

### Color Coding
- **Blue Theme**: Used for in-progress study sessions
  - Progress bar: `bg-blue-500 dark:bg-blue-400`
  - Text: `text-blue-700 dark:text-blue-300`
  - Background: `bg-blue-50 dark:bg-blue-900/20`
- **Green Theme**: Used for completed study sessions
  - Progress bar: `bg-green-500 dark:bg-green-400`
  - Text: `text-green-700 dark:text-green-300`
  - Background: `bg-green-100 dark:bg-green-900/20`

### Accessibility Features
- **ARIA Attributes**: Proper `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- **Screen Reader Support**: Hidden text descriptions for current progress state
- **Keyboard Navigation**: Fully accessible via keyboard navigation
- **High Contrast**: Colors meet WCAG contrast requirements in both light and dark modes

### Animation & Motion
- **Smooth Transitions**: 500ms ease-out transitions for progress bar width changes
- **Reduced Motion Support**: Respects `prefers-reduced-motion` user preferences
- **Performance Optimized**: Uses CSS transforms for smooth animations

## Component Interface

```typescript
interface StudyProgressBarProps {
  /** Current card position (1-based) */
  currentPosition: number;
  /** Total number of cards in the study session */
  totalCards: number;
  /** Whether the session is completed */
  isCompleted?: boolean;
  /** Additional CSS classes */
  className?: string;
}
```

## Usage Examples

### Basic Usage in Study Mode
```tsx
<StudyProgressBar
  currentPosition={5}
  totalCards={20}
  isCompleted={false}
  className="mb-6"
/>
```

### Completed Session
```tsx
<StudyProgressBar
  currentPosition={20}
  totalCards={20}
  isCompleted={true}
/>
```

## Integration

### BasicStudyMode Integration
The component replaces the simple progress bar in `BasicStudyMode.tsx`:

```tsx
{/* Study Progress Bar */}
<StudyProgressBar
  currentPosition={currentCardIndex + 1}
  totalCards={cards.length}
  isCompleted={currentCardIndex === cards.length - 1}
  className="flex-shrink-0 mb-6"
/>
```

### SpacedRepetitionMode Integration
Added to `SpacedRepetitionMode.tsx` to provide progress feedback:

```tsx
{/* Study Progress Bar */}
<StudyProgressBar
  currentPosition={currentCardIndex + 1}
  totalCards={studyQueue.length}
  isCompleted={currentCardIndex + 1 >= studyQueue.length}
  className="flex-shrink-0 mb-6"
/>
```

## Internationalization

The component uses the following translation keys:

### English (`en/translation.json`)
```json
{
  "study": {
    "progress": {
      "cardPosition": "Card {{current}} of {{total}}",
      "completed": "Complete",
      "aria": "Study progress: {{current}} of {{total}} cards completed, {{percentage}}% done",
      "completedAria": "Study session completed! All {{total}} cards reviewed.",
      "inProgressAria": "Study session in progress: {{current}} of {{total}} cards completed"
    }
  }
}
```

### German (`de/translation.json`)
```json
{
  "study": {
    "progress": {
      "cardPosition": "Karte {{current}} von {{total}}",
      "completed": "Abgeschlossen",
      "aria": "Lernfortschritt: {{current}} von {{total}} Karten bearbeitet, {{percentage}}% erledigt",
      "completedAria": "Lernsitzung abgeschlossen! Alle {{total}} Karten wurden durchgegangen.",
      "inProgressAria": "Lernsitzung läuft: {{current}} von {{total}} Karten bearbeitet"
    }
  }
}
```

## CSS Classes

### Custom Classes
- `.study-progress-container`: Main container with transition support
- `.study-progress-bar`: Progress bar with smooth width transitions

### Animation Support
```css
/* Smooth animations when motion is preferred */
@media (prefers-reduced-motion: no-preference) {
  .study-progress-bar {
    transition: width 0.5s ease-out;
  }
  
  .study-progress-container {
    transition: opacity 0.3s ease-in-out;
  }
}

/* Static fallbacks for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .study-progress-bar,
  .study-progress-container {
    transition: none;
  }
}
```

## Testing

The component includes comprehensive tests covering:

- **Progress Calculation**: Correct percentage calculation for various positions
- **Color Themes**: Proper color application for in-progress vs completed states
- **Accessibility**: ARIA attributes and screen reader support
- **Internationalization**: Translation key resolution
- **Custom Styling**: className prop application

### Test Coverage
- 6 test cases covering all major functionality
- Tests for edge cases (1 of 3, 2 of 3, 3 of 3 scenarios)
- Accessibility compliance verification
- Color theme validation

## Design System Integration

The component follows the existing design patterns:

### Color Palette
- Consistent with the blue-based design system
- Proper dark mode support
- Maintains visual hierarchy with existing components

### Typography
- Uses standard text sizing (`text-sm`, `text-xs`)
- Consistent font weights (`font-medium`, `font-semibold`)
- Proper contrast ratios

### Spacing
- Standard margin/padding using Tailwind spacing scale
- Consistent with other study interface components
- Responsive design considerations

## Performance Considerations

- **Lightweight**: Minimal DOM structure and CSS
- **Optimized Animations**: Hardware-accelerated CSS transitions
- **Efficient Rendering**: React.memo optimization potential
- **Minimal Re-renders**: Stable component structure

## Browser Support

- **Modern Browsers**: Full support for CSS transitions and transforms
- **Accessibility**: Screen reader compatibility across platforms
- **Responsive**: Works on all screen sizes
- **Progressive Enhancement**: Graceful degradation for older browsers
