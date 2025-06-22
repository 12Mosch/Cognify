import { useUser } from "@clerk/clerk-react";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import React from "react";
import App from "../App";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => {
	// Helper function to generate test IDs from labels
	const slugify = (text: string): string => {
		return text
			.toLowerCase()
			.normalize("NFD") // Decompose diacritics
			.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
			.replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric chars except spaces and hyphens
			.replace(/\s+/g, "-") // Replace spaces with hyphens
			.replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
			.replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
	};

	interface MockUserButtonComponent
		extends React.FC<{ children?: React.ReactNode }> {
		MenuItems: React.FC<{ children: React.ReactNode }>;
		Action: React.FC<{
			label: string;
			onClick?: () => void;
			labelIcon?: React.ReactNode;
		}>;
	}

	const MockUserButton: MockUserButtonComponent = ({ children }) => (
		<div data-testid="user-button">
			User Button
			{children}
		</div>
	);

	MockUserButton.MenuItems = ({ children }: { children: React.ReactNode }) => (
		<div data-testid="user-button-menu-items">{children}</div>
	);

	MockUserButton.Action = ({
		label,
		onClick,
	}: {
		label: string;
		onClick?: () => void;
		labelIcon?: React.ReactNode;
	}) => (
		<button
			data-testid={`user-button-action-${slugify(label)}`}
			onClick={onClick}
			type="button"
		>
			{label}
		</button>
	);

	return {
		Authenticated: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="authenticated">{children}</div>
		),
		SignInButton: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="sign-in-button">{children}</div>
		),
		SignUpButton: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="sign-up-button">{children}</div>
		),
		Unauthenticated: ({ children }: { children: React.ReactNode }) => (
			<div data-testid="unauthenticated">{children}</div>
		),
		UserButton: MockUserButton,
		useUser: jest.fn(),
	};
});

// Mock Convex
jest.mock("convex/react", () => ({
	Authenticated: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="authenticated">{children}</div>
	),
	Unauthenticated: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="unauthenticated">{children}</div>
	),
	useQuery: jest.fn(),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
	Toaster: () => <div data-testid="toaster" />,
}));

// Mock react-i18next
jest.mock("react-i18next", () => ({
	useTranslation: () => ({
		i18n: {
			changeLanguage: jest.fn(),
		},
		t: (key: string, options?: any) => {
			// Return English translations for testing
			const translations: Record<string, string> = {
				"app.goToMainDashboard": "Go to main dashboard",
				"app.title": "Cognify",
				"auth.signIn": "Sign In",
				"auth.signInPrompt":
					"Sign in to create and manage your flashcard decks",
				"auth.signUp": "Sign Up",
				"auth.welcome": `Welcome to ${options?.appName || "Cognify"}`,
				"navigation.settings": "Settings",
				"navigation.signOut": "Sign Out",
			};
			return translations[key] || key;
		},
	}),
}));

// Mock Dashboard component
jest.mock("../components/Dashboard", () => ({
	Dashboard: jest.fn().mockImplementation(({ ref }) => {
		// Simulate the ref functionality
		React.useImperativeHandle(ref, () => ({
			goHome: jest.fn(),
		}));
		return <div data-testid="dashboard">Dashboard Content</div>;
	}),
}));

// Mock SettingsModal component
jest.mock("../components/SettingsModal", () => {
	return jest.fn(({ isOpen }) =>
		isOpen ? <div data-testid="settings-modal">Settings Modal</div> : null,
	);
});

// Mock analytics
jest.mock("../lib/analytics", () => ({
	hasUserBeenTrackedForRegistration: jest.fn(() => false),
	markUserAsTrackedForRegistration: jest.fn(),
	useAnalytics: () => ({
		trackUserSignUp: jest.fn(),
	}),
	useAnalyticsEnhanced: () => ({
		identifyUser: jest.fn(),
	}),
	usePrivacyCompliantAnalytics: () => ({
		grantConsent: jest.fn(),
		privacySettings: {
			analyticsConsent: "pending",
			functionalConsent: "pending",
			marketingConsent: "pending",
		},
		revokeConsent: jest.fn(),
	}),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>;

describe("App Component", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseUser.mockReturnValue({
			isLoaded: true,
			user: {
				firstName: "Test",
				id: "test-user-id",
				lastName: "User",
			},
		} as any);
		mockUseQuery.mockReturnValue([]);
	});

	it("renders the app title as a clickable button", () => {
		render(<App />);

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		expect(titleButton).toBeInTheDocument();
		expect(titleButton).toHaveTextContent("Cognify");
	});

	it("has proper accessibility attributes on the title button", () => {
		render(<App />);

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		expect(titleButton).toHaveAttribute("aria-label", "Go to main dashboard");
		expect(titleButton).toHaveAttribute("title", "Go to main dashboard");
	});

	it("applies hover styles to the title button", () => {
		render(<App />);

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		expect(titleButton).toHaveClass(
			"hover:text-slate-700",
			"dark:hover:text-slate-300",
		);
	});

	it("has focus styles for accessibility", () => {
		render(<App />);

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		expect(titleButton).toHaveClass(
			"focus:outline-none",
			"focus:ring-2",
			"focus:ring-slate-400",
		);
	});

	it("renders the header with proper layout", () => {
		render(<App />);

		const header = screen.getByRole("banner");
		expect(header).toHaveClass("sticky", "top-0", "z-10");

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		const userButton = screen.getByTestId("user-button");

		expect(header).toContainElement(titleButton);
		expect(header).toContainElement(userButton);
	});

	it("shows authenticated content when user is logged in", () => {
		render(<App />);

		expect(screen.getByTestId("authenticated")).toBeInTheDocument();
		expect(screen.getByTestId("dashboard")).toBeInTheDocument();
	});

	it("maintains the same visual appearance as before (font and styling)", () => {
		render(<App />);

		const titleButton = screen.getByRole("button", {
			name: /go to main dashboard/i,
		});
		expect(titleButton).toHaveClass("text-xl", "font-bold");
	});
});
