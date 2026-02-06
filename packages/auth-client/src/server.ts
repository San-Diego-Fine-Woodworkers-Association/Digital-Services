import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { eq } from 'drizzle-orm'
import { db, authSchema } from '@sdfwa/db'

// Minimal Better Auth server instance scaffold — tune per production needs.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authSchema.user,
      account: authSchema.account,
      session: authSchema.session,
    },
  }),
  callbacks: {
    async session({ session, user }: any) {
      // Attempt to map the active account for this session and filter roles.
      try {
        const activeAccountId = session?.activeAccountId
        const dbUser = user || {}
        let sessionRoles = ['member']
        if (activeAccountId) {
          // Query account using drizzle eq operator
          const activeAccount = await db.query.account.findFirst({
            where: eq(authSchema.account.id, activeAccountId),
          })
          const provider = activeAccount?.accountType
          const dbRoles = dbUser.roles || []
          if (provider === 'google' && dbRoles.includes('volunteer')) {
            sessionRoles.push('volunteer')
          }
        }
        return {
          ...session,
          user: { ...session.user, roles: sessionRoles },
        }
      } catch (_e) {
        return session
      }
    },
  },
})

export default auth
