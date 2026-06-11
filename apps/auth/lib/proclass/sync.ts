import { and, eq, notInArray, sql } from "drizzle-orm";

import { db, proclassUsersTable, syncRunsTable } from "../db";
import { fetchAllContacts, fetchMembershipsByAccountIds } from "./client";
import { getPrimaryAccountId, joinContactsAndMemberships } from "./transform";
import type { ProClassMembership } from "./types";

export type SyncRunResult = {
  id: string;
  status: "ok" | "error";
  contactsScanned: number;
  membersUpserted: number;
  membersDeactivated: number;
  errorMessage: string | null;
};

/**
 * Pull all ProClass contacts + their memberships, upsert into `members`,
 * and soft-deactivate any rows that didn't show up in this run.
 */
export async function runProClassSync(): Promise<SyncRunResult> {
  const [run] = await db
    .insert(syncRunsTable)
    .values({ status: "running" })
    .returning({ id: syncRunsTable.id });
  const runId = run!.id;

  try {
    const contacts = await fetchAllContacts();
    const accountIds = Array.from(
      new Set(
        contacts
          .map(getPrimaryAccountId)
          .filter((id): id is number => id !== null),
      ),
    );
    const memberships = await fetchMembershipsByAccountIds(accountIds);

    const byAccount = new Map<number, ProClassMembership[]>();
    for (const m of memberships) {
      const list = byAccount.get(m.AccountId) ?? [];
      list.push(m);
      byAccount.set(m.AccountId, list);
    }

    const projected = joinContactsAndMemberships(contacts, byAccount);

    // Upsert in chunks to keep parameter counts reasonable.
    const CHUNK = 500;
    const now = new Date();
    for (let i = 0; i < projected.length; i += CHUNK) {
      const slice = projected.slice(i, i + CHUNK);
      await db
        .insert(proclassUsersTable)
        .values(
          slice.map((m) => ({
            memberId: m.memberId,
            email: m.email,
            phone: m.phone,
            firstName: m.firstName,
            lastName: m.lastName,
            address: m.address,
            membership: m.membership,
            memberSince: m.memberSince,
            active: true,
            lastSyncedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: proclassUsersTable.memberId,
          set: {
            email: sqlExcluded("email"),
            phone: sqlExcluded("phone"),
            firstName: sqlExcluded("first_name"),
            lastName: sqlExcluded("last_name"),
            address: sqlExcluded("address"),
            membership: sqlExcluded("membership"),
            memberSince: sqlExcluded("member_since"),
            active: sqlExcluded("active"),
            lastSyncedAt: sqlExcluded("last_synced_at"),
          },
        });
    }

    const presentIds = projected.map((m) => m.memberId);
    const deactivated = await db
      .update(proclassUsersTable)
      .set({ active: false })
      .where(
        and(
          eq(proclassUsersTable.active, true),
          presentIds.length > 0
            ? notInArray(proclassUsersTable.memberId, presentIds)
            : undefined,
        ),
      )
      .returning({ id: proclassUsersTable.memberId });

    const upserted = projected.length;
    const [finished] = await db
      .update(syncRunsTable)
      .set({
        status: "ok",
        finishedAt: new Date(),
        contactsScanned: contacts.length,
        membersUpserted: upserted,
        membersDeactivated: deactivated.length,
      })
      .where(eq(syncRunsTable.id, runId))
      .returning();

    return {
      id: finished!.id,
      status: "ok",
      contactsScanned: finished!.contactsScanned,
      membersUpserted: finished!.membersUpserted,
      membersDeactivated: finished!.membersDeactivated,
      errorMessage: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const [finished] = await db
      .update(syncRunsTable)
      .set({
        status: "error",
        finishedAt: new Date(),
        errorMessage: message,
      })
      .where(eq(syncRunsTable.id, runId))
      .returning();
    return {
      id: finished!.id,
      status: "error",
      contactsScanned: finished!.contactsScanned,
      membersUpserted: finished!.membersUpserted,
      membersDeactivated: finished!.membersDeactivated,
      errorMessage: message,
    };
  }
}

function sqlExcluded(columnName: string) {
  return sql.raw(`excluded.${columnName}`);
}
