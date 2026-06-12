import { eq } from "drizzle-orm";

import { auth, syncVolunteerGroups } from "@/lib/auth";
import { db, proclassUsersTable, volunteersTable } from "@/lib/db";
import { fetchUserGroups } from "@/lib/google/admin-client";
import { log } from "@/lib/observability";

type EnforcedSession = Awaited<ReturnType<typeof auth.api.getSession>>;

const GROUPS_STALE_MS = 10 * 60 * 1000;

/**
 * Hot-path revocation + freshness check, run on every public session/JWT read.
 *
 * - Members: re-reads proclass_users.active; revokes if the ETL has soft-deleted them.
 * - Volunteers: re-syncs groups from Workspace when last_groups_sync_at is older
 *   than GROUPS_STALE_MS, and revokes only if Workspace returns 404 (user removed).
 *   Transient Admin API errors do not revoke.
 *
 * Returns the original session if still valid; null if revoked.
 */
export async function enforceActiveOrRevoke(
  session: EnforcedSession,
): Promise<EnforcedSession | null> {
  if (!session?.user) return session;
  const u = session.user as typeof session.user & {
    kind?: string | null;
    memberId?: string | null;
    email: string;
  };

  if (u.kind === "member" && u.memberId) {
    const [member] = await db
      .select({ active: proclassUsersTable.active })
      .from(proclassUsersTable)
      .where(eq(proclassUsersTable.memberId, u.memberId));

    if (member?.active) return session;

    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteSession(session.session.token);
    log("warn", "session_revoked_inactive_member", {
      userId: u.id,
      memberId: u.memberId,
    });
    return null;
  }

  if (u.kind === "volunteer") {
    const [v] = await db
      .select({ lastGroupsSyncAt: volunteersTable.lastGroupsSyncAt })
      .from(volunteersTable)
      .where(eq(volunteersTable.userId, u.id));

    const stale =
      !v?.lastGroupsSyncAt ||
      Date.now() - v.lastGroupsSyncAt.getTime() > GROUPS_STALE_MS;

    if (!stale) return session;

    const result = await fetchUserGroups(u.email);
    if (result.status === "ok") {
      await syncVolunteerGroups(u.id, result.groups);
      return session;
    }
    if (result.status === "not_found") {
      const ctx = await auth.$context;
      await ctx.internalAdapter.deleteSession(session.session.token);
      log("warn", "session_revoked_volunteer_not_in_workspace", {
        userId: u.id,
        email: u.email,
      });
      return null;
    }
    // status === "skipped" (no creds) or "error" — leave session alive,
    // groups stay at last-known values.
    return session;
  }

  return session;
}
