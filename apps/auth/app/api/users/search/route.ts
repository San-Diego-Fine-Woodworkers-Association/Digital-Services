import { and, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, proclassUsersTable } from "@/lib/db";

const MAX_RESULTS = 20;

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

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const pattern = `%${q}%`;
  const rows = await db
    .select({
      memberId: proclassUsersTable.memberId,
      email: proclassUsersTable.email,
      firstName: proclassUsersTable.firstName,
      lastName: proclassUsersTable.lastName,
      membership: proclassUsersTable.membership,
    })
    .from(proclassUsersTable)
    .where(
      and(
        eq(proclassUsersTable.active, true),
        or(
          ilike(proclassUsersTable.firstName, pattern),
          ilike(proclassUsersTable.lastName, pattern),
          ilike(
            sql`coalesce(${proclassUsersTable.firstName}, '') || ' ' || coalesce(${proclassUsersTable.lastName}, '')`,
            pattern,
          ),
          ilike(proclassUsersTable.memberId, `${q}%`),
          ilike(proclassUsersTable.email, pattern),
        ),
      ),
    )
    .limit(MAX_RESULTS);

  const results = rows.map((r) => ({
    memberId: r.memberId,
    email: r.email,
    name: [r.firstName, r.lastName].filter(Boolean).join(" ").trim(),
    membership: r.membership,
  }));

  return NextResponse.json({ results });
}
