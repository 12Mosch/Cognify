import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsModal from '../SettingsModal';

// Mock the child components
jest.mock('../PrivacySettings', () => {
  return jest.fn(({ embedded }) => 
    <div data-testid="privacy-settings" data-embedded={embedded}>Privacy Settings</div>
  );
});

jest.mock('../FeatureFlagDemo', () => {
  return jest.fn(() => <div data-testid="feature-flag-demo">Feature Flag Demo</div>);
});

// Mock analytics
jest.mock('../../lib/analytics', () => ({
  usePrivacyCompliantAnalytics: () => ({
    privacySettings: {
      analyticsConsent: 'pending',
      functionalConsent: 'pending',
      marketingConsent: 'pending',
    },
    grantConsent: jest.fn(),
    revokeConsent: jest.fn(),
  }),
}));

describe('SettingsModal', () => {
  const mockOnClose = jest.fn();
  const originalAddEventListener = document.addEventListener.bind(document);
  const originalRemoveEventListener = document.removeEventListener.bind(document);
  const mockAddEventListener = jest.fn();
  const mockRemoveEventListener = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockAddEventListener.mockClear();
    mockRemoveEventListener.mockClear();
    // Reset body overflow style
    document.body.style.overflow = '';
    // Mock event listeners
    document.addEventListener = mockAddEventListener;
    document.removeEventListener = mockRemoveEventListener;
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    document.body.style.overflow = '';
    // Restore original event listeners
    document.addEventListener = originalAddEventListener;
    document.removeEventListener = originalRemoveEventListener;
  });

  it('renders nothing when closed', () => {
    render(<SettingsModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with proper ARIA attributes when open', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-modal-title');
    
    expect(screen.getByText('Settings')).toHaveAttribute('id', 'settings-modal-title');
  });

  it('prevents background scroll when open', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores background scroll when closed', () => {
    const { rerender } = render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<SettingsModal isOpen={false} onClose={mockOnClose} />);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes modal when ESC key is pressed', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    // Get the keydown handler that was registered
    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(keydownHandler).toBeDefined();

    // Simulate ESC key press by calling the handler directly
    keydownHandler!({ key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes modal when close button is clicked', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('switches between Account and Security tabs', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    
    // Should start with Account tab active (Privacy Settings visible)
    expect(screen.getByTestId('privacy-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-flag-demo')).not.toBeInTheDocument();
    
    // Click Security tab
    const securityTab = screen.getByText('Security');
    fireEvent.click(securityTab);
    
    // Should now show Feature Flags
    expect(screen.queryByTestId('privacy-settings')).not.toBeInTheDocument();
    expect(screen.getByTestId('feature-flag-demo')).toBeInTheDocument();
    
    // Click Account tab again
    const accountTab = screen.getByText('Account');
    fireEvent.click(accountTab);
    
    // Should show Privacy Settings again
    expect(screen.getByTestId('privacy-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-flag-demo')).not.toBeInTheDocument();
  });

  it('passes embedded prop to PrivacySettings', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);
    
    const privacySettings = screen.getByTestId('privacy-settings');
    expect(privacySettings).toHaveAttribute('data-embedded', 'true');
  });

  it('sets up focus management when opened', async () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    // Check that event listeners are set up for focus management
    await waitFor(() => {
      expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  it('sets up focus trap event listeners', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    // Check that event listeners are set up for focus trapping
    expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    // Should be called twice - once for ESC handler, once for focus trap
    expect(mockAddEventListener).toHaveBeenCalledTimes(2);
  });

  it('does not interfere with other key presses', () => {
    render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

    // Get the keydown handler that was registered
    const keydownHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'keydown'
    )?.[1];

    expect(keydownHandler).toBeDefined();

    // Press a non-ESC key
    keydownHandler!({ key: 'Enter' });
    expect(mockOnClose).not.toHaveBeenCalled();

    keydownHandler!({ key: 'Space' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
