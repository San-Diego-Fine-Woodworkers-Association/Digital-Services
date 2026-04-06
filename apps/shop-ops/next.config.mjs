import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Turbopack’s PostCSS step does `require("@tailwindcss/postcss")` from a chunk that does not
// follow Bun’s `node_modules/.bun/...` symlinks. Point the package id at the real file on disk.
const tailwindPostcssEntry = require.resolve("@tailwindcss/postcss");

/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: ["@sdfwa/ui"],
	output: "standalone",
	turbopack: {
		root: path.resolve(__dirname, "../.."),
		resolveAlias: {
			"@tailwindcss/postcss": tailwindPostcssEntry,
		},
	},
};

export default nextConfig;
