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

      // Statistics
      'statistics.title': 'Statistics Dashboard',
      'statistics.loading.dashboard': 'Loading statistics dashboard',
      'statistics.loading.chartTitle': 'Loading {{title}}...',

      // Statistics Cards
      'statistics.cards.totalDecks': 'Total Decks',
      'statistics.cards.totalCards': 'Total Cards',
      'statistics.cards.dueToday': 'Due Today',
      'statistics.cards.currentStreak': 'Current Streak',
      'statistics.cards.newCards': 'New Cards',
      'statistics.cards.studySessions': 'Study Sessions',
      'statistics.cards.averageInterval': 'Average Interval',
      'statistics.cards.retentionRate': 'Retention Rate',
      'statistics.cards.learningCollections': 'Learning collections',
      'statistics.cards.flashcardsCreated': 'Flashcards created',
      'statistics.cards.cardsToReview': 'Cards to review',
      'statistics.cards.bestDays': 'Best: {{count}} days',
      'statistics.cards.readyToLearn': 'Ready to learn',
      'statistics.cards.totalCompleted': 'Total completed',

      // Streak Display
      'streak.display.title': 'Study Streak',
      'streak.display.day': 'day',
      'streak.display.days': 'days',
      'streak.display.milestoneAchieved': '{{count}} days',
      'streak.display.nextMilestone': 'Next milestone',
      'streak.display.daysToGo': '{{count}} days to go',
      'streak.display.longestStreak': 'Longest Streak',
      'streak.display.totalDays': 'Total Days',
      'streak.display.milestonesAchieved': 'Milestones Achieved',
      'streak.display.status.startStreak.title': 'Start Your Streak! 🎯',
      'streak.display.status.startStreak.message': 'Study today to begin your learning journey',
      'streak.display.status.buildingMomentum.title': 'Building Momentum! 🌱',
      'streak.display.status.buildingMomentum.message': 'Keep going to reach your first milestone',
      'streak.display.status.greatProgress.title': 'Great Progress! 🔥',
      'streak.display.status.greatProgress.message': 'You\'re developing a strong habit',
      'streak.display.status.streakMaster.title': 'Streak Master! 🏆',
      'streak.display.status.streakMaster.message': 'You\'re a dedicated learner',
      'statistics.cards.betweenReviews': 'Between reviews',
      'statistics.cards.successRate': 'Success rate',
      'statistics.cards.day': 'day',
      'statistics.cards.days': 'days',

      // Study Activity Chart
      'statistics.charts.studyActivity.title': 'Study Activity Over Time',
      'statistics.charts.studyActivity.subtitle': 'Track your learning consistency and progress patterns',
      'statistics.charts.studyActivity.cardsStudied': 'Cards Studied',
      'statistics.charts.studyActivity.sessions': 'Sessions',
      'statistics.charts.studyActivity.timeMinutes': 'Time (min)',
      'statistics.charts.studyActivity.totalCards': 'Total cards studied: {{count}}',
      'statistics.charts.studyActivity.totalSessions': 'Total sessions: {{count}}',
      'statistics.charts.studyActivity.totalTime': 'Total time: {{hours}}h {{minutes}}m',
      'statistics.charts.studyActivity.noData': 'No study activity data available for the selected period.',

      // Deck Performance Chart
      'statistics.charts.deckPerformance.title': 'Deck Performance',
      'statistics.charts.deckPerformance.subtitle': 'Compare mastery progress across your decks',
      'statistics.charts.deckPerformance.totalCards': 'Total Cards',
      'statistics.charts.deckPerformance.masteredCards': 'Mastered Cards',
      'statistics.charts.deckPerformance.masteryPercentage': 'Progress',
      'statistics.charts.deckPerformance.averageEase': 'Avg. Ease',
      'statistics.charts.deckPerformance.clickToSelect': 'Click to select deck',
      'statistics.charts.deckPerformance.noData': 'No deck performance data available.',

      // Card Distribution Chart
      'statistics.charts.cardDistribution.title': 'Card Distribution',
      'statistics.charts.cardDistribution.subtitle': 'Overview of your cards across learning stages',
      'statistics.charts.cardDistribution.newCards': 'New Cards',
      'statistics.charts.cardDistribution.learning': 'Learning',
      'statistics.charts.cardDistribution.review': 'Review',
      'statistics.charts.cardDistribution.due': 'Due',
      'statistics.charts.cardDistribution.mastered': 'Mastered',
      'statistics.charts.cardDistribution.neverStudied': 'Cards never studied',
      'statistics.charts.cardDistribution.beingLearned': 'Cards being learned',
      'statistics.charts.cardDistribution.inReviewCycle': 'Cards in review cycle',
      'statistics.charts.cardDistribution.dueForReview': 'Cards due for review',
      'statistics.charts.cardDistribution.wellLearned': 'Well-learned cards',
      'statistics.charts.cardDistribution.noData': 'No cards available',

      // Upcoming Reviews Widget
      'statistics.widgets.upcomingReviews.title': 'Upcoming Reviews',
      'statistics.widgets.upcomingReviews.today': 'Today',
      'statistics.widgets.upcomingReviews.tomorrow': 'Tomorrow',
      'statistics.widgets.upcomingReviews.allCaughtUp': 'All caught up!',
      'statistics.widgets.upcomingReviews.noReviewsScheduled': 'No reviews scheduled for the next week',
      'statistics.widgets.upcomingReviews.moreReviewsScheduled': '+{{count}} more reviews scheduled',
      'statistics.widgets.upcomingReviews.totalCards': 'Total Cards',
      'statistics.widgets.upcomingReviews.reviewDays': 'Review Days',
      'statistics.widgets.upcomingReviews.card': 'card',
      'statistics.widgets.upcomingReviews.cards': 'cards',

      // Learning Streak Widget
      'statistics.widgets.learningStreak.title': 'Learning Streak',
      'statistics.widgets.learningStreak.messages.start': 'Start your learning journey!',
      'statistics.widgets.learningStreak.messages.greatStart': 'Great start! Keep it up!',
      'statistics.widgets.learningStreak.messages.buildingMomentum': 'Building momentum!',
      'statistics.widgets.learningStreak.messages.onFire': 'You\'re on fire! 🔥',
      'statistics.widgets.learningStreak.messages.incredibleDedication': 'Incredible dedication!',
      'statistics.widgets.learningStreak.messages.legendaryLearner': 'Legendary learner! 🏆',
      'statistics.widgets.learningStreak.milestones.daysToReach': '{{count}} days to reach {{milestone}}-day milestone',
      'statistics.widgets.learningStreak.milestones.progressTo': 'Progress to {{milestone}} days',
      'statistics.widgets.learningStreak.current': 'Current',
      'statistics.widgets.learningStreak.best': 'Best',
      'statistics.widgets.learningStreak.achievements.weeklyWarrior': 'Weekly Warrior!',
      'statistics.widgets.learningStreak.achievements.monthlyMaster': 'Monthly Master!',
      'statistics.widgets.learningStreak.achievements.centuryClub': 'Century Club!',
      'statistics.widgets.learningStreak.achievements.yearLongLearner': 'Year-Long Learner!',
      'statistics.widgets.learningStreak.achievements.keepUpConsistency': 'Keep up the amazing consistency!',

      // Spaced Repetition Insights Widget
      'statistics.widgets.spacedRepetition.title': 'Algorithm Insights',
      'statistics.widgets.spacedRepetition.retentionRate': 'Retention Rate',
      'statistics.widgets.spacedRepetition.averageInterval': 'Average Interval',
      'statistics.widgets.spacedRepetition.newVsReviewBalance': 'New vs Review Balance',
      'statistics.widgets.spacedRepetition.newCards': 'New Cards',
      'statistics.widgets.spacedRepetition.dueCards': 'Due Cards',
      'statistics.widgets.spacedRepetition.reviewDays': 'Review Days',
      'statistics.widgets.spacedRepetition.dueToday': 'Due Today',
      'statistics.widgets.spacedRepetition.timeBetweenReviews': 'Time between reviews',
      'statistics.widgets.spacedRepetition.retentionMessages.noData': 'No data yet',
      'statistics.widgets.spacedRepetition.retentionMessages.excellent': 'Excellent retention!',
      'statistics.widgets.spacedRepetition.retentionMessages.good': 'Good retention',
      'statistics.widgets.spacedRepetition.retentionMessages.fair': 'Fair retention',
      'statistics.widgets.spacedRepetition.retentionMessages.needsImprovement': 'Needs improvement',
      'statistics.widgets.spacedRepetition.intervalEfficiency.unknown': 'Unknown',
      'statistics.widgets.spacedRepetition.intervalEfficiency.excellent': 'Excellent',
      'statistics.widgets.spacedRepetition.intervalEfficiency.good': 'Good',
      'statistics.widgets.spacedRepetition.intervalEfficiency.fair': 'Fair',
      'statistics.widgets.spacedRepetition.intervalEfficiency.learning': 'Learning',
      'statistics.widgets.spacedRepetition.algorithmTip': 'Algorithm Tip',
      'statistics.widgets.spacedRepetition.tips.improveRetention': 'Consider reviewing cards more frequently to improve retention.',
      'statistics.widgets.spacedRepetition.tips.frequentReviews': 'Your cards are being reviewed frequently - great for learning new material!',
      'statistics.widgets.spacedRepetition.tips.balanceDueCards': 'Focus on clearing due cards before adding new ones for better balance.',
      'statistics.widgets.spacedRepetition.tips.workingWell': 'Your spaced repetition is working well! Keep up the consistent practice.',
      'statistics.widgets.spacedRepetition.balancePercentage': '{{newPercentage}}% new cards, {{reviewPercentage}}% reviews',

      // Study History Heatmap
      'statistics.heatmap.title': 'Study Activity',
      'statistics.heatmap.subtitle': '{{count}} days of study activity in the last year',
      'statistics.heatmap.legend.less': 'Less',
      'statistics.heatmap.legend.more': 'More',
      'statistics.heatmap.stats.cardsStudied': 'Cards studied',
      'statistics.heatmap.stats.activeDays': 'Active days',
      'statistics.heatmap.stats.bestDay': 'Best day',
      'statistics.heatmap.stats.studyRate': 'Study rate',

      // Statistics Dashboard
      'statistics.dashboard.title': 'Learning Analytics',
      'statistics.dashboard.subtitle': 'Comprehensive insights into your flashcard learning progress',
      'statistics.dashboard.backToDashboard': 'Back to dashboard',
      'statistics.dashboard.dateRange.last7Days': 'Last 7 days',
      'statistics.dashboard.dateRange.last30Days': 'Last 30 days',
      'statistics.dashboard.dateRange.last90Days': 'Last 90 days',
      'statistics.dashboard.dateRange.allTime': 'All time',
      'statistics.dashboard.export.exportData': 'Export Data',
      'statistics.dashboard.export.exporting': 'Exporting...',
      'statistics.dashboard.export.exportAsCSV': 'Export as CSV',
      'statistics.dashboard.export.exportAsJSON': 'Export as JSON',
      'statistics.dashboard.export.exportSuccess': 'Statistics exported as {{format}}',
      'statistics.dashboard.export.exportError': 'Failed to export statistics',

      // Statistics Table
      'statistics.table.deckPerformance.title': 'Deck Performance Overview',
      'statistics.table.deckPerformance.headers.deck': 'Deck',
      'statistics.table.deckPerformance.headers.cards': 'Cards',
      'statistics.table.deckPerformance.headers.mastered': 'Mastered',
      'statistics.table.deckPerformance.headers.progress': 'Progress',
      'statistics.table.deckPerformance.headers.avgEase': 'Avg. Ease',
    }
  },
  de: {
    translation: {
      // Basic German translations for testing
      'statistics.heatmap.title': 'Lernaktivität',
      'statistics.heatmap.subtitle': '{{count}} Tage Lernaktivität im letzten Jahr',
      'statistics.charts.studyActivity.title': 'Lernaktivität über Zeit',
      'statistics.widgets.learningStreak.title': 'Lernserie',
      'statistics.loading.dashboard': 'Statistik-Dashboard wird geladen',
      'statistics.cards.totalDecks': 'Stapel gesamt',
      'statistics.cards.totalCards': 'Karten gesamt',
      'statistics.cards.dueToday': 'Heute fällig',
      'statistics.cards.currentStreak': 'Aktuelle Serie'
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
