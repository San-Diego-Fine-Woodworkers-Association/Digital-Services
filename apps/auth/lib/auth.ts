import { betterAuth, BetterAuthOptions } from "better-auth";
import { customSession, jwt } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";

import { db, user as userTable, volunteersTable } from "@/lib/db";
import { memberLoginPlugin } from "./auth/member-login-plugin";
import { fetchUserGroups } from "./google/admin-client";
import { log } from "./observability";

const ALLOWED_GOOGLE_HD = "sdfwa.org";

/**
 * Parse a `user.groupsJson` text column into a string[]. Defaults to [] on
 * any malformed value. Synchronous so callers used inside session-build
 * hooks (customSession, jwt.definePayload) stay free of awaits — an async
 * DB read in those paths trips an RSC Flight bug in Next 16.1.6 + Turbopack.
 */
function parseGroupsJson(value: unknown): string[] {
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((g): g is string => typeof g === "string");
  } catch {
    return [];
  }
}

/**
 * Atomically write the latest groups snapshot for a volunteer to both the
 * `volunteers` row (canonical) and the `user.groupsJson` mirror. The mirror
 * is what session-build hooks read at runtime; keeping the two halves in a
 * single transaction prevents drift.
 */
async function syncVolunteerGroups(
  userId: string,
  groups: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(volunteersTable)
      .set({ groups, lastGroupsSyncAt: new Date() })
      .where(eq(volunteersTable.userId, userId));
    await tx
      .update(userTable)
      .set({ groupsJson: JSON.stringify(groups) })
      .where(eq(userTable.id, userId));
  });
}

const baseOptions = {
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",
  secret: process.env.BETTER_AUTH_SECRET,
  user: {
    additionalFields: {
      kind: { type: "string" },
      memberId: { type: "string" },
      membership: { type: "string" },
      groupsJson: { type: "string" },
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

          const result = await fetchUserGroups(u.email);
          if (result.status === "ok") {
            await syncVolunteerGroups(u.id, result.groups);
            log("info", "volunteer_groups_synced", {
              userId: u.id,
              groupCount: result.groups.length,
            });
          } else if (result.status === "not_found") {
            log("warn", "volunteer_not_in_workspace_on_signin", {
              userId: u.id,
              email: u.email,
            });
          }
          // status === "skipped" (no creds) or "error" — leave previous groups
          // intact; the staleness re-sync in enforceActiveOrRevoke will retry.
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
    jwt({
      jwks: { keyPairConfig: { alg: "EdDSA" } },
      jwt: {
        // Sync: no awaits, no DB calls. Reads from user.groupsJson which
        // Better-Auth has already loaded with the user row.
        definePayload: ({ user }) => {
          const u = user as typeof user & {
            kind?: string | null;
            memberId?: string | null;
            membership?: string | null;
            groupsJson?: string;
          };
          return {
            email: user.email,
            kind: u.kind ?? null,
            memberId: u.memberId ?? null,
            membership: u.membership ?? null,
            groups: parseGroupsJson(u.groupsJson),
          };
        },
      },
    }),
  ],
} satisfies BetterAuthOptions;

const customSessionPlugin = customSession(async ({ user, session }) => {
  const u = user as typeof user & { groupsJson?: string };
  return {
    user,
    session,
    kind: user.kind ?? null,
    memberId: user.memberId ?? null,
    membership: user.membership ?? null,
    groups: parseGroupsJson(u.groupsJson),
  };
}, baseOptions);

export const auth = betterAuth({
  ...baseOptions,
  plugins: [...baseOptions.plugins, customSessionPlugin],
});

export { syncVolunteerGroups };
