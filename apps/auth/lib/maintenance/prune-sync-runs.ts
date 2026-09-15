import { lt } from "drizzle-orm";

import { db, ghlSyncRunsTable, syncRunsTable } from "../db";

const DEFAULT_RETENTION_DAYS = 90;

export type PruneSyncRunsResult = {
  proclassRunsDeleted: number;
  ghlRunsDeleted: number;
};

/**
 * Deletes old rows from sync_runs (hourly ProClass ETL) and ghl_sync_runs
 * (daily GHL sync) — neither table had a retention policy before this;
 * both grow unbounded otherwise, and ghl_sync_runs's dry-run rows in
 * particular can carry a large `dryRunOutput` JSON blob per row.
 * Postgres has no built-in per-row TTL, so this is a plain cron-driven
 * delete rather than an extension-backed expiry.
 */
export async function pruneSyncRuns(
  retentionDays: number = DEFAULT_RETENTION_DAYS,
): Promise<PruneSyncRunsResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const [deletedProclassRuns, deletedGhlRuns] = await Promise.all([
    db
      .delete(syncRunsTable)
      .where(lt(syncRunsTable.startedAt, cutoff))
      .returning({ id: syncRunsTable.id }),
    db
      .delete(ghlSyncRunsTable)
      .where(lt(ghlSyncRunsTable.startedAt, cutoff))
      .returning({ id: ghlSyncRunsTable.id }),
  ]);

  return {
    proclassRunsDeleted: deletedProclassRuns.length,
    ghlRunsDeleted: deletedGhlRuns.length,
  };
}
