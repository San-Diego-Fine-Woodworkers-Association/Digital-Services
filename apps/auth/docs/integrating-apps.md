# Integrating a consumer app

A "consumer app" is anything inside the monorepo (or any service deployed
under `*.sdfwa.org`) that needs to know who the signed-in user is. Examples:
`diw`, `shop-ops`, the WordPress site (eventually).

The package `@sdfwa/auth-client` is the supported way in.

## Add the dependency

```jsonc
// apps/<your-app>/package.json
{
  "dependencies": {
    "@sdfwa/auth-client": "workspace:*"
  }
}
```

Then `bun install` at the repo root.

## Configure env

Both vars are required when the consumer is on a different origin than
the auth app (i.e. always, except for local same-host tests).

```ini
# apps/<your-app>/.env
AUTH_BASE_URL=http://localhost:3002              # server-side
NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3002  # client-side hooks
```

In production these become `https://auth.sdfwa.org`. Add them to the app's
`turbo.json` `build.env` so cache keys invalidate on change.

## Server-side: read the session

```ts
import { cookies } from "next/headers";
import { getServerSession, getCurrentUser } from "@sdfwa/auth-client/server";

export default async function Page() {
  const cookieHeader = (await cookies())
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const session = await getServerSession(cookieHeader);
  const user = session ? await getCurrentUser(cookieHeader) : null;

  if (!session) return <SignInPrompt />;
  return <YourPage user={user} />;
}
```

Both helpers forward the browser's cookies to the auth app, which validates
the session and (for `getCurrentUser`) returns the joined `proclass_users`
or `volunteers` row.

Helpers that throw on the wrong identity:

```ts
import { requireMember, requireVolunteer } from "@sdfwa/auth-client/server";

await requireMember(cookieHeader);    // throws "Unauthorized" or "Forbidden"
await requireVolunteer(cookieHeader);
```

## Gating on Workspace groups

Volunteers carry a `groups: string[]` array of `@sdfwa.org` Google Group emails.
Use `requireGroup` for server-side route protection:

```ts
import { requireGroup } from "@sdfwa/auth-client/server";

await requireGroup(cookieHeader, "tech-admin@sdfwa.org");
// or any-of:
await requireGroup(cookieHeader, ["tech-admin@sdfwa.org", "shop-managers@sdfwa.org"]);
```

For middleware or client-side checks (no fetch), use the pure predicates from
the main entry point:

```ts
import { hasGroup, hasAnyGroup, hasAllGroups } from "@sdfwa/auth-client";

if (!hasGroup(session.user.groups, "tech-admin@sdfwa.org")) return null;
```

All predicates are default-closed: empty `userGroups` or empty `allowed`/`required`
returns false. Comparisons are case-sensitive — compare against lowercase
constants. Reference page: `apps/diw/app/whoami/admin-only/page.tsx`. For the
Workspace admin setup, see `docs/workspace-groups.md` in the auth app.

## Client-side: hooks

```tsx
"use client";
import { useSession, useUser } from "@sdfwa/auth-client/client";

export function NavUser() {
  const session = useSession();
  if (session.status === "loading") return null;
  if (session.status === "unauthenticated") return <SignInLink />;
  return <span>{session.data.user.email}</span>;
}
```

Both hooks `fetch` with `credentials: "include"` so the browser sends the
`.sdfwa.org` cookie. The auth app's CORS middleware allows any subdomain.

## (Future) Local JWT verification

When you need to authorize lots of server-side requests without round-tripping
to the auth app, mint a JWT once and verify locally:

```ts
import { verifyJwt } from "@sdfwa/auth-client";

const payload = await verifyJwt(token, { authBaseUrl: process.env.AUTH_BASE_URL });
// { sub, email, kind, memberId, membership, exp, iss, aud }
```

`verifyJwt` fetches and caches the JWKS for one hour. To get a token in the
first place, the consumer app calls `POST /api/auth/jwt-refresh` with the
session cookie. This path is implemented but currently optional — the
cookie-forwarding helpers above are fine for SSR.

## Sign-in entry point

Send unauthenticated users to `https://auth.sdfwa.org/login?redirect=<encoded>`.
The auth app validates the `redirect` param (must be relative or under
`*.sdfwa.org` or `localhost`) and bounces them back after sign-in.

If you omit the param, users land on `POST_LOGIN_DEFAULT_REDIRECT` (in prod,
`https://www.sdfwa.org`).

## Sign-out

POST to `https://auth.sdfwa.org/api/auth/sign-out` with
`Content-Type: application/json`. Don't form-POST — Better-Auth rejects
that.

```ts
await fetch(`${process.env.NEXT_PUBLIC_AUTH_BASE_URL}/api/auth/sign-out`, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
```

## Server-to-server lookups (no user context)

For background jobs that need to read member data, hit
`/api/user/[memberId]` with a service token:

```ts
const res = await fetch(`${AUTH_BASE_URL}/api/user/${memberId}`, {
  headers: { Authorization: `Bearer ${process.env.AUTH_SERVICE_TOKEN}` },
});
```

Provision the token by adding `SERVICE_TOKEN` in the auth app's prod env, and
distributing the same value to every backend caller. Browsers should **not**
have this token — there's no CORS on this endpoint.

## Reference implementation

`apps/diw/app/whoami/page.tsx` is the smallest realistic example: it renders
the session and current user using `getServerSession` and `getCurrentUser`.
Visit it locally at `http://localhost:3000/whoami` after signing in at
`http://localhost:3002/login`.
