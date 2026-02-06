Packages: `@sdfwa/auth-client`

This package provides a minimal scaffold around `better-auth` for the MVP.

Contents:
- `src/server.ts` — creates a `betterAuth` instance wired to the Drizzle adapter (MVP scaffold).
- `src/middleware.ts` — helper functions `requireMember` and `requireVolunteer` that call the IdP session endpoint and redirect if checks fail.

Notes:
- The implementation is a development scaffold. In production you should:
  - Ensure `BETTER_AUTH_URL` points to your deployed IdP.
  - Use the adapter and schema mapping supported by your `better-auth` and `drizzle` versions.
  - Harden the middleware to gracefully handle timeouts and failures and cache session checks where appropriate.
