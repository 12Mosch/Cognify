# StudyMode Component Implementation

## Overview

The `StudyMode` component provides a basic study interface for flashcards, allowing users to review cards one at a time with a simple flip-and-advance workflow. This component is designed to be a simplified alternative to the existing `StudySession` component, focusing on core study functionality without advanced features.

## Features

### Core Functionality
- **Card Display**: Shows flashcards one at a time with front/back content
- **Card Flipping**: Toggle between question (front) and answer (back) sides
- **Sequential Navigation**: Advance through cards with automatic looping
- **Progress Tracking**: Visual progress bar and card counter
- **Deck Integration**: Fetches cards from existing deck management system

### User Experience
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Loading States**: Smooth loading experience with skeleton animations
- **Error Handling**: Graceful handling of missing decks or empty card sets
- **Accessibility**: Full ARIA support and keyboard navigation
- **Visual Feedback**: Hover states and smooth transitions

## Technical Implementation

### Component Structure
```typescript
interface StudyModeProps {
  deckId: Id<"decks">;  // Deck to study
  onExit: () => void;   // Exit callback
}
```

### State Management
The component uses React's `useState` hook to manage:
- `currentCardIndex: number` - Current card position (0-based)
- `isFlipped: boolean` - Whether card shows front or back

### Data Fetching
Uses Convex queries for real-time data:
- `api.decks.getDeckById` - Fetch deck information
- `api.cards.getCardsForDeck` - Fetch all cards in the deck

### Key Functions
- `handleFlipCard()` - Toggles between front and back of current card
- `handleNextCard()` - Advances to next card, loops to first when at end

## Integration

### Dashboard Integration
To integrate StudyMode with the existing Dashboard:

```typescript
// In Dashboard.tsx
import { StudyMode } from "./StudyMode";

// Add to view state management
const [currentView, setCurrentView] = useState<'dashboard' | 'study' | 'manage'>('dashboard');
const [selectedDeckId, setSelectedDeckId] = useState<Id<"decks"> | null>(null);

// Add study mode handler
const handleStartStudyMode = (deckId: Id<"decks">) => {
  setSelectedDeckId(deckId);
  setCurrentView('study');
};

// Add to render logic
if (currentView === 'study' && selectedDeckId) {
  return (
    <StudyMode 
      deckId={selectedDeckId} 
      onExit={() => setCurrentView('dashboard')} 
    />
  );
}
```

### Routing Integration
For more advanced routing, integrate with React Router:

```typescript
// In App.tsx or routing setup
<Route 
  path="/study/:deckId" 
  element={<StudyMode deckId={deckId} onExit={() => navigate('/')} />} 
/>
```

## Styling

### Design System
The component follows the existing design patterns:
- **Colors**: Uses the app's light/dark theme system
- **Typography**: Consistent font sizes and weights
- **Spacing**: 8px grid system with Tailwind classes
- **Borders**: 2px borders with rounded corners
- **Shadows**: Subtle elevation for card areas

### Responsive Breakpoints
- **Mobile**: Single column layout, larger touch targets
- **Tablet**: Optimized spacing and button sizes
- **Desktop**: Full layout with optimal reading distances

### Dark Mode Support
Full dark mode support using CSS custom properties:
- Automatic theme detection via `prefers-color-scheme`
- Consistent color contrast ratios
- Smooth theme transitions

## Accessibility

### ARIA Support
- Progress bar with proper `role="progressbar"` and value attributes
- Button labels with descriptive `aria-label` attributes
- Semantic HTML structure with proper heading hierarchy

### Keyboard Navigation
- Tab navigation through all interactive elements
- Enter/Space activation for buttons
- Escape key to exit (can be added as enhancement)

### Screen Reader Support
- Descriptive text for all UI elements
- Progress announcements
- Card content properly structured

## Testing

### Unit Tests
Comprehensive test suite covering:
- Loading states and error handling
- Card flipping and navigation
- Progress tracking
- Accessibility attributes
- User interactions

### Test Setup Requirements
To run tests, add these dependencies to `package.json`:
```json
{
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3",
    "jest": "^29.3.1",
    "jest-environment-jsdom": "^29.3.1"
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

### Running Tests
```bash
npm run test                    # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test StudyMode         # Run specific test file
```

## Performance Considerations

### Optimization Strategies
- **Memoization**: Consider `useMemo` for expensive calculations
- **Lazy Loading**: Cards are fetched once and cached by Convex
- **Minimal Re-renders**: State updates are optimized to prevent unnecessary renders

### Bundle Size
- Component adds minimal bundle size (~3KB gzipped)
- No additional dependencies beyond existing Convex/React setup
- Efficient Tailwind CSS usage with purging

## Future Enhancements

### Potential Features
- **Shuffle Mode**: Randomize card order
- **Spaced Repetition**: Track card difficulty and timing
- **Study Statistics**: Track study sessions and progress
- **Keyboard Shortcuts**: Power user navigation
- **Card Bookmarking**: Mark difficult cards for review
- **Study Timer**: Track time spent studying
- **Audio Support**: Text-to-speech for cards

### Analytics Integration
The component is ready for analytics integration:
```typescript
// Add to useAnalytics hook
trackStudyModeStarted: (deckId: string, cardCount: number) => 
  trackEvent(posthog, 'study_mode_started', { deckId, cardCount }),
```

## Troubleshooting

### Common Issues
1. **Cards not loading**: Check Convex authentication and deck permissions
2. **Styling issues**: Verify Tailwind CSS is properly configured
3. **TypeScript errors**: Ensure Convex types are generated (`npx convex dev`)

### Debug Mode
Add debug logging in development:
```typescript
if (import.meta.env.MODE === 'development') {
  console.log('StudyMode Debug:', { deck, cards, currentCardIndex, isFlipped });
}
```

## File Structure
```
src/
├── components/
│   ├── StudyMode.tsx                    # Main component
│   └── __tests__/
│       └── StudyMode.test.tsx          # Unit tests
└── docs/
    └── STUDY_MODE_IMPLEMENTATION.md    # This documentation
```

## Conclusion

The StudyMode component provides a solid foundation for basic flashcard studying while maintaining consistency with the existing codebase architecture. It's designed to be easily extensible and integrates seamlessly with the current Convex-based data layer and Tailwind CSS styling system.
