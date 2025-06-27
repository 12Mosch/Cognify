# Keyboard Shortcuts Implementation

## Overview

This document describes the comprehensive keyboard shortcuts system implemented for the flashcard application to improve user experience and study efficiency. The system provides context-aware shortcuts for different study modes with visual indicators and help system.

## Features

### Universal Shortcuts (Available in all study modes)
- **Space** or **Enter**: Flip flashcard between question and answer
- **?**: Show keyboard shortcuts help modal

### Basic Study Session Shortcuts
- **Left Arrow (←)**: Navigate to previous card
- **Right Arrow (→)**: Navigate to next card

### Spaced Repetition Mode Shortcuts
When the answer is shown (card is flipped):
- **1**: Rate as "Again" (didn't know at all)
- **2**: Rate as "Hard" (knew with difficulty)
- **3**: Rate as "Good" (knew well)
- **4**: Rate as "Easy" (knew perfectly)

## Internationalization

The keyboard shortcuts system is fully internationalized with support for multiple languages:

- **Translation Keys**: All shortcut descriptions and group titles use i18n translation keys
- **Dynamic Translation**: Shortcuts are translated at runtime based on user's language preference
- **Supported Languages**: English (en) and German (de)
- **Translation Structure**: Organized under `study.shortcuts.descriptions.*` and `study.shortcuts.groups.*` keys

## Implementation Details

### Architecture

#### Components
1. **KeyboardShortcutsModal**: Modal component displaying available shortcuts
2. **HelpIcon**: Clickable help icon (?) that opens the shortcuts modal
3. **Keyboard Types**: TypeScript types and utilities for shortcut management

#### Files Structure
```
src/
├── components/
│   ├── KeyboardShortcutsModal.tsx    # Help modal component
│   ├── HelpIcon.tsx                  # Help icon component
│   ├── StudySession.tsx              # Enhanced with arrow key navigation
│   ├── SpacedRepetitionMode.tsx      # Enhanced with number key ratings
│   └── __tests__/
│       ├── KeyboardShortcutsModal.test.tsx
│       ├── StudySession.test.tsx
│       └── SpacedRepetitionMode.test.tsx (updated)
├── types/
│   └── keyboard.ts                   # Keyboard shortcut types and utilities
└── docs/
    └── KEYBOARD_SHORTCUTS.md         # This documentation
```

### Key Implementation Features

#### Global Event Handling
- Uses `document.addEventListener('keydown')` for global keyboard shortcuts
- Prevents conflicts with text input fields
- Disables shortcuts when help modal is open
- Proper cleanup with `removeEventListener`

#### Visual Indicators
- **Rating Buttons**: Show corresponding number keys (1-4) as badges
- **Navigation Buttons**: Display arrow key indicators (← →)
- **Help Icon**: Positioned in top-right corner of study interfaces

#### Accessibility
- All shortcuts have proper ARIA labels
- Modal is fully keyboard accessible (Escape to close)
- Focus management and screen reader support
- Visual focus indicators for keyboard navigation

#### Performance Optimizations
- Uses `useCallback` for event handlers to prevent unnecessary re-renders
- Efficient event delegation and cleanup
- Conditional rendering of shortcuts based on context

### User Experience

#### Help System
- **Help Icon**: Small "?" button in top-right corner of study interfaces
- **Modal Trigger**: Press "?" key or click help icon to open shortcuts modal
- **Context-Aware**: Shows relevant shortcuts for current study mode
- **Easy Dismissal**: Click outside, press Escape, or click close button

#### Visual Feedback
- **Button Badges**: Keyboard shortcuts shown as small badges on buttons
- **Hover States**: Visual feedback for interactive elements
- **Consistent Styling**: Follows existing design system patterns

#### Error Prevention
- **Context Awareness**: Rating shortcuts only work when card is flipped
- **Input Protection**: Shortcuts disabled when typing in text fields
- **Modal Protection**: Shortcuts disabled when help modal is open

## Testing Strategy

### Unit Tests Coverage
- **KeyboardShortcutsModal**: Modal rendering, keyboard events, accessibility
- **StudySession**: Arrow key navigation, flip shortcuts, help system
- **SpacedRepetitionMode**: Number key ratings, flip shortcuts, help system
- **Keyboard Utilities**: Shortcut key detection and context management

### Test Scenarios
1. **Keyboard Event Handling**: All shortcut keys trigger correct actions
2. **Context Awareness**: Shortcuts work only in appropriate contexts
3. **Modal Functionality**: Help modal opens/closes correctly
4. **Visual Indicators**: Keyboard shortcuts displayed on buttons
5. **Accessibility**: ARIA labels and keyboard navigation
6. **Edge Cases**: Input field protection, modal state management

## Browser Compatibility

### Supported Browsers
- **Chrome/Chromium**: Full support for all features
- **Firefox**: Full support for all features  
- **Safari**: Full support for all features
- **Edge**: Full support for all features

### Key Event Handling
- Uses `event.code` for special keys (Space, Enter, Arrow keys)
- Uses `event.key` for character keys (numbers, ?)
- Proper `preventDefault()` to avoid browser default behaviors

## Performance Considerations

### Optimization Techniques
- **Event Delegation**: Single global listener instead of multiple listeners
- **useCallback**: Prevents unnecessary re-renders of event handlers
- **Conditional Logic**: Efficient shortcut detection and context checking
- **Memory Management**: Proper cleanup of event listeners

### Bundle Size Impact
- **Minimal Overhead**: ~3KB additional JavaScript
- **Tree Shaking**: Unused keyboard utilities are eliminated
- **Lazy Loading**: Modal component can be code-split if needed

## Future Enhancements

### Potential Improvements
1. **Customizable Shortcuts**: Allow users to configure their own key bindings
2. **Shortcut Hints**: Temporary overlay showing available shortcuts
3. **Advanced Navigation**: Jump to specific card numbers
4. **Study Mode Shortcuts**: Quick switching between study modes
5. **Accessibility Enhancements**: Voice control integration

### Extensibility
The keyboard system is designed to be easily extensible:
- Add new shortcuts by updating `KEYBOARD_SHORTCUTS` constant
- Create new shortcut contexts by extending the type system
- Implement mode-specific shortcuts by adding to global handler

## Migration Notes

### Breaking Changes
- None - all existing functionality preserved

### New Dependencies
- No external dependencies added
- Uses existing React hooks and TypeScript features

### Backward Compatibility
- All existing keyboard functionality (Space/Enter flip) maintained
- New shortcuts are additive enhancements
- Existing tests continue to pass
