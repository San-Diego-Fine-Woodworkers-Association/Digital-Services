import { APIError, createAuthEndpoint } from "better-auth/api";
import { BetterAuthPlugin } from "better-auth/types";
import { setSessionCookie } from "better-auth/cookies";
import { and, eq } from "drizzle-orm";

import { db } from "../db";
import { membershipTable } from "../db/schema";

export const memberLoginPlugin = () => {
  return {
    id: "member-login",
    endpoints: {
      signInMember: createAuthEndpoint(
        "/sign-in/member", {
          method: "POST",
        },
        async (ctx) => {
          const { email, memberId, name, address, rememberMe } = ctx.body as { email: string; memberId: string, name: string, address: string, rememberMe: boolean };

          if (!email || !memberId) {
            throw new APIError("BAD_REQUEST", { message: "Email and Member ID are required" });
          }

          // 1. Verify credentials against the membership table
          const [member] = await db
            .select()
            .from(membershipTable)
            .where(
              and(
                eq(membershipTable.email, email),
                eq(membershipTable.memberId, memberId)
              )
            );

          if (!member) throw new APIError("UNAUTHORIZED", { message: "Invalid email or member ID" });

          // 2. Find or create the user in Better Auth's system
          let user = await ctx.context.internalAdapter.findUserByEmail(email).then(res => res?.user);
          
          if (!user) {
            user = await ctx.context.internalAdapter.createUser({
              email: member.email,
              name,
							address,
              emailVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }

          // 3. Create the session
          const session = await ctx.context.internalAdapter.createSession(user.id, !rememberMe);

          // 4. Set the session cookie so the user is successfully authenticated
          await setSessionCookie(ctx, { session, user }, !rememberMe);

          return ctx.json({ session, user });
        }
      ),
    },
  } satisfies BetterAuthPlugin;
};