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
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
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
  const [
    potentialAdmin,
    { membership } = {}
  ] = await Promise.all([
    db.query.adminUsersTable.findFirst({
      where: eq(adminUsersTable.memberId, user.memberId)
    }),
    db.query.membershipTable.findFirst({
      where: eq(membershipTable.memberId, user.memberId)
    })
  ])

  const roles = [];
  if (potentialAdmin) roles.push("admin");
  if (membership) roles.push(membership);

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
