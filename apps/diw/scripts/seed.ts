/**
 * Database seed script
 * Creates initial test data including Better Auth users for members
 */

import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/auth-schema";
import { membershipTable, adminUsersTable } from "@/lib/db/schema";

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Test members to create
    const testMembers = [
      {
        memberId: "M001",
        name: "Alice Johnson",
        email: "alice@example.com",
        membership: "volunteer",
        address: "123 Main St, Portland, OR",
        isAdmin: false,
      },
      {
        memberId: "M002",
        name: "Bob Smith",
        email: "bob@example.com",
        membership: "volunteer",
        address: "456 Oak Ave, Portland, OR",
        isAdmin: false,
      },
      {
        memberId: "M003",
        name: "Carol Davis",
        email: "carol@example.com",
        membership: "volunteer",
        address: "789 Pine Rd, Portland, OR",
        isAdmin: false,
      },
      {
        memberId: "M004",
        name: "David Wilson",
        email: "david@example.com",
        membership: "volunteer",
        address: "321 Elm St, Portland, OR",
        isAdmin: false,
      },
      {
        memberId: "M005",
        name: "admin",
        email: "admin@sdfwa.org",
        membership: "volunteer",
        address: "100 Admin St, Portland, OR",
        isAdmin: true,
      },
    ];

    // Create users and membership records
    for (const member of testMembers) {
      const userId = `user_${member.memberId}`;
      const now = new Date();

      // Check if user already exists
      const existingUser = await db.query.user.findFirst({
        where: (users, { eq }) => eq(users.email, member.email),
      });

      if (!existingUser) {
        // Create Better Auth user
        await db.insert(userTable).values({
          id: userId,
          name: member.name,
          email: member.email,
          emailVerified: false,
          memberId: member.memberId,
          address: member.address,
          createdAt: now,
          updatedAt: now,
          banned: false,
        });
        console.log(`✓ Created user: ${member.name} (${member.email})`);
      } else {
        console.log(
          `⊘ User already exists: ${member.name} (${member.email})`
        );
      }

      // Check if membership already exists
      const existingMembership = await db.query.membershipTable.findFirst({
        where: (memberships, { eq }) =>
          eq(memberships.memberId, member.memberId),
      });

      if (!existingMembership) {
        // Create membership
        await db.insert(membershipTable).values({
          memberId: member.memberId,
          email: member.email,
          membership: member.membership,
        });
        console.log(`✓ Created membership: ${member.memberId}`);
      } else {
        console.log(`⊘ Membership already exists: ${member.memberId}`);
      }

      // Add to admin_users if needed
      if (member.isAdmin) {
        const existingAdmin = await db.query.adminUsersTable.findFirst({
          where: (admins, { eq }) =>
            eq(admins.memberId, member.memberId),
        });

        if (!existingAdmin) {
          await db.insert(adminUsersTable).values({
            memberId: member.memberId,
          });
          console.log(`✓ Created admin user: ${member.memberId}`);
        } else {
          console.log(`⊘ Admin user already exists: ${member.memberId}`);
        }
      }
    }

    console.log("✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  }
}

seed();
