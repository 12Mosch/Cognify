// Jest DOM matchers
import "@testing-library/jest-dom";

// Initialize i18n for tests
import "./test-i18n";

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
	disconnect: jest.fn(),
	observe: jest.fn(),
	root: null,
	rootMargin: "",
	takeRecords: jest.fn(() => []),
	thresholds: [],
	unobserve: jest.fn(),
}));

// Mock ResizeObserver for components that use it (like charts)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
	disconnect: jest.fn(),
	observe: jest.fn(),
	unobserve: jest.fn(),
}));

// Mock matchMedia for responsive components
Object.defineProperty(window, "matchMedia", {
	value: jest.fn().mockImplementation((query) => ({
		addEventListener: jest.fn(),
		addListener: jest.fn(),
		dispatchEvent: jest.fn(),
		matches: false, // deprecated
		media: query, // deprecated
		onchange: null,
		removeEventListener: jest.fn(),
		removeListener: jest.fn(),
	})),
	writable: true,
});

// Mock scrollTo for components that use it
Object.defineProperty(window, "scrollTo", {
	value: jest.fn(),
	writable: true,
});

// Mock localStorage and sessionStorage with in-memory store
const makeMemoryStorage = () => {
	const store: Record<string, string> = {};
	return {
		clear: jest.fn(() => {
			Object.keys(store).forEach((k) => delete store[k]);
		}),
		getItem: jest.fn((k) => store[k] ?? null),
		removeItem: jest.fn((k) => {
			delete store[k];
		}),
		setItem: jest.fn((k, v) => {
			store[k] = String(v);
		}),
	};
};

const localStorageMock = makeMemoryStorage();
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

const sessionStorageMock = makeMemoryStorage();
Object.defineProperty(window, "sessionStorage", {
	value: sessionStorageMock,
});

// Mock URL.createObjectURL for file handling tests
Object.defineProperty(URL, "createObjectURL", {
	value: jest.fn(() => "mocked-url"),
	writable: true,
});

Object.defineProperty(URL, "revokeObjectURL", {
	value: jest.fn(),
	writable: true,
});

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
	console.error = (...args: unknown[]) => {
		if (
			typeof args[0] === "string" &&
			args[0].includes("Warning: ReactDOM.render is deprecated")
		) {
			return;
		}
		originalError.call(console, ...args);
	};
});

afterAll(() => {
	console.error = originalError;
});

// Global test timeout
jest.setTimeout(10000);
