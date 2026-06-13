import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { deriveTier, type Tier } from "@/lib/auth/entitlement";
import { db, proclassUsersTable } from "@/lib/db";

/**
 * Normalized membership tiers across active members, for access-rule editors
 * (e.g. the WordPress gating plugin) that gate on colloquial tiers — Gold,
 * Silver, Bronze, Lifetime — rather than the raw ProClass strings.
 *
 * Each tier carries the raw `MembershipType` values that fold into it (for
 * diagnostics / "what does Gold actually include"), and any active membership
 * that maps to no known tier is reported under `unmapped` so taxonomy drift in
 * ProClass is visible. Service-token only, no CORS, no cookies.
 */
export async function GET(req: Request) {
  const expected = process.env.SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SERVICE_TOKEN is not configured" },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      membership: proclassUsersTable.membership,
      count: sql<number>`count(*)::int`,
    })
    .from(proclassUsersTable)
    .where(eq(proclassUsersTable.active, true))
    .groupBy(proclassUsersTable.membership);

  type RawType = { membership: string; count: number };
  const tierMap = new Map<Tier, { count: number; rawTypes: RawType[] }>();
  const unmapped: RawType[] = [];

  for (const r of rows) {
    if (!r.membership) continue; // null membership = no tier; omit
    const raw: RawType = { membership: r.membership, count: r.count };
    const tier = deriveTier(r.membership);
    if (!tier) {
      unmapped.push(raw);
      continue;
    }
    const bucket = tierMap.get(tier) ?? { count: 0, rawTypes: [] };
    bucket.count += r.count;
    bucket.rawTypes.push(raw);
    tierMap.set(tier, bucket);
  }

  const byCountDesc = (a: { count: number }, b: { count: number }) =>
    b.count - a.count;

  const tiers = [...tierMap.entries()]
    .map(([tier, b]) => ({
      tier,
      count: b.count,
      rawTypes: b.rawTypes.sort(byCountDesc),
    }))
    .sort(byCountDesc);
  unmapped.sort(byCountDesc);

  return NextResponse.json({ tiers, unmapped });
}
