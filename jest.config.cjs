/** @type {import('jest').Config} */
const config = {
	// Clear mocks between tests
	clearMocks: true,

	// Coverage configuration
	collectCoverage: false,
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

	// Error handling
	errorOnDeprecated: true, // Enable with --coverage flag

	// ES modules support
	extensionsToTreatAsEsm: [".ts", ".tsx"],

	// File extensions Jest will process
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

	// Module resolution and mapping
	moduleNameMapper: {
		"\\.(css|less|scss|sass)$": "identity-obj-proxy",
		"\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
			"jest-transform-stub",
		"^@/(.*)$": "<rootDir>/src/$1",
	},
	preset: "ts-jest",
	restoreMocks: true,
	setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
	testEnvironment: "jsdom",

	// Test environment options
	testEnvironmentOptions: {
		customExportConditions: ["node", "node-addons"],
	},

	// Test file patterns
	testMatch: [
		"<rootDir>/src/**/__tests__/**/*.[jt]s?(x)",
		"<rootDir>/src/**/*.+(test|spec).[jt]s?(x)",
	],

	// Timeout for tests
	testTimeout: 10000,

	// Transform configuration for modern ES modules and TypeScript
	transform: {
		"^.+\\.(js|jsx)$": [
			"babel-jest",
			{
				presets: [
					["@babel/preset-env", { targets: { node: "current" } }],
					["@babel/preset-react", { runtime: "automatic" }],
				],
			},
		],
		"^.+\\.(ts|tsx)$": [
			"ts-jest",
			{
				tsconfig: "tsconfig.test.json",
				useESM: true,
			},
		],
	},

	// Transform ignore patterns for ES modules in node_modules
	transformIgnorePatterns: [
		"node_modules/(?!(.*\\.mjs$|@testing-library|@babel|react-hot-toast|posthog-js))",
	],

	// Verbose output for better debugging
	verbose: false,
};

module.exports = config;
