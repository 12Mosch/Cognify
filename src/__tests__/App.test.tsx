import React from 'react';
import { render, screen } from '@testing-library/react';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import App from '../App';

// Mock Clerk
jest.mock('@clerk/clerk-react', () => ({
  useUser: jest.fn(),
  SignInButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-in-button">{children}</div>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <div data-testid="sign-up-button">{children}</div>,
  UserButton: () => <div data-testid="user-button">User Button</div>,
  Authenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="authenticated">{children}</div>,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="unauthenticated">{children}</div>,
}));

// Mock Convex
jest.mock('convex/react', () => ({
  useQuery: jest.fn(),
  Authenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="authenticated">{children}</div>,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="unauthenticated">{children}</div>,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock Dashboard component
jest.mock('../components/Dashboard', () => ({
  Dashboard: jest.fn().mockImplementation(({ ref }) => {
    // Simulate the ref functionality
    React.useImperativeHandle(ref, () => ({
      goHome: jest.fn()
    }));
    return <div data-testid="dashboard">Dashboard Content</div>;
  })
}));

// Mock analytics
jest.mock('../lib/analytics', () => ({
  useAnalytics: () => ({
    trackUserSignUp: jest.fn(),
  }),
  useAnalyticsEnhanced: () => ({
    identifyUser: jest.fn(),
  }),
  hasUserBeenTrackedForRegistration: jest.fn(() => false),
  markUserAsTrackedForRegistration: jest.fn(),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUser.mockReturnValue({
      user: {
        id: 'test-user-id',
        firstName: 'Test',
        lastName: 'User',
      },
      isLoaded: true,
    } as any);
    mockUseQuery.mockReturnValue([]);
  });

  it('renders the app title as a clickable button', () => {
    render(<App />);
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    expect(titleButton).toBeInTheDocument();
    expect(titleButton).toHaveTextContent('Flashcard App');
  });

  it('has proper accessibility attributes on the title button', () => {
    render(<App />);
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    expect(titleButton).toHaveAttribute('aria-label', 'Go to main dashboard');
    expect(titleButton).toHaveAttribute('title', 'Go to main dashboard');
  });

  it('applies hover styles to the title button', () => {
    render(<App />);
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    expect(titleButton).toHaveClass('hover:text-slate-700', 'dark:hover:text-slate-300');
  });

  it('has focus styles for accessibility', () => {
    render(<App />);
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    expect(titleButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-slate-400');
  });

  it('renders the header with proper layout', () => {
    render(<App />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'z-10');
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    const userButton = screen.getByTestId('user-button');
    
    expect(header).toContainElement(titleButton);
    expect(header).toContainElement(userButton);
  });

  it('shows authenticated content when user is logged in', () => {
    render(<App />);
    
    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('maintains the same visual appearance as before (font and styling)', () => {
    render(<App />);
    
    const titleButton = screen.getByRole('button', { name: /go to main dashboard/i });
    expect(titleButton).toHaveClass('text-xl', 'font-bold');
  });
});
