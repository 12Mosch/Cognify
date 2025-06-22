/**
 * Setup Verification Tests
 * These tests verify that our Jest + React Testing Library setup is working correctly
 */

import type React from "react";
import { render, screen } from "../test-utils";

// Simple test component
const TestComponent: React.FC<{ message?: string }> = ({
	message = "Hello World",
}) => {
	return (
		<div>
			<h1>{message}</h1>
			<button onClick={() => console.log("clicked")} type="button">
				Click me
			</button>
		</div>
	);
};

describe("Jest + React Testing Library Setup", () => {
	describe("Basic Functionality", () => {
		it("can render a simple component", () => {
			render(<TestComponent />);
			expect(screen.getByText("Hello World")).toBeInTheDocument();
		});

		it("can find elements by role", () => {
			render(<TestComponent />);
			expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: /click me/i }),
			).toBeInTheDocument();
		});

		it("supports custom props", () => {
			render(<TestComponent message="Custom Message" />);
			expect(screen.getByText("Custom Message")).toBeInTheDocument();
		});
	});

	describe("Jest DOM Matchers", () => {
		it("has access to jest-dom matchers", () => {
			render(<TestComponent />);
			const heading = screen.getByRole("heading");

			expect(heading).toBeInTheDocument();
			expect(heading).toBeVisible();
			expect(heading).toHaveTextContent("Hello World");
		});
	});

	describe("Global Mocks", () => {
		it("has IntersectionObserver mock", () => {
			expect(global.IntersectionObserver).toBeDefined();
			expect(typeof global.IntersectionObserver).toBe("function");
		});

		it("has ResizeObserver mock", () => {
			expect(global.ResizeObserver).toBeDefined();
			expect(typeof global.ResizeObserver).toBe("function");
		});

		it("has localStorage mock", () => {
			expect(window.localStorage).toBeDefined();
			expect(typeof window.localStorage.getItem).toBe("function");
			expect(typeof window.localStorage.setItem).toBe("function");
		});

		it("has matchMedia mock", () => {
			expect(window.matchMedia).toBeDefined();
			expect(typeof window.matchMedia).toBe("function");

			const mediaQuery = window.matchMedia("(min-width: 768px)");
			expect(mediaQuery).toHaveProperty("matches");
			expect(mediaQuery).toHaveProperty("media");
		});
	});

	describe("TypeScript Support", () => {
		it("supports TypeScript in tests", () => {
			interface TestData {
				id: number;
				name: string;
			}

			const testData: TestData = {
				id: 1,
				name: "Test Item",
			};

			expect(testData.id).toBe(1);
			expect(testData.name).toBe("Test Item");
		});
	});

	describe("Async Testing", () => {
		it("supports async/await", async () => {
			const promise = Promise.resolve("async result");
			const result = await promise;
			expect(result).toBe("async result");
		});

		it("supports fake timers", () => {
			jest.useFakeTimers();

			const callback = jest.fn();
			setTimeout(callback, 1000);

			expect(callback).not.toHaveBeenCalled();

			jest.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalled();

			jest.useRealTimers();
		});
	});

	describe("Mock Functions", () => {
		it("supports Jest mock functions", () => {
			const mockFn = jest.fn();
			mockFn("test argument");

			expect(mockFn).toHaveBeenCalledWith("test argument");
			expect(mockFn).toHaveBeenCalledTimes(1);
		});

		it("supports mock return values", () => {
			const mockFn = jest.fn().mockReturnValue("mocked value");
			const result = mockFn();

			expect(result).toBe("mocked value");
		});
	});
});

describe("Test Utilities", () => {
	it("provides custom render with providers", () => {
		// This test verifies that our custom render function works
		// The actual provider setup is tested implicitly by not throwing errors
		render(<TestComponent />);
		expect(screen.getByText("Hello World")).toBeInTheDocument();
	});
});
