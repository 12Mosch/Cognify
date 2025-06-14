/**
 * Tests for analytics utility functions
 * These tests verify that our PostHog integration works correctly
 */

import {
  trackEvent,
  hasUserBeenTrackedForRegistration,
  markUserAsTrackedForRegistration,
} from "../analytics";

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

// Setup mocks
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

describe("Analytics Utilities", () => {
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
});
