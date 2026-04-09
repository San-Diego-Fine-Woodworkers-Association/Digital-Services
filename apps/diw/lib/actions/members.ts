"use server";

/**
 * Server actions for member management
 */

import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { adminUsersTable, membershipTable } from "@/lib/db/schema";
import { user as userTable } from "@/lib/db/auth-schema";
import {
  ApplyChangesResult,
  DbMember,
  MemberData,
  MemberDiff,
  ParseResult,
} from "@/lib/types/members";
import {
  calculateMemberDiff,
} from "@/lib/utils/members-diff";
import { parseMembersFromCsv } from "@/lib/utils/members";

/**
 * Get all members from database
 */
export async function getMembersForAdmin(): Promise<DbMember[]> {
  await requireAdmin();

  // Join user, membership, and admin_users to get all members
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
 * Calculate diff between CSV data and current DB state
 */
export async function calculateMemberChanges(
  csvData: MemberData[]
): Promise<MemberDiff> {
  const session = await requireAdmin();

  const currentMembers = await getMembersForAdmin();
  return calculateMemberDiff(session.user?.memberId, csvData, currentMembers);
}

/**
 * Apply member changes from CSV import
 * Returns error if current user would be deleted
 */
export async function applyMemberChanges(
  diff: MemberDiff
): Promise<ApplyChangesResult> {
  const session = await requireAdmin();

  const currentMemberId = session.user?.memberId;

  // Safety check: do not allow deletion of current user
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
    // Use transaction to ensure all-or-nothing
    await db.transaction(async (tx) => {
      // Delete members
      for (const member of diff.toDelete) {
        // Delete from admin_users
        await tx
          .delete(adminUsersTable)
          .where(eq(adminUsersTable.memberId, member.memberId));

        // Delete from user
        await tx
          .delete(userTable)
          .where(eq(userTable.memberId, member.memberId));

        // Delete from membership
        await tx
          .delete(membershipTable)
          .where(eq(membershipTable.memberId, member.memberId));
      }

      // Update members
      for (const { old, new: newData } of diff.toUpdate) {
        // Update user
        await tx
          .update(userTable)
          .set({
            name: newData.name,
            email: newData.email,
            address: newData.address,
          })
          .where(eq(userTable.id, old.userId));

        // Update membership
        await tx
          .update(membershipTable)
          .set({
            email: newData.email,
            membership: newData.membership,
          })
          .where(eq(membershipTable.memberId, newData.memberId));

        // Update or add admin_users
        if (newData.isAdmin) {
          // Upsert: insert if not exists
          await tx.insert(adminUsersTable).values({
            memberId: newData.memberId,
          }).onConflictDoNothing();
        } else {
          // Remove from admin_users if exists
          await tx
            .delete(adminUsersTable)
            .where(eq(adminUsersTable.memberId, newData.memberId));
        }
      }

      // Add new members
      for (const member of diff.toAdd) {
        // Create Better Auth user
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

        // Create membership
        await tx.insert(membershipTable).values({
          memberId: member.memberId,
          email: member.email,
          membership: member.membership,
        });

        // Add to admin_users if needed
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
      // Get current user to find their ID
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
      if (updates.membership !== undefined) membershipUpdates.membership = updates.membership;
      if (Object.keys(membershipUpdates).length > 0) {
        await tx
          .update(membershipTable)
          .set(membershipUpdates)
          .where(eq(membershipTable.memberId, memberId));
      }

      // Update admin status
      if (updates.isAdmin !== undefined) {
        if (updates.isAdmin) {
          await tx.insert(adminUsersTable).values({ memberId }).onConflictDoNothing();
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
      error: error instanceof Error ? error.message : "Failed to update member",
    };
  }
}

/**
 * Delete a single member
 * Cannot delete the current user
 */
export async function deleteSingleMember(
  memberId: string
): Promise<ApplyChangesResult> {
  const session = await requireAdmin();

  // Safety check: cannot delete current user
  if (memberId === session.user?.memberId) {
    return {
      success: false,
      error: "Cannot delete your own user account",
    };
  }

  try {
    await db.transaction(async (tx) => {
      // Delete from admin_users
      await tx
        .delete(adminUsersTable)
        .where(eq(adminUsersTable.memberId, memberId));

      // Delete from user
      await tx
        .delete(userTable)
        .where(eq(userTable.memberId, memberId));

      // Delete from membership
      await tx
        .delete(membershipTable)
        .where(eq(membershipTable.memberId, memberId));
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
