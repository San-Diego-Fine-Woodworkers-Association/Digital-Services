import { betterAuth, BetterAuthOptions } from "better-auth";
import { customSession, jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/lib/db";
import { memberLoginPlugin } from "./auth/member-login-plugin";

const baseOptions = {
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      kind: { type: "string" },
      memberId: { type: "string" },
      membership: { type: "string" },
    },
  },
  advanced: {
    crossSubDomainCookies: { enabled: true },
    defaultCookieAttributes: {
      domain: process.env.COOKIE_DOMAIN,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  plugins: [
    memberLoginPlugin(),
    jwt({ jwks: { keyPairConfig: { alg: "EdDSA" } } }),
  ],
} satisfies BetterAuthOptions;

const customSessionPlugin = customSession(async ({ user, session }) => {
  return {
    user,
    session,
    kind: user.kind ?? null,
    memberId: user.memberId ?? null,
    membership: user.membership ?? null,
  };
}, baseOptions);

export const auth = betterAuth({
  ...baseOptions,
  plugins: [...baseOptions.plugins, customSessionPlugin],
});
