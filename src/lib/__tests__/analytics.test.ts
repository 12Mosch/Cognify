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
  useAnalytics,
  getEnvironmentMode,
} = analytics;

// Mock PostHog React hook
jest.mock('posthog-js/react', () => ({
  usePostHog: jest.fn(),
}));

import { usePostHog } from 'posthog-js/react';
const mockUsePostHog = usePostHog as jest.MockedFunction<typeof usePostHog>;

// Mock PostHog
const mockPostHog = {
  capture: jest.fn(),
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
      process.env = { ...originalProcessEnv, NODE_ENV: 'test' };

      expect(getEnvironmentMode()).toBe('test');
    });

    it("should return VITE_MODE when available", () => {
      process.env = { ...originalProcessEnv, NODE_ENV: 'development', VITE_MODE: 'staging' };

      expect(getEnvironmentMode()).toBe('staging');
    });

    it("should return NODE_ENV when VITE_MODE is not available", () => {
      process.env = { ...originalProcessEnv, NODE_ENV: 'development' };
      delete process.env.VITE_MODE;

      expect(getEnvironmentMode()).toBe('development');
    });

    it("should return 'production' as fallback", () => {
      process.env = {};

      expect(getEnvironmentMode()).toBe('production');
    });

    it("should prioritize test environment over other settings", () => {
      process.env = { ...originalProcessEnv, NODE_ENV: 'test', VITE_MODE: 'development' };

      expect(getEnvironmentMode()).toBe('test');
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

        expect(mockPostHog.capture).toHaveBeenCalledWith("user_signed_up", undefined);
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
        trackStudySessionStarted(mockPostHog as any, "deck-789", "Study Deck", 10);

        expect(mockPostHog.capture).toHaveBeenCalledWith("study_session_started", {
          deckId: "deck-789",
          deckName: "Study Deck",
          cardCount: 10,
        });
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
          120
        );

        expect(mockPostHog.capture).toHaveBeenCalledWith("study_session_completed", {
          deckId: "deck-101",
          deckName: "Completed Deck",
          cardsReviewed: 5,
          studyMode: "basic",
          sessionDuration: 120,
        });
      });
    });
  });

  describe("useAnalytics hook", () => {
    it("should return analytics functions with PostHog instance", () => {
      mockUsePostHog.mockReturnValue(mockPostHog as any);

      const analyticsHook = useAnalytics();

      expect(analyticsHook).toHaveProperty('posthog', mockPostHog);
      expect(analyticsHook).toHaveProperty('trackUserSignUp');
      expect(analyticsHook).toHaveProperty('trackDeckCreated');
      expect(analyticsHook).toHaveProperty('trackCardCreated');
      expect(analyticsHook).toHaveProperty('trackStudySessionStarted');
      expect(analyticsHook).toHaveProperty('trackStudySessionCompleted');
    });

    it("should call tracking functions correctly", () => {
      mockUsePostHog.mockReturnValue(mockPostHog as any);

      const analyticsHook = useAnalytics();

      // Test trackUserSignUp
      analyticsHook.trackUserSignUp();
      expect(mockPostHog.capture).toHaveBeenCalledWith("user_signed_up", undefined);

      // Test trackDeckCreated
      analyticsHook.trackDeckCreated("deck-123", "Test Deck");
      expect(mockPostHog.capture).toHaveBeenCalledWith("deck_created", {
        deckId: "deck-123",
        deckName: "Test Deck",
      });

      // Test trackStudySessionCompleted
      analyticsHook.trackStudySessionCompleted("deck-456", "Study Deck", 5, "basic", 120);
      expect(mockPostHog.capture).toHaveBeenCalledWith("study_session_completed", {
        deckId: "deck-456",
        deckName: "Study Deck",
        cardsReviewed: 5,
        studyMode: "basic",
        sessionDuration: 120,
      });
    });
  });
});
