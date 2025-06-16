import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useQuery } from 'convex/react';
import StreakDisplay from '../StreakDisplay';
import { useAnalytics } from '../../lib/analytics';

// Mock dependencies
jest.mock('convex/react');
jest.mock('../../lib/analytics');

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('StreakDisplay', () => {
  const mockPosthog = {
    capture: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalytics.mockReturnValue({
      posthog: mockPosthog,
      isAnalyticsEnabled: true,
    });
  });

  it('renders loading skeleton when data is undefined', () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<StreakDisplay />);

    // Check for loading skeleton elements
    expect(screen.getByTestId('streak-loading')).toHaveClass('animate-pulse');
  });

  it('handles null response gracefully (user has no streak yet)', () => {
    mockUseQuery.mockReturnValue(null);

    render(<StreakDisplay />);

    // Should render with zero-streak baseline
    expect(screen.getByTestId('current-streak')).toHaveTextContent('0');
    expect(screen.getByText('Start Your Streak! 🎯')).toBeInTheDocument();
    expect(screen.getByText('Study today to begin your learning journey')).toBeInTheDocument();
    expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    expect(screen.getByText('Total Days')).toBeInTheDocument();
  });

  it('renders zero streak data correctly', () => {
    const mockStreakData = {
      currentStreak: 0,
      longestStreak: 0,
      totalStudyDays: 0,
      milestonesReached: [],
      lastMilestone: null,
    };

    mockUseQuery.mockReturnValue(mockStreakData);

    render(<StreakDisplay />);

    expect(screen.getByTestId('current-streak')).toHaveTextContent('0');
    expect(screen.getByText('Start Your Streak! 🎯')).toBeInTheDocument();
    expect(screen.getByText('Study today to begin your learning journey')).toBeInTheDocument();
  });

  it('renders active streak data correctly', () => {
    const mockStreakData = {
      currentStreak: 15,
      longestStreak: 20,
      totalStudyDays: 45,
      milestonesReached: [7],
      lastMilestone: 7,
    };

    mockUseQuery.mockReturnValue(mockStreakData);

    render(<StreakDisplay />);

    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Great Progress! 🔥')).toBeInTheDocument();
    expect(screen.getByText('You\'re developing a strong habit')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument(); // Longest streak
    expect(screen.getByText('45')).toBeInTheDocument(); // Total days
    expect(screen.getByText('🏅 7 days')).toBeInTheDocument(); // Last milestone
  });

  it('shows progress to next milestone', () => {
    const mockStreakData = {
      currentStreak: 15,
      longestStreak: 20,
      totalStudyDays: 45,
      milestonesReached: [7],
      lastMilestone: 7,
    };

    mockUseQuery.mockReturnValue(mockStreakData);

    render(<StreakDisplay />);

    expect(screen.getByText('Next milestone')).toBeInTheDocument();
    expect(screen.getByText('30 days')).toBeInTheDocument();
    expect(screen.getByText('15 days to go')).toBeInTheDocument();
  });

  it('displays milestones achieved', () => {
    const mockStreakData = {
      currentStreak: 35,
      longestStreak: 35,
      totalStudyDays: 35,
      milestonesReached: [7, 30],
      lastMilestone: 30,
    };

    mockUseQuery.mockReturnValue(mockStreakData);

    render(<StreakDisplay />);

    expect(screen.getByText('Milestones Achieved')).toBeInTheDocument();
    expect(screen.getByText('🏅 7')).toBeInTheDocument();
    expect(screen.getByText('🏅 30')).toBeInTheDocument();
  });

  it('tracks analytics when clicked', () => {
    const mockStreakData = {
      currentStreak: 15,
      longestStreak: 20,
      totalStudyDays: 45,
      milestonesReached: [7],
      lastMilestone: 7,
    };

    mockUseQuery.mockReturnValue(mockStreakData);

    render(<StreakDisplay />);

    const streakDisplay = screen.getByTestId('streak-display');
    fireEvent.click(streakDisplay);

    expect(mockPosthog.capture).toHaveBeenCalledWith('streak_display_clicked', {
      currentStreak: 15,
      longestStreak: 20,
      totalStudyDays: 45,
      milestonesReached: 1,
    });
  });

  it('applies custom className', () => {
    mockUseQuery.mockReturnValue({
      currentStreak: 5,
      longestStreak: 10,
      totalStudyDays: 15,
      milestonesReached: [],
      lastMilestone: null,
    });

    render(<StreakDisplay className="custom-class" />);

    expect(screen.getByTestId('streak-display')).toHaveClass('custom-class');
  });

  it('shows correct streak status for different ranges', () => {
    // Test building momentum (< 7 days)
    mockUseQuery.mockReturnValue({
      currentStreak: 3,
      longestStreak: 3,
      totalStudyDays: 3,
      milestonesReached: [],
      lastMilestone: null,
    });

    const { rerender } = render(<StreakDisplay />);
    expect(screen.getByText('Building Momentum! 🌱')).toBeInTheDocument();

    // Test great progress (7-29 days)
    mockUseQuery.mockReturnValue({
      currentStreak: 15,
      longestStreak: 15,
      totalStudyDays: 15,
      milestonesReached: [7],
      lastMilestone: 7,
    });

    rerender(<StreakDisplay />);
    expect(screen.getByText('Great Progress! 🔥')).toBeInTheDocument();

    // Test streak master (30+ days)
    mockUseQuery.mockReturnValue({
      currentStreak: 45,
      longestStreak: 45,
      totalStudyDays: 45,
      milestonesReached: [7, 30],
      lastMilestone: 30,
    });

    rerender(<StreakDisplay />);
    expect(screen.getByText('Streak Master! 🏆')).toBeInTheDocument();
  });
});
