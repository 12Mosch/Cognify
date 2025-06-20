import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from '../public/locales/en/translation.json';
import deTranslation from '../public/locales/de/translation.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  de: {
    translation: deTranslation,
  },
};

void i18n
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources,

    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['navigator', 'localStorage', 'htmlTag', 'path', 'subdomain'],

      // Keys to lookup language from localStorage
      lookupLocalStorage: 'i18nextLng',

      // Cache user language
      caches: ['localStorage'],
    },

    // Fallback language
    fallbackLng: 'en',

    // Whitelist of supported languages
    supportedLngs: ['en', 'de'],

    // Don't load a fallback
    load: 'languageOnly',

    // Debug mode (disable in production)
    debug: false,

    // Interpolation options
    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Pluralization options
    pluralSeparator: '_',
    contextSeparator: '_',

    // React specific options
    react: {
      // Wait for translation to be loaded before rendering
      useSuspense: false,
    },

    // Return key if translation is missing (instead of showing key with locale)
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
    joinArrays: false,

    // Key separator
    keySeparator: '.',
    nsSeparator: ':',
  });

export default i18n;
