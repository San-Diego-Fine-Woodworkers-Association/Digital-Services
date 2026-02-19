import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";
import { additionalRolesTable, adminUsersTable } from "@/lib/db/schema";
import { eq } from 'drizzle-orm';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  plugins: [admin()],
  databaseHooks: {
    user: {
      create: {
        after: async ({ id: userId }) => {
          const [
            potentialAdmin,
            potentialRoles
          ] = await Promise.all([
            db.select()
            .from(adminUsersTable)
            .where(eq(adminUsersTable.memberId, userId))
            .limit(1)
            .then(results => results.length > 0 ? 'admin' : null),
            db.select()
            .from(additionalRolesTable)
            .where(eq(additionalRolesTable.memberId, userId))
            .limit(1)
            .then(results => results.length > 0 ? results[0]?.role : null)
          ])

          const roles = [potentialAdmin, potentialRoles].filter(Boolean);

          if (roles.length > 0) {
            await db.update(user).set({
              role: roles.join(',')
            }).where(eq(user.id, userId));
          }
        },
      },
    },
  },
});
