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
    memberId?: string | null;
    membership?: string | null;
  };
  const s = session as typeof session & {
    claims?: string[];
    groups?: string[];
  };
  return NextResponse.json({
    user: {
      id: u.id,
      email: u.email,
      memberId: u.memberId ?? null,
      membership: u.membership ?? null,
      groups: s.groups ?? [],
      claims: s.claims ?? [],
    },
    expiresAt: session.session.expiresAt,
  });
}
