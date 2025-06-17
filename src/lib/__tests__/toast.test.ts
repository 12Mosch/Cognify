import { showSuccessToast, showErrorToast, showInfoToast, toastHelpers } from '../toast';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

import toast from 'react-hot-toast';

// Get references to the mocked functions
const mockedToast = toast as jest.MockedFunction<typeof toast>;
const mockedToastSuccess = toast.success as jest.MockedFunction<typeof toast.success>;
const mockedToastError = toast.error as jest.MockedFunction<typeof toast.error>;

describe('Toast Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showSuccessToast', () => {
    it('should call toast.success with correct message and options', () => {
      const message = 'Test success message';
      showSuccessToast(message);

      expect(mockedToastSuccess).toHaveBeenCalledWith(message, {
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

      expect(mockedToastError).toHaveBeenCalledWith(message, {
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
    it('should call toast with correct message and options', () => {
      const message = 'Test info message';
      showInfoToast(message);

      expect(mockedToast).toHaveBeenCalledWith(message, {
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

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          `"${deckName}" created successfully!`,
          expect.any(Object)
        );
      });

      it('should show generic success toast when no deck name provided', () => {
        toastHelpers.deckCreated();

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          'Deck created successfully!',
          expect.any(Object)
        );
      });
    });

    describe('cardCreated', () => {
      it('should show success toast for card creation', () => {
        toastHelpers.cardCreated();

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          'Card added successfully!',
          expect.any(Object)
        );
      });
    });

    describe('cardUpdated', () => {
      it('should show success toast for card update', () => {
        toastHelpers.cardUpdated();

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          'Card updated successfully!',
          expect.any(Object)
        );
      });
    });

    describe('studySessionComplete', () => {
      it('should show success toast with card count when provided', () => {
        const cardsReviewed = 5;
        toastHelpers.studySessionComplete(cardsReviewed);

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          `Study session complete! Reviewed ${cardsReviewed} card.`,
          expect.any(Object)
        );
      });

      it('should show singular form for one card', () => {
        const cardsReviewed = 1;
        toastHelpers.studySessionComplete(cardsReviewed);

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          `Study session complete! Reviewed ${cardsReviewed} card.`,
          expect.any(Object)
        );
      });

      it('should show generic message when no card count provided', () => {
        toastHelpers.studySessionComplete();

        expect(mockedToastSuccess).toHaveBeenCalledWith(
          'Study session completed!',
          expect.any(Object)
        );
      });
    });

    describe('networkError', () => {
      it('should show error toast for network issues', () => {
        toastHelpers.networkError();

        expect(mockedToastError).toHaveBeenCalledWith(
          'Network error. Please check your connection and try again.',
          expect.any(Object)
        );
      });
    });

    describe('temporaryError', () => {
      it('should show error toast for temporary issues', () => {
        toastHelpers.temporaryError();

        expect(mockedToastError).toHaveBeenCalledWith(
          'Something went wrong. Please try again in a moment.',
          expect.any(Object)
        );
      });
    });
  });

  describe('Toast Configuration', () => {
    it('should use correct duration for success toasts', () => {
      showSuccessToast('test');
      expect(mockedToastSuccess).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ duration: 4000 })
      );
    });

    it('should use correct duration for error toasts', () => {
      showErrorToast('test');
      expect(mockedToastError).toHaveBeenCalledWith(
        'test',
        expect.objectContaining({ duration: 6000 })
      );
    });

    it('should use correct accessibility attributes for success toasts', () => {
      showSuccessToast('test');
      expect(mockedToastSuccess).toHaveBeenCalledWith(
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
      expect(mockedToastError).toHaveBeenCalledWith(
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
