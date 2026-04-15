import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3001",
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      memberId: {
        type: "string"
      },
    },
  },
});