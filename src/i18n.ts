import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import deTranslation from "../public/locales/de/translation.json";
// Import translation files
import enTranslation from "../public/locales/en/translation.json";

const resources = {
	de: {
		translation: deTranslation,
	},
	en: {
		translation: enTranslation,
	},
};

void i18n
	// Detect user language
	.use(LanguageDetector)
	// Pass the i18n instance to react-i18next
	.use(initReactI18next)
	// Initialize i18next
	.init({
		contextSeparator: "_",

		// Debug mode (disable in production)
		debug: false,

		// Language detection options
		detection: {
			// Cache user language
			caches: ["localStorage"],

			// Keys to lookup language from localStorage
			lookupLocalStorage: "i18nextLng",
			// Order of language detection methods
			order: ["navigator", "localStorage", "htmlTag", "path", "subdomain"],
		},

		// Fallback language
		fallbackLng: "en",

		// Interpolation options
		interpolation: {
			escapeValue: false, // React already does escaping
		},
		joinArrays: false,

		// Key separator
		keySeparator: ".",

		// Don't load a fallback
		load: "languageOnly",
		nsSeparator: ":",

		// Pluralization options
		pluralSeparator: "_",

		// React specific options
		react: {
			// Wait for translation to be loaded before rendering
			useSuspense: false,
		},
		resources,
		returnEmptyString: false,

		// Return key if translation is missing (instead of showing key with locale)
		returnNull: false,
		returnObjects: false,

		// Whitelist of supported languages
		supportedLngs: ["en", "de"],
	});

export default i18n;
