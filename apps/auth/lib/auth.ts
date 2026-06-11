import { betterAuth, BetterAuthOptions } from "better-auth";
import { customSession, jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db, user as userTable, volunteersTable } from "@/lib/db";
import { memberLoginPlugin } from "./auth/member-login-plugin";

const ALLOWED_GOOGLE_HD = "sdfwa.org";

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
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      mapProfileToUser: (profile: { hd?: string; email: string; name?: string; picture?: string }) => {
        if (profile.hd !== ALLOWED_GOOGLE_HD) {
          throw new Error(
            "Only @sdfwa.org Google Workspace accounts can sign in here.",
          );
        }
        return {
          email: profile.email,
          name: profile.name ?? profile.email,
          image: profile.picture,
          kind: "volunteer",
          memberId: null,
          membership: null,
        };
      },
    },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account: { providerId: string; accountId: string; userId: string }) => {
          if (account.providerId !== "google") return;
          const [u] = await db
            .select()
            .from(userTable)
            .where(eq(userTable.id, account.userId));
          if (!u) return;
          await db
            .insert(volunteersTable)
            .values({
              userId: u.id,
              googleSub: account.accountId,
              email: u.email,
              name: u.name,
            })
            .onConflictDoNothing();
        },
      },
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
