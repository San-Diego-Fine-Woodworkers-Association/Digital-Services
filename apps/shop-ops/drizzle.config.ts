import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
	dialect: "postgresql",
	schema: "./lib/db/*.ts",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_CONNECTION_STRING!,
	},
});
