import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ClerkProvider } from '@clerk/clerk-react';

// Mock Convex client for testing
const mockConvexClient = new ConvexReactClient('https://test.convex.cloud');

// Mock Clerk publishable key for testing
const CLERK_PUBLISHABLE_KEY = 'pk_test_mock_key_for_testing';

interface AllTheProvidersProps {
  children: React.ReactNode;
}

// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ConvexProvider client={mockConvexClient}>
        {children}
      </ConvexProvider>
    </ClerkProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test utilities for common testing patterns
export const createMockUser = () => ({
  id: 'user_test123',
  firstName: 'Test',
  lastName: 'User',
  emailAddresses: [{ emailAddress: 'test@example.com' }],
});

export const createMockDeck = () => ({
  _id: 'deck_test123' as any,
  _creationTime: Date.now(),
  name: 'Test Deck',
  description: 'A test deck for testing',
  userId: 'user_test123',
  cardCount: 5,
});

export const createMockCard = () => ({
  _id: 'card_test123' as any,
  _creationTime: Date.now(),
  deckId: 'deck_test123' as any,
  front: 'Test Question',
  back: 'Test Answer',
  repetition: 0,
  easeFactor: 2.5,
  interval: 1,
  dueDate: Date.now(),
});

export const createMockStudySession = () => ({
  _id: 'session_test123' as any,
  _creationTime: Date.now(),
  userId: 'user_test123',
  deckId: 'deck_test123' as any,
  cardsStudied: 5,
  correctAnswers: 4,
  sessionDuration: 300000, // 5 minutes
  date: new Date().toISOString().split('T')[0],
});

// Mock implementations for common hooks
export const mockUseQuery = (returnValue: any) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useQuery } = require('convex/react');
  return useQuery.mockReturnValue(returnValue);
};

export const mockUseMutation = (mockFn: jest.Mock = jest.fn()) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useMutation } = require('convex/react');
  return useMutation.mockReturnValue(mockFn);
};

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock PostHog for analytics testing
export const mockPostHog = {
  capture: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  isFeatureEnabled: jest.fn().mockReturnValue(false),
};

// Helper to mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
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
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
};
