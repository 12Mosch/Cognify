/** @type {import('jest').Config} */
const config = {
	preset: "ts-jest",
	testEnvironment: "jsdom",
	setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],

	// Module resolution and mapping
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/src/$1",
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
		"\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
			"jest-transform-stub",
	},

	// Transform configuration for modern ES modules and TypeScript
	transform: {
		"^.+\\.(ts|tsx)$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.test.json",
				useESM: true,
			},
		],
		"^.+\\.(js|jsx)$": [
			"babel-jest",
			{
				presets: [
					["@babel/preset-env", { targets: { node: "current" } }],
					["@babel/preset-react", { runtime: "automatic" }],
				],
			},
		],
	},

	// Test file patterns
	testMatch: [
		"<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
		"<rootDir>/src/**/*.+(test|spec).[jt]s?(x)",
	],

	// Coverage configuration
	collectCoverage: false, // Enable with --coverage flag
	collectCoverageFrom: [
		"src/**/*.(ts|tsx)",
		"!src/**/*.d.ts",
		"!src/main.tsx",
		"!src/vite-env.d.ts",
		"!src/**/__tests__/**",
		"!src/**/*.test.*",
		"!src/**/*.spec.*",
		"!src/setupTests.ts",
	],
	coverageDirectory: "coverage",
	coverageReporters: ["text", "lcov", "html", "json-summary"],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},

	// File extensions Jest will process
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

	// Transform ignore patterns for ES modules in node_modules
	transformIgnorePatterns: [
		"node_modules/(?!(.*\\.mjs$|@testing-library|@babel|react-hot-toast|posthog-js))",
	],

	// ES modules support
	extensionsToTreatAsEsm: [".ts", ".tsx"],

	// Test environment options
	testEnvironmentOptions: {
		customExportConditions: ["node", "node-addons"],
	},

	// Timeout for tests
	testTimeout: 10000,

	// Clear mocks between tests
	clearMocks: true,
	restoreMocks: true,

	// Verbose output for better debugging
	verbose: false,

	// Error handling
	errorOnDeprecated: true,
};

module.exports = config;
