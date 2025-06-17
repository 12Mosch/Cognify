# Internationalization (i18n) Implementation

This document explains the comprehensive internationalization implementation for the Flashcard App using i18next and react-i18next.

## Overview

The application has been fully internationalized with support for multiple languages, automatic browser language detection, and manual language switching. All user-facing strings have been replaced with translation keys.

**Currently supported languages:**
- **English (en)** - Default/fallback language
- **German (de)** - Secondary language

**Internationalized Components:**
- All form components (CreateDeckForm, QuickAddCardForm)
- Study modes (BasicStudyMode, SpacedRepetitionMode, StudyModeSelector)
- Dashboard and deck management (DeckView, PostSessionSummary)
- Settings and modals (SettingsModal)
- Toast notifications and error messages
- All user-facing text throughout the application

## Architecture

### Dependencies

- `i18next` - Core internationalization framework
- `react-i18next` - React integration for i18next
- `i18next-browser-languagedetector` - Automatic browser language detection

### File Structure

```
src/
├── i18n.ts                           # i18n configuration
├── types/i18next.d.ts                # TypeScript type definitions
├── test-utils.tsx                    # Test utilities with i18n support
└── components/
    ├── LanguageSwitcher.tsx           # Language selection component
    ├── CreateDeckForm.tsx             # ✅ Internationalized
    ├── QuickAddCardForm.tsx           # ✅ Internationalized
    ├── BasicStudyMode.tsx             # ✅ Internationalized
    ├── SpacedRepetitionMode.tsx       # ✅ Internationalized
    ├── StudyModeSelector.tsx          # ✅ Internationalized
    ├── PostSessionSummary.tsx         # ✅ Internationalized
    ├── DeckView.tsx                   # ✅ Internationalized
    ├── SettingsModal.tsx              # ✅ Internationalized
    └── ... (all components internationalized)

src/lib/
└── toast.ts                          # ✅ Internationalized toast messages

public/
└── locales/
    ├── en/
    │   └── translation.json           # English translations (comprehensive)
    └── de/
        └── translation.json           # German translations (comprehensive)
```

## Configuration

### i18n Setup (`src/i18n.ts`)

The i18n configuration includes:

- **Language Detection**: Automatically detects user's preferred language from:
  1. Browser navigator.language
  2. localStorage (persisted choice)
  3. HTML lang attribute
  4. URL path/subdomain
  
- **Fallback**: English is used when the detected language is not supported
- **Caching**: User's language preference is stored in localStorage
- **TypeScript**: Full type safety for translation keys

### Language Detection Order

1. `navigator.language` - Browser's preferred language
2. `localStorage` - Previously selected language
3. `htmlTag` - HTML lang attribute
4. `path` - URL path-based detection
5. `subdomain` - Subdomain-based detection

## Usage

### In React Components

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.subtitle.withDecks', { count: 5 })}</p>
    </div>
  );
}
```

### Translation Key Namespacing

Translation keys follow a hierarchical structure organized by feature/component:

```json
{
  "app": {
    "title": "Flashcard App",
    "goToMainDashboard": "Go to main dashboard"
  },
  "dashboard": {
    "title": "My Flashcard Decks",
    "subtitle": {
      "empty": "Create your first deck to get started",
      "withDecks": "{{count}} deck",
      "withDecks_plural": "{{count}} decks"
    },
    "buttons": {
      "showStatistics": "Show Statistics",
      "quickAddCard": "Quick Add Card",
      "createDeck": "Create Deck"
    }
  },
  "forms": {
    "createDeck": {
      "title": "Create New Deck",
      "name": "Deck Name",
      "namePlaceholder": "Enter deck name",
      "create": "Create Deck",
      "creating": "Creating...",
      "cancel": "Cancel"
    },
    "quickAddCard": {
      "title": "Quick Add Card",
      "front": "Front (Question)",
      "back": "Back (Answer)",
      "add": "Add Card",
      "adding": "Adding...",
      "updating": "Updating..."
    },
    "validation": {
      "required": "This field is required",
      "deckNameRequired": "Deck name is required",
      "frontRequired": "Front content is required",
      "backRequired": "Back content is required",
      "maxLength": "{{field}} cannot exceed {{max}} characters"
    }
  },
  "study": {
    "flip": "Flip",
    "next": "Next",
    "showAnswer": "Show Answer",
    "showFront": "Show Front",
    "showBack": "Show Back",
    "exitStudy": "Exit Study",
    "spacedRepetitionMode": "Spaced Repetition Mode",
    "cardProgress": "Card {{current}} of {{total}}",
    "difficulty": {
      "again": "Again",
      "hard": "Hard",
      "good": "Good",
      "easy": "Easy"
    },
    "modeSelector": {
      "title": "Choose Study Mode",
      "subtitle": "How would you like to study {{deckName}}?",
      "basicStudy": {
        "title": "Basic Study",
        "description": "Simple sequential review of all cards in the deck."
      },
      "spacedRepetition": {
        "title": "Spaced Repetition",
        "subtitle": "Recommended",
        "description": "Intelligent scheduling based on the SM-2 algorithm."
      }
    }
  },
  "notifications": {
    "deckCreated": "Deck created successfully!",
    "deckCreatedWithName": "\"{{deckName}}\" created successfully!",
    "cardAdded": "Card added successfully!",
    "cardUpdated": "Card updated successfully!",
    "cardDeleted": "Card deleted successfully!",
    "studySessionCompleted": "Study session completed!",
    "studySessionCompletedWithCount": "Study session complete! Reviewed {{count}} card.",
    "studySessionCompletedWithCount_plural": "Study session complete! Reviewed {{count}} cards.",
    "networkError": "Network error. Please check your connection and try again.",
    "temporaryError": "Something went wrong. Please try again in a moment."
  }
}
```

### Pluralization

i18next automatically handles pluralization:

```tsx
// Automatically selects singular/plural form based on count
t('deck.cardCount', { count: 1 })    // "1 card"
t('deck.cardCount', { count: 5 })    // "5 cards"
```

### Interpolation

Dynamic values can be interpolated into translations:

```tsx
t('auth.welcome', { appName: 'Flashcard App' })
// Result: "Welcome to Flashcard App"
```

## Language Switcher

The `LanguageSwitcher` component provides a dropdown interface for users to manually change languages:

- Displays current language with flag emoji
- Shows available languages in dropdown
- Persists selection to localStorage
- Updates entire app immediately

## Adding New Languages

1. **Create translation file**:
   ```bash
   mkdir -p public/locales/[language-code]
   cp public/locales/en/translation.json public/locales/[language-code]/translation.json
   ```

2. **Translate content**:
   Edit the new translation file with appropriate translations.

3. **Update configuration**:
   ```ts
   // In src/i18n.ts
   import newLanguageTranslation from '../public/locales/[language-code]/translation.json';
   
   const resources = {
     en: { translation: enTranslation },
     de: { translation: deTranslation },
     [languageCode]: { translation: newLanguageTranslation },
   };
   
   // Update supportedLngs
   supportedLngs: ['en', 'de', '[language-code]'],
   ```

4. **Update LanguageSwitcher**:
   ```ts
   // In src/components/LanguageSwitcher.tsx
   const languages = [
     { code: 'en', name: 'English', flag: '🇺🇸' },
     { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
     { code: '[language-code]', name: '[Language Name]', flag: '[Flag]' },
   ];
   ```

## Translation Guidelines

### Key Naming

- Use descriptive, hierarchical keys: `dashboard.buttons.createDeck`
- Group related translations: `forms.validation.required`
- Use camelCase for key names: `cardCount`, not `card_count`

### Content Guidelines

- Keep translations concise and clear
- Maintain consistent tone across languages
- Consider cultural context, not just literal translation
- Test UI layout with longer translations (German text is typically 30% longer)

### Pluralization Rules

Different languages have different pluralization rules. i18next handles this automatically:

```json
{
  "deck": {
    "cardCount": "{{count}} card",
    "cardCount_plural": "{{count}} cards"
  }
}
```

## Testing

### Test Setup

The test utilities have been updated to include i18n support:

```tsx
// src/test-utils.tsx
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <I18nextProvider i18n={i18n}>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ConvexProvider client={mockConvexClient}>
          {children}
        </ConvexProvider>
      </ClerkProvider>
    </I18nextProvider>
  );
};
```

### Mock useTranslation Helper

For unit tests that need to mock translations:

```ts
// Available in test-utils.tsx
export const mockUseTranslation = () => {
  const mockT = jest.fn((key: string, options?: any) => {
    // Simple mock that returns the key with interpolated values
    if (options && typeof options === 'object') {
      let result = key;
      Object.keys(options).forEach(optionKey => {
        result = result.replace(`{{${optionKey}}}`, String(options[optionKey]));
      });
      return result;
    }
    return key;
  });

  return {
    t: mockT,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  };
};
```

### Testing Translations

- Verify translation keys exist in all language files
- Test pluralization with different count values
- Test interpolation with various parameter combinations
- Ensure UI layout works with longer translations

## Performance Considerations

- **Lazy Loading**: Translation files are loaded on demand
- **Caching**: Browser caches translation files
- **Bundle Size**: Only active language is loaded initially
- **Memory**: Unused languages are not kept in memory

## Troubleshooting

### Missing Translations

If a translation key is missing:
1. The key itself is displayed (e.g., "dashboard.title")
2. Check browser console for warnings in development mode
3. Verify the key exists in the translation file
4. Ensure proper key hierarchy

### Language Not Switching

1. Check browser console for errors
2. Verify language code exists in `supportedLngs`
3. Check if translation file exists and is valid JSON
4. Clear localStorage if needed: `localStorage.removeItem('i18nextLng')`

### TypeScript Errors

1. Ensure translation files are properly imported in `src/i18n.ts`
2. Check `src/types/i18next.d.ts` for proper type definitions
3. Restart TypeScript server if types aren't updating

## Implementation Status

### ✅ Completed Components

All major user-facing components have been internationalized:

- **Forms**: CreateDeckForm, QuickAddCardForm with validation messages
- **Study Modes**: BasicStudyMode, SpacedRepetitionMode, StudyModeSelector
- **Dashboard**: DeckView, PostSessionSummary with statistics
- **Settings**: SettingsModal with privacy and feature flag sections
- **Toast Messages**: All success, error, and info notifications
- **Error Handling**: Generic and specific error messages

### 🔧 Toast Message Internationalization

Toast messages now use i18n with helper functions:

```ts
// src/lib/toast.ts
import i18n from '../i18n';

export const toastHelpers = {
  deckCreated: (deckName?: string) =>
    showSuccessToast(deckName
      ? i18n.t('notifications.deckCreatedWithName', { deckName })
      : i18n.t('notifications.deckCreated')
    ),

  studySessionComplete: (cardsReviewed?: number) =>
    showSuccessToast(cardsReviewed
      ? i18n.t('notifications.studySessionCompletedWithCount', { count: cardsReviewed })
      : i18n.t('notifications.studySessionCompleted')
    ),
};
```

## Best Practices

1. **Always use translation keys** - Never hardcode user-facing text
2. **Use namespaced keys** - Follow pattern `namespace.section.key` (e.g., 'forms.validation.required')
3. **Use camelCase** - For translation keys and make them descriptive
4. **Test with longer languages** - German text is typically 30% longer than English
5. **Use semantic keys** - `dashboard.title` not `text1`
6. **Group related translations** - Use hierarchical structure by feature/component
7. **Handle missing keys gracefully** - Provide fallbacks and check console warnings
8. **Keep translations up to date** - Update all languages when adding new features
9. **Consider RTL languages** - Plan for future right-to-left language support
10. **Preserve dynamic interpolation** - Ensure variables are properly interpolated in translations

## Migration Notes

When adding new user-facing text:

1. **Add translation keys** to both `en/translation.json` and `de/translation.json`
2. **Use useTranslation hook** in React components: `const { t } = useTranslation();`
3. **Replace hardcoded strings** with `t('namespace.key')` calls
4. **Test both languages** to ensure proper layout and functionality
5. **Update tests** to work with translation keys instead of hardcoded text
