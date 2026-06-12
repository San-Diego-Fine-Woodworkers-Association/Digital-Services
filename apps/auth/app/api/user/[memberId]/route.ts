import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, proclassUsersTable } from "@/lib/db";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ memberId: string }> },
) {
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

  const { memberId } = await ctx.params;
  const [m] = await db
    .select()
    .from(proclassUsersTable)
    .where(eq(proclassUsersTable.memberId, memberId));
  if (!m) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(m);
}
