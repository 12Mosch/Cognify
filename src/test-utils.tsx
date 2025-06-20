import { ClerkProvider } from "@clerk/clerk-react";
import { RenderOptions, render } from "@testing-library/react";
import {
	ConvexProvider,
	ConvexReactClient,
	useMutation,
	useQuery,
} from "convex/react";
import React, { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
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
	id: "user_test123",
	firstName: "Test",
	lastName: "User",
	emailAddresses: [{ emailAddress: "test@example.com" }],
});

export const createMockDeck = () => ({
	_id: "deck_test123" as any,
	_creationTime: Date.now(),
	name: "Test Deck",
	description: "A test deck for testing",
	userId: "user_test123",
	cardCount: 5,
});

export const createMockCard = () => ({
	_id: "card_test123" as any,
	_creationTime: Date.now(),
	deckId: "deck_test123" as any,
	front: "Test Question",
	back: "Test Answer",
	repetition: 0,
	easeFactor: 2.5,
	interval: 1,
	dueDate: Date.now(),
});

export const createMockStudySession = () => ({
	_id: "session_test123" as any,
	_creationTime: Date.now(),
	userId: "user_test123",
	deckId: "deck_test123" as any,
	cardsStudied: 5,
	correctAnswers: 4,
	sessionDuration: 300000, // 5 minutes
	date: new Date().toISOString().split("T")[0],
});

// Mock implementations for common hooks
export const mockUseQuery = (returnValue: any) => {
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
	reset: jest.fn(),
	isFeatureEnabled: jest.fn().mockReturnValue(false),
};

// Helper to mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean = false) => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: jest.fn().mockImplementation((query) => ({
			matches,
			media: query,
			onchange: null,
			addListener: jest.fn(),
			removeListener: jest.fn(),
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		})),
	});
};

// Helper to mock timers consistently
export const setupMockTimers = () => {
	beforeEach(() => {
		jest.useFakeTimers({
			now: new Date("2024-01-15T12:00:00.000Z"),
			legacyFakeTimers: false,
		});
	});

	afterEach(() => {
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
	});
};

// Mock useTranslation hook for testing
export const mockUseTranslation = () => {
	const mockT = jest.fn((key: string, options?: any) => {
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
		t: mockT,
		i18n: {
			language: "en",
			changeLanguage: jest.fn(),
		},
	};
};
