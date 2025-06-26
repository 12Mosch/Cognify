import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Mock translations for testing
const mockTranslations = {
	de: {
		translation: {
			"statistics.cards.currentStreak": "Aktuelle Serie",
			"statistics.cards.dueToday": "Heute fällig",
			"statistics.cards.totalCards": "Karten gesamt",
			"statistics.cards.totalDecks": "Stapel gesamt",
			"statistics.charts.studyActivity.title": "Lernaktivität über Zeit",
			"statistics.heatmap.subtitle":
				"{{count}} Tage Lernaktivität im letzten Jahr",
			// Basic German translations for testing
			"statistics.heatmap.title": "Lernaktivität",
			"statistics.heatmap.tooltip.card": "Karte",
			"statistics.heatmap.tooltip.cards": "Karten",
			"statistics.heatmap.tooltip.noActivity": "Keine Lernaktivität am",
			"statistics.heatmap.tooltip.session": "Sitzung",
			"statistics.heatmap.tooltip.sessions": "Sitzungen",
			"statistics.heatmap.tooltip.studiedOn": "gelernt am",
			"statistics.loading.dashboard": "Statistik-Dashboard wird geladen",
			"statistics.widgets.learningStreak.title": "Lernserie",
		},
	},
	en: {
		translation: {
			"app.goToMainDashboard": "Go to main dashboard",
			// App
			"app.title": "Cognify",

			// Common
			"common.cancel": "Cancel",
			"common.delete": "Delete",
			"common.edit": "Edit",
			"common.error": "Error",
			"common.from": "from",
			"common.loading": "Loading...",
			"common.moreCards": "more cards",
			"common.save": "Save",
			"common.studyMode": "Study Mode",
			"common.success": "Success",
			"common.whatsNext": "What's Next?",

			// Components
			"components.errorBoundary.authConfigError":
				"Authentication Configuration Error",
			"components.errorBoundary.componentStack": "Component Stack:",
			"components.errorBoundary.reloadPage": "Reload Page",
			"components.errorBoundary.showTechnicalDetails": "Show technical details",
			"components.errorBoundary.temporaryIssue":
				"We encountered a temporary issue. You can try again or reload the page.",
			"components.errorBoundary.tryAgain": "Try Again",
			"components.errorBoundary.unexpectedError":
				"An unexpected error occurred. Please reload the page or contact support if the problem persists.",
			"components.gestureTutorial.basicMode.flipCards.description":
				"Swipe left or tap anywhere to flip the card and see the answer.",
			"components.gestureTutorial.basicMode.flipCards.instruction":
				"Try swiping left on any flashcard to reveal the answer.",
			"components.gestureTutorial.basicMode.flipCards.title": "Flip Cards",
			"components.gestureTutorial.basicMode.nextCard.description":
				"Swipe right to move to the next card in your deck.",
			"components.gestureTutorial.basicMode.nextCard.instruction":
				"Swipe right when you're ready for the next question.",
			"components.gestureTutorial.basicMode.nextCard.title": "Next Card",

			"components.gestureTutorial.basicMode.welcome.description":
				"Learn how to navigate flashcards with simple gestures.",
			"components.gestureTutorial.basicMode.welcome.instruction":
				"Swipe gestures make studying faster and more intuitive.",
			"components.gestureTutorial.basicMode.welcome.title":
				"Welcome to Touch Controls!",
			"components.gestureTutorial.buttons.gotIt": "Got it",
			"components.gestureTutorial.buttons.next": "Next",
			"components.gestureTutorial.buttons.previous": "Previous",
			"components.gestureTutorial.buttons.skipTutorial": "Skip Tutorial",
			"components.gestureTutorial.spacedRepetition.flipCards.description":
				"Swipe left or tap to reveal the answer.",
			"components.gestureTutorial.spacedRepetition.flipCards.instruction":
				"Swipe left to see the answer and rate your knowledge.",
			"components.gestureTutorial.spacedRepetition.flipCards.title":
				"Flip Cards",
			"components.gestureTutorial.spacedRepetition.rateAgain.description":
				"Swipe down when you didn't know the answer.",
			"components.gestureTutorial.spacedRepetition.rateAgain.instruction":
				'Down swipe = "Again" - study this card more.',
			"components.gestureTutorial.spacedRepetition.rateAgain.title":
				"Rate Again",
			"components.gestureTutorial.spacedRepetition.rateEasy.description":
				"Swipe right when you knew the answer perfectly.",
			"components.gestureTutorial.spacedRepetition.rateEasy.instruction":
				'Right swipe = "Easy" - you knew this perfectly!',
			"components.gestureTutorial.spacedRepetition.rateEasy.title": "Rate Easy",
			"components.gestureTutorial.spacedRepetition.welcome.description":
				"Learn gesture controls for spaced repetition study mode.",
			"components.gestureTutorial.spacedRepetition.welcome.instruction":
				"Gestures help you rate cards quickly during study sessions.",
			"components.gestureTutorial.spacedRepetition.welcome.title":
				"Welcome to Smart Study!",

			"components.helpIcon.ariaLabel": "Show keyboard shortcuts help",
			"components.helpIcon.helpIcon": "Help icon",
			"components.helpIcon.title": "Keyboard shortcuts (?)",

			"components.keyboardShortcuts.closeHelp": "to close this help",
			"components.keyboardShortcuts.closeIcon": "Close icon",
			"components.keyboardShortcuts.closeShortcutsHelp": "Close shortcuts help",
			"components.keyboardShortcuts.pressEscToClose": "Press",
			"components.keyboardShortcuts.title": "Keyboard Shortcuts",

			"components.loading.card": "Loading card",
			"components.loading.deck": "Loading deck",
			"components.loading.decks": "Loading decks",
			"components.loading.deckView": "Loading deck view",
			"components.loading.default": "Loading",
			"components.loading.flashcard": "Loading flashcard",
			"components.loading.statistics": "Loading statistics",
			"components.loading.studyHistoryHeatmap": "Loading study history heatmap",
			"dashboard.buttons.createDeck": "Create Deck",
			"dashboard.buttons.quickAddCard": "Quick Add Card",
			"dashboard.buttons.showStatistics": "Show Statistics",
			"dashboard.subtitle.empty": "Create your first deck to get started",
			"dashboard.subtitle.withDecks_one": "{{count}} deck",
			"dashboard.subtitle.withDecks_other": "{{count}} decks",

			// Dashboard
			"dashboard.title": "My Flashcard Decks",

			// Deck
			"deck.cardCount_one": "{{count}} card",
			"deck.cardCount_other": "{{count}} cards",
			"deck.createdOn": "Created {{date}}",
			"deck.dueCards_one": "{{count}} due",
			"deck.dueCards_other": "{{count}} due",
			"deck.manageCards": "Manage Cards",
			"deck.manageCardsAria": "Manage cards in {{deckName}} deck",
			"deck.newCards_one": "{{count}} new",
			"deck.newCards_other": "{{count}} new",
			"deck.noDescription": "No description",
			"deck.studyAria": "Study {{deckName}} deck",
			"deck.studyNow": "Study Now",
			"deckView.confirmDelete": "Are you sure you want to delete this card?",
			"deckView.deleteCard": "Delete Card",

			// Deck View
			"deckView.editCard": "Edit Card",

			// Errors
			"errors.generic": "Something went wrong. Please try again.",
			"errors.networkError": "Network error. Please check your connection.",
			"errors.notFound": "The requested resource was not found.",
			"errors.unauthorized": "You are not authorized to perform this action.",
			"forms.createDeck.cancel": "Cancel",
			"forms.createDeck.create": "Create Deck",
			"forms.createDeck.creating": "Creating...",
			"forms.createDeck.description": "Description (optional)",
			"forms.createDeck.descriptionPlaceholder": "Enter deck description",
			"forms.createDeck.name": "Deck Name",
			"forms.createDeck.namePlaceholder": "Enter deck name",

			// Forms
			"forms.createDeck.title": "Create New Deck",
			"forms.quickAddCard.add": "Add Card",
			"forms.quickAddCard.adding": "Adding...",
			"forms.quickAddCard.back": "Back (Answer)",
			"forms.quickAddCard.backPlaceholder": "Enter answer or explanation",
			"forms.quickAddCard.characterCount": "{{current}}/{{max}} characters",
			"forms.quickAddCard.front": "Front (Question)",
			"forms.quickAddCard.frontPlaceholder": "Enter question or prompt",

			"forms.quickAddCard.title": "Quick Add Card",
			"forms.quickAddCard.updating": "Updating...",
			"forms.validation.backRequired": "Back content is required",
			"forms.validation.deckNameRequired": "Deck name is required",
			"forms.validation.frontRequired": "Front content is required",
			"forms.validation.maxLength":
				"{{field}} cannot exceed {{max}} characters",

			"forms.validation.required": "This field is required",
			"navigation.selectLanguage": "Select Language",

			// Navigation
			"navigation.settings": "Settings",
			"navigation.signOut": "Sign Out",
			"notifications.cardAdded": "Card added successfully!",
			"notifications.cardDeleted": "Card deleted successfully!",
			"notifications.cardUpdated": "Card updated successfully!",

			// Notifications
			"notifications.deckCreated": "Deck created successfully!",
			"notifications.deckCreatedWithName":
				'"{{deckName}}" created successfully!',
			"notifications.networkError":
				"Network error. Please check your connection and try again.",
			"notifications.studySessionCompleted": "Study session completed!",
			"notifications.studySessionCompletedWithCount_one":
				"Study session complete! Reviewed {{count}} card.",
			"notifications.studySessionCompletedWithCount_other":
				"Study session complete! Reviewed {{count}} cards.",
			"notifications.temporaryError":
				"Something went wrong. Please try again in a moment.",
			"postSessionSummary.actions.continueStudying": "Continue Studying",
			"postSessionSummary.actions.returnToDashboard": "Return to Dashboard",
			"postSessionSummary.encouragement":
				"Keep up the great work! Consistent practice leads to long-term retention.",
			"postSessionSummary.stats.cardsReviewed": "Cards Reviewed",
			"postSessionSummary.stats.studyMode": "Study Mode",
			"postSessionSummary.stats.studyTime": "Study Time",
			"postSessionSummary.subtitle": "Great job! Here's how you did:",

			// Post Session Summary
			"postSessionSummary.title": "Study Session Complete!",
			"settings.close": "Close settings",
			"settings.featureFlags.description":
				"Enable or disable experimental features and development tools.",
			"settings.featureFlags.title": "Feature Flags",
			"settings.privacy.description":
				"Manage your privacy preferences and data collection settings.",
			"settings.privacy.title": "Privacy Settings",
			"settings.tabs.account": "Account",
			"settings.tabs.security": "Security",

			// Settings
			"settings.title": "Settings",
			"statistics.cards.averageInterval": "Average Interval",
			"statistics.cards.bestDays": "Best: {{count}} days",
			"statistics.cards.betweenReviews": "Between reviews",
			"statistics.cards.cardsToReview": "Cards to review",
			"statistics.cards.currentStreak": "Current Streak",
			"statistics.cards.day": "day",
			"statistics.cards.days": "days",
			"statistics.cards.dueToday": "Due Today",
			"statistics.cards.flashcardsCreated": "Flashcards created",
			"statistics.cards.learningCollections": "Learning collections",
			"statistics.cards.newCards": "New Cards",
			"statistics.cards.readyToLearn": "Ready to learn",
			"statistics.cards.retentionRate": "Retention Rate",
			"statistics.cards.studySessions": "Study Sessions",
			"statistics.cards.successRate": "Success rate",
			"statistics.cards.totalCards": "Total Cards",
			"statistics.cards.totalCompleted": "Total completed",

			// Statistics Cards
			"statistics.cards.totalDecks": "Total Decks",
			"statistics.charts.cardDistribution.beingLearned": "Cards being learned",
			"statistics.charts.cardDistribution.due": "Due",
			"statistics.charts.cardDistribution.dueForReview": "Cards due for review",
			"statistics.charts.cardDistribution.inReviewCycle":
				"Cards in review cycle",
			"statistics.charts.cardDistribution.learning": "Learning",
			"statistics.charts.cardDistribution.mastered": "Mastered",
			"statistics.charts.cardDistribution.neverStudied": "Cards never studied",
			"statistics.charts.cardDistribution.newCards": "New Cards",
			"statistics.charts.cardDistribution.noData": "No cards available",
			"statistics.charts.cardDistribution.review": "Review",
			"statistics.charts.cardDistribution.subtitle":
				"Overview of your cards across learning stages",

			// Card Distribution Chart
			"statistics.charts.cardDistribution.title": "Card Distribution",
			"statistics.charts.cardDistribution.wellLearned": "Well-learned cards",
			"statistics.charts.deckPerformance.averageEase": "Avg. Ease",
			"statistics.charts.deckPerformance.clickToSelect": "Click to select deck",
			"statistics.charts.deckPerformance.masteredCards": "Mastered Cards",
			"statistics.charts.deckPerformance.masteryPercentage": "Progress",
			"statistics.charts.deckPerformance.noData":
				"No deck performance data available.",
			"statistics.charts.deckPerformance.subtitle":
				"Compare mastery progress across your decks",

			// Deck Performance Chart
			"statistics.charts.deckPerformance.title": "Deck Performance",
			"statistics.charts.deckPerformance.totalCards": "Total Cards",
			"statistics.charts.studyActivity.cardsStudied": "Cards Studied",
			"statistics.charts.studyActivity.noData":
				"No study activity data available for the selected period.",
			"statistics.charts.studyActivity.sessions": "Sessions",
			"statistics.charts.studyActivity.subtitle":
				"Track your learning consistency and progress patterns",
			"statistics.charts.studyActivity.timeMinutes": "Time (min)",

			// Study Activity Chart
			"statistics.charts.studyActivity.title": "Study Activity Over Time",
			"statistics.charts.studyActivity.totalCards":
				"Total cards studied: {{count}}",
			"statistics.charts.studyActivity.totalSessions":
				"Total sessions: {{count}}",
			"statistics.charts.studyActivity.totalTime":
				"Total time: {{hours}}h {{minutes}}m",
			"statistics.dashboard.backToDashboard": "Back to dashboard",
			"statistics.dashboard.dateRange.allTime": "All time",
			"statistics.dashboard.dateRange.last7Days": "Last 7 days",
			"statistics.dashboard.dateRange.last30Days": "Last 30 days",
			"statistics.dashboard.dateRange.last90Days": "Last 90 days",
			"statistics.dashboard.export.exportAsCSV": "Export as CSV",
			"statistics.dashboard.export.exportAsJSON": "Export as JSON",
			"statistics.dashboard.export.exportData": "Export Data",
			"statistics.dashboard.export.exportError": "Failed to export statistics",
			"statistics.dashboard.export.exporting": "Exporting...",
			"statistics.dashboard.export.exportSuccess":
				"Statistics exported as {{format}}",
			"statistics.dashboard.subtitle":
				"Comprehensive insights into your flashcard learning progress",

			// Statistics Dashboard
			"statistics.dashboard.title": "Learning Analytics",
			"statistics.heatmap.legend.less": "Less",
			"statistics.heatmap.legend.more": "More",
			"statistics.heatmap.stats.activeDays": "Active days",
			"statistics.heatmap.stats.bestDay": "Best day",
			"statistics.heatmap.stats.cardsStudied": "Cards studied",
			"statistics.heatmap.stats.studyRate": "Study rate",
			"statistics.heatmap.subtitle":
				"{{count}} days of study activity in the last year",

			// Study History Heatmap
			"statistics.heatmap.title": "Study Activity",
			"statistics.heatmap.tooltip.card": "card",
			"statistics.heatmap.tooltip.cards": "cards",
			"statistics.heatmap.tooltip.noActivity": "No study activity on",
			"statistics.heatmap.tooltip.session": "session",
			"statistics.heatmap.tooltip.sessions": "sessions",
			"statistics.heatmap.tooltip.studiedOn": "studied on",
			"statistics.loading.chartTitle": "Loading {{title}}...",
			"statistics.loading.dashboard": "Loading statistics dashboard",
			"statistics.table.deckPerformance.headers.avgEase": "Avg. Ease",
			"statistics.table.deckPerformance.headers.cards": "Cards",
			"statistics.table.deckPerformance.headers.deck": "Deck",
			"statistics.table.deckPerformance.headers.mastered": "Mastered",
			"statistics.table.deckPerformance.headers.progress": "Progress",

			// Statistics Table
			"statistics.table.deckPerformance.title": "Deck Performance Overview",

			// Statistics
			"statistics.title": "Statistics Dashboard",
			"statistics.widgets.learningStreak.achievements.centuryClub":
				"Century Club!",
			"statistics.widgets.learningStreak.achievements.keepUpConsistency":
				"Keep up the amazing consistency!",
			"statistics.widgets.learningStreak.achievements.monthlyMaster":
				"Monthly Master!",
			"statistics.widgets.learningStreak.achievements.weeklyWarrior":
				"Weekly Warrior!",
			"statistics.widgets.learningStreak.achievements.yearLongLearner":
				"Year-Long Learner!",
			"statistics.widgets.learningStreak.best": "Best",
			"statistics.widgets.learningStreak.current": "Current",
			"statistics.widgets.learningStreak.messages.buildingMomentum":
				"Building momentum!",
			"statistics.widgets.learningStreak.messages.greatStart":
				"Great start! Keep it up!",
			"statistics.widgets.learningStreak.messages.incredibleDedication":
				"Incredible dedication!",
			"statistics.widgets.learningStreak.messages.legendaryLearner":
				"Legendary learner! 🏆",
			"statistics.widgets.learningStreak.messages.onFire": "You're on fire! 🔥",
			"statistics.widgets.learningStreak.messages.start":
				"Start your learning journey!",
			"statistics.widgets.learningStreak.milestones.daysToReach_one":
				"{{count}} day to reach {{milestone}}-day milestone",
			"statistics.widgets.learningStreak.milestones.daysToReach_other":
				"{{count}} days to reach {{milestone}}-day milestone",
			"statistics.widgets.learningStreak.milestones.progressTo":
				"Progress to {{milestone}} days",

			// Learning Streak Widget
			"statistics.widgets.learningStreak.title": "Learning Streak",
			"statistics.widgets.spacedRepetition.algorithmTip": "Algorithm Tip",
			"statistics.widgets.spacedRepetition.averageInterval": "Average Interval",
			"statistics.widgets.spacedRepetition.balancePercentage":
				"{{newPercentage}}% new cards, {{reviewPercentage}}% reviews",
			"statistics.widgets.spacedRepetition.dueCards": "Due Cards",
			"statistics.widgets.spacedRepetition.dueToday": "Due Today",
			"statistics.widgets.spacedRepetition.intervalEfficiency.excellent":
				"Excellent",
			"statistics.widgets.spacedRepetition.intervalEfficiency.fair": "Fair",
			"statistics.widgets.spacedRepetition.intervalEfficiency.good": "Good",
			"statistics.widgets.spacedRepetition.intervalEfficiency.learning":
				"Learning",
			"statistics.widgets.spacedRepetition.intervalEfficiency.unknown":
				"Unknown",
			"statistics.widgets.spacedRepetition.newCards": "New Cards",
			"statistics.widgets.spacedRepetition.newVsReviewBalance":
				"New vs Review Balance",
			"statistics.widgets.spacedRepetition.retentionMessages.excellent":
				"Excellent retention!",
			"statistics.widgets.spacedRepetition.retentionMessages.fair":
				"Fair retention",
			"statistics.widgets.spacedRepetition.retentionMessages.good":
				"Good retention",
			"statistics.widgets.spacedRepetition.retentionMessages.needsImprovement":
				"Needs improvement",
			"statistics.widgets.spacedRepetition.retentionMessages.noData":
				"No data yet",
			"statistics.widgets.spacedRepetition.retentionRate": "Retention Rate",
			"statistics.widgets.spacedRepetition.reviewDays": "Review Days",
			"statistics.widgets.spacedRepetition.timeBetweenReviews":
				"Time between reviews",
			"statistics.widgets.spacedRepetition.tips.balanceDueCards":
				"Focus on clearing due cards before adding new ones for better balance.",
			"statistics.widgets.spacedRepetition.tips.frequentReviews":
				"Your cards are being reviewed frequently - great for learning new material!",
			"statistics.widgets.spacedRepetition.tips.improveRetention":
				"Consider reviewing cards more frequently to improve retention.",
			"statistics.widgets.spacedRepetition.tips.workingWell":
				"Your spaced repetition is working well! Keep up the consistent practice.",

			// Spaced Repetition Insights Widget
			"statistics.widgets.spacedRepetition.title": "Algorithm Insights",
			"statistics.widgets.upcomingReviews.allCaughtUp": "All caught up!",
			"statistics.widgets.upcomingReviews.card": "card",
			"statistics.widgets.upcomingReviews.cards": "cards",
			"statistics.widgets.upcomingReviews.moreReviewsScheduled_one":
				"+{{count}} more review scheduled",
			"statistics.widgets.upcomingReviews.moreReviewsScheduled_other":
				"+{{count}} more reviews scheduled",
			"statistics.widgets.upcomingReviews.noReviewsScheduled":
				"No reviews scheduled for the next week",
			"statistics.widgets.upcomingReviews.reviewDays": "Review Days",

			// Upcoming Reviews Widget
			"statistics.widgets.upcomingReviews.title": "Upcoming Reviews",
			"statistics.widgets.upcomingReviews.today": "Today",
			"statistics.widgets.upcomingReviews.tomorrow": "Tomorrow",
			"statistics.widgets.upcomingReviews.totalCards": "Total Cards",
			"streak.days_one": "{{count}} day",
			"streak.days_other": "{{count}} days",
			"streak.display.day": "day",
			"streak.display.days": "days",
			"streak.display.daysToGo": "{{count}} days to go",
			"streak.display.longestStreak": "Longest Streak",
			"streak.display.milestoneAchieved": "{{count}} days",
			"streak.display.milestonesAchieved": "Milestones Achieved",
			"streak.display.nextMilestone": "Next milestone",
			"streak.display.status.buildingMomentum.message":
				"Keep going to reach your first milestone",
			"streak.display.status.buildingMomentum.title": "Building Momentum! 🌱",
			"streak.display.status.greatProgress.message":
				"You're developing a strong habit",
			"streak.display.status.greatProgress.title": "Great Progress! 🔥",
			"streak.display.status.startStreak.message":
				"Study today to begin your learning journey",
			"streak.display.status.startStreak.title": "Start Your Streak! 🎯",
			"streak.display.status.streakMaster.message":
				"You're a dedicated learner",
			"streak.display.status.streakMaster.title": "Streak Master! 🏆",

			// Streak Display
			"streak.display.title": "Study Streak",
			"streak.display.totalDays": "Total Days",
			"study.allCaughtUp.sessionStats_one":
				"Great work! You've reviewed {{count}} card in this session.",
			"study.allCaughtUp.sessionStats_other":
				"Great work! You've reviewed {{count}} cards in this session.",
			"study.cardProgress": "Card {{current}} of {{total}}",
			"study.difficulty.again": "Again",
			"study.difficulty.easy": "Easy",
			"study.difficulty.good": "Good",
			"study.difficulty.hard": "Hard",
			"study.exitStudy": "Exit Study",
			"study.exitStudySession": "Exit Study Session",

			// Study
			"study.flip": "Flip",
			"study.modeSelector.basicStudy.description":
				"Simple sequential review of all cards in the deck.",
			"study.modeSelector.basicStudy.features.quick": "Quick Setup",
			"study.modeSelector.basicStudy.features.sequential": "Sequential Review",
			"study.modeSelector.basicStudy.features.simple": "Simple Interface",
			"study.modeSelector.basicStudy.title": "Basic Study",
			"study.modeSelector.cancel": "Cancel",
			"study.modeSelector.info.description":
				"Spaced repetition is a learning technique that involves reviewing information at increasing intervals to improve long-term retention.",
			"study.modeSelector.info.title": "What is Spaced Repetition?",
			"study.modeSelector.spacedRepetition.description":
				"Intelligent scheduling based on the SM-2 algorithm.",
			"study.modeSelector.spacedRepetition.features.algorithm":
				"SM-2 Algorithm",
			"study.modeSelector.spacedRepetition.features.retention":
				"Better Retention",
			"study.modeSelector.spacedRepetition.features.timing": "Optimal Timing",
			"study.modeSelector.spacedRepetition.subtitle": "Recommended",
			"study.modeSelector.spacedRepetition.title": "Spaced Repetition",
			"study.modeSelector.subtitle":
				"How would you like to study {{deckName}}?",

			// Study Mode Selector
			"study.modeSelector.title": "Choose Study Mode",
			"study.next": "Next",
			"study.previous": "Previous",
			"study.progress.aria":
				"Study progress: {{current}} of {{total}} cards completed, {{percentage}}% done",
			"study.progress.cardPosition": "Card {{current}} of {{total}}",
			"study.progress.completed": "Complete",
			"study.progress.completedAria":
				"Study session completed! All {{total}} cards reviewed.",
			"study.progress.inProgressAria":
				"Study session in progress: {{current}} of {{total}} cards completed",
			"study.session.completed": "Completed",
			"study.showAnswer": "Show Answer",
			"study.showBack": "Show Back",
			"study.showFront": "Show Front",
			"study.spacedRepetitionMode": "Spaced Repetition Mode",
		},
	},
};

// Initialize i18n for testing with mock translations
void i18n.use(initReactI18next).init({
	contextSeparator: "_",
	debug: false,
	fallbackLng: "en",

	// Ensure synchronous behavior in tests
	initImmediate: false,

	interpolation: {
		escapeValue: false, // React already does escaping
	},
	lng: "en",

	// Disable loading from external sources in tests
	load: "languageOnly",

	// Pluralization options
	pluralSeparator: "_",
	preload: ["en"],

	resources: mockTranslations,
});

export default i18n;
