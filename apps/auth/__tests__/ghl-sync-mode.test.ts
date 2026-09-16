import { describe, expect, test } from "bun:test";

import { determineSyncMode } from "@/lib/ghl/sync";

describe("determineSyncMode", () => {
  test("backfill when there are no prior runs", () => {
    expect(determineSyncMode([])).toBe("backfill");
  });

  test("backfill when the only prior runs are dry runs, even if ok", () => {
    expect(
      determineSyncMode([
        { status: "ok", dryRun: true },
        { status: "ok", dryRun: true },
      ]),
    ).toBe("backfill");
  });

  test("backfill when the only prior real run errored", () => {
    expect(determineSyncMode([{ status: "error", dryRun: false }])).toBe(
      "backfill",
    );
  });

  test("lookback once a real run has succeeded", () => {
    expect(determineSyncMode([{ status: "ok", dryRun: false }])).toBe(
      "lookback",
    );
  });

  test("lookback when a real ok run exists alongside dry runs and errors", () => {
    expect(
      determineSyncMode([
        { status: "ok", dryRun: true },
        { status: "error", dryRun: false },
        { status: "ok", dryRun: false },
      ]),
    ).toBe("lookback");
  });
});
