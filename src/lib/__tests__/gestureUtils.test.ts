import {
  triggerHapticFeedback,
  triggerVisualFeedback,
  isTouchDevice,
  prefersReducedMotion,
  initializeGestureStyles,
} from '../gestureUtils';

// Mock DOM methods
const mockVibrate = jest.fn();
const mockMatchMedia = jest.fn();

// Mock navigator
Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: mockVibrate,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock document methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockRequestAnimationFrame = jest.fn();
const mockSetTimeout = jest.fn();

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: mockCreateElement,
});

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: mockRemoveChild,
});

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: mockRequestAnimationFrame,
});

Object.defineProperty(window, 'setTimeout', {
  writable: true,
  value: mockSetTimeout,
});

describe('gestureUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM mocks
    mockCreateElement.mockReturnValue({
      className: '',
      style: { cssText: '' },
      textContent: '',
      parentNode: null,
    });
    
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    });
  });

  describe('triggerHapticFeedback', () => {
    it('should call navigator.vibrate with correct patterns', () => {
      triggerHapticFeedback('light');
      expect(mockVibrate).toHaveBeenCalledWith([10]);

      triggerHapticFeedback('medium');
      expect(mockVibrate).toHaveBeenCalledWith([20]);

      triggerHapticFeedback('heavy');
      expect(mockVibrate).toHaveBeenCalledWith([30]);
    });

    it('should default to light feedback', () => {
      triggerHapticFeedback();
      expect(mockVibrate).toHaveBeenCalledWith([10]);
    });


  });

  describe('triggerVisualFeedback', () => {
    it('should create and append feedback element', () => {
      const mockElement = {
        className: '',
        style: { cssText: '', opacity: '0' },
        textContent: '',
        parentNode: document.body,
      };
      mockCreateElement.mockReturnValue(mockElement);

      triggerVisualFeedback('left');

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockElement.className).toBe('gesture-feedback');
      expect(mockElement.textContent).toBe('← Flip Card');
      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
    });

    it('should show correct messages for different directions', () => {
      const mockElement = {
        className: '',
        style: { cssText: '', opacity: '0' },
        textContent: '',
        parentNode: document.body,
      };
      mockCreateElement.mockReturnValue(mockElement);

      const directions = [
        { direction: 'left' as const, expected: '← Flip Card' },
        { direction: 'right' as const, expected: '→ Next Card' },
        { direction: 'up' as const, expected: '↑ Swipe Up' },
        { direction: 'down' as const, expected: '↓ Swipe Down' },
      ];

      directions.forEach(({ direction, expected }) => {
        triggerVisualFeedback(direction);
        expect(mockElement.textContent).toBe(expected);
      });
    });

    it('should set correct CSS styles', () => {
      const mockElement = {
        className: '',
        style: { cssText: '', opacity: '0' },
        textContent: '',
        parentNode: document.body,
      };
      mockCreateElement.mockReturnValue(mockElement);

      triggerVisualFeedback('left');

      expect(mockElement.style.cssText).toContain('position: fixed');
      expect(mockElement.style.cssText).toContain('top: 50%');
      expect(mockElement.style.cssText).toContain('left: 50%');
      expect(mockElement.style.cssText).toContain('z-index: 9999');
    });
  });

  describe('isTouchDevice', () => {
    it('should return true when ontouchstart is available', () => {
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
        configurable: true,
      });

      expect(isTouchDevice()).toBe(true);

      // Cleanup
      delete (window as any).ontouchstart;
    });

    it('should return true when maxTouchPoints > 0', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 1,
        configurable: true,
      });

      expect(isTouchDevice()).toBe(true);
    });

    it('should return false when no touch support is detected', () => {
      // Ensure no touch properties are present
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });

      expect(isTouchDevice()).toBe(false);
    });
  });

  describe('prefersReducedMotion', () => {
    it('should return true when user prefers reduced motion', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      expect(prefersReducedMotion()).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('should return false when user does not prefer reduced motion', () => {
      mockMatchMedia.mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('initializeGestureStyles', () => {
    it('should add gesture styles to document head', () => {
      const mockStyleElement = {
        id: '',
        textContent: '',
      };
      const mockHead = {
        appendChild: jest.fn(),
      };

      mockCreateElement.mockReturnValue(mockStyleElement);
      Object.defineProperty(document, 'head', {
        value: mockHead,
        configurable: true,
      });

      // Mock getElementById to return null (styles not already added)
      jest.spyOn(document, 'getElementById').mockReturnValue(null);

      initializeGestureStyles();

      expect(mockCreateElement).toHaveBeenCalledWith('style');
      expect(mockStyleElement.id).toBe('gesture-styles');
      expect(mockStyleElement.textContent).toContain('@media (prefers-reduced-motion: no-preference)');
      expect(mockStyleElement.textContent).toContain('.gesture-feedback');
      expect(mockHead.appendChild).toHaveBeenCalledWith(mockStyleElement);
    });

    it('should not add styles if already present', () => {
      const mockExistingStyle = document.createElement('style');
      jest.spyOn(document, 'getElementById').mockReturnValue(mockExistingStyle);

      const mockHead = {
        appendChild: jest.fn(),
      };
      Object.defineProperty(document, 'head', {
        value: mockHead,
        configurable: true,
      });

      initializeGestureStyles();

      expect(mockHead.appendChild).not.toHaveBeenCalled();
    });
  });
});
