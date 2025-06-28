import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	build: {
		rollupOptions: {
			external: (id) => {
				// Externalize problematic worker files from jsquash packages
				if (id.includes("@jsquash") && id.includes("_mt.js")) {
					return true;
				}
				return false;
			},
		},
	},
	optimizeDeps: {
		exclude: ["@jsquash/avif", "@jsquash/webp"],
	},
	plugins: [
		react({
			babel: {
				plugins: ["babel-plugin-react-compiler"],
			},
		}),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
	worker: {
		format: "es",
	},
});
