import { NextResponse } from "next/server";

import { runGhlSync, type GhlSyncMode } from "@/lib/ghl/sync";

const VALID_MODES: GhlSyncMode[] = ["backfill", "lookback"];

export const maxDuration = 300;

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

  const params = new URL(req.url).searchParams;
  const dryRun = params.get("dryRun") !== "false";
  const modeParam = params.get("mode");
  if (modeParam && !VALID_MODES.includes(modeParam as GhlSyncMode)) {
    return NextResponse.json(
      { error: `mode must be one of: ${VALID_MODES.join(", ")}` },
      { status: 400 },
    );
  }
  const mode = (modeParam as GhlSyncMode | null) ?? undefined;

  const result = await runGhlSync({ dryRun, mode });
  const status = result.status === "ok" ? 200 : 500;
  return NextResponse.json(result, { status });
}
