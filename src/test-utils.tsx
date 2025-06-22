import { ClerkProvider } from "@clerk/clerk-react";
import { type RenderOptions, render } from "@testing-library/react";
import {
	ConvexProvider,
	ConvexReactClient,
	useMutation,
	useQuery,
} from "convex/react";
import type React from "react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import type { Id } from "../convex/_generated/dataModel";
import testI18n from "./test-i18n";

// Mock Convex client for testing
const mockConvexClient = new ConvexReactClient("https://test.convex.cloud");

// Mock Clerk publishable key for testing
const CLERK_PUBLISHABLE_KEY = "pk_test_mock_key_for_testing";

interface AllTheProvidersProps {
	children: React.ReactNode;
}

// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
	return (
		<I18nextProvider i18n={testI18n}>
			<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
				<ConvexProvider client={mockConvexClient}>{children}</ConvexProvider>
			</ClerkProvider>
		</I18nextProvider>
	);
};

const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
// eslint-disable-next-line react-refresh/only-export-components
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Test utilities for common testing patterns
export const createMockUser = () => ({
	emailAddresses: [{ emailAddress: "test@example.com" }],
	firstName: "Test",
	id: "user_test123",
	lastName: "User",
});

export const createMockDeck = () => ({
	_creationTime: Date.now(),
	_id: "deck_test123" as Id<"decks">,
	cardCount: 5,
	description: "A test deck for testing",
	name: "Test Deck",
	userId: "user_test123",
});

export const createMockCard = () => ({
	_creationTime: Date.now(),
	_id: "card_test123" as Id<"cards">,
	back: "Test Answer",
	deckId: "deck_test123" as Id<"decks">,
	dueDate: Date.now(),
	easeFactor: 2.5,
	front: "Test Question",
	interval: 1,
	repetition: 0,
});

export const createMockStudySession = () => ({
	_creationTime: Date.now(),
	_id: "session_test123" as Id<"studySessions">,
	cardsStudied: 5,
	correctAnswers: 4,
	date: new Date().toISOString().split("T")[0],
	deckId: "deck_test123" as Id<"decks">,
	sessionDuration: 300000, // 5 minutes
	userId: "user_test123",
});

// Mock implementations for common hooks
export const mockUseQuery = (returnValue: unknown) => {
	return (useQuery as jest.Mock).mockReturnValue(returnValue);
};

export const mockUseMutation = (mockFn: jest.Mock = jest.fn()) => {
	return (useMutation as jest.Mock).mockReturnValue(mockFn);
};

// Helper to wait for async operations
export const waitForAsync = () =>
	new Promise((resolve) => setTimeout(resolve, 0));

// Mock PostHog for analytics testing
export const mockPostHog = {
	capture: jest.fn(),
	identify: jest.fn(),
	isFeatureEnabled: jest.fn().mockReturnValue(false),
	reset: jest.fn(),
};

// Helper to mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean = false) => {
	Object.defineProperty(window, "matchMedia", {
		value: jest.fn().mockImplementation((query) => ({
			addEventListener: jest.fn(),
			addListener: jest.fn(),
			dispatchEvent: jest.fn(),
			matches,
			media: query,
			onchange: null,
			removeEventListener: jest.fn(),
			removeListener: jest.fn(),
		})),
		writable: true,
	});
};

// Helper to mock timers consistently
export const setupMockTimers = () => {
	beforeEach(() => {
		jest.useFakeTimers({
			legacyFakeTimers: false,
			now: new Date("2024-01-15T12:00:00.000Z"),
		});
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});
};

// Mock useTranslation hook for testing
export const mockUseTranslation = () => {
	const mockT = jest.fn((key: string, options?: Record<string, unknown>) => {
		// Simple mock that returns the key with interpolated values
		if (options && typeof options === "object") {
			let result = key;
			Object.keys(options).forEach((optionKey) => {
				result = result.replace(`{{${optionKey}}}`, String(options[optionKey]));
			});
			return result;
		}
		return key;
	});

	return {
		i18n: {
			changeLanguage: jest.fn(),
			language: "en",
		},
		t: mockT,
	};
};
