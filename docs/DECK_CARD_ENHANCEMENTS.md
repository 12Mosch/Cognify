# Deck Card Enhancements

This document describes the enhanced design features implemented for flashcard deck cards in the dashboard.

## Overview

The deck cards have been enhanced with micro-interactions, progress indicators, and status badges to provide better visual feedback and user experience while maintaining accessibility standards.

## Features Implemented

### 1. Micro-interactions

#### Metadata Badge Hover Effects
- **Subtle hover animations** for card count, last studied date, and creation date badges
- **Transform effects**: `translateY(-1px)` on hover for lift effect
- **Smooth transitions**: 200ms cubic-bezier easing for natural feel
- **Accessibility**: Respects `prefers-reduced-motion` settings

#### CSS Classes
```css
.deck-metadata-badge {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.deck-metadata-badge:hover {
  transform: translateY(-1px);
}
```

### 2. Progress Indicators

#### Visual Progress Bars
- **Horizontal progress bar** below deck title showing study completion percentage
- **Color coding**:
  - Blue (`bg-blue-500`) for in-progress decks
  - Green (`bg-green-500`) for mastered decks (≥90% completion)
  - Gray (`bg-slate-200`) for new decks
- **Percentage display**: Shows exact completion percentage alongside visual bar
- **Smooth animations**: 500ms ease-out transition for progress changes
- **Accessibility**: Proper ARIA attributes (`role="progressbar"`, `aria-valuenow`, etc.)

#### Progress Calculation
Progress is calculated based on cards that have been studied (repetition > 0) vs total cards in deck:
```typescript
const progressPercentage = totalCards > 0 ? Math.round((studiedCards / totalCards) * 100) : 0;
```

### 3. Status Badges

#### Status Indicators
- **Positioned**: Top-right corner of deck cards
- **Three states**:
  - **"New"**: Gray badge for decks with no study sessions
  - **"In Progress"**: Blue badge for partially studied decks
  - **"Mastered"**: Green badge for fully completed decks (≥90% progress)

#### Status Logic
```typescript
let status: "new" | "in-progress" | "mastered";
if (studiedCards === 0) {
  status = "new";
} else if (progressPercentage >= 90) {
  status = "mastered";
} else {
  status = "in-progress";
}
```

#### Badge Styling
- **Consistent design**: Rounded corners, proper contrast ratios
- **Hover effects**: Subtle scale transform (`scale(1.05)`) on hover
- **Accessibility**: ARIA labels for screen readers

### 4. Accessibility Features

#### Reduced Motion Support
All animations respect user preferences:
```css
@media (prefers-reduced-motion: reduce) {
  .deck-metadata-badge,
  .progress-bar,
  .status-badge {
    transition: none;
  }
  
  .deck-metadata-badge:hover,
  .status-badge:hover {
    transform: none;
  }
}
```

#### ARIA Labels
- Progress bars include proper ARIA attributes
- Status badges have descriptive ARIA labels
- All interactive elements have appropriate accessibility labels

## Implementation Details

### Backend Changes

#### New Query: `getDeckProgressData`
Located in `convex/statistics.ts`, this query calculates progress data for all user decks:

```typescript
export const getDeckProgressData = query({
  args: {},
  returns: v.array(v.object({
    deckId: v.id("decks"),
    studiedCards: v.number(),
    totalCards: v.number(),
    progressPercentage: v.number(),
    status: v.union(v.literal("new"), v.literal("in-progress"), v.literal("mastered")),
    lastStudied: v.optional(v.number()),
  })),
  // ... implementation
});
```

### Frontend Changes

#### Enhanced DeckCard Component
- **New prop**: `progressData?: DeckProgress` for progress information
- **Status badge rendering**: Dynamic badge based on deck status
- **Progress bar**: Visual progress indicator with percentage
- **Enhanced metadata**: Hover effects and last studied date display

#### Translation Keys Added
New internationalization keys for status badges and progress indicators:

```json
{
  "deck": {
    "lastStudied": "Last studied {{date}}",
    "status": {
      "new": "New",
      "inProgress": "In Progress", 
      "mastered": "Mastered",
      "newAria": "This deck has not been studied yet",
      "inProgressAria": "This deck is currently being studied",
      "masteredAria": "This deck has been mastered"
    },
    "progress": {
      "label": "Progress",
      "aria": "{{percentage}}% complete"
    }
  }
}
```

### CSS Enhancements

#### New Utility Classes
- `.deck-metadata-badge`: Hover animations for metadata badges
- `.progress-bar`: Smooth width transitions for progress bars
- `.status-badge`: Hover effects for status indicators

#### Responsive Design
- Progress bars adapt to container width
- Status badges positioned absolutely to avoid layout shifts
- Metadata badges wrap appropriately on smaller screens

## Testing

All enhancements maintain existing functionality:
- ✅ All existing tests pass (286 tests)
- ✅ TypeScript compilation successful
- ✅ ESLint validation passed
- ✅ Accessibility standards maintained
- ✅ Reduced motion preferences respected

## Browser Support

The enhancements use modern CSS features with appropriate fallbacks:
- CSS transforms with fallback for older browsers
- CSS transitions with `prefers-reduced-motion` support
- Flexbox layout with proper browser support

## Performance Considerations

- **Efficient queries**: Single query fetches all deck progress data
- **Optimized rendering**: React.memo prevents unnecessary re-renders
- **CSS animations**: Hardware-accelerated transforms for smooth performance
- **Minimal DOM changes**: Status badges positioned absolutely to avoid layout thrashing
