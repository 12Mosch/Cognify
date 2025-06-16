# Clickable App Title Navigation

## Overview

The app title "Flashcard App" in the header is now clickable and serves as a home button that takes users back to the main dashboard from any view within the application.

## Implementation Details

### Component Changes

#### App.tsx
- Converted the `<h1>` element to a clickable `<button>`
- Added `handleGoHome` function to manage navigation
- Implemented ref forwarding to communicate with Dashboard component
- Added proper accessibility attributes and focus management

#### Dashboard.tsx
- Updated to use `forwardRef` to expose navigation methods
- Added `useImperativeHandle` to provide `goHome` functionality
- Modified DashboardContent to accept and handle dashboard ref
- Implemented state reset logic to return to main dashboard view

### Key Features

1. **Universal Navigation**: Works from any view (study modes, deck view, statistics)
2. **State Reset**: Clears all navigation states to return to main dashboard
3. **Accessibility**: Proper ARIA labels, keyboard navigation, and focus management
4. **Visual Feedback**: Hover and focus states for better user experience
5. **Consistent Styling**: Maintains original appearance while adding interactivity

### Technical Implementation

```typescript
// App.tsx - Main navigation handler
const handleGoHome = () => {
  if (dashboardRef.current) {
    dashboardRef.current.goHome();
  }
};

// Dashboard.tsx - State reset logic
useImperativeHandle(dashboardRef, () => ({
  goHome: () => {
    // Reset all navigation states
    setStudyingDeckId(null);
    setStudyMode(null);
    setSelectingStudyMode(null);
    setViewingDeckId(null);
    setShowPrivacySettings(false);
    setShowFeatureFlags(false);
  }
}), []);
```

### Styling

The clickable title maintains the original visual appearance while adding interactive states:

```css
.text-xl.font-bold.hover:text-slate-700.dark:hover:text-slate-300.transition-colors.cursor-pointer.focus:outline-none.focus:ring-2.focus:ring-slate-400.dark:focus:ring-slate-500.rounded-md.px-2.py-1
```

### Accessibility Features

- **ARIA Label**: `aria-label="Go to main dashboard"`
- **Title Attribute**: Provides tooltip on hover
- **Keyboard Navigation**: Focusable with Tab key
- **Focus Indicators**: Clear visual focus ring
- **Screen Reader Support**: Properly announced as a button

### User Experience

1. **Intuitive**: Users expect the app logo/title to be clickable
2. **Consistent**: Works the same way from all application views
3. **Fast**: Immediate navigation without loading states
4. **Accessible**: Works with keyboard and screen readers

### Testing

Comprehensive test coverage includes:
- Button rendering and accessibility attributes
- Proper styling and hover states
- Focus management and keyboard navigation
- Integration with Dashboard component
- State reset functionality

### Browser Compatibility

- Modern browsers with full CSS support
- Graceful degradation for older browsers
- Touch-friendly on mobile devices

## Usage

Users can click the "Flashcard App" title in the header from any view to:
- Return to the main dashboard
- Exit study sessions
- Close deck management views
- Exit statistics dashboard
- Clear any open modals or forms

This provides a consistent and intuitive way to navigate back to the home view throughout the application.
