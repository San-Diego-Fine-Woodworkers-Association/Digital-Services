import { lt } from "drizzle-orm";

import { db, ghlSyncRunsTable, syncRunsTable } from "../db";

const DEFAULT_RETENTION_DAYS = 90;

export type PruneSyncRunsResult = {
  proclassRunsDeleted: number;
  ghlRunsDeleted: number;
};

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
