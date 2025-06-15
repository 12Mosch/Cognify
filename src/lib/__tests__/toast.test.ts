import { showSuccessToast, showErrorToast, showInfoToast, toastHelpers } from '../toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    // Regular toast function for info messages
    __call: jest.fn(),
  }),
  // Named export for the regular toast function
  toast: jest.fn(),
}));

import toast from 'react-hot-toast';

describe('Toast Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showSuccessToast', () => {
    it('should call toast.success with correct message and options', () => {
      const message = 'Test success message';
      showSuccessToast(message);

      expect(toast.success).toHaveBeenCalledWith(message, {
        duration: 4000,
        icon: '✅',
        style: {
          background: '#10b981',
          color: '#ffffff',
          fontWeight: '500',
        },
        ariaProps: {
          role: 'status',
          'aria-live': 'polite',
        },
      });
    });
  });

  describe('showErrorToast', () => {
    it('should call toast.error with correct message and options', () => {
      const message = 'Test error message';
      showErrorToast(message);

      expect(toast.error).toHaveBeenCalledWith(message, {
        duration: 6000,
        icon: '❌',
        style: {
          background: '#ef4444',
          color: '#ffffff',
          fontWeight: '500',
        },
        ariaProps: {
          role: 'alert',
          'aria-live': 'assertive',
        },
      });
    });
  });

  describe('showInfoToast', () => {
    it('should call toast with correct message and options', async () => {
      const message = 'Test info message';
      showInfoToast(message);

      // Import the named export for testing
      const toastModule = await import('react-hot-toast');
      const toastFunction = toastModule.toast;
      
      expect(toastFunction).toHaveBeenCalledWith(message, {
        duration: 4000,
        icon: 'ℹ️',
        style: {
          background: '#3b82f6',
          color: '#ffffff',
          fontWeight: '500',
        },
        ariaProps: {
          role: 'status',
          'aria-live': 'polite',
        },
      });
    });
  });

  describe('toastHelpers', () => {
    describe('deckCreated', () => {
      it('should show success toast with deck name when provided', () => {
        const deckName = 'My Test Deck';
        toastHelpers.deckCreated(deckName);

        expect(toast.success).toHaveBeenCalledWith(
          `"${deckName}" created successfully!`,
          expect.any(Object)
        );
      });

      it('should show generic success toast when no deck name provided', () => {
        toastHelpers.deckCreated();

        expect(toast.success).toHaveBeenCalledWith(
          'Deck created successfully!',
          expect.any(Object)
        );
      });
    });

    describe('cardCreated', () => {
      it('should show success toast for card creation', () => {
        toastHelpers.cardCreated();

        expect(toast.success).toHaveBeenCalledWith(
          'Card added successfully!',
          expect.any(Object)
        );
      });
    });

    describe('cardUpdated', () => {
      it('should show success toast for card update', () => {
        toastHelpers.cardUpdated();

        expect(toast.success).toHaveBeenCalledWith(
          'Card updated successfully!',
          expect.any(Object)
        );
      });
    });

    describe('studySessionComplete', () => {
      it('should show success toast with card count when provided', () => {
        const cardsReviewed = 5;
        toastHelpers.studySessionComplete(cardsReviewed);

        expect(toast.success).toHaveBeenCalledWith(
          `Study session complete! Reviewed ${cardsReviewed} cards.`,
          expect.any(Object)
        );
      });

      it('should show singular form for one card', () => {
        const cardsReviewed = 1;
        toastHelpers.studySessionComplete(cardsReviewed);

        expect(toast.success).toHaveBeenCalledWith(
          `Study session complete! Reviewed ${cardsReviewed} card.`,
          expect.any(Object)
        );
      });

      it('should show generic message when no card count provided', () => {
        toastHelpers.studySessionComplete();

        expect(toast.success).toHaveBeenCalledWith(
          'Study session completed!',
          expect.any(Object)
        );
      });
    });

    describe('networkError', () => {
      it('should show error toast for network issues', () => {
        toastHelpers.networkError();

        expect(toast.error).toHaveBeenCalledWith(
          'Network error. Please check your connection and try again.',
          expect.any(Object)
        );
      });
    });

    describe('temporaryError', () => {
      it('should show error toast for temporary issues', () => {
        toastHelpers.temporaryError();

        expect(toast.error).toHaveBeenCalledWith(
          'Something went wrong. Please try again in a moment.',
          expect.any(Object)
        );
      });
    });
  });

  describe('Toast Configuration', () => {
    it('should use correct duration for success toasts', () => {
      showSuccessToast('test');
      expect(toast.success).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ duration: 4000 })
      );
    });

    it('should use correct duration for error toasts', () => {
      showErrorToast('test');
      expect(toast.error).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ duration: 6000 })
      );
    });

    it('should use correct accessibility attributes for success toasts', () => {
      showSuccessToast('test');
      expect(toast.success).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          ariaProps: {
            role: 'status',
            'aria-live': 'polite',
          },
        })
      );
    });

    it('should use correct accessibility attributes for error toasts', () => {
      showErrorToast('test');
      expect(toast.error).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({
          ariaProps: {
            role: 'alert',
            'aria-live': 'assertive',
          },
        })
      );
    });
  });
});
