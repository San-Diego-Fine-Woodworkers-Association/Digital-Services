import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { enforceActiveOrRevoke } from "@/lib/auth/enforce-active";
import { log } from "@/lib/observability";

/**
 * Exchange the Better-Auth session cookie for a fresh short-lived JWT.
 * Re-checks proclass_users.active first, so deactivated members lose their
 * JWT within the next refresh cycle (≤ JWT TTL).
 */
export async function POST() {
  const h = await headers();
  const raw = await auth.api.getSession({ headers: h });
  const session = await enforceActiveOrRevoke(raw);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await auth.api.getToken({ headers: h });
    const token = (result as { token?: string } | string | null);
    const jwt =
      typeof token === "string" ? token : (token?.token ?? null);
    if (!jwt) throw new Error("Better-Auth getToken returned no token");
    return NextResponse.json({ token: jwt });
  } catch (err) {
    log("error", "jwt_refresh_failed", {
      userId: session.user.id,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to mint token" },
      { status: 500 },
    );
  }
}
