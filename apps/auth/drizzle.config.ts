import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_CONNECTION_STRING!,
  },
});
