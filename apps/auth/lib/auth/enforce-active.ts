import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db, proclassUsersTable } from "@/lib/db";
import { log } from "@/lib/observability";

type EnforcedSession = Awaited<ReturnType<typeof auth.api.getSession>>;

/**
 * For member sessions, re-read proclass_users.active. If the member has been
 * deactivated by the hourly ETL, kill their Better-Auth session so subsequent
 * requests across the SSO surface come back as anonymous.
 *
 * Returns the original session if still valid; null if it was revoked.
 */
export async function enforceActiveOrRevoke(
  session: EnforcedSession,
): Promise<EnforcedSession | null> {
  if (!session?.user) return session;
  const u = session.user as typeof session.user & {
    kind?: string | null;
    memberId?: string | null;
  };
  if (u.kind !== "member" || !u.memberId) return session;

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
