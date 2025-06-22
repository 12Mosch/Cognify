/**
 * Tests for error monitoring utilities
 */

import { categorizeError } from "../analytics";
import { withAsyncErrorMonitoring } from "../errorMonitoring";

// Mock PostHog
const mockPostHog = {
	capture: jest.fn(),
	captureException: jest.fn(),
} as any;

// Mock analytics consent
jest.mock("../analytics", () => ({
	...jest.requireActual("../analytics"),
	captureError: jest.fn(),
	hasAnalyticsConsent: jest.fn(() => true),
}));

describe("withAsyncErrorMonitoring", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should categorize network errors correctly", async () => {
		const networkError = new Error("Network request failed");
		const operation = jest.fn().mockRejectedValue(networkError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			networkError,
			expect.objectContaining({
				category: "network_error",
			}),
		);
	});

	it("should categorize authentication errors correctly", async () => {
		const authError = new Error("Unauthorized access token expired");
		const operation = jest.fn().mockRejectedValue(authError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			authError,
			expect.objectContaining({
				category: "authentication_error",
			}),
		);
	});

	it("should categorize timeout errors as performance errors", async () => {
		const timeoutError = new Error("Operation timed out after 5000ms");
		const operation = jest.fn().mockRejectedValue(timeoutError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
				timeoutMs: 5000,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			timeoutError,
			expect.objectContaining({
				category: "performance_error",
			}),
		);
	});

	it("should use explicit error category when provided", async () => {
		const genericError = new Error("Something went wrong");
		const operation = jest.fn().mockRejectedValue(genericError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				errorCategory: "validation_error",
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			genericError,
			expect.objectContaining({
				category: "validation_error",
			}),
		);
	});

	it("should categorize Convex errors as integration errors", async () => {
		const convexError = new Error("Convex mutation failed");
		const operation = jest.fn().mockRejectedValue(convexError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			convexError,
			expect.objectContaining({
				category: "integration_error",
			}),
		);
	});

	it("should categorize unknown errors correctly", async () => {
		const unknownError = new Error("Some random error");
		const operation = jest.fn().mockRejectedValue(unknownError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			unknownError,
			expect.objectContaining({
				category: "unknown_error",
			}),
		);
	});

	it("should not categorize all errors as performance_error", async () => {
		const validationError = new Error("Invalid input provided");
		const operation = jest.fn().mockRejectedValue(validationError);

		const { captureError } = jest.requireMock("../analytics");

		try {
			await withAsyncErrorMonitoring(operation, {
				operationType: "test_operation",
				posthog: mockPostHog,
			});
		} catch {
			// Expected to throw
		}

		// Verify it's NOT categorized as performance_error
		expect(captureError).not.toHaveBeenCalledWith(
			mockPostHog,
			validationError,
			expect.objectContaining({
				category: "performance_error",
			}),
		);

		// Verify it's correctly categorized as validation_error
		expect(captureError).toHaveBeenCalledWith(
			mockPostHog,
			validationError,
			expect.objectContaining({
				category: "validation_error",
			}),
		);
	});
});

describe("categorizeError", () => {
	it("should categorize different error types correctly", () => {
		expect(categorizeError(new Error("Network timeout"))).toBe("network_error");
		expect(categorizeError(new Error("Authentication failed"))).toBe(
			"authentication_error",
		);
		expect(categorizeError(new Error("Permission denied"))).toBe(
			"permission_error",
		);
		expect(categorizeError(new Error("Validation failed"))).toBe(
			"validation_error",
		);
		expect(categorizeError(new Error("Operation is slow"))).toBe(
			"performance_error",
		);
		expect(categorizeError(new Error("Convex query failed"))).toBe(
			"integration_error",
		);
		expect(categorizeError(new Error("Random error"))).toBe("unknown_error");
	});
});
