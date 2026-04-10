"use server";

/**
 * Server actions for member management
 */

import { eq, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { adminUsersTable, membershipTable } from "@/lib/db/schema";
import { user as userTable } from "@/lib/db/auth-schema";
import {
  ApplyChangesResult,
  DbMember,
  MemberData,
  MemberDiff,
} from "@/lib/types/members";
import { calculateMemberDiff } from "@/lib/utils/members-diff";
import { parseMembersFromCsv } from "@/lib/utils/members";

// Size limit for CSV uploads (1MB)
const MAX_CSV_SIZE = 1024 * 1024;

/**
 * Get all members from database
 */
export async function getMembersForAdmin(): Promise<DbMember[]> {
  await requireAdmin();

  const members = await db.execute<DbMember>(
    sql`
      SELECT
        m."memberId" as "memberId",
        u.id as "userId",
        u.name,
        u.email,
        m.membership,
        u.address,
        CASE WHEN a."memberId" IS NOT NULL THEN true ELSE false END as "isAdmin"
      FROM membership m
      LEFT JOIN "user" u ON u.member_id = m."memberId"
      LEFT JOIN admin_users a ON a."memberId" = m."memberId"
      ORDER BY m."memberId"
    `
  );

  return members.rows || [];
}

/**
 * Upload CSV, parse and validate on the server, and return the diff.
 * The raw CSV string is sent once; parsing never happens on the client.
 */
export async function uploadAndCalculateMemberChanges(
  csvContent: string
): Promise<{ diff: MemberDiff } | { error: string }> {
  const session = await requireAdmin();

  if (csvContent.length > MAX_CSV_SIZE) {
    return { error: "CSV file is too large (max 1MB)" };
  }

  const parseResult = parseMembersFromCsv(csvContent);

  if (!parseResult.success || !parseResult.data) {
    const errorMsg = parseResult.errors
      ?.map((e) => `Row ${e.row} (${e.field}): ${e.message}`)
      .join("; ");
    return { error: `Failed to parse CSV: ${errorMsg}` };
  }

  const currentMembers = await getMembersForAdmin();
  const diff = calculateMemberDiff(
    session.user?.memberId,
    parseResult.data,
    currentMembers
  );

  return { diff };
}

/**
 * Re-parse the CSV on the server and apply changes.
 * The CSV is re-validated and the diff re-derived so the client
 * cannot tamper with the diff payload.
 */
export async function uploadAndApplyMemberChanges(
  csvContent: string
): Promise<ApplyChangesResult> {
  const session = await requireAdmin();

  if (csvContent.length > MAX_CSV_SIZE) {
    return { success: false, error: "CSV file is too large (max 1MB)" };
  }

  const parseResult = parseMembersFromCsv(csvContent);

  if (!parseResult.success || !parseResult.data) {
    const errorMsg = parseResult.errors
      ?.map((e) => `Row ${e.row} (${e.field}): ${e.message}`)
      .join("; ");
    return { success: false, error: `Failed to parse CSV: ${errorMsg}` };
  }

  const currentMembers = await getMembersForAdmin();
  const diff = calculateMemberDiff(
    session.user?.memberId,
    parseResult.data,
    currentMembers
  );

  return applyDiff(session.user?.memberId, diff);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function deleteMembersByIds(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  memberIds: string[]
) {
  if (memberIds.length === 0) return;
  await tx
    .delete(adminUsersTable)
    .where(inArray(adminUsersTable.memberId, memberIds));
  await tx
    .delete(userTable)
    .where(inArray(userTable.memberId, memberIds));
  await tx
    .delete(membershipTable)
    .where(inArray(membershipTable.memberId, memberIds));
}

async function applyDiff(
  currentMemberId: string | undefined,
  diff: MemberDiff
): Promise<ApplyChangesResult> {
  const willDeleteCurrentUser = diff.toDelete.some(
    (m) => m.memberId === currentMemberId
  );

  if (willDeleteCurrentUser) {
    return {
      success: false,
      error: "Cannot delete your own user account",
    };
  }

  try {
    await db.transaction(async (tx) => {
      // Delete members
      await deleteMembersByIds(
        tx,
        diff.toDelete.map((m) => m.memberId)
      );

      // Update members
      for (const { old, new: newData } of diff.toUpdate) {
        await tx
          .update(userTable)
          .set({
            name: newData.name,
            email: newData.email,
            address: newData.address,
          })
          .where(eq(userTable.id, old.userId));

        await tx
          .update(membershipTable)
          .set({
            email: newData.email,
            membership: newData.membership,
          })
          .where(eq(membershipTable.memberId, newData.memberId));

        if (newData.isAdmin) {
          await tx
            .insert(adminUsersTable)
            .values({ memberId: newData.memberId })
            .onConflictDoNothing();
        } else {
          await tx
            .delete(adminUsersTable)
            .where(eq(adminUsersTable.memberId, newData.memberId));
        }
      }

      // Add new members
      for (const member of diff.toAdd) {
        const newUserId = crypto.randomUUID();
        const now = new Date();
        await tx.insert(userTable).values({
          id: newUserId,
          name: member.name,
          email: member.email,
          emailVerified: false,
          memberId: member.memberId,
          address: member.address,
          createdAt: now,
          updatedAt: now,
          banned: false,
        });

        await tx.insert(membershipTable).values({
          memberId: member.memberId,
          email: member.email,
          membership: member.membership,
        });

        if (member.isAdmin) {
          await tx.insert(adminUsersTable).values({
            memberId: member.memberId,
          });
        }
      }
    });

    return {
      success: true,
      message: `Applied ${diff.toAdd.length} additions, ${diff.toUpdate.length} updates, ${diff.toDelete.length} deletions`,
    };
  } catch (error) {
    console.error("Failed to apply member changes:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to apply changes",
    };
  }
}

// ---------------------------------------------------------------------------
// Single-member actions
// ---------------------------------------------------------------------------

/**
 * Update a single member from edit dialog
 */
export async function updateSingleMember(
  memberId: string,
  updates: Partial<MemberData>
): Promise<ApplyChangesResult> {
  await requireAdmin();

  try {
    await db.transaction(async (tx) => {
      const currentUser = await tx
        .select()
        .from(userTable)
        .where(eq(userTable.memberId, memberId))
        .limit(1);

      if (currentUser.length === 0) {
        throw new Error("Member not found");
      }

      const userId = currentUser[0]?.id;
      if (!userId) {
        throw new Error("User ID not found");
      }

      // Update user table
      const userUpdates: Record<string, string> = {};
      if (updates.name !== undefined) userUpdates.name = updates.name;
      if (updates.email !== undefined) userUpdates.email = updates.email;
      if (updates.address !== undefined) userUpdates.address = updates.address;
      if (Object.keys(userUpdates).length > 0) {
        await tx
          .update(userTable)
          .set(userUpdates)
          .where(eq(userTable.id, userId));
      }

      // Update membership table
      const membershipUpdates: Record<string, string> = {};
      if (updates.email !== undefined) membershipUpdates.email = updates.email;
      if (updates.membership !== undefined)
        membershipUpdates.membership = updates.membership;
      if (Object.keys(membershipUpdates).length > 0) {
        await tx
          .update(membershipTable)
          .set(membershipUpdates)
          .where(eq(membershipTable.memberId, memberId));
      }

      // Update admin status
      if (updates.isAdmin !== undefined) {
        if (updates.isAdmin) {
          await tx
            .insert(adminUsersTable)
            .values({ memberId })
            .onConflictDoNothing();
        } else {
          await tx
            .delete(adminUsersTable)
            .where(eq(adminUsersTable.memberId, memberId));
        }
      }
    });

    return { success: true, message: "Member updated successfully" };
  } catch (error) {
    console.error("Failed to update member:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

/**
 * Delete a single member
 */
export async function deleteSingleMember(
  memberId: string
): Promise<ApplyChangesResult> {
  const session = await requireAdmin();

  if (memberId === session.user?.memberId) {
    return {
      success: false,
      error: "Cannot delete your own user account",
    };
  }

  try {
    await db.transaction(async (tx) => {
      await deleteMembersByIds(tx, [memberId]);
    });

    return { success: true, message: "Member deleted successfully" };
  } catch (error) {
    console.error("Failed to delete member:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete member",
    };
  }
}

// ---------------------------------------------------------------------------
// Bulk actions
// ---------------------------------------------------------------------------

/**
 * Delete multiple members in a single transaction.
 * Filters out the current user for safety.
 */
export async function bulkDeleteMembers(
  memberIds: string[]
): Promise<ApplyChangesResult> {
  const session = await requireAdmin();

  const safeIds = memberIds.filter((id) => id !== session.user?.memberId);
  if (safeIds.length === 0) {
    return { success: false, error: "No members to delete" };
  }

  try {
    await db.transaction(async (tx) => {
      await deleteMembersByIds(tx, safeIds);
    });

    return {
      success: true,
      message: `Deleted ${safeIds.length} member${safeIds.length > 1 ? "s" : ""}`,
    };
  } catch (error) {
    console.error("Failed to bulk delete members:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete members",
    };
  }
}

/**
 * Make multiple members admin in a single transaction.
 */
export async function bulkMakeAdmin(
  memberIds: string[]
): Promise<ApplyChangesResult> {
  await requireAdmin();

  if (memberIds.length === 0) {
    return { success: false, error: "No members selected" };
  }

  try {
    await db.transaction(async (tx) => {
      for (const memberId of memberIds) {
        await tx
          .insert(adminUsersTable)
          .values({ memberId })
          .onConflictDoNothing();
      }
    });

    return {
      success: true,
      message: `Made ${memberIds.length} member${memberIds.length > 1 ? "s" : ""} admin`,
    };
  } catch (error) {
    console.error("Failed to bulk make admin:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update members",
    };
  }
}
