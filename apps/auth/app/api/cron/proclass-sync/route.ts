import { NextResponse } from "next/server";

import { runProClassSync } from "@/lib/proclass/sync";

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

  const result = await runProClassSync();
  const status = result.status === "ok" ? 200 : 500;
  return NextResponse.json(result, { status });
}
