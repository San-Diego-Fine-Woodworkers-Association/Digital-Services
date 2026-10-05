import { NextResponse } from "next/server";

import { pruneSyncRuns } from "@/lib/maintenance/prune-sync-runs";

export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pruneSyncRuns();
  return NextResponse.json(result, { status: 200 });
}
