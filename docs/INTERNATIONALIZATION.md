# Internationalization (i18n) Setup

This document explains the internationalization setup for the Flashcard App using i18next and react-i18next.

## Overview

The application supports multiple languages with automatic browser language detection and manual language switching. Currently supported languages:

- **English (en)** - Default/fallback language
- **German (de)** - Secondary language

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
└── components/
    └── LanguageSwitcher.tsx           # Language selection component

public/
└── locales/
    ├── en/
    │   └── translation.json           # English translations
    └── de/
        └── translation.json           # German translations
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

Translation keys follow a hierarchical structure:

```json
{
  "app": {
    "title": "Flashcard App"
  },
  "dashboard": {
    "title": "My Flashcard Decks",
    "subtitle": {
      "empty": "Create your first deck to get started",
      "withDecks": "{{count}} deck",
      "withDecks_plural": "{{count}} decks"
    }
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

Tests mock the `useTranslation` hook to return English translations:

```ts
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations = {
        'app.title': 'Flashcard App',
        // ... more translations
      };
      return translations[key] || key;
    },
  }),
}));
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

## Best Practices

1. **Always use translation keys** - Never hardcode user-facing text
2. **Test with longer languages** - German text is typically longer than English
3. **Use semantic keys** - `dashboard.title` not `text1`
4. **Group related translations** - Use hierarchical structure
5. **Handle missing keys gracefully** - Provide fallbacks
6. **Keep translations up to date** - Update all languages when adding new features
7. **Consider RTL languages** - Plan for future right-to-left language support
