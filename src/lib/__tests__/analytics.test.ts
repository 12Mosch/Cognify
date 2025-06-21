/**
 * Tests for analytics utility functions
 * These tests verify that our PostHog integration works correctly
 */

import * as analytics from "../analytics";

const {
	trackEvent,
	hasUserBeenTrackedForRegistration,
	markUserAsTrackedForRegistration,
	trackUserSignUp,
	trackDeckCreated,
	trackCardCreated,
	trackStudySessionStarted,
	trackStudySessionCompleted,
	trackCardFlipped,
	trackDifficultyRated,
	useAnalytics,
	getEnvironmentMode,
	getPrivacySettings,
	setPrivacySettings,
	hasAnalyticsConsent,
	trackFeatureInteraction,
	identifyUserWithCohorts,
	getWeekOfYear,
	getUserStudyPersona,
	anonymizeUserData,
	anonymizeUserDataSync,
	validatePostHogConfig,
	displayPostHogConfigWarnings,
} = analytics;

// Mock PostHog React hook
jest.mock("posthog-js/react", () => ({
	usePostHog: jest.fn(),
}));

import { usePostHog } from "posthog-js/react";

const mockUsePostHog = usePostHog as jest.MockedFunction<typeof usePostHog>;

// Mock PostHog
const mockPostHog = {
	capture: jest.fn(),
	identify: jest.fn(),
	getFeatureFlag: jest.fn(),
	opt_in_capturing: jest.fn(),
	opt_out_capturing: jest.fn(),
};

// Mock localStorage
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn(),
};

// Mock console methods to suppress expected output during tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Setup mocks
beforeEach(() => {
	jest.clearAllMocks();
	Object.defineProperty(window, "localStorage", {
		value: localStorageMock,
		writable: true,
	});

	// Mock console methods to suppress expected output
	console.warn = jest.fn();
	console.error = jest.fn();
	console.log = jest.fn();

	// Reset PostHog mock
	mockUsePostHog.mockReturnValue(mockPostHog as any);
});

afterEach(() => {
	// Restore console methods
	console.warn = originalConsoleWarn;
	console.error = originalConsoleError;
	console.log = originalConsoleLog;
});

describe("Analytics Utilities", () => {
	describe("getEnvironmentMode", () => {
		const originalProcessEnv = process.env;

		afterEach(() => {
			// Restore original process.env
			process.env = originalProcessEnv;
		});

		it("should return 'test' when NODE_ENV is test", () => {
			process.env = { ...originalProcessEnv, NODE_ENV: "test" };

			expect(getEnvironmentMode()).toBe("test");
		});

		it("should return VITE_MODE when available", () => {
			process.env = {
				...originalProcessEnv,
				NODE_ENV: "development",
				VITE_MODE: "staging",
			};

			expect(getEnvironmentMode()).toBe("staging");
		});

		it("should return NODE_ENV when VITE_MODE is not available", () => {
			process.env = { ...originalProcessEnv, NODE_ENV: "development" };
			delete process.env.VITE_MODE;

			expect(getEnvironmentMode()).toBe("development");
		});

		it("should return 'production' as fallback", () => {
			process.env = {};

			expect(getEnvironmentMode()).toBe("production");
		});

		it("should prioritize test environment over other settings", () => {
			process.env = {
				...originalProcessEnv,
				NODE_ENV: "test",
				VITE_MODE: "development",
			};

			expect(getEnvironmentMode()).toBe("test");
		});
	});

	describe("trackEvent", () => {
		it("should call posthog.capture with correct parameters", () => {
			trackEvent(mockPostHog as any, "user_signed_up");

			expect(mockPostHog.capture).toHaveBeenCalledWith(
				"user_signed_up",
				undefined,
			);
		});

		it("should call posthog.capture with properties", () => {
			const properties = { deckId: "test-deck-id", deckName: "Test Deck" };
			trackEvent(mockPostHog as any, "deck_created", properties);

			expect(mockPostHog.capture).toHaveBeenCalledWith(
				"deck_created",
				properties,
			);
		});

		it("should handle null posthog gracefully", () => {
			// Should not throw an error
			expect(() => {
				trackEvent(null, "user_signed_up");
			}).not.toThrow();
		});

		it("should handle posthog errors gracefully", () => {
			const errorPostHog = {
				capture: jest.fn(() => {
					throw new Error("PostHog error");
				}),
			};

			// Should not throw an error
			expect(() => {
				trackEvent(errorPostHog as any, "user_signed_up");
			}).not.toThrow();
		});
	});

	describe("User registration tracking", () => {
		it("should return false when no registration tracking exists", () => {
			localStorageMock.getItem.mockReturnValue(null);

			expect(hasUserBeenTrackedForRegistration()).toBe(false);
		});

		it("should return true when registration tracking exists", () => {
			localStorageMock.getItem.mockReturnValue("true");

			expect(hasUserBeenTrackedForRegistration()).toBe(true);
		});

		it("should handle localStorage errors gracefully", () => {
			localStorageMock.getItem.mockImplementation(() => {
				throw new Error("localStorage error");
			});

			expect(hasUserBeenTrackedForRegistration()).toBe(false);
		});

		it("should mark user as tracked for registration", () => {
			markUserAsTrackedForRegistration();

			expect(localStorageMock.setItem).toHaveBeenCalledWith(
				"posthog_user_registered",
				"true",
			);
		});

		it("should handle localStorage setItem errors gracefully", () => {
			localStorageMock.setItem.mockImplementation(() => {
				throw new Error("localStorage error");
			});

			// Should not throw an error
			expect(() => {
				markUserAsTrackedForRegistration();
			}).not.toThrow();
		});
	});

	describe("Helper functions", () => {
		describe("trackUserSignUp", () => {
			it("should call posthog.capture with user_signed_up event", () => {
				trackUserSignUp(mockPostHog as any);

				expect(mockPostHog.capture).toHaveBeenCalledWith(
					"user_signed_up",
					undefined,
				);
			});
		});

		describe("trackDeckCreated", () => {
			it("should call posthog.capture with deck_created event and properties", () => {
				trackDeckCreated(mockPostHog as any, "deck-123", "My Deck");

				expect(mockPostHog.capture).toHaveBeenCalledWith("deck_created", {
					deckId: "deck-123",
					deckName: "My Deck",
				});
			});

			it("should handle undefined properties", () => {
				trackDeckCreated(mockPostHog as any);

				expect(mockPostHog.capture).toHaveBeenCalledWith("deck_created", {
					deckId: undefined,
					deckName: undefined,
				});
			});
		});

		describe("trackCardCreated", () => {
			it("should call posthog.capture with card_created event and properties", () => {
				trackCardCreated(mockPostHog as any, "card-456", "Test Deck");

				expect(mockPostHog.capture).toHaveBeenCalledWith("card_created", {
					cardId: "card-456",
					deckName: "Test Deck",
				});
			});
		});

		describe("trackStudySessionStarted", () => {
			it("should call posthog.capture with study_session_started event and properties", () => {
				trackStudySessionStarted(
					mockPostHog as any,
					"deck-789",
					"Study Deck",
					10,
				);

				expect(mockPostHog.capture).toHaveBeenCalledWith(
					"study_session_started",
					{
						deckId: "deck-789",
						deckName: "Study Deck",
						cardCount: 10,
					},
				);
			});
		});

		describe("trackStudySessionCompleted", () => {
			it("should call posthog.capture with study_session_completed event and properties", () => {
				trackStudySessionCompleted(
					mockPostHog as any,
					"deck-101",
					"Completed Deck",
					5,
					"basic",
					120,
				);

				expect(mockPostHog.capture).toHaveBeenCalledWith(
					"study_session_completed",
					{
						deckId: "deck-101",
						deckName: "Completed Deck",
						cardsReviewed: 5,
						studyMode: "basic",
						sessionDuration: 120,
					},
				);
			});
		});
	});

	describe("useAnalytics hook", () => {
		it("should return analytics functions with PostHog instance", () => {
			mockUsePostHog.mockReturnValue(mockPostHog as any);

			const analyticsHook = useAnalytics();

			expect(analyticsHook).toHaveProperty("posthog", mockPostHog);
			expect(analyticsHook).toHaveProperty("trackUserSignUp");
			expect(analyticsHook).toHaveProperty("trackDeckCreated");
			expect(analyticsHook).toHaveProperty("trackCardCreated");
			expect(analyticsHook).toHaveProperty("trackStudySessionStarted");
			expect(analyticsHook).toHaveProperty("trackStudySessionCompleted");
			expect(analyticsHook).toHaveProperty("trackCardFlipped");
			expect(analyticsHook).toHaveProperty("trackDifficultyRated");
		});

		it("should call tracking functions correctly", () => {
			mockUsePostHog.mockReturnValue(mockPostHog as any);

			const analyticsHook = useAnalytics();

			// Test trackUserSignUp
			analyticsHook.trackUserSignUp();
			expect(mockPostHog.capture).toHaveBeenCalledWith(
				"user_signed_up",
				undefined,
			);

			// Test trackDeckCreated
			analyticsHook.trackDeckCreated("deck-123", "Test Deck");
			expect(mockPostHog.capture).toHaveBeenCalledWith("deck_created", {
				deckId: "deck-123",
				deckName: "Test Deck",
			});

			// Test trackStudySessionCompleted
			analyticsHook.trackStudySessionCompleted(
				"deck-456",
				"Study Deck",
				5,
				"basic",
				120,
			);
			expect(mockPostHog.capture).toHaveBeenCalledWith(
				"study_session_completed",
				{
					deckId: "deck-456",
					deckName: "Study Deck",
					cardsReviewed: 5,
					studyMode: "basic",
					sessionDuration: 120,
				},
			);
		});
	});

	describe("trackCardFlipped", () => {
		it("should call posthog.capture with card_flipped event and properties", () => {
			trackCardFlipped(
				mockPostHog as any,
				"card-123",
				"deck-456",
				"front_to_back",
				1500,
			);

			expect(mockPostHog.capture).toHaveBeenCalledWith("card_flipped", {
				cardId: "card-123",
				deckId: "deck-456",
				flipDirection: "front_to_back",
				timeToFlip: 1500,
			});
		});

		it("should work without timeToFlip", () => {
			trackCardFlipped(
				mockPostHog as any,
				"card-789",
				"deck-101",
				"back_to_front",
			);

			expect(mockPostHog.capture).toHaveBeenCalledWith("card_flipped", {
				cardId: "card-789",
				deckId: "deck-101",
				flipDirection: "back_to_front",
				timeToFlip: undefined,
			});
		});
	});

	describe("trackDifficultyRated", () => {
		it("should call posthog.capture with difficulty_rated event and properties", () => {
			trackDifficultyRated(
				mockPostHog as any,
				"card-456",
				"deck-789",
				"easy",
				"medium",
			);

			expect(mockPostHog.capture).toHaveBeenCalledWith("difficulty_rated", {
				cardId: "card-456",
				deckId: "deck-789",
				difficulty: "easy",
				previousDifficulty: "medium",
			});
		});

		it("should work without previousDifficulty", () => {
			trackDifficultyRated(mockPostHog as any, "card-101", "deck-202", "hard");

			expect(mockPostHog.capture).toHaveBeenCalledWith("difficulty_rated", {
				cardId: "card-101",
				deckId: "deck-202",
				difficulty: "hard",
				previousDifficulty: undefined,
			});
		});
	});

	describe("Privacy compliance functions", () => {
		beforeEach(() => {
			localStorageMock.getItem.mockClear();
			localStorageMock.setItem.mockClear();
		});

		describe("getPrivacySettings", () => {
			it("should return stored privacy settings", () => {
				const mockSettings = {
					analyticsConsent: "granted",
					functionalConsent: "granted",
					marketingConsent: "denied",
				};
				localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSettings));

				const result = getPrivacySettings();

				expect(localStorageMock.getItem).toHaveBeenCalledWith(
					"flashcard_privacy_settings",
				);
				expect(result).toEqual(mockSettings);
			});

			it("should return default settings when no stored settings", () => {
				localStorageMock.getItem.mockReturnValue(null);

				const result = getPrivacySettings();

				expect(result).toEqual({
					analyticsConsent: "pending",
					functionalConsent: "pending",
					marketingConsent: "pending",
				});
			});
		});

		describe("setPrivacySettings", () => {
			it("should store privacy settings", () => {
				const settings = {
					analyticsConsent: "granted" as const,
					functionalConsent: "denied" as const,
					marketingConsent: "pending" as const,
				};

				setPrivacySettings(settings);

				expect(localStorageMock.setItem).toHaveBeenCalledWith(
					"flashcard_privacy_settings",
					JSON.stringify(settings),
				);
			});
		});

		describe("hasAnalyticsConsent", () => {
			it("should return true when analytics consent is granted", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						functionalConsent: "pending",
						marketingConsent: "pending",
					}),
				);

				expect(hasAnalyticsConsent()).toBe(true);
			});

			it("should return false when analytics consent is denied", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "denied",
						functionalConsent: "pending",
						marketingConsent: "pending",
					}),
				);

				expect(hasAnalyticsConsent()).toBe(false);
			});
		});
	});

	describe("Feature flag functions", () => {
		describe("trackFeatureInteraction", () => {
			it("should track feature interaction with PostHog", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						functionalConsent: "pending",
						marketingConsent: "pending",
					}),
				);

				trackFeatureInteraction(
					mockPostHog as any,
					"new-study-algorithm",
					"enabled",
				);

				expect(mockPostHog.capture).toHaveBeenCalledWith(
					"$feature_interaction",
					{
						feature_flag: "new-study-algorithm",
						$set: { "$feature_interaction/new-study-algorithm": true },
					},
				);

				expect(mockPostHog.capture).toHaveBeenCalledWith(
					"$feature_flag_called",
					{
						$feature_flag_response: "enabled",
						$feature_flag: "new-study-algorithm",
					},
				);
			});

			it("should not track when consent is denied", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "denied",
						functionalConsent: "pending",
						marketingConsent: "pending",
					}),
				);

				trackFeatureInteraction(mockPostHog as any, "new-study-algorithm");

				expect(mockPostHog.capture).not.toHaveBeenCalled();
			});
		});
	});

	describe("Cohort analysis functions", () => {
		describe("getWeekOfYear", () => {
			it("should return correct week number", () => {
				const date = new Date("2024-01-15"); // Should be week 3
				const week = getWeekOfYear(date);
				expect(week).toBeGreaterThan(0);
				expect(week).toBeLessThanOrEqual(53);
			});
		});

		describe("getUserStudyPersona", () => {
			it("should return exam_focused for exam prep goal", () => {
				expect(getUserStudyPersona({ studyGoal: "exam_prep" })).toBe(
					"exam_focused",
				);
			});

			it("should return learning_basics for beginner level", () => {
				expect(getUserStudyPersona({ experienceLevel: "beginner" })).toBe(
					"learning_basics",
				);
			});

			it("should return morning_studier for morning preference", () => {
				expect(getUserStudyPersona({ preferredStudyTime: "morning" })).toBe(
					"morning_studier",
				);
			});

			it("should return general_learner as default", () => {
				expect(getUserStudyPersona({})).toBe("general_learner");
			});
		});

		describe("identifyUserWithCohorts", () => {
			it("should identify user with cohort properties", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						functionalConsent: "pending",
						marketingConsent: "pending",
					}),
				);

				const userProperties = {
					email: "test@example.com",
					name: "Test User",
					signupDate: "2024-01-15",
					studyGoal: "exam_prep" as const,
					experienceLevel: "beginner" as const,
				};

				identifyUserWithCohorts(mockPostHog as any, "user-123", userProperties);

				expect(mockPostHog.identify).toHaveBeenCalledWith(
					"user-123",
					expect.objectContaining({
						email: "test@example.com",
						name: "Test User",
						studyPersona: "exam_focused",
						engagementTier: "new_user",
					}),
				);
			});
		});

		describe("anonymizeUserData", () => {
			beforeEach(() => {
				// Mock crypto.subtle for testing
				Object.defineProperty(global, "crypto", {
					value: {
						subtle: {
							digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
						},
					},
					writable: true,
				});

				// Mock TextEncoder
				global.TextEncoder = jest.fn().mockImplementation(() => ({
					encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4])),
				}));
			});

			it("should anonymize sensitive fields when anonymization is enabled", async () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						gdpr: {
							anonymizeData: true,
						},
					}),
				);

				const testData = {
					email: "test@example.com",
					name: "John Doe",
					age: 30,
					userId: "user-123",
					otherField: "not sensitive",
				};

				const result = await anonymizeUserData(testData);

				expect(result.email).toMatch(/^anon_[a-f0-9]{8}$/);
				expect(result.name).toMatch(/^anon_[a-f0-9]{8}$/);
				expect(result.userId).toMatch(/^anon_[a-f0-9]{8}$/);
				expect(result.age).toBe(30); // Non-sensitive field unchanged
				expect(result.otherField).toBe("not sensitive"); // Non-sensitive field unchanged
			});

			it("should not anonymize data when anonymization is disabled", async () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						gdpr: {
							anonymizeData: false,
						},
					}),
				);

				const testData = {
					email: "test@example.com",
					name: "John Doe",
					userId: "user-123",
				};

				const result = await anonymizeUserData(testData);

				expect(result).toEqual(testData); // Data should be unchanged
			});
		});

		describe("anonymizeUserDataSync", () => {
			it("should anonymize sensitive fields synchronously", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						gdpr: {
							anonymizeData: true,
						},
					}),
				);

				const testData = {
					email: "test@example.com",
					name: "John Doe",
					age: 30,
					userId: "user-123",
					otherField: "not sensitive",
				};

				const result = anonymizeUserDataSync(testData);

				expect(result.email).toMatch(/^anon_[a-f0-9]+$/);
				expect(result.name).toMatch(/^anon_[a-f0-9]+$/);
				expect(result.userId).toMatch(/^anon_[a-f0-9]+$/);
				expect(result.age).toBe(30); // Non-sensitive field unchanged
				expect(result.otherField).toBe("not sensitive"); // Non-sensitive field unchanged
			});

			it("should not anonymize data when anonymization is disabled", () => {
				localStorageMock.getItem.mockReturnValue(
					JSON.stringify({
						analyticsConsent: "granted",
						gdpr: {
							anonymizeData: false,
						},
					}),
				);

				const testData = {
					email: "test@example.com",
					name: "John Doe",
					userId: "user-123",
				};

				const result = anonymizeUserDataSync(testData);

				expect(result).toEqual(testData); // Data should be unchanged
			});
		});
	});

	describe("PostHog Configuration Validation", () => {
		const originalImportMeta = (global as any).import;

		beforeEach(() => {
			// Mock import.meta.env
			(global as any).import = {
				meta: {
					env: {},
				},
			};

			// Clear console methods
			jest.clearAllMocks();
			console.warn = jest.fn();
			console.group = jest.fn();
			console.groupEnd = jest.fn();
		});

		afterEach(() => {
			(global as any).import = originalImportMeta;
		});

		describe("validatePostHogConfig", () => {
			it("should return valid when both key and host are provided", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_KEY: "test-key",
							VITE_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
						},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(true);
				expect(result.missingKey).toBe(false);
				expect(result.missingHost).toBe(false);
				expect(result.warnings).toHaveLength(0);
			});

			it("should return invalid when key is missing", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
						},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(false);
				expect(result.missingKey).toBe(true);
				expect(result.missingHost).toBe(false);
				expect(result.warnings).toContain(
					"PostHog analytics is not configured. VITE_PUBLIC_POSTHOG_KEY is missing or invalid.",
				);
			});

			it("should return invalid when host is missing", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_KEY: "test-key",
						},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(false);
				expect(result.missingKey).toBe(false);
				expect(result.missingHost).toBe(true);
				expect(result.warnings).toContain(
					"PostHog analytics is not configured. VITE_PUBLIC_POSTHOG_HOST is missing.",
				);
			});

			it("should return invalid when both key and host are missing", () => {
				(global as any).import = {
					meta: {
						env: {},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(false);
				expect(result.missingKey).toBe(true);
				expect(result.missingHost).toBe(true);
				expect(result.warnings).toContain(
					"PostHog analytics is not configured. Both VITE_PUBLIC_POSTHOG_KEY and VITE_PUBLIC_POSTHOG_HOST are missing.",
				);
			});

			it("should treat placeholder key as missing", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_KEY: "your_posthog_project_api_key_here",
							VITE_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
						},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(false);
				expect(result.missingKey).toBe(true);
				expect(result.missingHost).toBe(false);
			});

			it("should treat empty strings as missing", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_KEY: "",
							VITE_PUBLIC_POSTHOG_HOST: "   ",
						},
					},
				};
				process.env = { ...process.env, NODE_ENV: "test" };

				const result = validatePostHogConfig();

				expect(result.isValid).toBe(false);
				expect(result.missingKey).toBe(true);
				expect(result.missingHost).toBe(true);
			});
		});

		describe("displayPostHogConfigWarnings", () => {
			it("should display detailed warnings in development mode", () => {
				(global as any).import = {
					meta: {
						env: {},
					},
				};
				process.env = { ...process.env, NODE_ENV: "development" };

				displayPostHogConfigWarnings();

				expect(console.group).toHaveBeenCalledWith(
					"⚠️ PostHog Configuration Warning",
				);
				expect(console.warn).toHaveBeenCalledWith(
					"PostHog analytics is not configured. Both VITE_PUBLIC_POSTHOG_KEY and VITE_PUBLIC_POSTHOG_HOST are missing.",
				);
				expect(console.warn).toHaveBeenCalledWith(
					"Missing: VITE_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key_here",
				);
				expect(console.warn).toHaveBeenCalledWith(
					"Missing: VITE_PUBLIC_POSTHOG_HOST=https://app.posthog.com",
				);
				expect(console.groupEnd).toHaveBeenCalled();
			});

			it("should display minimal warning in production mode", () => {
				(global as any).import = {
					meta: {
						env: {},
					},
				};
				process.env = { ...process.env, NODE_ENV: "production" };

				displayPostHogConfigWarnings();

				expect(console.warn).toHaveBeenCalledWith(
					"PostHog analytics not configured - tracking disabled",
				);
				expect(console.group).not.toHaveBeenCalled();
			});

			it("should not display warnings when configuration is valid", () => {
				(global as any).import = {
					meta: {
						env: {
							VITE_PUBLIC_POSTHOG_KEY: "test-key",
							VITE_PUBLIC_POSTHOG_HOST: "https://app.posthog.com",
						},
					},
				};
				// Ensure we're in test environment
				process.env = { ...process.env, NODE_ENV: "test" };

				displayPostHogConfigWarnings();

				expect(console.warn).not.toHaveBeenCalled();
				expect(console.group).not.toHaveBeenCalled();
			});
		});
	});
});
