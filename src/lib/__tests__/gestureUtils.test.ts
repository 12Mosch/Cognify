import {
	initializeGestureStyles,
	isTouchDevice,
	prefersReducedMotion,
	triggerHapticFeedback,
	triggerVisualFeedback,
} from "../gestureUtils";

// Mock DOM methods
const mockVibrate = jest.fn();
const mockMatchMedia = jest.fn();

// Mock navigator
Object.defineProperty(navigator, "vibrate", {
	value: mockVibrate,
	writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	value: mockMatchMedia,
	writable: true,
});

// Mock document methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockRequestAnimationFrame = jest.fn();
const mockSetTimeout = jest.fn();

Object.defineProperty(document, "createElement", {
	value: mockCreateElement,
	writable: true,
});

Object.defineProperty(document.body, "appendChild", {
	value: mockAppendChild,
	writable: true,
});

Object.defineProperty(document.body, "removeChild", {
	value: mockRemoveChild,
	writable: true,
});

Object.defineProperty(window, "requestAnimationFrame", {
	value: mockRequestAnimationFrame,
	writable: true,
});

Object.defineProperty(window, "setTimeout", {
	value: mockSetTimeout,
	writable: true,
});

describe("gestureUtils", () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Reset DOM mocks
		mockCreateElement.mockReturnValue({
			className: "",
			parentNode: null,
			style: { cssText: "" },
			textContent: "",
		});

		mockMatchMedia.mockReturnValue({
			addEventListener: jest.fn(),
			matches: false,
			removeEventListener: jest.fn(),
		});
	});

	describe("triggerHapticFeedback", () => {
		it("should call navigator.vibrate with correct patterns", () => {
			triggerHapticFeedback("light");
			expect(mockVibrate).toHaveBeenCalledWith([10]);

			triggerHapticFeedback("medium");
			expect(mockVibrate).toHaveBeenCalledWith([20]);

			triggerHapticFeedback("heavy");
			expect(mockVibrate).toHaveBeenCalledWith([30]);
		});

		it("should default to light feedback", () => {
			triggerHapticFeedback();
			expect(mockVibrate).toHaveBeenCalledWith([10]);
		});
	});

	describe("triggerVisualFeedback", () => {
		it("should create and append feedback element", () => {
			const mockElement = {
				className: "",
				parentNode: document.body,
				style: { cssText: "", opacity: "0" },
				textContent: "",
			};
			mockCreateElement.mockReturnValue(mockElement);

			triggerVisualFeedback("left");

			expect(mockCreateElement).toHaveBeenCalledWith("div");
			expect(mockElement.className).toBe("gesture-feedback");
			expect(mockElement.textContent).toBe("← Flip Card");
			expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
		});

		it("should show correct messages for different directions", () => {
			const mockElement = {
				className: "",
				parentNode: document.body,
				style: { cssText: "", opacity: "0" },
				textContent: "",
			};
			mockCreateElement.mockReturnValue(mockElement);

			const directions = [
				{ direction: "left" as const, expected: "← Flip Card" },
				{ direction: "right" as const, expected: "→ Next Card" },
				{ direction: "up" as const, expected: "↑ Swipe Up" },
				{ direction: "down" as const, expected: "↓ Swipe Down" },
			];

			directions.forEach(({ direction, expected }) => {
				triggerVisualFeedback(direction);
				expect(mockElement.textContent).toBe(expected);
			});
		});

		it("should set correct CSS styles", () => {
			const mockElement = {
				className: "",
				parentNode: document.body,
				style: { cssText: "", opacity: "0" },
				textContent: "",
			};
			mockCreateElement.mockReturnValue(mockElement);

			triggerVisualFeedback("left");

			expect(mockElement.style.cssText).toContain("position: fixed");
			expect(mockElement.style.cssText).toContain("top: 50%");
			expect(mockElement.style.cssText).toContain("left: 50%");
			expect(mockElement.style.cssText).toContain("z-index: 9999");
		});
	});

	describe("isTouchDevice", () => {
		it("should return true when ontouchstart is available", () => {
			Object.defineProperty(window, "ontouchstart", {
				configurable: true,
				value: {},
			});

			expect(isTouchDevice()).toBe(true);

			// Cleanup
			delete (window as any).ontouchstart;
		});

		it("should return true when maxTouchPoints > 0", () => {
			Object.defineProperty(navigator, "maxTouchPoints", {
				configurable: true,
				value: 1,
			});

			expect(isTouchDevice()).toBe(true);
		});

		it("should return false when no touch support is detected", () => {
			// Ensure no touch properties are present
			delete (window as any).ontouchstart;
			Object.defineProperty(navigator, "maxTouchPoints", {
				configurable: true,
				value: 0,
			});

			expect(isTouchDevice()).toBe(false);
		});
	});

	describe("prefersReducedMotion", () => {
		it("should return true when user prefers reduced motion", () => {
			mockMatchMedia.mockReturnValue({
				addEventListener: jest.fn(),
				matches: true,
				removeEventListener: jest.fn(),
			});

			expect(prefersReducedMotion()).toBe(true);
			expect(mockMatchMedia).toHaveBeenCalledWith(
				"(prefers-reduced-motion: reduce)",
			);
		});

		it("should return false when user does not prefer reduced motion", () => {
			mockMatchMedia.mockReturnValue({
				addEventListener: jest.fn(),
				matches: false,
				removeEventListener: jest.fn(),
			});

			expect(prefersReducedMotion()).toBe(false);
		});
	});

	describe("initializeGestureStyles", () => {
		it("should add gesture styles to document head", () => {
			const mockStyleElement = {
				id: "",
				textContent: "",
			};
			const mockHead = {
				appendChild: jest.fn(),
			};

			mockCreateElement.mockReturnValue(mockStyleElement);
			Object.defineProperty(document, "head", {
				configurable: true,
				value: mockHead,
			});

			// Mock getElementById to return null (styles not already added)
			jest.spyOn(document, "getElementById").mockReturnValue(null);

			initializeGestureStyles();

			expect(mockCreateElement).toHaveBeenCalledWith("style");
			expect(mockStyleElement.id).toBe("gesture-styles");
			expect(mockStyleElement.textContent).toContain(
				"@media (prefers-reduced-motion: no-preference)",
			);
			expect(mockStyleElement.textContent).toContain(".gesture-feedback");
			expect(mockHead.appendChild).toHaveBeenCalledWith(mockStyleElement);
		});

		it("should not add styles if already present", () => {
			const mockExistingStyle = document.createElement("style");
			jest.spyOn(document, "getElementById").mockReturnValue(mockExistingStyle);

			const mockHead = {
				appendChild: jest.fn(),
			};
			Object.defineProperty(document, "head", {
				configurable: true,
				value: mockHead,
			});

			initializeGestureStyles();

			expect(mockHead.appendChild).not.toHaveBeenCalled();
		});
	});
});
