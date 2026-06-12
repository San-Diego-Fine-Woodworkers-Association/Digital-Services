import { NextResponse } from "next/server";

import { enforceActiveOrRevoke } from "@/lib/auth/enforce-active";
import { getServerSession } from "@/lib/auth/get-session";

export async function GET() {
  const raw = await getServerSession();
  const session = await enforceActiveOrRevoke(raw);
  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const u = session.user as typeof session.user & {
    kind?: string | null;
    memberId?: string | null;
    membership?: string | null;
  };
  const s = session as typeof session & { groups?: string[] };
  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      kind: u.kind ?? null,
      memberId: u.memberId ?? null,
      membership: u.membership ?? null,
      groups: s.groups ?? [],
    },
    expiresAt: session.session.expiresAt,
  });
}
