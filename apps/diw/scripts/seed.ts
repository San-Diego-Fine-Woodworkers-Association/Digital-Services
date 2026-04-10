/**
 * Database seed script
 *
 * Reads members from data/members.csv (or a path passed as CLI arg),
 * then upserts Better Auth users, membership records, and admin flags.
 *
 * Usage:
 *   bun seed                         # uses data/members.csv
 *   bun seed ./path/to/members.csv   # uses a custom CSV
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/auth-schema";
import { membershipTable, adminUsersTable } from "@/lib/db/schema";
import { parseMembersFromCsv } from "@/lib/utils/members";

async function seed() {
  const csvPath = resolve(process.argv[2] || "./data/members.csv");
  console.log(`Reading members from: ${csvPath}`);

  const raw = readFileSync(csvPath, "utf-8");
  const result = parseMembersFromCsv(raw);

  if (!result.success || !result.data) {
    console.error("Failed to parse CSV:");
    for (const err of result.errors ?? []) {
      console.error(`  Row ${err.row} (${err.field}): ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`Parsed ${result.data.length} members, upserting...`);

  for (const member of result.data) {
    const now = new Date();

    // Upsert Better Auth user
    await db
      .insert(userTable)
      .values({
        id: crypto.randomUUID(),
        name: member.name,
        email: member.email,
        emailVerified: false,
        memberId: member.memberId,
        address: member.address,
        createdAt: now,
        updatedAt: now,
        banned: false,
      })
      .onConflictDoUpdate({
        target: userTable.memberId,
        set: {
          name: member.name,
          email: member.email,
          address: member.address,
          updatedAt: now,
        },
      });

    // Upsert membership
    await db
      .insert(membershipTable)
      .values({
        memberId: member.memberId,
        email: member.email,
        membership: member.membership,
      })
      .onConflictDoUpdate({
        target: membershipTable.memberId,
        set: { email: member.email, membership: member.membership },
      });

    // Handle admin flag
    if (member.isAdmin) {
      await db
        .insert(adminUsersTable)
        .values({ memberId: member.memberId })
        .onConflictDoNothing();
      console.log(`  ${member.memberId} ${member.name} (admin)`);
    } else {
      console.log(`  ${member.memberId} ${member.name}`);
    }
  }

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
