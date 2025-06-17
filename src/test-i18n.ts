import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Mock translations for testing
const mockTranslations = {
  en: {
    translation: {
      // App
      'app.title': 'Flashcard App',
      'app.goToMainDashboard': 'Go to main dashboard',

      // Navigation
      'navigation.settings': 'Settings',
      'navigation.signOut': 'Sign Out',
      'navigation.selectLanguage': 'Select Language',

      // Common
      'common.cancel': 'Cancel',
      'common.save': 'Save',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.loading': 'Loading...',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.studyMode': 'Study Mode',
      'common.whatsNext': "What's Next?",
      'common.moreCards': 'more cards',
      'common.from': 'from',

      // Study
      'study.flip': 'Flip',
      'study.next': 'Next',
      'study.previous': 'Previous',
      'study.showAnswer': 'Show Answer',
      'study.showFront': 'Show Front',
      'study.showBack': 'Show Back',
      'study.exitStudy': 'Exit Study',
      'study.exitStudySession': 'Exit Study Session',
      'study.spacedRepetitionMode': 'Spaced Repetition Mode',
      'study.cardProgress': 'Card {{current}} of {{total}}',
      'study.session.completed': 'Completed',
      'study.difficulty.again': 'Again',
      'study.difficulty.hard': 'Hard',
      'study.difficulty.good': 'Good',
      'study.difficulty.easy': 'Easy',

      // Study Mode Selector
      'study.modeSelector.title': 'Choose Study Mode',
      'study.modeSelector.subtitle': 'How would you like to study {{deckName}}?',
      'study.modeSelector.cancel': 'Cancel',
      'study.modeSelector.basicStudy.title': 'Basic Study',
      'study.modeSelector.basicStudy.description': 'Simple sequential review of all cards in the deck.',
      'study.modeSelector.basicStudy.features.sequential': 'Sequential Review',
      'study.modeSelector.basicStudy.features.simple': 'Simple Interface',
      'study.modeSelector.basicStudy.features.quick': 'Quick Setup',
      'study.modeSelector.spacedRepetition.title': 'Spaced Repetition',
      'study.modeSelector.spacedRepetition.subtitle': 'Recommended',
      'study.modeSelector.spacedRepetition.description': 'Intelligent scheduling based on the SM-2 algorithm.',
      'study.modeSelector.spacedRepetition.features.algorithm': 'SM-2 Algorithm',
      'study.modeSelector.spacedRepetition.features.timing': 'Optimal Timing',
      'study.modeSelector.spacedRepetition.features.retention': 'Better Retention',
      'study.modeSelector.info.title': 'What is Spaced Repetition?',
      'study.modeSelector.info.description': 'Spaced repetition is a learning technique that involves reviewing information at increasing intervals to improve long-term retention.',

      // Forms
      'forms.createDeck.title': 'Create New Deck',
      'forms.createDeck.name': 'Deck Name',
      'forms.createDeck.namePlaceholder': 'Enter deck name',
      'forms.createDeck.description': 'Description (optional)',
      'forms.createDeck.descriptionPlaceholder': 'Enter deck description',
      'forms.createDeck.create': 'Create Deck',
      'forms.createDeck.creating': 'Creating...',
      'forms.createDeck.cancel': 'Cancel',

      'forms.quickAddCard.title': 'Quick Add Card',
      'forms.quickAddCard.front': 'Front (Question)',
      'forms.quickAddCard.back': 'Back (Answer)',
      'forms.quickAddCard.frontPlaceholder': 'Enter question or prompt',
      'forms.quickAddCard.backPlaceholder': 'Enter answer or explanation',
      'forms.quickAddCard.add': 'Add Card',
      'forms.quickAddCard.adding': 'Adding...',
      'forms.quickAddCard.updating': 'Updating...',
      'forms.quickAddCard.characterCount': '{{current}}/{{max}} characters',

      'forms.validation.required': 'This field is required',
      'forms.validation.deckNameRequired': 'Deck name is required',
      'forms.validation.frontRequired': 'Front content is required',
      'forms.validation.backRequired': 'Back content is required',
      'forms.validation.maxLength': '{{field}} cannot exceed {{max}} characters',

      // Dashboard
      'dashboard.title': 'My Flashcard Decks',
      'dashboard.subtitle.empty': 'Create your first deck to get started',
      'dashboard.subtitle.withDecks': '{{count}} deck',
      'dashboard.subtitle.withDecks_plural': '{{count}} decks',
      'dashboard.buttons.showStatistics': 'Show Statistics',
      'dashboard.buttons.quickAddCard': 'Quick Add Card',
      'dashboard.buttons.createDeck': 'Create Deck',

      // Deck View
      'deckView.editCard': 'Edit Card',
      'deckView.deleteCard': 'Delete Card',
      'deckView.confirmDelete': 'Are you sure you want to delete this card?',

      // Post Session Summary
      'postSessionSummary.title': 'Study Session Complete!',
      'postSessionSummary.subtitle': 'Great job! Here\'s how you did:',
      'postSessionSummary.stats.cardsReviewed': 'Cards Reviewed',
      'postSessionSummary.stats.studyTime': 'Study Time',
      'postSessionSummary.stats.studyMode': 'Study Mode',
      'postSessionSummary.actions.returnToDashboard': 'Return to Dashboard',
      'postSessionSummary.actions.continueStudying': 'Continue Studying',
      'postSessionSummary.encouragement': 'Keep up the great work! Consistent practice leads to long-term retention.',

      // Settings
      'settings.title': 'Settings',
      'settings.close': 'Close settings',
      'settings.tabs.account': 'Account',
      'settings.tabs.security': 'Security',
      'settings.privacy.title': 'Privacy Settings',
      'settings.privacy.description': 'Manage your privacy preferences and data collection settings.',
      'settings.featureFlags.title': 'Feature Flags',
      'settings.featureFlags.description': 'Enable or disable experimental features and development tools.',

      // Notifications
      'notifications.deckCreated': 'Deck created successfully!',
      'notifications.deckCreatedWithName': '"{{deckName}}" created successfully!',
      'notifications.cardAdded': 'Card added successfully!',
      'notifications.cardUpdated': 'Card updated successfully!',
      'notifications.cardDeleted': 'Card deleted successfully!',
      'notifications.studySessionCompleted': 'Study session completed!',
      'notifications.studySessionCompletedWithCount': 'Study session complete! Reviewed {{count}} card.',
      'notifications.studySessionCompletedWithCount_plural': 'Study session complete! Reviewed {{count}} cards.',
      'notifications.networkError': 'Network error. Please check your connection and try again.',
      'notifications.temporaryError': 'Something went wrong. Please try again in a moment.',

      // Errors
      'errors.generic': 'Something went wrong. Please try again.',
      'errors.networkError': 'Network error. Please check your connection.',
      'errors.notFound': 'The requested resource was not found.',
      'errors.unauthorized': 'You are not authorized to perform this action.',
    }
  }
};

// Initialize i18n for testing with mock translations
void i18n
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: false,

    resources: mockTranslations,

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    // Disable loading from external sources in tests
    load: 'languageOnly',
    preload: ['en'],

    // Ensure synchronous behavior in tests
    initImmediate: false,
  });

export default i18n;
