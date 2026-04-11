import { betterAuth, BetterAuthOptions } from "better-auth";
import { customSession } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from 'drizzle-orm';

import { db } from "@/lib/db";
import { membershipTable, adminUsersTable } from "@/lib/db/schema";
import { memberLoginPlugin } from "./auth/member-login-plugin";

const options = {
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  user: {
    additionalFields: {
      memberId: {
        type: "string"
      },
      address: {
        type: "string"
      }
    },
  },
  plugins: [memberLoginPlugin()]
} satisfies BetterAuthOptions


const customSessionPlugin = customSession(async({ user, session }) => {
  const [potentialAdmin, memberRecord] = await Promise.all([
    db.query.adminUsersTable.findFirst({
      where: eq(adminUsersTable.memberId, user.memberId)
    }),
    db.query.membershipTable.findFirst({
      where: eq(membershipTable.memberId, user.memberId)
    })
  ]);

  const roles: string[] = [];
  if (potentialAdmin) roles.push("admin");
  if (memberRecord?.membership) roles.push(memberRecord.membership);

  return {
    roles,
    user,
    session
  };
}, options)

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins || []),
    customSessionPlugin
  ]
});
