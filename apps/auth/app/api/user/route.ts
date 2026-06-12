import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { enforceActiveOrRevoke } from "@/lib/auth/enforce-active";
import { getServerSession } from "@/lib/auth/get-session";
import { db, proclassUsersTable, volunteersTable } from "@/lib/db";

export async function GET() {
  const raw = await getServerSession();
  const session = await enforceActiveOrRevoke(raw);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const u = session.user as typeof session.user & {
    kind?: string | null;
    memberId?: string | null;
    membership?: string | null;
  };

  if (u.kind === "member" && u.memberId) {
    const [m] = await db
      .select()
      .from(proclassUsersTable)
      .where(eq(proclassUsersTable.memberId, u.memberId));
    return NextResponse.json({
      kind: "member" as const,
      id: u.id,
      email: u.email,
      name: u.name,
      memberId: u.memberId,
      member: m ?? null,
    });
  }

  if (u.kind === "volunteer") {
    const [v] = await db
      .select()
      .from(volunteersTable)
      .where(eq(volunteersTable.userId, u.id));
    return NextResponse.json({
      kind: "volunteer" as const,
      id: u.id,
      email: u.email,
      name: u.name,
      groups: v?.groups ?? [],
      volunteer: v ?? null,
    });
  }

  return NextResponse.json({
    kind: u.kind ?? null,
    id: u.id,
    email: u.email,
    name: u.name,
  });
}
