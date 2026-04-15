import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDir, ".env.local") });

export default defineConfig({
    dialect: 'postgresql',
    schema: "./lib/db/schema.ts",
	out:'./drizzle',
	dbCredentials: {
		url: process.env.DATABASE_CONNECTION_STRING!
	}
});