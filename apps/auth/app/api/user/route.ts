import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { enforceActiveOrRevoke } from "@/lib/auth/enforce-active";
import { getServerSession } from "@/lib/auth/get-session";
import { db, proclassUsersTable, volunteersTable } from "@/lib/db";
import { splitName } from "@/lib/name";

export async function GET() {
  const raw = await getServerSession();
  const session = await enforceActiveOrRevoke(raw);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // `accountOrigin` is read internally to pick which detail row to attach; it
  // is not emitted. Consumers discriminate on which of member/volunteer is
  // non-null, and authorize on `claims` / `tier`.
  const u = session.user as typeof session.user & {
    accountOrigin?: string | null;
    memberId?: string | null;
  };
  const s = session as typeof session & {
    claims?: string[];
    groups?: string[];
  };

  let member = null;
  let volunteer = null;
  if (u.accountOrigin === "proclass" && u.memberId) {
    [member] = await db
      .select()
      .from(proclassUsersTable)
      .where(eq(proclassUsersTable.memberId, u.memberId));
  } else if (u.accountOrigin === "google") {
    [volunteer] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.userId, u.id));
  }

  // Uniform top-level first/last name. Members get clean ProClass columns;
  // everyone else (volunteers, or members with empty ProClass names) is split
  // from the single display name.
  let firstName: string | null = null;
  let lastName: string | null = null;
  if (member && (member.firstName || member.lastName)) {
    firstName = member.firstName ?? null;
    lastName = member.lastName ?? null;
  } else {
    const s = splitName(u.name);
    firstName = s.firstName || null;
    lastName = s.lastName || null;
  }

  return NextResponse.json({
    id: u.id,
    email: u.email,
    name: u.name,
    firstName,
    lastName,
    memberId: u.memberId ?? null,
    claims: s.claims ?? [],
    groups: s.groups ?? [],
    member: member ?? null,
    volunteer: volunteer ?? null,
  });
}
